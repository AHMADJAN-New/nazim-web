<?php

return [
    // Plan order defines inheritance (each plan includes all features from plans before it).
    'plan_order' => ['starter', 'pro', 'complete', 'enterprise'],

    // Feature metadata used for dependency checks and parent/child relationships.
    // Keys must match feature_definitions.feature_key values.
    'features' => [
        // Core operations
        'students' => ['dependencies' => []],
        'staff' => ['dependencies' => []],
        'classes' => ['dependencies' => ['students', 'staff']],
        'attendance' => ['dependencies' => ['students']],
        'leave_management' => ['dependencies' => ['staff']],
        'timetables' => ['dependencies' => ['students', 'staff', 'classes']],
        'student_history' => ['dependencies' => ['students']],

        // Reporting & exports
        'pdf_reports' => ['dependencies' => []],
        'excel_export' => ['dependencies' => ['pdf_reports']],
        'report_templates' => ['dependencies' => ['pdf_reports']],
        'advanced_reports' => ['dependencies' => ['pdf_reports']],

        // Academic workflow
        'subjects' => ['dependencies' => ['classes', 'staff']],
        'teacher_subject_assignments' => ['dependencies' => ['subjects', 'staff'], 'parent' => 'subjects'],
        'exams' => ['dependencies' => ['students', 'staff', 'classes']],
        'exams_full' => ['dependencies' => ['exams', 'subjects'], 'parent' => 'exams'],
        'question_bank' => ['dependencies' => ['exams_full', 'subjects'], 'parent' => 'exams'],
        'exam_paper_generator' => ['dependencies' => ['question_bank'], 'parent' => 'exams'],
        'grades' => ['dependencies' => ['exams_full'], 'parent' => 'exams'],
        'library' => ['dependencies' => ['students']],
        'short_courses' => ['dependencies' => ['students', 'staff', 'subjects']],

        // Administration & credentials
        'assets' => ['dependencies' => ['staff']],
        'finance' => ['dependencies' => ['students', 'staff']],
        'fees' => ['dependencies' => ['finance']],
        'multi_currency' => ['dependencies' => ['finance']],
        'dms' => ['dependencies' => ['staff']],
        'letter_templates' => ['dependencies' => ['dms']],
        'events' => ['dependencies' => ['staff']],
        'graduation' => ['dependencies' => ['exams', 'student_history']],
        'certificate_verification' => ['dependencies' => ['graduation', 'dms'], 'parent' => 'graduation'],
        'id_cards' => ['dependencies' => ['students']],
        'custom_id_templates' => ['dependencies' => ['id_cards']],

        // Optional/enterprise
        'custom_branding' => ['dependencies' => []],
        'hostel' => ['dependencies' => ['students']],
        'multi_school' => ['dependencies' => []],
        'api_access' => ['dependencies' => []],
        'public_website' => ['dependencies' => []],
    ],

    // Map usage limits to the feature(s) that enable them.
    // If a feature is not enabled for an organization, its related limits are hidden from usage views.
    // null means no feature required - the limit is always available
    'limit_feature_map' => [
        'students' => 'students',
        'staff' => 'staff',
        'classes' => 'classes',
        'exams' => 'exams',
        'questions' => 'question_bank',
        'documents' => 'dms',
        'report_exports' => 'pdf_reports',
        'finance_accounts' => 'finance',
        'income_entries' => 'finance',
        'expense_entries' => 'finance',
        'assets' => 'assets',
        'library_books' => 'library',
        'events' => 'events',
        'certificate_templates' => 'graduation',
        'id_card_templates' => 'id_cards',
        'storage_gb' => null, // No feature required - storage is always available
    ],

    // Map entity types (Laravel model classes) to feature keys for subscription checks
    // Used by notification system to filter notifications based on subscription
    // null means no feature required - notifications are always allowed
    'entity_type_feature_map' => [
        // Students
        'App\Models\Student' => 'students',
        'App\Models\StudentAdmission' => 'students',

        // Staff
        'App\Models\Staff' => 'staff',

        // Classes
        'App\Models\Class' => 'classes',
        'App\Models\ClassAcademicYear' => 'classes',
        'App\Models\ClassSubject' => 'classes',
        'App\Models\ClassSubjectTemplate' => 'classes',

        // Attendance
        'App\Models\AttendanceSession' => 'attendance',
        'App\Models\AttendanceRecord' => 'attendance',
        'App\Models\ExamAttendanceSession' => 'attendance',
        'App\Models\ExamAttendanceRecord' => 'attendance',

        // Exams
        'App\Models\Exam' => 'exams',
        'App\Models\ExamPaper' => 'exams',
        'App\Models\ExamQuestion' => 'question_bank',
        'App\Models\ExamResult' => 'exams',
        'App\Models\Grade' => 'grades',

        // Subjects
        'App\Models\Subject' => 'subjects',
        'App\Models\TeacherSubjectAssignment' => 'teacher_subject_assignments',

        // Library
        'App\Models\LibraryBook' => 'library',
        'App\Models\LibraryLoan' => 'library',

        // Finance
        'App\Models\FinanceAccount' => 'finance',
        'App\Models\FinanceDocument' => 'finance',
        'App\Models\IncomeEntry' => 'finance',
        'App\Models\ExpenseEntry' => 'finance',
        'App\Models\FeeStructure' => 'fees',
        'App\Models\FeeAssignment' => 'fees',
        'App\Models\FeePayment' => 'fees',

        // Assets
        'App\Models\Asset' => 'assets',
        'App\Models\AssetCategory' => 'assets',
        'App\Models\AssetAssignment' => 'assets',
        'App\Models\AssetMaintenance' => 'assets',

        // DMS
        'App\Models\IncomingDocument' => 'dms',
        'App\Models\OutgoingDocument' => 'dms',
        'App\Models\DocumentTemplate' => 'letter_templates',
        'App\Models\DocumentLetterhead' => 'letter_templates',

        // Events
        'App\Models\Event' => 'events',
        'App\Models\EventType' => 'events',

        // Short Courses
        'App\Models\ShortTermCourse' => 'short_courses',

        // Certificates
        'App\Models\CertificateTemplate' => 'graduation',
        'App\Models\Certificate' => 'graduation',

        // ID Cards
        'App\Models\IdCardTemplate' => 'id_cards',

        // System/Subscription - always allowed (no feature check)
        'App\Models\OrganizationSubscription' => null,
        'App\Models\SubscriptionPlan' => null,
    ],

    /*
     * Map feature_key to permission names for revoking when a feature is disabled for an org.
     * When a feature is disabled (addon turned off or plan feature overridden), these permissions
     * are removed from role_has_permissions and model_has_permissions for that organization.
     * Keys must match feature_definitions.feature_key. Keep in sync with frontend PERMISSION_TO_FEATURE_MAP.
     */
    'feature_permission_map' => [
        'public_website' => [
            'website_pages.read', 'website_pages.create', 'website_pages.update', 'website_pages.delete',
            'website_posts.read', 'website_posts.create', 'website_posts.update', 'website_posts.delete',
            'website_events.read', 'website_events.create', 'website_events.update', 'website_events.delete',
            'website_media.read', 'website_media.create', 'website_media.update', 'website_media.delete',
            'website_domains.read', 'website_domains.create', 'website_domains.update', 'website_domains.delete',
            'website_menus.read', 'website_menus.create', 'website_menus.update', 'website_menus.delete',
            'website_settings.read', 'website_settings.update',
        ],
        'students' => [
            'students.read', 'students.create', 'students.update', 'students.delete', 'students.import',
            'student_admissions.read', 'student_admissions.create', 'student_admissions.update', 'student_admissions.delete',
        ],
        'staff' => [
            'staff.read', 'staff.create', 'staff.update', 'staff.delete',
            'staff_types.read', 'staff_types.create', 'staff_types.update', 'staff_types.delete',
        ],
        'classes' => [
            'classes.read', 'classes.create', 'classes.update', 'classes.delete',
        ],
        'attendance' => [
            'attendance_sessions.read', 'attendance_sessions.create', 'attendance_sessions.update',
            'attendance_sessions.delete', 'attendance_sessions.report',
        ],
        'hostel' => ['hostel.read', 'hostel.create', 'hostel.update', 'hostel.delete'],
        'subjects' => [
            'subjects.read', 'subjects.create', 'subjects.update', 'subjects.delete', 'subjects.assign', 'subjects.copy',
            'teacher_subject_assignments.read', 'teacher_subject_assignments.create', 'teacher_subject_assignments.update', 'teacher_subject_assignments.delete',
        ],
        'exams' => [
            'exams.read', 'exams.create', 'exams.update', 'exams.delete', 'exams.assign', 'exams.manage', 'exams.enroll_students',
            'exams.enter_marks', 'exams.view_reports', 'exams.view_grade_cards', 'exams.view_consolidated_reports',
            'exams.view_class_reports', 'exams.view_student_reports',
            'exam_classes.read', 'exam_classes.create', 'exam_classes.update', 'exam_classes.delete',
            'exam_subjects.read', 'exam_subjects.create', 'exam_subjects.update', 'exam_subjects.delete',
            'exam_students.read', 'exam_students.create', 'exam_students.update', 'exam_students.delete',
            'exam_results.read', 'exam_results.create', 'exam_results.update', 'exam_results.delete',
        ],
        'exams_full' => [
            'exams.manage_timetable', 'exams.manage_attendance', 'exams.view_attendance_reports',
            'exams.roll_numbers.read', 'exams.roll_numbers.assign', 'exams.secret_numbers.read', 'exams.secret_numbers.assign', 'exams.numbers.print',
            'exam_times.read', 'exam_times.create', 'exam_times.update', 'exam_times.delete',
            'exam_types.read', 'exam_types.create', 'exam_types.update', 'exam_types.delete',
            'exam_documents.read', 'exam_documents.create', 'exam_documents.update', 'exam_documents.delete',
        ],
        'question_bank' => [
            'exams.questions.read', 'exams.questions.create', 'exams.questions.update', 'exams.questions.delete',
        ],
        'exam_paper_generator' => [
            'exams.papers.read', 'exams.papers.create', 'exams.papers.update', 'exams.papers.delete',
        ],
        'grades' => ['grades.read', 'grades.create', 'grades.update', 'grades.delete'],
        'timetables' => [
            'timetables.read', 'timetables.create', 'timetables.update', 'timetables.delete', 'timetables.export',
            'schedule_slots.read', 'schedule_slots.create', 'schedule_slots.update', 'schedule_slots.delete',
            'teacher_timetable_preferences.read', 'teacher_timetable_preferences.create', 'teacher_timetable_preferences.update', 'teacher_timetable_preferences.delete',
        ],
        'assets' => [
            'assets.read', 'assets.create', 'assets.update', 'assets.delete',
            'asset_categories.read', 'asset_categories.create', 'asset_categories.update', 'asset_categories.delete',
        ],
        'library' => [
            'library_books.read', 'library_books.create', 'library_books.update', 'library_books.delete',
            'library_categories.read', 'library_categories.create', 'library_categories.update', 'library_categories.delete',
            'library_loans.read', 'library_loans.create', 'library_loans.update', 'library_loans.delete',
        ],
        'pdf_reports' => [
            'reports.read', 'reports.create', 'reports.update', 'reports.delete',
            'staff_reports.read', 'staff_reports.export', 'student_reports.read', 'student_reports.export',
        ],
        'report_templates' => [
            'report_templates.read', 'report_templates.create', 'report_templates.update', 'report_templates.delete',
        ],
        'short_courses' => [
            'short_term_courses.read', 'short_term_courses.create', 'short_term_courses.update', 'short_term_courses.delete', 'short_term_courses.close',
            'course_students.read', 'course_students.create', 'course_students.update', 'course_students.delete',
            'course_students.enroll_from_main', 'course_students.copy_to_main', 'course_students.report',
            'course_student_discipline_records.read', 'course_student_discipline_records.create', 'course_student_discipline_records.update', 'course_student_discipline_records.delete',
            'course_attendance.read', 'course_attendance.create', 'course_attendance.update', 'course_attendance.delete',
            'course_documents.read', 'course_documents.create', 'course_documents.update', 'course_documents.delete',
        ],
        'graduation' => [
            'certificate_templates.read', 'certificate_templates.create', 'certificate_templates.update', 'certificate_templates.delete',
            'certificate_templates.activate', 'certificate_templates.deactivate',
            'graduation_batches.read', 'graduation_batches.create', 'graduation_batches.generate_students', 'graduation_batches.approve', 'graduation_batches.issue',
            'issued_certificates.read', 'certificates.issue', 'certificates.print', 'certificates.revoke',
        ],
        'id_cards' => ['id_cards.read', 'id_cards.create', 'id_cards.update', 'id_cards.delete', 'id_cards.export'],
        'finance' => [
            'finance_accounts.read', 'finance_accounts.create', 'finance_accounts.update', 'finance_accounts.delete',
            'income_entries.read', 'income_entries.create', 'income_entries.update', 'income_entries.delete',
            'income_categories.read', 'income_categories.create', 'income_categories.update', 'income_categories.delete',
            'expense_entries.read', 'expense_entries.create', 'expense_entries.update', 'expense_entries.delete',
            'expense_categories.read', 'expense_categories.create', 'expense_categories.update', 'expense_categories.delete',
            'finance_projects.read', 'finance_projects.create', 'finance_projects.update', 'finance_projects.delete',
            'donors.read', 'donors.create', 'donors.update', 'donors.delete',
            'finance_reports.read', 'finance_documents.read', 'finance_documents.create', 'finance_documents.update', 'finance_documents.delete',
            'finance_income.read', 'finance_income.create', 'finance_income.update', 'finance_income.delete',
            'finance_expense.read', 'finance_expense.create', 'finance_expense.update', 'finance_expense.delete',
            'finance_donors.read', 'finance_donors.create', 'finance_donors.update', 'finance_donors.delete',
        ],
        'fees' => [
            'fees.read', 'fees.create', 'fees.update', 'fees.delete',
            'fees.payments.create', 'fees.exceptions.create', 'fees.exceptions.approve',
        ],
        'multi_currency' => [
            'currencies.read', 'currencies.create', 'currencies.update', 'currencies.delete',
            'exchange_rates.read', 'exchange_rates.create', 'exchange_rates.update', 'exchange_rates.delete',
        ],
        'dms' => [
            'dms.incoming.read', 'dms.incoming.create', 'dms.incoming.update', 'dms.incoming.delete',
            'dms.outgoing.read', 'dms.outgoing.create', 'dms.outgoing.update', 'dms.outgoing.delete', 'dms.outgoing.generate_pdf',
            'dms.templates.read', 'dms.templates.create', 'dms.templates.update', 'dms.templates.delete',
            'dms.letterheads.read', 'dms.letterheads.create', 'dms.letterheads.update', 'dms.letterheads.delete', 'dms.letterheads.manage',
            'dms.letter_types.read', 'dms.letter_types.create', 'dms.letter_types.update', 'dms.letter_types.delete',
            'dms.departments.read', 'dms.departments.create', 'dms.departments.update', 'dms.departments.delete',
            'dms.files.read', 'dms.files.create', 'dms.files.update', 'dms.files.delete', 'dms.files.download',
            'dms.reports.read', 'dms.settings.read', 'dms.settings.manage', 'dms.archive.read', 'dms.archive.search',
        ],
        'events' => [
            'events.read', 'events.create', 'events.update', 'events.delete',
            'event_types.read', 'event_types.create', 'event_types.update', 'event_types.delete',
            'event_guests.read', 'event_guests.create', 'event_guests.update', 'event_guests.delete', 'event_guests.import', 'event_guests.checkin',
            'event_checkins.read', 'event_checkins.create', 'event_checkins.update', 'event_checkins.delete',
        ],
        'leave_management' => [
            'leave_requests.read', 'leave_requests.create', 'leave_requests.update', 'leave_requests.delete',
        ],
    ],
];
