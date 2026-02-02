<?php

namespace App\Console\Commands;

use Database\Seeders\PermissionSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SyncDefaultRolesPermissions extends Command
{
    protected $signature = 'permissions:sync-default-roles
                            {--dry-run : Show what would be done without making changes}';

    protected $description = 'Sync all default roles with PermissionSeeder: create missing roles and add missing permissions for all existing organizations';

    /** Role names and descriptions (must match OrganizationObserver::getDefaultRoleDefinitions). */
    protected static function getDefaultRoleDescriptions(): array
    {
        return [
            'staff' => 'Staff member with limited access for operational tasks; finance/fees read-only',
            'teacher' => 'Teacher with access to academic content and student information',
            'accountant' => 'Accountant with full finance, fees, and multi-currency access',
            'exam_controller' => 'Exam controller with full exam management and marks entry',
            'hostel_manager' => 'Hostel manager with access to rooms and student admissions',
            'librarian' => 'Librarian – manage library, lend/return books to students and staff',
            'website_admin' => 'Website administrator – full website content and settings',
            'website_editor' => 'Website editor – edit pages, posts, events, and menus',
            'website_media' => 'Website media manager – manage media library only',
        ];
    }

    public function handle(): int
    {
        $dryRun = $this->option('dry-run');
        if ($dryRun) {
            $this->warn('Dry run – no changes will be made.');
        }

        $tableNames = config('permission.table_names');
        $rolesTable = $tableNames['roles'] ?? 'roles';
        $permissionsTable = $tableNames['permissions'] ?? 'permissions';
        $roleHasPermissionsTable = $tableNames['role_has_permissions'] ?? 'role_has_permissions';

        $rolePermissions = PermissionSeeder::getRolePermissions();
        $roleDescriptions = self::getDefaultRoleDescriptions();

        $organizations = DB::table('organizations')->whereNull('deleted_at')->get();
        if ($organizations->isEmpty()) {
            $this->warn('No organizations found.');
            return self::SUCCESS;
        }

        $this->info('Processing '.$organizations->count().' organization(s).');
        $totalAdded = 0;
        $rolesCreated = 0;
        $rolesSynced = [];

        foreach ($organizations as $org) {
            $orgPermissions = DB::table($permissionsTable)
                ->where('organization_id', $org->id)
                ->where('guard_name', 'web')
                ->get()
                ->keyBy('name');

            if ($orgPermissions->isEmpty()) {
                Log::warning("No permissions found for organization: {$org->name} ({$org->id}). Run organization observer or seed first.");
                $this->warn("  Skipping {$org->name} – no org permissions.");
                continue;
            }

            foreach ($rolePermissions as $roleName => $permissionList) {
                // Admin gets '*' – handled by observer; skip in sync (we don't re-assign all perms here)
                if ($permissionList === '*') {
                    continue;
                }

                $role = DB::table($rolesTable)
                    ->where('name', $roleName)
                    ->where('organization_id', $org->id)
                    ->where('guard_name', 'web')
                    ->first();

                // Create any missing default role for existing orgs (e.g. orgs created before role was added)
                if (! $role && isset($roleDescriptions[$roleName]) && ! $dryRun) {
                    DB::table($rolesTable)->insert([
                        'name' => $roleName,
                        'guard_name' => 'web',
                        'organization_id' => $org->id,
                        'description' => $roleDescriptions[$roleName],
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                    $role = DB::table($rolesTable)
                        ->where('name', $roleName)
                        ->where('organization_id', $org->id)
                        ->where('guard_name', 'web')
                        ->first();
                    $rolesCreated++;
                }

                if (! $role) {
                    continue;
                }

                $added = 0;
                foreach ($permissionList as $permissionName) {
                    if ($permissionName === 'subscription.admin') {
                        continue;
                    }
                    $permission = $orgPermissions->get($permissionName);
                    if (! $permission) {
                        continue;
                    }
                    $exists = DB::table($roleHasPermissionsTable)
                        ->where('role_id', $role->id)
                        ->where('permission_id', $permission->id)
                        ->where('organization_id', $org->id)
                        ->exists();
                    if (! $exists && ! $dryRun) {
                        DB::table($roleHasPermissionsTable)->insert([
                            'permission_id' => $permission->id,
                            'role_id' => $role->id,
                            'organization_id' => $org->id,
                        ]);
                        $added++;
                        $totalAdded++;
                    }
                }
                if ($added > 0) {
                    $rolesSynced[$roleName] = ($rolesSynced[$roleName] ?? 0) + $added;
                }
            }
        }

        if ($rolesCreated > 0) {
            $this->info("Roles created: {$rolesCreated}.");
        }
        foreach ($rolesSynced as $roleName => $count) {
            $this->info("{$roleName}: {$count} permission(s) added.");
        }
        if (empty($rolesSynced) && $rolesCreated === 0) {
            $this->info('No missing roles or permissions to add.');
        } else {
            $this->info("Total: {$totalAdded} permission(s) added across all roles.");
        }

        $store = config('permission.cache.store') !== 'default' ? config('permission.cache.store') : null;
        app('cache')->store($store)->forget(config('permission.cache.key'));

        $this->info('Done.');
        return self::SUCCESS;
    }
}
