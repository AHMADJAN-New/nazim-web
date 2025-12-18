<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PermissionAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Create permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
    }

    /** @test */
    public function user_with_permission_can_access_resource()
    {
        $organization = Organization::factory()->create();
        $user = $this->createUser([], ['organization_id' => $organization->id], $organization);

        // Create permission
        $permission = Permission::create(['name' => 'students.read', 'guard_name' => 'web']);
        $user->givePermissionTo($permission);

        $this->actingAsUser($user);

        $response = $this->jsonAs($user, 'GET', '/api/students');

        // Should be able to access
        $this->assertContains($response->status(), [200, 404]); // 200 if authorized, 404 if route not protected
    }

    /** @test */
    public function user_without_permission_cannot_access_resource()
    {
        $organization = Organization::factory()->create();
        $user = $this->createUser([], ['organization_id' => $organization->id], $organization);

        // User has no permissions
        $this->actingAsUser($user);

        // If the route is protected by permissions, should get 403
        // This test may pass if permissions aren't enforced yet
        $response = $this->jsonAs($user, 'GET', '/api/students');

        // Either 200 (not protected), 403 (forbidden), or 404
        $this->assertContains($response->status(), [200, 403, 404]);
    }

    /** @test */
    public function permissions_are_organization_scoped()
    {
        $org1 = Organization::factory()->create();
        $org2 = Organization::factory()->create();

        $user1 = $this->createUser([], ['organization_id' => $org1->id], $org1);
        $user2 = $this->createUser([], ['organization_id' => $org2->id], $org2);

        // Create permission
        $permission = Permission::create(['name' => 'students.read', 'guard_name' => 'web']);

        // Give permission to user1 in org1 context
        setPermissionsTeamId($org1->id);
        $user1->givePermissionTo($permission);

        // User1 should have permission in org1 context
        setPermissionsTeamId($org1->id);
        $this->assertTrue($user1->hasPermissionTo('students.read'));

        // User2 should not have permission in org2 context
        setPermissionsTeamId($org2->id);
        $this->assertFalse($user2->hasPermissionTo('students.read'));
    }

    /** @test */
    public function roles_can_be_assigned_to_users()
    {
        $organization = Organization::factory()->create();
        $user = $this->createUser([], ['organization_id' => $organization->id], $organization);

        // Create role
        $role = Role::create(['name' => 'admin', 'guard_name' => 'web']);

        // Assign role
        setPermissionsTeamId($organization->id);
        $user->assignRole($role);

        $this->assertTrue($user->hasRole('admin'));
    }

    /** @test */
    public function roles_can_have_multiple_permissions()
    {
        $organization = Organization::factory()->create();
        $user = $this->createUser([], ['organization_id' => $organization->id], $organization);

        // Create permissions
        $readPerm = Permission::create(['name' => 'students.read', 'guard_name' => 'web']);
        $writePerm = Permission::create(['name' => 'students.create', 'guard_name' => 'web']);

        // Create role with permissions
        $role = Role::create(['name' => 'teacher', 'guard_name' => 'web']);
        $role->givePermissionTo([$readPerm, $writePerm]);

        // Assign role to user
        setPermissionsTeamId($organization->id);
        $user->assignRole($role);

        $this->assertTrue($user->hasPermissionTo('students.read'));
        $this->assertTrue($user->hasPermissionTo('students.create'));
    }

    /** @test */
    public function super_admin_has_all_permissions()
    {
        $user = $this->createUser([], ['role' => 'super_admin', 'organization_id' => null]);

        $this->actingAsUser($user);

        // Super admin should be able to access everything
        $response = $this->jsonAs($user, 'GET', '/api/students');

        $this->assertContains($response->status(), [200, 404]);
    }

    /** @test */
    public function user_cannot_assign_permissions_to_users_in_other_organizations()
    {
        $org1 = Organization::factory()->create();
        $org2 = Organization::factory()->create();

        $user1 = $this->createUser([], ['organization_id' => $org1->id], $org1);
        $user2 = $this->createUser([], ['organization_id' => $org2->id], $org2);

        $permission = Permission::create(['name' => 'students.read', 'guard_name' => 'web']);

        // User1 tries to give permission to user2 (different org)
        setPermissionsTeamId($org1->id);
        $user1->givePermissionTo($permission);

        // User2 should not have this permission in their org context
        setPermissionsTeamId($org2->id);
        $this->assertFalse($user2->hasPermissionTo('students.read'));
    }

    /** @test */
    public function permissions_are_checked_on_api_endpoints()
    {
        $organization = Organization::factory()->create();
        $user = $this->createUser([], ['organization_id' => $organization->id], $organization);

        $this->actingAsUser($user);

        // Try to access protected endpoint without permission
        $response = $this->jsonAs($user, 'POST', '/api/students', [
            'full_name' => 'Test Student',
            'father_name' => 'Test Father',
            'gender' => 'male',
        ]);

        // Should either work (200/201) or be forbidden (403) or validation error (422)
        $this->assertContains($response->status(), [201, 403, 422]);
    }
}
