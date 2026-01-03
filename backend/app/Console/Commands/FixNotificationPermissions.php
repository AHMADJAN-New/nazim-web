<?php

namespace App\Console\Commands;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class FixNotificationPermissions extends Command
{
    protected $signature = 'notifications:fix-permissions';
    protected $description = 'Ensure notification permissions are assigned to roles';

    public function handle()
    {
        $this->info('Checking notification permissions...');
        
        // Get all organizations
        $organizations = DB::table('organizations')->get();
        
        foreach ($organizations as $org) {
            $this->info("\nOrganization: {$org->name} ({$org->id})");
            
            // Check if permissions exist
            $notificationsRead = Permission::where('name', 'notifications.read')
                ->where('organization_id', $org->id)
                ->first();
            
            $studentAdmissionsRead = Permission::where('name', 'student_admissions.read')
                ->where('organization_id', $org->id)
                ->first();
            
            if (!$notificationsRead) {
                $this->warn("  ❌ 'notifications.read' permission not found");
            } else {
                $this->info("  ✅ 'notifications.read' permission exists (ID: {$notificationsRead->id})");
            }
            
            if (!$studentAdmissionsRead) {
                $this->warn("  ❌ 'student_admissions.read' permission not found");
            } else {
                $this->info("  ✅ 'student_admissions.read' permission exists (ID: {$studentAdmissionsRead->id})");
            }
            
            // Check role assignments
            $adminRole = Role::where('name', 'admin')
                ->where('organization_id', $org->id)
                ->first();
            
            $staffRole = Role::where('name', 'staff')
                ->where('organization_id', $org->id)
                ->first();
            
            if ($adminRole && $notificationsRead) {
                $hasPermission = DB::table('role_has_permissions')
                    ->where('role_id', $adminRole->id)
                    ->where('permission_id', $notificationsRead->id)
                    ->where('organization_id', $org->id)
                    ->exists();
                
                if (!$hasPermission) {
                    $this->warn("  ⚠️  'admin' role missing 'notifications.read' - fixing...");
                    DB::table('role_has_permissions')->insert([
                        'role_id' => $adminRole->id,
                        'permission_id' => $notificationsRead->id,
                        'organization_id' => $org->id,
                    ]);
                    $this->info("  ✅ Fixed!");
                } else {
                    $this->info("  ✅ 'admin' role has 'notifications.read'");
                }
            }
            
            if ($adminRole && $studentAdmissionsRead) {
                $hasPermission = DB::table('role_has_permissions')
                    ->where('role_id', $adminRole->id)
                    ->where('permission_id', $studentAdmissionsRead->id)
                    ->where('organization_id', $org->id)
                    ->exists();
                
                if (!$hasPermission) {
                    $this->warn("  ⚠️  'admin' role missing 'student_admissions.read' - fixing...");
                    DB::table('role_has_permissions')->insert([
                        'role_id' => $adminRole->id,
                        'permission_id' => $studentAdmissionsRead->id,
                        'organization_id' => $org->id,
                    ]);
                    $this->info("  ✅ Fixed!");
                } else {
                    $this->info("  ✅ 'admin' role has 'student_admissions.read'");
                }
            }
            
            if ($staffRole && $notificationsRead) {
                $hasPermission = DB::table('role_has_permissions')
                    ->where('role_id', $staffRole->id)
                    ->where('permission_id', $notificationsRead->id)
                    ->where('organization_id', $org->id)
                    ->exists();
                
                if (!$hasPermission) {
                    $this->warn("  ⚠️  'staff' role missing 'notifications.read' - fixing...");
                    DB::table('role_has_permissions')->insert([
                        'role_id' => $staffRole->id,
                        'permission_id' => $notificationsRead->id,
                        'organization_id' => $org->id,
                    ]);
                    $this->info("  ✅ Fixed!");
                } else {
                    $this->info("  ✅ 'staff' role has 'notifications.read'");
                }
            }
            
            if ($staffRole && $studentAdmissionsRead) {
                $hasPermission = DB::table('role_has_permissions')
                    ->where('role_id', $staffRole->id)
                    ->where('permission_id', $studentAdmissionsRead->id)
                    ->where('organization_id', $org->id)
                    ->exists();
                
                if (!$hasPermission) {
                    $this->warn("  ⚠️  'staff' role missing 'student_admissions.read' - fixing...");
                    DB::table('role_has_permissions')->insert([
                        'role_id' => $staffRole->id,
                        'permission_id' => $studentAdmissionsRead->id,
                        'organization_id' => $org->id,
                    ]);
                    $this->info("  ✅ Fixed!");
                } else {
                    $this->info("  ✅ 'staff' role has 'student_admissions.read'");
                }
            }
            
            // Check users with roles
            $usersWithAdminRole = DB::table('model_has_roles')
                ->where('role_id', $adminRole?->id)
                ->where('organization_id', $org->id)
                ->count();
            
            $usersWithStaffRole = DB::table('model_has_roles')
                ->where('role_id', $staffRole?->id)
                ->where('organization_id', $org->id)
                ->count();
            
            $this->info("  Users with 'admin' role: {$usersWithAdminRole}");
            $this->info("  Users with 'staff' role: {$usersWithStaffRole}");
        }
        
        $this->info("\n✅ Done! Try creating a student admission again.");
        
        return 0;
    }
}


