<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\StudentDocument;
use App\Models\StudentEducationalHistory;
use App\Models\StudentDisciplineRecord;
use App\Http\Requests\StoreStudentRequest;
use App\Http\Requests\UpdateStudentRequest;
use App\Services\Notifications\NotificationService;
use App\Services\Storage\FileStorageService;
use App\Services\Reports\PdfReportService;
use App\Services\Reports\ReportConfig;
use App\Services\Reports\BrandingCacheService;
use App\Services\Reports\DateConversionService;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class StudentController extends Controller
{
    public function __construct(
        private FileStorageService $fileStorageService,
        private NotificationService $notificationService,
        private PdfReportService $pdfReportService,
        private BrandingCacheService $brandingCache,
        private DateConversionService $dateService,
        private ActivityLogService $activityLogService
    ) {}

    /**
     * Get accessible organization IDs for the current user (all users restricted to their own organization)
     */
    private function getAccessibleOrgIds($profile): array
    {
        if ($profile->organization_id) {
            return [$profile->organization_id];
        }

        return [];
    }

    /**
     * Display a listing of students
     */
    public function index(Request $request)
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

        // Check permission - context already set by middleware
        try {
            if (!$user->hasPermissionTo('students.read')) {
                return response()->json([
                    'error' => 'Access Denied',
                    'message' => 'You do not have permission to access this resource.',
                    'required_permission' => 'students.read'
                ], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for students.read: " . $e->getMessage());
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'You do not have permission to access this resource.',
                'required_permission' => 'students.read'
            ], 403);
        }

        $orgIds = $this->getAccessibleOrgIds($profile);

        if (empty($orgIds)) {
            return response()->json([]);
        }

        // Strict school scoping: only current school from middleware context
        $currentSchoolId = $this->getCurrentSchoolId($request);

        $query = Student::with(['organization', 'school'])
            ->whereNull('deleted_at')
            ->whereIn('organization_id', $orgIds)
            ->where('school_id', $currentSchoolId);

        // NOTE: We intentionally ignore client-provided organization_id/school_id filters.
        // Everything except permissions is school-scoped, and school context comes from profile.default_school_id.

        if ($request->has('student_status') && $request->student_status) {
            $query->where('student_status', $request->student_status);
        }

        if ($request->has('gender') && $request->gender) {
            $query->where('gender', $request->gender);
        }

        if ($request->has('is_orphan') && $request->is_orphan !== null) {
            $query->where('is_orphan', filter_var($request->is_orphan, FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->has('admission_fee_status') && $request->admission_fee_status) {
            $query->where('admission_fee_status', $request->admission_fee_status);
        }

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('full_name', 'ilike', "%{$search}%")
                  ->orWhere('father_name', 'ilike', "%{$search}%")
                  ->orWhere('admission_no', 'ilike', "%{$search}%")
                  ->orWhere('guardian_name', 'ilike', "%{$search}%")
                  ->orWhere('guardian_phone', 'ilike', "%{$search}%");
            });
        }

        // Support pagination if page and per_page parameters are provided
        if ($request->has('page') || $request->has('per_page')) {
            $perPage = $request->input('per_page', 25);
            // Validate per_page is one of allowed values
            $allowedPerPage = [10, 25, 50, 100];
            if (!in_array((int)$perPage, $allowedPerPage)) {
                $perPage = 25; // Default to 25 if invalid
            }
            
            $students = $query->orderBy('created_at', 'desc')->paginate((int)$perPage);
            
            // Add current class information from student admissions
            $students->getCollection()->transform(function ($student) {
                $admission = \App\Models\StudentAdmission::where('student_id', $student->id)
                    ->whereNull('deleted_at')
                    ->with(['classAcademicYear.class', 'class'])
                    ->orderBy('admission_date', 'desc')
                    ->first();
                
                if ($admission) {
                    $student->current_class = $admission->classAcademicYear?->class ?? $admission->class;
                }
                
                return $student;
            });
            
            // Return paginated response in Laravel's standard format
            return response()->json($students);
        }

        // Return all results if no pagination requested (backward compatibility)
        $students = $query->orderBy('created_at', 'desc')->get();
        
        // Add current class information from student admissions
        $students->transform(function ($student) {
            $admission = \App\Models\StudentAdmission::where('student_id', $student->id)
                ->whereNull('deleted_at')
                ->with(['classAcademicYear.class', 'class'])
                ->orderBy('admission_date', 'desc')
                ->first();
            
            if ($admission) {
                $student->current_class = $admission->classAcademicYear?->class ?? $admission->class;
            }
            
            return $student;
        });

        return response()->json($students);
    }

    /**
     * Display the specified student
     */
    public function show(Request $request, string $id)
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

        // Check permission - context already set by middleware
        try {
            if (!$user->hasPermissionTo('students.read')) {
                return response()->json([
                    'error' => 'Access Denied',
                    'message' => 'You do not have permission to access this resource.',
                    'required_permission' => 'students.read'
                ], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for students.read: " . $e->getMessage());
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'You do not have permission to access this resource.',
                'required_permission' => 'students.read'
            ], 403);
        }

        $student = Student::with(['organization', 'school'])
            ->whereNull('deleted_at')
            ->where('school_id', $this->getCurrentSchoolId($request))
            ->find($id);

        if (!$student) {
            return response()->json(['error' => 'Student not found'], 404);
        }

        // Get current class from student admissions
        $admission = \App\Models\StudentAdmission::where('student_id', $student->id)
            ->whereNull('deleted_at')
            ->with(['classAcademicYear.class', 'class'])
            ->orderBy('admission_date', 'desc')
            ->first();
        
        if ($admission) {
            $student->current_class = $admission->classAcademicYear?->class ?? $admission->class;
        }

        // Org access is implicitly enforced by organization middleware + school scope.

        return response()->json($student);
    }

    /**
     * Store a newly created student
     */
    public function store(StoreStudentRequest $request)
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

        // Check permission - context already set by middleware
        try {
            if (!$user->hasPermissionTo('students.create')) {
                return response()->json([
                    'error' => 'Access Denied',
                    'message' => 'You do not have permission to access this resource.',
                    'required_permission' => 'students.create'
                ], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for students.create: " . $e->getMessage());
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'You do not have permission to access this resource.',
                'required_permission' => 'students.create'
            ], 403);
        }

        $orgIds = $this->getAccessibleOrgIds($profile);

        $organizationId = $profile->organization_id;
        $currentSchoolId = $this->getCurrentSchoolId($request);

        // Validate organization access
        if (!in_array($organizationId, $orgIds)) {
            return response()->json(['error' => 'Cannot create student for this organization'], 403);
        }

        $validated = $request->validated();
        // Force scope (never trust client input)
        $validated['organization_id'] = $organizationId;
        $validated['school_id'] = $currentSchoolId;

        // Set defaults
        $validated['is_orphan'] = $validated['is_orphan'] ?? false;
        $validated['admission_fee_status'] = $validated['admission_fee_status'] ?? 'pending';
        $validated['student_status'] = $validated['student_status'] ?? 'active';

        $student = Student::create($validated);

        $student->load(['organization', 'school']);

        // Notify about student creation
        try {
            $studentName = $student->full_name ?? 'Student';
            $admissionNo = $student->admission_no ?? 'N/A';
            
            $this->notificationService->notify(
                'student.created',
                $student,
                $user,
                [
                    'title' => 'New Student Registered',
                    'body' => "Student '{$studentName}' (Admission No: {$admissionNo}) has been registered.",
                    'url' => "/students/{$student->id}",
                ]
            );
        } catch (\Exception $e) {
            Log::warning('Failed to send student creation notification', [
                'student_id' => $student->id,
                'error' => $e->getMessage(),
            ]);
        }

        // Log student creation
        try {
            $this->activityLogService->logCreate(
                subject: $student,
                description: "Created student: {$student->full_name} (Admission No: {$student->admission_no})",
                properties: [
                    'student_id' => $student->id,
                    'admission_no' => $student->admission_no,
                    'full_name' => $student->full_name,
                    'student_status' => $student->student_status,
                ],
                request: $request
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log student creation: ' . $e->getMessage());
        }

        return response()->json($student, 201);
    }

    /**
     * Update the specified student
     */
    public function update(UpdateStudentRequest $request, string $id)
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

        // Check permission - context already set by middleware
        try {
            if (!$user->hasPermissionTo('students.update')) {
                return response()->json([
                    'error' => 'Access Denied',
                    'message' => 'You do not have permission to access this resource.',
                    'required_permission' => 'students.update'
                ], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for students.update: " . $e->getMessage());
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'You do not have permission to access this resource.',
                'required_permission' => 'students.update'
            ], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        $student = Student::whereNull('deleted_at')
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$student) {
            return response()->json(['error' => 'Student not found'], 404);
        }

        $orgIds = $this->getAccessibleOrgIds($profile);

        // Org access is enforced by organization middleware + current school scope.

        $validated = $request->validated();

        // DEBUG: Log all received data
        Log::info('Student Update Request', [
            'student_id' => $id,
            'user_id' => $user->id,
            'received_fields' => array_keys($validated),
            'received_data' => $validated,
        ]);

        // Get current student data for comparison
        $currentData = $student->toArray();
        // Capture old values for logging (before update)
        $oldValues = $student->only(['full_name', 'admission_no', 'father_name', 'student_status', 'class_id', 'academic_year_id']);
        Log::info('Current Student Data', [
            'student_id' => $id,
            'current_data' => $currentData,
        ]);

        // Prevent scope changes
        unset($validated['organization_id'], $validated['school_id']);

        // Filter out empty strings for required fields - convert to null or skip
        // admission_no should not be empty - if it is, don't update it
        if (isset($validated['admission_no']) && (trim($validated['admission_no']) === '' || $validated['admission_no'] === null)) {
            unset($validated['admission_no']);
        }

        // CRITICAL: Prevent overwriting full_name with empty string
        // full_name is required and should never be set to empty
        if (isset($validated['full_name']) && (trim($validated['full_name']) === '' || $validated['full_name'] === null)) {
            unset($validated['full_name']);
        }

        // CRITICAL: Prevent overwriting father_name with empty string
        // father_name is required and should never be set to empty
        if (isset($validated['father_name']) && (trim($validated['father_name']) === '' || $validated['father_name'] === null)) {
            unset($validated['father_name']);
        }

        // Only update fields that are actually provided AND different from current values
        $updateData = [];
        foreach ($validated as $key => $value) {
            // Skip null values unless they're explicitly being set to null for nullable fields
            if ($value === null && !in_array($key, ['school_id', 'card_number', 'grandfather_name', 'mother_name', 'birth_year', 'birth_date', 'age', 'admission_year', 'orig_province', 'orig_district', 'orig_village', 'curr_province', 'curr_district', 'curr_village', 'nationality', 'preferred_language', 'previous_school', 'guardian_name', 'guardian_relation', 'guardian_phone', 'guardian_tazkira', 'guardian_picture_path', 'home_address', 'zamin_name', 'zamin_phone', 'zamin_tazkira', 'zamin_address', 'applying_grade', 'disability_status', 'emergency_contact_name', 'emergency_contact_phone', 'family_income', 'picture_path'])) {
                continue;
            }

            // Compare with current value - only include if different
            $currentValue = $currentData[$key] ?? null;
            
            // Normalize values for comparison (handle empty strings, null, etc.)
            $normalizedNew = is_string($value) ? trim($value) : $value;
            $normalizedCurrent = is_string($currentValue) ? trim($currentValue) : $currentValue;
            
            // Convert empty strings to null for comparison
            if ($normalizedNew === '') $normalizedNew = null;
            if ($normalizedCurrent === '') $normalizedCurrent = null;
            
            // Only add to updateData if value has actually changed
            if ($normalizedNew !== $normalizedCurrent) {
                $updateData[$key] = $value;
            }
        }

        // DEBUG: Log what will be updated
        Log::info('Student Update - Fields to Update', [
            'student_id' => $id,
            'fields_to_update' => array_keys($updateData),
            'update_data' => $updateData,
            'fields_unchanged' => array_diff(array_keys($validated), array_keys($updateData)),
        ]);

        // Only update if there's data to update
        if (!empty($updateData)) {
            $student->update($updateData);
            Log::info('Student Update - Success', [
                'student_id' => $id,
                'updated_fields' => array_keys($updateData),
            ]);
            
            // Notify about student update
            try {
                $student->refresh();
                $student->load(['organization', 'school']);
                $studentName = $student->full_name ?? 'Student';
                $admissionNo = $student->admission_no ?? 'N/A';
                $updatedFields = implode(', ', array_keys($updateData));
                
                $this->notificationService->notify(
                    'student.updated',
                    $student,
                    $user,
                    [
                        'title' => '✏️ Student Record Updated',
                        'body' => "Student '{$studentName}' (Admission No: {$admissionNo}) has been updated. Fields changed: {$updatedFields}.",
                        'url' => "/students/{$student->id}",
                    ]
                );
            } catch (\Exception $e) {
                Log::warning('Failed to send student update notification', [
                    'student_id' => $id,
                    'error' => $e->getMessage(),
                ]);
            }
        } else {
            Log::info('Student Update - No Changes', [
                'student_id' => $id,
                'message' => 'No fields changed, skipping update',
            ]);
        }
        
        $student->load(['organization', 'school']);

        // Log student update
        try {
            if (!empty($updateData)) {
                $this->activityLogService->logUpdate(
                    subject: $student,
                    description: "Updated student: {$student->full_name} (Admission No: {$student->admission_no})",
                    properties: [
                        'old_values' => $oldValues,
                        'new_values' => $student->only(['full_name', 'admission_no', 'father_name', 'student_status', 'class_id', 'academic_year_id']),
                        'updated_fields' => array_keys($updateData),
                    ],
                    request: $request
                );
            }
        } catch (\Exception $e) {
            Log::warning('Failed to log student update: ' . $e->getMessage());
        }

        return response()->json($student);
    }

    /**
     * Remove the specified student (soft delete)
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

        // Check permission - context already set by middleware
        try {
            if (!$user->hasPermissionTo('students.delete')) {
                return response()->json([
                    'error' => 'Access Denied',
                    'message' => 'You do not have permission to access this resource.',
                    'required_permission' => 'students.delete'
                ], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for students.delete: " . $e->getMessage());
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'You do not have permission to access this resource.',
                'required_permission' => 'students.delete'
            ], 403);
        }

        $currentSchoolId = request()->get('current_school_id');
        $student = Student::whereNull('deleted_at')
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$student) {
            return response()->json(['error' => 'Student not found'], 404);
        }

        // Org access is enforced by organization middleware + school scope.

        // Notify about student deletion before deleting
        try {
            $studentName = $student->full_name ?? 'Student';
            $admissionNo = $student->admission_no ?? 'N/A';
            
            $this->notificationService->notify(
                'student.deleted',
                $student,
                $user,
                [
                    'title' => '🗑️ Student Record Deleted',
                    'body' => "Student '{$studentName}' (Admission No: {$admissionNo}) has been deleted.",
                    'url' => "/students",
                    'level' => 'warning',
                ]
            );
        } catch (\Exception $e) {
            Log::warning('Failed to send student deletion notification', [
                'student_id' => $id,
                'error' => $e->getMessage(),
            ]);
        }

        $studentName = $student->full_name ?? 'Unknown';
        $admissionNo = $student->admission_no ?? 'N/A';
        $studentData = $student->toArray();
        $student->delete();

        // Log student deletion
        try {
            $this->activityLogService->logDelete(
                subject: $student,
                description: "Deleted student: {$studentName} (Admission No: {$admissionNo})",
                properties: ['deleted_student' => $studentData],
                request: request()
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log student deletion: ' . $e->getMessage());
        }

        return response()->noContent();
    }

    /**
     * Get student statistics
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
                'male' => 0,
                'female' => 0,
                'orphans' => 0,
                'feePending' => 0,
            ]);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        $query = Student::whereNull('deleted_at')
            ->whereIn('organization_id', $orgIds)
            ->where('school_id', $currentSchoolId);

        $total = (clone $query)->count();
        $male = (clone $query)->where('gender', 'male')->count();
        $female = (clone $query)->where('gender', 'female')->count();
        $orphans = (clone $query)->where('is_orphan', true)->count();
        $feePending = (clone $query)->where('admission_fee_status', '!=', 'paid')->count();

        return response()->json([
            'total' => $total,
            'male' => $male,
            'female' => $female,
            'orphans' => $orphans,
            'feePending' => $feePending,
        ]);
    }

    /**
     * Upload student picture
     */
    public function uploadPicture(Request $request, string $id)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'Unauthorized'], 401);
            }

            $profile = DB::table('profiles')->where('id', $user->id)->first();

            if (!$profile) {
                return response()->json(['error' => 'Profile not found'], 404);
            }

            $currentSchoolId = $this->getCurrentSchoolId($request);
            $student = Student::whereNull('deleted_at')
                ->where('school_id', $currentSchoolId)
                ->find($id);

            if (!$student) {
                return response()->json(['error' => 'Student not found'], 404);
            }

            // Org access is enforced by organization middleware + school scope.

            if (!$request->hasFile('file')) {
                return response()->json(['error' => 'No file provided'], 422);
            }

            $file = $request->file('file');
            if (!$file) {
                return response()->json(['error' => 'No file provided'], 422);
            }

            // Check file size (max 5MB)
            $fileSize = $file->getSize();
            if ($fileSize > 5120 * 1024) {
                return response()->json(['error' => 'File size exceeds maximum allowed size of 5MB'], 422);
            }

            // Check extension
            $extension = strtolower($file->getClientOriginalExtension());
            if (!$this->fileStorageService->isAllowedExtension($file->getClientOriginalName(), $this->fileStorageService->getAllowedImageExtensions())) {
                return response()->json(['error' => 'The file must be an image (jpg, jpeg, png, gif, or webp).'], 422);
            }

            // Delete old picture if exists
            if ($student->picture_path) {
                $this->fileStorageService->deleteFile($student->picture_path);
            }

            // Store new picture using FileStorageService (PRIVATE storage for student pictures)
            $path = $this->fileStorageService->storeStudentPicture(
                $file,
                $student->organization_id,
                $id,
                $student->school_id
            );

            // Update student record
            $oldPicturePath = $student->picture_path;
            $student->update(['picture_path' => $path]);

            Log::info('Student Picture Upload', [
                'student_id' => $id,
                'user_id' => $user->id,
                'old_picture_path' => $oldPicturePath,
                'new_picture_path' => $path,
                'file_size' => $fileSize,
                'file_extension' => $extension,
            ]);

            return response()->json([
                'message' => 'Picture uploaded successfully',
                'picture_path' => $path,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::warning('Picture upload validation failed', [
                'errors' => $e->errors(),
                'student_id' => $id,
            ]);
            return response()->json([
                'error' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error uploading student picture: ' . $e->getMessage(), [
                'student_id' => $id,
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['error' => 'Failed to upload picture: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Get student picture
     */
    public function getPicture(Request $request, string $id)
    {
        try {
            $user = $request->user();
            if (!$user) {
                abort(401, 'Unauthorized');
            }

            $profile = DB::table('profiles')->where('id', $user->id)->first();

            if (!$profile) {
                abort(404, 'Profile not found');
            }

            if (!$profile->organization_id) {
                return response()->json(['error' => 'User must be assigned to an organization'], 403);
            }

            try {
                if (!$user->hasPermissionTo('students.read')) {
                    return response()->json([
                        'error' => 'Access Denied',
                        'message' => 'You do not have permission to access this resource.',
                        'required_permission' => 'students.read'
                    ], 403);
                }
            } catch (\Exception $e) {
                Log::warning("Permission check failed for students.read: " . $e->getMessage());
                return response()->json([
                    'error' => 'Access Denied',
                    'message' => 'You do not have permission to access this resource.',
                    'required_permission' => 'students.read'
                ], 403);
            }

            $currentSchoolId = $this->getCurrentSchoolId($request);
            $student = Student::whereNull('deleted_at')
                ->where('school_id', $currentSchoolId)
                ->find($id);

            if (!$student) {
                abort(404, 'Student not found');
            }

            // Org access is enforced by organization middleware + school scope.

            if (!$student->picture_path) {
                Log::info('Student picture requested but no picture_path', ['student_id' => $id]);
                abort(404, 'Picture not found');
            }

            // Check if file exists using FileStorageService
            if (!$this->fileStorageService->fileExists($student->picture_path)) {
                Log::warning('Student picture file not found on disk', [
                    'student_id' => $id,
                    'picture_path' => $student->picture_path,
                ]);
                abort(404, 'Picture file not found');
            }

            // Get file content using FileStorageService
            $file = $this->fileStorageService->getFile($student->picture_path);

            if (!$file || empty($file)) {
                Log::error('Student picture file is empty', [
                    'student_id' => $id,
                    'picture_path' => $student->picture_path,
                ]);
                abort(404, 'Picture file is empty');
            }

            // Determine MIME type from file extension using FileStorageService
            $mimeType = $this->fileStorageService->getMimeTypeFromExtension($student->picture_path);

            return response($file, 200)
                ->header('Content-Type', $mimeType)
                ->header('Content-Disposition', 'inline; filename="' . basename($student->picture_path) . '"')
                ->header('Cache-Control', 'private, max-age=3600');
        } catch (\Illuminate\Http\Exceptions\HttpResponseException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('Error getting student picture', [
                'student_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            abort(500, 'Error getting student picture: ' . $e->getMessage());
        }
    }

    /**
     * Get distinct values for autocomplete
     */
    public function autocomplete(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $orgIds = $this->getAccessibleOrgIds($profile);

        if (empty($orgIds)) {
            return response()->json([
                'names' => [],
                'fatherNames' => [],
                'grandfatherNames' => [],
                'origDistricts' => [],
                'currDistricts' => [],
                'origVillages' => [],
                'currVillages' => [],
                'guardianNames' => [],
                'zaminNames' => [],
            ]);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $query = Student::whereNull('deleted_at')
            ->whereIn('organization_id', $orgIds)
            ->where('school_id', $currentSchoolId);

        // Get distinct values for each field
        $names = (clone $query)->whereNotNull('full_name')->where('full_name', '!=', '')->distinct()->pluck('full_name')->sort()->values()->toArray();
        $fatherNames = (clone $query)->whereNotNull('father_name')->where('father_name', '!=', '')->distinct()->pluck('father_name')->sort()->values()->toArray();
        $grandfatherNames = (clone $query)->whereNotNull('grandfather_name')->where('grandfather_name', '!=', '')->distinct()->pluck('grandfather_name')->sort()->values()->toArray();
        $origDistricts = (clone $query)->whereNotNull('orig_district')->where('orig_district', '!=', '')->distinct()->pluck('orig_district')->sort()->values()->toArray();
        $currDistricts = (clone $query)->whereNotNull('curr_district')->where('curr_district', '!=', '')->distinct()->pluck('curr_district')->sort()->values()->toArray();
        $origVillages = (clone $query)->whereNotNull('orig_village')->where('orig_village', '!=', '')->distinct()->pluck('orig_village')->sort()->values()->toArray();
        $currVillages = (clone $query)->whereNotNull('curr_village')->where('curr_village', '!=', '')->distinct()->pluck('curr_village')->sort()->values()->toArray();
        $guardianNames = (clone $query)->whereNotNull('guardian_name')->where('guardian_name', '!=', '')->distinct()->pluck('guardian_name')->sort()->values()->toArray();
        $zaminNames = (clone $query)->whereNotNull('zamin_name')->where('zamin_name', '!=', '')->distinct()->pluck('zamin_name')->sort()->values()->toArray();

        return response()->json([
            'names' => $names,
            'fatherNames' => $fatherNames,
            'grandfatherNames' => $grandfatherNames,
            'origDistricts' => $origDistricts,
            'currDistricts' => $currDistricts,
            'origVillages' => $origVillages,
            'currVillages' => $currVillages,
            'guardianNames' => $guardianNames,
            'zaminNames' => $zaminNames,
        ]);
    }

    /**
     * Check for duplicate students
     */
    public function checkDuplicates(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                Log::warning('[StudentController::checkDuplicates] User not authenticated');
                return response()->json(['error' => 'Unauthorized'], 401);
            }

            $profile = DB::table('profiles')->where('id', $user->id)->first();

            if (!$profile) {
                Log::warning('[StudentController::checkDuplicates] Profile not found for user', ['user_id' => $user->id]);
                return response()->json(['error' => 'Profile not found'], 404);
            }

            $orgIds = $this->getAccessibleOrgIds($profile);

            if (empty($orgIds)) {
                Log::info('[StudentController::checkDuplicates] No accessible organizations for user', ['user_id' => $user->id]);
                return response()->json([]);
            }

            $request->validate([
                'full_name' => 'required|string',
                'father_name' => 'required|string',
                'tazkira_number' => 'nullable|string',
                'card_number' => 'nullable|string',
                'admission_no' => 'nullable|string',
            ]);

            $results = [];

            // Ensure orgIds is an array and not empty before querying
            if (!is_array($orgIds) || empty($orgIds)) {
                Log::warning('[StudentController::checkDuplicates] Invalid organization IDs', ['orgIds' => $orgIds]);
                return response()->json([]);
            }

            $currentSchoolId = $this->getCurrentSchoolId($request);

            $baseQuery = Student::whereNull('deleted_at')
                ->whereIn('organization_id', $orgIds)
                ->where('school_id', $currentSchoolId)
                ->select('id', 'full_name', 'father_name', 'guardian_tazkira', 'card_number', 'admission_no', 'orig_province', 'admission_year', 'created_at');

            // Exact: name + father_name
            $exactMatches = (clone $baseQuery)
                ->where('full_name', $request->full_name)
                ->where('father_name', $request->father_name)
                ->get();
            foreach ($exactMatches as $match) {
                $results[] = [
                    'id' => $match->id,
                    'full_name' => $match->full_name ?? null,
                    'father_name' => $match->father_name ?? null,
                    'tazkira_number' => $match->guardian_tazkira ?? null,
                    'card_number' => $match->card_number ?? null,
                    'admission_no' => $match->admission_no ?? null,
                    'orig_province' => $match->orig_province ?? null,
                    'admission_year' => $match->admission_year ?? null,
                    'created_at' => $match->created_at,
                    'match_reason' => 'Exact name and father name match',
                ];
            }

            // Tazkira number match
            if ($request->tazkira_number) {
                $tazkiraMatches = (clone $baseQuery)
                    ->where('guardian_tazkira', $request->tazkira_number)
                    ->get();
                foreach ($tazkiraMatches as $match) {
                    $results[] = [
                        'id' => $match->id,
                        'full_name' => $match->full_name ?? null,
                        'father_name' => $match->father_name ?? null,
                        'tazkira_number' => $match->guardian_tazkira ?? null,
                        'card_number' => $match->card_number ?? null,
                        'admission_no' => $match->admission_no ?? null,
                        'orig_province' => $match->orig_province ?? null,
                        'admission_year' => $match->admission_year ?? null,
                        'created_at' => $match->created_at,
                        'match_reason' => 'Tazkira number matches',
                    ];
                }
            }

            // Card number match
            if ($request->card_number) {
                $cardMatches = (clone $baseQuery)
                    ->where('card_number', $request->card_number)
                    ->get();
                foreach ($cardMatches as $match) {
                    $results[] = [
                        'id' => $match->id,
                        'full_name' => $match->full_name ?? null,
                        'father_name' => $match->father_name ?? null,
                        'tazkira_number' => $match->guardian_tazkira ?? null,
                        'card_number' => $match->card_number ?? null,
                        'admission_no' => $match->admission_no ?? null,
                        'orig_province' => $match->orig_province ?? null,
                        'admission_year' => $match->admission_year ?? null,
                        'created_at' => $match->created_at,
                        'match_reason' => 'Card number matches',
                    ];
                }
            }

            // Admission number match
            if ($request->admission_no) {
                $admissionMatches = (clone $baseQuery)
                    ->where('admission_no', $request->admission_no)
                    ->get();
                foreach ($admissionMatches as $match) {
                    $results[] = [
                        'id' => $match->id,
                        'full_name' => $match->full_name ?? null,
                        'father_name' => $match->father_name ?? null,
                        'tazkira_number' => $match->guardian_tazkira ?? null,
                        'card_number' => $match->card_number ?? null,
                        'admission_no' => $match->admission_no ?? null,
                        'orig_province' => $match->orig_province ?? null,
                        'admission_year' => $match->admission_year ?? null,
                        'created_at' => $match->created_at,
                        'match_reason' => 'Admission number matches',
                    ];
                }
            }

            // Partial: name LIKE and father_name LIKE
            $partialMatches = (clone $baseQuery)
                ->where('full_name', 'ilike', "%{$request->full_name}%")
                ->where('father_name', 'ilike', "%{$request->father_name}%")
                ->get();
            foreach ($partialMatches as $match) {
                $results[] = [
                    'id' => $match->id,
                    'full_name' => $match->full_name ?? null,
                    'father_name' => $match->father_name ?? null,
                    'tazkira_number' => $match->guardian_tazkira ?? null,
                    'card_number' => $match->card_number ?? null,
                    'admission_no' => $match->admission_no ?? null,
                    'orig_province' => $match->orig_province ?? null,
                    'admission_year' => $match->admission_year ?? null,
                    'created_at' => $match->created_at,
                    'match_reason' => 'Partial name and father name match',
                ];
            }

            // Deduplicate by id + reason
            $seen = [];
            $unique = [];
            foreach ($results as $rec) {
                try {
                    $key = "{$rec['id']}:{$rec['match_reason']}";
                    if (!in_array($key, $seen)) {
                        $seen[] = $key;
                        $unique[] = $rec;
                    }
                } catch (\Exception $e) {
                    Log::warning('[StudentController::checkDuplicates] Error processing result', [
                        'result' => $rec,
                        'error' => $e->getMessage()
                    ]);
                    // Continue processing other results
                }
            }

            return response()->json(array_slice($unique, 0, 25));
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::warning('[StudentController::checkDuplicates] Validation error', ['errors' => $e->errors()]);
            throw $e;
        } catch (\Exception $e) {
            Log::error('[StudentController::checkDuplicates] Unexpected error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request' => $request->all()
            ]);
            return response()->json([
                'error' => 'An error occurred while checking for duplicate students',
                'message' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Print student profile as PDF
     */
    public function printProfile(Request $request, string $studentId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission
        try {
            if (!$user->hasPermissionTo('students.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for students.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        // Fetch student
        $student = Student::with(['organization', 'school'])
            ->whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($studentId);

        if (!$student) {
            return response()->json(['error' => 'Student not found'], 404);
        }

        try {
            // Fetch educational history
            $educationalHistory = StudentEducationalHistory::where('student_id', $studentId)
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->whereNull('deleted_at')
                ->orderBy('start_date', 'desc')
                ->get()
                ->map(function ($item) {
                    return [
                        'school_name' => $item->school_name ?? '—',
                        'start_date' => $item->start_date ? \Carbon\Carbon::parse($item->start_date)->format('Y-m-d') : '—',
                        'end_date' => $item->end_date ? \Carbon\Carbon::parse($item->end_date)->format('Y-m-d') : '—',
                        'grade' => $item->grade ?? '—',
                        'description' => $item->description ?? '—',
                    ];
                })
                ->toArray();

            // Fetch discipline records
            $disciplineRecords = StudentDisciplineRecord::where('student_id', $studentId)
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->whereNull('deleted_at')
                ->orderBy('incident_date', 'desc')
                ->get()
                ->map(function ($item) {
                    return [
                        'incident_date' => $item->incident_date ? \Carbon\Carbon::parse($item->incident_date)->format('Y-m-d') : '—',
                        'incident_type' => $item->incident_type ?? '—',
                        'severity' => $item->severity ?? 'minor',
                        'action_taken' => $item->action_taken ?? '—',
                        'description' => $item->description ?? null,
                        'resolved' => $item->resolved ?? false,
                        'resolved_date' => $item->resolved_date ? \Carbon\Carbon::parse($item->resolved_date)->format('Y-m-d') : null,
                    ];
                })
                ->toArray();

            // Fetch documents
            $documents = StudentDocument::where('student_id', $studentId)
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->whereNull('deleted_at')
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($item) {
                    $size = $item->file_size ?? 0;
                    $sizeFormatted = $size > 0 ? $this->formatBytes($size) : '—';
                    return [
                        'document_type' => $item->document_type ?? '—',
                        'file_name' => $item->file_name ?? '—',
                        'uploaded_at' => $item->created_at ? $item->created_at->format('Y-m-d') : '—',
                        'file_size' => $sizeFormatted,
                        'description' => $item->description ?? null,
                    ];
                })
                ->toArray();

            // Build student picture URL (convert to base64 for PDF embedding)
            $picturePath = null;
            if ($student->picture_path && $this->fileStorageService->fileExists($student->picture_path)) {
                try {
                    $pictureContent = Storage::disk('local')->get($student->picture_path);
                    $mimeType = $this->fileStorageService->getMimeTypeFromExtension($student->picture_path);
                    $picturePath = 'data:' . $mimeType . ';base64,' . base64_encode($pictureContent);
                } catch (\Exception $e) {
                    Log::warning("Failed to load student picture for PDF: " . $e->getMessage());
                }
            }

            // Build guardian picture URL (if it's already a URL, keep it; otherwise convert to base64)
            $guardianPicturePath = null;
            if ($student->guardian_picture_path) {
                if (str_starts_with($student->guardian_picture_path, 'http')) {
                    $guardianPicturePath = $student->guardian_picture_path;
                } else {
                    // Try to load from storage if it's a path
                    try {
                        if ($this->fileStorageService->fileExists($student->guardian_picture_path)) {
                            $guardianContent = Storage::disk('local')->get($student->guardian_picture_path);
                            $guardianMimeType = $this->fileStorageService->getMimeTypeFromExtension($student->guardian_picture_path);
                            $guardianPicturePath = 'data:' . $guardianMimeType . ';base64,' . base64_encode($guardianContent);
                        }
                    } catch (\Exception $e) {
                        Log::warning("Failed to load guardian picture for PDF: " . $e->getMessage());
                    }
                }
            }

            // Build report data
            $reportData = $this->buildProfileReportData($student, $educationalHistory, $disciplineRecords, $documents, $picturePath, $guardianPicturePath);

            // Create report config
            $config = ReportConfig::fromArray([
                'report_key' => 'student_profile',
                'report_type' => 'pdf',
                'branding_id' => $currentSchoolId,
                'title' => 'Student Profile - ' . ($student->full_name ?? 'Unknown'),
                'calendar_preference' => $request->get('calendar_preference', 'jalali'),
                'language' => $request->get('language', 'ps'),
                'template_name' => 'student-profile',
            ]);

            // Load branding data
            $branding = $this->brandingCache->getBranding($currentSchoolId);
            if (!$branding) {
                Log::warning("Branding not found for school: {$currentSchoolId}");
                $branding = [];
            }

            // Load default layout
            $layout = $this->brandingCache->getDefaultLayout($currentSchoolId);
            if (!$layout) {
                $layout = [];
            }

            // Build context with branding and template data
            $context = array_merge($reportData, [
                // Template name (required for PdfReportService)
                'template_name' => 'student-profile',
                
                // Branding data
                'SCHOOL_NAME' => $branding['school_name'] ?? ($student->school->school_name ?? ''),
                'SCHOOL_NAME_PASHTO' => $branding['school_name_pashto'] ?? $branding['school_name'] ?? '',
                'SCHOOL_NAME_ARABIC' => $branding['school_name_arabic'] ?? $branding['school_name'] ?? '',
                'SCHOOL_ADDRESS' => $branding['school_address'] ?? '',
                'SCHOOL_PHONE' => $branding['school_phone'] ?? '',
                'SCHOOL_EMAIL' => $branding['school_email'] ?? '',
                'SCHOOL_WEBSITE' => $branding['school_website'] ?? '',
                
                // Colors and fonts
                'PRIMARY_COLOR' => $branding['primary_color'] ?? '#0b0b56',
                'SECONDARY_COLOR' => $branding['secondary_color'] ?? '#0056b3',
                'ACCENT_COLOR' => $branding['accent_color'] ?? '#ff6b35',
                'FONT_FAMILY' => $layout['font_family'] ?? $branding['font_family'] ?? 'Bahij Nassim',
                'FONT_SIZE' => $layout['font_size'] ?? $branding['report_font_size'] ?? '12px',
                
                // Logos
                'PRIMARY_LOGO_URI' => $branding['primary_logo_uri'] ?? null,
                'SECONDARY_LOGO_URI' => $branding['secondary_logo_uri'] ?? null,
                'MINISTRY_LOGO_URI' => $branding['ministry_logo_uri'] ?? null,
                'PRIMARY_LOGO' => $branding['primary_logo_uri'] ?? null,
                'SECONDARY_LOGO' => $branding['secondary_logo_uri'] ?? null,
                'show_primary_logo' => $branding['show_primary_logo'] ?? true,
                'show_secondary_logo' => $branding['show_secondary_logo'] ?? false,
                'show_ministry_logo' => $branding['show_ministry_logo'] ?? false,
                'primary_logo_position' => $branding['primary_logo_position'] ?? 'left',
                'secondary_logo_position' => $branding['secondary_logo_position'] ?? 'right',
                'ministry_logo_position' => $branding['ministry_logo_position'] ?? 'right',
                
                // Report settings
                'TABLE_TITLE' => 'Student Profile - ' . ($student->full_name ?? 'Unknown'),
                'show_page_numbers' => $layout['show_page_numbers'] ?? $branding['show_page_numbers'] ?? true,
                'show_generation_date' => $layout['show_generation_date'] ?? $branding['show_generation_date'] ?? true,
                
                // Layout settings
                'page_size' => $layout['page_size'] ?? 'A4',
                'orientation' => $layout['orientation'] ?? 'portrait',
                'margins' => $layout['margins'] ?? '15mm 12mm 18mm 12mm',
                'rtl' => $layout['rtl'] ?? true,
                
                // Date/time
                'CURRENT_DATETIME' => $this->dateService->formatDate(
                    now(),
                    $config->calendarPreference,
                    'full',
                    $config->language
                ) . ' ' . now()->format('H:i'),
                'CURRENT_DATE' => $this->dateService->formatDate(
                    now(),
                    $config->calendarPreference,
                    'full',
                    $config->language
                ),
                
                // Watermark (if any)
                'WATERMARK' => null,
                
                // Notes
                'NOTES_HEADER' => [],
                'NOTES_BODY' => [],
                'NOTES_FOOTER' => [],
            ]);

            // Generate PDF
            $result = $this->pdfReportService->generate(
                $config,
                $context,
                null, // progress callback
                $profile->organization_id,
                $currentSchoolId
            );

            // Get PDF file content
            $pdfPath = $result['path'];
            $pdfContent = Storage::disk('local')->get($pdfPath);

            // Return PDF as download
            return response($pdfContent, 200)
                ->header('Content-Type', 'application/pdf')
                ->header('Content-Disposition', 'inline; filename="' . $result['filename'] . '"')
                ->header('Cache-Control', 'private, max-age=0');

        } catch (\Exception $e) {
            Log::error("Error generating student profile PDF: " . $e->getMessage(), [
                'student_id' => $studentId,
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['error' => 'Failed to generate PDF: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Build report data for student profile
     */
    private function buildProfileReportData($student, array $educationalHistory, array $disciplineRecords, array $documents, ?string $picturePath, ?string $guardianPicturePath): array
    {
        // Get current class information
        $currentClass = null;
        $currentSection = null;
        $currentAcademicYear = null;
        
        // Try to get current admission
        $currentAdmission = DB::table('student_admissions')
            ->where('student_id', $student->id)
            ->where('organization_id', $student->organization_id)
            ->where('school_id', $student->school_id)
            ->whereNull('deleted_at')
            ->where('enrollment_status', 'active')
            ->orderBy('created_at', 'desc')
            ->first();

        if ($currentAdmission) {
            $class = DB::table('classes')->where('id', $currentAdmission->class_id)->first();
            $currentClass = $class->name ?? null;
            
            $classAcademicYear = DB::table('class_academic_years')
                ->where('id', $currentAdmission->class_academic_year_id)
                ->first();
            if ($classAcademicYear) {
                $academicYear = DB::table('academic_years')->where('id', $classAcademicYear->academic_year_id)->first();
                $currentAcademicYear = $academicYear->name ?? null;
            }
        }

        $studentData = [
            'full_name' => $student->full_name ?? '—',
            'father_name' => $student->father_name ?? '—',
            'grandfather_name' => $student->grandfather_name ?? '—',
            'mother_name' => $student->mother_name ?? '—',
            'birth_date' => $student->birth_date ? $student->birth_date->format('Y-m-d') : '—',
            'gender' => $student->gender ?? '—',
            'admission_no' => $student->admission_no ?? '—',
            'student_code' => $student->student_code ?? '—',
            'card_number' => $student->card_number ?? '—',
            'status' => $student->student_status ?? '—',
            'current_class' => $currentClass ?? '—',
            'current_section' => $currentSection ?? null,
            'current_academic_year' => $currentAcademicYear ?? null,
            'phone' => $student->guardian_phone ?? null,
            'guardian_phone' => $student->guardian_phone ?? '—',
            'guardian_name' => $student->guardian_name ?? '—',
            'guardian_relation' => $student->guardian_relation ?? null,
            'home_address' => $student->home_address ?? '—',
            'nationality' => $student->nationality ?? '—',
            'preferred_language' => $student->preferred_language ?? '—',
            'picture_path' => $picturePath,
            'guardian_picture_path' => $guardianPicturePath,
            'school_name' => $student->school->school_name ?? '—',
            'organization_name' => $student->organization->name ?? '—',
        ];

        return [
            'columns' => [
                ['key' => 'field', 'label' => 'Field'],
                ['key' => 'value', 'label' => 'Value'],
            ],
            'rows' => [
                ['field' => 'Full Name', 'value' => $studentData['full_name']],
                ['field' => 'Admission No', 'value' => $studentData['admission_no']],
            ],
            'student' => $studentData,
            'sections' => [
                'educational_history' => $educationalHistory,
                'discipline_records' => $disciplineRecords,
                'documents' => $documents,
            ],
            'generatedAt' => now()->format('Y-m-d H:i'),
            'labels' => [],
        ];
    }

    /**
     * Format bytes to human-readable format
     */
    private function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $unitIndex = 0;
        $size = $bytes;

        while ($size >= 1024 && $unitIndex < count($units) - 1) {
            $size /= 1024;
            $unitIndex++;
        }

        return round($size, 2) . ' ' . $units[$unitIndex];
    }
}



