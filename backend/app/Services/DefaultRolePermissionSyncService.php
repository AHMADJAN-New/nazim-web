<?php

namespace App\Services;

use Database\Seeders\PermissionSeeder;
use Illuminate\Support\Facades\DB;

class DefaultRolePermissionSyncService
{
    /** @var array<string, array<string, int>> */
    private static array $requestCache = [];

    /**
     * Sync default role permissions for an organization to the canonical seeder state.
     *
     * @return array<string, int>
     */
    public function syncOrganization(string $organizationId): array
    {
        if (isset(self::$requestCache[$organizationId])) {
            return self::$requestCache[$organizationId];
        }

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
        $removed = 0;
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

            $permissionsToAdd = array_values(array_unique(
                array_values(array_diff($expectedPermissionIds, $currentPermissionIds)),
                SORT_REGULAR
            ));
            $permissionsToRemove = array_values(array_diff($currentPermissionIds, $expectedPermissionIds));

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

            if (! empty($permissionsToRemove)) {
                DB::table($roleHasPermissionsTable)
                    ->where('role_id', $role->id)
                    ->where('organization_id', $organizationId)
                    ->whereIn('permission_id', array_map('intval', $permissionsToRemove))
                    ->delete();

                $removed += count($permissionsToRemove);
            }

            $rolesSynced++;
        }

        if ($added > 0 || $removed > 0) {
            app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
        }

        return self::$requestCache[$organizationId] = [
            'roles_synced' => $rolesSynced,
            'permissions_added' => $added,
            'permissions_removed' => $removed,
        ];
    }
}
