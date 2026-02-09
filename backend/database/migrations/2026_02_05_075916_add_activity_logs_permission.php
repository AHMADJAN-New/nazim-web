<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Adds activity_logs.read permission for audit trail access
     */
    public function up(): void
    {
        $guardName = 'web';
        $permissionsTable = config('permission.table_names.permissions', 'permissions');
        $rolesTable = config('permission.table_names.roles', 'roles');
        $roleHasPermissionsTable = config('permission.table_names.role_has_permissions', 'role_has_permissions');

        // First, create the global permission (organization_id = NULL)
        $exists = DB::table($permissionsTable)
            ->where('name', 'activity_logs.read')
            ->whereNull('organization_id')
            ->exists();
            
        if (!$exists) {
            DB::table($permissionsTable)->insert([
                'name' => 'activity_logs.read',
                'resource' => 'activity_logs',
                'action' => 'read',
                'description' => 'View activity logs (audit trail)',
                'guard_name' => $guardName,
                'organization_id' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // Get all organizations
        $organizations = DB::table('organizations')
            ->whereNull('deleted_at')
            ->get();

        foreach ($organizations as $org) {
            $orgId = $org->id;
            
            // Check if organization-scoped permission exists
            $existsForOrg = DB::table($permissionsTable)
                ->where('name', 'activity_logs.read')
                ->where('organization_id', $orgId)
                ->exists();
                
            if (!$existsForOrg) {
                DB::table($permissionsTable)->insert([
                    'name' => 'activity_logs.read',
                    'resource' => 'activity_logs',
                    'action' => 'read',
                    'description' => 'View activity logs (audit trail)',
                    'guard_name' => $guardName,
                    'organization_id' => $orgId,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            // Get the permission id (now that it exists)
            $orgPermission = DB::table($permissionsTable)
                ->where('name', 'activity_logs.read')
                ->where('organization_id', $orgId)
                ->first();

            if (!$orgPermission) {
                continue;
            }

            // Get the admin role for this organization
            $adminRole = DB::table($rolesTable)
                ->where('name', 'admin')
                ->where('organization_id', $orgId)
                ->where('guard_name', $guardName)
                ->first();

            if ($adminRole) {
                // Check if role already has this permission
                $hasPermission = DB::table($roleHasPermissionsTable)
                    ->where('role_id', $adminRole->id)
                    ->where('permission_id', $orgPermission->id)
                    ->where('organization_id', $orgId)
                    ->exists();

                if (!$hasPermission) {
                    DB::table($roleHasPermissionsTable)->insert([
                        'permission_id' => $orgPermission->id,
                        'role_id' => $adminRole->id,
                        'organization_id' => $orgId,
                    ]);
                }
            }

            // Get the organization_admin role for this organization
            $orgAdminRole = DB::table($rolesTable)
                ->where('name', 'organization_admin')
                ->where('organization_id', $orgId)
                ->where('guard_name', $guardName)
                ->first();

            if ($orgAdminRole) {
                // Check if role already has this permission
                $hasPermission = DB::table($roleHasPermissionsTable)
                    ->where('role_id', $orgAdminRole->id)
                    ->where('permission_id', $orgPermission->id)
                    ->where('organization_id', $orgId)
                    ->exists();

                if (!$hasPermission) {
                    DB::table($roleHasPermissionsTable)->insert([
                        'permission_id' => $orgPermission->id,
                        'role_id' => $orgAdminRole->id,
                        'organization_id' => $orgId,
                    ]);
                }
            }
        }

        // Clear permission cache
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $permissionsTable = config('permission.table_names.permissions', 'permissions');
        $roleHasPermissionsTable = config('permission.table_names.role_has_permissions', 'role_has_permissions');
        $modelHasPermissionsTable = config('permission.table_names.model_has_permissions', 'model_has_permissions');

        // Get all permission IDs for activity_logs.read
        $permissionIds = DB::table($permissionsTable)
            ->where('name', 'activity_logs.read')
            ->pluck('id');

        // Remove from role_has_permissions
        DB::table($roleHasPermissionsTable)
            ->whereIn('permission_id', $permissionIds)
            ->delete();

        // Remove from model_has_permissions
        DB::table($modelHasPermissionsTable)
            ->whereIn('permission_id', $permissionIds)
            ->delete();

        // Remove the permissions
        DB::table($permissionsTable)
            ->where('name', 'activity_logs.read')
            ->delete();

        // Clear permission cache
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
    }
};
