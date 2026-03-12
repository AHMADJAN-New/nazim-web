<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $permissionsTable = config('permission.table_names.permissions', 'permissions');
        $roleHasPermissionsTable = config('permission.table_names.role_has_permissions', 'role_has_permissions');

        $existing = DB::table($permissionsTable)
            ->where('name', 'hr_assignments.delete')
            ->whereNull('organization_id')
            ->where('guard_name', 'web')
            ->first();

        if ($existing) {
            return;
        }

        $permissionId = DB::table($permissionsTable)->insertGetId([
            'name' => 'hr_assignments.delete',
            'guard_name' => 'web',
            'organization_id' => null,
            'resource' => 'hr_assignments',
            'action' => 'delete',
            'description' => 'Organization HR permission: hr_assignments.delete',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $updatePermissionId = DB::table($permissionsTable)
            ->where('name', 'hr_assignments.update')
            ->whereNull('organization_id')
            ->where('guard_name', 'web')
            ->value('id');

        if (!$updatePermissionId) {
            return;
        }

        $pairs = DB::table($roleHasPermissionsTable)
            ->where('permission_id', $updatePermissionId)
            ->select('role_id', 'organization_id')
            ->distinct()
            ->get();

        foreach ($pairs as $row) {
            $exists = DB::table($roleHasPermissionsTable)
                ->where('role_id', $row->role_id)
                ->where('permission_id', $permissionId)
                ->where('organization_id', $row->organization_id)
                ->exists();

            if (!$exists) {
                DB::table($roleHasPermissionsTable)->insert([
                    'permission_id' => $permissionId,
                    'role_id' => $row->role_id,
                    'organization_id' => $row->organization_id,
                ]);
            }
        }
    }

    public function down(): void
    {
        // no-op
    }
};
