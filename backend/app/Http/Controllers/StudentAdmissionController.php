<?php

namespace App\Http\Controllers;

use App\Models\StudentAdmission;
use App\Models\Student;
use App\Http\Requests\StoreStudentAdmissionRequest;
use App\Http\Requests\UpdateStudentAdmissionRequest;
use App\Services\Reports\ReportConfig;
use App\Services\Reports\ReportService;
use App\Services\Reports\DateConversionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class StudentAdmissionController extends Controller
{
    public function __construct(
        private ReportService $reportService,
        private DateConversionService $dateService
    ) {}
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

        // Strict school scoping
        $currentSchoolId = $this->getCurrentSchoolId($request);
        $schoolIds = [$currentSchoolId];

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

        // Apply filters (organization and school scope are enforced by middleware/profile)

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

        // Client-provided school_id is ignored; current school is enforced.

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
        $organizationId = $profile->organization_id;
        $currentSchoolId = $this->getCurrentSchoolId($request);

        // Get student (strict org + school scoping)
        $student = Student::where('id', $request->student_id)
            ->where('organization_id', $organizationId)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->first();
        if (!$student) {
            return response()->json(['error' => 'Student not found for this school'], 404);
        }

        // Validate organization access
        if (!in_array($organizationId, $orgIds)) {
            return response()->json(['error' => 'Cannot create admission for this organization'], 403);
        }

        $validated = $request->validated();
        // Force scope fields (never trust client input)
        $validated['organization_id'] = $organizationId;
        $validated['school_id'] = $currentSchoolId;

        // Set defaults
        $validated['admission_date'] = $validated['admission_date'] ?? now()->toDateString();
        $validated['enrollment_status'] = $validated['enrollment_status'] ?? 'admitted';
        $validated['is_boarder'] = $validated['is_boarder'] ?? false;

        // school_id is forced by middleware context

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
        $currentSchoolId = $this->getCurrentSchoolId($request);
        $schoolIds = [$currentSchoolId];

        if (empty($orgIds) || empty($schoolIds)) {
            return response()->json($this->buildEmptyReport());
        }

        $validator = Validator::make($request->all(), [
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
        // organization_id / school_id filters are ignored; scope is enforced by middleware/profile.

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
     * Export student admissions report
     */
    public function export(Request $request)
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
        $currentSchoolId = $this->getCurrentSchoolId($request);
        $schoolIds = [$currentSchoolId];

        if (empty($orgIds) || empty($schoolIds)) {
            return response()->json(['error' => 'No accessible organizations or schools'], 403);
        }

        // Get filters (same as report method)
        $validator = Validator::make($request->all(), [
            'format' => 'required|in:pdf,xlsx',
            'academic_year_id' => 'nullable|string',
            'class_id' => 'nullable|string',
            'enrollment_status' => 'nullable|string',
            'residency_type_id' => 'nullable|string',
            'is_boarder' => 'nullable|boolean',
            'from_date' => 'nullable|date',
            'to_date' => 'nullable|date',
            'calendar_preference' => 'nullable|in:gregorian,jalali,qamari',
            'language' => 'nullable|in:en,ps,fa,ar',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Invalid filters provided',
                'details' => $validator->errors(),
            ], 422);
        }

        $filters = $validator->validated();

        // Build query with same filters as report method
        $query = StudentAdmission::query()
            ->whereNull('student_admissions.deleted_at')
            ->whereIn('student_admissions.organization_id', $orgIds)
            ->whereIn('student_admissions.school_id', $schoolIds);

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
                Log::info('Invalid from_date provided for admissions export', ['value' => $filters['from_date']]);
            }
        }

        if (!empty($filters['to_date'])) {
            try {
                $parsedTo = Carbon::parse($filters['to_date'])->toDateString();
                $query->whereDate('student_admissions.admission_date', '<=', $parsedTo);
            } catch (\Exception $e) {
                Log::info('Invalid to_date provided for admissions export', ['value' => $filters['to_date']]);
            }
        }

        // Get all admissions (no pagination for export)
        $admissions = $query
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
            ->orderBy('student_admissions.created_at', 'desc')
            ->get();

        // Get calendar preference and language from request or use defaults
        $calendarPreference = $request->get('calendar_preference', 'jalali');
        $language = $request->get('language', 'ps');

        // Build filter summary
        $filterSummary = [];
        if (!empty($filters['academic_year_id'])) {
            $filterSummary[] = 'Academic Year: ' . $filters['academic_year_id'];
        }
        if (!empty($filters['class_id'])) {
            $filterSummary[] = 'Class: ' . $filters['class_id'];
        }
        if (!empty($filters['enrollment_status'])) {
            $filterSummary[] = 'Status: ' . $filters['enrollment_status'];
        }
        if (array_key_exists('is_boarder', $filters) && $filters['is_boarder'] !== null) {
            $filterSummary[] = 'Boarder: ' . ($filters['is_boarder'] ? 'Yes' : 'No');
        }
        if (!empty($filters['residency_type_id'])) {
            $filterSummary[] = 'Residency: ' . $filters['residency_type_id'];
        }
        if (!empty($filters['from_date']) && !empty($filters['to_date'])) {
            $filterSummary[] = 'Date Range: ' . $filters['from_date'] . ' to ' . $filters['to_date'];
        }

        // Map admissions to report rows
        $columns = [
            ['key' => 'student_name', 'label' => $language === 'ps' ? 'د زده کړیال نوم' : ($language === 'fa' ? 'نام دانش آموز' : ($language === 'ar' ? 'اسم الطالب' : 'Student Name'))],
            ['key' => 'admission_no', 'label' => $language === 'ps' ? 'د شمولیت شمیره' : ($language === 'fa' ? 'شماره پذیرش' : ($language === 'ar' ? 'رقم القبول' : 'Admission #'))],
            ['key' => 'card_number', 'label' => $language === 'ps' ? 'کارت شمیره' : ($language === 'fa' ? 'شماره کارت' : ($language === 'ar' ? 'رقم البطاقة' : 'Card #'))],
            ['key' => 'school', 'label' => $language === 'ps' ? 'ښوونځی' : ($language === 'fa' ? 'مدرسه' : ($language === 'ar' ? 'المدرسة' : 'School'))],
            ['key' => 'class', 'label' => $language === 'ps' ? 'صنف' : ($language === 'fa' ? 'کلاس' : ($language === 'ar' ? 'الصف' : 'Class'))],
            ['key' => 'section', 'label' => $language === 'ps' ? 'برخه' : ($language === 'fa' ? 'بخش' : ($language === 'ar' ? 'القسم' : 'Section'))],
            ['key' => 'academic_year', 'label' => $language === 'ps' ? 'د زده کړو کال' : ($language === 'fa' ? 'سال تحصیلی' : ($language === 'ar' ? 'السنة الدراسية' : 'Academic Year'))],
            ['key' => 'residency_type', 'label' => $language === 'ps' ? 'د اوسیدو ډول' : ($language === 'fa' ? 'نوع اقامت' : ($language === 'ar' ? 'نوع الإقامة' : 'Residency Type'))],
            ['key' => 'is_boarder', 'label' => $language === 'ps' ? 'د اوسیدو ډول' : ($language === 'fa' ? 'نوع اقامت' : ($language === 'ar' ? 'نوع الإقامة' : 'Boarder'))],
            ['key' => 'room', 'label' => $language === 'ps' ? 'خونه' : ($language === 'fa' ? 'اتاق' : ($language === 'ar' ? 'الغرفة' : 'Room'))],
            ['key' => 'guardian_name', 'label' => $language === 'ps' ? 'د سرپرست نوم' : ($language === 'fa' ? 'نام ولی' : ($language === 'ar' ? 'اسم الولي' : 'Guardian Name'))],
            ['key' => 'guardian_phone', 'label' => $language === 'ps' ? 'د سرپرست تلیفون' : ($language === 'fa' ? 'تلفن ولی' : ($language === 'ar' ? 'هاتف الولي' : 'Guardian Phone'))],
            ['key' => 'enrollment_status', 'label' => $language === 'ps' ? 'د نوم لیکنې حالت' : ($language === 'fa' ? 'وضعیت ثبت نام' : ($language === 'ar' ? 'حالة التسجيل' : 'Enrollment Status'))],
            ['key' => 'admission_date', 'label' => $language === 'ps' ? 'د شمولیت نیټه' : ($language === 'fa' ? 'تاریخ پذیرش' : ($language === 'ar' ? 'تاريخ القبول' : 'Admission Date'))],
        ];

        $rows = [];
        foreach ($admissions as $admission) {
            $rows[] = [
                'student_name' => $admission->student->full_name ?? '—',
                'admission_no' => $admission->student->admission_no ?? '—',
                'card_number' => $admission->student->card_number ?? '—',
                'school' => $admission->school->school_name ?? '—',
                'class' => $admission->class->name ?? '—',
                'section' => $admission->classAcademicYear->section_name ?? '—',
                'academic_year' => $admission->academicYear->name ?? '—',
                'residency_type' => $admission->residencyType->name ?? '—',
                'is_boarder' => $admission->is_boarder ? ($language === 'ps' ? 'هو' : ($language === 'fa' ? 'بله' : ($language === 'ar' ? 'نعم' : 'Yes'))) : ($language === 'ps' ? 'نه' : ($language === 'fa' ? 'خیر' : ($language === 'ar' ? 'لا' : 'No'))),
                'room' => $admission->room->room_number ?? '—',
                'guardian_name' => $admission->student->guardian_name ?? '—',
                'guardian_phone' => $admission->student->guardian_phone ?? '—',
                'enrollment_status' => $admission->enrollment_status ?? '—',
                'admission_date' => $admission->admission_date ? $this->dateService->formatDate($admission->admission_date, $calendarPreference, 'full', $language) : '—',
            ];
        }

        // Get format (pdf or excel)
        $format = strtolower($request->get('format', 'pdf'));
        $reportType = $format === 'xlsx' ? 'excel' : 'pdf';

        // Build date range string for title
        $dateRange = null;
        if (!empty($filters['from_date']) && !empty($filters['to_date'])) {
            $dateRange = $this->dateService->formatDate($filters['from_date'], $calendarPreference, 'full', $language) . 
                        ' - ' . 
                        $this->dateService->formatDate($filters['to_date'], $calendarPreference, 'full', $language);
        }

        // Create report config
        $config = ReportConfig::fromArray([
            'report_key' => 'student_admissions',
            'report_type' => $reportType,
            'branding_id' => $currentSchoolId,
            'title' => $language === 'ps' ? 'د زده کړیالانو د شمولیت راپور' : ($language === 'fa' ? 'گزارش پذیرش دانش آموزان' : ($language === 'ar' ? 'تقرير قبول الطلاب' : 'Student Admissions Report')),
            'calendar_preference' => $calendarPreference,
            'language' => $language,
            'parameters' => [
                'filters_summary' => !empty($filterSummary) ? implode(' | ', $filterSummary) : null,
                'total_count' => count($rows),
                'date_range' => $dateRange,
                'show_totals' => true, // Show totals row in Excel
            ],
        ]);

        // Prepare report data
        $data = [
            'columns' => $columns,
            'rows' => $rows,
        ];

        // Generate report
        try {
            $reportRun = $this->reportService->generateReport($config, $data, $profile->organization_id);

            // For synchronous requests, return download
            if ($reportRun->isCompleted()) {
                return redirect("/api/reports/{$reportRun->id}/download");
            }

            // For async requests, return report ID
            return response()->json([
                'success' => true,
                'report_id' => $reportRun->id,
                'status' => $reportRun->status,
                'message' => 'Report generation started',
            ]);
        } catch (\Exception $e) {
            Log::error('Student admissions report generation failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'error' => 'Failed to generate report: ' . $e->getMessage(),
            ], 500);
        }
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

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $query = StudentAdmission::whereNull('deleted_at')
            ->whereIn('organization_id', $orgIds)
            ->where('school_id', $currentSchoolId);

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

    /**
     * Bulk deactivate student admissions
     */
    public function bulkDeactivate(Request $request)
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
            if (!$user->hasPermissionTo('student_admissions.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for student_admissions.bulk_deactivate: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validate([
            'admission_ids' => 'required|array|min:1',
            'admission_ids.*' => 'required|uuid|exists:student_admissions,id',
        ]);

        $orgIds = $this->getAccessibleOrgIds($profile);

        // Get admissions and verify they belong to user's organization
        $admissions = StudentAdmission::whereIn('id', $validated['admission_ids'])
            ->whereIn('organization_id', $orgIds)
            ->whereNull('deleted_at')
            ->get();

        if ($admissions->isEmpty()) {
            return response()->json(['error' => 'No valid admissions found'], 404);
        }

        $deactivated = 0;
        $skipped = 0;

        DB::beginTransaction();
        try {
            foreach ($admissions as $admission) {
                // Only deactivate if currently active
                if ($admission->enrollment_status === 'active') {
                    $admission->enrollment_status = 'inactive';
                    $admission->save();
                    $deactivated++;
                } else {
                    $skipped++;
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Bulk deactivation completed',
                'deactivated_count' => $deactivated,
                'skipped_count' => $skipped,
                'total_processed' => $admissions->count(),
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Bulk deactivation failed: " . $e->getMessage());
            return response()->json(['error' => 'Bulk deactivation failed', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Bulk deactivate student admissions by student IDs and batch context
     * Used from graduation batches page
     */
    public function bulkDeactivateByStudentIds(Request $request)
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
            if (!$user->hasPermissionTo('student_admissions.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for student_admissions.bulk_deactivate_by_student_ids: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validate([
            'student_ids' => 'required|array|min:1',
            'student_ids.*' => 'required|uuid|exists:students,id',
            'class_id' => 'required|uuid|exists:classes,id',
            'academic_year_id' => 'required|uuid|exists:academic_years,id',
        ]);

        $orgIds = $this->getAccessibleOrgIds($profile);

        // Get active admissions for these students in the specified class and academic year
        $admissions = StudentAdmission::whereIn('student_id', $validated['student_ids'])
            ->where('class_id', $validated['class_id'])
            ->where('academic_year_id', $validated['academic_year_id'])
            ->whereIn('organization_id', $orgIds)
            ->where('enrollment_status', 'active')
            ->whereNull('deleted_at')
            ->get();

        if ($admissions->isEmpty()) {
            return response()->json([
                'message' => 'No active admissions found for the selected students',
                'deactivated_count' => 0,
                'skipped_count' => 0,
                'total_processed' => 0,
            ], 200);
        }

        $deactivated = 0;

        DB::beginTransaction();
        try {
            foreach ($admissions as $admission) {
                $admission->enrollment_status = 'inactive';
                $admission->save();
                $deactivated++;
            }

            DB::commit();

            return response()->json([
                'message' => 'Bulk deactivation completed',
                'deactivated_count' => $deactivated,
                'skipped_count' => 0,
                'total_processed' => $admissions->count(),
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Bulk deactivation by student IDs failed: " . $e->getMessage());
            return response()->json(['error' => 'Bulk deactivation failed', 'message' => $e->getMessage()], 500);
        }
    }
}



