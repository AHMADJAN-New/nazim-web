<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCourseAttendanceGroupRequest;
use App\Http\Requests\UpdateCourseAttendanceGroupRequest;
use App\Models\CourseAttendanceGroup;
use App\Models\CourseAttendanceGroupStudent;
use App\Models\CourseStudent;
use App\Models\ShortTermCourse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CourseAttendanceGroupController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $context = $this->authorizeCourseAttendance($request, 'course_attendance.read');
        if ($context instanceof JsonResponse) {
            return $context;
        }

        [$profile, $currentSchoolId] = $context;

        $validated = $request->validate([
            'course_id' => ['required', 'uuid'],
        ]);

        $course = $this->findCourse($validated['course_id'], $profile->organization_id, $currentSchoolId);
        if (! $course) {
            return response()->json(['error' => 'Course not found'], 404);
        }

        $groups = CourseAttendanceGroup::query()
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('course_id', $course->id)
            ->whereNull('deleted_at')
            ->with(['students' => function ($query): void {
                $query->orderBy('full_name')
                    ->select(
                        'course_students.id',
                        'course_students.full_name',
                        'course_students.father_name',
                        'course_students.admission_no',
                        'course_attendance_group_students.course_attendance_group_id'
                    );
            }])
            ->orderBy('name')
            ->get();

        return response()->json($groups->map(fn (CourseAttendanceGroup $group) => $this->presentGroup($group))->values());
    }

    public function store(StoreCourseAttendanceGroupRequest $request): JsonResponse
    {
        $context = $this->authorizeCourseAttendance($request, 'course_attendance.create');
        if ($context instanceof JsonResponse) {
            return $context;
        }

        [$profile, $currentSchoolId] = $context;
        $validated = $request->validated();

        $course = $this->findCourse($validated['course_id'], $profile->organization_id, $currentSchoolId);
        if (! $course) {
            return response()->json(['error' => 'Course not found'], 404);
        }

        $name = trim($validated['name']);
        if ($name === '') {
            return response()->json(['error' => 'Group name cannot be empty'], 422);
        }

        if ($this->nameExists($course->id, $name)) {
            return response()->json(['error' => 'An attendance group with this name already exists for this course'], 422);
        }

        $studentIds = $this->enrolledStudentIds($course->id, $profile->organization_id, $currentSchoolId, $validated['student_ids']);
        if ($studentIds instanceof JsonResponse) {
            return $studentIds;
        }

        $group = DB::transaction(function () use ($profile, $currentSchoolId, $course, $name, $validated, $studentIds) {
            $group = CourseAttendanceGroup::create([
                'organization_id' => $profile->organization_id,
                'school_id' => $currentSchoolId,
                'course_id' => $course->id,
                'name' => $name,
                'description' => $this->nullableText($validated['description'] ?? null),
                'is_active' => true,
            ]);

            $this->replaceMembers($group, $profile->organization_id, $currentSchoolId, $studentIds);

            return $group;
        });

        $group->load(['students' => function ($query): void {
            $query->orderBy('full_name')
                ->select('course_students.id', 'course_students.full_name', 'course_students.father_name', 'course_students.admission_no');
        }]);

        return response()->json($this->presentGroup($group), 201);
    }

    public function update(UpdateCourseAttendanceGroupRequest $request, string $id): JsonResponse
    {
        $context = $this->authorizeCourseAttendance($request, 'course_attendance.update');
        if ($context instanceof JsonResponse) {
            return $context;
        }

        [$profile, $currentSchoolId] = $context;

        $group = $this->findGroup($id, $profile->organization_id, $currentSchoolId);
        if (! $group) {
            return response()->json(['error' => 'Attendance group not found'], 404);
        }

        $validated = $request->validated();

        if (array_key_exists('name', $validated)) {
            $name = trim($validated['name']);
            if ($name === '') {
                return response()->json(['error' => 'Group name cannot be empty'], 422);
            }

            if ($this->nameExists($group->course_id, $name, $group->id)) {
                return response()->json(['error' => 'An attendance group with this name already exists for this course'], 422);
            }

            $validated['name'] = $name;
        }

        if (array_key_exists('description', $validated)) {
            $validated['description'] = $this->nullableText($validated['description']);
        }

        $studentIds = null;
        if (array_key_exists('student_ids', $validated)) {
            $studentIds = $this->enrolledStudentIds(
                $group->course_id,
                $profile->organization_id,
                $currentSchoolId,
                $validated['student_ids']
            );
            if ($studentIds instanceof JsonResponse) {
                return $studentIds;
            }
        }

        unset($validated['student_ids']);

        DB::transaction(function () use ($group, $validated, $studentIds, $profile, $currentSchoolId): void {
            if ($validated !== []) {
                $group->update($validated);
            }

            if (is_array($studentIds)) {
                $this->replaceMembers($group, $profile->organization_id, $currentSchoolId, $studentIds);
            }
        });

        $group->refresh();
        $group->load(['students' => function ($query): void {
            $query->orderBy('full_name')
                ->select('course_students.id', 'course_students.full_name', 'course_students.father_name', 'course_students.admission_no');
        }]);

        return response()->json($this->presentGroup($group));
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $context = $this->authorizeCourseAttendance($request, 'course_attendance.delete');
        if ($context instanceof JsonResponse) {
            return $context;
        }

        [$profile, $currentSchoolId] = $context;

        $group = $this->findGroup($id, $profile->organization_id, $currentSchoolId);
        if (! $group) {
            return response()->json(['error' => 'Attendance group not found'], 404);
        }

        $group->delete();

        return response()->noContent();
    }

    /**
     * @return array{0: object, 1: string}|JsonResponse
     */
    private function authorizeCourseAttendance(Request $request, string $permission): array|JsonResponse
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', (string) $user->id)->first();

        if (! $profile || ! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (! $user->hasPermissionTo($permission)) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('[CourseAttendanceGroupController] permission check failed', [
                'permission' => $permission,
                'error' => $e->getMessage(),
            ]);

            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        return [$profile, $currentSchoolId];
    }

    private function findCourse(string $courseId, string $organizationId, string $schoolId): ?ShortTermCourse
    {
        return ShortTermCourse::query()
            ->where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->whereNull('deleted_at')
            ->find($courseId);
    }

    private function findGroup(string $id, string $organizationId, string $schoolId): ?CourseAttendanceGroup
    {
        return CourseAttendanceGroup::query()
            ->where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->whereNull('deleted_at')
            ->find($id);
    }

    private function nameExists(string $courseId, string $name, ?string $ignoreId = null): bool
    {
        return CourseAttendanceGroup::query()
            ->where('course_id', $courseId)
            ->whereNull('deleted_at')
            ->when($ignoreId, fn ($query) => $query->where('id', '!=', $ignoreId))
            ->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])
            ->exists();
    }

    /**
     * @param  array<int, string>  $studentIds
     * @return array<int, string>|JsonResponse
     */
    private function enrolledStudentIds(string $courseId, string $organizationId, string $schoolId, array $studentIds): array|JsonResponse
    {
        $uniqueIds = array_values(array_unique($studentIds));

        $validIds = CourseStudent::query()
            ->where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->where('course_id', $courseId)
            ->where('completion_status', 'enrolled')
            ->whereNull('deleted_at')
            ->whereIn('id', $uniqueIds)
            ->pluck('id')
            ->all();

        if (count($validIds) !== count($uniqueIds)) {
            return response()->json(['error' => 'One or more students are not enrolled in this course'], 422);
        }

        return $validIds;
    }

    /**
     * @param  array<int, string>  $studentIds
     */
    private function replaceMembers(CourseAttendanceGroup $group, string $organizationId, string $schoolId, array $studentIds): void
    {
        CourseAttendanceGroupStudent::query()
            ->where('course_attendance_group_id', $group->id)
            ->delete();

        foreach ($studentIds as $studentId) {
            CourseAttendanceGroupStudent::create([
                'organization_id' => $organizationId,
                'school_id' => $schoolId,
                'course_attendance_group_id' => $group->id,
                'course_student_id' => $studentId,
            ]);
        }
    }

    private function nullableText(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        return $trimmed === '' ? null : $trimmed;
    }

    /**
     * @return array<string, mixed>
     */
    private function presentGroup(CourseAttendanceGroup $group): array
    {
        $students = $group->students->map(fn (CourseStudent $student) => [
            'id' => $student->id,
            'full_name' => $student->full_name,
            'father_name' => $student->father_name,
            'admission_no' => $student->admission_no,
        ])->values();

        return [
            'id' => $group->id,
            'organization_id' => $group->organization_id,
            'school_id' => $group->school_id,
            'course_id' => $group->course_id,
            'name' => $group->name,
            'description' => $group->description,
            'is_active' => $group->is_active,
            'students_count' => $students->count(),
            'students' => $students,
            'created_at' => $group->created_at,
            'updated_at' => $group->updated_at,
        ];
    }
}
