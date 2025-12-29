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
        return DB::transaction(function () use ($organizationData, $adminData) {
            // 1. Create the organization
            $organization = Organization::create($organizationData);

            Log::info('Organization created', ['organization_id' => $organization->id]);

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
    }

    /**
     * Create a default school for the organization
     */
    protected function createDefaultSchool(Organization $organization): SchoolBranding
    {
        return SchoolBranding::create([
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

        // Assign role to user
        $user->assignRole($role);

        // Wait for OrganizationObserver to create permissions (if not already created)
        // Get all organization-scoped permissions
        $orgPermissions = DB::table('permissions')
            ->where('organization_id', $organization->id)
            ->where('guard_name', 'web')
            ->pluck('id', 'name')
            ->toArray();

        // If permissions don't exist yet, wait a moment and retry
        // OrganizationObserver should have created them, but if not, trigger it
        if (empty($orgPermissions)) {
            Log::warning("No permissions found for organization {$organization->name}. Waiting for OrganizationObserver...");
            // Give observer time to run (observer runs synchronously, but just in case)
            sleep(1);
            $orgPermissions = DB::table('permissions')
                ->where('organization_id', $organization->id)
                ->where('guard_name', 'web')
                ->pluck('id', 'name')
                ->toArray();
        }

        // If still no permissions, log error but continue
        if (empty($orgPermissions)) {
            Log::error("No permissions found for organization {$organization->name} after waiting. Permissions may not be assigned correctly.");
        }

        // Assign ALL organization permissions to the organization_admin role
        // CRITICAL: Use role_has_permissions table, not model_has_permissions
        $tableNames = config('permission.table_names');
        $roleHasPermissionsTable = $tableNames['role_has_permissions'] ?? 'role_has_permissions';

        $assignedCount = 0;
        $skippedCount = 0;

        foreach ($orgPermissions as $permissionName => $permissionId) {
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
                        'created_at' => now(),
                        'updated_at' => now(),
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

        // Clear permission cache
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
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
