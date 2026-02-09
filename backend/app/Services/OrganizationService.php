<?php

namespace App\Services;

use App\Models\Organization;
use App\Models\SchoolBranding;
use App\Models\User;
use App\Models\Profile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

class OrganizationService
{
    /**
     * Create a new organization with admin user and default school
     *
     * @param array $organizationData Organization details
     * @param array $adminData Admin user details (email, password, full_name)
     * @return array ['organization' => Organization, 'admin_user' => User, 'school' => SchoolBranding]
     * @throws \Exception
     */
    public function createOrganizationWithAdmin(array $organizationData, array $adminData): array
    {
        try {
            return DB::transaction(function () use ($organizationData, $adminData) {
                // 1. Create the organization
                try {
                    $organization = Organization::create($organizationData);
                    error_log('Organization created: ' . $organization->id);
                    Log::info('Organization created', ['organization_id' => $organization->id]);
                } catch (\Exception $e) {
                    error_log('Failed to create organization in transaction: ' . $e->getMessage());
                    error_log('File: ' . $e->getFile() . ' Line: ' . $e->getLine());
                    Log::error('Failed to create organization in transaction', [
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString(),
                        'file' => $e->getFile(),
                        'line' => $e->getLine(),
                        'organization_data' => $organizationData,
                    ]);
                    throw $e;
                }

            // 2. Create default school for the organization
            $school = $this->createDefaultSchool($organization);

            Log::info('Default school created', [
                'organization_id' => $organization->id,
                'school_id' => $school->id
            ]);

            // 3. Create organization admin user
            $adminUser = $this->createOrganizationAdmin($organization, $school, $adminData);

            Log::info('Organization admin created', [
                'organization_id' => $organization->id,
                'admin_id' => $adminUser->id
            ]);

            // 4. Assign organization admin role and permissions
            $this->assignOrganizationAdminPermissions($adminUser, $organization);

            Log::info('Organization admin permissions assigned', [
                'organization_id' => $organization->id,
                'admin_id' => $adminUser->id
            ]);

                return [
                    'organization' => $organization,
                    'admin_user' => $adminUser,
                    'school' => $school,
                ];
            });
        } catch (\Exception $e) {
            // CRITICAL: Use error_log to ensure error is written even if Log::error fails
            error_log('OrganizationService error: ' . $e->getMessage());
            error_log('File: ' . $e->getFile() . ' Line: ' . $e->getLine());
            error_log('Trace: ' . $e->getTraceAsString());
            
            try {
                Log::error('Failed to create organization with admin', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'exception_class' => get_class($e),
                ]);
            } catch (\Exception $logException) {
                error_log('Failed to write to Laravel log: ' . $logException->getMessage());
            }
            throw $e;
        }
    }

    /**
     * Create a default school for the organization
     */
    protected function createDefaultSchool(Organization $organization): SchoolBranding
    {
        $school = SchoolBranding::create([
            'id' => (string) Str::uuid(),
            'organization_id' => $organization->id,
            'school_name' => $organization->name . ' - Main School',
            'school_address' => $organization->street_address,
            'school_phone' => $organization->phone,
            'school_email' => $organization->email,
            'school_website' => $organization->website,
            'is_active' => true,
            'primary_color' => '#1e40af', // Default blue
            'secondary_color' => '#64748b', // Default slate
            'accent_color' => '#0ea5e9', // Default sky
            'font_family' => 'Inter',
            'report_font_size' => 12,
            'table_alternating_colors' => true,
            'show_page_numbers' => true,
            'show_generation_date' => true,
            'calendar_preference' => 'gregorian',
        ]);

        // Create WebsiteSetting for public website resolution
        try {
            \App\Models\WebsiteSetting::firstOrCreate(
                [
                    'organization_id' => $organization->id,
                    'school_id' => $school->id,
                ],
                [
                    'school_slug' => 'school-' . substr($school->id, 0, 8),
                    'default_language' => 'ps',
                    'enabled_languages' => ['ps', 'en', 'ar', 'fa'],
                    'theme' => [
                        'primary_color' => '#1e40af',
                        'secondary_color' => '#64748b',
                        'accent_color' => '#0ea5e9',
                        'font_family' => 'Bahij Nassim',
                    ],
                    'is_public' => true,
                ]
            );
        } catch (\Exception $e) {
            Log::warning('Failed to create WebsiteSetting for new school', [
                'organization_id' => $organization->id,
                'school_id' => $school->id,
                'error' => $e->getMessage(),
            ]);
        }

        // Seed website pages and navigation for new school (in Pashto)
        try {
            $seeder = new \Database\Seeders\WebsitePagesAndNavigationSeeder();
            $seeder->seedForSchool($organization->id, $school->id, 'ps');
            
            Log::info('Website pages and navigation seeded for new school', [
                'organization_id' => $organization->id,
                'school_id' => $school->id,
            ]);
        } catch (\Exception $e) {
            // Log error but don't fail organization creation
            Log::warning('Failed to seed website pages and navigation for new school', [
                'organization_id' => $organization->id,
                'school_id' => $school->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }

        // Seed default admission rules for new school
        try {
            \Database\Seeders\SchoolAdmissionRulesSeeder::seedForSchool($organization->id, $school->id);
            
            Log::info('School admission rules seeded for new school', [
                'organization_id' => $organization->id,
                'school_id' => $school->id,
            ]);
        } catch (\Exception $e) {
            // Log error but don't fail organization creation
            Log::warning('Failed to seed school admission rules for new school', [
                'organization_id' => $organization->id,
                'school_id' => $school->id,
                'error' => $e->getMessage(),
            ]);
        }

        return $school;
    }

    /**
     * Create organization admin user
     */
    protected function createOrganizationAdmin(
        Organization $organization,
        SchoolBranding $school,
        array $adminData
    ): User {
        $userId = (string) Str::uuid();

        // Create user account
        $user = User::create([
            'id' => $userId,
            'email' => $adminData['email'],
            'encrypted_password' => Hash::make($adminData['password']),
        ]);

        // Create profile
        Profile::create([
            'id' => $userId,
            'email' => $adminData['email'],
            'full_name' => $adminData['full_name'] ?? 'Organization Administrator',
            'role' => 'organization_admin', // Deprecated field but kept for compatibility
            'organization_id' => $organization->id,
            'default_school_id' => $school->id,
            'is_active' => true,
            'is_event_user' => false,
        ]);

        return $user;
    }

    /**
     * Assign organization admin role and permissions to the user
     * CRITICAL: Assigns permissions to the role, not directly to the user
     * This ensures permissions are properly managed via role_has_permissions table
     */
    protected function assignOrganizationAdminPermissions(User $user, Organization $organization): void
    {
        // Set permission team to organization context for Spatie permissions
        // CRITICAL: Must set team context BEFORE assigning role or checking permissions
        setPermissionsTeamId($organization->id);

        // Find or create organization_admin role for this organization
        $role = Role::firstOrCreate(
            [
                'name' => 'organization_admin',
                'organization_id' => $organization->id,
                'guard_name' => 'web',
            ],
            [
                'description' => 'Organization Administrator - Full access to organization resources'
            ]
        );

        // CRITICAL: Set team context again before assigning role (Spatie requires this)
        setPermissionsTeamId($organization->id);
        
        // Assign role to user with organization context
        $user->assignRole($role);

        // CRITICAL: Ensure organization_id is set in model_has_roles table
        // Spatie's assignRole() might not automatically set organization_id
        $tableNames = config('permission.table_names');
        $modelHasRolesTable = $tableNames['model_has_roles'] ?? 'model_has_roles';
        $columnNames = config('permission.column_names');
        $modelMorphKey = $columnNames['model_morph_key'] ?? 'model_id';
        
        // Check if role assignment exists and update organization_id if needed
        $roleAssignment = DB::table($modelHasRolesTable)
            ->where($modelMorphKey, $user->id)
            ->where('model_type', 'App\\Models\\User')
            ->where('role_id', $role->id)
            ->first();
        
        if ($roleAssignment) {
            // Update organization_id if it's not set or incorrect
            if ($roleAssignment->organization_id !== $organization->id) {
                DB::table($modelHasRolesTable)
                    ->where($modelMorphKey, $user->id)
                    ->where('model_type', 'App\\Models\\User')
                    ->where('role_id', $role->id)
                    ->update(['organization_id' => $organization->id]);
                
                Log::info("Updated organization_id in model_has_roles", [
                    'user_id' => $user->id,
                    'role_id' => $role->id,
                    'organization_id' => $organization->id,
                ]);
            }
        } else {
            // If role assignment doesn't exist, create it manually
            DB::table($modelHasRolesTable)->insert([
                $modelMorphKey => $user->id,
                'model_type' => 'App\\Models\\User',
                'role_id' => $role->id,
                'organization_id' => $organization->id,
            ]);
            
            Log::info("Manually created role assignment in model_has_roles", [
                'user_id' => $user->id,
                'role_id' => $role->id,
                'organization_id' => $organization->id,
            ]);
        }
        
        // Verify role assignment
        $user->refresh();
        setPermissionsTeamId($organization->id);
        $hasRole = $user->hasRole($role);
        
        if (!$hasRole) {
            Log::error("Failed to assign organization_admin role to user", [
                'user_id' => $user->id,
                'role_id' => $role->id,
                'organization_id' => $organization->id,
            ]);
            throw new \Exception("Failed to assign organization_admin role to user");
        }
        
        Log::info("Organization admin role assigned to user", [
            'user_id' => $user->id,
            'role_id' => $role->id,
            'organization_id' => $organization->id,
        ]);

        // OrganizationObserver runs synchronously when Organization::create() is called
        // So permissions should already be created by now

        // Get all organization-scoped permissions
        // OrganizationObserver should have created them
        $orgPermissions = DB::table('permissions')
            ->where('organization_id', $organization->id)
            ->where('guard_name', 'web')
            ->pluck('id', 'name')
            ->toArray();

        // If permissions don't exist yet, create them manually
        // OrganizationObserver should have created them, but if not, create them here
        if (empty($orgPermissions)) {
            Log::warning("No permissions found for organization {$organization->name}. Creating them now...");
            
            // Import PermissionSeeder to create permissions
            $permissionSeeder = new \Database\Seeders\PermissionSeeder();
            $permissions = \Database\Seeders\PermissionSeeder::getPermissions();
            
            foreach ($permissions as $resource => $actions) {
                foreach ($actions as $action) {
                    $permissionName = "{$resource}.{$action}";
                    
                    // CRITICAL: Skip subscription.admin - it's GLOBAL only (not organization-scoped)
                    if ($permissionName === 'subscription.admin') {
                        continue;
                    }
                    
                    // Check if permission already exists
                    $exists = DB::table('permissions')
                        ->where('name', $permissionName)
                        ->where('guard_name', 'web')
                        ->where('organization_id', $organization->id)
                        ->exists();
                    
                    if (!$exists) {
                        DB::table('permissions')->insert([
                            'name' => $permissionName,
                            'guard_name' => 'web',
                            'organization_id' => $organization->id,
                            'resource' => $resource,
                            'action' => $action,
                            'description' => ucfirst($action) . ' ' . str_replace('_', ' ', $resource),
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }
                }
            }
            
            // Re-fetch permissions after creation
            $orgPermissions = DB::table('permissions')
                ->where('organization_id', $organization->id)
                ->where('guard_name', 'web')
                ->pluck('id', 'name')
                ->toArray();
            
            Log::info("Created " . count($orgPermissions) . " permissions for organization {$organization->name}");
        }

        // If still no permissions, log error and throw exception
        if (empty($orgPermissions)) {
            Log::error("No permissions found for organization {$organization->name} after creation attempt. Cannot assign permissions to role.");
            throw new \Exception("Failed to create permissions for organization {$organization->name}");
        }

        // Assign ALL organization permissions to the organization_admin role
        // CRITICAL: Use role_has_permissions table, not model_has_permissions
        // CRITICAL: Never assign subscription.admin - it's GLOBAL only (not organization-scoped)
        $tableNames = config('permission.table_names');
        $roleHasPermissionsTable = $tableNames['role_has_permissions'] ?? 'role_has_permissions';

        $assignedCount = 0;
        $skippedCount = 0;

        foreach ($orgPermissions as $permissionName => $permissionId) {
            // CRITICAL: Skip subscription.admin - it's GLOBAL only and should NEVER be assigned to organization roles
            if ($permissionName === 'subscription.admin') {
                Log::warning("Skipping subscription.admin permission - it's GLOBAL only and cannot be assigned to organization roles", [
                    'organization_id' => $organization->id,
                    'role_id' => $role->id,
                ]);
                continue;
            }

            // Check if permission already assigned to role
            $exists = DB::table($roleHasPermissionsTable)
                ->where('role_id', $role->id)
                ->where('permission_id', $permissionId)
                ->where('organization_id', $organization->id)
                ->exists();

            if (!$exists) {
                try {
                    DB::table($roleHasPermissionsTable)->insert([
                        'role_id' => $role->id,
                        'permission_id' => $permissionId,
                        'organization_id' => $organization->id,
                    ]);
                    $assignedCount++;
                } catch (\Exception $e) {
                    Log::warning("Failed to assign permission to role: $permissionName", [
                        'role_id' => $role->id,
                        'permission_id' => $permissionId,
                        'organization_id' => $organization->id,
                        'error' => $e->getMessage()
                    ]);
                }
            } else {
                $skippedCount++;
            }
        }

        Log::info("Organization admin role permissions assigned", [
            'organization_id' => $organization->id,
            'role_id' => $role->id,
            'assigned' => $assignedCount,
            'skipped' => $skippedCount,
        ]);

        // CRITICAL: Clear permission cache for user and globally
        // This ensures permissions are fresh when user logs in
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
        $user->refresh();
        
        // Verify permissions are accessible (test with a common permission)
        setPermissionsTeamId($organization->id);
        $testPermissionName = 'organizations.read';
        if (isset($orgPermissions[$testPermissionName])) {
            try {
                $hasPermission = $user->hasPermissionTo($testPermissionName);
                Log::info("Permission verification", [
                    'user_id' => $user->id,
                    'organization_id' => $organization->id,
                    'test_permission' => $testPermissionName,
                    'has_permission' => $hasPermission,
                ]);
            } catch (\Exception $e) {
                Log::warning("Permission verification failed", [
                    'user_id' => $user->id,
                    'organization_id' => $organization->id,
                    'test_permission' => $testPermissionName,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    /**
     * Get list of permissions for organization admin
     *
     * Organization admins get full access to their organization's resources
     * but cannot manage super admin functions
     */
    protected function getOrganizationAdminPermissions(Organization $organization): array
    {
        return [
            // Organization management (their own only)
            'organizations.read',
            'organizations.update',

            // User and permission management (within organization)
            'users.read',
            'users.create',
            'users.update',
            'users.delete',
            'permissions.read',
            'permissions.create',
            'permissions.update',
            'permissions.delete',
            'roles.read',
            'roles.create',
            'roles.update',
            'roles.delete',

            // School management
            'schools.read',
            'schools.create',
            'schools.update',
            'schools.delete',
            'schools.access_all',

            // Core features (available in all plans)
            'buildings.read',
            'buildings.create',
            'buildings.update',
            'buildings.delete',
            'rooms.read',
            'rooms.create',
            'rooms.update',
            'rooms.delete',
            'staff.read',
            'staff.create',
            'staff.update',
            'staff.delete',
            'staff_types.read',
            'staff_types.create',
            'staff_types.update',
            'staff_types.delete',
            'residency_types.read',
            'residency_types.create',
            'residency_types.update',
            'residency_types.delete',
            'staff_documents.read',
            'staff_documents.create',
            'staff_documents.update',
            'staff_documents.delete',
            'students.read',
            'students.create',
            'students.update',
            'students.delete',
            'students.import',
            'student_documents.read',
            'student_documents.create',
            'student_documents.update',
            'student_documents.delete',
            'student_educational_history.read',
            'student_educational_history.create',
            'student_educational_history.update',
            'student_educational_history.delete',
            'student_discipline_records.read',
            'student_discipline_records.create',
            'student_discipline_records.update',
            'student_discipline_records.delete',
            'classes.read',
            'classes.create',
            'classes.update',
            'classes.delete',
            'academic_years.read',
            'academic_years.create',
            'academic_years.update',
            'academic_years.delete',
            'attendance.read',
            'attendance.create',
            'attendance.update',
            'attendance.delete',

            // Feature-based permissions (requires subscription)
            // These will be checked against subscription features
            'subjects.read',
            'subjects.create',
            'subjects.update',
            'subjects.delete',
            'exams.read',
            'exams.create',
            'exams.update',
            'exams.delete',
            'timetables.read',
            'timetables.create',
            'timetables.update',
            'timetables.delete',
            'hostel.read',
            'hostel.create',
            'hostel.update',
            'hostel.delete',
            'library_books.read',
            'library_books.create',
            'library_books.update',
            'library_books.delete',
            'finance_accounts.read',
            'finance_accounts.create',
            'finance_accounts.update',
            'finance_accounts.delete',
            'fees.read',
            'fees.create',
            'fees.update',
            'fees.delete',
            'events.read',
            'events.create',
            'events.update',
            'events.delete',
            'dms.incoming.read',
            'dms.incoming.create',
            'dms.incoming.update',
            'dms.incoming.delete',
            'short_term_courses.read',
            'short_term_courses.create',
            'short_term_courses.update',
            'short_term_courses.delete',
            'assets.read',
            'assets.create',
            'assets.update',
            'assets.delete',
            'graduation_batches.read',
            'graduation_batches.create',
            'graduation_batches.update',
            'graduation_batches.delete',
            'id_cards.read',
            'id_cards.create',
            'id_cards.update',
            'id_cards.delete',
            'leave_requests.read',
            'leave_requests.create',
            'leave_requests.update',
            'leave_requests.delete',
        ];
    }
}
