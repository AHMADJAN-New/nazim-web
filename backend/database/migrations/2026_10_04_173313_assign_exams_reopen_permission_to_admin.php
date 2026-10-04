<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    private const PERMISSION_NAME = 'exams.reopen';

    private const ROLE_NAME = 'admin';

    public function up(): void
    {
        $permissionsTable = config('permission.table_names.permissions', 'permissions');
        $rolesTable = config('permission.table_names.roles', 'roles');
        $rolePermissionsTable = config(
            'permission.table_names.role_has_permissions',
            'role_has_permissions'
        );

        $organizations = DB::table('organizations')
            ->whereNull('deleted_at')
            ->pluck('id');

        foreach ($organizations as $organizationId) {
            $organizationId = (string) $organizationId;

            $permission = DB::table($permissionsTable)
                ->where('name', self::PERMISSION_NAME)
                ->where('guard_name', 'web')
                ->where('organization_id', $organizationId)
                ->first();

            if (! $permission) {
                continue;
            }

            $role = DB::table($rolesTable)
                ->where('organization_id', $organizationId)
                ->where('guard_name', 'web')
                ->where('name', self::ROLE_NAME)
                ->first();

            if (! $role) {
                continue;
            }

            DB::table($rolePermissionsTable)->updateOrInsert([
                'permission_id' => $permission->id,
                'role_id' => $role->id,
                'organization_id' => $organizationId,
            ]);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        // Additive permission migrations intentionally preserve granted access on rollback.
    }
};
