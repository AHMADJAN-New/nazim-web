<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\Permission;
use App\Models\SchoolBranding;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\PermissionRegistrar;
use Tests\Feature\Concerns\CreatesSchoolData;
use Tests\TestCase;

class StudentAdmissionStatusSyncTest extends TestCase
{
    use CreatesSchoolData;
    use RefreshDatabase;

    private function createUserWithPermissions(Organization $organization, SchoolBranding $school, array $permissions)
    {
        $user = $this->createUser(
            [],
            ['organization_id' => $organization->id, 'default_school_id' => $school->id],
            $organization,
            $school,
            null,
            ['withRole' => false]
        );

        app(PermissionRegistrar::class)->forgetCachedPermissions();
        setPermissionsTeamId($organization->id);

        foreach ($permissions as $permissionName) {
            $permission = Permission::firstOrCreate([
                'name' => $permissionName,
                'guard_name' => 'web',
                'organization_id' => $organization->id,
            ]);

            $user->givePermissionTo($permission);
        }

        setPermissionsTeamId(null);

        return $user;
    }

    #[Test]
    public function bulk_status_update_syncs_the_student_master_status(): void
    {
        $organization = Organization::factory()->create();
        $school = SchoolBranding::factory()->create(['organization_id' => $organization->id]);
        $user = $this->createUserWithPermissions($organization, $school, ['student_admissions.update']);

        $academicYear = $this->createAcademicYearForSchool($organization, $school);
        $class = $this->createClassForSchool($organization, $school);
        $classAcademicYear = $this->createClassAcademicYearForSchool($organization, $school, $class, $academicYear);
        $student = $this->createStudentForSchool($organization, $school, ['student_status' => 'admitted']);

        $admission = $this->createStudentAdmissionForSchool(
            $organization,
            $school,
            $student,
            $academicYear,
            $class,
            $classAcademicYear,
            [
                'enrollment_status' => 'admitted',
            ]
        );

        $response = $this->jsonAs($user, 'POST', '/api/student-admissions/bulk-status', [
            'admission_ids' => [$admission->id],
            'enrollment_status' => 'active',
        ]);

        $response->assertOk()
            ->assertJsonFragment([
                'updated_count' => 1,
                'skipped_count' => 0,
                'enrollment_status' => 'active',
            ]);

        $this->assertDatabaseHas('student_admissions', [
            'id' => $admission->id,
            'enrollment_status' => 'active',
        ]);

        $this->assertDatabaseHas('students', [
            'id' => $student->id,
            'student_status' => 'active',
        ]);
    }

    #[Test]
    public function bulk_assign_placement_by_student_ids_updates_class_section(): void
    {
        $organization = Organization::factory()->create();
        $school = SchoolBranding::factory()->create(['organization_id' => $organization->id]);
        $user = $this->createUserWithPermissions($organization, $school, ['student_admissions.update']);

        $academicYear = $this->createAcademicYearForSchool($organization, $school);
        $class = $this->createClassForSchool($organization, $school);
        $this->createClassAcademicYearForSchool($organization, $school, $class, $academicYear, ['section_name' => 'A']);
        $cayB = $this->createClassAcademicYearForSchool($organization, $school, $class, $academicYear, ['section_name' => 'B']);

        $student = $this->createStudentForSchool($organization, $school);
        $admission = $this->createStudentAdmissionForSchool(
            $organization,
            $school,
            $student,
            $academicYear,
            $class,
            null,
            [
                'class_id' => null,
                'class_academic_year_id' => null,
                'enrollment_status' => 'pending',
            ]
        );

        $response = $this->jsonAs($user, 'POST', '/api/student-admissions/bulk-assign-placement', [
            'student_ids' => [$student->id],
            'class_academic_year_id' => $cayB->id,
            'is_boarder' => false,
            'only_without_class' => true,
            'enrollment_status' => 'admitted',
        ]);

        $response->assertOk()
            ->assertJsonFragment([
                'updated_count' => 1,
            ]);

        $this->assertDatabaseHas('student_admissions', [
            'id' => $admission->id,
            'class_academic_year_id' => $cayB->id,
            'class_id' => $class->id,
            'enrollment_status' => 'admitted',
        ]);
    }

    #[Test]
    public function bulk_assign_placement_by_student_ids_returns_ok_when_only_without_class_excludes_placed_students(): void
    {
        $organization = Organization::factory()->create();
        $school = SchoolBranding::factory()->create(['organization_id' => $organization->id]);
        $user = $this->createUserWithPermissions($organization, $school, ['student_admissions.update']);

        $academicYear = $this->createAcademicYearForSchool($organization, $school);
        $class = $this->createClassForSchool($organization, $school);
        $cayA = $this->createClassAcademicYearForSchool($organization, $school, $class, $academicYear, ['section_name' => 'A']);
        $cayB = $this->createClassAcademicYearForSchool($organization, $school, $class, $academicYear, ['section_name' => 'B']);

        $student = $this->createStudentForSchool($organization, $school);
        $admission = $this->createStudentAdmissionForSchool(
            $organization,
            $school,
            $student,
            $academicYear,
            $class,
            null,
            [
                'class_id' => null,
                'class_academic_year_id' => null,
                'enrollment_status' => 'pending',
            ]
        );

        $this->jsonAs($user, 'POST', '/api/student-admissions/bulk-assign-placement', [
            'student_ids' => [$student->id],
            'class_academic_year_id' => $cayB->id,
            'is_boarder' => false,
            'only_without_class' => true,
        ])->assertOk()->assertJsonFragment(['updated_count' => 1]);

        $response = $this->jsonAs($user, 'POST', '/api/student-admissions/bulk-assign-placement', [
            'student_ids' => [$student->id],
            'class_academic_year_id' => $cayA->id,
            'is_boarder' => false,
            'only_without_class' => true,
        ]);

        $response->assertOk()
            ->assertJsonPath('updated_count', 0)
            ->assertJsonPath('skipped_count', 0)
            ->assertJsonPath('total_candidates', 0)
            ->assertJsonPath('errors.0.reason', 'no_unassigned_admission_for_year');

        $this->assertDatabaseHas('student_admissions', [
            'id' => $admission->id,
            'class_academic_year_id' => $cayB->id,
        ]);
    }

    #[Test]
    public function student_list_uses_the_latest_admission_summary_to_show_current_class_state(): void
    {
        $organization = Organization::factory()->create();
        $school = SchoolBranding::factory()->create(['organization_id' => $organization->id]);
        $user = $this->createUserWithPermissions($organization, $school, ['students.read']);

        $academicYear = $this->createAcademicYearForSchool($organization, $school);
        $nextAcademicYear = $this->createAcademicYearForSchool($organization, $school);
        $class = $this->createClassForSchool($organization, $school, ['name' => 'Grade 8']);
        $classAcademicYear = $this->createClassAcademicYearForSchool(
            $organization,
            $school,
            $class,
            $academicYear,
            ['section_name' => 'A']
        );
        $nextClassAcademicYear = $this->createClassAcademicYearForSchool(
            $organization,
            $school,
            $class,
            $nextAcademicYear,
            ['section_name' => 'A']
        );

        $activeStudent = $this->createStudentForSchool($organization, $school, ['full_name' => 'Active Student']);
        $closedStudent = $this->createStudentForSchool($organization, $school, ['full_name' => 'Closed Student']);

        $this->createStudentAdmissionForSchool(
            $organization,
            $school,
            $activeStudent,
            $academicYear,
            $class,
            $classAcademicYear,
            [
                'admission_date' => now()->subDays(1)->toDateString(),
                'enrollment_status' => 'active',
            ]
        );

        $this->createStudentAdmissionForSchool(
            $organization,
            $school,
            $closedStudent,
            $academicYear,
            $class,
            $classAcademicYear,
            [
                'admission_date' => now()->subDays(10)->toDateString(),
                'enrollment_status' => 'active',
            ]
        );

        $this->createStudentAdmissionForSchool(
            $organization,
            $school,
            $closedStudent,
            $nextAcademicYear,
            $class,
            $nextClassAcademicYear,
            [
                'admission_date' => now()->toDateString(),
                'enrollment_status' => 'withdrawn',
            ]
        );

        $response = $this->jsonAs($user, 'GET', '/api/students');

        $response->assertOk();

        $students = collect($response->json());
        $activeStudentPayload = $students->firstWhere('id', $activeStudent->id);
        $closedStudentPayload = $students->firstWhere('id', $closedStudent->id);

        $this->assertNotNull($activeStudentPayload);
        $this->assertSame('active', data_get($activeStudentPayload, 'latest_admission.enrollment_status'));
        $this->assertTrue(data_get($activeStudentPayload, 'latest_admission.is_current_enrollment'));
        $this->assertTrue(data_get($activeStudentPayload, 'latest_admission.is_assigned_to_class'));
        $this->assertSame('Grade 8', data_get($activeStudentPayload, 'current_class.name'));

        $this->assertNotNull($closedStudentPayload);
        $this->assertSame('withdrawn', data_get($closedStudentPayload, 'latest_admission.enrollment_status'));
        $this->assertFalse(data_get($closedStudentPayload, 'latest_admission.is_current_enrollment'));
        $this->assertFalse(data_get($closedStudentPayload, 'latest_admission.is_assigned_to_class'));
        $this->assertNull(data_get($closedStudentPayload, 'current_class'));
    }
}
