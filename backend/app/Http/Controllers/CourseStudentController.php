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

        $student = CourseStudent::create($validated);

        return response()->json($student, 201);
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

        return response()->json(['message' => 'Course student deleted']);
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
}
