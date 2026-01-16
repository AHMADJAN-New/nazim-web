<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\SchoolBranding;
use App\Models\Student;
use App\Models\Staff;
use App\Models\Exam;
use App\Models\FinanceAccount;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrganizationMultiTenancyTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function users_can_only_see_data_from_their_organization()
    {
        $org1 = Organization::factory()->create(['name' => 'Organization 1']);
        $org2 = Organization::factory()->create(['name' => 'Organization 2']);

        $school1 = SchoolBranding::factory()->create(['organization_id' => $org1->id]);
        $school2 = SchoolBranding::factory()->create(['organization_id' => $org2->id]);

        $user1 = $this->authenticate([], ['organization_id' => $org1->id], $org1, $school1);
        $user2 = $this->authenticate([], ['organization_id' => $org2->id], $org2, $school2);

        // Create students for each organization
        Student::factory()->create([
            'organization_id' => $org1->id,
            'school_id' => $school1->id,
            'full_name' => 'Student from Org 1',
        ]);
        Student::factory()->create([
            'organization_id' => $org2->id,
            'school_id' => $school2->id,
            'full_name' => 'Student from Org 2',
        ]);

        // User 1 should only see their organization's students
        $response = $this->jsonAs($user1, 'GET', '/api/students');
        $response->assertStatus(200);
        $students = $response->json();

        $this->assertCount(1, $students);
        $this->assertEquals('Student from Org 1', $students[0]['full_name']);
    }

    /** @test */
    public function users_cannot_access_resources_from_other_organizations()
    {
        $org1 = Organization::factory()->create();
        $org2 = Organization::factory()->create();

        $school1 = SchoolBranding::factory()->create(['organization_id' => $org1->id]);

        $user1 = $this->authenticate([], ['organization_id' => $org1->id], $org1, $school1);

        // Create student in org2
        $student = Student::factory()->create([
            'organization_id' => $org2->id,
            'school_id' => SchoolBranding::factory()->create(['organization_id' => $org2->id])->id,
        ]);

        // User 1 tries to access student from org2
        $response = $this->jsonAs($user1, 'GET', "/api/students/{$student->id}");

        // Should either return 404 or 403
        $this->assertContains($response->status(), [403, 404]);
    }

    /** @test */
    public function users_cannot_create_resources_in_other_organizations()
    {
        $org1 = Organization::factory()->create();
        $org2 = Organization::factory()->create();

        $school1 = SchoolBranding::factory()->create(['organization_id' => $org1->id]);

        $user1 = $this->authenticate([], ['organization_id' => $org1->id], $org1, $school1);

        $response = $this->jsonAs($user1, 'POST', '/api/students', [
            'organization_id' => $org2->id, // Trying to create in another org
            'admission_no' => 'ADM-9001',
            'full_name' => 'Test Student',
            'father_name' => 'Test Father',
            'gender' => 'male',
            'birth_year' => '2010',
            'admission_year' => '2024',
            'nationality' => 'Afghan',
            'guardian_name' => 'Test Guardian',
            'guardian_phone' => '+93700000000',
        ]);

        $this->assertContains($response->status(), [201, 403, 422]);

        if ($response->status() === 201) {
            // If creation succeeded, verify it was created in user's org, not requested org
            $student = Student::latest()->first();
            $this->assertEquals($org1->id, $student->organization_id);
        } else {
            $this->assertDatabaseMissing('students', [
                'organization_id' => $org2->id,
                'admission_no' => 'ADM-9001',
            ]);
        }
    }

    /** @test */
    public function staff_data_is_isolated_by_organization()
    {
        $org1 = Organization::factory()->create();
        $org2 = Organization::factory()->create();

        $school1 = SchoolBranding::factory()->create(['organization_id' => $org1->id]);
        $school2 = SchoolBranding::factory()->create(['organization_id' => $org2->id]);

        $user1 = $this->authenticate([], ['organization_id' => $org1->id], $org1, $school1);

        Staff::factory()->count(3)->create([
            'organization_id' => $org1->id,
            'school_id' => $school1->id,
        ]);
        Staff::factory()->count(2)->create([
            'organization_id' => $org2->id,
            'school_id' => $school2->id,
        ]);

        $response = $this->jsonAs($user1, 'GET', '/api/staff');
        $response->assertStatus(200);

        $staff = $response->json();
        $this->assertCount(3, $staff);

        // Verify all staff belong to org1
        foreach ($staff as $member) {
            $this->assertEquals($org1->id, $member['organization_id']);
        }
    }

    /** @test */
    public function exam_data_is_isolated_by_organization()
    {
        $org1 = Organization::factory()->create();
        $org2 = Organization::factory()->create();

        $school1 = SchoolBranding::factory()->create(['organization_id' => $org1->id]);

        $user1 = $this->authenticate([], ['organization_id' => $org1->id], $org1, $school1);

        Exam::factory()->count(2)->create([
            'organization_id' => $org1->id,
            'school_id' => $school1->id,
        ]);
        Exam::factory()->count(3)->create([
            'organization_id' => $org2->id,
            'school_id' => SchoolBranding::factory()->create(['organization_id' => $org2->id])->id,
        ]);

        $response = $this->jsonAs($user1, 'GET', '/api/exams');
        $response->assertStatus(200);

        $exams = $response->json();
        $this->assertCount(2, $exams);

        foreach ($exams as $exam) {
            $this->assertEquals($org1->id, $exam['organization_id']);
        }
    }

    /** @test */
    public function finance_accounts_are_isolated_by_organization()
    {
        $org1 = Organization::factory()->create();
        $org2 = Organization::factory()->create();

        $school1 = SchoolBranding::factory()->create(['organization_id' => $org1->id]);

        $user1 = $this->authenticate([], ['organization_id' => $org1->id], $org1, $school1);

        FinanceAccount::factory()->count(2)->create([
            'organization_id' => $org1->id,
            'school_id' => $school1->id,
        ]);
        FinanceAccount::factory()->count(3)->create([
            'organization_id' => $org2->id,
            'school_id' => SchoolBranding::factory()->create(['organization_id' => $org2->id])->id,
        ]);

        $response = $this->jsonAs($user1, 'GET', '/api/finance-accounts');
        $response->assertStatus(200);

        $accounts = $response->json();
        $this->assertCount(2, $accounts);

        foreach ($accounts as $account) {
            $this->assertEquals($org1->id, $account['organization_id']);
        }
    }

    /** @test */
    public function organization_scoped_queries_work_correctly()
    {
        $org1 = Organization::factory()->create();
        $org2 = Organization::factory()->create();

        $school1 = SchoolBranding::factory()->create(['organization_id' => $org1->id]);
        $school2 = SchoolBranding::factory()->create(['organization_id' => $org2->id]);

        // Create students with specific names
        Student::factory()->create([
            'organization_id' => $org1->id,
            'school_id' => $school1->id,
            'full_name' => 'Ahmad',
        ]);

        Student::factory()->create([
            'organization_id' => $org2->id,
            'school_id' => $school2->id,
            'full_name' => 'Ahmad', // Same name, different org
        ]);

        $user1 = $this->authenticate([], ['organization_id' => $org1->id], $org1, $school1);

        // Search for "Ahmad" - should only return from org1
        $response = $this->jsonAs($user1, 'GET', '/api/students', [
            'search' => 'Ahmad',
        ]);

        $response->assertStatus(200);
        $students = $response->json();

        $this->assertCount(1, $students);
        $this->assertEquals($org1->id, $students[0]['organization_id']);
    }
}
