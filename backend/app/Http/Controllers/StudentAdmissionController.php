<?php

namespace App\Http\Controllers;

use App\Models\StudentAdmission;
use App\Models\Student;
use App\Http\Requests\StoreStudentAdmissionRequest;
use App\Http\Requests\UpdateStudentAdmissionRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class StudentAdmissionController extends Controller
{
    /**
     * Get accessible organization IDs for the current user
     */
    private function getAccessibleOrgIds($profile): array
    {
        // All users are restricted to their own organization
        if ($profile->organization_id) {
            return [$profile->organization_id];
        }
        
        return [];
    }

    /**
     * Display a listing of student admissions
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $orgIds = $this->getAccessibleOrgIds($profile);

        if (empty($orgIds)) {
            return response()->json([]);
        }

        // Get accessible school IDs based on permission and default_school_id
        $schoolIds = $this->getAccessibleSchoolIds($profile);

        // Filter by accessible schools
        if (empty($schoolIds)) {
            // If no accessible schools, return empty
            return response()->json([]);
        }

        $query = StudentAdmission::with([
            'student:id,full_name,admission_no,student_code,gender,admission_year,guardian_phone,guardian_name,card_number,father_name,picture_path',
            'organization',
            'school',
            'academicYear',
            'class',
            'classAcademicYear',
            'residencyType',
            'room'
        ])
            ->whereNull('deleted_at')
            ->whereIn('organization_id', $orgIds)
            ->whereIn('school_id', $schoolIds);

        // Apply filters
        if ($request->has('organization_id') && $request->organization_id) {
            if (in_array($request->organization_id, $orgIds)) {
                $query->where('organization_id', $request->organization_id);
            } else {
                return response()->json([]);
            }
        }

        if ($request->has('student_id') && $request->student_id) {
            $query->where('student_id', $request->student_id);
        }

        if ($request->has('academic_year_id') && $request->academic_year_id) {
            $query->where('academic_year_id', $request->academic_year_id);
        }

        if ($request->has('class_id') && $request->class_id) {
            $query->where('class_id', $request->class_id);
        }

        if ($request->has('enrollment_status') && $request->enrollment_status) {
            $query->where('enrollment_status', $request->enrollment_status);
        }

        if ($request->has('is_boarder') && $request->is_boarder !== null) {
            $query->where('is_boarder', filter_var($request->is_boarder, FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->has('residency_type_id') && $request->residency_type_id) {
            $query->where('residency_type_id', $request->residency_type_id);
        }

        // Validate school_id filter against accessible schools
        if ($request->has('school_id') && $request->school_id) {
            if (in_array($request->school_id, $schoolIds)) {
                $query->where('school_id', $request->school_id);
            } else {
                return response()->json(['error' => 'School not accessible'], 403);
            }
        }

        // Support pagination if page and per_page parameters are provided
        if ($request->has('page') || $request->has('per_page')) {
            $perPage = $request->input('per_page', 25);
            // Validate per_page is one of allowed values
            $allowedPerPage = [10, 25, 50, 100];
            if (!in_array((int)$perPage, $allowedPerPage)) {
                $perPage = 25; // Default to 25 if invalid
            }
            
            $admissions = $query->orderBy('admission_date', 'desc')
                ->orderBy('created_at', 'desc')
                ->paginate((int)$perPage);
            
            // Return paginated response in Laravel's standard format
            return response()->json($admissions);
        }

        // Return all results if no pagination requested (backward compatibility)
        $admissions = $query->orderBy('admission_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($admissions);
    }

    /**
     * Display the specified student admission
     */
    public function show(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        try {
            if (!$user->hasPermissionTo('student_admissions.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::error("Permission check failed for student_admissions.read: " . $e->getMessage());
            return response()->json(['error' => 'Permission check failed'], 500);
        }

        $admission = StudentAdmission::with([
            'student',
            'organization',
            'school',
            'academicYear',
            'class',
            'classAcademicYear',
            'residencyType',
            'room'
        ])
            ->whereNull('deleted_at')
            ->find($id);

        if (!$admission) {
            return response()->json(['error' => 'Student admission not found'], 404);
        }

        $orgIds = $this->getAccessibleOrgIds($profile);

        if (!in_array($admission->organization_id, $orgIds)) {
            return response()->json(['error' => 'Student admission not found'], 404);
        }

        return response()->json($admission);
    }

    /**
     * Store a newly created student admission
     */
    public function store(StoreStudentAdmissionRequest $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('student_admissions.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for student_admissions.create: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $orgIds = $this->getAccessibleOrgIds($profile);

        // Get student to determine organization
        $student = Student::whereNull('deleted_at')->find($request->student_id);
        if (!$student) {
            return response()->json(['error' => 'Student not found'], 404);
        }

        // Determine organization_id from student or request
        $organizationId = $request->organization_id ?? $student->organization_id ?? $profile->organization_id;
        if (!$organizationId) {
            return response()->json(['error' => 'Organization ID is required'], 422);
        }

        // Validate organization access
        if (!in_array($organizationId, $orgIds)) {
            return response()->json(['error' => 'Cannot create admission for this organization'], 403);
        }

        // Validate student belongs to organization
        if ($student->organization_id !== $organizationId) {
            return response()->json(['error' => 'Student organization mismatch'], 422);
        }

        $validated = $request->validated();
        $validated['organization_id'] = $organizationId;

        // Set defaults
        $validated['admission_date'] = $validated['admission_date'] ?? now()->toDateString();
        $validated['enrollment_status'] = $validated['enrollment_status'] ?? 'admitted';
        $validated['is_boarder'] = $validated['is_boarder'] ?? false;

        // Get school_id from student if not provided
        if (!isset($validated['school_id']) && $student->school_id) {
            $validated['school_id'] = $student->school_id;
        }

        $admission = StudentAdmission::create($validated);

        $admission->load([
            'student',
            'organization',
            'school',
            'academicYear',
            'class',
            'classAcademicYear',
            'residencyType',
            'room'
        ]);

        return response()->json($admission, 201);
    }

    /**
     * Update the specified student admission
     */
    public function update(UpdateStudentAdmissionRequest $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('student_admissions.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for student_admissions.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $admission = StudentAdmission::whereNull('deleted_at')->find($id);

        if (!$admission) {
            return response()->json(['error' => 'Student admission not found'], 404);
        }

        $orgIds = $this->getAccessibleOrgIds($profile);

        if (!in_array($admission->organization_id, $orgIds)) {
            return response()->json(['error' => 'Cannot update admission from different organization'], 403);
        }

        $validated = $request->validated();
        
        // Remove organization_id from update data to prevent changes
        unset($validated['organization_id']);

        $admission->update($validated);
        $admission->load([
            'student',
            'organization',
            'school',
            'academicYear',
            'class',
            'classAcademicYear',
            'residencyType',
            'room'
        ]);

        return response()->json($admission);
    }

    /**
     * Remove the specified student admission (soft delete)
     */
    public function destroy(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('student_admissions.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for student_admissions.delete: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $admission = StudentAdmission::whereNull('deleted_at')->find($id);

        if (!$admission) {
            return response()->json(['error' => 'Student admission not found'], 404);
        }

        $orgIds = $this->getAccessibleOrgIds($profile);

        if (!in_array($admission->organization_id, $orgIds)) {
            return response()->json(['error' => 'Cannot delete admission from different organization'], 403);
        }

        $admission->delete();

        return response()->json(['message' => 'Student admission deleted successfully']);
    }

    /**
     * Build a standardized empty report response.
     */
    private function buildEmptyReport(): array
    {
        return [
            'totals' => [
                'total' => 0,
                'active' => 0,
                'pending' => 0,
                'boarders' => 0,
            ],
            'status_breakdown' => [],
            'school_breakdown' => [],
            'academic_year_breakdown' => [],
            'residency_breakdown' => [],
            'recent_admissions' => [],
            'pagination' => [
                'current_page' => 1,
                'per_page' => 25,
                'total' => 0,
                'last_page' => 1,
                'from' => 0,
                'to' => 0,
            ],
        ];
    }

    /**
     * Generate report data for student admissions.
     */
    public function report(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        if (function_exists('setPermissionsTeamId')) {
            setPermissionsTeamId($profile->organization_id);
        }

        try {
            if (!$user->hasPermissionTo('student_admissions.report')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for student_admissions.report: ' . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $orgIds = $this->getAccessibleOrgIds($profile);
        $schoolIds = $this->getAccessibleSchoolIds($profile);

        if (empty($orgIds) || empty($schoolIds)) {
            return response()->json($this->buildEmptyReport());
        }

        $validator = Validator::make($request->all(), [
            'organization_id' => 'nullable|string',
            'school_id' => 'nullable|string',
            'academic_year_id' => 'nullable|string',
            'class_id' => 'nullable|string',
            'enrollment_status' => 'nullable|string',
            'residency_type_id' => 'nullable|string',
            'is_boarder' => 'nullable|boolean',
            'from_date' => 'nullable|date',
            'to_date' => 'nullable|date',
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Invalid filters provided',
                'details' => $validator->errors(),
            ], 422);
        }

        $filters = $validator->validated();

        if (!empty($filters['from_date']) && !empty($filters['to_date'])) {
            $fromDate = Carbon::parse($filters['from_date']);
            $toDate = Carbon::parse($filters['to_date']);

            if ($fromDate->gt($toDate)) {
                return response()->json([
                    'error' => 'Invalid date range',
                    'details' => ['from_date' => ['Start date must be before end date']],
                ], 422);
            }
        }

        $query = StudentAdmission::query()
            ->whereNull('student_admissions.deleted_at')
            ->whereIn('student_admissions.organization_id', $orgIds)
            ->whereIn('student_admissions.school_id', $schoolIds);

        if (!empty($filters['organization_id'])) {
            if (in_array($filters['organization_id'], $orgIds, true)) {
                $query->where('student_admissions.organization_id', $filters['organization_id']);
            } else {
                return response()->json($this->buildEmptyReport());
            }
        }

        if (!empty($filters['school_id'])) {
            if (in_array($filters['school_id'], $schoolIds, true)) {
                $query->where('student_admissions.school_id', $filters['school_id']);
            } else {
                return response()->json(['error' => 'School not accessible'], 403);
            }
        }

        if (!empty($filters['academic_year_id'])) {
            $query->where('student_admissions.academic_year_id', $filters['academic_year_id']);
        }

        if (!empty($filters['class_id'])) {
            $query->where('student_admissions.class_id', $filters['class_id']);
        }

        if (!empty($filters['enrollment_status'])) {
            $query->where('student_admissions.enrollment_status', $filters['enrollment_status']);
        }

        if (array_key_exists('is_boarder', $filters) && $filters['is_boarder'] !== null) {
            $query->where('student_admissions.is_boarder', filter_var($filters['is_boarder'], FILTER_VALIDATE_BOOLEAN));
        }

        if (!empty($filters['residency_type_id'])) {
            $query->where('student_admissions.residency_type_id', $filters['residency_type_id']);
        }

        if (!empty($filters['from_date'])) {
            try {
                $parsedFrom = Carbon::parse($filters['from_date'])->toDateString();
                $query->whereDate('student_admissions.admission_date', '>=', $parsedFrom);
            } catch (\Exception $e) {
                Log::info('Invalid from_date provided for admissions report', ['value' => $filters['from_date']]);
            }
        }

        if (!empty($filters['to_date'])) {
            try {
                $parsedTo = Carbon::parse($filters['to_date'])->toDateString();
                $query->whereDate('student_admissions.admission_date', '<=', $parsedTo);
            } catch (\Exception $e) {
                Log::info('Invalid to_date provided for admissions report', ['value' => $filters['to_date']]);
            }
        }

        $totalsQuery = clone $query;
        $total = (clone $totalsQuery)->count();
        $active = (clone $totalsQuery)->where('student_admissions.enrollment_status', 'active')->count();
        $pending = (clone $totalsQuery)->whereIn('student_admissions.enrollment_status', ['pending', 'admitted'])->count();
        $boarders = (clone $totalsQuery)->where('student_admissions.is_boarder', true)->count();

        $statusBreakdown = (clone $query)
            ->select('student_admissions.enrollment_status', DB::raw('COUNT(*) as total'))
            ->groupBy('student_admissions.enrollment_status')
            ->orderByDesc('total')
            ->get();

        $schoolBreakdown = (clone $query)
            ->leftJoin('school_branding as schools', 'schools.id', '=', 'student_admissions.school_id')
            ->select(
                'student_admissions.school_id',
                'schools.school_name',
                DB::raw('COUNT(*) as total'),
                DB::raw("SUM(CASE WHEN student_admissions.enrollment_status = 'active' THEN 1 ELSE 0 END) as active_count"),
                DB::raw('SUM(CASE WHEN student_admissions.is_boarder = true THEN 1 ELSE 0 END) as boarder_count')
            )
            ->groupBy('student_admissions.school_id', 'schools.school_name')
            ->orderByDesc('total')
            ->get();

        $academicYearBreakdown = (clone $query)
            ->leftJoin('academic_years', 'academic_years.id', '=', 'student_admissions.academic_year_id')
            ->select(
                'student_admissions.academic_year_id',
                'academic_years.name as academic_year_name',
                DB::raw('COUNT(*) as total'),
                DB::raw("SUM(CASE WHEN student_admissions.enrollment_status = 'active' THEN 1 ELSE 0 END) as active_count"),
                DB::raw('SUM(CASE WHEN student_admissions.is_boarder = true THEN 1 ELSE 0 END) as boarder_count')
            )
            ->groupBy('student_admissions.academic_year_id', 'academic_years.name')
            ->orderByDesc('total')
            ->get();

        $residencyBreakdown = (clone $query)
            ->leftJoin('residency_types', 'residency_types.id', '=', 'student_admissions.residency_type_id')
            ->select(
                'student_admissions.residency_type_id',
                'residency_types.name as residency_type_name',
                DB::raw('COUNT(*) as total'),
                DB::raw('SUM(CASE WHEN student_admissions.is_boarder = true THEN 1 ELSE 0 END) as boarder_count'),
                DB::raw("SUM(CASE WHEN student_admissions.enrollment_status = 'active' THEN 1 ELSE 0 END) as active_count")
            )
            ->groupBy('student_admissions.residency_type_id', 'residency_types.name')
            ->orderByDesc('total')
            ->get();

        // Pagination for admissions list
        $page = (int) ($request->input('page', 1));
        $perPage = (int) ($request->input('per_page', 25));
        $perPage = min(max($perPage, 1), 100); // Clamp between 1 and 100

        $admissionsQuery = (clone $query)
            ->with([
                'student:id,full_name,admission_no,gender,admission_year,guardian_phone,guardian_name,card_number,father_name',
                'organization:id,name',
                'school:id,school_name',
                'academicYear:id,name,start_date,end_date',
                'class:id,name,grade_level',
                'classAcademicYear:id,section_name',
                'residencyType:id,name',
                'room:id,room_number',
            ])
            ->orderBy('student_admissions.admission_date', 'desc')
            ->orderBy('student_admissions.created_at', 'desc');

        $totalAdmissions = $admissionsQuery->count();
        $admissions = $admissionsQuery
            ->skip(($page - 1) * $perPage)
            ->take($perPage)
            ->get();

        $lastPage = (int) ceil($totalAdmissions / $perPage);

        return response()->json([
            'totals' => [
                'total' => $total,
                'active' => $active,
                'pending' => $pending,
                'boarders' => $boarders,
            ],
            'status_breakdown' => $statusBreakdown,
            'school_breakdown' => $schoolBreakdown,
            'academic_year_breakdown' => $academicYearBreakdown,
            'residency_breakdown' => $residencyBreakdown,
            'recent_admissions' => $admissions,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $perPage,
                'total' => $totalAdmissions,
                'last_page' => $lastPage,
                'from' => $totalAdmissions > 0 ? (($page - 1) * $perPage) + 1 : 0,
                'to' => min($page * $perPage, $totalAdmissions),
            ],
        ]);
    }

    /**
     * Get student admission statistics
     */
    public function stats(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $orgIds = $this->getAccessibleOrgIds($profile);

        if (empty($orgIds)) {
            return response()->json([
                'total' => 0,
                'active' => 0,
                'pending' => 0,
                'boarders' => 0,
            ]);
        }

        $query = StudentAdmission::whereNull('deleted_at')
            ->whereIn('organization_id', $orgIds);

        // Apply organization filter if provided
        if ($request->has('organization_id') && $request->organization_id) {
            if (in_array($request->organization_id, $orgIds)) {
                $query->where('organization_id', $request->organization_id);
            } else {
                return response()->json([
                    'total' => 0,
                    'active' => 0,
                    'pending' => 0,
                    'boarders' => 0,
                ]);
            }
        }

        $total = (clone $query)->count();
        $active = (clone $query)->where('enrollment_status', 'active')->count();
        $pending = (clone $query)->whereIn('enrollment_status', ['pending', 'admitted'])->count();
        $boarders = (clone $query)->where('is_boarder', true)->count();

        return response()->json([
            'total' => $total,
            'active' => $active,
            'pending' => $pending,
            'boarders' => $boarders,
        ]);
    }
}



