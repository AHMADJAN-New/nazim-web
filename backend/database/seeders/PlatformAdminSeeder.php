<?php

namespace Database\Seeders;

use App\Models\Organization;
use App\Models\OrganizationFeatureAddon;
use App\Models\OrganizationSubscription;
use App\Models\SchoolBranding;
use App\Models\User;
use App\Services\Subscription\SubscriptionService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

class PlatformAdminSeeder extends Seeder
{
    /**
     * Seed a platform admin user with subscription.admin permission
     * 
     * This creates a user that can access the platform admin app.
     * Platform admins are NOT tied to any organization.
     */
    public function run(): void
    {
        $this->command->info('Seeding platform admin user...');

        // Step 1: Ensure subscription.admin permission exists (global, organization_id = NULL)
        $permission = $this->ensurePlatformAdminPermission();

        // Step 2: Create or update platform admin user
        $user = $this->createPlatformAdminUser();

        // Step 3: Assign subscription.admin permission to user
        $this->assignPlatformAdminPermission($user->id, $permission->id);

        // Step 4: Create test organization and subscription for platform admin
        $this->createTestOrganizationAndSubscription($user->id);

        $this->command->info('');
        $this->command->info('✅ Platform admin user created successfully!');
        $this->command->info('');
        $this->command->info('Platform Admin Credentials:');
        $this->command->info('  Email: platform-admin@nazim.app');
        $this->command->info('  Password: platform-admin-123');
        $this->command->info('');
        $this->command->info('Access the platform admin at: /platform/login');
    }

    /**
     * Ensure subscription.admin permission exists (global, organization_id = NULL)
     */
    protected function ensurePlatformAdminPermission(): object
    {
        $permission = DB::table('permissions')
            ->where('name', 'subscription.admin')
            ->whereNull('organization_id')
            ->where('guard_name', 'web')
            ->first();

        if ($permission) {
            $this->command->info('  ✓ subscription.admin permission already exists');
            return (object) [
                'id' => $permission->id,
                'name' => $permission->name,
            ];
        }

        // Create the global subscription.admin permission
        $permissionId = (string) Str::uuid();
        DB::table('permissions')->insert([
            'id' => $permissionId,
            'name' => 'subscription.admin',
            'guard_name' => 'web',
            'organization_id' => null, // CRITICAL: NULL = Global permission
            'resource' => 'subscription',
            'action' => 'admin',
            'description' => 'Platform administration access - manage all organizations, subscriptions, plans, and more',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->command->info('  ✓ Created subscription.admin permission (global)');

        return (object) [
            'id' => $permissionId,
            'name' => 'subscription.admin',
        ];
    }

    /**
     * Create or update platform admin user
     * 
     * CRITICAL: Platform admin users do NOT need organization_id in profiles
     * They can have organization_id = NULL in profiles table
     */
    protected function createPlatformAdminUser(): object
    {
        $email = 'platform-admin@nazim.app';
        $password = 'admin123';
        $fullName = 'Platform Administrator';

        // Check if user already exists
        $existingUser = DB::table('users')
            ->where('email', $email)
            ->first();

        $userId = $existingUser ? $existingUser->id : (string) Str::uuid();
        $isNewUser = !$existingUser;

        if ($isNewUser) {
            // Create new user in auth.users table
            DB::table('users')->insert([
                'id' => $userId,
                'email' => $email,
                'encrypted_password' => Hash::make($password),
                'email_confirmed_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $this->command->info("  ✓ Created user: {$email}");
        } else {
            // Update password if user exists
            DB::table('users')
                ->where('id', $userId)
                ->update([
                    'encrypted_password' => Hash::make($password),
                    'updated_at' => now(),
                ]);

            $this->command->info("  ✓ Updated user: {$email}");
        }

        // Create or update profile
        // CRITICAL: Platform admin can have organization_id = NULL
        $existingProfile = DB::table('profiles')
            ->where('id', $userId)
            ->first();

        // Note: organization_id will be set later when we create the test organization
        if (!$existingProfile) {
            // Create profile (organization_id will be set in createTestOrganizationAndSubscription)
            DB::table('profiles')->insert([
                'id' => $userId,
                'email' => $email,
                'full_name' => $fullName,
                'role' => 'platform_admin', // For backward compatibility
                'organization_id' => null, // Will be set when creating test organization
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $this->command->info("  ✓ Created profile for {$email}");
        } else {
            // Update profile (organization_id will be set in createTestOrganizationAndSubscription)
            DB::table('profiles')
                ->where('id', $userId)
                ->update([
                    'full_name' => $fullName,
                    'role' => 'platform_admin',
                    'is_active' => true,
                    'updated_at' => now(),
                ]);

            $this->command->info("  ✓ Updated profile for {$email}");
        }

        return (object) [
            'id' => $userId,
            'email' => $email,
            'full_name' => $fullName,
        ];
    }

    /**
     * Assign subscription.admin permission directly to user (global permission)
     * 
     * CRITICAL: Since organization_id is part of the primary key and cannot be NULL,
     * we use a special "platform" organization UUID (all zeros) to represent global permissions.
     * The permission itself has organization_id = NULL, but model_has_permissions uses
     * a special UUID to work around the primary key constraint.
     */
    protected function assignPlatformAdminPermission(string $userId, string $permissionId): void
    {
        // Special UUID for "platform" organization (all zeros) - represents global permissions
        // This is used in model_has_permissions to work around the primary key constraint
        // The actual permission has organization_id = NULL (global)
        $platformOrgId = '00000000-0000-0000-0000-000000000000';

        // Check if permission is already assigned
        $existing = DB::table('model_has_permissions')
            ->where('permission_id', $permissionId)
            ->where('model_type', 'App\\Models\\User')
            ->where('model_id', $userId)
            ->where('organization_id', $platformOrgId) // Use platform org UUID
            ->first();

        if ($existing) {
            $this->command->info('  ✓ subscription.admin permission already assigned to user');
            return;
        }

        // Check if platform organization exists, create if not
        $platformOrg = DB::table('organizations')
            ->where('id', $platformOrgId)
            ->first();

        if (!$platformOrg) {
            // Create platform organization (special system organization for global permissions)
            DB::table('organizations')->insert([
                'id' => $platformOrgId,
                'name' => 'Platform (Global Permissions)',
                'slug' => 'platform-global',
                'settings' => json_encode([]),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $this->command->info('  ✓ Created platform organization for global permissions');
        }

        // Assign permission using platform organization UUID
        // This works around the primary key constraint while still representing a global permission
        DB::table('model_has_permissions')->insert([
            'permission_id' => $permissionId,
            'model_type' => 'App\\Models\\User',
            'model_id' => $userId,
            'organization_id' => $platformOrgId, // Use platform org UUID (represents global)
        ]);

        $this->command->info('  ✓ Assigned subscription.admin permission to platform admin user');
    }

    /**
     * Create test organization and subscription for platform admin
     * This allows platform admins to test app functionality
     */
    protected function createTestOrganizationAndSubscription(string $userId): void
    {
        $profile = DB::table('profiles')->where('id', $userId)->first();
        if (!$profile) {
            $this->command->warn('  ⚠ Profile not found, skipping organization creation');
            return;
        }

        // Check if user already has an organization
        if ($profile->organization_id) {
            $existingOrg = DB::table('organizations')
                ->where('id', $profile->organization_id)
                ->whereNull('deleted_at')
                ->first();

            if ($existingOrg) {
                $this->command->info("  ✓ User already has organization: {$existingOrg->name}");
                
                // CRITICAL: Ensure all permissions are created for existing organization
                // This includes help_center permissions and any other permissions defined in PermissionSeeder
                $this->createOrganizationPermissionsIfNeeded($profile->organization_id);
                $this->command->info("  ✓ Ensured all permissions exist for platform admin organization");
                
                // Check if subscription exists
                $subscriptionRecord = DB::table('organization_subscriptions')
                    ->where('organization_id', $profile->organization_id)
                    ->whereNull('deleted_at')
                    ->first();

                if (!$subscriptionRecord) {
                    // Create subscription if it doesn't exist
                    $subscriptionService = app(SubscriptionService::class);
                    $subscription = $subscriptionService->createTrialSubscription($profile->organization_id, $userId);
                    $expiresAt = $subscription->expires_at;
                    $this->command->info('  ✓ Created trial subscription for existing organization');
                } else {
                    // Get subscription model to access expires_at properly
                    $subscription = OrganizationSubscription::find($subscriptionRecord->id);
                    $expiresAt = $subscription ? $subscription->expires_at : null;
                    $this->command->info('  ✓ Subscription already exists');
                }

                // Ensure multi_school feature is enabled for platform admin organization
                $this->enableMultiSchoolFeature($profile->organization_id, $expiresAt);
                $this->command->info('  ✓ Enabled multi_school feature for platform admin organization');

                // CRITICAL: Ensure user has admin role for existing organization
                $this->ensureAdminRoleForOrganization($userId, $profile->organization_id);
                return;
            }
        }

        // Create test organization
        $organizationName = $profile->full_name . "'s Test Organization";
        $baseSlug = 'test-' . strtolower(preg_replace('/[^a-zA-Z0-9-]/', '-', substr($profile->full_name, 0, 30)));
        $baseSlug = preg_replace('/-+/', '-', $baseSlug);
        $baseSlug = trim($baseSlug, '-');
        $uniqueId = substr((string) Str::uuid(), 0, 8);
        $organizationSlug = substr($baseSlug . '-' . $uniqueId, 0, 100);

        // Ensure slug is unique
        $counter = 1;
        $originalSlug = $organizationSlug;
        while (DB::table('organizations')->where('slug', $organizationSlug)->exists()) {
            $organizationSlug = substr($originalSlug . '-' . $counter, 0, 100);
            $counter++;
        }

        // Create organization (OrganizationObserver will create roles and permissions)
        // CRITICAL: Explicitly set ID to ensure UUID is generated
        $organizationId = (string) Str::uuid();
        $organization = Organization::create([
            'id' => $organizationId,
            'name' => $organizationName,
            'slug' => $organizationSlug,
            'settings' => [],
        ]);

        $this->command->info("  ✓ Created test organization: {$organizationName}");

        // CRITICAL: Ensure all permissions are created for this organization
        // This includes help_center permissions and any other permissions defined in PermissionSeeder
        $this->createOrganizationPermissionsIfNeeded($organizationId);
        $this->command->info("  ✓ Ensured all permissions exist for platform admin organization");

        // Create default school
        $school = SchoolBranding::create([
            'organization_id' => $organizationId,
            'school_name' => 'Main School',
            'is_active' => true,
            'primary_color' => '#1e40af',
            'secondary_color' => '#64748b',
            'accent_color' => '#0ea5e9',
            'font_family' => 'Inter',
            'report_font_size' => 12,
            'table_alternating_colors' => true,
            'show_page_numbers' => true,
            'show_generation_date' => true,
            'calendar_preference' => 'gregorian',
        ]);
        $schoolId = $school->id;

        $this->command->info("  ✓ Created default school: Main School");

        // Update profile with organization_id and default_school_id
        DB::table('profiles')
            ->where('id', $userId)
            ->update([
                'organization_id' => $organizationId,
                'default_school_id' => $schoolId,
                'updated_at' => now(),
            ]);

        $this->command->info("  ✓ Updated profile with organization and school");

        // Create trial subscription
        $subscriptionService = app(SubscriptionService::class);
        $subscription = $subscriptionService->createTrialSubscription($organizationId, $userId);

        $this->command->info("  ✓ Created trial subscription for organization");

        // Enable multi_school feature for platform admin organization
        $this->enableMultiSchoolFeature($organizationId, $subscription->expires_at);

        $this->command->info("  ✓ Enabled multi_school feature for platform admin organization");

        // Assign admin role to user for the organization (gives all permissions)
        // CRITICAL: Set team context BEFORE finding/assigning role
        setPermissionsTeamId($organizationId);
        $userModel = User::find($userId);
        
        if ($userModel) {
            // Find admin role for this organization (should exist from OrganizationObserver)
            $adminRole = DB::table('roles')
                ->where('name', 'admin')
                ->where('organization_id', $organizationId)
                ->where('guard_name', 'web')
                ->first();

            if (!$adminRole) {
                $this->command->warn("  ⚠ Admin role not found for organization. Creating it...");
                // Create admin role if it doesn't exist (shouldn't happen, but just in case)
                // CRITICAL: roles table uses bigint ID (not UUID), so don't set id - let it auto-increment
                $roleId = DB::table('roles')->insertGetId([
                    'name' => 'admin',
                    'guard_name' => 'web',
                    'organization_id' => $organizationId,
                    'description' => 'Administrator - Full access to organization resources',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $adminRole = (object) ['id' => $roleId];
            }

            // Check if role is already assigned
            $existingAssignment = DB::table('model_has_roles')
                ->where('model_id', $userId)
                ->where('model_type', 'App\\Models\\User')
                ->where('role_id', $adminRole->id)
                ->where('organization_id', $organizationId)
                ->first();

            if (!$existingAssignment) {
                // CRITICAL: Set team context before assigning role
                setPermissionsTeamId($organizationId);
                
                // Use Spatie's assignRole method
                $roleModel = Role::find($adminRole->id);
                if ($roleModel) {
                    $userModel->assignRole($roleModel);
                }

                // CRITICAL: Ensure organization_id is set in model_has_roles
                // Spatie might not set it automatically
                $roleAssignment = DB::table('model_has_roles')
                    ->where('model_id', $userId)
                    ->where('model_type', 'App\\Models\\User')
                    ->where('role_id', $adminRole->id)
                    ->first();
                
                if ($roleAssignment) {
                    if (!$roleAssignment->organization_id) {
                        DB::table('model_has_roles')
                            ->where('model_id', $userId)
                            ->where('model_type', 'App\\Models\\User')
                            ->where('role_id', $adminRole->id)
                            ->update(['organization_id' => $organizationId]);
                    }
                } else {
                    // If Spatie didn't create the assignment, create it manually
                    DB::table('model_has_roles')->insert([
                        'role_id' => $adminRole->id,
                        'model_type' => 'App\\Models\\User',
                        'model_id' => $userId,
                        'organization_id' => $organizationId,
                    ]);
                }

                // Clear permission cache
                if (function_exists('app')) {
                    app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
                }

                $this->command->info("  ✓ Assigned admin role to user for organization");
            } else {
                $this->command->info("  ✓ Admin role already assigned to user");
            }

            // CRITICAL: Ensure admin role has all permissions assigned
            $this->ensureAdminRoleHasAllPermissions($organizationId, $adminRole->id);
        }
    }

    /**
     * Ensure user has admin role for an organization
     * This is used when user already has an organization
     */
    protected function ensureAdminRoleForOrganization(string $userId, string $organizationId): void
    {
        // CRITICAL: Set team context BEFORE finding/assigning role
        setPermissionsTeamId($organizationId);
        $userModel = User::find($userId);
        
        if (!$userModel) {
            $this->command->warn("  ⚠ User not found, skipping role assignment");
            return;
        }

        // Find admin role for this organization
        $adminRole = DB::table('roles')
            ->where('name', 'admin')
            ->where('organization_id', $organizationId)
            ->where('guard_name', 'web')
            ->first();

        if (!$adminRole) {
            $this->command->warn("  ⚠ Admin role not found for organization. Creating it...");
            // Create admin role if it doesn't exist
            $roleId = (string) Str::uuid();
            DB::table('roles')->insert([
                'id' => $roleId,
                'name' => 'admin',
                'guard_name' => 'web',
                'organization_id' => $organizationId,
                'description' => 'Administrator - Full access to organization resources',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $adminRole = (object) ['id' => $roleId];
        }

        // Check if role is already assigned
        $existingAssignment = DB::table('model_has_roles')
            ->where('model_id', $userId)
            ->where('model_type', 'App\\Models\\User')
            ->where('role_id', $adminRole->id)
            ->where('organization_id', $organizationId)
            ->first();

        if (!$existingAssignment) {
            // CRITICAL: Set team context before assigning role
            setPermissionsTeamId($organizationId);
            
            // Use Spatie's assignRole method
            $roleModel = Role::find($adminRole->id);
            if ($roleModel) {
                $userModel->assignRole($roleModel);
            }

            // CRITICAL: Ensure organization_id is set in model_has_roles
            $roleAssignment = DB::table('model_has_roles')
                ->where('model_id', $userId)
                ->where('model_type', 'App\\Models\\User')
                ->where('role_id', $adminRole->id)
                ->first();
            
            if ($roleAssignment) {
                if (!$roleAssignment->organization_id) {
                    DB::table('model_has_roles')
                        ->where('model_id', $userId)
                        ->where('model_type', 'App\\Models\\User')
                        ->where('role_id', $adminRole->id)
                        ->update(['organization_id' => $organizationId]);
                }
            } else {
                // If Spatie didn't create the assignment, create it manually
                DB::table('model_has_roles')->insert([
                    'role_id' => $adminRole->id,
                    'model_type' => 'App\\Models\\User',
                    'model_id' => $userId,
                    'organization_id' => $organizationId,
                ]);
            }

            // Clear permission cache
            if (function_exists('app')) {
                app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
            }

            $this->command->info("  ✓ Assigned admin role to user for existing organization");
        } else {
            $this->command->info("  ✓ Admin role already assigned to user for organization");
        }

        // CRITICAL: Ensure admin role has all permissions assigned
        $this->ensureAdminRoleHasAllPermissions($organizationId, $adminRole->id);
    }

    /**
     * Ensure admin role has all permissions assigned for an organization
     * This is critical - the role assignment alone isn't enough, permissions must be assigned to the role
     */
    protected function ensureAdminRoleHasAllPermissions(string $organizationId, string $roleId): void
    {
        // Get all organization-specific permissions
        $orgPermissions = DB::table('permissions')
            ->where('organization_id', $organizationId)
            ->where('guard_name', 'web')
            ->get();

        if ($orgPermissions->isEmpty()) {
            $this->command->warn("  ⚠ No permissions found for organization. Creating them...");
            // Trigger OrganizationObserver to create permissions
            $organization = Organization::find($organizationId);
            if ($organization) {
                // Manually trigger the observer logic or use PermissionSeeder
                $this->createOrganizationPermissionsIfNeeded($organizationId);
                // Re-fetch permissions
                $orgPermissions = DB::table('permissions')
                    ->where('organization_id', $organizationId)
                    ->where('guard_name', 'web')
                    ->get();
            }
        }

        if ($orgPermissions->isEmpty()) {
            $this->command->error("  ✗ Failed to create permissions for organization");
            return;
        }

        // Assign all permissions to admin role (skip subscription.admin - it's global only)
        $assignedCount = 0;
        $skippedCount = 0;

        foreach ($orgPermissions as $permission) {
            // CRITICAL: Skip subscription.admin - it's GLOBAL only
            if ($permission->name === 'subscription.admin') {
                continue;
            }

            $exists = DB::table('role_has_permissions')
                ->where('role_id', $roleId)
                ->where('permission_id', $permission->id)
                ->where('organization_id', $organizationId)
                ->exists();

            if (!$exists) {
                DB::table('role_has_permissions')->insert([
                    'role_id' => $roleId,
                    'permission_id' => $permission->id,
                    'organization_id' => $organizationId,
                ]);
                $assignedCount++;
            } else {
                $skippedCount++;
            }
        }

        // Clear permission cache
        if (function_exists('app')) {
            app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
        }

        $this->command->info("  ✓ Admin role permissions: Assigned {$assignedCount}, Already assigned {$skippedCount}");
    }

    /**
     * Create organization permissions if they don't exist
     */
    protected function createOrganizationPermissionsIfNeeded(string $organizationId): void
    {
        $organization = Organization::find($organizationId);
        if (!$organization) {
            return;
        }

        // Use PermissionSeeder to get permission list
        $permissions = \Database\Seeders\PermissionSeeder::getPermissions();
        $createdCount = 0;

        foreach ($permissions as $resource => $actions) {
            foreach ($actions as $action) {
                $permissionName = "{$resource}.{$action}";

                // CRITICAL: Skip subscription.admin - it's GLOBAL only
                if ($permissionName === 'subscription.admin') {
                    continue;
                }

                // Check if permission already exists
                $exists = DB::table('permissions')
                    ->where('name', $permissionName)
                    ->where('organization_id', $organizationId)
                    ->where('guard_name', 'web')
                    ->exists();

                if (!$exists) {
                    // CRITICAL: permissions table uses bigint ID (not UUID), so don't set id - let it auto-increment
                    DB::table('permissions')->insert([
                        'name' => $permissionName,
                        'guard_name' => 'web',
                        'organization_id' => $organizationId,
                        'resource' => $resource,
                        'action' => $action,
                        'description' => ucfirst($action) . ' ' . str_replace('_', ' ', $resource),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                    $createdCount++;
                }
            }
        }

        if ($createdCount > 0) {
            $this->command->info("  ✓ Created {$createdCount} permissions for organization");
        }
    }

    /**
     * Enable multi_school feature for platform admin organization
     */
    protected function enableMultiSchoolFeature(string $organizationId, $expiresAt = null): void
    {
        // Check if feature addon already exists
        $existingAddon = DB::table('organization_feature_addons')
            ->where('organization_id', $organizationId)
            ->where('feature_key', 'multi_school')
            ->whereNull('deleted_at')
            ->first();

        if ($existingAddon) {
            // Update existing addon to ensure it's enabled
            DB::table('organization_feature_addons')
                ->where('id', $existingAddon->id)
                ->update([
                    'is_enabled' => true,
                    'expires_at' => $expiresAt,
                    'updated_at' => now(),
                ]);
            return;
        }

        // Create new feature addon
        $addonId = (string) Str::uuid();
        DB::table('organization_feature_addons')->insert([
            'id' => $addonId,
            'organization_id' => $organizationId,
            'feature_key' => 'multi_school',
            'is_enabled' => true,
            'started_at' => now(),
            'expires_at' => $expiresAt, // Match subscription expiry, or null for no expiry
            'price_paid' => 0, // Free for platform admin
            'currency' => 'AFN',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}

