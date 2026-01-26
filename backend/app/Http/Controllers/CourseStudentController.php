<?php

namespace App\Http\Controllers;

use App\Http\Requests\CopyToMainRequest;
use App\Http\Requests\EnrollFromMainRequest;
use App\Http\Requests\StoreCourseStudentRequest;
use App\Http\Requests\UpdateCourseStudentRequest;
use App\Models\CourseStudent;
use App\Models\ShortTermCourse;
use App\Models\Student;
use App\Services\Reports\DateConversionService;
use App\Services\Storage\FileStorageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CourseStudentController extends Controller
{
    public function __construct(
        private FileStorageService $fileStorageService,
        private DateConversionService $dateService
    ) {}

    private function getProfile($user)
    {
        return DB::table('profiles')->where('id', (string) $user->id)->first();
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('course_students.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('[CourseStudentController] permission check failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $query = CourseStudent::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at');

        if ($request->filled('course_id')) {
            $query->where('course_id', $request->course_id);
        }

        if ($request->filled('completion_status')) {
            $query->where('completion_status', $request->completion_status);
        }

        // Support pagination if page and per_page parameters are provided
        if ($request->has('page') || $request->has('per_page')) {
            $perPage = $request->input('per_page', 25);
            // Validate per_page is one of allowed values
            $allowedPerPage = [10, 25, 50, 100];
            if (!in_array((int)$perPage, $allowedPerPage)) {
                $perPage = 25; // Default to 25 if invalid
            }
            
            $students = $query->orderBy('registration_date', 'desc')
                ->paginate((int)$perPage);
            
            // Debug: Log picture_path in response
            Log::debug('Course students paginated response', [
                'total' => $students->total(),
                'count' => $students->count(),
                'students_with_picture' => $students->filter(fn($s) => !empty($s->picture_path))->count(),
                'sample_picture_paths' => $students->take(3)->map(fn($s) => [
                    'id' => $s->id,
                    'picture_path' => $s->picture_path,
                ])->toArray(),
            ]);
            
            // Return paginated response in Laravel's standard format
            return response()->json($students);
        }

        // Return all results if no pagination requested (backward compatibility)
        return response()->json($query->orderBy('registration_date', 'desc')->get());
    }

    public function store(StoreCourseStudentRequest $request)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('course_students.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('[CourseStudentController] permission check failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validated();
        $validated['organization_id'] = $profile->organization_id;
        $validated['school_id'] = $currentSchoolId;

        // Auto-generate admission number if not provided or empty
        if (empty($validated['admission_no']) || trim($validated['admission_no'] ?? '') === '') {
            $course = ShortTermCourse::where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->whereNull('deleted_at')
                ->find($validated['course_id']);
            
            if ($course) {
                $validated['admission_no'] = $this->generateAdmissionNumber($course);
            } else {
                // Fallback if course not found - use Shamsi year
                $shamsiDate = $this->dateService->getDateComponents(now(), 'jalali');
                $year = substr((string) $shamsiDate['year'], -2); // Get last 2 digits of Shamsi year
                $validated['admission_no'] = 'CS-' . $year . '-' . str_pad((string)(CourseStudent::where('organization_id', $profile->organization_id)->count() + 1), 3, '0', STR_PAD_LEFT);
            }
        }

        // Sanitize UTF-8 strings to prevent encoding errors
        $validated = $this->sanitizeUtf8($validated);

        try {
            $student = CourseStudent::create($validated);
            
            // Reload to get all attributes with proper encoding
            $student = $student->fresh();
            
            // Convert model to array and ensure UTF-8 encoding
            $studentData = $student->toArray();
            $studentData = $this->ensureUtf8Encoding($studentData);
            
            // Use JSON encoding flags that handle UTF-8 properly
            $jsonFlags = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES;
            if (defined('JSON_INVALID_UTF8_IGNORE')) {
                $jsonFlags |= JSON_INVALID_UTF8_IGNORE;
            }
            
            return response()->json($studentData, 201, [
                'Content-Type' => 'application/json; charset=utf-8'
            ], $jsonFlags);
        } catch (\Exception $e) {
            Log::error('[CourseStudentController] Error creating course student', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'validated' => $validated,
            ]);
            
            return response()->json([
                'error' => 'Failed to create course student',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function show(Request $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('course_students.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('[CourseStudentController] permission check failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $student = CourseStudent::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->with(['course', 'mainStudent'])
            ->find($id);

        if (!$student) {
            return response()->json(['error' => 'Course student not found'], 404);
        }

        return response()->json($student);
    }

    public function update(UpdateCourseStudentRequest $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('course_students.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('[CourseStudentController] permission check failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $student = CourseStudent::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->find($id);

        if (!$student) {
            return response()->json(['error' => 'Course student not found'], 404);
        }

        $payload = $request->validated();
        unset($payload['organization_id'], $payload['school_id']);
        $student->update($payload);

        return response()->json($student);
    }

    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('course_students.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('[CourseStudentController] permission check failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $student = CourseStudent::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->find($id);

        if (!$student) {
            return response()->json(['error' => 'Course student not found'], 404);
        }

        $student->delete();

        return response()->noContent();
    }

    public function markCompleted(Request $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('course_students.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('[CourseStudentController] permission check failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $student = CourseStudent::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->find($id);

        if (!$student) {
            return response()->json(['error' => 'Course student not found'], 404);
        }

        $student->markCompleted($request->input('completion_date'));

        return response()->json($student);
    }

    public function markDropped(Request $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('course_students.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('[CourseStudentController] permission check failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $student = CourseStudent::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->find($id);

        if (!$student) {
            return response()->json(['error' => 'Course student not found'], 404);
        }

        $student->markDropped();

        return response()->json($student);
    }

    public function issueCertificate(Request $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('course_students.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('[CourseStudentController] permission check failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $student = CourseStudent::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->find($id);

        if (!$student) {
            return response()->json(['error' => 'Course student not found'], 404);
        }

        $student->issueCertificate($request->input('certificate_issued_date'));

        return response()->json($student);
    }

    public function enrollFromMain(EnrollFromMainRequest $request)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('course_students.enroll_from_main')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('[CourseStudentController] permission check failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validated();
        $course = ShortTermCourse::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->find($validated['course_id']);

        if (!$course) {
            return response()->json(['error' => 'Course not found'], 404);
        }

        $created = [];

        foreach ($validated['main_student_ids'] as $mainStudentId) {
            $mainStudent = Student::where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->whereNull('deleted_at')
                ->find($mainStudentId);

            if (!$mainStudent) {
                Log::warning('[CourseStudentController] Student not found for enrollment', [
                    'student_id' => $mainStudentId,
                    'course_id' => $course->id,
                ]);
                continue;
            }
            
            // Check if student is already enrolled in this course
            $existingEnrollment = CourseStudent::where('course_id', $course->id)
                ->where('main_student_id', $mainStudent->id)
                ->whereNull('deleted_at')
                ->first();
                
            if ($existingEnrollment) {
                Log::info('[CourseStudentController] Student already enrolled in course', [
                    'student_id' => $mainStudentId,
                    'course_id' => $course->id,
                    'course_student_id' => $existingEnrollment->id,
                ]);
                continue;
            }

            $data = $mainStudent->only([
                'card_number',
                'full_name',
                'father_name',
                'grandfather_name',
                'mother_name',
                'gender',
                'birth_year',
                'birth_date',
                'age',
                'orig_province',
                'orig_district',
                'orig_village',
                'curr_province',
                'curr_district',
                'curr_village',
                'nationality',
                'preferred_language',
                'previous_school',
                'guardian_name',
                'guardian_relation',
                'guardian_phone',
                'guardian_tazkira',
                'guardian_picture_path',
                'home_address',
                'zamin_name',
                'zamin_phone',
                'zamin_tazkira',
                'zamin_address',
                'emergency_contact_name',
                'emergency_contact_phone',
                'family_income',
                'picture_path',
                'is_orphan',
                'disability_status',
            ]);

            $data['organization_id'] = $profile->organization_id;
            $data['school_id'] = $currentSchoolId;
            $data['course_id'] = $course->id;
            $data['main_student_id'] = $mainStudent->id;
            $data['admission_no'] = $this->generateAdmissionNumber($course);
            $data['registration_date'] = $validated['registration_date'];
            $data['fee_paid'] = $validated['fee_paid'] ?? false;
            $data['fee_amount'] = $validated['fee_amount'] ?? null;

            try {
                $courseStudent = CourseStudent::create($data);
                $created[] = $courseStudent->fresh();
            } catch (\Exception $e) {
                Log::error('[CourseStudentController] Failed to create course student', [
                    'error' => $e->getMessage(),
                    'student_id' => $mainStudentId,
                    'course_id' => $course->id,
                ]);
                continue;
            }
        }

        if (empty($created)) {
            return response()->json([
                'error' => 'No students were enrolled. They may already be enrolled in this course or not found.',
                'enrolled_count' => 0,
            ], 200);
        }

        // Ensure proper UTF-8 encoding in response
        // Convert to array to ensure proper encoding
        $responseData = array_map(function($item) {
            return $item->toArray();
        }, $created);
        
        return response()->json($responseData, 201)
            ->header('Content-Type', 'application/json; charset=utf-8');
    }

    public function copyToMain(CopyToMainRequest $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('course_students.copy_to_main')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('[CourseStudentController] permission check failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $student = CourseStudent::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->find($id);

        if (!$student) {
            return response()->json(['error' => 'Course student not found'], 404);
        }

        $validated = $request->validated();
        $generateNew = $validated['generate_new_admission'] ?? true;
        $linkBack = $validated['link_to_course_student'] ?? true;

        $data = $student->only([
            'card_number',
            'full_name',
            'father_name',
            'grandfather_name',
            'mother_name',
            'gender',
            'birth_year',
            'birth_date',
            'age',
            'orig_province',
            'orig_district',
            'orig_village',
            'curr_province',
            'curr_district',
            'curr_village',
            'nationality',
            'preferred_language',
            'previous_school',
            'guardian_name',
            'guardian_relation',
            'guardian_phone',
            'guardian_tazkira',
            'guardian_picture_path',
            'home_address',
            'zamin_name',
            'zamin_phone',
            'zamin_tazkira',
            'zamin_address',
            'emergency_contact_name',
            'emergency_contact_phone',
            'family_income',
            'picture_path',
            'is_orphan',
            'disability_status',
        ]);

        $data['organization_id'] = $profile->organization_id;
        $data['school_id'] = $currentSchoolId;
        $data['admission_no'] = $generateNew ? null : $student->admission_no;

        $newStudent = Student::create($data);

        if ($linkBack && !$student->main_student_id) {
            $student->main_student_id = $newStudent->id;
            $student->save();
        }

        return response()->json([
            'course_student_id' => $student->id,
            'new_student_id' => $newStudent->id,
        ]);
    }

    public function enrollToNewCourse(Request $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('course_students.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('[CourseStudentController] permission check failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $request->validate([
            'course_id' => 'required|uuid|exists:short_term_courses,id',
            'registration_date' => 'nullable|date',
            'fee_paid' => 'nullable|boolean',
            'fee_amount' => 'nullable|numeric|min:0',
        ]);

        // Get the existing course student
        $existingStudent = CourseStudent::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->find($id);

        if (!$existingStudent) {
            return response()->json(['error' => 'Course student not found'], 404);
        }

        // Check if the new course exists
        $newCourse = ShortTermCourse::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->find($request->course_id);

        if (!$newCourse) {
            return response()->json(['error' => 'Course not found'], 404);
        }

        // Check if student is already enrolled in this course
        $existingEnrollment = CourseStudent::where('course_id', $request->course_id)
            ->whereNull('deleted_at')
            ->where(function($query) use ($existingStudent) {
                // Check by main_student_id if available
                if ($existingStudent->main_student_id) {
                    $query->where('main_student_id', $existingStudent->main_student_id);
                }
                // Also check by name matching (for students without main_student_id)
                $query->orWhere(function($q) use ($existingStudent) {
                    $q->where('full_name', $existingStudent->full_name)
                      ->where('father_name', $existingStudent->father_name);
                });
            })
            ->first();

        if ($existingEnrollment) {
            return response()->json([
                'error' => 'Student is already enrolled in this course',
                'existing_enrollment_id' => $existingEnrollment->id,
            ], 409);
        }

        // Create new enrollment with same personal info but new course
        $newEnrollmentData = $existingStudent->only([
            'organization_id',
            'school_id',
            'main_student_id',
            'full_name',
            'father_name',
            'grandfather_name',
            'mother_name',
            'gender',
            'birth_year',
            'birth_date',
            'age',
            'orig_province',
            'orig_district',
            'orig_village',
            'curr_province',
            'curr_district',
            'curr_village',
            'nationality',
            'preferred_language',
            'guardian_name',
            'guardian_relation',
            'guardian_phone',
            'home_address',
            'picture_path',
            'is_orphan',
            'disability_status',
        ]);

        $newEnrollmentData['course_id'] = $request->course_id;
        $newEnrollmentData['school_id'] = $currentSchoolId;
        $newEnrollmentData['registration_date'] = $request->registration_date ?? now()->toDateString();
        $newEnrollmentData['completion_status'] = 'enrolled';
        $newEnrollmentData['fee_paid'] = $request->fee_paid ?? $existingStudent->fee_paid ?? false;
        $newEnrollmentData['fee_amount'] = $request->fee_amount ?? $existingStudent->fee_amount ?? null;
        $newEnrollmentData['fee_paid_date'] = $request->fee_paid ? now() : null;

        // Generate new admission number for the new course
        $newEnrollmentData['admission_no'] = $this->generateAdmissionNumber($newCourse);

        // Sanitize UTF-8 strings
        $newEnrollmentData = $this->sanitizeUtf8($newEnrollmentData);

        try {
            $newEnrollment = CourseStudent::create($newEnrollmentData);
            $newEnrollment = $newEnrollment->fresh();

            $studentData = $newEnrollment->toArray();
            $studentData = $this->ensureUtf8Encoding($studentData);

            $jsonFlags = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES;
            if (defined('JSON_INVALID_UTF8_IGNORE')) {
                $jsonFlags |= JSON_INVALID_UTF8_IGNORE;
            }

            return response()->json($studentData, 201, [
                'Content-Type' => 'application/json; charset=utf-8'
            ], $jsonFlags);
        } catch (\Exception $e) {
            Log::error('[CourseStudentController] Error enrolling student to new course', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'existing_student_id' => $id,
                'new_course_id' => $request->course_id,
            ]);

            return response()->json([
                'error' => 'Failed to enroll student to new course',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    private function generateAdmissionNumber(ShortTermCourse $course): string
    {
        $sequence = CourseStudent::where('course_id', $course->id)->count() + 1;
        
        // Convert to Shamsi (Jalali) calendar and get 2-digit year
        $date = $course->start_date ? $course->start_date : now();
        $shamsiDate = $this->dateService->getDateComponents($date, 'jalali');
        $year = substr((string) $shamsiDate['year'], -2); // Get last 2 digits of Shamsi year
        
        return sprintf('CS-%s-%s-%03d', strtoupper(substr($course->name, 0, 3)), $year, $sequence);
    }

    /**
     * Sanitize UTF-8 strings in validated data to prevent encoding errors
     */
    private function sanitizeUtf8(array $data): array
    {
        foreach ($data as $key => $value) {
            if (is_string($value)) {
                // Remove invalid UTF-8 characters and ensure proper encoding
                $value = mb_convert_encoding($value, 'UTF-8', 'UTF-8');
                // Remove any remaining invalid UTF-8 sequences
                $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value);
                // Ensure valid UTF-8
                if (!mb_check_encoding($value, 'UTF-8')) {
                    $value = mb_convert_encoding($value, 'UTF-8', 'ISO-8859-1');
                }
                // Trim whitespace
                $data[$key] = trim($value);
            } elseif (is_array($value)) {
                $data[$key] = $this->sanitizeUtf8($value);
            }
        }
        return $data;
    }

    /**
     * Ensure all string values in array are properly UTF-8 encoded
     */
    private function ensureUtf8Encoding(array $data): array
    {
        foreach ($data as $key => $value) {
            if (is_string($value)) {
                // Check and fix encoding
                if (!mb_check_encoding($value, 'UTF-8')) {
                    $value = mb_convert_encoding($value, 'UTF-8', mb_detect_encoding($value, mb_detect_order(), true) ?: 'UTF-8');
                }
                $data[$key] = $value;
            } elseif (is_array($value)) {
                $data[$key] = $this->ensureUtf8Encoding($value);
            }
        }
        return $data;
    }

    /**
     * Upload course student picture
     */
    public function uploadPicture(Request $request, string $id)
    {
        // Debug: Log upload attempt
        Log::info('Course Student Picture Upload - Request received', [
            'course_student_id' => $id,
            'has_file' => $request->hasFile('file'),
            'file_name' => $request->hasFile('file') ? $request->file('file')->getClientOriginalName() : null,
        ]);
        
        try {
            $user = $request->user();
            if (!$user) {
                Log::warning('Course Student Picture Upload - Unauthorized', ['course_student_id' => $id]);
                return response()->json(['error' => 'Unauthorized'], 401);
            }

            $profile = $this->getProfile($user);

            if (!$profile) {
                return response()->json(['error' => 'Profile not found'], 404);
            }

            if (!$profile->organization_id) {
                return response()->json(['error' => 'User must be assigned to an organization'], 403);
            }

            $currentSchoolId = $this->getCurrentSchoolId($request);

            try {
                if (!$user->hasPermissionTo('course_students.update')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                Log::warning('[CourseStudentController] permission check failed', ['error' => $e->getMessage()]);
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $student = CourseStudent::where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->whereNull('deleted_at')
                ->find($id);

            if (!$student) {
                Log::warning('Course Student Picture Upload - Student not found', [
                    'course_student_id' => $id,
                    'organization_id' => $profile->organization_id,
                    'school_id' => $currentSchoolId,
                ]);
                return response()->json(['error' => 'Course student not found'], 404);
            }

            if (!$request->hasFile('file')) {
                Log::warning('Course Student Picture Upload - No file provided', ['course_student_id' => $id]);
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

            // Store new picture using FileStorageService (PRIVATE storage for course student pictures)
            // Use storeStudentPicture since course students are similar to students
            $path = $this->fileStorageService->storeStudentPicture(
                $file,
                $student->organization_id,
                $id,
                $student->school_id
            );

            // Update course student record
            $oldPicturePath = $student->picture_path;
            
            // Use update() method to ensure the change is persisted
            // Also use DB::table() as a fallback to ensure the update happens
            $updated = $student->update(['picture_path' => $path]);
            
            // Double-check by querying the database directly
            if (!$updated) {
                Log::warning('Course Student Picture Upload - update() returned false, trying DB::table()', [
                    'course_student_id' => $id,
                    'picture_path' => $path,
                ]);
                
                // Try direct DB update as fallback
                $dbUpdated = DB::table('course_students')
                    ->where('id', $id)
                    ->where('organization_id', $profile->organization_id)
                    ->where('school_id', $currentSchoolId)
                    ->whereNull('deleted_at')
                    ->update(['picture_path' => $path]);
                
                if (!$dbUpdated) {
                    Log::error('Course Student Picture Upload - Failed to update picture_path via both methods', [
                        'course_student_id' => $id,
                        'picture_path' => $path,
                        'update_result' => $updated,
                        'db_update_result' => $dbUpdated,
                    ]);
                    return response()->json(['error' => 'Failed to save picture path'], 500);
                }
                
                // Refresh the model after DB update
                $student->refresh();
            } else {
                // Refresh the model to ensure we have the latest data
                $student->refresh();
            }

            Log::info('Course Student Picture Upload', [
                'course_student_id' => $id,
                'user_id' => $user->id,
                'old_picture_path' => $oldPicturePath,
                'new_picture_path' => $path,
                'saved_picture_path' => $student->picture_path, // Verify it was saved
                'file_size' => $fileSize,
                'file_extension' => $extension,
                'update_result' => $updated,
            ]);

            return response()->json([
                'message' => 'Picture uploaded successfully',
                'picture_path' => $path,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::warning('Course student picture upload validation failed', [
                'errors' => $e->errors(),
                'course_student_id' => $id,
            ]);
            return response()->json([
                'error' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error uploading course student picture: ' . $e->getMessage(), [
                'course_student_id' => $id,
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['error' => 'Failed to upload picture: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Get course student picture
     */
    public function getPicture(Request $request, string $id)
    {
        try {
            $user = $request->user();
            if (!$user) {
                abort(401, 'Unauthorized');
            }

            $profile = $this->getProfile($user);

            if (!$profile) {
                abort(404, 'Profile not found');
            }

            if (!$profile->organization_id) {
                return response()->json(['error' => 'User must be assigned to an organization'], 403);
            }

            $currentSchoolId = $this->getCurrentSchoolId($request);

            try {
                if (!$user->hasPermissionTo('course_students.read')) {
                    return response()->json([
                        'error' => 'Access Denied',
                        'message' => 'You do not have permission to view course student pictures.',
                    ], 403);
                }
            } catch (\Exception $e) {
                Log::warning('[CourseStudentController] permission check failed', ['error' => $e->getMessage()]);
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $student = CourseStudent::where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->whereNull('deleted_at')
                ->find($id);

            if (!$student) {
                return response()->json(['error' => 'Course student not found'], 404);
            }

            $picturePath = null;
            $source = 'course_student';

            // First, try course student's own picture
            if ($student->picture_path) {
                $picturePath = $student->picture_path;
            } 
            // If no picture_path, try main student's picture if linked
            elseif ($student->main_student_id) {
                $mainStudent = Student::where('id', $student->main_student_id)
                    ->where('organization_id', $profile->organization_id)
                    ->where('school_id', $currentSchoolId)
                    ->whereNull('deleted_at')
                    ->first();
                
                if ($mainStudent && $mainStudent->picture_path) {
                    $picturePath = $mainStudent->picture_path;
                    $source = 'main_student';
                }
            }

            if (!$picturePath) {
                Log::info('Course student picture requested but no picture_path available', [
                    'course_student_id' => $id,
                    'main_student_id' => $student->main_student_id,
                ]);
                return response('', 404);
            }

            // Check if file exists using FileStorageService
            if (!$this->fileStorageService->fileExists($picturePath)) {
                Log::warning('Course student picture file not found on disk', [
                    'course_student_id' => $id,
                    'picture_path' => $picturePath,
                    'source' => $source,
                ]);
                return response('', 404);
            }

            // Get file content using FileStorageService
            $file = $this->fileStorageService->getFile($picturePath);

            if (!$file || empty($file)) {
                Log::error('Course student picture file is empty', [
                    'course_student_id' => $id,
                    'picture_path' => $picturePath,
                    'source' => $source,
                ]);
                return response('', 404);
            }

            // Determine MIME type from file extension using FileStorageService
            $mimeType = $this->fileStorageService->getMimeTypeFromExtension($picturePath);

            return response($file, 200)
                ->header('Content-Type', $mimeType)
                ->header('Content-Disposition', 'inline; filename="' . basename($picturePath) . '"')
                ->header('Cache-Control', 'private, max-age=3600');
        } catch (\Illuminate\Http\Exceptions\HttpResponseException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('Error retrieving course student picture: ' . $e->getMessage(), [
                'course_student_id' => $id,
                'trace' => $e->getTraceAsString(),
            ]);
            abort(404, 'Picture not found');
        }
    }
}
