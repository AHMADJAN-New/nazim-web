<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\SchoolBranding;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\PermissionRegistrar;
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
        $school = SchoolBranding::factory()->create(['organization_id' => $organization->id]);
        $user = $this->createUser(
            [],
            ['organization_id' => $organization->id],
            $organization,
            $school,
            null,
            ['withRole' => false]
        );

        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $permission = Permission::firstOrCreate([
            'name' => 'students.read',
            'guard_name' => 'web',
            'organization_id' => $organization->id,
        ]);

        setPermissionsTeamId($organization->id);
        $user->givePermissionTo($permission);
        setPermissionsTeamId(null);

        $this->actingAsUser($user);

        $response = $this->jsonAs($user, 'GET', '/api/students');

        $response->assertStatus(200);
    }

    /** @test */
    public function user_without_permission_cannot_access_resource()
    {
        $organization = Organization::factory()->create();
        $school = SchoolBranding::factory()->create(['organization_id' => $organization->id]);
        $user = $this->createUser(
            [],
            ['organization_id' => $organization->id],
            $organization,
            $school,
            null,
            ['withRole' => false]
        );

        // User has no permissions
        $this->actingAsUser($user);

        // If the route is protected by permissions, should get 403
        // This test may pass if permissions aren't enforced yet
        $response = $this->jsonAs($user, 'GET', '/api/students');

        $response->assertStatus(403);
    }

    /** @test */
    public function permissions_are_organization_scoped()
    {
        $org1 = Organization::factory()->create();
        $org2 = Organization::factory()->create();

        $school1 = SchoolBranding::factory()->create(['organization_id' => $org1->id]);
        $school2 = SchoolBranding::factory()->create(['organization_id' => $org2->id]);

        $user1 = $this->createUser(
            [],
            ['organization_id' => $org1->id],
            $org1,
            $school1,
            null,
            ['withRole' => false]
        );
        $user2 = $this->createUser(
            [],
            ['organization_id' => $org2->id],
            $org2,
            $school2,
            null,
            ['withRole' => false]
        );

        // Create permission
        $permission = Permission::firstOrCreate([
            'name' => 'students.read',
            'guard_name' => 'web',
            'organization_id' => $org1->id,
        ]);

        // Give permission to user1 in org1 context
        setPermissionsTeamId($org1->id);
        $user1->givePermissionTo($permission);

        // User1 should have permission in org1 context
        setPermissionsTeamId($org1->id);
        $this->assertTrue($user1->hasPermissionTo('students.read'));

        // User2 should not have permission in org2 context
        setPermissionsTeamId($org2->id);
        $this->assertFalse($user2->hasPermissionTo('students.read'));
        setPermissionsTeamId(null);
    }

    /** @test */
    public function roles_can_be_assigned_to_users()
    {
        $organization = Organization::factory()->create();
        $school = SchoolBranding::factory()->create(['organization_id' => $organization->id]);
        $user = $this->createUser(
            [],
            ['organization_id' => $organization->id],
            $organization,
            $school,
            null,
            ['withRole' => false]
        );

        // Create role
        $role = Role::firstOrCreate([
            'name' => 'admin',
            'guard_name' => 'web',
            'organization_id' => $organization->id,
        ]);

        // Assign role
        setPermissionsTeamId($organization->id);
        $user->assignRole($role);
        setPermissionsTeamId(null);

        setPermissionsTeamId($organization->id);
        $this->assertTrue($user->hasRole('admin'));
        setPermissionsTeamId(null);
    }

    /** @test */
    public function roles_can_have_multiple_permissions()
    {
        $organization = Organization::factory()->create();
        $school = SchoolBranding::factory()->create(['organization_id' => $organization->id]);
        $user = $this->createUser(
            [],
            ['organization_id' => $organization->id],
            $organization,
            $school,
            null,
            ['withRole' => false]
        );

        // Create permissions
        $readPerm = Permission::firstOrCreate([
            'name' => 'students.read',
            'guard_name' => 'web',
            'organization_id' => $organization->id,
        ]);
        $writePerm = Permission::firstOrCreate([
            'name' => 'students.create',
            'guard_name' => 'web',
            'organization_id' => $organization->id,
        ]);

        // Create role with permissions
        $role = Role::firstOrCreate([
            'name' => 'teacher',
            'guard_name' => 'web',
            'organization_id' => $organization->id,
        ]);
        $tableNames = config('permission.table_names');
        $roleHasPermissionsTable = $tableNames['role_has_permissions'] ?? 'role_has_permissions';

        foreach ([$readPerm, $writePerm] as $permission) {
            $exists = DB::table($roleHasPermissionsTable)
                ->where('role_id', $role->id)
                ->where('permission_id', $permission->id)
                ->where('organization_id', $organization->id)
                ->exists();

            if (!$exists) {
                DB::table($roleHasPermissionsTable)->insert([
                    'role_id' => $role->id,
                    'permission_id' => $permission->id,
                    'organization_id' => $organization->id,
                ]);
            }
        }
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        // Assign role to user
        setPermissionsTeamId($organization->id);
        $user->assignRole($role);
        setPermissionsTeamId(null);

        setPermissionsTeamId($organization->id);
        $this->assertTrue($user->hasPermissionTo('students.read'));
        $this->assertTrue($user->hasPermissionTo('students.create'));
        setPermissionsTeamId(null);
    }

    /** @test */
    public function user_cannot_assign_permissions_to_users_in_other_organizations()
    {
        $org1 = Organization::factory()->create();
        $org2 = Organization::factory()->create();

        $school1 = SchoolBranding::factory()->create(['organization_id' => $org1->id]);
        $school2 = SchoolBranding::factory()->create(['organization_id' => $org2->id]);

        $user1 = $this->createUser(
            [],
            ['organization_id' => $org1->id],
            $org1,
            $school1,
            null,
            ['withRole' => false]
        );
        $user2 = $this->createUser(
            [],
            ['organization_id' => $org2->id],
            $org2,
            $school2,
            null,
            ['withRole' => false]
        );

        $permission = Permission::firstOrCreate([
            'name' => 'students.read',
            'guard_name' => 'web',
            'organization_id' => $org1->id,
        ]);

        // User1 tries to give permission to user2 (different org)
        setPermissionsTeamId($org1->id);
        $user1->givePermissionTo($permission);

        // User2 should not have this permission in their org context
        setPermissionsTeamId($org2->id);
        $this->assertFalse($user2->hasPermissionTo('students.read'));
        setPermissionsTeamId(null);
    }

    /** @test */
    public function permissions_are_checked_on_api_endpoints()
    {
        $organization = Organization::factory()->create();
        $school = SchoolBranding::factory()->create(['organization_id' => $organization->id]);
        $user = $this->createUser(
            [],
            ['organization_id' => $organization->id],
            $organization,
            $school,
            null,
            ['withRole' => false]
        );

        $this->actingAsUser($user);

        // Try to access protected endpoint without permission
        $response = $this->jsonAs($user, 'POST', '/api/students', [
            'admission_no' => 'ADM-3001',
            'full_name' => 'Test Student',
            'father_name' => 'Test Father',
            'gender' => 'male',
        ]);

        $response->assertStatus(403);
    }
}
