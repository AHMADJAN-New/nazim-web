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
     * - Platform admin user with test organization
     */
    public function run(): void
    {
        $this->command->info('Starting database seeding...');

        // Step 0: Seed subscription plans (required for new organizations)
        $this->command->info('Step 0: Seeding subscription plans...');
        $this->call(SubscriptionSeeder::class);

        // Step 1: Seed permissions first (required for roles)
        $this->command->info('Step 1: Seeding permissions...');
        $this->call(PermissionSeeder::class);

        // Step 1a: Seed platform admin user (platform admin access)
        $this->command->info('Step 1a: Seeding platform admin user...');
        $this->call(PlatformAdminSeeder::class);

        // Step 1b: Seed residency types (lookup table)
        $this->command->info('Step 1b: Seeding residency types...');
        $this->call(ResidencyTypeSeeder::class);

        // Step 2: Ensure role permissions for all organizations (idempotent)
        $this->command->info('Step 2b: Ensuring role permissions for all organizations...');
        $this->assignPermissionsForAllOrganizations();

        // Step 2b2: Seed DMS security levels for all organizations
        $this->command->info('Step 2b2: Seeding DMS security levels...');
        $this->call(SecurityLevelSeeder::class);

        // Step 2b3: Seed DMS document settings for all organizations
        $this->command->info('Step 2b3: Seeding DMS document settings...');
        $this->call(DocumentSettingsSeeder::class);

        // Step 2b4: Seed DMS letter types for all organizations
        $this->command->info('Step 2b4: Seeding DMS letter types...');
        $this->call(LetterTypeSeeder::class);

        // Step 2c: Seed library categories for all organizations
        $this->command->info('Step 2c: Seeding library categories...');
        $this->call(LibraryCategorySeeder::class);

        // Step 2d: Seed library books for all organizations
        $this->command->info('Step 2d: Seeding library books...');
        $this->call(LibraryBookSeeder::class);

        // Step 2e: Seed asset categories for all organizations
        $this->command->info('Step 2e: Seeding asset categories...');
        $this->call(AssetCategorySeeder::class);

        // Step 2f: Seed assets for all organizations
        $this->command->info('Step 2f: Seeding assets...');
        $this->call(AssetSeeder::class);

        // Step 2g: Seed grades for all organizations
        $this->command->info('Step 2g: Seeding grades...');
        $this->call(GradeSeeder::class);

        // Step 3: Create schools for organizations
        $this->command->info('Step 5: Creating schools...');
        $this->call(SchoolBrandingSeeder::class);

        // Step 5a: Seed staff types (must run AFTER schools are created)
        $this->command->info('Step 5a: Seeding staff types...');
        $this->call(StaffTypeSeeder::class);

        // Step 6: Create buildings for schools
        $this->command->info('Step 6: Creating buildings...');
        $this->call(BuildingSeeder::class);

        // Step 7: Create rooms for buildings
        $this->command->info('Step 7: Creating rooms...');
        $this->call(RoomSeeder::class);

        // Step 8: Create academic years for organizations
        $this->command->info('Step 8: Creating academic years...');
        $this->call(AcademicYearSeeder::class);

        // Step 8a: Create exams for organizations
        $this->command->info('Step 8a: Creating exams...');
        $this->call(ExamSeeder::class);

        // Step 8b: Create schedule slots for organizations
        $this->command->info('Step 8b: Creating schedule slots...');
        $this->call(ScheduleSlotSeeder::class);

        // Step 9: Create classes for organizations
        $this->command->info('Step 9: Creating classes...');
        $this->call(ClassSeeder::class);

        // Step 10: Create subjects for organizations
        $this->command->info('Step 10: Creating subjects...');
        $this->call(SubjectSeeder::class);

        // Step 10a: Assign classes to academic years and assign subjects
        $this->command->info('Step 10a: Assigning classes to academic years and subjects...');
        $this->call(ClassAcademicYearSubjectSeeder::class);

        // Step 10b: Create questions for subjects
        $this->command->info('Step 10b: Creating questions for subjects...');
        $this->call(QuestionSeeder::class);

        // Step 11: Create staff members for organizations
        $this->command->info('Step 11: Creating staff members...');
        $this->call(StaffSeeder::class);

        // Step 12: Create students for organizations
        $this->command->info('Step 12: Creating students...');
        $this->call(StudentSeeder::class);

        // Step 13: Admit students to classes
        $this->command->info('Step 13: Admitting students to classes...');
        $this->call(StudentAdmissionSeeder::class);

        // Step 14: Create short-term courses
        $this->command->info('Step 14: Creating short-term courses...');
        $this->call(CourseSeeder::class);

        // Step 15: Create event test users (check-in, add guest, both)
        $this->command->info('Step 15: Creating event test users...');
        $this->call(EventTestUsersSeeder::class);

        // Step 15: Enroll students in courses
        $this->command->info('Step 15: Enrolling students in courses...');
        $this->call(CourseStudentSeeder::class);

        // Step 16: Seed currencies for all organizations
        $this->command->info('Step 16: Seeding currencies...');
        $this->call(CurrencySeeder::class);

        // Step 17: Seed income categories for all organizations
        $this->command->info('Step 17: Seeding income categories...');
        $this->call(IncomeCategorySeeder::class);

        // Step 18: Seed expense categories for all organizations
        $this->command->info('Step 18: Seeding expense categories...');
        $this->call(ExpenseCategorySeeder::class);

        // Step 19: Seed finance accounts for all organizations
        $this->command->info('Step 19: Seeding finance accounts...');
        $this->call(FinanceAccountSeeder::class);

        // Step 20: Seed exchange rates for all organizations
        $this->command->info('Step 20: Seeding exchange rates...');
        $this->call(ExchangeRateSeeder::class);

        // Step 21: Seed donors for all organizations
        $this->command->info('Step 21: Seeding donors...');
        $this->call(DonorSeeder::class);

        // Step 22: Seed finance projects for all organizations
        $this->command->info('Step 22: Seeding finance projects...');
        $this->call(FinanceProjectSeeder::class);

        // Step 23: Seed incoming documents for all organizations
        $this->command->info('Step 23: Seeding incoming documents...');
        $this->call(IncomingDocumentSeeder::class);

        // Step 24: Seed outgoing documents for all organizations
        $this->command->info('Step 24: Seeding outgoing documents...');
        $this->call(OutgoingDocumentSeeder::class);

        // Step 25: Seed fee structures for all organizations
        $this->command->info('Step 25: Seeding fee structures...');
        $this->call(FeeStructureSeeder::class);

        // Step 26: Seed fee assignments for all organizations
        $this->command->info('Step 26: Seeding fee assignments...');
        $this->call(FeeAssignmentSeeder::class);

        $this->command->info('');
        $this->command->info('✅ Database seeding completed successfully!');
        $this->command->info('');
        $this->command->info('Platform Admin user:');
        $this->command->info('  - platform-admin@nazim.app / platform-admin-123 (Platform Admin)');
        $this->command->info('  Access at: /platform/login');
        $this->command->info('');
        $this->command->info('Platform admin has a test organization with full access for testing app functionality.');
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
     * CRITICAL: Uses organization-specific permissions (NOT global permissions)
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

        // CRITICAL: Get organization-specific permissions (NOT global)
        // OrganizationObserver should have created these when the organization was created
        $orgPermissions = DB::table('permissions')
            ->where('organization_id', $organizationId)
            ->where('guard_name', 'web')
            ->get()
            ->keyBy('name');

        if ($orgPermissions->isEmpty()) {
            $this->command->warn("  ⚠ No organization-specific permissions found for organization {$organizationId}.");
            $this->command->warn("     Permissions should be created by OrganizationObserver when organization is created.");
            $this->command->warn("     Skipping permission assignment for {$roleName} role.");
            return;
        }

        $assignedCount = 0;
        $skippedCount = 0;

        if ($permissionList === '*') {
            // Admin gets all organization permissions (except subscription.admin - it's global only)
            foreach ($orgPermissions as $permission) {
                // CRITICAL: Skip subscription.admin - it's GLOBAL only and should NEVER be assigned to organization roles
                if ($permission->name === 'subscription.admin') {
                    continue;
                }

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
                } else {
                    $skippedCount++;
                }
            }
        } else {
            // Assign specific permissions
            foreach ($permissionList as $permissionName) {
                // CRITICAL: Skip subscription.admin - it's GLOBAL only
                if ($permissionName === 'subscription.admin') {
                    continue;
                }

                $permission = $orgPermissions->get($permissionName);
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
                    } else {
                        $skippedCount++;
                    }
                } else {
                    $this->command->warn("  ⚠ Permission '{$permissionName}' not found for organization {$organizationId}");
                }
            }
        }

        if ($assignedCount > 0 || $skippedCount > 0) {
            $this->command->info("  ✓ Role '{$roleName}': Assigned {$assignedCount} permissions, Skipped {$skippedCount} existing");
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

                // Get highest clearance level for admin users
                $clearanceLevelKey = null;
                if ($userData['role'] === 'admin') {
                    $topSecretLevel = DB::table('security_levels')
                        ->where('organization_id', $organization->id)
                        ->where('key', 'top_secret')
                        ->where('active', true)
                        ->first();
                    if ($topSecretLevel) {
                        $clearanceLevelKey = $topSecretLevel->key;
                    }
                }

                // Create profile with correct organization_id
                DB::table('profiles')->insert([
                    'id' => $userId,
                    'email' => $userData['email'],
                    'full_name' => $userData['name'],
                    'role' => $userData['role'], // Keep for backward compatibility
                    'organization_id' => $organization->id, // CRITICAL: Always set organization_id
                    'clearance_level_key' => $clearanceLevelKey, // Assign top_secret clearance to admins
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                $this->command->info("  ✓ Created user: {$userData['email']}");
            } else {
                // User exists - ensure profile has correct organization_id
                $profile = DB::table('profiles')->where('id', $userId)->first();

                if (!$profile) {
                    // Get highest clearance level for admin users
                    $clearanceLevelKey = null;
                    if ($userData['role'] === 'admin') {
                        $topSecretLevel = DB::table('security_levels')
                            ->where('organization_id', $organization->id)
                            ->where('key', 'top_secret')
                            ->where('active', true)
                            ->first();
                        if ($topSecretLevel) {
                            $clearanceLevelKey = $topSecretLevel->key;
                        }
                    }

                    // Profile missing - create it
                    DB::table('profiles')->insert([
                        'id' => $userId,
                        'email' => $userData['email'],
                        'full_name' => $userData['name'],
                        'role' => $userData['role'],
                        'organization_id' => $organization->id, // CRITICAL: Set organization_id
                        'clearance_level_key' => $clearanceLevelKey, // Assign top_secret clearance to admins
                        'is_active' => true,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                    $this->command->info("  ✓ Created missing profile for {$userData['email']}");
                } else {
                    // Profile exists - update organization_id and clearance if needed
                    $updates = [];
                    if ($profile->organization_id !== $organization->id) {
                        $updates['organization_id'] = $organization->id;
                    }
                    if ($userData['role'] === 'admin' && !$profile->clearance_level_key) {
                        // Assign top_secret clearance to admin users who don't have it
                        $topSecretLevel = DB::table('security_levels')
                            ->where('organization_id', $organization->id)
                            ->where('key', 'top_secret')
                            ->where('active', true)
                            ->first();
                        if ($topSecretLevel) {
                            $updates['clearance_level_key'] = $topSecretLevel->key;
                        }
                    }
                    if (!empty($updates)) {
                        $updates['role'] = $userData['role']; // Update role field for backward compatibility
                        $updates['updated_at'] = now();
                        DB::table('profiles')
                            ->where('id', $userId)
                            ->update($updates);
                        $this->command->info("  ✓ Updated profile for {$userData['email']}");
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
