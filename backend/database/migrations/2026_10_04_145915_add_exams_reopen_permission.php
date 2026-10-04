<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    private const PERMISSION_NAME = 'exams.reopen';

    private const ROLE_NAME = 'organization_admin';

    public function up(): void
    {
        $permissionsTable = config('permission.table_names.permissions', 'permissions');
        $rolesTable = config('permission.table_names.roles', 'roles');
        $rolePermissionsTable = config(
            'permission.table_names.role_has_permissions',
            'role_has_permissions'
        );

        $this->ensurePermission($permissionsTable, null);

        $organizations = DB::table('organizations')
            ->whereNull('deleted_at')
            ->pluck('id');

        foreach ($organizations as $organizationId) {
            $organizationId = (string) $organizationId;
            $permissionId = $this->ensurePermission($permissionsTable, $organizationId);

            $role = DB::table($rolesTable)
                ->where('organization_id', $organizationId)
                ->where('guard_name', 'web')
                ->where('name', self::ROLE_NAME)
                ->first();

            if (! $role) {
                continue;
            }

            DB::table($rolePermissionsTable)->updateOrInsert([
                'permission_id' => $permissionId,
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

    private function ensurePermission(string $permissionsTable, ?string $organizationId): int
    {
        $query = DB::table($permissionsTable)
            ->where('name', self::PERMISSION_NAME)
            ->where('guard_name', 'web');

        if ($organizationId === null) {
            $query->whereNull('organization_id');
        } else {
            $query->where('organization_id', $organizationId);
        }

        $existing = $query->first();

        if ($existing) {
            return (int) $existing->id;
        }

        return (int) DB::table($permissionsTable)->insertGetId([
            'name' => self::PERMISSION_NAME,
            'guard_name' => 'web',
            'organization_id' => $organizationId,
            'resource' => 'exams',
            'action' => 'reopen',
            'description' => 'Reopen completed exams to in progress for marks entry',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
};
