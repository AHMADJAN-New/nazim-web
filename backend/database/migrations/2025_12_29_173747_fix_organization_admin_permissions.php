<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Fixes existing organization_admin roles by ensuring they have all permissions
     * assigned via role_has_permissions table (not directly to users).
     */
    public function up(): void
    {
        Log::info('Starting migration: fix_organization_admin_permissions');

        $organizations = DB::table('organizations')
            ->whereNull('deleted_at')
            ->get();

        if ($organizations->isEmpty()) {
            Log::info('No organizations found. Skipping organization admin permission fix.');
            return;
        }

        $totalAssigned = 0;
        $totalSkipped = 0;

        foreach ($organizations as $org) {
            // Get organization_admin role
            $orgAdminRole = DB::table('roles')
                ->where('name', 'organization_admin')
                ->where('organization_id', $org->id)
                ->where('guard_name', 'web')
                ->first();

            if (!$orgAdminRole) {
                Log::info("No organization_admin role found for organization: {$org->name}");
                continue;
            }

            // Get all organization permissions
            $orgPermissions = DB::table('permissions')
                ->where('organization_id', $org->id)
                ->where('guard_name', 'web')
                ->get();

            if ($orgPermissions->isEmpty()) {
                Log::warning("No permissions found for organization: {$org->name}");
                continue;
            }

            $assignedCount = 0;
            $skippedCount = 0;

            // Assign all permissions to organization_admin role
            foreach ($orgPermissions as $permission) {
                $exists = DB::table('role_has_permissions')
                    ->where('role_id', $orgAdminRole->id)
                    ->where('permission_id', $permission->id)
                    ->where('organization_id', $org->id)
                    ->exists();

                if (!$exists) {
                    try {
                        DB::table('role_has_permissions')->insert([
                            'role_id' => $orgAdminRole->id,
                            'permission_id' => $permission->id,
                            'organization_id' => $org->id,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                        $assignedCount++;
                        $totalAssigned++;
                    } catch (\Exception $e) {
                        Log::warning("Failed to assign permission to organization_admin role", [
                            'organization_id' => $org->id,
                            'role_id' => $orgAdminRole->id,
                            'permission_id' => $permission->id,
                            'error' => $e->getMessage()
                        ]);
                    }
                } else {
                    $skippedCount++;
                    $totalSkipped++;
                }
            }

            Log::info("Organization admin permissions fixed for {$org->name}", [
                'assigned' => $assignedCount,
                'skipped' => $skippedCount,
            ]);
        }

        Log::info("Migration completed: fix_organization_admin_permissions", [
            'total_assigned' => $totalAssigned,
            'total_skipped' => $totalSkipped,
        ]);

        // Clear permission cache
        if (function_exists('app')) {
            app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
            Log::info('Permission cache cleared');
        }
    }

    /**
     * Reverse the migrations.
     * 
     * Note: This migration does not remove permissions, it only adds them.
     * Reversing would require removing permissions, which we don't want to do.
     */
    public function down(): void
    {
        // No-op: We don't want to remove permissions that were correctly assigned
        Log::info('Migration down() called for fix_organization_admin_permissions - no action taken');
    }
};
