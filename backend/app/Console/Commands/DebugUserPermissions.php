<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;

class DebugUserPermissions extends Command
{
    protected $signature = 'debug:user-permissions {user-id} {organization-id}';
    protected $description = 'Debug user permissions for a specific organization';

    public function handle()
    {
        $userId = $this->argument('user-id');
        $orgId = $this->argument('organization-id');

        $user = User::find($userId);
        if (!$user) {
            $this->error("User not found: {$userId}");
            return 1;
        }

        $this->info("User: {$user->email} (ID: {$user->id})");
        $this->info("Organization ID: {$orgId}");
        $this->newLine();

        // Set team context
        setPermissionsTeamId($orgId);
        $this->info("Team ID set to: " . getPermissionsTeamId());
        $this->newLine();

        // Check role assignment
        $role = Role::where('name', 'organization_admin')
            ->where('organization_id', $orgId)
            ->first();

        if (!$role) {
            $this->error("organization_admin role not found for organization {$orgId}");
            return 1;
        }

        $this->info("Role found: {$role->name} (ID: {$role->id})");

        // Check if user has role in model_has_roles
        $hasRoleInDb = DB::table('model_has_roles')
            ->where('model_id', $user->id)
            ->where('model_type', 'App\\Models\\User')
            ->where('role_id', $role->id)
            ->where('organization_id', $orgId)
            ->exists();

        $this->info("User has role in DB: " . ($hasRoleInDb ? 'YES' : 'NO'));

        // Check using Spatie
        $user->refresh();
        $hasRoleSpatie = $user->hasRole($role);
        $this->info("User has role (Spatie): " . ($hasRoleSpatie ? 'YES' : 'NO'));
        $this->newLine();

        // Check permissions
        $permissionCount = DB::table('role_has_permissions')
            ->where('role_id', $role->id)
            ->where('organization_id', $orgId)
            ->count();

        $this->info("Role has {$permissionCount} permissions assigned");
        $this->newLine();

        // Check specific permission
        $orgReadPermission = DB::table('permissions')
            ->where('name', 'organizations.read')
            ->where('organization_id', $orgId)
            ->first();

        if ($orgReadPermission) {
            $this->info("Permission found: organizations.read (ID: {$orgReadPermission->id})");

            $hasPermissionInRole = DB::table('role_has_permissions')
                ->where('role_id', $role->id)
                ->where('permission_id', $orgReadPermission->id)
                ->where('organization_id', $orgId)
                ->exists();

            $this->info("Permission assigned to role: " . ($hasPermissionInRole ? 'YES' : 'NO'));

            // Check using Spatie
            try {
                $hasPermissionSpatie = $user->hasPermissionTo('organizations.read');
                $this->info("User has permission (Spatie): " . ($hasPermissionSpatie ? 'YES' : 'NO'));
            } catch (\Exception $e) {
                $this->error("Spatie permission check failed: " . $e->getMessage());
            }

            // Test manual query (like Controller::userHasPermission)
            $hasPermissionManual = DB::table('permissions')
                ->join('role_has_permissions', 'permissions.id', '=', 'role_has_permissions.permission_id')
                ->join('model_has_roles', function ($join) use ($user) {
                    $join->on('role_has_permissions.role_id', '=', 'model_has_roles.role_id')
                         ->where('model_has_roles.model_id', '=', $user->id)
                         ->where('model_has_roles.model_type', '=', 'App\\Models\\User');
                })
                ->where('model_has_roles.organization_id', $orgId)
                ->where('role_has_permissions.organization_id', $orgId)
                ->where('permissions.organization_id', $orgId)
                ->where('permissions.name', 'organizations.read')
                ->where('permissions.guard_name', 'web')
                ->exists();
            
            $this->info("User has permission (Manual Query): " . ($hasPermissionManual ? 'YES' : 'NO'));
        } else {
            $this->error("Permission not found: organizations.read");
        }

        return 0;
    }
}
