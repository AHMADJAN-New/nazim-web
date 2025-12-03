<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     *
     * Creates:
     * - All permissions (via PermissionSeeder)
     * - 2 organizations with default roles
     * - 3 users per organization (admin, staff, teacher)
     */
    public function run(): void
    {
        $this->command->info('Starting database seeding...');

        // Step 1: Seed permissions first (required for roles)
        $this->command->info('Step 1: Seeding permissions...');
        $this->call(PermissionSeeder::class);

        // Step 2: Create 2 organizations
        $this->command->info('Step 2: Creating organizations...');
        $org1 = $this->createOrganization('Organization One', 'org-one', 'First test organization');
        $org2 = $this->createOrganization('Organization Two', 'org-two', 'Second test organization');

        // Step 3: Create users for Organization 1
        $this->command->info('Step 3: Creating users for Organization One...');
        $this->createUsersForOrganization($org1, [
            ['email' => 'admin1@test.com', 'name' => 'Admin One', 'role' => 'admin', 'password' => 'admin123'],
            ['email' => 'staff1@test.com', 'name' => 'Staff One', 'role' => 'staff', 'password' => 'staff123'],
            ['email' => 'teacher1@test.com', 'name' => 'Teacher One', 'role' => 'teacher', 'password' => 'teacher123'],
        ]);

        // Step 4: Create users for Organization 2
        $this->command->info('Step 4: Creating users for Organization Two...');
        $this->createUsersForOrganization($org2, [
            ['email' => 'admin2@test.com', 'name' => 'Admin Two', 'role' => 'admin', 'password' => 'admin123'],
            ['email' => 'staff2@test.com', 'name' => 'Staff Two', 'role' => 'staff', 'password' => 'staff123'],
            ['email' => 'teacher2@test.com', 'name' => 'Teacher Two', 'role' => 'teacher', 'password' => 'teacher123'],
        ]);

        $this->command->info('');
        $this->command->info('✅ Database seeding completed successfully!');
        $this->command->info('');
        $this->command->info('Organization One users:');
        $this->command->info('  - admin1@test.com / admin123 (Admin)');
        $this->command->info('  - staff1@test.com / staff123 (Staff)');
        $this->command->info('  - teacher1@test.com / teacher123 (Teacher)');
        $this->command->info('');
        $this->command->info('Organization Two users:');
        $this->command->info('  - admin2@test.com / admin123 (Admin)');
        $this->command->info('  - staff2@test.com / staff123 (Staff)');
        $this->command->info('  - teacher2@test.com / teacher123 (Teacher)');
        $this->command->info('');
        $this->command->info('Each user can only see data from their own organization.');
    }

    /**
     * Create an organization
     */
    protected function createOrganization(string $name, string $slug, string $description = ''): object
    {
        // Check if organization already exists
        $existing = DB::table('organizations')
            ->where('slug', $slug)
            ->whereNull('deleted_at')
            ->first();

        if ($existing) {
            $this->command->info("Organization '{$name}' already exists. Skipping creation.");
            // Ensure roles exist for existing organization
            $this->ensureRolesForOrganization((object) [
                'id' => $existing->id,
                'name' => $existing->name,
            ]);
            return $existing;
        }

        // Use Eloquent model to trigger observer
        // Explicitly set ID to ensure UUID is generated
        $orgId = (string) Str::uuid();
        $organization = \App\Models\Organization::create([
            'id' => $orgId,
            'name' => $name,
            'slug' => $slug,
            'settings' => [],
        ]);

        $this->command->info("Created organization: {$name} (ID: {$organization->id})");

        // Manually ensure roles are created (backup if observer didn't fire)
        $this->ensureRolesForOrganization($organization);

        return (object) [
            'id' => $organization->id,
            'name' => $organization->name,
            'slug' => $organization->slug,
        ];
    }

    /**
     * Ensure roles exist for organization (backup if observer didn't fire)
     */
    protected function ensureRolesForOrganization($organization): void
    {
        $roles = [
            ['name' => 'admin', 'description' => 'Administrator with full access to all features'],
            ['name' => 'staff', 'description' => 'Staff member with limited access for operational tasks'],
            ['name' => 'teacher', 'description' => 'Teacher with access to academic content and student information'],
        ];

        foreach ($roles as $roleData) {
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

                $this->command->info("  ✓ Created role '{$roleData['name']}' for {$organization->name}");

                // Assign permissions to role
                $this->assignPermissionsToRole($organization->id, $roleData['name']);
            }
        }
    }

    /**
     * Assign permissions to a role
     */
    protected function assignPermissionsToRole(string $organizationId, string $roleName): void
    {
        $role = DB::table('roles')
            ->where('name', $roleName)
            ->where('organization_id', $organizationId)
            ->where('guard_name', 'web')
            ->first();

        if (!$role) {
            return;
        }

        $rolePermissions = \Database\Seeders\PermissionSeeder::getRolePermissions();
        $permissionList = $rolePermissions[$roleName] ?? [];

        // Get all global permissions
        $globalPermissions = DB::table('permissions')
            ->whereNull('organization_id')
            ->where('guard_name', 'web')
            ->get()
            ->keyBy('name');

        if ($globalPermissions->isEmpty()) {
            $this->command->warn("  ⚠ No global permissions found. Permissions not assigned to {$roleName} role.");
            return;
        }

        $assignedCount = 0;

        if ($permissionList === '*') {
            // Admin gets all permissions
            foreach ($globalPermissions as $permission) {
                $exists = DB::table('role_has_permissions')
                    ->where('permission_id', $permission->id)
                    ->where('role_id', $role->id)
                    ->where('organization_id', $organizationId)
                    ->exists();

                if (!$exists) {
                    DB::table('role_has_permissions')->insert([
                        'permission_id' => $permission->id,
                        'role_id' => $role->id,
                        'organization_id' => $organizationId,
                    ]);
                    $assignedCount++;
                }
            }
        } else {
            // Assign specific permissions
            foreach ($permissionList as $permissionName) {
                $permission = $globalPermissions->get($permissionName);
                if ($permission) {
                    $exists = DB::table('role_has_permissions')
                        ->where('permission_id', $permission->id)
                        ->where('role_id', $role->id)
                        ->where('organization_id', $organizationId)
                        ->exists();

                    if (!$exists) {
                        DB::table('role_has_permissions')->insert([
                            'permission_id' => $permission->id,
                            'role_id' => $role->id,
                            'organization_id' => $organizationId,
                        ]);
                        $assignedCount++;
                    }
                }
            }
        }

        if ($assignedCount > 0) {
            $this->command->info("  ✓ Assigned {$assignedCount} permissions to '{$roleName}' role");
        }
    }

    /**
     * Create users for an organization
     */
    protected function createUsersForOrganization(object $organization, array $users): void
    {
        foreach ($users as $userData) {
            $this->createUser($organization, $userData);
        }
    }

    /**
     * Create a single user with profile and role assignment
     */
    protected function createUser(object $organization, array $userData): void
    {
        try {
            // Check if user already exists
            $existingUser = DB::table('users')
                ->where('email', $userData['email'])
                ->first();

            if ($existingUser) {
                $this->command->info("User {$userData['email']} already exists. Skipping creation.");
                return;
            }

            $userId = (string) Str::uuid();

            // Create user in auth.users table
            DB::table('users')->insert([
                'id' => $userId,
                'email' => $userData['email'],
                'encrypted_password' => Hash::make($userData['password']),
                'email_confirmed_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Create profile
            DB::table('profiles')->insert([
                'id' => $userId,
                'email' => $userData['email'],
                'full_name' => $userData['name'],
                'role' => $userData['role'], // Keep for backward compatibility
                'organization_id' => $organization->id, // CRITICAL: Assign to organization
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Assign role to user via Spatie's model_has_roles table
            $role = DB::table('roles')
                ->where('name', $userData['role'])
                ->where('organization_id', $organization->id)
                ->where('guard_name', 'web')
                ->first();

            if ($role) {
                // Check if role is already assigned
                $hasRole = DB::table('model_has_roles')
                    ->where('role_id', $role->id)
                    ->where('model_type', 'App\\Models\\User')
                    ->where('model_id', $userId)
                    ->where('organization_id', $organization->id)
                    ->exists();

                if (!$hasRole) {
                    DB::table('model_has_roles')->insert([
                        'role_id' => $role->id,
                        'model_type' => 'App\\Models\\User',
                        'model_id' => $userId,
                        'organization_id' => $organization->id,
                    ]);
                    $this->command->info("  ✓ Created {$userData['email']} with {$userData['role']} role");
                } else {
                    $this->command->info("  ✓ User {$userData['email']} already has {$userData['role']} role");
                }
            } else {
                $this->command->warn("  ⚠ Role '{$userData['role']}' not found for organization {$organization->name}. User created but role not assigned.");
            }
        } catch (\Exception $e) {
            $this->command->error("Error creating user {$userData['email']}: " . $e->getMessage());
        }
    }
}
