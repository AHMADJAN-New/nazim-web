<?php

namespace Database\Seeders;

use App\Models\HelpCenterCategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class HelpCenterCategorySeeder extends Seeder
{
    /**
     * Seed the help_center_categories table.
     *
     * Creates help center categories for all organizations.
     * Categories can be global (organization_id = NULL) or organization-specific.
     */
    public function run(): void
    {
        $this->command->info('Seeding help center categories...');

        // Get all active organizations
        $organizations = DB::table('organizations')
            ->whereNull('deleted_at')
            ->get();

        if ($organizations->isEmpty()) {
            $this->command->warn('No organizations found. Creating global categories only...');
            $this->createGlobalCategories();
            return;
        }

        // First, create global categories (available to all organizations)
        $this->command->info('Creating global categories...');
        $this->createGlobalCategories();

        // Then, create organization-specific categories
        $this->command->info('Creating organization-specific categories...');
        foreach ($organizations as $organization) {
            $this->createOrganizationCategories($organization);
        }

        $this->command->info('✅ Help center categories seeded successfully!');
    }

    /**
     * Create global categories (organization_id = NULL)
     */
    protected function createGlobalCategories(): void
    {
        $globalCategories = [
            [
                'name' => 'Getting Started',
                'slug' => 'getting-started',
                'description' => 'Learn the basics of using Nazim School Management System',
                'icon' => 'book-open',
                'color' => 'blue',
                'order' => 1,
                'is_active' => true,
            ],
            [
                'name' => 'Dashboard & Overview',
                'slug' => 'dashboard-overview',
                'description' => 'Understanding your dashboard and key metrics',
                'icon' => 'home',
                'color' => 'blue',
                'order' => 2,
                'is_active' => true,
            ],
            [
                'name' => 'Account & Profile',
                'slug' => 'account-profile',
                'description' => 'Managing your account, profile, and preferences',
                'icon' => 'user',
                'color' => 'gray',
                'order' => 3,
                'is_active' => true,
            ],
            [
                'name' => 'General Questions',
                'slug' => 'general-questions',
                'description' => 'Common questions and answers about the system',
                'icon' => 'help-circle',
                'color' => 'gray',
                'order' => 100,
                'is_active' => true,
            ],
        ];

        $created = 0;
        $skipped = 0;

        foreach ($globalCategories as $categoryData) {
            $existing = HelpCenterCategory::whereNull('organization_id')
                ->where('slug', $categoryData['slug'])
                ->whereNull('deleted_at')
                ->first();

            if ($existing) {
                $skipped++;
                continue;
            }

            try {
                HelpCenterCategory::create([
                    'organization_id' => null, // Global category
                    'name' => $categoryData['name'],
                    'slug' => $categoryData['slug'],
                    'description' => $categoryData['description'],
                    'icon' => $categoryData['icon'],
                    'color' => $categoryData['color'],
                    'order' => $categoryData['order'],
                    'is_active' => $categoryData['is_active'],
                    'parent_id' => null,
                    'article_count' => 0,
                ]);

                $created++;
            } catch (\Exception $e) {
                $this->command->error("  ✗ Failed to create global category '{$categoryData['name']}': {$e->getMessage()}");
            }
        }

        $this->command->info("  ✓ Global categories: Created {$created}, Skipped {$skipped}");
    }

    /**
     * Create organization-specific categories
     */
    protected function createOrganizationCategories(object $organization): void
    {
        $categories = [
            // Student Management
            [
                'name' => 'Student Management',
                'slug' => 'student-management',
                'description' => 'Managing students, admissions, and student records',
                'icon' => 'users',
                'color' => 'blue',
                'order' => 10,
                'is_active' => true,
                'children' => [
                    [
                        'name' => 'Student Registration',
                        'slug' => 'student-registration',
                        'description' => 'How to register new students',
                        'icon' => 'user-plus',
                        'color' => 'blue',
                        'order' => 1,
                    ],
                    [
                        'name' => 'Student Admissions',
                        'slug' => 'student-admissions',
                        'description' => 'Managing student admissions to classes',
                        'icon' => 'graduation-cap',
                        'color' => 'blue',
                        'order' => 2,
                    ],
                    [
                        'name' => 'Student Profiles',
                        'slug' => 'student-profiles',
                        'description' => 'Viewing and editing student information',
                        'icon' => 'user',
                        'color' => 'blue',
                        'order' => 3,
                    ],
                ],
            ],
            // Academic Management
            [
                'name' => 'Academic Management',
                'slug' => 'academic-management',
                'description' => 'Classes, subjects, exams, grades, and academic year management',
                'icon' => 'book',
                'color' => 'green',
                'order' => 20,
                'is_active' => true,
                'children' => [
                    [
                        'name' => 'Academic Years',
                        'slug' => 'academic-years',
                        'description' => 'Creating and managing academic years',
                        'icon' => 'calendar',
                        'color' => 'green',
                        'order' => 1,
                    ],
                    [
                        'name' => 'Classes',
                        'slug' => 'classes',
                        'description' => 'Managing classes and class structure',
                        'icon' => 'users',
                        'color' => 'green',
                        'order' => 2,
                    ],
                    [
                        'name' => 'Subjects',
                        'slug' => 'subjects',
                        'description' => 'Managing subjects and subject assignments',
                        'icon' => 'book-open',
                        'color' => 'green',
                        'order' => 3,
                    ],
                    [
                        'name' => 'Exams & Assessments',
                        'slug' => 'exams-assessments',
                        'description' => 'Creating and managing exams and assessments',
                        'icon' => 'clipboard-list',
                        'color' => 'green',
                        'order' => 4,
                    ],
                    [
                        'name' => 'Grades & Results',
                        'slug' => 'grades-results',
                        'description' => 'Recording and viewing student grades',
                        'icon' => 'award',
                        'color' => 'green',
                        'order' => 5,
                    ],
                    [
                        'name' => 'Timetables',
                        'slug' => 'timetables',
                        'description' => 'Creating and managing class timetables',
                        'icon' => 'calendar-days',
                        'color' => 'green',
                        'order' => 6,
                    ],
                ],
            ],
            // Staff Management
            [
                'name' => 'Staff Management',
                'slug' => 'staff-management',
                'description' => 'Managing staff members, teachers, and staff records',
                'icon' => 'briefcase',
                'color' => 'purple',
                'order' => 30,
                'is_active' => true,
                'children' => [
                    [
                        'name' => 'Staff Registration',
                        'slug' => 'staff-registration',
                        'description' => 'How to register new staff members',
                        'icon' => 'user-plus',
                        'color' => 'purple',
                        'order' => 1,
                    ],
                    [
                        'name' => 'Teacher Assignments',
                        'slug' => 'teacher-assignments',
                        'description' => 'Assigning teachers to classes and subjects',
                        'icon' => 'user-check',
                        'color' => 'purple',
                        'order' => 2,
                    ],
                    [
                        'name' => 'Staff Profiles',
                        'slug' => 'staff-profiles',
                        'description' => 'Viewing and editing staff information',
                        'icon' => 'user',
                        'color' => 'purple',
                        'order' => 3,
                    ],
                ],
            ],
            // Attendance
            [
                'name' => 'Attendance',
                'slug' => 'attendance',
                'description' => 'Recording and managing student and staff attendance',
                'icon' => 'user-check',
                'color' => 'orange',
                'order' => 40,
                'is_active' => true,
                'children' => [
                    [
                        'name' => 'Student Attendance',
                        'slug' => 'student-attendance',
                        'description' => 'Recording student attendance',
                        'icon' => 'users',
                        'color' => 'orange',
                        'order' => 1,
                    ],
                    [
                        'name' => 'Staff Attendance',
                        'slug' => 'staff-attendance',
                        'description' => 'Recording staff attendance',
                        'icon' => 'briefcase',
                        'color' => 'orange',
                        'order' => 2,
                    ],
                    [
                        'name' => 'Attendance Reports',
                        'slug' => 'attendance-reports',
                        'description' => 'Viewing attendance reports and statistics',
                        'icon' => 'bar-chart',
                        'color' => 'orange',
                        'order' => 3,
                    ],
                ],
            ],
            // Financial Management
            [
                'name' => 'Financial Management',
                'slug' => 'financial-management',
                'description' => 'Fees, payments, expenses, income, and financial reporting',
                'icon' => 'dollar-sign',
                'color' => 'green',
                'order' => 50,
                'is_active' => true,
                'children' => [
                    [
                        'name' => 'Fee Management',
                        'slug' => 'fee-management',
                        'description' => 'Creating fee structures and managing fees',
                        'icon' => 'credit-card',
                        'color' => 'green',
                        'order' => 1,
                    ],
                    [
                        'name' => 'Payments',
                        'slug' => 'payments',
                        'description' => 'Recording and tracking payments',
                        'icon' => 'wallet',
                        'color' => 'green',
                        'order' => 2,
                    ],
                    [
                        'name' => 'Expenses',
                        'slug' => 'expenses',
                        'description' => 'Recording and managing expenses',
                        'icon' => 'trending-down',
                        'color' => 'green',
                        'order' => 3,
                    ],
                    [
                        'name' => 'Income',
                        'slug' => 'income',
                        'description' => 'Recording and managing income',
                        'icon' => 'trending-up',
                        'color' => 'green',
                        'order' => 4,
                    ],
                    [
                        'name' => 'Financial Reports',
                        'slug' => 'financial-reports',
                        'description' => 'Viewing financial reports and analytics',
                        'icon' => 'bar-chart',
                        'color' => 'green',
                        'order' => 5,
                    ],
                ],
            ],
            // Library Management
            [
                'name' => 'Library Management',
                'slug' => 'library-management',
                'description' => 'Managing library books, categories, and book loans',
                'icon' => 'book-open',
                'color' => 'indigo',
                'order' => 60,
                'is_active' => true,
                'children' => [
                    [
                        'name' => 'Book Management',
                        'slug' => 'book-management',
                        'description' => 'Adding and managing library books',
                        'icon' => 'book',
                        'color' => 'indigo',
                        'order' => 1,
                    ],
                    [
                        'name' => 'Book Categories',
                        'slug' => 'book-categories',
                        'description' => 'Organizing books into categories',
                        'icon' => 'folder',
                        'color' => 'indigo',
                        'order' => 2,
                    ],
                    [
                        'name' => 'Book Loans',
                        'slug' => 'book-loans',
                        'description' => 'Managing book loans and returns',
                        'icon' => 'arrow-right-left',
                        'color' => 'indigo',
                        'order' => 3,
                    ],
                ],
            ],
            // Events Management
            [
                'name' => 'Events Management',
                'slug' => 'events-management',
                'description' => 'Creating and managing school events',
                'icon' => 'calendar',
                'color' => 'pink',
                'order' => 70,
                'is_active' => true,
                'children' => [
                    [
                        'name' => 'Creating Events',
                        'slug' => 'creating-events',
                        'description' => 'How to create new events',
                        'icon' => 'plus-circle',
                        'color' => 'pink',
                        'order' => 1,
                    ],
                    [
                        'name' => 'Event Management',
                        'slug' => 'event-management',
                        'description' => 'Managing event details and attendees',
                        'icon' => 'settings',
                        'color' => 'pink',
                        'order' => 2,
                    ],
                    [
                        'name' => 'Event Check-in',
                        'slug' => 'event-checkin',
                        'description' => 'Checking in attendees at events',
                        'icon' => 'check-circle',
                        'color' => 'pink',
                        'order' => 3,
                    ],
                ],
            ],
            // Document Management System (DMS)
            [
                'name' => 'Document Management',
                'slug' => 'document-management',
                'description' => 'Managing incoming and outgoing documents, letters, and templates',
                'icon' => 'file-text',
                'color' => 'teal',
                'order' => 80,
                'is_active' => true,
                'children' => [
                    [
                        'name' => 'Incoming Documents',
                        'slug' => 'incoming-documents',
                        'description' => 'Managing incoming documents',
                        'icon' => 'download',
                        'color' => 'teal',
                        'order' => 1,
                    ],
                    [
                        'name' => 'Outgoing Documents',
                        'slug' => 'outgoing-documents',
                        'description' => 'Creating and managing outgoing documents',
                        'icon' => 'upload',
                        'color' => 'teal',
                        'order' => 2,
                    ],
                    [
                        'name' => 'Letter Templates',
                        'slug' => 'letter-templates',
                        'description' => 'Creating and using letter templates',
                        'icon' => 'file-text',
                        'color' => 'teal',
                        'order' => 3,
                    ],
                    [
                        'name' => 'DMS Settings',
                        'slug' => 'dms-settings',
                        'description' => 'Configuring DMS settings and security levels',
                        'icon' => 'settings',
                        'color' => 'teal',
                        'order' => 4,
                    ],
                ],
            ],
            // Settings & Configuration
            [
                'name' => 'Settings & Configuration',
                'slug' => 'settings-configuration',
                'description' => 'System settings, configuration, and customization',
                'icon' => 'settings',
                'color' => 'gray',
                'order' => 90,
                'is_active' => true,
                'children' => [
                    [
                        'name' => 'Buildings & Rooms',
                        'slug' => 'buildings-rooms',
                        'description' => 'Managing buildings and rooms',
                        'icon' => 'building',
                        'color' => 'gray',
                        'order' => 1,
                    ],
                    [
                        'name' => 'School Branding',
                        'slug' => 'school-branding',
                        'description' => 'Customizing school branding and logos',
                        'icon' => 'palette',
                        'color' => 'gray',
                        'order' => 2,
                    ],
                    [
                        'name' => 'User Permissions',
                        'slug' => 'user-permissions',
                        'description' => 'Managing user roles and permissions',
                        'icon' => 'shield',
                        'color' => 'gray',
                        'order' => 3,
                    ],
                    [
                        'name' => 'System Settings',
                        'slug' => 'system-settings',
                        'description' => 'General system settings and preferences',
                        'icon' => 'cog',
                        'color' => 'gray',
                        'order' => 4,
                    ],
                ],
            ],
            // Reports & Analytics
            [
                'name' => 'Reports & Analytics',
                'slug' => 'reports-analytics',
                'description' => 'Generating and viewing reports and analytics',
                'icon' => 'bar-chart',
                'color' => 'blue',
                'order' => 100,
                'is_active' => true,
                'children' => [
                    [
                        'name' => 'Academic Reports',
                        'slug' => 'academic-reports',
                        'description' => 'Generating academic reports',
                        'icon' => 'graduation-cap',
                        'color' => 'blue',
                        'order' => 1,
                    ],
                    [
                        'name' => 'Financial Reports',
                        'slug' => 'financial-reports-help',
                        'description' => 'Generating financial reports',
                        'icon' => 'dollar-sign',
                        'color' => 'blue',
                        'order' => 2,
                    ],
                    [
                        'name' => 'Attendance Reports',
                        'slug' => 'attendance-reports-help',
                        'description' => 'Generating attendance reports',
                        'icon' => 'user-check',
                        'color' => 'blue',
                        'order' => 3,
                    ],
                    [
                        'name' => 'Custom Reports',
                        'slug' => 'custom-reports',
                        'description' => 'Creating custom reports',
                        'icon' => 'file-bar-chart',
                        'color' => 'blue',
                        'order' => 4,
                    ],
                ],
            ],
        ];

        $orgCreated = 0;
        $orgSkipped = 0;

        foreach ($categories as $categoryData) {
            $children = $categoryData['children'] ?? [];
            unset($categoryData['children']);

            // Check if parent category exists
            $existingParent = HelpCenterCategory::where('organization_id', $organization->id)
                ->where('slug', $categoryData['slug'])
                ->whereNull('deleted_at')
                ->first();

            if ($existingParent) {
                $parentCategory = $existingParent;
                $orgSkipped++;
            } else {
                try {
                    $parentCategory = HelpCenterCategory::create([
                        'organization_id' => $organization->id,
                        'name' => $categoryData['name'],
                        'slug' => $categoryData['slug'],
                        'description' => $categoryData['description'],
                        'icon' => $categoryData['icon'],
                        'color' => $categoryData['color'],
                        'order' => $categoryData['order'],
                        'is_active' => $categoryData['is_active'],
                        'parent_id' => null,
                        'article_count' => 0,
                    ]);

                    $orgCreated++;
                } catch (\Exception $e) {
                    $this->command->error("  ✗ Failed to create category '{$categoryData['name']}' for {$organization->name}: {$e->getMessage()}");
                    continue;
                }
            }

            // Create child categories
            foreach ($children as $childData) {
                $existingChild = HelpCenterCategory::where('organization_id', $organization->id)
                    ->where('parent_id', $parentCategory->id)
                    ->where('slug', $childData['slug'])
                    ->whereNull('deleted_at')
                    ->first();

                if ($existingChild) {
                    continue;
                }

                try {
                    HelpCenterCategory::create([
                        'organization_id' => $organization->id,
                        'name' => $childData['name'],
                        'slug' => $childData['slug'],
                        'description' => $childData['description'],
                        'icon' => $childData['icon'],
                        'color' => $childData['color'],
                        'order' => $childData['order'],
                        'is_active' => true,
                        'parent_id' => $parentCategory->id,
                        'article_count' => 0,
                    ]);

                    $orgCreated++;
                } catch (\Exception $e) {
                    $this->command->error("  ✗ Failed to create child category '{$childData['name']}' for {$organization->name}: {$e->getMessage()}");
                }
            }
        }

        if ($orgCreated > 0 || $orgSkipped > 0) {
            $this->command->info("  ✓ {$organization->name}: Created {$orgCreated}, Skipped {$orgSkipped}");
        }
    }
}

