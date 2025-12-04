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

        // Step 1b: Seed residency types (lookup table)
        $this->command->info('Step 1b: Seeding residency types...');
        $this->call(ResidencyTypeSeeder::class);

        // Step 1c: Seed staff types (lookup table)
        $this->command->info('Step 1c: Seeding staff types...');
        $this->call(StaffTypeSeeder::class);

        // Step 2: Create 2 organizations
        $this->command->info('Step 2: Creating organizations...');
        $org1 = $this->createOrganization('Organization One', 'org-one', 'First test organization');
        $org2 = $this->createOrganization('Organization Two', 'org-two', 'Second test organization');

        // Step 2b: Ensure role permissions for all organizations (idempotent)
        $this->command->info('Step 2b: Ensuring role permissions for all organizations...');
        $this->assignPermissionsForAllOrganizations();

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

        // Step 5: Create schools for organizations
        $this->command->info('Step 5: Creating schools...');
        $this->call(SchoolBrandingSeeder::class);

        // Step 6: Create buildings for schools
        $this->command->info('Step 6: Creating buildings...');
        $this->call(BuildingSeeder::class);

        // Step 7: Create rooms for buildings
        $this->command->info('Step 7: Creating rooms...');
        $this->call(RoomSeeder::class);

        // Step 8: Create academic years for organizations
        $this->command->info('Step 8: Creating academic years...');
        $this->call(AcademicYearSeeder::class);

        // Step 8b: Create schedule slots for organizations
        $this->command->info('Step 8b: Creating schedule slots...');
        $this->call(ScheduleSlotSeeder::class);

        // Step 9: Create classes for organizations
        $this->command->info('Step 9: Creating classes...');
        $this->call(ClassSeeder::class);

        // Step 10: Create subjects for organizations
        $this->command->info('Step 10: Creating subjects...');
        $this->call(SubjectSeeder::class);

        // Step 11: Create staff members for organizations
        $this->command->info('Step 11: Creating staff members...');
        $this->call(StaffSeeder::class);

        // Step 12: Create students for organizations
        $this->command->info('Step 12: Creating students...');
        $this->call(StudentSeeder::class);

        // Step 13: Admit students to classes
        $this->command->info('Step 13: Admitting students to classes...');
        $this->call(StudentAdmissionSeeder::class);

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
     * Assign permissions to roles for all organizations (idempotent)
     */
    protected function assignPermissionsForAllOrganizations(): void
    {
        $organizations = DB::table('organizations')->whereNull('deleted_at')->get();
        foreach ($organizations as $organization) {
            $this->ensureRolesForOrganization($organization);
        }
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
            $this->command->info("Organization '{$name}' already exists. Ensuring roles exist...");
            // Ensure roles exist for existing organization
            $this->ensureRolesForOrganization((object) [
                'id' => $existing->id,
                'name' => $existing->name,
            ]);
            return (object) [
                'id' => $existing->id,
                'name' => $existing->name,
                'slug' => $existing->slug,
            ];
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
            } else {
                // Role exists, but ensure permissions are assigned
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
     * CRITICAL: Always ensures profile has correct organization_id and role assignment matches
     */
    protected function createUser(object $organization, array $userData): void
    {
        try {
            // Check if user already exists
            $existingUser = DB::table('users')
                ->where('email', $userData['email'])
                ->first();

            $userId = $existingUser ? $existingUser->id : (string) Str::uuid();
            $isNewUser = !$existingUser;

            if ($isNewUser) {
                // Create new user
                DB::table('users')->insert([
                    'id' => $userId,
                    'email' => $userData['email'],
                    'encrypted_password' => Hash::make($userData['password']),
                    'email_confirmed_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                // Create profile with correct organization_id
                DB::table('profiles')->insert([
                    'id' => $userId,
                    'email' => $userData['email'],
                    'full_name' => $userData['name'],
                    'role' => $userData['role'], // Keep for backward compatibility
                    'organization_id' => $organization->id, // CRITICAL: Always set organization_id
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                $this->command->info("  ✓ Created user: {$userData['email']}");
            } else {
                // User exists - ensure profile has correct organization_id
                $profile = DB::table('profiles')->where('id', $userId)->first();

                if (!$profile) {
                    // Profile missing - create it
                    DB::table('profiles')->insert([
                        'id' => $userId,
                        'email' => $userData['email'],
                        'full_name' => $userData['name'],
                        'role' => $userData['role'],
                        'organization_id' => $organization->id, // CRITICAL: Set organization_id
                        'is_active' => true,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                    $this->command->info("  ✓ Created missing profile for {$userData['email']}");
                } else {
                    // Profile exists - update organization_id if it's wrong or NULL
                    if ($profile->organization_id !== $organization->id) {
                        DB::table('profiles')
                            ->where('id', $userId)
                            ->update([
                                'organization_id' => $organization->id, // CRITICAL: Fix organization_id
                                'role' => $userData['role'], // Update role field for backward compatibility
                                'updated_at' => now(),
                            ]);
                        $this->command->info("  ✓ Updated profile organization_id for {$userData['email']}");
                    }
                }
            }

            // CRITICAL: Ensure roles exist for this organization before assigning
            $this->ensureRolesForOrganization($organization);

            // Get the role for this organization
            $role = DB::table('roles')
                ->where('name', $userData['role'])
                ->where('organization_id', $organization->id)
                ->where('guard_name', 'web')
                ->first();

            if (!$role) {
                $this->command->error("  ❌ Role '{$userData['role']}' not found for organization {$organization->name} (ID: {$organization->id})");
                $this->command->error("     User {$userData['email']} will NOT have permissions!");
                return;
            }

            // Check if role is already correctly assigned
            $hasCorrectRole = DB::table('model_has_roles')
                ->where('role_id', $role->id)
                ->where('model_type', 'App\\Models\\User')
                ->where('model_id', $userId)
                ->where('organization_id', $organization->id) // CRITICAL: Must match organization
                ->exists();

            if ($hasCorrectRole) {
                $this->command->info("  ✓ User {$userData['email']} already has {$userData['role']} role with correct organization_id");
            } else {
                // Check if user has ANY role assignment (might be wrong or NULL)
                $existingRoleAssignment = DB::table('model_has_roles')
                    ->where('model_type', 'App\\Models\\User')
                    ->where('model_id', $userId)
                    ->first();

                if ($existingRoleAssignment) {
                    // Delete incorrect role assignment(s)
                    DB::table('model_has_roles')
                        ->where('model_type', 'App\\Models\\User')
                        ->where('model_id', $userId)
                        ->delete();

                    $this->command->info("  ✓ Removed incorrect role assignment(s) for {$userData['email']}");
                }

                // Insert correct role assignment
                DB::table('model_has_roles')->insert([
                    'role_id' => $role->id,
                    'model_type' => 'App\\Models\\User',
                    'model_id' => $userId,
                    'organization_id' => $organization->id, // CRITICAL: Always set organization_id
                ]);

                $this->command->info("  ✓ Assigned {$userData['role']} role to {$userData['email']} (org: {$organization->id})");
            }
        } catch (\Exception $e) {
            $this->command->error("  ❌ Error processing user {$userData['email']}: " . $e->getMessage());
            $this->command->error("     Stack trace: " . $e->getTraceAsString());
        }
    }
}
