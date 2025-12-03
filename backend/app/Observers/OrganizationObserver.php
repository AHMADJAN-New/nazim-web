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
     */
    protected function assignRolePermissions(Organization $organization): void
    {
        $rolePermissions = PermissionSeeder::getRolePermissions();
        
        // Get all global permissions
        $globalPermissions = DB::table('permissions')
            ->whereNull('organization_id')
            ->where('guard_name', 'web')
            ->get()
            ->keyBy('name');

        if ($globalPermissions->isEmpty()) {
            Log::warning("No global permissions found. Run PermissionSeeder first.");
            return;
        }

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

            $assignedCount = 0;
            $skippedCount = 0;

            if ($permissionList === '*') {
                // Admin gets all permissions
                foreach ($globalPermissions as $permission) {
                    $exists = DB::table('role_has_permissions')
                        ->where('permission_id', $permission->id)
                        ->where('role_id', $role->id)
                        ->where('organization_id', $organization->id)
                        ->exists();

                    if (!$exists) {
                        DB::table('role_has_permissions')->insert([
                            'permission_id' => $permission->id,
                            'role_id' => $role->id,
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
                    $permission = $globalPermissions->get($permissionName);
                    if ($permission) {
                        $exists = DB::table('role_has_permissions')
                            ->where('permission_id', $permission->id)
                            ->where('role_id', $role->id)
                            ->where('organization_id', $organization->id)
                            ->exists();

                        if (!$exists) {
                            DB::table('role_has_permissions')->insert([
                                'permission_id' => $permission->id,
                                'role_id' => $role->id,
                                'organization_id' => $organization->id,
                            ]);
                            $assignedCount++;
                        } else {
                            $skippedCount++;
                        }
                    } else {
                        Log::warning("Permission {$permissionName} not found in global permissions");
                    }
                }
            }

            Log::info("Role {$roleName} for {$organization->name}: Assigned {$assignedCount} permissions, Skipped {$skippedCount}");
        }

        // Clear permission cache
        if (function_exists('app')) {
            app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
        }
    }
}

