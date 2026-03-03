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
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class StudentAdmissionCapacityTest extends TestCase
{
    use RefreshDatabase;

    private function createUserWithAdmissionsReadPermission(Organization $organization, SchoolBranding $school)
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

    /** @test */
    public function it_blocks_creating_an_admission_when_class_capacity_is_full(): void
    {
        $organization = Organization::factory()->create();
        $school = SchoolBranding::factory()->create(['organization_id' => $organization->id]);
        $user = $this->createUserWithAdmissionsReadPermission($organization, $school);

        $academicYear = AcademicYear::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $class = ClassModel::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'default_capacity' => 30,
        ]);

        $classAcademicYear = ClassAcademicYear::create([
            'class_id' => $class->id,
            'academic_year_id' => $academicYear->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'section_name' => 'A',
            'capacity' => 1,
            'current_student_count' => 0,
            'is_active' => true,
        ]);

        $existingStudent = Student::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        StudentAdmission::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'student_id' => $existingStudent->id,
            'academic_year_id' => $academicYear->id,
            'class_id' => $class->id,
            'class_academic_year_id' => $classAcademicYear->id,
            'admission_date' => now()->toDateString(),
            'enrollment_status' => 'admitted',
            'is_boarder' => false,
        ]);

        $newStudent = Student::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $response = $this->jsonAs($user, 'POST', '/api/student-admissions', [
            'student_id' => $newStudent->id,
            'class_academic_year_id' => $classAcademicYear->id,
            'enrollment_status' => 'active',
        ]);

        $response->assertStatus(422)
            ->assertJsonFragment([
                'class_academic_year_id' => $classAcademicYear->id,
                'current_student_count' => 1,
                'capacity' => 1,
            ]);
    }

    /** @test */
    public function it_allows_creating_an_admission_when_class_capacity_has_space(): void
    {
        $organization = Organization::factory()->create();
        $school = SchoolBranding::factory()->create(['organization_id' => $organization->id]);
        $user = $this->createUserWithAdmissionsReadPermission($organization, $school);

        $academicYear = AcademicYear::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $class = ClassModel::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'default_capacity' => 30,
        ]);

        $classAcademicYear = ClassAcademicYear::create([
            'class_id' => $class->id,
            'academic_year_id' => $academicYear->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'section_name' => 'A',
            'capacity' => 2,
            'current_student_count' => 0,
            'is_active' => true,
        ]);

        $existingStudent = Student::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        StudentAdmission::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'student_id' => $existingStudent->id,
            'academic_year_id' => $academicYear->id,
            'class_id' => $class->id,
            'class_academic_year_id' => $classAcademicYear->id,
            'admission_date' => now()->toDateString(),
            'enrollment_status' => 'active',
            'is_boarder' => false,
        ]);

        $newStudent = Student::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $response = $this->jsonAs($user, 'POST', '/api/student-admissions', [
            'student_id' => $newStudent->id,
            'class_academic_year_id' => $classAcademicYear->id,
            'enrollment_status' => 'active',
        ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('student_admissions', [
            'student_id' => $newStudent->id,
            'class_academic_year_id' => $classAcademicYear->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);
    }
}
