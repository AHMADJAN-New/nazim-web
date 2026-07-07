<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\ClassAcademicYear;
use App\Models\ClassModel;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\SchoolBranding;
use App\Models\Student;
use App\Models\StudentAdmission;
use App\Services\Academic\StudentAdmissionPlacementService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class StudentAdmissionPlacementTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array{
     *     organization: Organization,
     *     school: SchoolBranding,
     *     academicYear: AcademicYear,
     *     class: ClassModel,
     *     classAcademicYear: ClassAcademicYear
     * }
     */
    private function createFixture(): array
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

    private function createUserWithAdmissionsRead(Organization $organization, SchoolBranding $school)
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
            'name' => 'student_admissions.read',
            'guard_name' => 'web',
            'organization_id' => $organization->id,
        ]);

        setPermissionsTeamId($organization->id);
        $user->givePermissionTo($permission);
        setPermissionsTeamId(null);

        return $user;
    }

    private function createUserWithAdmissionsReport(Organization $organization, SchoolBranding $school)
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
            'name' => 'student_admissions.report',
            'guard_name' => 'web',
            'organization_id' => $organization->id,
        ]);

        setPermissionsTeamId($organization->id);
        $user->givePermissionTo($permission);
        setPermissionsTeamId(null);

        return $user;
    }

    private function createAdmission(array $fixture, array $overrides = []): StudentAdmission
    {
        $student = Student::factory()->create([
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
        ]);

        return StudentAdmission::create(array_merge([
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
            'student_id' => $student->id,
            'academic_year_id' => $fixture['academicYear']->id,
            'class_id' => $fixture['class']->id,
            'class_academic_year_id' => $fixture['classAcademicYear']->id,
            'admission_date' => now()->toDateString(),
            'enrollment_status' => 'active',
            'is_boarder' => false,
        ], $overrides));
    }

    /** @test */
    public function it_marks_active_admission_with_live_section_as_placed(): void
    {
        $fixture = $this->createFixture();
        $admission = $this->createAdmission($fixture);
        $admission->load('classAcademicYear');

        $service = app(StudentAdmissionPlacementService::class);
        $resolved = $service->resolve($admission);

        $this->assertTrue($resolved['has_valid_class_placement']);
        $this->assertSame(StudentAdmissionPlacementService::STATUS_PLACED, $resolved['placement_status']);
    }

    /** @test */
    public function it_marks_active_admission_with_soft_deleted_section_as_orphaned(): void
    {
        $fixture = $this->createFixture();
        $admission = $this->createAdmission($fixture);

        $fixture['classAcademicYear']->delete();

        $admission->unsetRelation('classAcademicYear');
        $service = app(StudentAdmissionPlacementService::class);
        $resolved = $service->resolve($admission);

        $this->assertFalse($resolved['has_valid_class_placement']);
        $this->assertSame(StudentAdmissionPlacementService::STATUS_ORPHANED, $resolved['placement_status']);
    }

    /** @test */
    public function it_marks_active_admission_without_section_as_unplaced(): void
    {
        $fixture = $this->createFixture();
        $admission = $this->createAdmission($fixture, [
            'class_id' => null,
            'class_academic_year_id' => null,
        ]);

        $service = app(StudentAdmissionPlacementService::class);
        $resolved = $service->resolve($admission);

        $this->assertFalse($resolved['has_valid_class_placement']);
        $this->assertSame(StudentAdmissionPlacementService::STATUS_UNPLACED, $resolved['placement_status']);
    }

    /** @test */
    public function admissions_index_exposes_placement_fields_for_orphaned_row(): void
    {
        $fixture = $this->createFixture();
        $user = $this->createUserWithAdmissionsRead($fixture['organization'], $fixture['school']);
        $this->createAdmission($fixture);
        $fixture['classAcademicYear']->delete();

        $response = $this->jsonAs($user, 'GET', '/api/student-admissions', [
            'academic_year_id' => $fixture['academicYear']->id,
        ]);

        $response->assertOk();
        $rows = $response->json();
        $this->assertNotEmpty($rows);
        $this->assertFalse($rows[0]['has_valid_class_placement']);
        $this->assertSame('orphaned', $rows[0]['placement_status']);
    }

    /** @test */
    public function class_filter_excludes_orphaned_admissions(): void
    {
        $fixture = $this->createFixture();
        $user = $this->createUserWithAdmissionsRead($fixture['organization'], $fixture['school']);

        $this->createAdmission($fixture);
        $fixture['classAcademicYear']->delete();

        $orphanedOnly = $this->jsonAs($user, 'GET', '/api/student-admissions', [
            'academic_year_id' => $fixture['academicYear']->id,
            'class_id' => $fixture['class']->id,
        ]);
        $orphanedOnly->assertOk();
        $this->assertCount(0, $orphanedOnly->json());

        $liveCay = ClassAcademicYear::create([
            'class_id' => $fixture['class']->id,
            'academic_year_id' => $fixture['academicYear']->id,
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
            'section_name' => 'B',
            'capacity' => 30,
            'current_student_count' => 0,
            'is_active' => true,
        ]);

        $this->createAdmission($fixture, ['class_academic_year_id' => $liveCay->id]);

        $placedOnly = $this->jsonAs($user, 'GET', '/api/student-admissions', [
            'academic_year_id' => $fixture['academicYear']->id,
            'class_id' => $fixture['class']->id,
        ]);
        $placedOnly->assertOk();
        $this->assertCount(1, $placedOnly->json());
    }

    /** @test */
    public function report_class_filter_excludes_orphaned_admissions(): void
    {
        $fixture = $this->createFixture();
        $user = $this->createUserWithAdmissionsReport($fixture['organization'], $fixture['school']);

        $this->createAdmission($fixture);
        $fixture['classAcademicYear']->delete();

        $orphanedOnly = $this->jsonAs($user, 'GET', '/api/student-admissions/report', [
            'academic_year_id' => $fixture['academicYear']->id,
            'class_id' => $fixture['class']->id,
        ]);
        $orphanedOnly->assertOk();
        $this->assertCount(0, $orphanedOnly->json('recent_admissions'));

        $liveCay = ClassAcademicYear::create([
            'class_id' => $fixture['class']->id,
            'academic_year_id' => $fixture['academicYear']->id,
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
            'section_name' => 'B',
            'capacity' => 30,
            'current_student_count' => 0,
            'is_active' => true,
        ]);

        $this->createAdmission($fixture, ['class_academic_year_id' => $liveCay->id]);

        $placedOnly = $this->jsonAs($user, 'GET', '/api/student-admissions/report', [
            'academic_year_id' => $fixture['academicYear']->id,
            'class_id' => $fixture['class']->id,
        ]);
        $placedOnly->assertOk();
        $this->assertCount(1, $placedOnly->json('recent_admissions'));
    }

    /** @test */
    public function class_and_section_filters_narrow_results_together(): void
    {
        $fixture = $this->createFixture();
        $user = $this->createUserWithAdmissionsRead($fixture['organization'], $fixture['school']);

        $sectionB = ClassAcademicYear::create([
            'class_id' => $fixture['class']->id,
            'academic_year_id' => $fixture['academicYear']->id,
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
            'section_name' => 'B',
            'capacity' => 30,
            'current_student_count' => 0,
            'is_active' => true,
        ]);

        $this->createAdmission($fixture, ['class_academic_year_id' => $fixture['classAcademicYear']->id]);
        $this->createAdmission($fixture, ['class_academic_year_id' => $sectionB->id]);

        $classOnly = $this->jsonAs($user, 'GET', '/api/student-admissions', [
            'academic_year_id' => $fixture['academicYear']->id,
            'class_id' => $fixture['class']->id,
        ]);
        $classOnly->assertOk();
        $this->assertCount(2, $classOnly->json());

        $sectionOnly = $this->jsonAs($user, 'GET', '/api/student-admissions', [
            'academic_year_id' => $fixture['academicYear']->id,
            'class_id' => $fixture['class']->id,
            'class_academic_year_id' => $fixture['classAcademicYear']->id,
        ]);
        $sectionOnly->assertOk();
        $this->assertCount(1, $sectionOnly->json());
        $this->assertSame(
            $fixture['classAcademicYear']->id,
            $sectionOnly->json('0.class_academic_year_id')
        );
    }

    /** @test */
    public function report_class_and_section_filters_narrow_results_together(): void
    {
        $fixture = $this->createFixture();
        $user = $this->createUserWithAdmissionsReport($fixture['organization'], $fixture['school']);

        $sectionB = ClassAcademicYear::create([
            'class_id' => $fixture['class']->id,
            'academic_year_id' => $fixture['academicYear']->id,
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
            'section_name' => 'B',
            'capacity' => 30,
            'current_student_count' => 0,
            'is_active' => true,
        ]);

        $this->createAdmission($fixture, ['class_academic_year_id' => $fixture['classAcademicYear']->id]);
        $this->createAdmission($fixture, ['class_academic_year_id' => $sectionB->id]);

        $classOnly = $this->jsonAs($user, 'GET', '/api/student-admissions/report', [
            'academic_year_id' => $fixture['academicYear']->id,
            'class_id' => $fixture['class']->id,
        ]);
        $classOnly->assertOk();
        $this->assertCount(2, $classOnly->json('recent_admissions'));

        $sectionOnly = $this->jsonAs($user, 'GET', '/api/student-admissions/report', [
            'academic_year_id' => $fixture['academicYear']->id,
            'class_id' => $fixture['class']->id,
            'class_academic_year_id' => $fixture['classAcademicYear']->id,
        ]);
        $sectionOnly->assertOk();
        $this->assertCount(1, $sectionOnly->json('recent_admissions'));
        $this->assertSame(
            $fixture['classAcademicYear']->id,
            $sectionOnly->json('recent_admissions.0.class_academic_year_id')
        );
    }

    /** @test */
    public function stats_include_placement_breakdown(): void
    {
        $fixture = $this->createFixture();
        $user = $this->createUserWithAdmissionsRead($fixture['organization'], $fixture['school']);

        $this->createAdmission($fixture);
        $fixture['classAcademicYear']->delete();
        $this->createAdmission($fixture, [
            'class_id' => null,
            'class_academic_year_id' => null,
        ]);

        $response = $this->jsonAs($user, 'GET', '/api/student-admissions/stats', [
            'academic_year_id' => $fixture['academicYear']->id,
        ]);

        $response->assertOk();
        $response->assertJsonPath('orphaned_placement', 1);
        $response->assertJsonPath('needs_class', 2);
        $response->assertJsonPath('placed_in_class', 0);
    }

    /** @test */
    public function creating_admission_resolves_academic_year_id_from_admission_year_text(): void
    {
        $fixture = $this->createFixture();
        $user = $this->createUserWithAdmissionsRead($fixture['organization'], $fixture['school']);

        $fixture['academicYear']->update(['name' => '1405']);

        $student = Student::factory()->create([
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
        ]);

        $response = $this->jsonAs($user, 'POST', '/api/student-admissions', [
            'student_id' => $student->id,
            'admission_year' => '1405',
            'admission_date' => now()->toDateString(),
            'enrollment_status' => 'admitted',
            'is_boarder' => false,
        ]);

        $response->assertCreated();
        $this->assertSame($fixture['academicYear']->id, $response->json('academic_year_id'));
        $this->assertSame('1405', $response->json('admission_year'));
    }
}
