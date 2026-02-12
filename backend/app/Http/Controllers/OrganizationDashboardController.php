<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class OrganizationDashboardController extends Controller
{
    /**
     * Organization-wide dashboard overview (all schools in current organization).
     */
    public function overview(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'Unauthenticated'], 401);
            }

            $profile = DB::connection('pgsql')
                ->table('profiles')
                ->where('id', $user->id)
                ->first();

            if (!$profile || !$profile->organization_id) {
                return response()->json(['error' => 'User must be assigned to an organization'], 403);
            }

            $organizationId = (string) $profile->organization_id;

            if (function_exists('setPermissionsTeamId')) {
                setPermissionsTeamId($organizationId);
            }

            $hasOrgScopePermission =
                $this->userHasPermission($user, 'organizations.read', $organizationId) ||
                $this->userHasPermission($user, 'dashboard.read', $organizationId) ||
                $this->userHasPermission($user, 'school_branding.read', $organizationId);

            $isOrganizationAdminRole = (string) ($profile->role ?? '') === 'organization_admin';
            if (!$isOrganizationAdminRole && !$hasOrgScopePermission) {
                return response()->json([
                    'error' => 'Access Denied',
                    'message' => 'You do not have permission to access organization-wide dashboard data.',
                ], 403);
            }

            if (!(bool) ($profile->schools_access_all ?? false)) {
                return response()->json([
                    'error' => 'Access Denied',
                    'message' => 'Organization dashboard requires access to all schools.',
                ], 403);
            }

            $schools = DB::connection('pgsql')
                ->table('school_branding as sb')
                ->leftJoin('website_settings as ws', function ($join): void {
                    $join->on('ws.school_id', '=', 'sb.id')
                        ->whereNull('ws.deleted_at');
                })
                ->where('sb.organization_id', $organizationId)
                ->whereNull('sb.deleted_at')
                ->groupBy('sb.id', 'sb.school_name', 'sb.is_active')
                ->orderBy('sb.school_name')
                ->select(
                    'sb.id',
                    'sb.school_name',
                    'sb.is_active',
                    DB::raw('MAX(ws.school_slug) as school_slug')
                )
                ->get();

            $schoolIds = $schools
                ->pluck('id')
                ->filter()
                ->values()
                ->all();

            if (empty($schoolIds)) {
                return response()->json([
                    'summary' => [
                        'total_students' => 0,
                        'total_staff' => 0,
                        'total_schools' => 0,
                        'active_schools' => 0,
                        'total_classes' => 0,
                        'total_buildings' => 0,
                        'total_rooms' => 0,
                        'today_attendance' => [
                            'present' => 0,
                            'total' => 0,
                            'rate' => 0.0,
                        ],
                        'finance' => [
                            'income' => 0.0,
                            'expense' => 0.0,
                            'net' => 0.0,
                            'fee_collection' => 0.0,
                        ],
                    ],
                    'schools' => [],
                    'charts' => [
                        'students_by_school' => [],
                        'staff_by_school' => [],
                        'attendance_rate_by_school' => [],
                        'fee_collection_by_school' => [],
                        'income_by_school' => [],
                        'expense_by_school' => [],
                    ],
                    'today_summary' => [
                        'upcoming_exams_count' => 0,
                        'upcoming_exams' => [],
                        'recent_activity' => [],
                        'alerts' => [],
                    ],
                ]);
            }

            $studentsBySchool = DB::connection('pgsql')
                ->table('students')
                ->where('organization_id', $organizationId)
                ->whereIn('school_id', $schoolIds)
                ->whereNull('deleted_at')
                ->groupBy('school_id')
                ->select('school_id', DB::raw('COUNT(*) as total'))
                ->pluck('total', 'school_id')
                ->map(fn ($value) => (int) $value)
                ->toArray();

            $staffBySchool = DB::connection('pgsql')
                ->table('staff')
                ->where('organization_id', $organizationId)
                ->whereIn('school_id', $schoolIds)
                ->whereNull('deleted_at')
                ->groupBy('school_id')
                ->select('school_id', DB::raw('COUNT(*) as total'))
                ->pluck('total', 'school_id')
                ->map(fn ($value) => (int) $value)
                ->toArray();

            $classesBySchool = DB::connection('pgsql')
                ->table('classes')
                ->where('organization_id', $organizationId)
                ->whereIn('school_id', $schoolIds)
                ->whereNull('deleted_at')
                ->groupBy('school_id')
                ->select('school_id', DB::raw('COUNT(*) as total'))
                ->pluck('total', 'school_id')
                ->map(fn ($value) => (int) $value)
                ->toArray();

            $buildingsBySchool = DB::connection('pgsql')
                ->table('buildings')
                ->whereIn('school_id', $schoolIds)
                ->whereNull('deleted_at')
                ->groupBy('school_id')
                ->select('school_id', DB::raw('COUNT(*) as total'))
                ->pluck('total', 'school_id')
                ->map(fn ($value) => (int) $value)
                ->toArray();

            $roomsBySchool = DB::connection('pgsql')
                ->table('rooms')
                ->whereIn('school_id', $schoolIds)
                ->whereNull('deleted_at')
                ->groupBy('school_id')
                ->select('school_id', DB::raw('COUNT(*) as total'))
                ->pluck('total', 'school_id')
                ->map(fn ($value) => (int) $value)
                ->toArray();

            $today = Carbon::today()->toDateString();
            $attendanceRows = DB::connection('pgsql')
                ->table('attendance_sessions as s')
                ->leftJoin('attendance_records as r', function ($join): void {
                    $join->on('r.attendance_session_id', '=', 's.id')
                        ->whereNull('r.deleted_at');
                })
                ->where('s.organization_id', $organizationId)
                ->whereIn('s.school_id', $schoolIds)
                ->whereDate('s.session_date', $today)
                ->whereNull('s.deleted_at')
                ->groupBy('s.school_id')
                ->select(
                    's.school_id',
                    DB::raw("SUM(CASE WHEN r.status = 'present' THEN 1 ELSE 0 END) as present_total"),
                    DB::raw('COUNT(r.id) as expected_total')
                )
                ->get();

            $attendanceBySchool = [];
            foreach ($attendanceRows as $row) {
                $attendanceBySchool[(string) $row->school_id] = [
                    'present' => (int) ($row->present_total ?? 0),
                    'total' => (int) ($row->expected_total ?? 0),
                ];
            }

            $incomeBySchool = DB::connection('pgsql')
                ->table('income_entries')
                ->where('organization_id', $organizationId)
                ->whereIn('school_id', $schoolIds)
                ->whereNull('deleted_at')
                ->groupBy('school_id')
                ->select('school_id', DB::raw('COALESCE(SUM(amount), 0) as total'))
                ->pluck('total', 'school_id')
                ->map(fn ($value) => (float) $value)
                ->toArray();

            $expenseBySchool = DB::connection('pgsql')
                ->table('expense_entries')
                ->where('organization_id', $organizationId)
                ->whereIn('school_id', $schoolIds)
                ->whereNull('deleted_at')
                ->where('status', '!=', 'rejected')
                ->groupBy('school_id')
                ->select('school_id', DB::raw('COALESCE(SUM(amount), 0) as total'))
                ->pluck('total', 'school_id')
                ->map(fn ($value) => (float) $value)
                ->toArray();

            $feeCollectionBySchool = DB::connection('pgsql')
                ->table('fee_payments')
                ->where('organization_id', $organizationId)
                ->whereIn('school_id', $schoolIds)
                ->whereNull('deleted_at')
                ->groupBy('school_id')
                ->select('school_id', DB::raw('COALESCE(SUM(amount), 0) as total'))
                ->pluck('total', 'school_id')
                ->map(fn ($value) => (float) $value)
                ->toArray();

            $schoolsOverview = [];
            foreach ($schools as $school) {
                $schoolId = (string) $school->id;
                $attendance = $attendanceBySchool[$schoolId] ?? ['present' => 0, 'total' => 0];
                $attendanceRate = $attendance['total'] > 0
                    ? round(($attendance['present'] / $attendance['total']) * 100, 1)
                    : 0.0;

                $income = (float) ($incomeBySchool[$schoolId] ?? 0);
                $expense = (float) ($expenseBySchool[$schoolId] ?? 0);
                $feeCollection = (float) ($feeCollectionBySchool[$schoolId] ?? 0);

                $schoolsOverview[] = [
                    'id' => $schoolId,
                    'name' => (string) $school->school_name,
                    'slug' => $school->school_slug ? (string) $school->school_slug : null,
                    'is_active' => (bool) $school->is_active,
                    'students_count' => (int) ($studentsBySchool[$schoolId] ?? 0),
                    'staff_count' => (int) ($staffBySchool[$schoolId] ?? 0),
                    'classes_count' => (int) ($classesBySchool[$schoolId] ?? 0),
                    'buildings_count' => (int) ($buildingsBySchool[$schoolId] ?? 0),
                    'rooms_count' => (int) ($roomsBySchool[$schoolId] ?? 0),
                    'today_attendance' => [
                        'present' => $attendance['present'],
                        'total' => $attendance['total'],
                        'rate' => $attendanceRate,
                    ],
                    'finance' => [
                        'income' => round($income, 2),
                        'expense' => round($expense, 2),
                        'net' => round($income - $expense, 2),
                        'fee_collection' => round($feeCollection, 2),
                    ],
                ];
            }

            $totalStudents = array_sum(array_column($schoolsOverview, 'students_count'));
            $totalStaff = array_sum(array_column($schoolsOverview, 'staff_count'));
            $totalClasses = array_sum(array_column($schoolsOverview, 'classes_count'));
            $totalBuildings = array_sum(array_column($schoolsOverview, 'buildings_count'));
            $totalRooms = array_sum(array_column($schoolsOverview, 'rooms_count'));
            $totalAttendancePresent = array_sum(array_map(
                fn ($schoolRow) => (int) ($schoolRow['today_attendance']['present'] ?? 0),
                $schoolsOverview
            ));
            $totalAttendanceExpected = array_sum(array_map(
                fn ($schoolRow) => (int) ($schoolRow['today_attendance']['total'] ?? 0),
                $schoolsOverview
            ));
            $attendanceRate = $totalAttendanceExpected > 0
                ? round(($totalAttendancePresent / $totalAttendanceExpected) * 100, 1)
                : 0.0;

            $totalIncome = round(array_sum(array_map(
                fn ($schoolRow) => (float) ($schoolRow['finance']['income'] ?? 0),
                $schoolsOverview
            )), 2);
            $totalExpense = round(array_sum(array_map(
                fn ($schoolRow) => (float) ($schoolRow['finance']['expense'] ?? 0),
                $schoolsOverview
            )), 2);
            $totalFeeCollection = round(array_sum(array_map(
                fn ($schoolRow) => (float) ($schoolRow['finance']['fee_collection'] ?? 0),
                $schoolsOverview
            )), 2);

            $upcomingExamsBase = DB::connection('pgsql')
                ->table('exams')
                ->where('organization_id', $organizationId)
                ->whereIn('school_id', $schoolIds)
                ->whereNull('deleted_at')
                ->whereNotNull('start_date')
                ->whereDate('start_date', '>=', $today);

            $upcomingExamsCount = (clone $upcomingExamsBase)->count();
            $upcomingExams = (clone $upcomingExamsBase)
                ->orderBy('start_date')
                ->limit(5)
                ->get(['id', 'school_id', 'name', 'start_date', 'status']);

            $schoolNamesById = [];
            foreach ($schoolsOverview as $schoolRow) {
                $schoolNamesById[$schoolRow['id']] = $schoolRow['name'];
            }

            $recentActivity = [];
            try {
                if (DB::connection('pgsql')->getSchemaBuilder()->hasTable('activity_log')) {
                    $activityRows = DB::connection('pgsql')
                        ->table('activity_log')
                        ->where('organization_id', $organizationId)
                        ->orderByDesc('created_at')
                        ->limit(8)
                        ->get(['id', 'description', 'event', 'created_at', 'subject_type']);

                    $recentActivity = $activityRows->map(function ($row) {
                        return [
                            'id' => (string) $row->id,
                            'description' => (string) ($row->description ?? ''),
                            'event' => (string) ($row->event ?? ''),
                            'subject_type' => (string) ($row->subject_type ?? ''),
                            'created_at' => (string) ($row->created_at ?? ''),
                        ];
                    })->toArray();
                }
            } catch (\Throwable $ignored) {
                $recentActivity = [];
            }

            $schoolsWithoutAttendanceToday = count(array_filter(
                $schoolsOverview,
                fn ($schoolRow) => (int) ($schoolRow['today_attendance']['total'] ?? 0) === 0
            ));

            $alerts = [];
            if ($schoolsWithoutAttendanceToday > 0) {
                $alerts[] = [
                    'type' => 'attendance',
                    'severity' => 'warning',
                    'message' => "{$schoolsWithoutAttendanceToday} school(s) have no attendance records today.",
                ];
            }

            return response()->json([
                'summary' => [
                    'total_students' => $totalStudents,
                    'total_staff' => $totalStaff,
                    'total_schools' => count($schoolsOverview),
                    'active_schools' => count(array_filter($schoolsOverview, fn ($schoolRow) => (bool) ($schoolRow['is_active'] ?? false))),
                    'total_classes' => $totalClasses,
                    'total_buildings' => $totalBuildings,
                    'total_rooms' => $totalRooms,
                    'today_attendance' => [
                        'present' => $totalAttendancePresent,
                        'total' => $totalAttendanceExpected,
                        'rate' => $attendanceRate,
                    ],
                    'finance' => [
                        'income' => $totalIncome,
                        'expense' => $totalExpense,
                        'net' => round($totalIncome - $totalExpense, 2),
                        'fee_collection' => $totalFeeCollection,
                    ],
                ],
                'schools' => $schoolsOverview,
                'charts' => [
                    'students_by_school' => array_map(
                        fn ($schoolRow) => ['name' => $schoolRow['name'], 'value' => $schoolRow['students_count']],
                        $schoolsOverview
                    ),
                    'staff_by_school' => array_map(
                        fn ($schoolRow) => ['name' => $schoolRow['name'], 'value' => $schoolRow['staff_count']],
                        $schoolsOverview
                    ),
                    'attendance_rate_by_school' => array_map(
                        fn ($schoolRow) => ['name' => $schoolRow['name'], 'value' => $schoolRow['today_attendance']['rate']],
                        $schoolsOverview
                    ),
                    'fee_collection_by_school' => array_map(
                        fn ($schoolRow) => ['name' => $schoolRow['name'], 'value' => $schoolRow['finance']['fee_collection']],
                        $schoolsOverview
                    ),
                    'income_by_school' => array_map(
                        fn ($schoolRow) => ['name' => $schoolRow['name'], 'value' => $schoolRow['finance']['income']],
                        $schoolsOverview
                    ),
                    'expense_by_school' => array_map(
                        fn ($schoolRow) => ['name' => $schoolRow['name'], 'value' => $schoolRow['finance']['expense']],
                        $schoolsOverview
                    ),
                ],
                'today_summary' => [
                    'upcoming_exams_count' => (int) $upcomingExamsCount,
                    'upcoming_exams' => $upcomingExams->map(function ($exam) use ($schoolNamesById) {
                        $schoolId = (string) ($exam->school_id ?? '');
                        return [
                            'id' => (string) $exam->id,
                            'name' => (string) $exam->name,
                            'school_id' => $schoolId,
                            'school_name' => $schoolNamesById[$schoolId] ?? 'Unknown School',
                            'start_date' => (string) ($exam->start_date ?? ''),
                            'status' => (string) ($exam->status ?? ''),
                        ];
                    }),
                    'recent_activity' => $recentActivity,
                    'alerts' => $alerts,
                    'schools_without_attendance_today' => $schoolsWithoutAttendanceToday,
                ],
                'generated_at' => now()->toIso8601String(),
            ]);
        } catch (\Throwable $e) {
            Log::error('OrganizationDashboardController::overview failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'error' => 'Failed to fetch organization dashboard overview',
            ], 500);
        }
    }
}

