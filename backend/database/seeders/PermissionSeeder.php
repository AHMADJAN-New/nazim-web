<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PermissionSeeder extends Seeder
{
    /**
     * Central definition of all permissions in the system
     * This is the single source of truth for permissions
     *
     * Format: 'resource' => ['action1', 'action2', ...]
     */
    public static function getPermissions(): array
    {
        return [
            'buildings' => ['read', 'create', 'update', 'delete'],
            'subjects' => ['read', 'create', 'update', 'delete', 'assign', 'copy'],
            'report_templates' => ['read', 'create', 'update', 'delete'],
            'rooms' => ['read', 'create', 'update', 'delete'],
            'teachers' => ['read', 'create', 'update', 'delete'],
            'staff' => ['read', 'create', 'update', 'delete'],
            'students' => ['read', 'create', 'update', 'delete'],
            'classes' => ['read', 'create', 'update', 'delete', 'assign', 'copy'],
            'academic_years' => ['read', 'create', 'update', 'delete'],
            'schedule_slots' => ['read', 'create', 'update', 'delete'],
            'timetables' => ['read', 'create', 'update', 'delete', 'export'],
            'residency_types' => ['read', 'create', 'update', 'delete'],
            'school_branding' => ['read', 'create', 'update', 'delete'],
            'schools' => ['read', 'create', 'update', 'delete', 'access_all'],
            'profiles' => ['read', 'create', 'update', 'delete'],
            'users' => ['read', 'create', 'update', 'delete', 'reset_password'],
            'organizations' => ['read', 'create', 'update', 'delete'],
            'staff_types' => ['read', 'create', 'update', 'delete'],
            'staff_documents' => ['read', 'create', 'update', 'delete'],
            'student_admissions' => ['read', 'create', 'update', 'delete'],
            'student_discipline_records' => ['read', 'create', 'update', 'delete'],
            'student_documents' => ['read', 'create', 'update', 'delete'],
            'student_educational_history' => ['read', 'create', 'update', 'delete'],
            'teacher_subject_assignments' => ['read', 'create', 'update', 'delete'],
            'teacher_timetable_preferences' => ['read', 'create', 'update', 'delete'],
            'roles' => ['read', 'create', 'update', 'delete'],
            'permissions' => ['read', 'create', 'update', 'delete'],
        ];
    }

    /**
     * Default role permission assignments
     *
     * Format: 'role_name' => ['permission1', 'permission2', ...] or '*' for all permissions
     */
    public static function getRolePermissions(): array
    {
        return [
            'admin' => '*', // All permissions
            'staff' => [
                // Staff can read most things, create/update limited
                'students.read', 'students.create', 'students.update',
                'staff.read',
                'classes.read',
                'subjects.read',
                'academic_years.read',
                'profiles.read', 'profiles.update',
                'student_admissions.read', 'student_admissions.create',
            ],
            'teacher' => [
                // Teachers can read and manage academic content
                'students.read',
                'classes.read',
                'subjects.read', 'subjects.create', 'subjects.update',
                'timetables.read',
                'schedule_slots.read',
                'academic_years.read',
                'profiles.read', 'profiles.update',
                'teacher_subject_assignments.read', 'teacher_subject_assignments.create',
                // Basic read permissions for dashboard and navigation
                'organizations.read', // Needed to view organization info
                'rooms.read', // Needed for dashboard stats
                'buildings.read', // Needed for dashboard stats
                'staff.read', // Needed to view staff members
                'school_branding.read', // Needed to view schools
            ],
        ];
    }

    /**
     * Run the database seeds.
     * Creates permissions in two ways:
     * 1. Global permissions (organization_id = NULL) - available to all organizations
     * 2. Organization-specific permissions - copies for each organization
     */
    public function run(): void
    {
        Log::info('Starting permission seeding from central PermissionSeeder');

        $permissions = self::getPermissions();
        $globalCreatedCount = 0;
        $globalSkippedCount = 0;
        $orgCreatedCount = 0;
        $orgSkippedCount = 0;

        // Step 1: Create global permissions (organization_id = NULL)
        Log::info('Step 1: Creating global permissions...');
        foreach ($permissions as $resource => $actions) {
            foreach ($actions as $action) {
                $permissionName = "{$resource}.{$action}";

                // Check if global permission already exists
                $exists = DB::table('permissions')
                    ->where('name', $permissionName)
                    ->where('guard_name', 'web')
                    ->whereNull('organization_id')
                    ->exists();

                if (!$exists) {
                    DB::table('permissions')->insert([
                        'name' => $permissionName,
                        'guard_name' => 'web',
                        'organization_id' => null, // Global permissions
                        'resource' => $resource,
                        'action' => $action,
                        'description' => ucfirst($action) . ' ' . str_replace('_', ' ', $resource),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                    $globalCreatedCount++;
                    Log::info("Created global permission: {$permissionName}");
                } else {
                    $globalSkippedCount++;
                }
            }
        }

        Log::info("Global permissions: Created: {$globalCreatedCount}, Skipped: {$globalSkippedCount}");

        // Step 2: Create organization-specific permissions for each organization
        Log::info('Step 2: Creating organization-specific permissions...');
        $organizations = DB::table('organizations')
            ->whereNull('deleted_at')
            ->get();

        if ($organizations->isEmpty()) {
            Log::info('No organizations found. Skipping organization-specific permission creation.');
        } else {
            Log::info("Found {$organizations->count()} organization(s). Creating permissions for each...");

            foreach ($organizations as $organization) {
                Log::info("Creating permissions for organization: {$organization->name} (ID: {$organization->id})");

                foreach ($permissions as $resource => $actions) {
                    foreach ($actions as $action) {
                        $permissionName = "{$resource}.{$action}";

                        // Check if organization-specific permission already exists
                        $exists = DB::table('permissions')
                            ->where('name', $permissionName)
                            ->where('guard_name', 'web')
                            ->where('organization_id', $organization->id)
                            ->exists();

                        if (!$exists) {
                            DB::table('permissions')->insert([
                                'name' => $permissionName,
                                'guard_name' => 'web',
                                'organization_id' => $organization->id, // Organization-specific permissions
                                'resource' => $resource,
                                'action' => $action,
                                'description' => ucfirst($action) . ' ' . str_replace('_', ' ', $resource),
                                'created_at' => now(),
                                'updated_at' => now(),
                            ]);
                            $orgCreatedCount++;
                        } else {
                            $orgSkippedCount++;
                        }
                    }
                }

                Log::info("  ✓ Completed permissions for {$organization->name}");
            }
        }

        Log::info("Permission seeding completed:");
        Log::info("  Global permissions - Created: {$globalCreatedCount}, Skipped: {$globalSkippedCount}");
        Log::info("  Organization permissions - Created: {$orgCreatedCount}, Skipped: {$orgSkippedCount}");

        // Clear permission cache
        if (function_exists('app')) {
            app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
            Log::info('Permission cache cleared');
        }
    }
}

