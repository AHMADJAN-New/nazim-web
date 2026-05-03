<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Services\DefaultRolePermissionSyncService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DefaultRolePermissionSyncServiceTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function sync_preserves_custom_role_permissions_not_in_seeder_defaults(): void
    {
        $organization = Organization::factory()->create();

        $teacherRole = Role::query()
            ->where('name', 'teacher')
            ->where('organization_id', $organization->id)
            ->where('guard_name', 'web')
            ->first();

        $this->assertNotNull($teacherRole, 'Organization observer should create teacher role');

        $studentsCreate = Permission::query()
            ->where('name', 'students.create')
            ->where('organization_id', $organization->id)
            ->where('guard_name', 'web')
            ->first();

        $this->assertNotNull($studentsCreate, 'Organization observer should create students.create permission');

        $table = config('permission.table_names.role_has_permissions', 'role_has_permissions');

        DB::table($table)->insert([
            'permission_id' => $studentsCreate->id,
            'role_id' => $teacherRole->id,
            'organization_id' => $organization->id,
        ]);

        $this->assertTrue(
            DB::table($table)
                ->where('role_id', $teacherRole->id)
                ->where('permission_id', $studentsCreate->id)
                ->where('organization_id', $organization->id)
                ->exists()
        );

        app(DefaultRolePermissionSyncService::class)->syncOrganization($organization->id);

        $this->assertTrue(
            DB::table($table)
                ->where('role_id', $teacherRole->id)
                ->where('permission_id', $studentsCreate->id)
                ->where('organization_id', $organization->id)
                ->exists(),
            'Additive sync must not remove admin-assigned role permissions when loading user permissions'
        );
    }
}
