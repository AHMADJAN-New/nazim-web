<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\SchoolBranding;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentManagementTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function authenticated_user_can_list_students()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        Student::factory()->count(5)->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $response = $this->jsonAs($user, 'GET', '/api/students');

        $response->assertStatus(200)
            ->assertJsonStructure([
                '*' => [
                    'id',
                    'full_name',
                    'student_code',
                    'gender',
                    'student_status',
                ],
            ]);

        $this->assertCount(5, $response->json());
    }

    /** @test */
    public function user_can_create_student()
    {
        $user = $this->authenticate();

        $studentData = [
            'admission_no' => 'ADM-1001',
            'full_name' => 'Ahmad Khan',
            'father_name' => 'Mohammad Khan',
            'grandfather_name' => 'Abdul Khan',
            'mother_name' => 'Fatima',
            'gender' => 'male',
            'birth_year' => '2010',
            'birth_date' => '2010-01-15',
            'age' => 14,
            'admission_year' => '2024',
            'nationality' => 'Afghan',
            'preferred_language' => 'ps',
            'guardian_name' => 'Mohammad Khan',
            'guardian_relation' => 'father',
            'guardian_phone' => '+93700123456',
            'home_address' => 'Kabul, Afghanistan',
            'applying_grade' => '8',
            'student_status' => 'active',
            'admission_fee_status' => 'paid',
        ];

        $response = $this->jsonAs($user, 'POST', '/api/students', $studentData);

        $response->assertStatus(201)
            ->assertJsonFragment([
                'full_name' => 'Ahmad Khan',
                'gender' => 'male',
            ]);

        $this->assertDatabaseHas('students', [
            'full_name' => 'Ahmad Khan',
            'father_name' => 'Mohammad Khan',
        ]);
    }

    /** @test */
    public function creating_student_requires_mandatory_fields()
    {
        $user = $this->authenticate();

        $response = $this->jsonAs($user, 'POST', '/api/students', []);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors([
            'admission_no',
            'full_name',
            'father_name',
            'gender',
        ]);
    }

    /** @test */
    public function user_can_view_student_details()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        $student = Student::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'full_name' => 'Test Student',
        ]);

        $response = $this->jsonAs($user, 'GET', "/api/students/{$student->id}");

        $response->assertStatus(200)
            ->assertJsonFragment([
                'id' => $student->id,
                'full_name' => 'Test Student',
            ]);
    }

    /** @test */
    public function user_can_update_student()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        $student = Student::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'full_name' => 'Original Name',
        ]);

        $response = $this->jsonAs($user, 'PUT', "/api/students/{$student->id}", [
            'full_name' => 'Updated Name',
            'father_name' => $student->father_name,
            'gender' => $student->gender,
            'birth_year' => (string) $student->birth_year,
            'admission_year' => (string) $student->admission_year,
            'nationality' => $student->nationality,
            'guardian_name' => $student->guardian_name,
            'guardian_phone' => $student->guardian_phone,
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('students', [
            'id' => $student->id,
            'full_name' => 'Updated Name',
        ]);
    }

    /** @test */
    public function user_can_delete_student()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        $student = Student::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $response = $this->jsonAs($user, 'DELETE', "/api/students/{$student->id}");

        $response->assertStatus(204);

        // Soft delete - should still exist but with deleted_at
        $this->assertSoftDeleted('students', [
            'id' => $student->id,
        ]);
    }

    /** @test */
    public function student_code_is_auto_generated()
    {
        $user = $this->authenticate();

        $studentData = [
            'admission_no' => 'ADM-2001',
            'full_name' => 'Test Student',
            'father_name' => 'Test Father',
            'gender' => 'male',
            'birth_year' => '2010',
            'admission_year' => '2024',
            'nationality' => 'Afghan',
            'guardian_name' => 'Test Guardian',
            'guardian_phone' => '+93700000000',
        ];

        $response = $this->jsonAs($user, 'POST', '/api/students', $studentData);

        $response->assertStatus(201);

        $student = Student::latest()->first();
        $this->assertNotNull($student->student_code);
    }

    /** @test */
    public function user_can_filter_students_by_status()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        Student::factory()->count(3)->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'student_status' => 'active',
        ]);

        Student::factory()->count(2)->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'student_status' => 'withdrawn',
        ]);

        $response = $this->jsonAs($user, 'GET', '/api/students', [
            'student_status' => 'active',
        ]);

        $response->assertStatus(200);
        $students = $response->json();

        $this->assertCount(3, $students);
        foreach ($students as $student) {
            $this->assertEquals('active', $student['student_status']);
        }
    }

    /** @test */
    public function user_can_filter_students_by_gender()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        Student::factory()->count(3)->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'gender' => 'male',
        ]);

        Student::factory()->count(2)->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'gender' => 'female',
        ]);

        $response = $this->jsonAs($user, 'GET', '/api/students', [
            'gender' => 'male',
        ]);

        $response->assertStatus(200);
        $students = $response->json();

        $this->assertCount(3, $students);
        foreach ($students as $student) {
            $this->assertEquals('male', $student['gender']);
        }
    }

    /** @test */
    public function user_can_search_students_by_name()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        Student::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'full_name' => 'Ahmad Mohammad',
        ]);

        Student::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'full_name' => 'Ali Hassan',
        ]);

        $response = $this->jsonAs($user, 'GET', '/api/students', [
            'search' => 'Ahmad',
        ]);

        $response->assertStatus(200);
        $students = $response->json();

        $this->assertGreaterThanOrEqual(1, count($students));
        $this->assertStringContainsStringIgnoringCase('Ahmad', $students[0]['full_name']);
    }

    /** @test */
    public function orphan_students_can_be_identified()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        $orphan = Student::factory()->orphan()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $nonOrphan = Student::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'is_orphan' => false,
        ]);

        $response = $this->jsonAs($user, 'GET', "/api/students/{$orphan->id}");

        $response->assertStatus(200)
            ->assertJsonFragment(['is_orphan' => true]);
    }

    /** @test */
    public function user_cannot_access_student_from_different_organization()
    {
        $org1 = Organization::factory()->create();
        $org2 = Organization::factory()->create();

        $school1 = SchoolBranding::factory()->create(['organization_id' => $org1->id]);

        $user1 = $this->authenticate([], ['organization_id' => $org1->id], $org1, $school1);

        $studentOrg2 = Student::factory()->create([
            'organization_id' => $org2->id,
            'school_id' => SchoolBranding::factory()->create(['organization_id' => $org2->id])->id,
        ]);

        $response = $this->jsonAs($user1, 'GET', "/api/students/{$studentOrg2->id}");

        $this->assertContains($response->status(), [403, 404]);
    }

    /** @test */
    public function user_cannot_access_student_from_different_school_without_permission()
    {
        $organization = Organization::factory()->create();
        $school1 = SchoolBranding::factory()->create(['organization_id' => $organization->id]);
        $school2 = SchoolBranding::factory()->create(['organization_id' => $organization->id]);

        // User with access only to school1
        $user = $this->authenticate(
            [],
            ['organization_id' => $organization->id, 'default_school_id' => $school1->id],
            $organization,
            $school1,
            false
        );

        // Student belongs to school2
        $studentSchool2 = Student::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school2->id,
        ]);

        $response = $this->jsonAs($user, 'GET', "/api/students/{$studentSchool2->id}", [
            'school_id' => $school2->id,
        ]);

        $response->assertStatus(403);
    }

    /** @test */
    public function user_with_access_all_permission_can_view_students_from_all_schools()
    {
        $organization = Organization::factory()->create();
        $school1 = SchoolBranding::factory()->create(['organization_id' => $organization->id]);
        $school2 = SchoolBranding::factory()->create(['organization_id' => $organization->id]);

        // User with schools.access_all permission
        $user = $this->authenticate(
            [],
            ['organization_id' => $organization->id],
            $organization,
            $school1,
            true
        );

        // Students in different schools
        $studentSchool1 = Student::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school1->id,
        ]);

        $studentSchool2 = Student::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school2->id,
        ]);

        $response = $this->jsonAs($user, 'GET', '/api/students', [
            'school_id' => $school2->id,
        ]);

        $response->assertStatus(200);
        $students = $response->json();

        $this->assertCount(1, $students);
    }
}
