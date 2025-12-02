<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Assigns organizations permissions (read, create, update, delete) to admin role
     * for all existing organizations.
     * 
     * This works with both Spatie's role_has_permissions table and the custom role_permissions table.
     */
    public function up(): void
    {
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
            }
        }
        
        $hasRolePermissionsTable = DB::select("
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'role_permissions'
            ) as exists
        ");
        
        $useCustomTable = !empty($hasRolePermissionsTable) && $hasRolePermissionsTable[0]->exists;
        
        if ($useCustomTable) {
            DB::statement("
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
        } else {
            // Use Spatie's role_has_permissions table
            // First, ensure admin roles exist for each organization
            $organizations = DB::table('organizations')
                ->whereNull('deleted_at')
                ->get();
            
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
                    DB::table($roleHasPermissionsTable)->insertOrIgnore([
                        'permission_id' => $permission->id,
                        'role_id' => $roleId,
                        'organization_id' => $org->id,
                    ]);
                }
            }
        }
        
        // Clear permission cache
        app('cache')
            ->store(config('permission.cache.store') != 'default' ? config('permission.cache.store') : null)
            ->forget(config('permission.cache.key'));
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $tableNames = config('permission.table_names');
        $permissionsTable = $tableNames['permissions'] ?? 'permissions';
        $roleHasPermissionsTable = $tableNames['role_has_permissions'] ?? 'role_has_permissions';
        
        // Check if role_permissions table exists
        $hasRolePermissionsTable = DB::select("
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'role_permissions'
            ) as exists
        ");
        
        $useCustomTable = !empty($hasRolePermissionsTable) && $hasRolePermissionsTable[0]->exists;
        
        if ($useCustomTable) {
            // Remove from custom role_permissions table
            DB::statement("
                DELETE FROM role_permissions rp
                USING {$permissionsTable} p
                WHERE rp.permission_id = p.id
                  AND rp.role = 'admin'
                  AND p.organization_id IS NULL
                  AND p.name IN ('organizations.read', 'organizations.create', 'organizations.update', 'organizations.delete')
            ");
        } else {
            // Remove from Spatie's role_has_permissions table
            DB::statement("
                DELETE FROM {$roleHasPermissionsTable} rp
                USING {$permissionsTable} p, {$tableNames['roles']} r
                WHERE rp.permission_id = p.id
                  AND rp.role_id = r.id
                  AND p.organization_id IS NULL
                  AND p.name IN ('organizations.read', 'organizations.create', 'organizations.update', 'organizations.delete')
                  AND r.name = 'admin'
            ");
        }
        
        // Clear permission cache
        app('cache')
            ->store(config('permission.cache.store') != 'default' ? config('permission.cache.store') : null)
            ->forget(config('permission.cache.key'));
    }
};
