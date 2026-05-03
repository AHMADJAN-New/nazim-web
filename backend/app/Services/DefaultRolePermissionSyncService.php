<?php

namespace App\Services;

use Database\Seeders\PermissionSeeder;
use Illuminate\Support\Facades\DB;

class DefaultRolePermissionSyncService
{
    /**
     * Ensure default role permissions exist for an organization (additive only).
     * Does not remove admin-assigned extras — see class docblock history in git.
     *
     * @return array<string, int>
     */
    public function syncOrganization(string $organizationId): array
    {
        $tableNames = config('permission.table_names');
        $rolesTable = $tableNames['roles'] ?? 'roles';
        $permissionsTable = $tableNames['permissions'] ?? 'permissions';
        $roleHasPermissionsTable = $tableNames['role_has_permissions'] ?? 'role_has_permissions';

        $rolePermissions = PermissionSeeder::getRolePermissions();
        $roles = DB::table($rolesTable)
            ->where('organization_id', $organizationId)
            ->where('guard_name', 'web')
            ->whereIn('name', array_keys($rolePermissions))
            ->get()
            ->keyBy('name');

        $permissions = DB::table($permissionsTable)
            ->where('organization_id', $organizationId)
            ->where('guard_name', 'web')
            ->get()
            ->keyBy('name');

        $added = 0;
        $rolesSynced = 0;

        foreach ($rolePermissions as $roleName => $permissionNames) {
            $role = $roles->get($roleName);
            if (! $role || ! is_array($permissionNames)) {
                continue;
            }

            $expectedPermissionIds = collect($permissionNames)
                ->map(fn (string $permissionName) => $permissions->get($permissionName)?->id)
                ->filter()
                ->map(fn ($permissionId) => (string) $permissionId)
                ->values()
                ->all();

            $currentPermissionIds = DB::table($roleHasPermissionsTable)
                ->where('role_id', $role->id)
                ->where('organization_id', $organizationId)
                ->pluck('permission_id')
                ->map(fn ($permissionId) => (string) $permissionId)
                ->all();

            // Only add missing default permissions from the seeder — never delete extras.
            // Deleting "unexpected" rows broke real usage: every GET /permissions/user ran sync and
            // stripped admin-assigned role permissions not listed in PermissionSeeder::getRolePermissions().
            // Pruning removed-from-product permissions is handled by migrations / artisan:roles:sync-defaults.
            $permissionsToAdd = array_values(array_unique(
                array_values(array_diff($expectedPermissionIds, $currentPermissionIds)),
                SORT_REGULAR
            ));

            if (! empty($permissionsToAdd)) {
                $payload = array_map(
                    fn (string $permissionId): array => [
                        'permission_id' => (int) $permissionId,
                        'role_id' => $role->id,
                        'organization_id' => $organizationId,
                    ],
                    $permissionsToAdd
                );

                DB::table($roleHasPermissionsTable)->insert($payload);
                $added += count($permissionsToAdd);
            }

            $rolesSynced++;
        }

        if ($added > 0) {
            app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
        }

        return [
            'roles_synced' => $rolesSynced,
            'permissions_added' => $added,
            'permissions_removed' => 0,
        ];
    }
}
