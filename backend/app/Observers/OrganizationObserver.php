<?php

namespace App\Observers;

use App\Models\Organization;
use App\Services\DefaultRolePermissionSyncService;
use Database\Seeders\PermissionSeeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

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
     * Default roles created for every organization (must match PermissionSeeder::getRolePermissions keys).
     */
    protected function getDefaultRoleDefinitions(): array
    {
        return [
            ['name' => 'admin', 'description' => 'Administrator with full access to school-scoped features'],
            ['name' => 'organization_admin', 'description' => 'Organization Administrator - Full access to organization resources'],
            ['name' => 'staff', 'description' => 'Staff member with limited access for operational tasks; finance/fees read-only'],
            ['name' => 'teacher', 'description' => 'Teacher with access to academic content and student information'],
            ['name' => 'accountant', 'description' => 'Accountant with full finance, fees, and multi-currency access'],
            ['name' => 'exam_controller', 'description' => 'Exam controller with full exam management and marks entry'],
            ['name' => 'hostel_manager', 'description' => 'Hostel manager with access to rooms and student admissions'],
            ['name' => 'librarian', 'description' => 'Librarian – manage library, lend/return books to students and staff'],
            ['name' => 'website_admin', 'description' => 'Website administrator – full website content and settings'],
            ['name' => 'website_editor', 'description' => 'Website editor – edit pages, posts, events, and menus'],
            ['name' => 'website_media', 'description' => 'Website media manager – manage media library only'],
        ];
    }

    /**
     * Create default roles for the organization
     */
    protected function createDefaultRoles(Organization $organization): void
    {
        $roles = $this->getDefaultRoleDefinitions();

        foreach ($roles as $roleData) {
            // Check if role already exists
            $exists = DB::table('roles')
                ->where('name', $roleData['name'])
                ->where('organization_id', $organization->id)
                ->where('guard_name', 'web')
                ->exists();

            if (! $exists) {
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
        // CRITICAL: First create all permissions for this organization
        $this->createOrganizationPermissions($organization);

        $result = app(DefaultRolePermissionSyncService::class)->syncOrganization($organization->id);

        Log::info("Synced default role permissions for organization: {$organization->name}", $result);
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

                if (! $exists) {
                    DB::table('permissions')->insert([
                        'name' => $permissionName,
                        'guard_name' => 'web',
                        'organization_id' => $organization->id, // Organization-specific
                        'resource' => $resource,
                        'action' => $action,
                        'description' => ucfirst($action).' '.str_replace('_', ' ', $resource),
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
