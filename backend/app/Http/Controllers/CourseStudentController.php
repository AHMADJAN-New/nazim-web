<?php

namespace App\Http\Controllers;

use App\Http\Requests\CopyToMainRequest;
use App\Http\Requests\EnrollFromMainRequest;
use App\Http\Requests\StoreCourseStudentRequest;
use App\Http\Requests\UpdateCourseStudentRequest;
use App\Models\CourseStudent;
use App\Models\ShortTermCourse;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CourseStudentController extends Controller
{
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

        try {
            if (!$user->hasPermissionTo('course_students.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('[CourseStudentController] permission check failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $query = CourseStudent::where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at');

        if ($request->filled('course_id')) {
            $query->where('course_id', $request->course_id);
        }

        if ($request->filled('completion_status')) {
            $query->where('completion_status', $request->completion_status);
        }

        return response()->json($query->orderBy('registration_date', 'desc')->get());
    }

    public function store(StoreCourseStudentRequest $request)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

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

        // Auto-generate admission number if not provided or empty
        if (empty($validated['admission_no']) || trim($validated['admission_no'] ?? '') === '') {
            $course = ShortTermCourse::where('organization_id', $profile->organization_id)
                ->whereNull('deleted_at')
                ->find($validated['course_id']);
            
            if ($course) {
                $validated['admission_no'] = $this->generateAdmissionNumber($course);
            } else {
                // Fallback if course not found
                $validated['admission_no'] = 'CS-' . now()->format('Y') . '-' . str_pad((string)(CourseStudent::where('organization_id', $profile->organization_id)->count() + 1), 3, '0', STR_PAD_LEFT);
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

        try {
            if (!$user->hasPermissionTo('course_students.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('[CourseStudentController] permission check failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $student = CourseStudent::where('organization_id', $profile->organization_id)
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

        try {
            if (!$user->hasPermissionTo('course_students.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('[CourseStudentController] permission check failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $student = CourseStudent::where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->find($id);

        if (!$student) {
            return response()->json(['error' => 'Course student not found'], 404);
        }

        $student->update($request->validated());

        return response()->json($student);
    }

    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('course_students.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('[CourseStudentController] permission check failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $student = CourseStudent::where('organization_id', $profile->organization_id)
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

        try {
            if (!$user->hasPermissionTo('course_students.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('[CourseStudentController] permission check failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $student = CourseStudent::where('organization_id', $profile->organization_id)
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

        try {
            if (!$user->hasPermissionTo('course_students.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('[CourseStudentController] permission check failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $student = CourseStudent::where('organization_id', $profile->organization_id)
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

        try {
            if (!$user->hasPermissionTo('course_students.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('[CourseStudentController] permission check failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $student = CourseStudent::where('organization_id', $profile->organization_id)
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
            ->whereNull('deleted_at')
            ->find($validated['course_id']);

        if (!$course) {
            return response()->json(['error' => 'Course not found'], 404);
        }

        $created = [];

        foreach ($validated['main_student_ids'] as $mainStudentId) {
            $mainStudent = Student::where('organization_id', $profile->organization_id)
                ->whereNull('deleted_at')
                ->find($mainStudentId);

            if (!$mainStudent) {
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
            $data['course_id'] = $course->id;
            $data['main_student_id'] = $mainStudent->id;
            $data['admission_no'] = $this->generateAdmissionNumber($course);
            $data['registration_date'] = $validated['registration_date'];
            $data['fee_paid'] = $validated['fee_paid'] ?? false;
            $data['fee_amount'] = $validated['fee_amount'] ?? null;

            $created[] = CourseStudent::create($data);
        }

        return response()->json($created, 201);
    }

    public function copyToMain(CopyToMainRequest $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('course_students.copy_to_main')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('[CourseStudentController] permission check failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $student = CourseStudent::where('organization_id', $profile->organization_id)
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

    private function generateAdmissionNumber(ShortTermCourse $course): string
    {
        $sequence = CourseStudent::where('course_id', $course->id)->count() + 1;
        $year = $course->start_date ? $course->start_date->format('Y') : now()->format('Y');
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
}
