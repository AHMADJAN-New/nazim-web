<?php

namespace App\Http\Controllers;

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

    public function staffIndex(Request $request)
    {
        $organizationId = $this->ensurePermission($request, 'hr_staff.read');

        // List all staff in the organization (no school filter on list; school is only on create/update/assignments)
        $query = DB::table('staff')
            ->where('staff.organization_id', $organizationId)
            ->whereNull('staff.deleted_at');

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

        $query = DB::table('staff_compensation_profiles')
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at');

        if ($request->filled('staff_id')) {
            $query->where('staff_id', (string) $request->input('staff_id'));
        }

        return response()->json($query->orderByDesc('effective_from')->paginate($this->clampPerPage($request)));
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
