<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\ClassAcademicYear;
use App\Models\ClassModel;
use App\Models\Exam;
use App\Models\ExamClass;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\SchoolBranding;
use App\Models\Student;
use App\Models\StudentAdmission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class ClassAcademicYearDeletionTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array{organization: Organization, school: SchoolBranding, academicYear: AcademicYear, class: ClassModel, classAcademicYear: ClassAcademicYear}
     */
    private function createClassAcademicYearFixture(): array
    {
        $organization = Organization::factory()->create();
        $school = SchoolBranding::factory()->create(['organization_id' => $organization->id]);

        $academicYear = AcademicYear::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $class = ClassModel::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $classAcademicYear = ClassAcademicYear::create([
            'class_id' => $class->id,
            'academic_year_id' => $academicYear->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'section_name' => 'A',
            'capacity' => 30,
            'current_student_count' => 0,
            'is_active' => true,
        ]);

        return compact('organization', 'school', 'academicYear', 'class', 'classAcademicYear');
    }

    private function createUserWithClassDeletePermission(Organization $organization, SchoolBranding $school)
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
        $permission = Permission::firstOrCreate([
            'name' => 'classes.delete',
            'guard_name' => 'web',
            'organization_id' => $organization->id,
        ]);

        setPermissionsTeamId($organization->id);
        $user->givePermissionTo($permission);
        setPermissionsTeamId(null);

        return $user;
    }

    /** @test */
    public function it_deletes_class_academic_year_when_no_blockers_exist(): void
    {
        $fixture = $this->createClassAcademicYearFixture();
        $user = $this->createUserWithClassDeletePermission($fixture['organization'], $fixture['school']);

        $response = $this->jsonAs(
            $user,
            'DELETE',
            '/api/classes/academic-years/'.$fixture['classAcademicYear']->id
        );

        $response->assertNoContent();
        $this->assertSoftDeleted('class_academic_years', [
            'id' => $fixture['classAcademicYear']->id,
        ]);
    }

    /** @test */
    public function it_allows_delete_when_stored_student_count_is_stale_but_no_admissions_exist(): void
    {
        $fixture = $this->createClassAcademicYearFixture();
        $fixture['classAcademicYear']->update(['current_student_count' => 5]);
        $user = $this->createUserWithClassDeletePermission($fixture['organization'], $fixture['school']);

        $response = $this->jsonAs(
            $user,
            'DELETE',
            '/api/classes/academic-years/'.$fixture['classAcademicYear']->id
        );

        $response->assertNoContent();
        $this->assertSoftDeleted('class_academic_years', [
            'id' => $fixture['classAcademicYear']->id,
        ]);
    }

    /** @test */
    public function it_blocks_delete_when_student_admissions_exist(): void
    {
        $fixture = $this->createClassAcademicYearFixture();
        $user = $this->createUserWithClassDeletePermission($fixture['organization'], $fixture['school']);

        $student = Student::factory()->create([
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
        ]);

        StudentAdmission::create([
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
            'student_id' => $student->id,
            'academic_year_id' => $fixture['academicYear']->id,
            'class_id' => $fixture['class']->id,
            'class_academic_year_id' => $fixture['classAcademicYear']->id,
            'admission_date' => now()->toDateString(),
            'enrollment_status' => 'admitted',
            'is_boarder' => false,
        ]);

        $response = $this->jsonAs(
            $user,
            'DELETE',
            '/api/classes/academic-years/'.$fixture['classAcademicYear']->id
        );

        $response->assertStatus(409)
            ->assertJsonPath('blockers.0.key', 'student_admissions');

        $this->assertDatabaseHas('class_academic_years', [
            'id' => $fixture['classAcademicYear']->id,
            'deleted_at' => null,
        ]);
    }

    /** @test */
    public function it_blocks_delete_when_exam_classes_exist(): void
    {
        $fixture = $this->createClassAcademicYearFixture();
        $user = $this->createUserWithClassDeletePermission($fixture['organization'], $fixture['school']);

        $exam = Exam::factory()->create([
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
            'academic_year_id' => $fixture['academicYear']->id,
        ]);

        ExamClass::create([
            'exam_id' => $exam->id,
            'class_academic_year_id' => $fixture['classAcademicYear']->id,
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
        ]);

        $response = $this->jsonAs(
            $user,
            'DELETE',
            '/api/classes/academic-years/'.$fixture['classAcademicYear']->id
        );

        $response->assertStatus(409)
            ->assertJsonPath('blockers.0.key', 'exam_classes');
    }

    /** @test */
    public function deletion_check_returns_blockers_for_related_records(): void
    {
        $fixture = $this->createClassAcademicYearFixture();
        $user = $this->createUserWithClassDeletePermission($fixture['organization'], $fixture['school']);

        $student = Student::factory()->create([
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
        ]);

        StudentAdmission::create([
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
            'student_id' => $student->id,
            'academic_year_id' => $fixture['academicYear']->id,
            'class_id' => $fixture['class']->id,
            'class_academic_year_id' => $fixture['classAcademicYear']->id,
            'admission_date' => now()->toDateString(),
            'enrollment_status' => 'active',
            'is_boarder' => false,
        ]);

        $response = $this->jsonAs(
            $user,
            'GET',
            '/api/classes/academic-years/'.$fixture['classAcademicYear']->id.'/deletion-check'
        );

        $response->assertStatus(200)
            ->assertJsonPath('can_delete', false)
            ->assertJsonPath('active_student_count', 1)
            ->assertJsonPath('blockers.0.key', 'student_admissions');
    }

    /** @test */
    public function user_without_delete_or_assign_permission_cannot_remove_class_from_year(): void
    {
        $fixture = $this->createClassAcademicYearFixture();
        $organization = $fixture['organization'];
        $school = $fixture['school'];

        $user = $this->createUser(
            [],
            ['organization_id' => $organization->id, 'default_school_id' => $school->id],
            $organization,
            $school,
            null,
            ['withRole' => false]
        );

        $response = $this->jsonAs(
            $user,
            'DELETE',
            '/api/classes/academic-years/'.$fixture['classAcademicYear']->id
        );

        $response->assertStatus(403);
    }

    /** @test */
    public function user_cannot_delete_class_academic_year_from_another_school(): void
    {
        $fixture = $this->createClassAcademicYearFixture();
        $otherSchool = SchoolBranding::factory()->create([
            'organization_id' => $fixture['organization']->id,
        ]);

        $user = $this->createUserWithClassDeletePermission($fixture['organization'], $otherSchool);

        $response = $this->jsonAs(
            $user,
            'DELETE',
            '/api/classes/academic-years/'.$fixture['classAcademicYear']->id
        );

        $response->assertStatus(404);
    }

    /** @test */
    public function base_class_can_be_deleted_when_only_assignments_are_on_deleted_academic_years(): void
    {
        $fixture = $this->createClassAcademicYearFixture();
        $user = $this->createUserWithClassDeletePermission($fixture['organization'], $fixture['school']);

        $fixture['academicYear']->delete();

        $this->assertDatabaseHas('class_academic_years', [
            'id' => $fixture['classAcademicYear']->id,
            'deleted_at' => null,
        ]);

        $response = $this->jsonAs(
            $user,
            'DELETE',
            '/api/classes/'.$fixture['class']->id
        );

        $response->assertNoContent();

        $this->assertSoftDeleted('classes', ['id' => $fixture['class']->id]);
    }

    /** @test */
    public function cannot_delete_academic_year_while_classes_are_assigned(): void
    {
        $fixture = $this->createClassAcademicYearFixture();
        $user = $this->createUserWithAcademicYearDeletePermission($fixture['organization'], $fixture['school']);

        $response = $this->jsonAs(
            $user,
            'DELETE',
            '/api/academic-years/'.$fixture['academicYear']->id
        );

        $response->assertStatus(409)
            ->assertJsonPath('blockers.0.key', 'class_academic_years');

        $this->assertDatabaseHas('academic_years', [
            'id' => $fixture['academicYear']->id,
            'deleted_at' => null,
        ]);
        $this->assertDatabaseHas('class_academic_years', [
            'id' => $fixture['classAcademicYear']->id,
            'deleted_at' => null,
        ]);
    }

    /** @test */
    public function academic_year_can_be_deleted_after_all_classes_removed_from_year(): void
    {
        $fixture = $this->createClassAcademicYearFixture();
        $user = $this->createUserWithAcademicYearDeletePermission($fixture['organization'], $fixture['school']);

        $fixture['classAcademicYear']->delete();

        $response = $this->jsonAs(
            $user,
            'DELETE',
            '/api/academic-years/'.$fixture['academicYear']->id
        );

        $response->assertNoContent();
        $this->assertSoftDeleted('academic_years', ['id' => $fixture['academicYear']->id]);
    }

    /** @test */
    public function academic_year_deletion_check_reports_assigned_classes(): void
    {
        $fixture = $this->createClassAcademicYearFixture();
        $user = $this->createUserWithAcademicYearDeletePermission($fixture['organization'], $fixture['school']);

        $response = $this->jsonAs(
            $user,
            'GET',
            '/api/academic-years/'.$fixture['academicYear']->id.'/deletion-check'
        );

        $response->assertStatus(200)
            ->assertJsonPath('can_delete', false)
            ->assertJsonPath('assigned_class_count', 1)
            ->assertJsonPath('blockers.0.key', 'class_academic_years')
            ->assertJsonPath('class_instances.0.id', $fixture['classAcademicYear']->id);
    }

    private function createUserWithAcademicYearDeletePermission(Organization $organization, SchoolBranding $school)
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
        $permission = Permission::firstOrCreate([
            'name' => 'academic_years.delete',
            'guard_name' => 'web',
            'organization_id' => $organization->id,
        ]);

        setPermissionsTeamId($organization->id);
        $user->givePermissionTo($permission);
        setPermissionsTeamId(null);

        return $user;
    }
}
