<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\SchoolBranding;
use App\Models\Staff;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class OrganizationHrApiTest extends TestCase
{
    use RefreshDatabase;

    private function enableFeature(string $organizationId, string $featureKey): void
    {
        DB::table('organization_feature_addons')->updateOrInsert(
            ['organization_id' => $organizationId, 'feature_key' => $featureKey],
            [
                'is_enabled' => true,
                'started_at' => now(),
                'expires_at' => null,
                'price_paid' => 0,
                'currency' => 'AFN',
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );
    }

    private function grantOrgPermission(string $organizationId, string $permissionName): void
    {
        $permission = Permission::firstOrCreate([
            'name' => $permissionName,
            'guard_name' => 'web',
            'organization_id' => null,
        ], [
            'resource' => explode('.', $permissionName)[0] ?? null,
            'action' => explode('.', $permissionName)[1] ?? null,
            'description' => 'Test permission',
        ]);

        $role = Role::where('name', 'admin')->where('organization_id', $organizationId)->first();
        if (!$role) {
            $role = Role::create([
                'name' => 'admin',
                'guard_name' => 'web',
                'organization_id' => $organizationId,
            ]);
        }

        $exists = DB::table('role_has_permissions')
            ->where('permission_id', $permission->id)
            ->where('role_id', $role->id)
            ->where('organization_id', $organizationId)
            ->exists();

        if (!$exists) {
            DB::table('role_has_permissions')->insert([
                'permission_id' => $permission->id,
                'role_id' => $role->id,
                'organization_id' => $organizationId,
            ]);
        }
    }

    /** @test */
    public function org_hr_staff_list_is_scoped_to_organization(): void
    {
        $orgA = Organization::factory()->create();
        $orgB = Organization::factory()->create();
        $schoolA = SchoolBranding::factory()->create(['organization_id' => $orgA->id]);
        $schoolB = SchoolBranding::factory()->create(['organization_id' => $orgB->id]);

        $user = $this->authenticate([], ['organization_id' => $orgA->id, 'default_school_id' => $schoolA->id], $orgA, $schoolA);

        $this->enableFeature($orgA->id, 'org_hr_core');
        $this->grantOrgPermission($orgA->id, 'hr_staff.read');

        Staff::factory()->create(['organization_id' => $orgA->id, 'school_id' => $schoolA->id, 'first_name' => 'OrgA']);
        Staff::factory()->create(['organization_id' => $orgB->id, 'school_id' => $schoolB->id, 'first_name' => 'OrgB']);

        $response = $this->jsonAs($user, 'GET', '/api/org-hr/staff');

        $response->assertOk();
        $items = $response->json('data');

        $this->assertCount(1, $items);
        $this->assertSame('OrgA', $items[0]['first_name']);
    }

    /** @test */
    public function org_hr_assignment_creation_rejects_cross_organization_staff(): void
    {
        $orgA = Organization::factory()->create();
        $orgB = Organization::factory()->create();
        $schoolA = SchoolBranding::factory()->create(['organization_id' => $orgA->id]);
        $schoolB = SchoolBranding::factory()->create(['organization_id' => $orgB->id]);

        $user = $this->authenticate([], ['organization_id' => $orgA->id, 'default_school_id' => $schoolA->id], $orgA, $schoolA);

        $this->enableFeature($orgA->id, 'org_hr_core');
        $this->grantOrgPermission($orgA->id, 'hr_assignments.create');

        $otherOrgStaff = Staff::factory()->create(['organization_id' => $orgB->id, 'school_id' => $schoolB->id]);

        $response = $this->jsonAs($user, 'POST', '/api/org-hr/assignments', [
            'staff_id' => $otherOrgStaff->id,
            'school_id' => $schoolA->id,
            'allocation_percent' => 50,
            'is_primary' => true,
            'start_date' => now()->toDateString(),
            'status' => 'active',
        ]);

        $response->assertStatus(404);
    }

    /** @test */
    public function org_hr_staff_list_requires_permission(): void
    {
        $organization = Organization::factory()->create();
        $school = SchoolBranding::factory()->create(['organization_id' => $organization->id]);

        $user = $this->authenticate([], ['organization_id' => $organization->id, 'default_school_id' => $school->id], $organization, $school);

        $this->enableFeature($organization->id, 'org_hr_core');

        $response = $this->jsonAs($user, 'GET', '/api/org-hr/staff');

        $response->assertStatus(403);
    }
}
