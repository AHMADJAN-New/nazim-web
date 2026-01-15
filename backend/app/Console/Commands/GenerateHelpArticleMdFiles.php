<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class GenerateHelpArticleMdFiles extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'help:generate-md-files';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate MD files for all help center categories';

    /**
     * Supported languages
     */
    protected $languages = ['en', 'ps', 'fa', 'ar'];

    /**
     * Language-specific placeholder messages
     */
    protected $placeholders = [
        'en' => [
            'title' => 'Article will be ready soon',
            'content' => 'This article is currently being prepared. Content will be available soon.',
        ],
        'ps' => [
            'title' => 'مقاله ډېر ژر چمتو کیږي',
            'content' => 'دا مقاله اوسمهال چمتو کیږي. منځپانګه به ژر تر ژره شتون ولري.',
        ],
        'fa' => [
            'title' => 'مقاله به زودی آماده می‌شود',
            'content' => 'این مقاله در حال حاضر در حال آماده‌سازی است. محتوا به زودی در دسترس خواهد بود.',
        ],
        'ar' => [
            'title' => 'المقالة ستكون جاهزة قريباً',
            'content' => 'هذه المقالة قيد الإعداد حالياً. المحتوى سيكون متاحاً قريباً.',
        ],
    ];

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Generating MD files for help center categories (language-aware)...');

        $baseDir = resource_path('help-center/articles');

        // Get all categories from the seeder
        $categories = $this->getCategories();

        $created = 0;
        $folders = [];

        foreach ($categories as $category) {
            $folder = $this->getFolderForCategory($category['slug']);
            $filename = $this->slugToFilename($category['slug']);

            // Generate MD files for each language
            foreach ($this->languages as $lang) {
                $langFolderPath = $baseDir . '/' . $folder . '/' . $lang;
                $filePath = $langFolderPath . '/' . $filename;

                // Create language folder if it doesn't exist
                if (!File::isDirectory($langFolderPath)) {
                    File::makeDirectory($langFolderPath, 0755, true);
                    if (!in_array($folder . '/' . $lang, $folders)) {
                        $folders[] = $folder . '/' . $lang;
                    }
                }

                // Skip if file already exists (don't overwrite existing content)
                if (File::exists($filePath)) {
                    continue;
                }

                // Create MD file with language-specific placeholder content
                $content = "# {$category['name']}\n\n";
                $content .= "**{$this->placeholders[$lang]['title']}**\n\n";
                $content .= "{$this->placeholders[$lang]['content']}\n\n";
                $content .= "---\n\n";
                $content .= "*Category: `{$category['slug']}` | Language: `{$lang}`*\n";

                File::put($filePath, $content);
                $created++;
            }
        }

        $this->info("✅ Created {$created} MD files across " . count(array_unique($folders)) . " language folders");
        $this->info("📁 Base directory: {$baseDir}");
        $this->info("🌐 Languages: " . implode(', ', $this->languages));

        return 0;
    }

    /**
     * Get folder for category based on slug
     */
    protected function getFolderForCategory($slug): string
    {
        // Students related
        if (str_starts_with($slug, 'students') || $slug === 'admissions' || str_starts_with($slug, 'admissions/')) {
            return 'students';
        }

        // Staff related
        if (str_starts_with($slug, 'staff')) {
            return 'staff';
        }

        // Attendance related
        if (str_starts_with($slug, 'attendance')) {
            return 'attendance';
        }

        // Finance related
        if (str_starts_with($slug, 'finance') || $slug === 'fees') {
            return 'finance';
        }

        // Academic related
        if (str_starts_with($slug, 'academic') || in_array($slug, ['classes', 'subjects', 'academic-years', 'timetables', 'grades'])) {
            return 'academic';
        }

        // Exams related
        if (str_starts_with($slug, 'exams') || $slug === 'exam-documents') {
            return 'exams';
        }

        // Library related
        if (str_starts_with($slug, 'library')) {
            return 'library';
        }

        // Settings related
        if (str_starts_with($slug, 'settings')) {
            return 'settings';
        }

        // DMS related
        if (str_starts_with($slug, 'dms')) {
            return 'dms';
        }

        // Events related
        if (str_starts_with($slug, 'events')) {
            return 'events';
        }

        // Hostel related
        if (str_starts_with($slug, 'hostel')) {
            return 'hostel';
        }

        // Assets related
        if (str_starts_with($slug, 'assets')) {
            return 'assets';
        }

        // Subscription related
        if (str_starts_with($slug, 'subscription')) {
            return 'subscription';
        }

        // Courses related
        if (str_starts_with($slug, 'course') || $slug === 'short-term-courses') {
            return 'courses';
        }

        // Graduation related
        if (str_starts_with($slug, 'graduation')) {
            return 'graduation';
        }

        // Certificates related
        if (str_starts_with($slug, 'certificate')) {
            return 'certificates';
        }

        // ID Cards related
        if (str_starts_with($slug, 'id-cards')) {
            return 'id-cards';
        }

        // Reports related
        if (str_starts_with($slug, 'reports')) {
            return 'reports';
        }

        // Leave related
        if (str_starts_with($slug, 'leave')) {
            return 'leave';
        }

        // Exam documents
        if ($slug === 'exam-documents') {
            return 'exam-documents';
        }

        // Admin related
        if (str_starts_with($slug, 'admin')) {
            return 'admin';
        }

        // Everything else goes to general
        return 'general';
    }

    /**
     * Convert slug to filename
     */
    protected function slugToFilename($slug): string
    {
        return str_replace('/', '-', $slug) . '.md';
    }

    /**
     * Get all categories from seeder
     */
    protected function getCategories(): array
    {
        return [
            // General Categories
            ['name' => 'Getting Started', 'slug' => 'getting-started'],
            ['name' => 'Account & Profile', 'slug' => 'account-profile'],
            ['name' => 'General Questions', 'slug' => 'general-questions'],
            ['name' => 'Dashboard', 'slug' => 'dashboard'],
            ['name' => 'Phonebook', 'slug' => 'phonebook'],

            // Students
            ['name' => 'Students', 'slug' => 'students'],
            ['name' => 'Students History', 'slug' => 'students/history'],
            ['name' => 'Students Import', 'slug' => 'students/import'],
            ['name' => 'Admissions', 'slug' => 'admissions'],
            ['name' => 'Admissions Report', 'slug' => 'admissions/report'],

            // Staff
            ['name' => 'Staff', 'slug' => 'staff'],

            // Attendance
            ['name' => 'Attendance', 'slug' => 'attendance'],
            ['name' => 'Attendance Marking', 'slug' => 'attendance/marking'],
            ['name' => 'Attendance Reports', 'slug' => 'attendance/reports'],
            ['name' => 'Attendance Reports Totals', 'slug' => 'attendance/reports/totals'],

            // Finance
            ['name' => 'Fees', 'slug' => 'fees'],
            ['name' => 'Finance', 'slug' => 'finance'],
            ['name' => 'Finance Dashboard', 'slug' => 'finance/dashboard'],
            ['name' => 'Finance Accounts', 'slug' => 'finance/accounts'],
            ['name' => 'Finance Income', 'slug' => 'finance/income'],
            ['name' => 'Finance Income Categories', 'slug' => 'finance/income/categories'],
            ['name' => 'Finance Expenses', 'slug' => 'finance/expenses'],
            ['name' => 'Finance Expenses Categories', 'slug' => 'finance/expenses/categories'],
            ['name' => 'Finance Projects', 'slug' => 'finance/projects'],
            ['name' => 'Finance Donors', 'slug' => 'finance/donors'],
            ['name' => 'Finance Documents', 'slug' => 'finance/documents'],
            ['name' => 'Finance Currencies', 'slug' => 'finance/currencies'],
            ['name' => 'Finance Exchange Rates', 'slug' => 'finance/exchange-rates'],
            ['name' => 'Finance Fees Dashboard', 'slug' => 'finance/fees/dashboard'],
            ['name' => 'Finance Fees Structures', 'slug' => 'finance/fees/structures'],
            ['name' => 'Finance Fees Assignments', 'slug' => 'finance/fees/assignments'],
            ['name' => 'Finance Fees Payments', 'slug' => 'finance/fees/payments'],
            ['name' => 'Finance Fees Exceptions', 'slug' => 'finance/fees/exceptions'],
            ['name' => 'Finance Fees Reports', 'slug' => 'finance/fees/reports'],
            ['name' => 'Finance Reports', 'slug' => 'finance/reports'],
            ['name' => 'Finance Settings', 'slug' => 'finance/settings'],

            // Academic
            ['name' => 'Academic Timetable Generation', 'slug' => 'academic/timetable-generation'],
            ['name' => 'Classes', 'slug' => 'classes'],
            ['name' => 'Subjects', 'slug' => 'subjects'],
            ['name' => 'Academic Years', 'slug' => 'academic-years'],
            ['name' => 'Timetables', 'slug' => 'timetables'],
            ['name' => 'Grades', 'slug' => 'grades'],

            // Exams
            ['name' => 'Exams', 'slug' => 'exams'],
            ['name' => 'Exam Timetables', 'slug' => 'exams/timetables'],
            ['name' => 'Exam Enrollment', 'slug' => 'exams/enrollment'],
            ['name' => 'Exam Student Enrollment', 'slug' => 'exams/student-enrollment'],
            ['name' => 'Exam Marks', 'slug' => 'exams/marks'],
            ['name' => 'Exam Reports', 'slug' => 'exams/reports'],
            ['name' => 'Exam Analytics', 'slug' => 'exams/analytics'],
            ['name' => 'Exam Attendance', 'slug' => 'exams/attendance'],
            ['name' => 'Exam Roll Numbers', 'slug' => 'exams/roll-numbers'],
            ['name' => 'Exam Secret Numbers', 'slug' => 'exams/secret-numbers'],
            ['name' => 'Exam Number Reports', 'slug' => 'exams/number-reports'],
            ['name' => 'Exam Reports Hub', 'slug' => 'exams/reports-hub'],
            ['name' => 'Exam Reports Consolidated', 'slug' => 'exams/reports/consolidated'],
            ['name' => 'Exam Reports Class Subject', 'slug' => 'exams/reports/class-subject'],
            ['name' => 'Exam Reports Student', 'slug' => 'exams/reports/student'],
            ['name' => 'Exam Question Bank', 'slug' => 'exams/question-bank'],
            ['name' => 'Exam Papers', 'slug' => 'exams/papers'],
            ['name' => 'Exam Paper Templates', 'slug' => 'exams/paper-templates'],
            ['name' => 'Exam Papers Print Tracking', 'slug' => 'exams/papers/print-tracking'],
            ['name' => 'Exam Documents', 'slug' => 'exam-documents'],

            // Library
            ['name' => 'Library', 'slug' => 'library'],
            ['name' => 'Library Books', 'slug' => 'library/books'],
            ['name' => 'Library Categories', 'slug' => 'library/categories'],
            ['name' => 'Library Dashboard', 'slug' => 'library/dashboard'],
            ['name' => 'Library Distribution', 'slug' => 'library/distribution'],
            ['name' => 'Library Reports', 'slug' => 'library/reports'],

            // Settings
            ['name' => 'Settings Organizations', 'slug' => 'settings/organizations'],
            ['name' => 'Settings Buildings', 'slug' => 'settings/buildings'],
            ['name' => 'Settings Rooms', 'slug' => 'settings/rooms'],
            ['name' => 'Settings Profile', 'slug' => 'settings/profile'],
            ['name' => 'Settings Permissions', 'slug' => 'settings/permissions'],
            ['name' => 'Settings Roles', 'slug' => 'settings/roles'],
            ['name' => 'Settings User Permissions', 'slug' => 'settings/user-permissions'],
            ['name' => 'Settings Schools', 'slug' => 'settings/schools'],
            ['name' => 'Settings Report Templates', 'slug' => 'settings/report-templates'],
            ['name' => 'Settings Residency Types', 'slug' => 'settings/residency-types'],
            ['name' => 'Settings Academic Years', 'slug' => 'settings/academic-years'],
            ['name' => 'Settings Exam Types', 'slug' => 'settings/exam-types'],
            ['name' => 'Settings Classes', 'slug' => 'settings/classes'],
            ['name' => 'Settings Subjects', 'slug' => 'settings/subjects'],
            ['name' => 'Settings Schedule Slots', 'slug' => 'settings/schedule-slots'],
            ['name' => 'Settings Teacher Subject Assignments', 'slug' => 'settings/teacher-subject-assignments'],
            ['name' => 'Settings Staff Types', 'slug' => 'settings/staff-types'],
            ['name' => 'Settings Grades', 'slug' => 'settings/grades'],
            ['name' => 'Settings User', 'slug' => 'settings/user'],

            // DMS
            ['name' => 'DMS Dashboard', 'slug' => 'dms/dashboard'],
            ['name' => 'DMS Incoming', 'slug' => 'dms/incoming'],
            ['name' => 'DMS Outgoing', 'slug' => 'dms/outgoing'],
            ['name' => 'DMS Issue Letter', 'slug' => 'dms/issue-letter'],
            ['name' => 'DMS Templates', 'slug' => 'dms/templates'],
            ['name' => 'DMS Letterheads', 'slug' => 'dms/letterheads'],
            ['name' => 'DMS Letter Types', 'slug' => 'dms/letter-types'],
            ['name' => 'DMS Departments', 'slug' => 'dms/departments'],
            ['name' => 'DMS Archive', 'slug' => 'dms/archive'],
            ['name' => 'DMS Reports', 'slug' => 'dms/reports'],
            ['name' => 'DMS Settings', 'slug' => 'dms/settings'],

            // Events
            ['name' => 'Events', 'slug' => 'events'],
            ['name' => 'Events Types', 'slug' => 'events/types'],

            // Hostel
            ['name' => 'Hostel', 'slug' => 'hostel'],
            ['name' => 'Hostel Reports', 'slug' => 'hostel/reports'],

            // Assets
            ['name' => 'Assets', 'slug' => 'assets'],
            ['name' => 'Assets Dashboard', 'slug' => 'assets/dashboard'],
            ['name' => 'Assets Assignments', 'slug' => 'assets/assignments'],
            ['name' => 'Assets Reports', 'slug' => 'assets/reports'],
            ['name' => 'Assets Categories', 'slug' => 'assets/categories'],

            // Subscription
            ['name' => 'Subscription', 'slug' => 'subscription'],
            ['name' => 'Subscription Plans', 'slug' => 'subscription/plans'],
            ['name' => 'Subscription Renew', 'slug' => 'subscription/renew'],
            ['name' => 'Subscription Maintenance Fees', 'slug' => 'subscription/maintenance-fees'],
            ['name' => 'Subscription License Fees', 'slug' => 'subscription/license-fees'],

            // Courses
            ['name' => 'Short Term Courses', 'slug' => 'short-term-courses'],
            ['name' => 'Course Students', 'slug' => 'course-students'],
            ['name' => 'Course Students Reports', 'slug' => 'course-students/reports'],
            ['name' => 'Course Dashboard', 'slug' => 'course-dashboard'],
            ['name' => 'Course Attendance', 'slug' => 'course-attendance'],
            ['name' => 'Course Certificates', 'slug' => 'course-certificates'],
            ['name' => 'Course Documents', 'slug' => 'course-documents'],

            // Graduation
            ['name' => 'Graduation', 'slug' => 'graduation'],
            ['name' => 'Graduation Batches', 'slug' => 'graduation/batches'],
            ['name' => 'Graduation Certificate Templates', 'slug' => 'graduation/certificate-templates'],

            // Certificates
            ['name' => 'Certificate Templates', 'slug' => 'certificate-templates'],
            ['name' => 'Certificates Templates', 'slug' => 'certificates/templates'],
            ['name' => 'Certificates Issued', 'slug' => 'certificates/issued'],

            // ID Cards
            ['name' => 'ID Cards Templates', 'slug' => 'id-cards/templates'],
            ['name' => 'ID Cards Assignment', 'slug' => 'id-cards/assignment'],
            ['name' => 'ID Cards Export', 'slug' => 'id-cards/export'],

            // Reports
            ['name' => 'Student Registrations Report', 'slug' => 'reports/student-registrations'],
            ['name' => 'Staff Registrations Report', 'slug' => 'reports/staff-registrations'],

            // Leave
            ['name' => 'Leave Requests', 'slug' => 'leave-requests'],
            ['name' => 'Leave Requests Reports', 'slug' => 'leave-requests/reports'],

            // Exam Documents
            ['name' => 'Exam Documents', 'slug' => 'exam-documents'],

            // Admin
            ['name' => 'Admin Users', 'slug' => 'admin/users'],
        ];
    }
}

