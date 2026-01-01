<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class FixMissingBasicPermissions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'permissions:fix-basic {organization_id : The organization ID to fix permissions for}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Assign missing basic permissions to all roles in an organization';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $orgId = $this->argument('organization_id');

        // Basic permissions that should be assigned to all roles
        $basicPermissions = [
            'organizations.read',
            'school_branding.read',
            'rooms.read',
            'classes.read',
            'hostel.read',
            'report_templates.read',
            'reports.read',
            'academic_years.read',
            'buildings.read',
            'staff.read',
            'student_admissions.read',
        ];

        $this->info("Fixing missing basic permissions for organization: {$orgId}");
        $this->newLine();

        // Verify organization exists
        $organization = DB::table('organizations')
            ->where('id', $orgId)
            ->whereNull('deleted_at')
            ->first();

        if (!$organization) {
            $this->error("Organization {$orgId} not found or has been deleted.");
            return Command::FAILURE;
        }

        // Get all roles for this organization (using chunking to avoid memory issues)
        $roles = DB::table('roles')
            ->where('organization_id', $orgId)
            ->where('guard_name', 'web')
            ->get();

        if ($roles->isEmpty()) {
            $this->warn("No roles found for organization {$orgId}");
            return Command::FAILURE;
        }

        $this->info("Found {$roles->count()} role(s):");
        foreach ($roles as $role) {
            $this->line("  - {$role->name} (ID: {$role->id})");
        }
        $this->newLine();

        $totalAssigned = 0;

        // Process each role individually to avoid memory issues
        foreach ($roles as $role) {
            $this->info("Processing role: {$role->name}");
            $assignedCount = 0;
            
            foreach ($basicPermissions as $permissionName) {
                // Get permission ID for this organization (single query per permission)
                $permission = DB::table('permissions')
                    ->where('name', $permissionName)
                    ->where('organization_id', $orgId)
                    ->where('guard_name', 'web')
                    ->first();
                
                if ($permission) {
                    // Check if already assigned (single query)
                    $exists = DB::table('role_has_permissions')
                        ->where('role_id', $role->id)
                        ->where('permission_id', $permission->id)
                        ->where('organization_id', $orgId)
                        ->exists();
                    
                    if (!$exists) {
                        DB::table('role_has_permissions')->insert([
                            'role_id' => $role->id,
                            'permission_id' => $permission->id,
                            'organization_id' => $orgId,
                        ]);
                        $assignedCount++;
                        $this->line("  ✓ Assigned: {$permissionName}");
                    } else {
                        $this->line("  - Already assigned: {$permissionName}");
                    }
                } else {
                    $this->warn("  ✗ Permission not found: {$permissionName}");
                }
            }
            
            $totalAssigned += $assignedCount;
            $this->info("  Total assigned to {$role->name}: {$assignedCount}");
            $this->newLine();
        }

        // Clear permission cache
        try {
            app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
            $this->info("Permission cache cleared.");
        } catch (\Exception $e) {
            $this->warn("Could not clear permission cache: " . $e->getMessage());
        }

        $this->newLine();
        $this->info("Total permissions assigned: {$totalAssigned}");
        $this->info("Done!");

        return Command::SUCCESS;
    }
}




