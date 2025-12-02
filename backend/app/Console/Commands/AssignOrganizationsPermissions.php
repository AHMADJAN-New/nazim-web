<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class AssignOrganizationsPermissions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'organizations:assign-permissions';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Assign organizations permissions to admin role for all existing organizations';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Assigning organizations permissions to admin role...');

        $tableNames = config('permission.table_names');
        $permissionsTable = $tableNames['permissions'] ?? 'permissions';
        $rolesTable = $tableNames['roles'] ?? 'roles';
        $roleHasPermissionsTable = $tableNames['role_has_permissions'] ?? 'role_has_permissions';

        // Step 1: Ensure organizations permissions exist
        $permissionsToCreate = [
            ['name' => 'organizations.read', 'resource' => 'organizations', 'action' => 'read', 'description' => 'View organizations'],
            ['name' => 'organizations.create', 'resource' => 'organizations', 'action' => 'create', 'description' => 'Create organizations'],
            ['name' => 'organizations.update', 'resource' => 'organizations', 'action' => 'update', 'description' => 'Update organizations'],
            ['name' => 'organizations.delete', 'resource' => 'organizations', 'action' => 'delete', 'description' => 'Delete organizations'],
        ];

        foreach ($permissionsToCreate as $permData) {
            $existing = DB::table($permissionsTable)
                ->where('name', $permData['name'])
                ->whereNull('organization_id')
                ->where('guard_name', 'web')
                ->first();

            if (!$existing) {
                DB::table($permissionsTable)->insert([
                    'name' => $permData['name'],
                    'guard_name' => 'web',
                    'organization_id' => null,
                    'resource' => $permData['resource'],
                    'action' => $permData['action'],
                    'description' => $permData['description'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $this->line("Created permission: {$permData['name']}");
            }
        }

        // Step 2: Get all organizations
        $organizations = DB::table('organizations')
            ->whereNull('deleted_at')
            ->get();

        if ($organizations->isEmpty()) {
            $this->warn('No organizations found. Create an organization first.');
            return 0;
        }

        $this->info("Found {$organizations->count()} organization(s)");

        $hasRolePermissionsTable = DB::select("
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'role_permissions'
            ) as exists
        ");

        $useCustomTable = !empty($hasRolePermissionsTable) && $hasRolePermissionsTable[0]->exists;

        if ($useCustomTable) {
            $this->info('Using custom role_permissions table...');
            
            $result = DB::statement("
                INSERT INTO role_permissions (role, permission_id, organization_id)
                SELECT 
                    'admin',
                    p.id,
                    o.id
                FROM {$permissionsTable} p
                CROSS JOIN organizations o
                WHERE p.organization_id IS NULL
                  AND p.name IN ('organizations.read', 'organizations.create', 'organizations.update', 'organizations.delete')
                  AND p.guard_name = 'web'
                  AND o.deleted_at IS NULL
                ON CONFLICT (role, permission_id, organization_id) DO NOTHING
            ");
            
            $count = DB::table('role_permissions')
                ->where('role', 'admin')
                ->join($permissionsTable, 'role_permissions.permission_id', '=', "{$permissionsTable}.id")
                ->whereIn("{$permissionsTable}.name", ['organizations.read', 'organizations.create', 'organizations.update', 'organizations.delete'])
                ->count();
            
            $this->info("Assigned permissions to admin role. Total assignments: {$count}");
        } else {
            // Use Spatie's role_has_permissions table
            $this->info('Using Spatie role_has_permissions table...');
            
            $assignedCount = 0;
            
            foreach ($organizations as $org) {
                // Get or create admin role for this organization
                $role = DB::table($rolesTable)
                    ->where('name', 'admin')
                    ->where('organization_id', $org->id)
                    ->where('guard_name', 'web')
                    ->first();

                if (!$role) {
                    // Create admin role if it doesn't exist
                    $roleId = DB::table($rolesTable)->insertGetId([
                        'name' => 'admin',
                        'guard_name' => 'web',
                        'organization_id' => $org->id,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                    $this->line("Created admin role for organization: {$org->name}");
                } else {
                    $roleId = $role->id;
                }

                // Assign organizations permissions to admin role
                $permissions = DB::table($permissionsTable)
                    ->where('organization_id', null)
                    ->where('guard_name', 'web')
                    ->whereIn('name', ['organizations.read', 'organizations.create', 'organizations.update', 'organizations.delete'])
                    ->get();

                foreach ($permissions as $permission) {
                    $inserted = DB::table($roleHasPermissionsTable)->insertOrIgnore([
                        'permission_id' => $permission->id,
                        'role_id' => $roleId,
                        'organization_id' => $org->id,
                    ]);
                    
                    if ($inserted) {
                        $assignedCount++;
                    }
                }
            }
            
            $this->info("Assigned {$assignedCount} permission(s) to admin role(s)");
        }

        // Clear permission cache
        app('cache')
            ->store(config('permission.cache.store') != 'default' ? config('permission.cache.store') : null)
            ->forget(config('permission.cache.key'));

        $this->info('Done! Permissions have been assigned.');

        return 0;
    }
}
