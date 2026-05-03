<?php

namespace App\Console\Commands;

use App\Services\DefaultRolePermissionSyncService;
use Database\Seeders\PermissionSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SyncDefaultRolesPermissions extends Command
{
    protected $signature = 'permissions:sync-default-roles
                            {--dry-run : Show what would be done without making changes}';

    protected $description = 'Sync all default roles with PermissionSeeder: create missing roles and add any missing canonical permissions for all organizations (does not strip custom role permissions)';

    /** Role names and descriptions (must match OrganizationObserver::getDefaultRoleDefinitions). */
    protected static function getDefaultRoleDescriptions(): array
    {
        return [
            'admin' => 'Administrator with full access to school-scoped features',
            'organization_admin' => 'Organization Administrator - Full access to organization resources',
            'staff' => 'Staff member with limited access for operational tasks; finance/fees read-only',
            'teacher' => 'Teacher with access to academic content and student information',
            'accountant' => 'Accountant with full finance, fees, and multi-currency access',
            'exam_controller' => 'Exam controller with full exam management and marks entry',
            'hostel_manager' => 'Hostel manager with access to rooms and student admissions',
            'librarian' => 'Librarian - manage library, lend/return books to students and staff',
            'website_admin' => 'Website administrator - full website content and settings',
            'website_editor' => 'Website editor - edit pages, posts, events, and menus',
            'website_media' => 'Website media manager - manage media library only',
        ];
    }

    public function handle(DefaultRolePermissionSyncService $syncService): int
    {
        $dryRun = $this->option('dry-run');
        if ($dryRun) {
            $this->warn('Dry run - no changes will be made.');
        }

        $tableNames = config('permission.table_names');
        $rolesTable = $tableNames['roles'] ?? 'roles';
        $permissionsTable = $tableNames['permissions'] ?? 'permissions';

        $rolePermissions = PermissionSeeder::getRolePermissions();
        $roleDescriptions = self::getDefaultRoleDescriptions();

        $organizations = DB::table('organizations')->whereNull('deleted_at')->get();
        if ($organizations->isEmpty()) {
            $this->warn('No organizations found.');

            return self::SUCCESS;
        }

        $this->info('Processing '.$organizations->count().' organization(s).');
        $totalAdded = 0;
        $totalRemoved = 0;
        $rolesCreated = 0;
        $orgsSynced = 0;

        foreach ($organizations as $org) {
            $orgPermissions = DB::table($permissionsTable)
                ->where('organization_id', $org->id)
                ->where('guard_name', 'web')
                ->get()
                ->keyBy('name');

            if ($orgPermissions->isEmpty()) {
                Log::warning("No permissions found for organization: {$org->name} ({$org->id}). Run organization observer or seed first.");
                $this->warn("  Skipping {$org->name} - no org permissions.");

                continue;
            }

            foreach ($rolePermissions as $roleName => $_permissionList) {
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

                    $rolesCreated++;
                }
            }

            if ($dryRun) {
                $this->info("  {$org->name}: would sync default role permissions.");

                continue;
            }

            $result = $syncService->syncOrganization($org->id);
            $totalAdded += $result['permissions_added'] ?? 0;
            $totalRemoved += $result['permissions_removed'] ?? 0;
            $orgsSynced++;

            if (($result['permissions_added'] ?? 0) > 0 || ($result['permissions_removed'] ?? 0) > 0) {
                $this->info(
                    "{$org->name}: +".($result['permissions_added'] ?? 0)
                    .' permission(s), -'.($result['permissions_removed'] ?? 0)
                    .' permission(s).'
                );
            }
        }

        if ($rolesCreated > 0) {
            $this->info("Roles created: {$rolesCreated}.");
        }

        if ($dryRun) {
            $this->info('Dry run complete.');
        } elseif ($totalAdded === 0 && $totalRemoved === 0 && $rolesCreated === 0) {
            $this->info('No missing roles or permission changes were required.');
        } else {
            $this->info("Organizations synced: {$orgsSynced}.");
            $this->info("Permissions added: {$totalAdded}.");
            $this->info("Permissions removed: {$totalRemoved}.");
        }

        $store = config('permission.cache.store') !== 'default' ? config('permission.cache.store') : null;
        app('cache')->store($store)->forget(config('permission.cache.key'));

        $this->info('Done.');

        return self::SUCCESS;
    }
}
