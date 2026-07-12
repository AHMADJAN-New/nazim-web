<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /**
     * @var array<string>
     */
    private const ACTIONS = ['read', 'create', 'update', 'delete', 'assign', 'print'];

    /**
     * @var array<string>
     */
    private const ROLES = ['admin', 'organization_admin', 'exam_controller'];

    public function up(): void
    {
        $permissionsTable = config('permission.table_names.permissions', 'permissions');
        $rolesTable = config('permission.table_names.roles', 'roles');
        $rolePermissionsTable = config(
            'permission.table_names.role_has_permissions',
            'role_has_permissions'
        );

        foreach (self::ACTIONS as $action) {
            $this->ensurePermission($permissionsTable, $action, null);
        }

        $organizations = DB::table('organizations')
            ->whereNull('deleted_at')
            ->pluck('id');

        foreach ($organizations as $organizationId) {
            foreach (self::ACTIONS as $action) {
                $this->ensurePermission($permissionsTable, $action, (string) $organizationId);
            }

            $permissions = DB::table($permissionsTable)
                ->where('organization_id', $organizationId)
                ->where('guard_name', 'web')
                ->whereIn('name', $this->permissionNames())
                ->pluck('id');

            $roles = DB::table($rolesTable)
                ->where('organization_id', $organizationId)
                ->where('guard_name', 'web')
                ->whereIn('name', self::ROLES)
                ->get();

            foreach ($roles as $role) {
                foreach ($permissions as $permissionId) {
                    DB::table($rolePermissionsTable)->updateOrInsert([
                        'permission_id' => $permissionId,
                        'role_id' => $role->id,
                        'organization_id' => $organizationId,
                    ]);
                }
            }
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        // Additive permission migrations intentionally preserve granted access on rollback.
    }

    private function ensurePermission(
        string $permissionsTable,
        string $action,
        ?string $organizationId
    ): void {
        $name = "exam_seating_maps.{$action}";
        $query = DB::table($permissionsTable)
            ->where('name', $name)
            ->where('guard_name', 'web');

        $organizationId === null
            ? $query->whereNull('organization_id')
            : $query->where('organization_id', $organizationId);

        if ($query->exists()) {
            return;
        }

        DB::table($permissionsTable)->insert([
            'name' => $name,
            'guard_name' => 'web',
            'organization_id' => $organizationId,
            'resource' => 'exam_seating_maps',
            'action' => $action,
            'description' => ucfirst($action).' exam seating maps',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * @return array<string>
     */
    private function permissionNames(): array
    {
        return array_map(
            fn (string $action): string => "exam_seating_maps.{$action}",
            self::ACTIONS
        );
    }
};
