<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreStudentAdmissionRequest;
use App\Http\Requests\UpdateStudentAdmissionRequest;
use App\Models\ClassAcademicYear;
use App\Models\ResidencyType;
use App\Models\Room;
use App\Models\Student;
use App\Models\StudentAdmission;
use App\Services\ActivityLogService;
use App\Services\Notifications\NotificationService;
use App\Services\Reports\DateConversionService;
use App\Services\Reports\ReportConfig;
use App\Services\Reports\ReportService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class StudentAdmissionController extends Controller
{
    public function __construct(
        private ReportService $reportService,
        private DateConversionService $dateService,
        private NotificationService $notificationService,
        private ActivityLogService $activityLogService
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

        if (! $profile) {
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
            'student:id,full_name,admission_no,student_code,gender,admission_year,guardian_phone,guardian_name,card_number,father_name,picture_path,student_status',
            'organization',
            'school',
            'academicYear',
            'class',
            'classAcademicYear.teacher:id,full_name',
            'classAcademicYear.room:id,room_number',
            'classAcademicYear.room.building:id,building_name',
            'residencyType',
            'room',
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

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->whereHas('student', function ($studentQuery) use ($search) {
                $studentQuery->where(function ($q) use ($search) {
                    $q->where('full_name', 'ilike', "%{$search}%")
                        ->orWhere('admission_no', 'ilike', "%{$search}%")
                        ->orWhere('student_code', 'ilike', "%{$search}%")
                        ->orWhere('card_number', 'ilike', "%{$search}%")
                        ->orWhere('father_name', 'ilike', "%{$search}%");
                });
            });
        }

        // Client-provided school_id is ignored; current school is enforced.

        // Support pagination if page and per_page parameters are provided
        if ($request->has('page') || $request->has('per_page')) {
            $perPage = $request->input('per_page', 25);
            // Validate per_page is one of allowed values
            $allowedPerPage = [10, 25, 50, 100];
            if (! in_array((int) $perPage, $allowedPerPage)) {
                $perPage = 25; // Default to 25 if invalid
            }

            $admissions = $query->orderBy('admission_date', 'desc')
                ->orderBy('created_at', 'desc')
                ->paginate((int) $perPage);

            $admissions->setCollection(
                $this->attachAdmissionListMeta($admissions->getCollection(), $profile->organization_id, $currentSchoolId)
            );

            // Return paginated response in Laravel's standard format
            return response()->json($admissions);
        }

        // Return all results if no pagination requested (backward compatibility)
        $admissions = $query->orderBy('admission_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        $admissions = $this->attachAdmissionListMeta($admissions, $profile->organization_id, $currentSchoolId);

        return response()->json($admissions);
    }

    /**
     * Display the specified student admission
     */
    public function show(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();
        $currentSchoolId = $this->getCurrentSchoolId(request());

        if (! $profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        try {
            if (! $user->hasPermissionTo('student_admissions.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::error('Permission check failed for student_admissions.read: '.$e->getMessage());

            return response()->json(['error' => 'Permission check failed'], 500);
        }

        $admission = StudentAdmission::with([
            'student',
            'organization',
            'school',
            'academicYear',
            'class',
            'classAcademicYear.teacher:id,full_name',
            'classAcademicYear.room:id,room_number',
            'classAcademicYear.room.building:id,building_name',
            'residencyType',
            'room',
        ])
            ->whereNull('deleted_at')
            ->find($id);

        if (! $admission) {
            return response()->json(['error' => 'Student admission not found'], 404);
        }

        $orgIds = $this->getAccessibleOrgIds($profile);

        if (! in_array($admission->organization_id, $orgIds)) {
            return response()->json(['error' => 'Student admission not found'], 404);
        }

        if ($admission->school_id !== $currentSchoolId) {
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

        if (! $profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Require organization_id for all users
        if (! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (! $user->hasPermissionTo('student_admissions.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for student_admissions.create: '.$e->getMessage());

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
        if (! $student) {
            return response()->json(['error' => 'Student not found for this school'], 404);
        }

        // Validate organization access
        if (! in_array($organizationId, $orgIds)) {
            return response()->json(['error' => 'Cannot create admission for this organization'], 403);
        }

        $validated = $request->validated();
        // Force scope fields (never trust client input)
        $validated['organization_id'] = $organizationId;
        $validated['school_id'] = $currentSchoolId;

        if (! empty($validated['class_academic_year_id'])) {
            $classAcademicYear = ClassAcademicYear::query()
                ->with(['class:id,default_capacity'])
                ->where('id', $validated['class_academic_year_id'])
                ->where('organization_id', $organizationId)
                ->where('school_id', $currentSchoolId)
                ->whereNull('deleted_at')
                ->first();

            if (! $classAcademicYear) {
                return response()->json(['error' => 'Class section not found for this school'], 404);
            }

            // Keep class and academic year aligned with the selected class section.
            $validated['class_id'] = $classAcademicYear->class_id;
            $validated['academic_year_id'] = $classAcademicYear->academic_year_id;

            $effectiveCapacity = $classAcademicYear->capacity ?? $classAcademicYear->class?->default_capacity;
            if ($effectiveCapacity !== null) {
                $activeStudentCount = StudentAdmission::query()
                    ->where('class_academic_year_id', $classAcademicYear->id)
                    ->whereNull('deleted_at')
                    ->whereIn('enrollment_status', ['active', 'admitted'])
                    ->count();

                if ($activeStudentCount >= (int) $effectiveCapacity) {
                    return response()->json([
                        'error' => "Class capacity reached ({$activeStudentCount}/{$effectiveCapacity}). Please increase class limit first.",
                        'class_academic_year_id' => $classAcademicYear->id,
                        'current_student_count' => $activeStudentCount,
                        'capacity' => (int) $effectiveCapacity,
                    ], 422);
                }
            }
        }

        // Set defaults
        $validated['admission_date'] = $validated['admission_date'] ?? now()->toDateString();
        $validated['enrollment_status'] = $validated['enrollment_status'] ?? 'admitted';
        $validated['is_boarder'] = $validated['is_boarder'] ?? false;

        $this->applyDayResidencyClearsBoarding($validated);

        // student_admissions.room_id is HOSTEL room only; day scholars must not have it set.
        if (empty($validated['is_boarder'])) {
            $validated['room_id'] = null;
        }

        // school_id is forced by middleware context

        $admission = StudentAdmission::create($validated);

        $this->syncStudentStatusFromAdmissions($admission->student_id, $organizationId, $currentSchoolId);

        $admission->load([
            'student',
            'organization',
            'school',
            'academicYear',
            'class',
            'classAcademicYear.teacher:id,full_name',
            'classAcademicYear.room:id,room_number',
            'classAcademicYear.room.building:id,building_name',
            'residencyType',
            'room',
        ]);

        // Send notification when admission is created (fast - notification service is optimized)
        try {
            $className = $admission->class->name ?? 'class';
            $academicYearName = $admission->academicYear->name ?? 'academic year';
            $studentName = $admission->student->full_name ?? 'Student';

            $this->notificationService->notify(
                'admission.created',
                $admission,
                $user,
                [
                    'title' => 'Admission Created',
                    'body' => "{$studentName} has been successfully admitted to {$className} for {$academicYearName}.",
                    'url' => '/admissions',
                    'exclude_actor' => false, // Include the creator so they see confirmation
                ]
            );
        } catch (\Exception $e) {
            // Log error but don't fail the request
            Log::warning('Failed to send admission.created notification', [
                'admission_id' => $admission->id,
                'error' => $e->getMessage(),
            ]);
        }

        // Log student admission creation
        try {
            $studentName = $admission->student?->full_name ?? 'Unknown';
            $className = $admission->class?->name ?? 'Unknown';
            $this->activityLogService->logCreate(
                subject: $admission,
                description: "Created student admission: {$studentName} to {$className}",
                properties: [
                    'admission_id' => $admission->id,
                    'student_id' => $admission->student_id,
                    'class_id' => $admission->class_id,
                    'academic_year_id' => $admission->academic_year_id,
                    'enrollment_status' => $admission->enrollment_status,
                ],
                request: $request
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log student admission creation: '.$e->getMessage());
        }

        return response()->json($admission, 201);
    }

    /**
     * Update the specified student admission
     */
    public function update(UpdateStudentAdmissionRequest $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();
        $currentSchoolId = $this->getCurrentSchoolId($request);

        if (! $profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Require organization_id for all users
        if (! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (! $user->hasPermissionTo('student_admissions.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for student_admissions.update: '.$e->getMessage());

            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $admission = StudentAdmission::whereNull('deleted_at')->find($id);

        if (! $admission) {
            return response()->json(['error' => 'Student admission not found'], 404);
        }

        $orgIds = $this->getAccessibleOrgIds($profile);

        if (! in_array($admission->organization_id, $orgIds)) {
            return response()->json(['error' => 'Cannot update admission from different organization'], 403);
        }

        if ($admission->school_id !== $currentSchoolId) {
            return response()->json(['error' => 'Cannot update admission from different school'], 403);
        }

        $validated = $request->validated();

        // Remove organization_id from update data to prevent changes
        unset($validated['organization_id']);

        $this->applyDayResidencyClearsBoarding($validated);

        // student_admissions.room_id is HOSTEL room only; when switching to day scholar, clear it.
        if (array_key_exists('is_boarder', $validated) && empty($validated['is_boarder'])) {
            $validated['room_id'] = null;
        }

        // Capture old values for logging
        $oldValues = $admission->only(['class_id', 'academic_year_id', 'enrollment_status', 'admission_date']);

        // Track status changes for notifications
        $oldStatus = $admission->enrollment_status;
        $newStatus = $validated['enrollment_status'] ?? $oldStatus;

        $admission->update($validated);

        $this->syncStudentStatusFromAdmissions($admission->student_id, $profile->organization_id, $currentSchoolId);

        $admission->load([
            'student',
            'organization',
            'school',
            'academicYear',
            'class',
            'classAcademicYear.teacher:id,full_name',
            'classAcademicYear.room:id,room_number',
            'classAcademicYear.room.building:id,building_name',
            'residencyType',
            'room',
        ]);

        // Send notifications for status changes (fast - notification service is optimized)
        try {
            if ($oldStatus !== $newStatus) {
                $studentName = $admission->student->full_name ?? 'Student';
                $className = $admission->class->name ?? 'class';

                if ($newStatus === 'approved' || $newStatus === 'active') {
                    $this->notificationService->notify(
                        'admission.approved',
                        $admission,
                        $user,
                        [
                            'title' => 'Admission Approved',
                            'body' => "{$studentName}'s admission to {$className} has been approved and is now active.",
                            'url' => '/admissions',
                            'exclude_actor' => false, // Include the approver so they see confirmation
                        ]
                    );
                } elseif ($newStatus === 'rejected' || $newStatus === 'inactive') {
                    $this->notificationService->notify(
                        'admission.rejected',
                        $admission,
                        $user,
                        [
                            'title' => 'Admission Rejected',
                            'body' => "{$studentName}'s admission to {$className} has been rejected or deactivated.",
                            'url' => '/admissions',
                            'exclude_actor' => false, // Include the rejector so they see confirmation
                        ]
                    );
                }
            }
        } catch (\Exception $e) {
            // Log error but don't fail the request
            Log::warning('Failed to send admission status change notification', [
                'admission_id' => $admission->id,
                'old_status' => $oldStatus,
                'new_status' => $newStatus,
                'error' => $e->getMessage(),
            ]);
        }

        // Log student admission update
        try {
            $studentName = $admission->student?->full_name ?? 'Unknown';
            $className = $admission->class?->name ?? 'Unknown';
            $this->activityLogService->logUpdate(
                subject: $admission,
                description: "Updated student admission: {$studentName} to {$className}",
                properties: [
                    'old_values' => $oldValues,
                    'new_values' => $admission->only(['class_id', 'academic_year_id', 'enrollment_status', 'admission_date']),
                ],
                request: $request
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log student admission update: '.$e->getMessage());
        }

        return response()->json($admission);
    }

    /**
     * Remove the specified student admission (soft delete)
     */
    public function destroy(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();
        $currentSchoolId = $this->getCurrentSchoolId(request());

        if (! $profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Require organization_id for all users
        if (! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (! $user->hasPermissionTo('student_admissions.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for student_admissions.delete: '.$e->getMessage());

            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $admission = StudentAdmission::whereNull('deleted_at')
            ->with(['student', 'class', 'academicYear'])
            ->find($id);

        if (! $admission) {
            return response()->json(['error' => 'Student admission not found'], 404);
        }

        $orgIds = $this->getAccessibleOrgIds($profile);

        if (! in_array($admission->organization_id, $orgIds)) {
            return response()->json(['error' => 'Cannot delete admission from different organization'], 403);
        }

        if ($admission->school_id !== $currentSchoolId) {
            return response()->json(['error' => 'Cannot delete admission from different school'], 403);
        }

        // Store data for notification before deletion
        $studentName = $admission->student->full_name ?? 'Student';
        $className = $admission->class->name ?? 'class';
        $academicYearName = $admission->academicYear->name ?? 'academic year';
        $admissionData = $admission->toArray();
        $studentId = $admission->student_id;
        $organizationId = $admission->organization_id;

        $admission->delete();

        $this->syncStudentStatusFromAdmissions($studentId, $organizationId, $currentSchoolId);

        // Log student admission deletion
        try {
            $this->activityLogService->logDelete(
                subject: $admission,
                description: "Deleted student admission: {$studentName} from {$className}",
                properties: ['deleted_admission' => $admissionData],
                request: request()
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log student admission deletion: '.$e->getMessage());
        }

        // Send notification when admission is deleted (fast - notification service is optimized)
        // Note: We need to create a temporary model instance for the notification since the original was deleted
        try {
            // Create a temporary model instance with the data we need for notification
            $tempAdmission = new StudentAdmission;
            $tempAdmission->id = $id;
            $tempAdmission->organization_id = $admission->organization_id;
            $tempAdmission->student_id = $admission->student_id;
            $tempAdmission->class_id = $admission->class_id;
            $tempAdmission->academic_year_id = $admission->academic_year_id;

            $this->notificationService->notify(
                'admission.deleted',
                $tempAdmission,
                $user,
                [
                    'title' => 'Admission Deleted',
                    'body' => "{$studentName}'s admission to {$className} ({$academicYearName}) has been deleted.",
                    'url' => '/admissions',
                    'exclude_actor' => false, // Include the deleter so they see confirmation
                ]
            );
        } catch (\Exception $e) {
            // Log error but don't fail the request
            Log::warning('Failed to send admission.deleted notification', [
                'admission_id' => $id,
                'error' => $e->getMessage(),
            ]);
        }

        return response()->noContent();
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

        if (! $profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        if (function_exists('setPermissionsTeamId')) {
            setPermissionsTeamId($profile->organization_id);
        }

        try {
            if (! $user->hasPermissionTo('student_admissions.report')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for student_admissions.report: '.$e->getMessage());

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

        if (! empty($filters['from_date']) && ! empty($filters['to_date'])) {
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

        if (! empty($filters['academic_year_id'])) {
            $query->where('student_admissions.academic_year_id', $filters['academic_year_id']);
        }

        if (! empty($filters['class_id'])) {
            $query->where('student_admissions.class_id', $filters['class_id']);
        }

        if (! empty($filters['enrollment_status'])) {
            $query->where('student_admissions.enrollment_status', $filters['enrollment_status']);
        }

        if (array_key_exists('is_boarder', $filters) && $filters['is_boarder'] !== null) {
            $query->where('student_admissions.is_boarder', filter_var($filters['is_boarder'], FILTER_VALIDATE_BOOLEAN));
        }

        if (! empty($filters['residency_type_id'])) {
            $query->where('student_admissions.residency_type_id', $filters['residency_type_id']);
        }

        if (! empty($filters['from_date'])) {
            try {
                $parsedFrom = Carbon::parse($filters['from_date'])->toDateString();
                $query->whereDate('student_admissions.admission_date', '>=', $parsedFrom);
            } catch (\Exception $e) {
                Log::info('Invalid from_date provided for admissions report', ['value' => $filters['from_date']]);
            }
        }

        if (! empty($filters['to_date'])) {
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

        if (! $profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        if (function_exists('setPermissionsTeamId')) {
            setPermissionsTeamId($profile->organization_id);
        }

        try {
            if (! $user->hasPermissionTo('student_admissions.report')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for student_admissions.report: '.$e->getMessage());

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

        if (! empty($filters['academic_year_id'])) {
            $query->where('student_admissions.academic_year_id', $filters['academic_year_id']);
        }

        if (! empty($filters['class_id'])) {
            $query->where('student_admissions.class_id', $filters['class_id']);
        }

        if (! empty($filters['enrollment_status'])) {
            $query->where('student_admissions.enrollment_status', $filters['enrollment_status']);
        }

        if (array_key_exists('is_boarder', $filters) && $filters['is_boarder'] !== null) {
            $query->where('student_admissions.is_boarder', filter_var($filters['is_boarder'], FILTER_VALIDATE_BOOLEAN));
        }

        if (! empty($filters['residency_type_id'])) {
            $query->where('student_admissions.residency_type_id', $filters['residency_type_id']);
        }

        if (! empty($filters['from_date'])) {
            try {
                $parsedFrom = Carbon::parse($filters['from_date'])->toDateString();
                $query->whereDate('student_admissions.admission_date', '>=', $parsedFrom);
            } catch (\Exception $e) {
                Log::info('Invalid from_date provided for admissions export', ['value' => $filters['from_date']]);
            }
        }

        if (! empty($filters['to_date'])) {
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
        if (! empty($filters['academic_year_id'])) {
            $filterSummary[] = 'Academic Year: '.$filters['academic_year_id'];
        }
        if (! empty($filters['class_id'])) {
            $filterSummary[] = 'Class: '.$filters['class_id'];
        }
        if (! empty($filters['enrollment_status'])) {
            $filterSummary[] = 'Status: '.$filters['enrollment_status'];
        }
        if (array_key_exists('is_boarder', $filters) && $filters['is_boarder'] !== null) {
            $filterSummary[] = 'Boarder: '.($filters['is_boarder'] ? 'Yes' : 'No');
        }
        if (! empty($filters['residency_type_id'])) {
            $filterSummary[] = 'Residency: '.$filters['residency_type_id'];
        }
        if (! empty($filters['from_date']) && ! empty($filters['to_date'])) {
            $filterSummary[] = 'Date Range: '.$filters['from_date'].' to '.$filters['to_date'];
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
        if (! empty($filters['from_date']) && ! empty($filters['to_date'])) {
            $dateRange = $this->dateService->formatDate($filters['from_date'], $calendarPreference, 'full', $language).
                        ' - '.
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
                'filters_summary' => ! empty($filterSummary) ? implode(' | ', $filterSummary) : null,
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
            Log::error('Student admissions report generation failed: '.$e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'error' => 'Failed to generate report: '.$e->getMessage(),
            ], 500);
        }

        // Log report export
        try {
            $this->activityLogService->logEvent(
                subject: null,
                description: 'Exported student admissions report',
                properties: [
                    'format' => $format,
                    'filters' => $filters,
                    'count' => count($admissions),
                ],
                request: $request
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log student admissions report export: '.$e->getMessage());
        }
    }

    /**
     * Get student admission statistics
     */
    public function stats(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (! $profile) {
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
        $currentSchoolId = $this->getCurrentSchoolId($request);

        if (! $profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Require organization_id for all users
        if (! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (! $user->hasPermissionTo('student_admissions.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for student_admissions.bulk_deactivate: '.$e->getMessage());

            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validate([
            'admission_ids' => 'required|array|min:1',
            'admission_ids.*' => 'required|uuid|exists:student_admissions,id',
        ]);

        $orgIds = $this->getAccessibleOrgIds($profile);

        // Get admissions and verify they belong to user's organization and current school
        $admissions = StudentAdmission::whereIn('id', $validated['admission_ids'])
            ->whereIn('organization_id', $orgIds)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->get();

        if ($admissions->isEmpty()) {
            return response()->json(['error' => 'No valid admissions found'], 404);
        }

        $deactivated = 0;
        $skipped = 0;
        $touchedStudentIds = [];

        DB::beginTransaction();
        try {
            foreach ($admissions as $admission) {
                // Only deactivate if currently active
                if ($admission->enrollment_status === 'active') {
                    $admission->enrollment_status = 'inactive';
                    $admission->save();
                    $touchedStudentIds[] = $admission->student_id;
                    $deactivated++;
                } else {
                    $skipped++;
                }
            }

            foreach (array_values(array_unique($touchedStudentIds)) as $studentId) {
                $this->syncStudentStatusFromAdmissions($studentId, $profile->organization_id, $currentSchoolId);
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
            Log::error('Bulk deactivation failed: '.$e->getMessage());

            return response()->json(['error' => 'Bulk deactivation failed', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Bulk update student admission statuses and synchronize the linked student master status.
     */
    public function bulkUpdateStatus(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();
        $currentSchoolId = $this->getCurrentSchoolId($request);

        if (! $profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (! $user->hasPermissionTo('student_admissions.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for student_admissions.bulk_update_status: '.$e->getMessage());

            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validate([
            'admission_ids' => 'required|array|min:1',
            'admission_ids.*' => 'required|uuid|exists:student_admissions,id',
            'enrollment_status' => 'required|string|in:pending,admitted,active,inactive,suspended,withdrawn,graduated',
        ]);

        $orgIds = $this->getAccessibleOrgIds($profile);

        $admissions = StudentAdmission::whereIn('id', $validated['admission_ids'])
            ->whereIn('organization_id', $orgIds)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->get();

        if ($admissions->isEmpty()) {
            return response()->json(['error' => 'No valid admissions found'], 404);
        }

        $targetStatus = $validated['enrollment_status'];
        $updated = 0;
        $skipped = 0;
        $touchedStudentIds = [];

        DB::beginTransaction();
        try {
            foreach ($admissions as $admission) {
                if ($admission->enrollment_status === $targetStatus) {
                    $skipped++;

                    continue;
                }

                $admission->enrollment_status = $targetStatus;
                $admission->save();
                $touchedStudentIds[] = $admission->student_id;
                $updated++;
            }

            foreach (array_values(array_unique($touchedStudentIds)) as $studentId) {
                $this->syncStudentStatusFromAdmissions($studentId, $profile->organization_id, $currentSchoolId);
            }

            DB::commit();

            return response()->json([
                'message' => 'Bulk admission status update completed',
                'updated_count' => $updated,
                'skipped_count' => $skipped,
                'total_processed' => $admissions->count(),
                'enrollment_status' => $targetStatus,
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Bulk admission status update failed: '.$e->getMessage());

            return response()->json(['error' => 'Bulk admission status update failed', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Bulk assign class section (class academic year), boarder/day, residency type, and optional hostel room.
     * Pass either admission_ids or student_ids (students must have an admission row for the same academic year as the section).
     */
    public function bulkAssignPlacement(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();
        $currentSchoolId = $this->getCurrentSchoolId($request);

        if (! $profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (! $user->hasPermissionTo('student_admissions.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for student_admissions.bulk_assign_placement: '.$e->getMessage());

            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validate([
            'student_ids' => 'sometimes|array',
            'student_ids.*' => 'uuid|exists:students,id',
            'admission_ids' => 'sometimes|array',
            'admission_ids.*' => 'uuid|exists:student_admissions,id',
            'class_academic_year_id' => 'required|uuid|exists:class_academic_years,id',
            'is_boarder' => 'required|boolean',
            'residency_type_id' => 'nullable|uuid|exists:residency_types,id',
            'room_id' => 'nullable|uuid|exists:rooms,id',
            'enrollment_status' => 'nullable|string|in:pending,admitted,active,inactive,suspended,withdrawn,graduated',
            'shift' => 'nullable|string|max:50',
            'placement_notes' => 'nullable|string|max:500',
            'only_without_class' => 'sometimes|boolean',
        ]);

        $studentIds = array_values(array_filter($validated['student_ids'] ?? []));
        $admissionIds = array_values(array_filter($validated['admission_ids'] ?? []));
        if ((count($studentIds) === 0 && count($admissionIds) === 0) || (count($studentIds) > 0 && count($admissionIds) > 0)) {
            return response()->json(['error' => 'Provide exactly one of student_ids or admission_ids (non-empty).'], 422);
        }

        $organizationId = $profile->organization_id;
        $orgIds = $this->getAccessibleOrgIds($profile);

        $classAcademicYear = ClassAcademicYear::query()
            ->with(['class:id,default_capacity'])
            ->where('id', $validated['class_academic_year_id'])
            ->where('organization_id', $organizationId)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->first();

        if (! $classAcademicYear) {
            return response()->json(['error' => 'Class section not found for this school'], 404);
        }

        $targetCayId = $classAcademicYear->id;
        $targetClassId = $classAcademicYear->class_id;
        $targetYearId = $classAcademicYear->academic_year_id;

        if (! empty($validated['room_id'])) {
            $roomOk = Room::query()
                ->where('id', $validated['room_id'])
                ->where('school_id', $currentSchoolId)
                ->whereNull('deleted_at')
                ->exists();
            if (! $roomOk) {
                return response()->json(['error' => 'Room not found for this school'], 422);
            }
        }

        if (! empty($validated['residency_type_id'])) {
            $rtOk = ResidencyType::query()
                ->where('id', $validated['residency_type_id'])
                ->where('organization_id', $organizationId)
                ->whereNull('deleted_at')
                ->exists();
            if (! $rtOk) {
                return response()->json(['error' => 'Residency type not found for this organization'], 422);
            }
        }

        $onlyWithoutClass = (bool) ($validated['only_without_class'] ?? true);

        /** @var \Illuminate\Support\Collection<int, StudentAdmission> $admissions */
        $admissions = collect();
        $resolutionErrors = [];

        if (count($admissionIds) > 0) {
            $admissions = StudentAdmission::query()
                ->whereIn('id', $admissionIds)
                ->whereIn('organization_id', $orgIds)
                ->where('school_id', $currentSchoolId)
                ->whereNull('deleted_at')
                ->get();

            if ($admissions->isEmpty()) {
                return response()->json(['error' => 'No valid admissions found'], 404);
            }

            foreach ($admissions as $admission) {
                if ((string) $admission->academic_year_id !== (string) $targetYearId) {
                    return response()->json([
                        'error' => 'Academic year mismatch',
                        'message' => 'All selected admissions must be for the same academic year as the chosen class section.',
                    ], 422);
                }
            }
        } else {
            foreach ($studentIds as $studentId) {
                $student = Student::query()
                    ->where('id', $studentId)
                    ->where('organization_id', $organizationId)
                    ->where('school_id', $currentSchoolId)
                    ->whereNull('deleted_at')
                    ->first();
                if (! $student) {
                    $resolutionErrors[] = ['student_id' => $studentId, 'reason' => 'student_not_found'];

                    continue;
                }

                $query = StudentAdmission::query()
                    ->where('student_id', $studentId)
                    ->where('organization_id', $organizationId)
                    ->where('school_id', $currentSchoolId)
                    ->where('academic_year_id', $targetYearId)
                    ->whereNull('deleted_at');

                if ($onlyWithoutClass) {
                    $query->whereNull('class_academic_year_id');
                }

                $admission = $query->orderByDesc('admission_date')->orderByDesc('created_at')->first();

                if (! $admission) {
                    $reason = $onlyWithoutClass ? 'no_unassigned_admission_for_year' : 'no_admission_for_year';
                    $resolutionErrors[] = ['student_id' => $studentId, 'reason' => $reason];

                    continue;
                }

                $admissions->push($admission);
            }

            if ($admissions->isEmpty()) {
                return response()->json([
                    'error' => 'No admissions could be resolved',
                    'errors' => $resolutionErrors,
                ], 422);
            }
        }

        $admissions = $admissions->unique('id')->values();

        $joiningCount = $admissions->filter(fn (StudentAdmission $a) => (string) $a->class_academic_year_id !== (string) $targetCayId)->count();
        $effectiveCapacity = $classAcademicYear->capacity ?? $classAcademicYear->class?->default_capacity;
        if ($effectiveCapacity !== null) {
            $currentOnTarget = StudentAdmission::query()
                ->where('class_academic_year_id', $targetCayId)
                ->whereNull('deleted_at')
                ->whereIn('enrollment_status', ['active', 'admitted'])
                ->count();

            if ($currentOnTarget + $joiningCount > (int) $effectiveCapacity) {
                return response()->json([
                    'error' => 'Class capacity exceeded',
                    'message' => "This section allows {$effectiveCapacity} active/admitted students; assigning {$joiningCount} more would exceed capacity (currently {$currentOnTarget}).",
                    'capacity' => (int) $effectiveCapacity,
                    'current_on_section' => $currentOnTarget,
                    'requested_new_placements' => $joiningCount,
                ], 422);
            }
        }

        $updated = 0;
        $skipped = 0;
        $rowErrors = $resolutionErrors;
        $touchedStudentIds = [];

        $patch = [
            'class_academic_year_id' => $targetCayId,
            'class_id' => $targetClassId,
            'academic_year_id' => $targetYearId,
            'is_boarder' => (bool) $validated['is_boarder'],
        ];

        if (array_key_exists('residency_type_id', $validated)) {
            $patch['residency_type_id'] = $validated['residency_type_id'];
        }
        if (array_key_exists('shift', $validated)) {
            $patch['shift'] = $validated['shift'];
        }
        if (array_key_exists('placement_notes', $validated)) {
            $patch['placement_notes'] = $validated['placement_notes'];
        }
        if (! empty($validated['enrollment_status'])) {
            $patch['enrollment_status'] = $validated['enrollment_status'];
        }

        if ($patch['is_boarder'] && ! empty($validated['room_id'])) {
            $patch['room_id'] = $validated['room_id'];
        } else {
            $patch['room_id'] = null;
        }

        $this->applyDayResidencyClearsBoarding($patch);

        foreach ($admissions as $admission) {
            if ((string) $admission->class_academic_year_id === (string) $targetCayId
                && $admission->is_boarder === $patch['is_boarder']
                && (string) ($admission->residency_type_id ?? '') === (string) ($patch['residency_type_id'] ?? '')
                && (string) ($admission->room_id ?? '') === (string) ($patch['room_id'] ?? '')
                && (empty($patch['enrollment_status']) || $admission->enrollment_status === $patch['enrollment_status'])) {
                $skipped++;

                continue;
            }

            try {
                $admission->fill($patch);
                $admission->save();
                $touchedStudentIds[] = $admission->student_id;
                $updated++;
            } catch (\Exception $e) {
                Log::warning('Bulk assign placement row failed', [
                    'admission_id' => $admission->id,
                    'error' => $e->getMessage(),
                ]);
                $rowErrors[] = ['admission_id' => $admission->id, 'student_id' => $admission->student_id, 'reason' => 'save_failed', 'message' => $e->getMessage()];
            }
        }

        foreach (array_values(array_unique($touchedStudentIds)) as $studentId) {
            $this->syncStudentStatusFromAdmissions($studentId, $organizationId, $currentSchoolId);
        }

        return response()->json([
            'message' => 'Bulk placement completed',
            'updated_count' => $updated,
            'skipped_count' => $skipped,
            'errors' => $rowErrors,
            'total_candidates' => $admissions->count(),
        ], 200);
    }

    /**
     * Bulk deactivate student admissions by student IDs and batch context
     * Used from graduation batches page
     */
    public function bulkDeactivateByStudentIds(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();
        $currentSchoolId = $this->getCurrentSchoolId($request);

        if (! $profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Require organization_id for all users
        if (! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (! $user->hasPermissionTo('student_admissions.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for student_admissions.bulk_deactivate_by_student_ids: '.$e->getMessage());

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
            ->where('school_id', $currentSchoolId)
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
        $touchedStudentIds = [];

        DB::beginTransaction();
        try {
            foreach ($admissions as $admission) {
                $admission->enrollment_status = 'inactive';
                $admission->save();
                $touchedStudentIds[] = $admission->student_id;
                $deactivated++;
            }

            foreach (array_values(array_unique($touchedStudentIds)) as $studentId) {
                $this->syncStudentStatusFromAdmissions($studentId, $profile->organization_id, $currentSchoolId);
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
            Log::error('Bulk deactivation by student IDs failed: '.$e->getMessage());

            return response()->json(['error' => 'Bulk deactivation failed', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Mark the latest admission row for each student on the current result set.
     */
    private function attachAdmissionListMeta($admissions, string $organizationId, string $schoolId)
    {
        $studentIds = $admissions->pluck('student_id')->filter()->unique()->values();
        if ($studentIds->isEmpty()) {
            return $admissions;
        }

        $latestAdmissionIdByStudentId = [];

        $latestAdmissions = StudentAdmission::query()
            ->select(['id', 'student_id'])
            ->whereIn('student_id', $studentIds)
            ->where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->whereNull('deleted_at')
            ->orderByDesc('admission_date')
            ->orderByDesc('created_at')
            ->get();

        foreach ($latestAdmissions as $admission) {
            if (! array_key_exists($admission->student_id, $latestAdmissionIdByStudentId)) {
                $latestAdmissionIdByStudentId[$admission->student_id] = $admission->id;
            }
        }

        return $admissions->map(function ($admission) use ($latestAdmissionIdByStudentId) {
            $admission->is_latest_admission_for_student = ($latestAdmissionIdByStudentId[$admission->student_id] ?? null) === $admission->id;

            return $admission;
        });
    }

    private function syncStudentStatusFromAdmissions(string $studentId, string $organizationId, string $schoolId): void
    {
        $student = Student::query()
            ->where('id', $studentId)
            ->where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->whereNull('deleted_at')
            ->first();

        if (! $student) {
            return;
        }

        $latestAdmission = StudentAdmission::query()
            ->where('student_id', $studentId)
            ->where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->whereNull('deleted_at')
            ->orderByDesc('admission_date')
            ->orderByDesc('created_at')
            ->first();

        if (! $latestAdmission) {
            return;
        }

        $mappedStatus = $this->mapEnrollmentStatusToStudentStatus($latestAdmission->enrollment_status);

        if ($student->student_status !== $mappedStatus) {
            $student->update([
                'student_status' => $mappedStatus,
            ]);
        }
    }

    private function mapEnrollmentStatusToStudentStatus(string $enrollmentStatus): string
    {
        return match ($enrollmentStatus) {
            'pending' => 'applied',
            'admitted' => 'admitted',
            'active' => 'active',
            'inactive' => 'admitted',
            'suspended' => 'suspended',
            'graduated' => 'graduated',
            'withdrawn' => 'withdrawn',
            default => 'active',
        };
    }

    /**
     * When residency type code is "day", clear boarding and hostel room (users often change residency only).
     *
     * @param  array<string, mixed>  $validated
     */
    private function applyDayResidencyClearsBoarding(array &$validated): void
    {
        $residencyId = $validated['residency_type_id'] ?? null;
        if (! is_string($residencyId) || $residencyId === '') {
            return;
        }

        $code = ResidencyType::query()->whereKey($residencyId)->value('code');
        if ($code === null) {
            return;
        }

        if (strtolower((string) $code) === 'day') {
            $validated['is_boarder'] = false;
            $validated['room_id'] = null;
        }
    }
}
