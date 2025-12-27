<?php

namespace Tests\Feature;

use App\Models\Organization;
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

        Staff::factory()->count(5)->create(['organization_id' => $organization->id]);

        $response = $this->jsonAs($user, 'GET', '/api/staff');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'full_name', 'staff_code', 'employment_status'],
                ],
            ]);

        $this->assertCount(5, $response->json('data'));
    }

    /** @test */
    public function user_can_create_staff()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);

        $staffType = StaffType::factory()->create(['organization_id' => $organization->id]);

        $staffData = [
            'full_name' => 'Mohammad Ali',
            'father_name' => 'Ali Ahmad',
            'email' => 'mohammad@example.com',
            'phone' => '+93700123456',
            'gender' => 'male',
            'birth_date' => '1990-01-15',
            'age' => 34,
            'nationality' => 'Afghan',
            'tazkira_number' => '1234567890',
            'staff_type_id' => $staffType->id,
            'hire_date' => now()->toDateString(),
            'employment_status' => 'active',
            'salary' => 25000,
            'qualification' => 'bachelors',
            'experience_years' => 5,
            'address' => 'Kabul, Afghanistan',
        ];

        $response = $this->jsonAs($user, 'POST', '/api/staff', $staffData);

        $response->assertStatus(201)
            ->assertJsonFragment(['full_name' => 'Mohammad Ali']);

        $this->assertDatabaseHas('staff', [
            'full_name' => 'Mohammad Ali',
            'email' => 'mohammad@example.com',
        ]);
    }

    /** @test */
    public function user_can_update_staff()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);

        $staff = Staff::factory()->create([
            'organization_id' => $organization->id,
            'full_name' => 'Original Name',
        ]);

        $response = $this->jsonAs($user, 'PUT', "/api/staff/{$staff->id}", [
            'full_name' => 'Updated Name',
            'father_name' => $staff->father_name,
            'email' => $staff->email,
            'phone' => '+93700999888',
            'gender' => $staff->gender,
            'birth_date' => $staff->birth_date,
            'nationality' => $staff->nationality,
            'employment_status' => $staff->employment_status,
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('staff', [
            'id' => $staff->id,
            'full_name' => 'Updated Name',
            'phone' => '+93700999888',
        ]);
    }

    /** @test */
    public function user_can_delete_staff()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);

        $staff = Staff::factory()->create(['organization_id' => $organization->id]);

        $response = $this->jsonAs($user, 'DELETE', "/api/staff/{$staff->id}");

        $response->assertStatus(200);

        $this->assertSoftDeleted('staff', ['id' => $staff->id]);
    }

    /** @test */
    public function user_can_filter_staff_by_employment_status()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);

        Staff::factory()->count(3)->create([
            'organization_id' => $organization->id,
            'employment_status' => 'active',
        ]);

        Staff::factory()->count(2)->inactive()->create([
            'organization_id' => $organization->id,
        ]);

        $response = $this->jsonAs($user, 'GET', '/api/staff', [
            'status' => 'active',
        ]);

        $response->assertStatus(200);
        $staff = $response->json('data');

        $this->assertCount(3, $staff);
    }

    /** @test */
    public function staff_code_is_auto_generated()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);

        $staffType = StaffType::factory()->create(['organization_id' => $organization->id]);

        $response = $this->jsonAs($user, 'POST', '/api/staff', [
            'full_name' => 'Test Staff',
            'father_name' => 'Test Father',
            'email' => 'test@example.com',
            'phone' => '+93700000000',
            'gender' => 'male',
            'birth_date' => '1990-01-01',
            'nationality' => 'Afghan',
            'staff_type_id' => $staffType->id,
            'hire_date' => now()->toDateString(),
            'employment_status' => 'active',
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

        $user1 = $this->authenticate([], ['organization_id' => $org1->id], $org1);

        $staffOrg2 = Staff::factory()->create(['organization_id' => $org2->id]);

        $response = $this->jsonAs($user1, 'GET', "/api/staff/{$staffOrg2->id}");

        $this->assertContains($response->status(), [403, 404]);
    }
}
