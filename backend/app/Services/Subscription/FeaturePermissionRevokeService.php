<?php

namespace App\Services\Subscription;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Revokes permissions tied to a subscription feature for an organization.
 * When a feature is disabled (addon turned off or plan feature overridden),
 * permissions from config('subscription_features.feature_permission_map')
 * are removed from role_has_permissions and model_has_permissions for that org.
 */
class FeaturePermissionRevokeService
{
    public function revokePermissionsForFeature(string $organizationId, string $featureKey): void
    {
        $permissionNames = $this->getPermissionNamesForFeature($featureKey);
        if (empty($permissionNames)) {
            return;
        }

        $permissionIds = $this->getPermissionIdsForOrganization($organizationId, $permissionNames);
        if (empty($permissionIds)) {
            return;
        }

        $tableNames = config('permission.table_names');
        $roleHasPermissionsTable = $tableNames['role_has_permissions'] ?? 'role_has_permissions';
        $modelHasPermissionsTable = $tableNames['model_has_permissions'] ?? 'model_has_permissions';
        $modelMorphKey = config('permission.column_names.model_morph_key', 'model_id');

        DB::transaction(function () use (
            $organizationId,
            $permissionIds,
            $roleHasPermissionsTable,
            $modelHasPermissionsTable

        ) {
            $deletedFromRoles = DB::table($roleHasPermissionsTable)
                ->where('organization_id', $organizationId)
                ->whereIn('permission_id', $permissionIds)
                ->delete();

            $deletedFromUsers = DB::table($modelHasPermissionsTable)
                ->where('organization_id', $organizationId)
                ->whereIn('permission_id', $permissionIds)
                ->delete();

            if ($deletedFromRoles > 0 || $deletedFromUsers > 0) {
                Log::info('FeaturePermissionRevokeService: Revoked feature permissions for org', [
                    'organization_id' => $organizationId,
                    'permission_ids_count' => count($permissionIds),
                    'deleted_from_role_has_permissions' => $deletedFromRoles,
                    'deleted_from_model_has_permissions' => $deletedFromUsers,
                ]);
            }
        });

        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /**
     * @return string[]
     */
    private function getPermissionNamesForFeature(string $featureKey): array
    {
        $map = config('subscription_features.feature_permission_map', []);
        $normalized = $this->normalizeFeatureKey($featureKey);

        $names = $map[$normalized] ?? $map[$featureKey] ?? [];

        return is_array($names) ? $names : [];
    }

    private function normalizeFeatureKey(string $featureKey): string
    {
        $aliases = [
            'timetable' => 'timetables',
            'reports' => 'pdf_reports',
        ];

        return $aliases[$featureKey] ?? $featureKey;
    }

    /**
     * Get permission IDs that are valid for this org: permissions where
     * (organization_id = orgId OR organization_id IS NULL) and name IN (...).
     *
     * @param  string[]  $permissionNames
     * @return array<int|string>
     */
    private function getPermissionIdsForOrganization(string $organizationId, array $permissionNames): array
    {
        if (empty($permissionNames)) {
            return [];
        }

        $permissionsTable = config('permission.table_names.permissions', 'permissions');

        return DB::table($permissionsTable)
            ->whereIn('name', $permissionNames)
            ->where(function ($q) use ($organizationId) {
                $q->where('organization_id', $organizationId)
                    ->orWhereNull('organization_id');
            })
            ->pluck('id')
            ->all();
    }
}
