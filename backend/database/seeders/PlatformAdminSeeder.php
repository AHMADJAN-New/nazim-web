<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

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
        $password = 'platform-admin-123';
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

        if (!$existingProfile) {
            // Create profile with NULL organization_id (platform admin doesn't need organization)
            DB::table('profiles')->insert([
                'id' => $userId,
                'email' => $email,
                'full_name' => $fullName,
                'role' => 'platform_admin', // For backward compatibility
                'organization_id' => null, // CRITICAL: NULL for platform admins
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $this->command->info("  ✓ Created profile for {$email} (no organization)");
        } else {
            // Update profile - ensure organization_id is NULL
            DB::table('profiles')
                ->where('id', $userId)
                ->update([
                    'full_name' => $fullName,
                    'role' => 'platform_admin',
                    'organization_id' => null, // CRITICAL: Ensure NULL for platform admins
                    'is_active' => true,
                    'updated_at' => now(),
                ]);

            $this->command->info("  ✓ Updated profile for {$email} (no organization)");
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
}

