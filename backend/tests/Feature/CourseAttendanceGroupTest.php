<?php

namespace Tests\Feature;

use App\Models\CourseAttendanceGroup;
use App\Models\CourseStudent;
use App\Models\Permission;
use App\Models\ShortTermCourse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class CourseAttendanceGroupTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_course_can_have_multiple_attendance_groups_and_sessions_use_one_group(): void
    {
        $user = $this->authenticate([], [], null, null, null, ['withRole' => false]);
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        $this->grantCourseAttendancePermissions($user, $organization->id);

        $course = ShortTermCourse::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'name' => 'Tajweed',
            'status' => 'open',
        ]);

        $studentA = $this->enroll($organization->id, $school->id, $course->id, 'A-100', 'Ahmad');
        $studentB = $this->enroll($organization->id, $school->id, $course->id, 'B-200', 'Bilal');

        $groupA = $this->jsonAs($user, 'POST', '/api/course-attendance-groups', [
            'course_id' => $course->id,
            'name' => 'Morning group',
            'student_ids' => [$studentA->id],
        ]);
        $groupA->assertCreated();
        $groupA->assertJsonPath('name', 'Morning group');
        $groupA->assertJsonPath('students_count', 1);

        $groupB = $this->jsonAs($user, 'POST', '/api/course-attendance-groups', [
            'course_id' => $course->id,
            'name' => 'Evening group',
            'student_ids' => [$studentB->id],
        ]);
        $groupB->assertCreated();

        $list = $this->jsonAs($user, 'GET', '/api/course-attendance-groups?course_id='.$course->id);
        $list->assertOk();
        $list->assertJsonCount(2);
        $this->assertEqualsCanonicalizing(
            ['Morning group', 'Evening group'],
            collect($list->json())->pluck('name')->all()
        );

        $duplicate = $this->jsonAs($user, 'POST', '/api/course-attendance-groups', [
            'course_id' => $course->id,
            'name' => 'morning group',
            'student_ids' => [$studentA->id],
        ]);
        $duplicate->assertStatus(422);

        $session = $this->jsonAs($user, 'POST', '/api/course-attendance-sessions', [
            'course_id' => $course->id,
            'attendance_group_id' => $groupA->json('id'),
            'session_date' => now()->toDateString(),
            'method' => 'manual',
        ]);
        $session->assertCreated();
        $session->assertJsonPath('attendance_group_id', $groupA->json('id'));

        $roster = $this->jsonAs($user, 'GET', '/api/course-attendance-sessions/roster?course_id='.$course->id.'&attendance_group_id='.$groupA->json('id'));
        $roster->assertOk();
        $roster->assertJsonCount(1);
        $roster->assertJsonPath('0.id', $studentA->id);

        $markMember = $this->jsonAs($user, 'POST', '/api/course-attendance-sessions/'.$session->json('id').'/records', [
            'records' => [
                ['course_student_id' => $studentA->id, 'status' => 'present'],
            ],
        ]);
        $markMember->assertOk();

        $markOutsider = $this->jsonAs($user, 'POST', '/api/course-attendance-sessions/'.$session->json('id').'/records', [
            'records' => [
                ['course_student_id' => $studentB->id, 'status' => 'present'],
            ],
        ]);
        $markOutsider->assertStatus(422);

        $wholeCourse = $this->jsonAs($user, 'POST', '/api/course-attendance-sessions', [
            'course_id' => $course->id,
            'session_date' => now()->toDateString(),
            'method' => 'manual',
            'session_title' => 'Everyone',
        ]);
        $wholeCourse->assertCreated();
        $wholeCourse->assertJsonPath('attendance_group_id', null);

        $markAnyone = $this->jsonAs($user, 'POST', '/api/course-attendance-sessions/'.$wholeCourse->json('id').'/records', [
            'records' => [
                ['course_student_id' => $studentB->id, 'status' => 'late'],
            ],
        ]);
        $markAnyone->assertOk();

        $this->assertSame(2, CourseAttendanceGroup::where('course_id', $course->id)->count());
    }

    public function test_groups_are_isolated_by_organization_and_require_permission(): void
    {
        $owner = $this->authenticate([], [], null, null, null, ['withRole' => false]);
        $organization = $this->getUserOrganization($owner);
        $school = $this->getUserSchool($owner);
        $this->grantCourseAttendancePermissions($owner, $organization->id);

        $course = ShortTermCourse::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'name' => 'Fiqh',
            'status' => 'open',
        ]);
        $student = $this->enroll($organization->id, $school->id, $course->id, 'C-300', 'Karim');

        $this->jsonAs($owner, 'POST', '/api/course-attendance-groups', [
            'course_id' => $course->id,
            'name' => 'Group A',
            'student_ids' => [$student->id],
        ])->assertCreated();

        $other = $this->createUser([], [], null, null, null, ['withRole' => false]);
        $otherOrg = $this->getUserOrganization($other);
        $this->grantCourseAttendancePermissions($other, $otherOrg->id);

        $this->jsonAs($other, 'GET', '/api/course-attendance-groups?course_id='.$course->id)
            ->assertNotFound();

        $unauthorized = $this->createUser([], [], null, null, null, ['withRole' => false]);
        $this->jsonAs($unauthorized, 'GET', '/api/course-attendance-groups?course_id='.$course->id)
            ->assertForbidden();
    }

    private function enroll(string $organizationId, string $schoolId, string $courseId, string $admissionNo, string $name): CourseStudent
    {
        return CourseStudent::create([
            'organization_id' => $organizationId,
            'school_id' => $schoolId,
            'course_id' => $courseId,
            'admission_no' => $admissionNo,
            'registration_date' => now()->toDateString(),
            'completion_status' => 'enrolled',
            'full_name' => $name,
        ]);
    }

    private function grantCourseAttendancePermissions($user, string $organizationId): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        setPermissionsTeamId($organizationId);

        foreach (['read', 'create', 'update', 'delete'] as $action) {
            $permission = Permission::firstOrCreate([
                'name' => 'course_attendance.'.$action,
                'guard_name' => 'web',
                'organization_id' => $organizationId,
            ], [
                'resource' => 'course_attendance',
                'action' => $action,
            ]);
            $user->givePermissionTo($permission);
        }

        setPermissionsTeamId(null);
    }
}
