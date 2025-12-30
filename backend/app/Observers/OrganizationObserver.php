<?php

namespace App\Observers;

use App\Models\Organization;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Database\Seeders\PermissionSeeder;

class OrganizationObserver
{
    /**
     * Handle the Organization "created" event.
     */
    public function created(Organization $organization): void
    {
        Log::info("Organization created: {$organization->name} (ID: {$organization->id})");
        
        // Create default roles for this organization
        $this->createDefaultRoles($organization);
        
        // Assign permissions to roles
        $this->assignRolePermissions($organization);
    }

    /**
     * Create default roles for the organization
     */
    protected function createDefaultRoles(Organization $organization): void
    {
        $roles = [
            [
                'name' => 'admin',
                'description' => 'Administrator with full access to all features',
            ],
            [
                'name' => 'organization_admin',
                'description' => 'Organization Administrator - Full access to organization resources',
            ],
            [
                'name' => 'staff',
                'description' => 'Staff member with limited access for operational tasks',
            ],
            [
                'name' => 'teacher',
                'description' => 'Teacher with access to academic content and student information',
            ],
        ];

        foreach ($roles as $roleData) {
            // Check if role already exists
            $exists = DB::table('roles')
                ->where('name', $roleData['name'])
                ->where('organization_id', $organization->id)
                ->where('guard_name', 'web')
                ->exists();

            if (!$exists) {
                DB::table('roles')->insert([
                    'name' => $roleData['name'],
                    'guard_name' => 'web',
                    'organization_id' => $organization->id,
                    'description' => $roleData['description'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                Log::info("Created role: {$roleData['name']} for organization: {$organization->name}");
            }
        }
    }

    /**
     * Assign permissions to roles based on PermissionSeeder configuration
     * CRITICAL: Creates organization-specific permissions instead of using global ones
     */
    protected function assignRolePermissions(Organization $organization): void
    {
        $rolePermissions = PermissionSeeder::getRolePermissions();
        
        // CRITICAL: First create all permissions for this organization
        $this->createOrganizationPermissions($organization);
        
        // Get organization-specific permissions (NOT global)
        $orgPermissions = DB::table('permissions')
            ->where('organization_id', $organization->id)
            ->where('guard_name', 'web')
            ->get()
            ->keyBy('name');

        if ($orgPermissions->isEmpty()) {
            Log::warning("No permissions found for organization: {$organization->name}. Creating them...");
            $this->createOrganizationPermissions($organization);
            // Re-fetch after creation
            $orgPermissions = DB::table('permissions')
                ->where('organization_id', $organization->id)
                ->where('guard_name', 'web')
                ->get()
                ->keyBy('name');
        }

        // Also check for organization_admin role (created by OrganizationService)
        $orgAdminRole = DB::table('roles')
            ->where('name', 'organization_admin')
            ->where('organization_id', $organization->id)
            ->where('guard_name', 'web')
            ->first();

        foreach ($rolePermissions as $roleName => $permissionList) {
            $role = DB::table('roles')
                ->where('name', $roleName)
                ->where('organization_id', $organization->id)
                ->where('guard_name', 'web')
                ->first();

            if (!$role) {
                Log::warning("Role {$roleName} not found for organization: {$organization->name}");
                continue;
            }

            // CRITICAL: organization_admin role should get same permissions as admin role
            // Collect roles to assign permissions to
            $rolesToAssign = [$role];
            if ($orgAdminRole && $roleName === 'admin') {
                // organization_admin should get same permissions as admin
                $rolesToAssign[] = $orgAdminRole;
            }

            $assignedCount = 0;
            $skippedCount = 0;

            foreach ($rolesToAssign as $roleToAssign) {
                if ($permissionList === '*') {
                    // Admin gets all organization permissions
                    foreach ($orgPermissions as $permission) {
                        $exists = DB::table('role_has_permissions')
                            ->where('permission_id', $permission->id)
                            ->where('role_id', $roleToAssign->id)
                            ->where('organization_id', $organization->id)
                            ->exists();

                        if (!$exists) {
                            DB::table('role_has_permissions')->insert([
                                'permission_id' => $permission->id,
                                'role_id' => $roleToAssign->id,
                                'organization_id' => $organization->id,
                            ]);
                            $assignedCount++;
                        } else {
                            $skippedCount++;
                        }
                    }
                } else {
                    // Assign specific permissions for staff and teacher
                    foreach ($permissionList as $permissionName) {
                        $permission = $orgPermissions->get($permissionName);
                        if ($permission) {
                            $exists = DB::table('role_has_permissions')
                                ->where('permission_id', $permission->id)
                                ->where('role_id', $roleToAssign->id)
                                ->where('organization_id', $organization->id)
                                ->exists();

                            if (!$exists) {
                                DB::table('role_has_permissions')->insert([
                                    'permission_id' => $permission->id,
                                    'role_id' => $roleToAssign->id,
                                    'organization_id' => $organization->id,
                                ]);
                                $assignedCount++;
                            } else {
                                $skippedCount++;
                            }
                        } else {
                            Log::warning("Permission {$permissionName} not found in organization permissions for {$organization->name}");
                        }
                    }
                }
            }

            $roleNames = $roleName;
            if ($orgAdminRole && $roleName === 'admin') {
                $roleNames .= ' and organization_admin';
            }
            Log::info("Role(s) {$roleNames} for {$organization->name}: Assigned {$assignedCount} permissions, Skipped {$skippedCount}");
        }

        // Clear permission cache
        if (function_exists('app')) {
            app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
        }
    }

    /**
     * Create all permissions for a specific organization
     * This ensures each organization has its own isolated set of permissions
     */
    protected function createOrganizationPermissions(Organization $organization): void
    {
        $permissions = PermissionSeeder::getPermissions();
        $createdCount = 0;
        $skippedCount = 0;

        foreach ($permissions as $resource => $actions) {
            foreach ($actions as $action) {
                $permissionName = "{$resource}.{$action}";

                // CRITICAL: Skip subscription.admin - it's GLOBAL only (not organization-scoped)
                if ($permissionName === 'subscription.admin') {
                    continue;
                }

                // Check if organization-specific permission already exists
                $exists = DB::table('permissions')
                    ->where('name', $permissionName)
                    ->where('guard_name', 'web')
                    ->where('organization_id', $organization->id)
                    ->exists();

                if (!$exists) {
                    DB::table('permissions')->insert([
                        'name' => $permissionName,
                        'guard_name' => 'web',
                        'organization_id' => $organization->id, // Organization-specific
                        'resource' => $resource,
                        'action' => $action,
                        'description' => ucfirst($action) . ' ' . str_replace('_', ' ', $resource),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                    $createdCount++;
                } else {
                    $skippedCount++;
                }
            }
        }

        Log::info("Created {$createdCount} permissions for organization: {$organization->name} (Skipped: {$skippedCount})");
    }
}

