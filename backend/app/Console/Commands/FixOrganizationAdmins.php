<?php

namespace App\Console\Commands;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Spatie\Permission\Models\Role;

class FixOrganizationAdmins extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'organizations:fix-admins {--organization-id= : Fix specific organization only}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Fix organization admin role and permissions for existing organizations';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $organizationId = $this->option('organization-id');
        
        if ($organizationId) {
            $organizations = Organization::where('id', $organizationId)->whereNull('deleted_at')->get();
        } else {
            $organizations = Organization::whereNull('deleted_at')->get();
        }

        if ($organizations->isEmpty()) {
            $this->error('No organizations found.');
            return 1;
        }

        $this->info("Found {$organizations->count()} organization(s) to process.");

        $fixedCount = 0;
        $errorCount = 0;

        foreach ($organizations as $organization) {
            $this->line("Processing organization: {$organization->name} ({$organization->id})");

            try {
                // Find organization admin users (by profile.role or by model_has_roles)
                $orgId = $organization->id; // Capture in variable for closures
                $adminUsers = DB::table('profiles')
                    ->where('organization_id', $orgId)
                    ->where(function ($query) use ($orgId) {
                        $query->where('role', 'organization_admin')
                              ->orWhereIn('id', function ($subQuery) use ($orgId) {
                                  $subQuery->select('model_id')
                                      ->from('model_has_roles')
                                      ->join('roles', 'model_has_roles.role_id', '=', 'roles.id')
                                      ->where('roles.name', 'organization_admin')
                                      ->where('roles.organization_id', $orgId)
                                      ->where('model_has_roles.model_type', 'App\\Models\\User')
                                      ->where('model_has_roles.organization_id', $orgId);
                              });
                    })
                    ->get();

                if ($adminUsers->isEmpty()) {
                    $this->warn("  No organization admin users found for {$organization->name}");
                    continue;
                }

                $this->info("  Found {$adminUsers->count()} organization admin user(s)");

                // Ensure organization_admin role exists
                $orgId = $organization->id; // Use captured variable
                $role = Role::firstOrCreate(
                    [
                        'name' => 'organization_admin',
                        'organization_id' => $orgId,
                        'guard_name' => 'web',
                    ],
                    [
                        'description' => 'Organization Administrator - Full access to organization resources'
                    ]
                );

                $this->info("  Role exists: {$role->name} (ID: {$role->id})");

                // Ensure permissions exist for organization
                $orgId = $organization->id; // Use captured variable
                $orgPermissions = DB::table('permissions')
                    ->where('organization_id', $orgId)
                    ->where('guard_name', 'web')
                    ->pluck('id', 'name')
                    ->toArray();

                if (empty($orgPermissions)) {
                    $this->warn("  No permissions found. Creating permissions...");
                    
                    // Create permissions using PermissionSeeder logic
                    $permissions = \Database\Seeders\PermissionSeeder::getPermissions();
                    
                    foreach ($permissions as $resource => $actions) {
                        foreach ($actions as $action) {
                            $permissionName = "{$resource}.{$action}";
                            
                            // Skip subscription.admin - it's GLOBAL only
                            if ($permissionName === 'subscription.admin') {
                                continue;
                            }
                            
                            $exists = DB::table('permissions')
                                ->where('name', $permissionName)
                                ->where('guard_name', 'web')
                                ->where('organization_id', $orgId)
                                ->exists();
                            
                            if (!$exists) {
                                DB::table('permissions')->insert([
                                    'name' => $permissionName,
                                    'guard_name' => 'web',
                                    'organization_id' => $orgId,
                                    'resource' => $resource,
                                    'action' => $action,
                                    'description' => ucfirst($action) . ' ' . str_replace('_', ' ', $resource),
                                    'created_at' => now(),
                                    'updated_at' => now(),
                                ]);
                            }
                        }
                    }
                    
                    // Re-fetch permissions
                    $orgPermissions = DB::table('permissions')
                        ->where('organization_id', $orgId)
                        ->where('guard_name', 'web')
                        ->pluck('id', 'name')
                        ->toArray();
                    
                    $this->info("  Created " . count($orgPermissions) . " permissions");
                } else {
                    $this->info("  Found " . count($orgPermissions) . " existing permissions");
                }

                // Assign ALL permissions to organization_admin role
                $tableNames = config('permission.table_names');
                $roleHasPermissionsTable = $tableNames['role_has_permissions'] ?? 'role_has_permissions';
                
                $assignedCount = 0;
                $skippedCount = 0;

                foreach ($orgPermissions as $permissionName => $permissionId) {
                    $exists = DB::table($roleHasPermissionsTable)
                        ->where('role_id', $role->id)
                        ->where('permission_id', $permissionId)
                        ->where('organization_id', $orgId)
                        ->exists();

                    if (!$exists) {
                        try {
                            DB::table($roleHasPermissionsTable)->insert([
                                'role_id' => $role->id,
                                'permission_id' => $permissionId,
                                'organization_id' => $orgId,
                            ]);
                            $assignedCount++;
                        } catch (\Exception $e) {
                            $this->warn("    Failed to assign permission: $permissionName - {$e->getMessage()}");
                        }
                    } else {
                        $skippedCount++;
                    }
                }

                $this->info("  Assigned {$assignedCount} permissions to role (skipped {$skippedCount} existing)");

                // Assign role to all admin users
                setPermissionsTeamId($orgId);
                
                foreach ($adminUsers as $adminProfile) {
                    $user = User::find($adminProfile->id);
                    if (!$user) {
                        $this->warn("    User not found: {$adminProfile->id}");
                        continue;
                    }

                    // Check if role is already assigned
                    $hasRole = DB::table('model_has_roles')
                        ->where('model_id', $user->id)
                        ->where('model_type', 'App\\Models\\User')
                        ->where('role_id', $role->id)
                        ->where('organization_id', $orgId)
                        ->exists();

                    if (!$hasRole) {
                        setPermissionsTeamId($orgId);
                        $user->assignRole($role);
                        $this->info("    Assigned role to user: {$user->email}");
                    } else {
                        $this->info("    User already has role: {$user->email}");
                    }
                }

                // Clear permission cache
                app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

                $fixedCount++;
                $this->info("  ✓ Fixed organization: {$organization->name}");

            } catch (\Exception $e) {
                $errorCount++;
                $this->error("  ✗ Error processing {$organization->name}: {$e->getMessage()}");
                Log::error("FixOrganizationAdmins error", [
                    'organization_id' => $organization->id,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
            }
        }

        $this->newLine();
        $this->info("Summary:");
        $this->info("  Fixed: {$fixedCount}");
        $this->info("  Errors: {$errorCount}");

        return 0;
    }
}
