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
            'subjects' => ['read', 'create', 'update', 'delete'],
            'report_templates' => ['read', 'create', 'update', 'delete'],
            'rooms' => ['read', 'create', 'update', 'delete'],
            'teachers' => ['read', 'create', 'update', 'delete'],
            'staff' => ['read', 'create', 'update', 'delete'],
            'students' => ['read', 'create', 'update', 'delete'],
            'classes' => ['read', 'create', 'update', 'delete'],
            'academic_years' => ['read', 'create', 'update', 'delete'],
            'schedule_slots' => ['read', 'create', 'update', 'delete'],
            'timetables' => ['read', 'create', 'update', 'delete', 'export'],
            'residency_types' => ['read', 'create', 'update', 'delete'],
            'school_branding' => ['read', 'create', 'update', 'delete'],
            'profiles' => ['read', 'create', 'update', 'delete'],
            'users' => ['read', 'create', 'update', 'delete'],
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
            'backup' => ['read'],
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
            ],
        ];
    }

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Log::info('Starting permission seeding from central PermissionSeeder');

        $permissions = self::getPermissions();
        $createdCount = 0;
        $skippedCount = 0;

        foreach ($permissions as $resource => $actions) {
            foreach ($actions as $action) {
                $permissionName = "{$resource}.{$action}";

                // Check if permission already exists
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
                    $createdCount++;
                    Log::info("Created permission: {$permissionName}");
                } else {
                    $skippedCount++;
                }
            }
        }

        Log::info("Permission seeding completed. Created: {$createdCount}, Skipped: {$skippedCount}");

        // Clear permission cache
        if (function_exists('app')) {
            app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
            Log::info('Permission cache cleared');
        }
    }
}

