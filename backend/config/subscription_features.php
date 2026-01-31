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
];
