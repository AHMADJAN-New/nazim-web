<?php

namespace App\Http\Controllers;

use App\Models\ExpenseCategory;
use App\Models\ExpenseEntry;
use App\Models\FinanceAccount;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OrganizationHrController extends Controller
{
    private function clampPerPage(Request $request): int
    {
        return max(1, min((int) $request->input('per_page', 25), 100));
    }

    private function dateRangesOverlap(string $startA, ?string $endA, string $startB, ?string $endB): bool
    {
        $aEnd = $endA ?? '9999-12-31';
        $bEnd = $endB ?? '9999-12-31';

        return $startA <= $bEnd && $startB <= $aEnd;
    }

    private function overlapRange(string $startA, ?string $endA, string $startB, ?string $endB): ?array
    {
        if (! $this->dateRangesOverlap($startA, $endA, $startB, $endB)) {
            return null;
        }

        $endAValue = $endA ?? '9999-12-31';
        $endBValue = $endB ?? '9999-12-31';

        return [
            'start' => max($startA, $startB),
            'end' => min($endAValue, $endBValue),
        ];
    }

    private function intervalDaysInclusive(string $start, string $end): int
    {
        return Carbon::parse($start)->diffInDays(Carbon::parse($end)) + 1;
    }

    private function sumCoveredDays(array $intervals): int
    {
        if ($intervals === []) {
            return 0;
        }

        usort($intervals, static fn (array $a, array $b): int => strcmp($a['start'], $b['start']));

        $merged = [];
        foreach ($intervals as $interval) {
            if ($merged === []) {
                $merged[] = $interval;
                continue;
            }

            $lastIndex = count($merged) - 1;
            $last = $merged[$lastIndex];
            $nextStart = Carbon::parse($interval['start']);
            $lastEndPlusOne = Carbon::parse($last['end'])->addDay();

            if ($nextStart->lessThanOrEqualTo($lastEndPlusOne)) {
                if ($interval['end'] > $last['end']) {
                    $merged[$lastIndex]['end'] = $interval['end'];
                }
                continue;
            }

            $merged[] = $interval;
        }

        $days = 0;
        foreach ($merged as $interval) {
            $days += $this->intervalDaysInclusive($interval['start'], $interval['end']);
        }

        return $days;
    }

    private function getOrgContext(Request $request): array
    {
        $user = $request->user();
        if (!$user) {
            abort(401, 'Unauthenticated');
        }

        $profile = DB::table('profiles')->where('id', $user->id)->first();
        if (!$profile || !$profile->organization_id) {
            abort(403, 'User must be assigned to an organization');
        }

        return [$user, $profile, (string) $profile->organization_id];
    }

    private function ensurePermission(Request $request, string $permission): string
    {
        [$user, , $organizationId] = $this->getOrgContext($request);
        if (!$this->userHasPermission($user, $permission, $organizationId)) {
            abort(403, 'This action is unauthorized');
        }

        return $organizationId;
    }

    private function ensureStaffBelongsToOrganization(string $staffId, string $organizationId): void
    {
        $exists = DB::table('staff')
            ->where('id', $staffId)
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->exists();

        if (!$exists) {
            abort(404, 'Staff not found in your organization');
        }
    }

    private function ensureSchoolBelongsToOrganization(string $schoolId, string $organizationId): void
    {
        $exists = DB::table('school_branding')
            ->where('id', $schoolId)
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->exists();

        if (!$exists) {
            abort(422, 'School does not belong to your organization');
        }
    }

    private function getCompensationProfileRecord(string $profileId, string $organizationId): object
    {
        $profile = DB::table('staff_compensation_profiles')
            ->where('id', $profileId)
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->first();

        if (! $profile) {
            abort(404, 'Compensation profile not found');
        }

        return $profile;
    }

    private function getPayrollPeriodRecord(string $periodId, string $organizationId): object
    {
        $period = DB::table('payroll_periods')
            ->where('id', $periodId)
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->first();

        if (! $period) {
            abort(404, 'Payroll period not found');
        }

        return $period;
    }

    private function getPayrollRunRecord(string $runId, string $organizationId): object
    {
        $run = DB::table('payroll_runs')
            ->where('id', $runId)
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->first();

        if (! $run) {
            abort(404, 'Payroll run not found');
        }

        return $run;
    }

    private function validateCompensationProfileOverlap(
        string $organizationId,
        string $staffId,
        string $effectiveFrom,
        ?string $effectiveTo,
        string $status,
        ?string $excludeId = null
    ): void {
        if ($status !== 'active') {
            return;
        }

        $conflict = DB::table('staff_compensation_profiles')
            ->where('organization_id', $organizationId)
            ->where('staff_id', $staffId)
            ->where('status', 'active')
            ->whereNull('deleted_at')
            ->when($excludeId !== null, static function ($query) use ($excludeId): void {
                $query->where('id', '!=', $excludeId);
            })
            ->whereDate('effective_from', '<=', $effectiveTo ?? '9999-12-31')
            ->where(function ($query) use ($effectiveFrom): void {
                $query->whereNull('effective_to')
                    ->orWhereDate('effective_to', '>=', $effectiveFrom);
            })
            ->exists();

        if ($conflict) {
            abort(422, 'Compensation profile dates overlap with an existing active profile for this staff member.');
        }
    }

    private function calculateCoverageDaysForPeriod(
        iterable $assignments,
        string $profileStart,
        ?string $profileEnd,
        string $periodStart,
        string $periodEnd
    ): int {
        $intervals = [];

        foreach ($assignments as $assignment) {
            $assignmentOverlap = $this->overlapRange(
                (string) $assignment->start_date,
                $assignment->end_date ? (string) $assignment->end_date : null,
                $periodStart,
                $periodEnd
            );

            if ($assignmentOverlap === null) {
                continue;
            }

            $coveredRange = $this->overlapRange(
                $assignmentOverlap['start'],
                $assignmentOverlap['end'],
                $profileStart,
                $profileEnd
            );

            if ($coveredRange !== null) {
                $intervals[] = $coveredRange;
            }
        }

        return $this->sumCoveredDays($intervals);
    }

    private function calculateBaseAmount(object $profile, int $coveredDays, int $periodDays, string $periodStart): float
    {
        $baseSalary = (float) $profile->base_salary;
        $frequency = (string) $profile->pay_frequency;

        return match ($frequency) {
            'daily' => $baseSalary * $coveredDays,
            'weekly' => ($baseSalary / 7) * $coveredDays,
            'biweekly' => ($baseSalary / 14) * $coveredDays,
            'annually' => ($baseSalary / 365) * $coveredDays,
            'semi_monthly', 'semimonthly' => $periodDays > 0 ? ($baseSalary * $coveredDays / $periodDays) : $baseSalary,
            'monthly' => Carbon::parse($periodStart)->daysInMonth > 0
                ? ($baseSalary / Carbon::parse($periodStart)->daysInMonth) * $coveredDays
                : $baseSalary,
            default => $periodDays > 0 ? ($baseSalary * $coveredDays / $periodDays) : $baseSalary,
        };
    }

    private function getPayrollRunSummary(string $runId, string $organizationId): ?object
    {
        return DB::table('payroll_runs as pr')
            ->join('payroll_periods as pp', 'pr.payroll_period_id', '=', 'pp.id')
            ->leftJoin('payroll_run_items as pri', function ($join): void {
                $join->on('pr.id', '=', 'pri.payroll_run_id')
                    ->whereNull('pri.deleted_at');
            })
            ->where('pr.id', $runId)
            ->where('pr.organization_id', $organizationId)
            ->whereNull('pr.deleted_at')
            ->select(
                'pr.id',
                'pr.organization_id',
                'pr.payroll_period_id',
                'pr.run_name',
                'pr.status',
                'pr.approved_by',
                'pr.approved_at',
                'pr.locked_at',
                'pr.created_at',
                'pr.updated_at',
                'pp.name as payroll_period_name',
                'pp.period_start',
                'pp.period_end',
                'pp.pay_date',
                DB::raw('COUNT(pri.id) as item_count'),
                DB::raw('COALESCE(SUM(pri.gross_amount), 0) as total_gross'),
                DB::raw('COALESCE(SUM(pri.deduction_amount), 0) as total_deduction'),
                DB::raw('COALESCE(SUM(pri.net_amount), 0) as total_net')
            )
            ->groupBy(
                'pr.id',
                'pr.organization_id',
                'pr.payroll_period_id',
                'pr.run_name',
                'pr.status',
                'pr.approved_by',
                'pr.approved_at',
                'pr.locked_at',
                'pr.created_at',
                'pr.updated_at',
                'pp.name',
                'pp.period_start',
                'pp.period_end',
                'pp.pay_date'
            )
            ->first();
    }

    public function staffIndex(Request $request)
    {
        $organizationId = $this->ensurePermission($request, 'hr_staff.read');

        // List all staff in the organization by default. Allow an explicit school filter
        // for assignment workflows that need school-specific staff lists.
        $query = DB::table('staff')
            ->where('staff.organization_id', $organizationId)
            ->whereNull('staff.deleted_at');

        if ($request->filled('school_id')) {
            $schoolId = (string) $request->input('school_id');
            $this->ensureSchoolBelongsToOrganization($schoolId, $organizationId);
            $query->where('staff.school_id', $schoolId);
        }
        if ($request->filled('status')) {
            $query->where('staff.status', (string) $request->input('status'));
        }
        if ($request->filled('search')) {
            $search = '%'.$request->input('search').'%';
            $query->where(function ($q) use ($search): void {
                $q->where('staff.first_name', 'ilike', $search)
                    ->orWhere('staff.father_name', 'ilike', $search)
                    ->orWhere('staff.employee_id', 'ilike', $search)
                    ->orWhere('staff.email', 'ilike', $search);
            });
        }

        return response()->json($query->orderByDesc('staff.created_at')->paginate($this->clampPerPage($request)));
    }

    public function staffShow(Request $request, string $id)
    {
        $organizationId = $this->ensurePermission($request, 'hr_staff.read');

        $staff = DB::table('staff')
            ->where('id', $id)
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->first();

        if (!$staff) {
            return response()->json(['error' => 'Staff not found'], 404);
        }

        return response()->json($staff);
    }

    public function staffAssignments(Request $request, string $staffId)
    {
        $organizationId = $this->ensurePermission($request, 'hr_assignments.read');
        $this->ensureStaffBelongsToOrganization($staffId, $organizationId);

        $rows = DB::table('staff_assignments')
            ->where('organization_id', $organizationId)
            ->where('staff_id', $staffId)
            ->whereNull('deleted_at')
            ->orderByDesc('start_date')
            ->get();

        return response()->json($rows);
    }

    public function assignmentsIndex(Request $request)
    {
        $organizationId = $this->ensurePermission($request, 'hr_assignments.read');

        $query = DB::table('staff_assignments')
            ->leftJoin('staff', 'staff_assignments.staff_id', '=', 'staff.id')
            ->where('staff_assignments.organization_id', $organizationId)
            ->whereNull('staff_assignments.deleted_at')
            ->select(
                'staff_assignments.id',
                'staff_assignments.organization_id',
                'staff_assignments.staff_id',
                'staff_assignments.school_id',
                'staff_assignments.role_title',
                'staff_assignments.allocation_percent',
                'staff_assignments.is_primary',
                'staff_assignments.start_date',
                'staff_assignments.end_date',
                'staff_assignments.status',
                'staff_assignments.notes',
                'staff_assignments.created_at',
                'staff_assignments.updated_at',
                'staff.first_name as staff_first_name',
                'staff.father_name as staff_father_name'
            );

        if ($request->filled('staff_id')) {
            $query->where('staff_assignments.staff_id', (string) $request->input('staff_id'));
        }
        if ($request->filled('school_id')) {
            $schoolId = (string) $request->input('school_id');
            $this->ensureSchoolBelongsToOrganization($schoolId, $organizationId);
            $query->where('staff_assignments.school_id', $schoolId);
        }
        if ($request->filled('status')) {
            $query->where('staff_assignments.status', (string) $request->input('status'));
        }

        return response()->json($query->orderByDesc('staff_assignments.start_date')->paginate($this->clampPerPage($request)));
    }

    public function createAssignment(Request $request)
    {
        [, $profile, $organizationId] = $this->getOrgContext($request);
        $this->ensurePermission($request, 'hr_assignments.create');

        $data = $request->validate([
            'staff_id' => 'required|uuid|exists:staff,id',
            'school_id' => 'required|uuid|exists:school_branding,id',
            'role_title' => 'nullable|string|max:120',
            'allocation_percent' => 'required|numeric|min:0|max:100',
            'is_primary' => 'required|boolean',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'status' => 'nullable|string|max:30',
            'notes' => 'nullable|string',
        ]);

        $this->ensureStaffBelongsToOrganization($data['staff_id'], $organizationId);
        $this->ensureSchoolBelongsToOrganization($data['school_id'], $organizationId);

        $existingAssignments = DB::table('staff_assignments')
            ->where('organization_id', $organizationId)
            ->where('staff_id', $data['staff_id'])
            ->whereNull('deleted_at')
            ->where('status', 'active')
            ->get(['start_date', 'end_date', 'allocation_percent', 'is_primary']);

        $currentAllocation = 0.0;
        foreach ($existingAssignments as $assignment) {
            if ($this->dateRangesOverlap(
                (string) $assignment->start_date,
                $assignment->end_date ? (string) $assignment->end_date : null,
                (string) $data['start_date'],
                $data['end_date'] ?? null
            )) {
                $currentAllocation += (float) $assignment->allocation_percent;
            }
        }

        if (($currentAllocation + (float) $data['allocation_percent']) > 100.0) {
            return response()->json(['error' => 'Total allocation cannot exceed 100%'], 422);
        }

        if ((bool) $data['is_primary']) {
            $hasOverlappingPrimary = false;
            foreach ($existingAssignments as $assignment) {
                if (!(bool) $assignment->is_primary) {
                    continue;
                }

                if ($this->dateRangesOverlap(
                    (string) $assignment->start_date,
                    $assignment->end_date ? (string) $assignment->end_date : null,
                    (string) $data['start_date'],
                    $data['end_date'] ?? null
                )) {
                    $hasOverlappingPrimary = true;
                    break;
                }
            }

            if ($hasOverlappingPrimary) {
                return response()->json(['error' => 'Overlapping primary assignment date range is not allowed'], 422);
            }
        }

        $id = (string) Str::uuid();
        DB::table('staff_assignments')->insert([
            'id' => $id,
            'organization_id' => $organizationId,
            'staff_id' => $data['staff_id'],
            'school_id' => $data['school_id'],
            'role_title' => $data['role_title'] ?? null,
            'allocation_percent' => $data['allocation_percent'],
            'is_primary' => $data['is_primary'],
            'start_date' => $data['start_date'],
            'end_date' => $data['end_date'] ?? null,
            'status' => $data['status'] ?? 'active',
            'notes' => $data['notes'] ?? null,
            'created_by' => $profile->id,
            'updated_by' => $profile->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['id' => $id], 201);
    }

    public function updateAssignment(Request $request, string $id)
    {
        [$user, $profile, $organizationId] = $this->getOrgContext($request);
        $this->ensurePermission($request, 'hr_assignments.update');

        $row = DB::table('staff_assignments')
            ->where('id', $id)
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->first();

        if (!$row) {
            return response()->json(['error' => 'Assignment not found'], 404);
        }

        $data = $request->validate([
            'role_title' => 'nullable|string|max:120',
            'allocation_percent' => 'sometimes|numeric|min:0|max:100',
            'is_primary' => 'sometimes|boolean',
            'end_date' => [
                'nullable',
                'date',
                function (string $attr, $value, \Closure $fail) use ($row): void {
                    if ($value && $row->start_date && $value < $row->start_date) {
                        $fail('End date must be on or after start date.');
                    }
                },
            ],
            'status' => 'nullable|string|in:active,ended,suspended|max:30',
            'notes' => 'nullable|string',
        ]);

        $startDate = (string) $row->start_date;
        $endDate = isset($data['end_date']) ? (string) $data['end_date'] : ($row->end_date ? (string) $row->end_date : null);
        $allocationPercent = isset($data['allocation_percent']) ? (float) $data['allocation_percent'] : (float) $row->allocation_percent;
        $isPrimary = isset($data['is_primary']) ? (bool) $data['is_primary'] : (bool) $row->is_primary;

        if (isset($data['allocation_percent']) || isset($data['is_primary']) || isset($data['end_date'])) {
            $existingAssignments = DB::table('staff_assignments')
                ->where('organization_id', $organizationId)
                ->where('staff_id', $row->staff_id)
                ->where('id', '!=', $id)
                ->whereNull('deleted_at')
                ->where('status', 'active')
                ->get(['start_date', 'end_date', 'allocation_percent', 'is_primary']);

            $currentAllocation = 0.0;
            foreach ($existingAssignments as $assignment) {
                if ($this->dateRangesOverlap(
                    (string) $assignment->start_date,
                    $assignment->end_date ? (string) $assignment->end_date : null,
                    $startDate,
                    $endDate
                )) {
                    $currentAllocation += (float) $assignment->allocation_percent;
                }
            }

            $newStatus = $data['status'] ?? $row->status;
            if ($newStatus === 'active' && ($currentAllocation + $allocationPercent) > 100.0) {
                return response()->json(['error' => 'Total allocation cannot exceed 100%'], 422);
            }

            if ($isPrimary) {
                foreach ($existingAssignments as $assignment) {
                    if (!(bool) $assignment->is_primary) {
                        continue;
                    }
                    if ($this->dateRangesOverlap(
                        (string) $assignment->start_date,
                        $assignment->end_date ? (string) $assignment->end_date : null,
                        $startDate,
                        $endDate
                    )) {
                        return response()->json(['error' => 'Overlapping primary assignment date range is not allowed'], 422);
                    }
                }
            }
        }

        $update = [
            'updated_by' => $profile->id,
            'updated_at' => now(),
        ];
        if (array_key_exists('role_title', $data)) {
            $update['role_title'] = $data['role_title'];
        }
        if (array_key_exists('allocation_percent', $data)) {
            $update['allocation_percent'] = $data['allocation_percent'];
        }
        if (array_key_exists('is_primary', $data)) {
            $update['is_primary'] = $data['is_primary'];
        }
        if (array_key_exists('end_date', $data)) {
            $update['end_date'] = $data['end_date'];
        }
        if (array_key_exists('status', $data)) {
            $update['status'] = $data['status'];
        }
        if (array_key_exists('notes', $data)) {
            $update['notes'] = $data['notes'];
        }

        DB::table('staff_assignments')->where('id', $id)->update($update);

        return response()->json(['id' => $id], 200);
    }

    public function deleteAssignment(Request $request, string $id)
    {
        $organizationId = $this->ensurePermission($request, 'hr_assignments.delete');

        $row = DB::table('staff_assignments')
            ->where('id', $id)
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->first();

        if (!$row) {
            return response()->json(['error' => 'Assignment not found'], 404);
        }

        DB::table('staff_assignments')->where('id', $id)->update([
            'deleted_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->noContent();
    }

    public function compensationIndex(Request $request)
    {
        $organizationId = $this->ensurePermission($request, 'hr_payroll.read');

        $query = DB::table('staff_compensation_profiles as scp')
            ->leftJoin('staff as s', 'scp.staff_id', '=', 's.id')
            ->where('scp.organization_id', $organizationId)
            ->whereNull('scp.deleted_at')
            ->select(
                'scp.*',
                's.employee_id',
                's.first_name as staff_first_name',
                's.father_name as staff_father_name'
            );

        if ($request->filled('staff_id')) {
            $query->where('scp.staff_id', (string) $request->input('staff_id'));
        }

        return response()->json($query->orderByDesc('scp.effective_from')->paginate($this->clampPerPage($request)));
    }

    public function createCompensationProfile(Request $request)
    {
        [, $profile, $organizationId] = $this->getOrgContext($request);
        $this->ensurePermission($request, 'hr_payroll.create');

        $data = $request->validate([
            'staff_id' => 'required|uuid|exists:staff,id',
            'base_salary' => 'required|numeric|min:0',
            'pay_frequency' => 'required|string|in:monthly,semi_monthly,semimonthly,biweekly,weekly,daily,annually',
            'currency' => 'required|string|size:3',
            'grade' => 'nullable|string|max:50',
            'step' => 'nullable|string|max:50',
            'effective_from' => 'required|date',
            'effective_to' => 'nullable|date|after_or_equal:effective_from',
            'status' => 'nullable|string|in:active,inactive|max:30',
            'legacy_salary_notes' => 'nullable|string',
        ]);

        $status = $data['status'] ?? 'active';
        $this->ensureStaffBelongsToOrganization($data['staff_id'], $organizationId);
        $this->validateCompensationProfileOverlap(
            $organizationId,
            $data['staff_id'],
            (string) $data['effective_from'],
            isset($data['effective_to']) ? (string) $data['effective_to'] : null,
            $status
        );

        $id = (string) Str::uuid();
        DB::table('staff_compensation_profiles')->insert([
            'id' => $id,
            'organization_id' => $organizationId,
            'staff_id' => $data['staff_id'],
            'base_salary' => $data['base_salary'],
            'pay_frequency' => $data['pay_frequency'],
            'currency' => strtoupper($data['currency']),
            'grade' => $data['grade'] ?? null,
            'step' => $data['step'] ?? null,
            'effective_from' => $data['effective_from'],
            'effective_to' => $data['effective_to'] ?? null,
            'legacy_salary_notes' => $data['legacy_salary_notes'] ?? null,
            'status' => $status,
            'created_by' => $profile->id,
            'updated_by' => $profile->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['id' => $id], 201);
    }

    public function updateCompensationProfile(Request $request, string $id)
    {
        [, $profile, $organizationId] = $this->getOrgContext($request);
        $this->ensurePermission($request, 'hr_payroll.create');

        $row = $this->getCompensationProfileRecord($id, $organizationId);

        $data = $request->validate([
            'base_salary' => 'sometimes|numeric|min:0',
            'pay_frequency' => 'sometimes|string|in:monthly,semi_monthly,semimonthly,biweekly,weekly,daily,annually',
            'currency' => 'sometimes|string|size:3',
            'grade' => 'nullable|string|max:50',
            'step' => 'nullable|string|max:50',
            'effective_from' => 'sometimes|date',
            'effective_to' => 'nullable|date',
            'status' => 'sometimes|string|in:active,inactive|max:30',
            'legacy_salary_notes' => 'nullable|string',
        ]);

        $effectiveFrom = isset($data['effective_from']) ? (string) $data['effective_from'] : (string) $row->effective_from;
        $effectiveTo = array_key_exists('effective_to', $data)
            ? ($data['effective_to'] ? (string) $data['effective_to'] : null)
            : ($row->effective_to ? (string) $row->effective_to : null);

        if ($effectiveTo !== null && $effectiveTo < $effectiveFrom) {
            return response()->json(['error' => 'Effective to date must be on or after effective from date'], 422);
        }

        $status = isset($data['status']) ? (string) $data['status'] : (string) $row->status;
        $this->validateCompensationProfileOverlap(
            $organizationId,
            (string) $row->staff_id,
            $effectiveFrom,
            $effectiveTo,
            $status,
            $id
        );

        $update = [
            'updated_by' => $profile->id,
            'updated_at' => now(),
        ];

        foreach (['base_salary', 'pay_frequency', 'grade', 'step', 'status', 'legacy_salary_notes'] as $field) {
            if (array_key_exists($field, $data)) {
                $update[$field] = $data[$field];
            }
        }

        if (array_key_exists('currency', $data)) {
            $update['currency'] = strtoupper((string) $data['currency']);
        }
        if (array_key_exists('effective_from', $data)) {
            $update['effective_from'] = $data['effective_from'];
        }
        if (array_key_exists('effective_to', $data)) {
            $update['effective_to'] = $data['effective_to'];
        }

        DB::table('staff_compensation_profiles')->where('id', $id)->update($update);

        return response()->json(['id' => $id], 200);
    }

    public function deleteCompensationProfile(Request $request, string $id)
    {
        [, $profile, $organizationId] = $this->getOrgContext($request);
        $this->ensurePermission($request, 'hr_payroll.create');

        $this->getCompensationProfileRecord($id, $organizationId);

        DB::table('staff_compensation_profiles')->where('id', $id)->update([
            'deleted_at' => now(),
            'updated_by' => $profile->id,
            'updated_at' => now(),
        ]);

        return response()->noContent();
    }

    public function payrollPeriods(Request $request)
    {
        $organizationId = $this->ensurePermission($request, 'hr_payroll.read');

        $rows = DB::table('payroll_periods')
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->orderByDesc('period_start')
            ->get();

        return response()->json($rows);
    }

    public function createPayrollPeriod(Request $request)
    {
        $organizationId = $this->ensurePermission($request, 'hr_payroll.create');

        $data = $request->validate([
            'name' => 'required|string|max:80',
            'period_start' => 'required|date',
            'period_end' => 'required|date|after_or_equal:period_start',
            'pay_date' => 'nullable|date',
        ]);

        $overlapExists = DB::table('payroll_periods')
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->whereDate('period_start', '<=', (string) $data['period_end'])
            ->whereDate('period_end', '>=', (string) $data['period_start'])
            ->exists();

        if ($overlapExists) {
            return response()->json(['error' => 'Payroll periods cannot overlap within the same organization.'], 422);
        }

        $id = (string) Str::uuid();
        DB::table('payroll_periods')->insert([
            'id' => $id,
            'organization_id' => $organizationId,
            'name' => $data['name'],
            'period_start' => $data['period_start'],
            'period_end' => $data['period_end'],
            'pay_date' => $data['pay_date'] ?? null,
            'status' => 'draft',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['id' => $id], 201);
    }

    public function payrollRuns(Request $request)
    {
        $organizationId = $this->ensurePermission($request, 'hr_payroll.read');

        $query = DB::table('payroll_runs as pr')
            ->join('payroll_periods as pp', 'pr.payroll_period_id', '=', 'pp.id')
            ->leftJoin('payroll_run_items as pri', function ($join): void {
                $join->on('pr.id', '=', 'pri.payroll_run_id')
                    ->whereNull('pri.deleted_at');
            })
            ->leftJoin('expense_entries as ee', function ($join): void {
                $join->on('ee.payroll_run_id', '=', 'pr.id')
                    ->whereNull('ee.deleted_at');
            })
            ->where('pr.organization_id', $organizationId)
            ->whereNull('pr.deleted_at')
            ->select(
                'pr.id',
                'pr.organization_id',
                'pr.payroll_period_id',
                'pr.run_name',
                'pr.status',
                'pr.approved_by',
                'pr.approved_at',
                'pr.locked_at',
                'pr.created_at',
                'pr.updated_at',
                'pp.name as payroll_period_name',
                'pp.period_start',
                'pp.period_end',
                'pp.pay_date',
                DB::raw('COUNT(pri.id) as item_count'),
                DB::raw('COALESCE(SUM(pri.gross_amount), 0) as total_gross'),
                DB::raw('COALESCE(SUM(pri.deduction_amount), 0) as total_deduction'),
                DB::raw('COALESCE(SUM(pri.net_amount), 0) as total_net'),
                'ee.id as expense_entry_id',
                'pr.updated_at as paid_at'
            )
            ->groupBy(
                'pr.id',
                'pr.organization_id',
                'pr.payroll_period_id',
                'pr.run_name',
                'pr.status',
                'pr.approved_by',
                'pr.approved_at',
                'pr.locked_at',
                'pr.created_at',
                'pr.updated_at',
                'pp.name',
                'pp.period_start',
                'pp.period_end',
                'pp.pay_date',
                'ee.id'
            );

        if ($request->filled('payroll_period_id')) {
            $query->where('pr.payroll_period_id', (string) $request->input('payroll_period_id'));
        }
        if ($request->filled('status')) {
            $query->where('pr.status', (string) $request->input('status'));
        }

        return response()->json($query->orderByDesc('pp.period_start')->paginate($this->clampPerPage($request)));
    }

    public function createPayrollRun(Request $request)
    {
        $organizationId = $this->ensurePermission($request, 'hr_payroll.create');

        $data = $request->validate([
            'payroll_period_id' => 'required|uuid|exists:payroll_periods,id',
            'run_name' => 'nullable|string|max:100',
        ]);

        $period = $this->getPayrollPeriodRecord((string) $data['payroll_period_id'], $organizationId);

        $existingRun = DB::table('payroll_runs')
            ->where('organization_id', $organizationId)
            ->where('payroll_period_id', $period->id)
            ->whereNull('deleted_at')
            ->exists();

        if ($existingRun) {
            return response()->json(['error' => 'A payroll run already exists for this payroll period.'], 422);
        }

        $id = (string) Str::uuid();
        DB::table('payroll_runs')->insert([
            'id' => $id,
            'organization_id' => $organizationId,
            'payroll_period_id' => $period->id,
            'run_name' => $data['run_name'] ?: ($period->name.' Run'),
            'status' => 'draft',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['id' => $id], 201);
    }

    public function payrollRunShow(Request $request, string $id)
    {
        $organizationId = $this->ensurePermission($request, 'hr_payroll.read');

        $run = $this->getPayrollRunSummary($id, $organizationId);
        if (! $run) {
            return response()->json(['error' => 'Payroll run not found'], 404);
        }

        $linkedExpense = DB::table('expense_entries')
            ->where('payroll_run_id', $id)
            ->whereNull('deleted_at')
            ->first();
        $run->expense_entry_id = $linkedExpense?->id;
        $run->paid_at = $run->status === 'paid' ? ($run->updated_at ?? null) : null;

        $items = DB::table('payroll_run_items as pri')
            ->join('staff as s', 'pri.staff_id', '=', 's.id')
            ->leftJoin('payslips as ps', function ($join): void {
                $join->on('pri.id', '=', 'ps.payroll_run_item_id')
                    ->whereNull('ps.deleted_at');
            })
            ->where('pri.organization_id', $organizationId)
            ->where('pri.payroll_run_id', $id)
            ->whereNull('pri.deleted_at')
            ->select(
                'pri.id',
                'pri.organization_id',
                'pri.payroll_run_id',
                'pri.staff_id',
                'pri.gross_amount',
                'pri.deduction_amount',
                'pri.net_amount',
                'pri.breakdown',
                'pri.adjustment_notes',
                'pri.created_at',
                'pri.updated_at',
                's.employee_id',
                's.first_name as staff_first_name',
                's.father_name as staff_father_name',
                'ps.payslip_number',
                'ps.status as payslip_status'
            )
            ->orderBy('s.first_name')
            ->orderBy('s.father_name')
            ->get();

        return response()->json([
            'run' => $run,
            'items' => $items,
        ]);
    }

    public function calculatePayrollRun(Request $request, string $id)
    {
        $organizationId = $this->ensurePermission($request, 'hr_payroll.run');

        $run = $this->getPayrollRunRecord($id, $organizationId);
        if (in_array($run->status, ['finalized', 'paid'], true)) {
            return response()->json(['error' => 'Finalized or paid payroll runs cannot be recalculated.'], 422);
        }

        $period = $this->getPayrollPeriodRecord((string) $run->payroll_period_id, $organizationId);
        $periodStart = (string) $period->period_start;
        $periodEnd = (string) $period->period_end;
        $periodDays = $this->intervalDaysInclusive($periodStart, $periodEnd);

        $assignmentGroups = DB::table('staff_assignments as sa')
            ->join('staff as s', 'sa.staff_id', '=', 's.id')
            ->where('sa.organization_id', $organizationId)
            ->where('s.organization_id', $organizationId)
            ->whereNull('sa.deleted_at')
            ->whereNull('s.deleted_at')
            ->where('sa.status', 'active')
            ->where('s.status', 'active')
            ->whereDate('sa.start_date', '<=', $periodEnd)
            ->where(function ($query) use ($periodStart): void {
                $query->whereNull('sa.end_date')
                    ->orWhereDate('sa.end_date', '>=', $periodStart);
            })
            ->select('sa.staff_id', 'sa.start_date', 'sa.end_date')
            ->orderBy('sa.staff_id')
            ->get()
            ->groupBy('staff_id');

        $itemsToInsert = [];
        foreach ($assignmentGroups as $staffId => $assignments) {
            $compProfile = DB::table('staff_compensation_profiles')
                ->where('organization_id', $organizationId)
                ->where('staff_id', $staffId)
                ->where('status', 'active')
                ->whereNull('deleted_at')
                ->whereDate('effective_from', '<=', $periodEnd)
                ->where(function ($query) use ($periodStart): void {
                    $query->whereNull('effective_to')
                        ->orWhereDate('effective_to', '>=', $periodStart);
                })
                ->orderByDesc('effective_from')
                ->first();

            if (! $compProfile) {
                continue;
            }

            $coveredDays = $this->calculateCoverageDaysForPeriod(
                $assignments,
                (string) $compProfile->effective_from,
                $compProfile->effective_to ? (string) $compProfile->effective_to : null,
                $periodStart,
                $periodEnd
            );

            if ($coveredDays <= 0) {
                continue;
            }

            $coverageRatio = $periodDays > 0 ? $coveredDays / $periodDays : 0.0;
            $baseAmount = round($this->calculateBaseAmount($compProfile, $coveredDays, $periodDays, $periodStart), 2);

            $componentRows = DB::table('staff_compensation_items as sci')
                ->join('compensation_components as cc', 'sci.component_id', '=', 'cc.id')
                ->where('sci.organization_id', $organizationId)
                ->where('cc.organization_id', $organizationId)
                ->where('sci.staff_compensation_profile_id', $compProfile->id)
                ->whereNull('sci.deleted_at')
                ->whereNull('cc.deleted_at')
                ->where('cc.is_active', true)
                ->whereDate('sci.effective_from', '<=', $periodEnd)
                ->where(function ($query) use ($periodStart): void {
                    $query->whereNull('sci.effective_to')
                        ->orWhereDate('sci.effective_to', '>=', $periodStart);
                })
                ->select(
                    'cc.name',
                    'cc.code',
                    'cc.component_type',
                    'cc.value_type',
                    'sci.value_amount'
                )
                ->get();

            $allowances = 0.0;
            $deductions = 0.0;
            $componentBreakdown = [];

            foreach ($componentRows as $component) {
                $amount = $component->value_type === 'percentage'
                    ? round($baseAmount * ((float) $component->value_amount / 100), 2)
                    : round((float) $component->value_amount * $coverageRatio, 2);

                if ($component->component_type === 'deduction') {
                    $deductions += $amount;
                } else {
                    $allowances += $amount;
                }

                $componentBreakdown[] = [
                    'code' => $component->code,
                    'name' => $component->name,
                    'type' => $component->component_type,
                    'value_type' => $component->value_type,
                    'configured_amount' => (float) $component->value_amount,
                    'calculated_amount' => $amount,
                ];
            }

            $grossAmount = round($baseAmount + $allowances, 2);
            $deductionAmount = round($deductions, 2);
            $netAmount = round(max($grossAmount - $deductionAmount, 0), 2);

            $itemsToInsert[] = [
                'id' => (string) Str::uuid(),
                'organization_id' => $organizationId,
                'payroll_run_id' => $run->id,
                'staff_id' => $staffId,
                'gross_amount' => $grossAmount,
                'deduction_amount' => $deductionAmount,
                'net_amount' => $netAmount,
                'breakdown' => json_encode([
                    'base_salary' => (float) $compProfile->base_salary,
                    'pay_frequency' => $compProfile->pay_frequency,
                    'covered_days' => $coveredDays,
                    'period_days' => $periodDays,
                    'base_amount' => $baseAmount,
                    'allowances_total' => round($allowances, 2),
                    'deductions_total' => $deductionAmount,
                    'components' => $componentBreakdown,
                ], JSON_UNESCAPED_UNICODE),
                'adjustment_notes' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        if ($itemsToInsert === []) {
            return response()->json(['error' => 'No eligible staff with active assignments and compensation profiles were found for this period.'], 422);
        }

        DB::transaction(function () use ($organizationId, $run, $period, $itemsToInsert): void {
            DB::table('payroll_run_items')
                ->where('organization_id', $organizationId)
                ->where('payroll_run_id', $run->id)
                ->whereNull('deleted_at')
                ->update([
                    'deleted_at' => now(),
                    'updated_at' => now(),
                ]);

            DB::table('payroll_run_items')->insert($itemsToInsert);

            DB::table('payroll_runs')
                ->where('id', $run->id)
                ->update([
                    'status' => 'processing',
                    'approved_by' => null,
                    'approved_at' => null,
                    'locked_at' => null,
                    'updated_at' => now(),
                ]);

            DB::table('payroll_periods')
                ->where('id', $period->id)
                ->update([
                    'status' => 'processing',
                    'updated_at' => now(),
                ]);
        });

        return response()->json(['id' => $run->id], 200);
    }

    public function finalizePayrollRun(Request $request, string $id)
    {
        [, $profile, $organizationId] = $this->getOrgContext($request);
        $this->ensurePermission($request, 'hr_payroll.approve');

        $run = $this->getPayrollRunRecord($id, $organizationId);
        if ($run->status === 'paid') {
            return response()->json(['error' => 'Paid payroll runs cannot be changed.'], 422);
        }
        if ($run->status === 'finalized') {
            return response()->json(['error' => 'This payroll run is already finalized.'], 422);
        }

        $activeItems = DB::table('payroll_run_items')
            ->where('organization_id', $organizationId)
            ->where('payroll_run_id', $run->id)
            ->whereNull('deleted_at')
            ->get(['id']);

        if ($activeItems->isEmpty()) {
            return response()->json(['error' => 'Calculate this payroll run before finalizing it.'], 422);
        }

        $period = $this->getPayrollPeriodRecord((string) $run->payroll_period_id, $organizationId);

        DB::transaction(function () use ($organizationId, $profile, $run, $period, $activeItems): void {
            DB::table('payroll_runs')
                ->where('id', $run->id)
                ->update([
                    'status' => 'finalized',
                    'approved_by' => $profile->id,
                    'approved_at' => now(),
                    'locked_at' => now(),
                    'updated_at' => now(),
                ]);

            DB::table('payroll_periods')
                ->where('id', $period->id)
                ->update([
                    'status' => 'finalized',
                    'updated_at' => now(),
                ]);

            $existingPayslipItemIds = DB::table('payslips')
                ->where('organization_id', $organizationId)
                ->whereIn('payroll_run_item_id', $activeItems->pluck('id')->all())
                ->whereNull('deleted_at')
                ->pluck('payroll_run_item_id')
                ->all();

            $existingLookup = array_fill_keys($existingPayslipItemIds, true);
            $payslips = [];
            foreach ($activeItems as $item) {
                if (isset($existingLookup[$item->id])) {
                    continue;
                }

                $payslips[] = [
                    'id' => (string) Str::uuid(),
                    'organization_id' => $organizationId,
                    'payroll_run_item_id' => $item->id,
                    'payslip_number' => 'PS-'.Carbon::now()->format('YmdHis').'-'.substr(str_replace('-', '', $item->id), 0, 8),
                    'generated_at' => now(),
                    'status' => 'generated',
                    'file_path' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }

            if ($payslips !== []) {
                DB::table('payslips')->insert($payslips);
            }
        });

        return response()->json(['id' => $run->id], 200);
    }

    public function markPayrollRunPaid(Request $request, string $id)
    {
        $organizationId = $this->ensurePermission($request, 'hr_payroll.approve');
        try {
            if (! $request->user()->hasPermissionTo('org_finance.create')) {
                return response()->json(['error' => 'This action requires org finance create permission.'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action requires org finance create permission.'], 403);
        }

        $validated = $request->validate([
            'account_id' => 'required|uuid|exists:finance_accounts,id',
            'expense_category_id' => 'nullable|uuid|exists:expense_categories,id',
        ]);

        $run = $this->getPayrollRunRecord($id, $organizationId);
        if ($run->status !== 'finalized') {
            return response()->json(['error' => 'Only finalized payroll runs can be marked as paid.'], 422);
        }

        $account = FinanceAccount::whereNull('deleted_at')
            ->where('organization_id', $organizationId)
            ->whereNull('school_id')
            ->find($validated['account_id']);
        if (!$account) {
            return response()->json(['error' => 'Account must be an org-level finance account.'], 422);
        }

        $categoryId = $validated['expense_category_id'] ?? null;
        if (!$categoryId) {
            $payrollCategory = ExpenseCategory::whereNull('deleted_at')
                ->where('organization_id', $organizationId)
                ->whereNull('school_id')
                ->where(function ($q): void {
                    $q->where('name', 'ilike', 'Payroll')
                        ->orWhere('code', 'ilike', 'payroll');
                })
                ->first();
            $categoryId = $payrollCategory?->id;
        }
        if (!$categoryId) {
            return response()->json(['error' => 'Expense category is required. Create an org-level "Payroll" category or pass expense_category_id.'], 422);
        }

        $category = ExpenseCategory::whereNull('deleted_at')
            ->where('organization_id', $organizationId)
            ->whereNull('school_id')
            ->find($categoryId);
        if (!$category) {
            return response()->json(['error' => 'Expense category must be an org-level category.'], 422);
        }

        $existingExpense = ExpenseEntry::whereNull('deleted_at')
            ->where('organization_id', $organizationId)
            ->where('payroll_run_id', $run->id)
            ->first();

        if ($existingExpense) {
            DB::transaction(function () use ($run): void {
                DB::table('payroll_runs')
                    ->where('id', $run->id)
                    ->update(['status' => 'paid', 'updated_at' => now()]);
                DB::table('payroll_periods')
                    ->where('id', $run->payroll_period_id)
                    ->update(['status' => 'paid', 'updated_at' => now()]);
            });
            $runFresh = DB::table('payroll_runs')->where('id', $run->id)->first();
            return response()->json([
                'id' => $run->id,
                'expense_entry_id' => $existingExpense->id,
                'paid_at' => $runFresh ? (string) $runFresh->updated_at : now()->toIso8601String(),
            ], 200);
        }

        $summary = $this->getPayrollRunSummary($id, $organizationId);
        $totalNet = $summary ? (float) $summary->total_net : 0;
        $period = $this->getPayrollPeriodRecord((string) $run->payroll_period_id, $organizationId);
        $expenseDate = $period && !empty($period->pay_date)
            ? (string) $period->pay_date
            : now()->toDateString();
        $runName = $run->run_name ?? 'Payroll Run';
        $periodName = $period ? ($period->name ?? '') : '';
        $description = trim("{$runName}" . ($periodName ? " – {$periodName}" : ''));
        $referenceNo = 'PAYROLL-' . substr($run->id, 0, 8);

        $currencyId = $account->currency_id;
        if (!$currencyId) {
            $base = \App\Models\Currency::where('organization_id', $organizationId)
                ->whereNull('school_id')
                ->where('is_base', true)
                ->where('is_active', true)
                ->whereNull('deleted_at')
                ->first();
            $currencyId = $base?->id;
        }
        if (!$currencyId) {
            return response()->json(['error' => 'Account must have a currency. Configure org finance base currency.'], 422);
        }

        $entry = null;
        DB::transaction(function () use ($organizationId, $run, $account, $category, $totalNet, $expenseDate, $description, $referenceNo, $currencyId, &$entry): void {
            $entry = ExpenseEntry::create([
                'organization_id' => $organizationId,
                'school_id' => null,
                'currency_id' => $currencyId,
                'account_id' => $account->id,
                'expense_category_id' => $category->id,
                'project_id' => null,
                'payroll_run_id' => $run->id,
                'amount' => $totalNet,
                'date' => $expenseDate,
                'reference_no' => $referenceNo,
                'description' => $description,
                'paid_to' => null,
                'payment_method' => 'bank_transfer',
                'status' => 'approved',
            ]);

            DB::table('payroll_runs')
                ->where('id', $run->id)
                ->update(['status' => 'paid', 'updated_at' => now()]);

            DB::table('payroll_periods')
                ->where('id', $run->payroll_period_id)
                ->update(['status' => 'paid', 'updated_at' => now()]);
        });

        return response()->json([
            'id' => $run->id,
            'expense_entry_id' => $entry->id,
            'paid_at' => now()->toIso8601String(),
        ], 200);
    }

    public function analyticsOverview(Request $request)
    {
        $organizationId = $this->ensurePermission($request, 'hr_reports.read');

        $headcountBySchool = DB::table('staff_assignments')
            ->select('school_id', DB::raw('COUNT(DISTINCT staff_id) as headcount'))
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->where('status', 'active')
            ->whereDate('start_date', '<=', now()->toDateString())
            ->where(function ($query): void {
                $query->whereNull('end_date')->orWhereDate('end_date', '>=', now()->toDateString());
            })
            ->groupBy('school_id')
            ->get();

        $pendingApprovals = DB::table('hr_approval_requests')
            ->where('organization_id', $organizationId)
            ->where('status', 'pending')
            ->whereNull('deleted_at')
            ->count();

        $payrollByMonth = DB::table('payroll_run_items as pri')
            ->join('payroll_runs as pr', 'pr.id', '=', 'pri.payroll_run_id')
            ->join('payroll_periods as pp', 'pp.id', '=', 'pr.payroll_period_id')
            ->select(DB::raw("to_char(pp.period_start, 'YYYY-MM') as month"), DB::raw('SUM(pri.net_amount) as total_net'))
            ->where('pri.organization_id', $organizationId)
            ->whereNull('pri.deleted_at')
            ->whereIn('pr.status', ['finalized', 'paid'])
            ->groupBy(DB::raw("to_char(pp.period_start, 'YYYY-MM')"))
            ->orderBy(DB::raw("to_char(pp.period_start, 'YYYY-MM')"))
            ->get();

        return response()->json([
            'headcount_by_school' => $headcountBySchool,
            'payroll_by_month' => $payrollByMonth,
            'pending_approvals' => $pendingApprovals,
        ]);
    }
}
