<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\SchoolBranding;
use App\Models\Staff;
use App\Models\StaffType;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StaffManagementTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function user_can_list_staff()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        Staff::factory()->count(5)->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $response = $this->jsonAs($user, 'GET', '/api/staff');

        $response->assertStatus(200)
            ->assertJsonStructure([
                '*' => ['id', 'first_name', 'father_name', 'staff_code', 'status'],
            ]);

        $this->assertCount(5, $response->json());
    }

    /** @test */
    public function user_can_create_staff()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        $staffType = StaffType::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $staffData = [
            'employee_id' => 'EMP-1001',
            'first_name' => 'Mohammad',
            'father_name' => 'Ali Ahmad',
            'grandfather_name' => 'Hassan',
            'email' => 'mohammad@example.com',
            'phone_number' => '+93700123456',
            'birth_date' => '1990-01-15',
            'tazkira_number' => '1234567890',
            'staff_type_id' => $staffType->id,
            'status' => 'active',
            'salary' => '25000',
            'home_address' => 'Kabul, Afghanistan',
        ];

        $response = $this->jsonAs($user, 'POST', '/api/staff', $staffData);

        $response->assertStatus(201)
            ->assertJsonFragment(['first_name' => 'Mohammad']);

        $this->assertDatabaseHas('staff', [
            'first_name' => 'Mohammad',
            'email' => 'mohammad@example.com',
        ]);
    }

    /** @test */
    public function user_can_update_staff()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        $staff = Staff::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'first_name' => 'Original',
        ]);

        $response = $this->jsonAs($user, 'PUT', "/api/staff/{$staff->id}", [
            'first_name' => 'Updated',
            'father_name' => $staff->father_name,
            'email' => $staff->email,
            'phone_number' => '+93700999888',
            'birth_date' => $staff->birth_date,
            'status' => $staff->status,
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('staff', [
            'id' => $staff->id,
            'first_name' => 'Updated',
            'phone_number' => '+93700999888',
        ]);
    }

    /** @test */
    public function user_can_delete_staff()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        $staff = Staff::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $response = $this->jsonAs($user, 'DELETE', "/api/staff/{$staff->id}");

        $response->assertStatus(204);

        $this->assertSoftDeleted('staff', ['id' => $staff->id]);
    }

    /** @test */
    public function user_can_filter_staff_by_employment_status()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        Staff::factory()->count(3)->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'status' => 'active',
        ]);

        Staff::factory()->count(2)->inactive()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $response = $this->jsonAs($user, 'GET', '/api/staff', [
            'status' => 'active',
        ]);

        $response->assertStatus(200);
        $staff = $response->json();

        $this->assertCount(3, $staff);
    }

    /** @test */
    public function staff_code_is_auto_generated()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        $staffType = StaffType::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $response = $this->jsonAs($user, 'POST', '/api/staff', [
            'employee_id' => 'EMP-2001',
            'first_name' => 'Test',
            'father_name' => 'Test Father',
            'email' => 'test@example.com',
            'phone_number' => '+93700000000',
            'birth_date' => '1990-01-01',
            'staff_type_id' => $staffType->id,
            'status' => 'active',
        ]);

        $response->assertStatus(201);

        $staff = Staff::latest()->first();
        $this->assertNotNull($staff->staff_code);
    }

    /** @test */
    public function user_cannot_access_staff_from_different_organization()
    {
        $org1 = Organization::factory()->create();
        $org2 = Organization::factory()->create();

        $school1 = SchoolBranding::factory()->create(['organization_id' => $org1->id]);

        $user1 = $this->authenticate([], ['organization_id' => $org1->id], $org1, $school1);

        $staffOrg2 = Staff::factory()->create([
            'organization_id' => $org2->id,
            'school_id' => SchoolBranding::factory()->create(['organization_id' => $org2->id])->id,
        ]);

        $response = $this->jsonAs($user1, 'GET', "/api/staff/{$staffOrg2->id}");

        $this->assertContains($response->status(), [403, 404]);
    }

    /** @test */
    public function user_cannot_access_staff_from_different_school_without_permission()
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

        // Staff belongs to school2
        $staffSchool2 = Staff::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school2->id,
        ]);

        $response = $this->jsonAs($user, 'GET', "/api/staff/{$staffSchool2->id}", [
            'school_id' => $school2->id,
        ]);

        $response->assertStatus(403);
    }

    /** @test */
    public function user_with_access_all_permission_can_view_staff_from_all_schools()
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

        // Staff in different schools
        $staffSchool1 = Staff::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school1->id,
        ]);

        $staffSchool2 = Staff::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school2->id,
        ]);

        $response = $this->jsonAs($user, 'GET', '/api/staff', [
            'school_id' => $school2->id,
        ]);

        $response->assertStatus(200);
        $staff = $response->json();

        $this->assertCount(1, $staff);
    }
}
