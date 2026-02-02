<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Production-safe migration: seeds website portal permissions and public_website
 * feature definition if they do not exist. Safe to run on every deploy; no need
 * to run db:seed for these. Idempotent (insert only when missing).
 */
return new class extends Migration
{
    /** Website portal permission resource => actions (matches PermissionSeeder). */
    private const WEBSITE_PERMISSIONS = [
        'website_pages' => ['read', 'create', 'update', 'delete'],
        'website_posts' => ['read', 'create', 'update', 'delete'],
        'website_events' => ['read', 'create', 'update', 'delete'],
        'website_media' => ['read', 'create', 'update', 'delete'],
        'website_domains' => ['read', 'create', 'update', 'delete'],
        'website_menus' => ['read', 'create', 'update', 'delete'],
        'website_settings' => ['read', 'update'],
    ];

    /** Subscription permissions (global + org-scoped except subscription.admin is global only). */
    private const SUBSCRIPTION_PERMISSIONS = [
        'subscription' => ['admin', 'read'],
    ];

    /** Website portal roles and their permission names (matches PermissionSeeder::getRolePermissions). */
    private const WEBSITE_ROLE_PERMISSIONS = [
        'website_admin' => [
            'website_pages.read', 'website_pages.create', 'website_pages.update', 'website_pages.delete',
            'website_posts.read', 'website_posts.create', 'website_posts.update', 'website_posts.delete',
            'website_events.read', 'website_events.create', 'website_events.update', 'website_events.delete',
            'website_media.read', 'website_media.create', 'website_media.update', 'website_media.delete',
            'website_domains.read', 'website_domains.create', 'website_domains.update', 'website_domains.delete',
            'website_menus.read', 'website_menus.create', 'website_menus.update', 'website_menus.delete',
            'website_settings.read', 'website_settings.update',
        ],
        'website_editor' => [
            'website_pages.read', 'website_pages.create', 'website_pages.update',
            'website_posts.read', 'website_posts.create', 'website_posts.update',
            'website_events.read', 'website_events.create', 'website_events.update',
            'website_menus.read', 'website_menus.create', 'website_menus.update',
            'website_settings.read',
        ],
        'website_media' => [
            'website_media.read', 'website_media.create', 'website_media.update', 'website_media.delete',
        ],
    ];

    private const GUARD_NAME = 'web';

    public function up(): void
    {
        $permissionsTable = config('permission.table_names.permissions', 'permissions');
        $rolesTable = config('permission.table_names.roles', 'roles');
        $roleHasPermissionsTable = config('permission.table_names.role_has_permissions', 'role_has_permissions');

        $this->seedPublicWebsiteFeature();
        $this->seedGlobalPermissions($permissionsTable);
        $this->seedOrganizationWebsitePermissionsAndRoles($permissionsTable, $rolesTable, $roleHasPermissionsTable);
    }

    public function down(): void
    {
        // No down: we do not remove permissions or feature_definitions that may have been
        // created by this migration, to avoid breaking production. This migration is additive only.
    }

    private function seedPublicWebsiteFeature(): void
    {
        $exists = DB::table('feature_definitions')
            ->where('feature_key', 'public_website')
            ->exists();

        if (!$exists) {
            DB::table('feature_definitions')->insert([
                'feature_key' => 'public_website',
                'name' => 'Public Website Portal',
                'description' => null,
                'category' => 'enterprise',
                'is_addon' => true,
                'addon_price_yearly_afn' => 0,
                'addon_price_yearly_usd' => 0,
                'sort_order' => 94,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    private function seedGlobalPermissions(string $permissionsTable): void
    {
        $allGlobal = array_merge(
            $this->flattenPermissions(self::WEBSITE_PERMISSIONS),
            $this->flattenPermissions(self::SUBSCRIPTION_PERMISSIONS)
        );

        foreach ($allGlobal as $permissionName => $resourceAction) {
            [$resource, $action] = $resourceAction;
            $exists = DB::table($permissionsTable)
                ->where('name', $permissionName)
                ->where('guard_name', self::GUARD_NAME)
                ->whereNull('organization_id')
                ->exists();

            if (!$exists) {
                DB::table($permissionsTable)->insert([
                    'name' => $permissionName,
                    'guard_name' => self::GUARD_NAME,
                    'organization_id' => null,
                    'resource' => $resource,
                    'action' => $action,
                    'description' => ucfirst($action) . ' ' . str_replace('_', ' ', $resource),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    private function seedOrganizationWebsitePermissionsAndRoles(
        string $permissionsTable,
        string $rolesTable,
        string $roleHasPermissionsTable
    ): void {
        $organizations = DB::table('organizations')->whereNull('deleted_at')->get();

        foreach ($organizations as $org) {
            $orgId = $org->id;

            // Org-specific permissions: website_* + subscription.read only (subscription.admin is global only)
            $websiteFlat = $this->flattenPermissions(self::WEBSITE_PERMISSIONS);
            $subscriptionReadOnly = ['subscription.read' => ['subscription', 'read']];

            foreach (array_merge($websiteFlat, $subscriptionReadOnly) as $permissionName => $resourceAction) {
                [$resource, $action] = $resourceAction;
                $exists = DB::table($permissionsTable)
                    ->where('name', $permissionName)
                    ->where('guard_name', self::GUARD_NAME)
                    ->where('organization_id', $orgId)
                    ->exists();

                if (!$exists) {
                    DB::table($permissionsTable)->insert([
                        'name' => $permissionName,
                        'guard_name' => self::GUARD_NAME,
                        'organization_id' => $orgId,
                        'resource' => $resource,
                        'action' => $action,
                        'description' => ucfirst($action) . ' ' . str_replace('_', ' ', $resource),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }

            // Ensure website roles exist
            $websiteRoles = [
                ['name' => 'website_admin', 'description' => 'Website admin with full control over public site content'],
                ['name' => 'website_editor', 'description' => 'Website editor with content publishing access'],
                ['name' => 'website_media', 'description' => 'Website media manager for uploads and galleries'],
            ];

            foreach ($websiteRoles as $roleData) {
                $exists = DB::table($rolesTable)
                    ->where('name', $roleData['name'])
                    ->where('organization_id', $orgId)
                    ->where('guard_name', self::GUARD_NAME)
                    ->exists();

                if (!$exists) {
                    DB::table($rolesTable)->insert([
                        'name' => $roleData['name'],
                        'guard_name' => self::GUARD_NAME,
                        'organization_id' => $orgId,
                        'description' => $roleData['description'],
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }

            // Assign permissions to website roles (role_has_permissions)
            $orgPermissions = DB::table($permissionsTable)
                ->where('organization_id', $orgId)
                ->where('guard_name', self::GUARD_NAME)
                ->get()
                ->keyBy('name');

            foreach (self::WEBSITE_ROLE_PERMISSIONS as $roleName => $permissionNames) {
                $role = DB::table($rolesTable)
                    ->where('name', $roleName)
                    ->where('organization_id', $orgId)
                    ->where('guard_name', self::GUARD_NAME)
                    ->first();

                if (!$role) {
                    continue;
                }

                foreach ($permissionNames as $permissionName) {
                    $permission = $orgPermissions->get($permissionName);
                    if (!$permission) {
                        continue;
                    }
                    $exists = DB::table($roleHasPermissionsTable)
                        ->where('permission_id', $permission->id)
                        ->where('role_id', $role->id)
                        ->where('organization_id', $orgId)
                        ->exists();

                    if (!$exists) {
                        DB::table($roleHasPermissionsTable)->insert([
                            'permission_id' => $permission->id,
                            'role_id' => $role->id,
                            'organization_id' => $orgId,
                        ]);
                    }
                }
            }
        }

        $this->clearPermissionCache();
    }

    /** @return array<string, array{0: string, 1: string}> [ 'resource.action' => [resource, action] ] */
    private function flattenPermissions(array $permissions): array
    {
        $out = [];
        foreach ($permissions as $resource => $actions) {
            foreach ($actions as $action) {
                $name = "{$resource}.{$action}";
                $out[$name] = [$resource, $action];
            }
        }
        return $out;
    }

    private function clearPermissionCache(): void
    {
        try {
            app()->get(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
        } catch (\Throwable $e) {
            // Ignore if config or cache not available during migration
        }
    }
};
