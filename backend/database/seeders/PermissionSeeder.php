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
            'assets' => ['read', 'create', 'update', 'delete'],
            'asset_categories' => ['read', 'create', 'update', 'delete'],
            'buildings' => ['read', 'create', 'update', 'delete'],
            'subjects' => ['read', 'create', 'update', 'delete', 'assign', 'copy'],
            'report_templates' => ['read', 'create', 'update', 'delete'],
            'rooms' => ['read', 'create', 'update', 'delete'],
            'teachers' => ['read', 'create', 'update', 'delete'],
            'staff' => ['read', 'create', 'update', 'delete'],
            'students' => ['read', 'create', 'update', 'delete'],
            'classes' => ['read', 'create', 'update', 'delete', 'assign', 'copy'],
            'academic_years' => ['read', 'create', 'update', 'delete'],
            'grades' => ['read', 'create', 'update', 'delete'],
            // Exam permissions - granular control for different exam operations
            'exams' => [
                'read',           // View exams
                'create',         // Create new exams
                'update',         // Edit exam details
                'delete',         // Delete exams
                'assign',         // Assign classes to exams
                'manage',         // Manage exam configuration (classes, subjects)
                'manage_timetable', // Create/edit exam timetable
                'enroll_students',  // Enroll/unenroll students
                'enter_marks',      // Enter and edit marks
                'view_reports',     // View exam reports (summary, class reports, student reports)
                'view_grade_cards', // View and generate grade cards
                'view_consolidated_reports', // View consolidated mark sheets
                'view_class_reports', // View class-specific reports
                'view_student_reports', // View individual student reports
                'manage_attendance', // Mark/update/delete attendance records
                'view_attendance_reports', // View attendance reports
                'roll_numbers.read',    // View roll numbers
                'roll_numbers.assign',  // Assign/edit roll numbers
                'secret_numbers.read',  // View secret numbers
                'secret_numbers.assign', // Assign/edit secret numbers
                'numbers.print',        // Print roll slips and secret labels
            ],
            'exam_classes' => ['read', 'create', 'update', 'delete'],
            'exam_subjects' => ['read', 'create', 'update', 'delete'],
            'exam_students' => ['read', 'create', 'update', 'delete'],
            'exam_results' => ['read', 'create', 'update', 'delete'],
            'exam_times' => ['read', 'create', 'update', 'delete'],
            'schedule_slots' => ['read', 'create', 'update', 'delete'],
            'timetables' => ['read', 'create', 'update', 'delete', 'export'],
            'hostel' => ['read', 'create', 'update', 'delete'],
            'reports' => ['read'],
            'residency_types' => ['read', 'create', 'update', 'delete'],
            'school_branding' => ['read', 'create', 'update', 'delete'],
            'schools' => ['read', 'create', 'update', 'delete', 'access_all'],
            'profiles' => ['read', 'create', 'update', 'delete'],
            'users' => ['read', 'create', 'update', 'delete', 'reset_password'],
            'organizations' => ['read', 'create', 'update', 'delete'],
            'staff_types' => ['read', 'create', 'update', 'delete'],
            'staff_documents' => ['read', 'create', 'update', 'delete'],
            'student_admissions' => ['read', 'create', 'update', 'delete', 'report'],
            'student_discipline_records' => ['read', 'create', 'update', 'delete'],
            'student_documents' => ['read', 'create', 'update', 'delete'],
            'student_educational_history' => ['read', 'create', 'update', 'delete'],
            'teacher_subject_assignments' => ['read', 'create', 'update', 'delete'],
            'teacher_timetable_preferences' => ['read', 'create', 'update', 'delete'],
            'roles' => ['read', 'create', 'update', 'delete'],
            'permissions' => ['read', 'create', 'update', 'delete'],
            'attendance_sessions' => ['read', 'create', 'update', 'delete', 'report'],
            'leave_requests' => ['read', 'create', 'update', 'delete'],
            'student_reports' => ['read', 'export'],
            'library_categories' => ['read', 'create', 'update', 'delete'],
            'library_books' => ['read', 'create', 'update', 'delete'],
            'library_loans' => ['read', 'create', 'update'],
            'staff_reports' => ['read', 'export'],
            'short_term_courses' => ['read', 'create', 'update', 'delete', 'close'],
            'course_students' => ['read', 'create', 'update', 'delete', 'enroll_from_main', 'copy_to_main', 'report'],
            'course_student_discipline_records' => ['read', 'create', 'update', 'delete'],
            'course_attendance' => ['read', 'create', 'update', 'delete'],
            'certificate_templates' => ['read', 'create', 'update', 'delete', 'activate', 'deactivate'],
            'exam_types' => ['read', 'create', 'update', 'delete'],
            'graduation_batches' => ['read', 'create', 'generate_students', 'approve', 'issue'],
            'issued_certificates' => ['read'],
            'certificates' => ['issue', 'print', 'revoke'],
            'course_documents' => ['read', 'create', 'update', 'delete'],
            'exam_documents' => ['read', 'create', 'update', 'delete'],
            // ID Cards permissions
            'id_cards' => ['read', 'create', 'update', 'delete', 'export'],
            // Finance Module permissions
            'finance_accounts' => ['read', 'create', 'update', 'delete'],
            'income_entries' => ['read', 'create', 'update', 'delete'],
            'income_categories' => ['read', 'create', 'update', 'delete'],
            'expense_entries' => ['read', 'create', 'update', 'delete'],
            'expense_categories' => ['read', 'create', 'update', 'delete'],
            'finance_projects' => ['read', 'create', 'update', 'delete'],
            'donors' => ['read', 'create', 'update', 'delete'],
            'finance_reports' => ['read'],
            'fees' => ['read', 'create', 'update', 'delete'],
            'fees.payments' => ['create'],
            'fees.exceptions' => ['create', 'approve'],
            // Legacy finance permissions (kept for backward compatibility)
            'finance_income' => ['read', 'create', 'update', 'delete'],
            'finance_expense' => ['read', 'create', 'update', 'delete'],
            'finance_donors' => ['read', 'create', 'update', 'delete'],
            // Currency and Exchange Rate permissions
            'currencies' => ['read', 'create', 'update', 'delete'],
            'exchange_rates' => ['read', 'create', 'update', 'delete'],
            // Document Management System (DMS) permissions
            'dms.incoming' => ['read', 'create', 'update', 'delete'],
            'dms.outgoing' => ['read', 'create', 'update', 'delete', 'generate_pdf'],
            'dms.templates' => ['read', 'create', 'update', 'delete'],
            'dms.letterheads' => ['read', 'create', 'update', 'delete', 'manage'],
            'dms.letter_types' => ['read', 'create', 'update', 'delete'],
            'dms.departments' => ['read', 'create', 'update', 'delete'],
            'dms.files' => ['read', 'create', 'update', 'delete', 'download'],
            'dms.reports' => ['read'],
            'dms.settings' => ['read', 'manage'],
            'dms.archive' => ['read', 'search'],
            // Question Bank & Exam Papers
            'exams.questions' => ['read', 'create', 'update', 'delete'],
            'exams.papers' => ['read', 'create', 'update', 'delete'],
            // ID Cards
            'id_cards' => ['read', 'create', 'update', 'delete', 'export'],
            // Events Module
            'events' => ['read', 'create', 'update', 'delete'],
            'event_types' => ['read', 'create', 'update', 'delete'],
            'event_guests' => ['read', 'create', 'update', 'delete', 'import', 'checkin'],
            'event_checkins' => ['read', 'create', 'update', 'delete'],
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
                // Exam permissions for staff - can manage enrollment and view reports
                'exams.read', 'exams.assign', 'exams.manage', 'exams.enroll_students', 'exams.view_reports',
                'exams.view_grade_cards', 'exams.view_consolidated_reports', 'exams.view_class_reports', 'exams.view_student_reports',
                'exams.view_attendance_reports', // Can view attendance reports
                'exams.roll_numbers.read', 'exams.secret_numbers.read', // Can view exam numbers
                'exam_classes.read', 'exam_classes.create', 'exam_classes.update',
                'exam_subjects.read', 'exam_subjects.create', 'exam_subjects.update',
                'exam_students.read', 'exam_students.create', 'exam_students.update',
                'exam_results.read', 'exam_results.create', 'exam_results.update',
                'exam_times.read',
                'academic_years.read',
                'grades.read', 'grades.create', 'grades.update', 'grades.delete',
                'profiles.read', 'profiles.update',
                'student_admissions.read', 'student_admissions.create',
                'assets.read', 'assets.create', 'assets.update', 'assets.delete', // Full asset management access
                'asset_categories.read', 'asset_categories.create', 'asset_categories.update', 'asset_categories.delete', // Asset category management
                // DMS permissions for staff - can manage documents, create letters
                'dms.incoming.read', 'dms.incoming.create', 'dms.incoming.update',
                'dms.outgoing.read', 'dms.outgoing.create', 'dms.outgoing.update', 'dms.outgoing.generate_pdf',
                'dms.templates.read', 'dms.templates.create', 'dms.templates.update',
                'dms.letterheads.read',
                'dms.letter_types.read', 'dms.letter_types.create', 'dms.letter_types.update',
                'dms.departments.read',
                'dms.files.read', 'dms.files.create', 'dms.files.download',
                'dms.reports.read',
                'dms.archive.read', 'dms.archive.search',
                'dms.settings.read',
                // Question Bank & Papers - read only for staff
                'exams.questions.read', 'exams.papers.read',
                // Exam Documents - full access for staff
                'exam_documents.read', 'exam_documents.create', 'exam_documents.update', 'exam_documents.delete',
                // ID Cards - read, create, and export for staff
                'id_cards.read', 'id_cards.create', 'id_cards.export',
                // Events Module - full access for staff
                'events.read', 'events.create', 'events.update', 'events.delete',
                'event_types.read', 'event_types.create', 'event_types.update', 'event_types.delete',
                'event_guests.read', 'event_guests.create', 'event_guests.update', 'event_guests.delete', 'event_guests.import', 'event_guests.checkin',
                'event_checkins.read', 'event_checkins.create', 'event_checkins.update', 'event_checkins.delete',
            ],
            'teacher' => [
                // Teachers can read and manage academic content
                'students.read',
                'classes.read',
                'subjects.read', 'subjects.create', 'subjects.update',
                // Exam permissions for teachers - full exam management including marks entry and attendance
                'exams.read', 'exams.create', 'exams.update', 'exams.assign', 'exams.manage',
                'exams.manage_timetable', 'exams.enroll_students', 'exams.enter_marks', 'exams.view_reports',
                'exams.view_grade_cards', 'exams.view_consolidated_reports', 'exams.view_class_reports', 'exams.view_student_reports',
                'exams.manage_attendance', 'exams.view_attendance_reports', // Attendance permissions
                'exams.roll_numbers.read', 'exams.roll_numbers.assign', // Roll number permissions
                'exams.secret_numbers.read', 'exams.secret_numbers.assign', // Secret number permissions
                'exams.numbers.print', // Print roll slips and secret labels
                'exam_classes.read', 'exam_classes.create', 'exam_classes.update',
                'exam_subjects.read', 'exam_subjects.create', 'exam_subjects.update',
                'exam_students.read', 'exam_students.create', 'exam_students.update',
                'exam_results.read', 'exam_results.create', 'exam_results.update',
                'exam_times.read', 'exam_times.create', 'exam_times.update',
                'exam_documents.read', 'exam_documents.create', 'exam_documents.update', 'exam_documents.delete',
                'timetables.read',
                'schedule_slots.read',
                'academic_years.read',
                'grades.read', 'grades.create', 'grades.update', 'grades.delete',
                'profiles.read', 'profiles.update',
                'teacher_subject_assignments.read', 'teacher_subject_assignments.create',
                'attendance_sessions.read', 'attendance_sessions.create', 'attendance_sessions.update',
                'leave_requests.read', 'leave_requests.create', 'leave_requests.update',
                // Basic read permissions for dashboard and navigation
                'organizations.read', // Needed to view organization info
                'rooms.read', // Needed for dashboard stats
                'buildings.read', // Needed for dashboard stats
                'staff.read', // Needed to view staff members
                'school_branding.read', // Needed to view schools
                'assets.read', 'assets.create', 'assets.update', 'assets.delete', // Full asset management access
                'asset_categories.read', 'asset_categories.create', 'asset_categories.update', 'asset_categories.delete', // Asset category management
                // DMS permissions for teachers - can read documents, create letters for students
                'dms.incoming.read',
                'dms.outgoing.read', 'dms.outgoing.create', 'dms.outgoing.generate_pdf',
                'dms.templates.read',
                'dms.letterheads.read',
                'dms.letter_types.read',
                'dms.departments.read',
                'dms.files.read', 'dms.files.download',
                'dms.reports.read',
                'dms.archive.read', 'dms.archive.search',
                'dms.settings.read',
                // Question Bank & Papers - full access for teachers
                'exams.questions.read', 'exams.questions.create', 'exams.questions.update', 'exams.questions.delete',
                'exams.papers.read', 'exams.papers.create', 'exams.papers.update', 'exams.papers.delete',
                // ID Cards - full access for teachers
                'id_cards.read', 'id_cards.create', 'id_cards.update', 'id_cards.delete', 'id_cards.export',
            ],
            'exam_controller' => [
                // Dedicated exam controller role - full exam management except deletion
                'students.read',
                'classes.read',
                'subjects.read',
                'exams.read', 'exams.create', 'exams.update', 'exams.assign', 'exams.manage',
                'exams.manage_timetable', 'exams.enroll_students', 'exams.enter_marks', 'exams.view_reports',
                'exams.view_grade_cards', 'exams.view_consolidated_reports', 'exams.view_class_reports', 'exams.view_student_reports',
                'exams.manage_attendance', 'exams.view_attendance_reports', // Full attendance management
                'exams.roll_numbers.read', 'exams.roll_numbers.assign', // Roll number permissions
                'exams.secret_numbers.read', 'exams.secret_numbers.assign', // Secret number permissions
                'exams.numbers.print', // Print roll slips and secret labels
                'exam_classes.read', 'exam_classes.create', 'exam_classes.update',
                'exam_subjects.read', 'exam_subjects.create', 'exam_subjects.update',
                'exam_students.read', 'exam_students.create', 'exam_students.update', 'exam_students.delete',
                'exam_results.read', 'exam_results.create', 'exam_results.update',
                'exam_times.read', 'exam_times.create', 'exam_times.update', 'exam_times.delete',
                'academic_years.read',
                'grades.read', 'grades.create', 'grades.update', 'grades.delete',
                'profiles.read', 'profiles.update',
                'rooms.read', // For exam room assignment
                // Question Bank & Papers - full access for exam controller
                'exams.questions.read', 'exams.questions.create', 'exams.questions.update', 'exams.questions.delete',
                'exams.papers.read', 'exams.papers.create', 'exams.papers.update', 'exams.papers.delete',
                // ID Cards - read and export for exam controllers
                'id_cards.read', 'id_cards.export',
            ],
            'hostel_manager' => [
                'hostel.read',
                'rooms.read', 'rooms.create', 'rooms.update',
                'student_admissions.read', 'student_admissions.update',
                'reports.read',
            ],
            'librarian' => [
                // Librarians manage library and can access DMS for document management
                'library_categories.read', 'library_categories.create', 'library_categories.update', 'library_categories.delete',
                'library_books.read', 'library_books.create', 'library_books.update', 'library_books.delete',
                'library_loans.read', 'library_loans.create', 'library_loans.update',
                'students.read',
                'staff.read',
                'profiles.read',
                // DMS permissions for librarians - can manage all documents
                'dms.incoming.read', 'dms.incoming.create', 'dms.incoming.update',
                'dms.outgoing.read', 'dms.outgoing.create', 'dms.outgoing.update', 'dms.outgoing.generate_pdf',
                'dms.templates.read', 'dms.templates.create', 'dms.templates.update',
                'dms.letterheads.read',
                'dms.letter_types.read', 'dms.letter_types.create', 'dms.letter_types.update',
                'dms.departments.read',
                'dms.files.read', 'dms.files.create', 'dms.files.update', 'dms.files.download',
                'dms.reports.read',
                'dms.archive.read', 'dms.archive.search',
                'dms.settings.read',
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
