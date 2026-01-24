<?php

namespace Database\Seeders;

use App\Models\FeatureDefinition;
use App\Models\LimitDefinition;
use App\Models\PlanFeature;
use App\Models\PlanLimit;
use App\Models\SubscriptionPlan;
use Illuminate\Database\Seeder;

class SubscriptionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->createFeatureDefinitions();
        $this->createLimitDefinitions();
        $this->createPlans();
    }

    private function createFeatureDefinitions(): void
    {
        $features = [
            // Core (Operational)
            ['feature_key' => 'students', 'name' => 'Student Registration', 'category' => 'core', 'is_addon' => false, 'sort_order' => 1],
            ['feature_key' => 'staff', 'name' => 'Staff Management', 'category' => 'core', 'is_addon' => false, 'sort_order' => 2],
            ['feature_key' => 'classes', 'name' => 'Class Management', 'category' => 'core', 'is_addon' => false, 'sort_order' => 3],
            ['feature_key' => 'attendance', 'name' => 'Attendance', 'category' => 'core', 'is_addon' => false, 'sort_order' => 4],
            ['feature_key' => 'leave_management', 'name' => 'Leave & Permissions', 'category' => 'core', 'is_addon' => false, 'sort_order' => 5],
            ['feature_key' => 'timetables', 'name' => 'Timetable', 'category' => 'core', 'is_addon' => false, 'sort_order' => 6],
            ['feature_key' => 'student_history', 'name' => 'Student History', 'category' => 'core', 'is_addon' => false, 'sort_order' => 7],
            ['feature_key' => 'pdf_reports', 'name' => 'Basic Reports', 'category' => 'reports', 'is_addon' => false, 'sort_order' => 8],

            // Academic workflow
            ['feature_key' => 'subjects', 'name' => 'Subjects & Curriculum (Setup)', 'category' => 'academic', 'is_addon' => false, 'sort_order' => 20],
            ['feature_key' => 'teacher_subject_assignments', 'name' => 'Teacher Material Assignment', 'category' => 'academic', 'is_addon' => false, 'sort_order' => 21],
            ['feature_key' => 'exams', 'name' => 'Exams (Lite)', 'category' => 'academic', 'is_addon' => false, 'sort_order' => 22],
            ['feature_key' => 'exams_full', 'name' => 'Exams (Full)', 'category' => 'academic', 'is_addon' => false, 'sort_order' => 23],
            ['feature_key' => 'question_bank', 'name' => 'Question Bank', 'category' => 'academic', 'is_addon' => false, 'sort_order' => 24],
            ['feature_key' => 'grades', 'name' => 'Exam Details & Grading', 'category' => 'academic', 'is_addon' => false, 'sort_order' => 25],
            ['feature_key' => 'exam_paper_generator', 'name' => 'Exam Paper Structure', 'category' => 'academic', 'is_addon' => false, 'sort_order' => 26],
            ['feature_key' => 'library', 'name' => 'Library', 'category' => 'academic', 'is_addon' => false, 'sort_order' => 27],
            ['feature_key' => 'short_courses', 'name' => 'Short Courses', 'category' => 'academic', 'is_addon' => false, 'sort_order' => 28],

            // Administration & credentials
            ['feature_key' => 'assets', 'name' => 'Inventory & Assets', 'category' => 'admin', 'is_addon' => false, 'sort_order' => 40],
            ['feature_key' => 'events', 'name' => 'Guests & Events', 'category' => 'admin', 'is_addon' => false, 'sort_order' => 41],
            ['feature_key' => 'graduation', 'name' => 'Certificates & Graduates', 'category' => 'admin', 'is_addon' => false, 'sort_order' => 42],
            ['feature_key' => 'certificate_verification', 'name' => 'Certificate Verification', 'category' => 'admin', 'is_addon' => false, 'sort_order' => 43],
            ['feature_key' => 'id_cards', 'name' => 'Cards (ID)', 'category' => 'admin', 'is_addon' => false, 'sort_order' => 44],
            ['feature_key' => 'custom_id_templates', 'name' => 'Custom Card Templates', 'category' => 'admin', 'is_addon' => false, 'sort_order' => 45],

            // Finance
            ['feature_key' => 'finance', 'name' => 'Finance System', 'category' => 'finance', 'is_addon' => false, 'sort_order' => 60],
            ['feature_key' => 'fees', 'name' => 'Fees Management', 'category' => 'finance', 'is_addon' => false, 'sort_order' => 61],
            ['feature_key' => 'multi_currency', 'name' => 'Multi-Currency', 'category' => 'finance', 'is_addon' => false, 'sort_order' => 62],

            // Documents & reporting
            ['feature_key' => 'dms', 'name' => 'Document Management (DMS)', 'category' => 'documents', 'is_addon' => false, 'sort_order' => 70],
            ['feature_key' => 'letter_templates', 'name' => 'Letter Templates', 'category' => 'documents', 'is_addon' => false, 'sort_order' => 71],
            ['feature_key' => 'excel_export', 'name' => 'Excel Export', 'category' => 'reports', 'is_addon' => false, 'sort_order' => 72],
            ['feature_key' => 'report_templates', 'name' => 'Report Templates', 'category' => 'reports', 'is_addon' => false, 'sort_order' => 73],
            ['feature_key' => 'advanced_reports', 'name' => 'Advanced Reporting', 'category' => 'reports', 'is_addon' => false, 'sort_order' => 74],

            // Optional / enterprise toggles
            ['feature_key' => 'custom_branding', 'name' => 'Custom Branding', 'category' => 'enterprise', 'is_addon' => true, 'sort_order' => 90],
            ['feature_key' => 'hostel', 'name' => 'Hostel Management', 'category' => 'enterprise', 'is_addon' => true, 'sort_order' => 91],
            ['feature_key' => 'multi_school', 'name' => 'Multi-Branch Support', 'category' => 'enterprise', 'is_addon' => false, 'sort_order' => 92],
            ['feature_key' => 'api_access', 'name' => 'API Access / Integrations', 'category' => 'enterprise', 'is_addon' => true, 'sort_order' => 93],
            ['feature_key' => 'public_website', 'name' => 'Public Website Portal', 'category' => 'enterprise', 'is_addon' => true, 'sort_order' => 94],
        ];

        foreach ($features as $feature) {
            FeatureDefinition::updateOrCreate(
                ['feature_key' => $feature['feature_key']],
                array_merge($feature, [
                    'addon_price_yearly_afn' => $feature['addon_price_yearly_afn'] ?? 0,
                    'addon_price_yearly_usd' => $feature['addon_price_yearly_usd'] ?? 0,
                ])
            );
        }
    }

    private function createLimitDefinitions(): void
    {
        $limits = [
            ['resource_key' => 'students', 'name' => 'Students', 'description' => 'Maximum number of active students', 'unit' => 'count', 'category' => 'core', 'reset_period' => 'never', 'sort_order' => 1],
            ['resource_key' => 'staff', 'name' => 'Staff Members', 'description' => 'Maximum number of staff members', 'unit' => 'count', 'category' => 'core', 'reset_period' => 'never', 'sort_order' => 2],
            ['resource_key' => 'users', 'name' => 'Admin/Staff Users', 'description' => 'Maximum number of login users', 'unit' => 'count', 'category' => 'core', 'reset_period' => 'never', 'sort_order' => 3],
            ['resource_key' => 'schools', 'name' => 'Branches', 'description' => 'Maximum number of branches/schools', 'unit' => 'count', 'category' => 'core', 'reset_period' => 'never', 'sort_order' => 4],
            ['resource_key' => 'classes', 'name' => 'Classes', 'description' => 'Maximum number of classes', 'unit' => 'count', 'category' => 'academic', 'reset_period' => 'never', 'sort_order' => 10],
            ['resource_key' => 'documents', 'name' => 'DMS Documents', 'description' => 'Maximum number of documents', 'unit' => 'count', 'category' => 'documents', 'reset_period' => 'never', 'sort_order' => 20],
            ['resource_key' => 'exams', 'name' => 'Exams', 'description' => 'Maximum number of exams', 'unit' => 'count', 'category' => 'academic', 'reset_period' => 'never', 'sort_order' => 11],
            ['resource_key' => 'questions', 'name' => 'Exam Questions', 'description' => 'Maximum number of exam questions', 'unit' => 'count', 'category' => 'academic', 'reset_period' => 'never', 'sort_order' => 12],
            ['resource_key' => 'report_exports', 'name' => 'Report Exports per Month', 'description' => 'Monthly limit for report exports', 'unit' => 'count', 'category' => 'reports', 'reset_period' => 'monthly', 'sort_order' => 30],
            ['resource_key' => 'finance_accounts', 'name' => 'Finance Accounts', 'description' => 'Maximum number of finance accounts', 'unit' => 'count', 'category' => 'finance', 'reset_period' => 'never', 'sort_order' => 40],
            ['resource_key' => 'income_entries', 'name' => 'Income Entries', 'description' => 'Maximum number of income entries', 'unit' => 'count', 'category' => 'finance', 'reset_period' => 'never', 'sort_order' => 41],
            ['resource_key' => 'expense_entries', 'name' => 'Expense Entries', 'description' => 'Maximum number of expense entries', 'unit' => 'count', 'category' => 'finance', 'reset_period' => 'never', 'sort_order' => 42],
            ['resource_key' => 'assets', 'name' => 'Assets', 'description' => 'Maximum number of assets', 'unit' => 'count', 'category' => 'assets', 'reset_period' => 'never', 'sort_order' => 50],
            ['resource_key' => 'library_books', 'name' => 'Library Books', 'description' => 'Maximum number of library books', 'unit' => 'count', 'category' => 'library', 'reset_period' => 'never', 'sort_order' => 60],
            ['resource_key' => 'events', 'name' => 'Events', 'description' => 'Maximum number of events', 'unit' => 'count', 'category' => 'events', 'reset_period' => 'never', 'sort_order' => 70],
            ['resource_key' => 'certificate_templates', 'name' => 'Certificate Templates', 'description' => 'Maximum number of certificate templates', 'unit' => 'count', 'category' => 'templates', 'reset_period' => 'never', 'sort_order' => 80],
            ['resource_key' => 'id_card_templates', 'name' => 'ID Card Templates', 'description' => 'Maximum number of ID card templates', 'unit' => 'count', 'category' => 'templates', 'reset_period' => 'never', 'sort_order' => 81],
            ['resource_key' => 'storage_gb', 'name' => 'Storage (GB)', 'description' => 'Maximum storage in gigabytes', 'unit' => 'gb', 'category' => 'storage', 'reset_period' => 'never', 'sort_order' => 90],
        ];

        foreach ($limits as $limit) {
            LimitDefinition::updateOrCreate(
                ['resource_key' => $limit['resource_key']],
                $limit
            );
        }
    }

    private function createPlans(): void
    {
        // Define plans with their configurations
        $plans = [
            [
                'name' => 'Trial',
                'slug' => 'trial',
                'description' => '7-day free trial with full features but limited counts',
                // New fee separation structure
                'billing_period' => 'yearly',
                'license_fee_afn' => 0,
                'license_fee_usd' => 0,
                'maintenance_fee_afn' => 0,
                'maintenance_fee_usd' => 0,
                'custom_billing_days' => null,
                // Legacy pricing (auto-calculated from maintenance_fee for yearly)
                'price_yearly_afn' => 0,
                'price_yearly_usd' => 0,
                'is_default' => false,
                'trial_days' => 7,
                'grace_period_days' => 14,
                'readonly_period_days' => 60,
                'max_schools' => 1,
                'sort_order' => 0,
                'metadata' => [
                    'export_level' => 'basic',
                    'backup_mode' => 'manual',
                    'permissions_level' => 'detailed',
                ],
                'features' => [
                    'students' => true,
                    'staff' => true,
                    'classes' => true,
                    'attendance' => true,
                    'leave_management' => true,
                    'timetables' => true,
                    'student_history' => true,
                    'pdf_reports' => true,
                    'subjects' => true,
                    'teacher_subject_assignments' => true,
                    'exams' => true,
                    'exams_full' => true,
                    'question_bank' => true,
                    'grades' => true,
                    'exam_paper_generator' => true,
                    'library' => true,
                    'short_courses' => true,
                    'assets' => true,
                    'events' => true,
                    'graduation' => true,
                    'certificate_verification' => true,
                    'id_cards' => true,
                    'custom_id_templates' => true,
                    'finance' => true,
                    'fees' => true,
                    'multi_currency' => true,
                    'dms' => true,
                    'letter_templates' => true,
                    'excel_export' => true,
                    'report_templates' => true,
                    'advanced_reports' => true,
                    'custom_branding' => true,
                    'hostel' => true,
                    'multi_school' => false,
                    'api_access' => false,
                    'public_website' => false,
                ],
                'limits' => [
                    'students' => 5, 'staff' => 2, 'users' => 1, 'schools' => 1, 'classes' => 2,
                    'documents' => 5, 'exams' => 1, 'report_exports' => 2, 'finance_accounts' => 2,
                    'income_entries' => 10, 'expense_entries' => 10, 'assets' => 5,
                    'library_books' => 10, 'events' => 1, 'certificate_templates' => 1,
                    'id_card_templates' => 1, 'storage_gb' => 0,
                ],
            ],
            [
                'name' => 'Starter',
                'slug' => 'starter',
                'description' => 'Operational core + exams lite',
                // New fee separation structure
                'billing_period' => 'yearly',
                'license_fee_afn' => 0,
                'license_fee_usd' => 0,
                'maintenance_fee_afn' => 12000,
                'maintenance_fee_usd' => 150,
                'custom_billing_days' => null,
                // Legacy pricing (auto-calculated from maintenance_fee for yearly)
                'price_yearly_afn' => 12000,
                'price_yearly_usd' => 150,
                'is_default' => true,
                'trial_days' => 0,
                'grace_period_days' => 14,
                'readonly_period_days' => 60,
                'max_schools' => 1,
                'sort_order' => 1,
                'metadata' => [
                    'export_level' => 'basic',
                    'backup_mode' => 'manual',
                    'permissions_level' => 'detailed',
                ],
                'features' => [
                    'students' => true,
                    'staff' => true,
                    'classes' => true,
                    'attendance' => true,
                    'leave_management' => true,
                    'timetables' => true,
                    'student_history' => true,
                    'pdf_reports' => true,
                    'subjects' => true,
                    'teacher_subject_assignments' => true,
                    'exams' => true,
                    'exams_full' => false,
                    'question_bank' => false,
                    'grades' => false,
                    'exam_paper_generator' => false,
                    'library' => false,
                    'short_courses' => false,
                    'assets' => false,
                    'events' => false,
                    'graduation' => false,
                    'certificate_verification' => false,
                    'id_cards' => false,
                    'custom_id_templates' => false,
                    'finance' => false,
                    'fees' => false,
                    'multi_currency' => false,
                    'dms' => false,
                    'letter_templates' => false,
                    'excel_export' => false,
                    'report_templates' => false,
                    'advanced_reports' => false,
                    'custom_branding' => false,
                    'hostel' => true,
                    'multi_school' => false,
                    'api_access' => false,
                    'public_website' => false,
                ],
                'limits' => [
                    'students' => 250, 'staff' => 50, 'users' => 10, 'schools' => 1, 'classes' => 30,
                    'exams' => 20, 'report_exports' => 100, 'storage_gb' => 5,
                ],
            ],
            [
                'name' => 'Pro',
                'slug' => 'pro',
                'description' => 'Full academic workflow',
                // New fee separation structure
                'billing_period' => 'yearly',
                'license_fee_afn' => 0,
                'license_fee_usd' => 0,
                'maintenance_fee_afn' => 25000,
                'maintenance_fee_usd' => 300,
                'custom_billing_days' => null,
                // Legacy pricing (auto-calculated from maintenance_fee for yearly)
                'price_yearly_afn' => 25000,
                'price_yearly_usd' => 300,
                'is_default' => false,
                'trial_days' => 0,
                'grace_period_days' => 14,
                'readonly_period_days' => 60,
                'max_schools' => 1,
                'sort_order' => 2,
                'metadata' => [
                    'export_level' => 'advanced',
                    'backup_mode' => 'manual',
                    'permissions_level' => 'detailed',
                ],
                'features' => [
                    'students' => true,
                    'staff' => true,
                    'classes' => true,
                    'attendance' => true,
                    'leave_management' => true,
                    'timetables' => true,
                    'student_history' => true,
                    'pdf_reports' => true,
                    'subjects' => true,
                    'teacher_subject_assignments' => true,
                    'exams' => true,
                    'exams_full' => true,
                    'question_bank' => true,
                    'grades' => true,
                    'exam_paper_generator' => true,
                    'library' => true,
                    'short_courses' => true,
                    'assets' => false,
                    'events' => false,
                    'graduation' => false,
                    'certificate_verification' => false,
                    'id_cards' => false,
                    'custom_id_templates' => false,
                    'finance' => false,
                    'fees' => false,
                    'multi_currency' => false,
                    'dms' => false,
                    'letter_templates' => false,
                    'excel_export' => true,
                    'report_templates' => false,
                    'advanced_reports' => false,
                    'custom_branding' => false,
                    'hostel' => false,
                    'multi_school' => false,
                    'api_access' => false,
                    'public_website' => false,
                ],
                'limits' => [
                    'students' => 600, 'staff' => 120, 'users' => 30, 'schools' => 1, 'classes' => 80,
                    'exams' => 50, 'report_exports' => 300, 'library_books' => 2000, 'storage_gb' => 10,
                ],
            ],
            [
                'name' => 'Complete',
                'slug' => 'complete',
                'description' => 'Administration, finance, and credentials',
                // New fee separation structure
                'billing_period' => 'yearly',
                'license_fee_afn' => 0,
                'license_fee_usd' => 0,
                'maintenance_fee_afn' => 35000,
                'maintenance_fee_usd' => 420,
                'custom_billing_days' => null,
                // Legacy pricing (auto-calculated from maintenance_fee for yearly)
                'price_yearly_afn' => 35000,
                'price_yearly_usd' => 420,
                'is_default' => false,
                'trial_days' => 0,
                'grace_period_days' => 14,
                'readonly_period_days' => 60,
                'max_schools' => 1,
                'sort_order' => 3,
                'metadata' => [
                    'export_level' => 'advanced_templates',
                    'backup_mode' => 'automatic',
                    'permissions_level' => 'detailed',
                ],
                'features' => [
                    'students' => true,
                    'staff' => true,
                    'classes' => true,
                    'attendance' => true,
                    'leave_management' => true,
                    'timetables' => true,
                    'student_history' => true,
                    'pdf_reports' => true,
                    'subjects' => true,
                    'teacher_subject_assignments' => true,
                    'exams' => true,
                    'exams_full' => true,
                    'question_bank' => true,
                    'grades' => true,
                    'exam_paper_generator' => true,
                    'library' => true,
                    'short_courses' => true,
                    'assets' => true,
                    'events' => true,
                    'graduation' => true,
                    'certificate_verification' => true,
                    'id_cards' => true,
                    'custom_id_templates' => true,
                    'finance' => true,
                    'fees' => true,
                    'multi_currency' => true,
                    'dms' => true,
                    'letter_templates' => true,
                    'excel_export' => true,
                    'report_templates' => true,
                    'advanced_reports' => false,
                    'custom_branding' => false,
                    'hostel' => false,
                    'multi_school' => false,
                    'api_access' => false,
                    'public_website' => true,
                ],
                'limits' => [
                    'students' => 1200, 'staff' => 200, 'users' => 50, 'schools' => 1, 'classes' => 150,
                    'documents' => 5000, 'exams' => 100, 'report_exports' => 1000, 'finance_accounts' => 100,
                    'income_entries' => 10000, 'expense_entries' => 10000, 'assets' => 2000,
                    'library_books' => 5000, 'events' => 200, 'certificate_templates' => 100,
                    'id_card_templates' => 50, 'storage_gb' => 50,
                ],
            ],
            [
                'name' => 'Enterprise',
                'slug' => 'enterprise',
                'description' => 'Configurable / contract-based',
                // New fee separation structure
                'billing_period' => 'yearly',
                'license_fee_afn' => 0,
                'license_fee_usd' => 0,
                'maintenance_fee_afn' => 0,
                'maintenance_fee_usd' => 0,
                'custom_billing_days' => null,
                // Legacy pricing (auto-calculated from maintenance_fee for yearly)
                'price_yearly_afn' => 0,
                'price_yearly_usd' => 0,
                'is_default' => false,
                'trial_days' => 0,
                'grace_period_days' => 14,
                'readonly_period_days' => 60,
                'max_schools' => 5,
                'per_school_price_afn' => 10000,
                'per_school_price_usd' => 120,
                'sort_order' => 4,
                'metadata' => [
                    'export_level' => 'custom',
                    'backup_mode' => 'sla',
                    'permissions_level' => 'custom',
                ],
                'features' => [
                    'students' => true,
                    'staff' => true,
                    'classes' => true,
                    'attendance' => true,
                    'leave_management' => true,
                    'timetables' => true,
                    'student_history' => true,
                    'pdf_reports' => true,
                    'subjects' => true,
                    'teacher_subject_assignments' => true,
                    'exams' => true,
                    'exams_full' => true,
                    'question_bank' => true,
                    'grades' => true,
                    'exam_paper_generator' => true,
                    'library' => true,
                    'short_courses' => true,
                    'assets' => true,
                    'events' => true,
                    'graduation' => true,
                    'certificate_verification' => true,
                    'id_cards' => true,
                    'custom_id_templates' => true,
                    'finance' => true,
                    'fees' => true,
                    'multi_currency' => true,
                    'dms' => true,
                    'letter_templates' => true,
                    'excel_export' => true,
                    'report_templates' => true,
                    'advanced_reports' => true,
                    'custom_branding' => true,
                    'hostel' => true,
                    'multi_school' => true,
                    'api_access' => true,
                    'public_website' => true,
                ],
                'limits' => [
                    'students' => -1, 'staff' => -1, 'users' => -1, 'schools' => -1, 'classes' => -1,
                    'documents' => -1, 'exams' => -1, 'report_exports' => -1, 'finance_accounts' => -1,
                    'income_entries' => -1, 'expense_entries' => -1, 'assets' => -1,
                    'library_books' => -1, 'events' => -1, 'certificate_templates' => -1,
                    'id_card_templates' => -1, 'storage_gb' => 200,
                ],
            ],
        ];

        $allFeatureKeys = FeatureDefinition::pluck('feature_key')->toArray();
        $allLimitKeys = LimitDefinition::pluck('resource_key')->toArray();

        foreach ($plans as $planData) {
            $features = $planData['features'];
            $limits = $planData['limits'];
            unset($planData['features'], $planData['limits']);

            $isCustom = ($planData['slug'] === 'trial');

            $plan = SubscriptionPlan::updateOrCreate(
                ['slug' => $planData['slug']],
                array_merge($planData, [
                    'per_school_price_afn' => $planData['per_school_price_afn'] ?? 0,
                    'per_school_price_usd' => $planData['per_school_price_usd'] ?? 0,
                    'is_active' => true, // CRITICAL: Plans must be active to appear in API
                    'is_custom' => $isCustom, // Hide trial from public plans
                ])
            );

            // Ensure we have the plan with id - fetch fresh from database if needed
            if (empty($plan->id)) {
                $plan = SubscriptionPlan::where('slug', $planData['slug'])->first();
            }

            // Validate that plan has an id before proceeding
            if (empty($plan->id)) {
                throw new \RuntimeException("Failed to create or retrieve plan with slug: {$planData['slug']}. Plan ID is missing.");
            }

            $this->syncPlanFeatures($plan, $features, $allFeatureKeys);
            $this->syncPlanLimits($plan, $limits, $allLimitKeys);
        }

        // Deactivate legacy plans not in the current catalog
        $allowedSlugs = array_map(fn ($plan) => $plan['slug'], $plans);
        SubscriptionPlan::whereNotIn('slug', $allowedSlugs)
            ->where('is_custom', false)
            ->update(['is_active' => false]);
    }

    private function syncPlanFeatures(SubscriptionPlan $plan, array $featureConfig, array $allFeatureKeys): void
    {
        $autoEnable = $plan->slug === 'trial';

        foreach ($allFeatureKeys as $featureKey) {
            $isEnabled = $featureConfig[$featureKey] ?? ($autoEnable ? true : false);

            PlanFeature::updateOrCreate(
                ['plan_id' => $plan->id, 'feature_key' => $featureKey],
                ['is_enabled' => $isEnabled]
            );
        }

        // Disable orphaned plan features if definitions were removed/renamed.
        PlanFeature::where('plan_id', $plan->id)
            ->whereNotIn('feature_key', $allFeatureKeys)
            ->update(['is_enabled' => false]);
    }

    private function syncPlanLimits(SubscriptionPlan $plan, array $limitConfig, array $allLimitKeys): void
    {
        // Default to unlimited for new limits until explicitly configured.
        $defaultLimit = -1;
        
        // Get limit-feature mapping from config
        $limitFeatureMap = config('subscription_features.limit_feature_map', []);
        
        // Get enabled features for this plan
        $enabledFeatures = $plan->features()
            ->where('is_enabled', true)
            ->pluck('feature_key')
            ->toArray();
        
        $enabledFeaturesSet = array_fill_keys($enabledFeatures, true);

        foreach ($allLimitKeys as $resourceKey) {
            // Check if this resource requires a feature that is enabled
            $requiredFeature = $limitFeatureMap[$resourceKey] ?? null;
            
            if ($requiredFeature !== null) {
                $requiredFeatures = is_array($requiredFeature) ? $requiredFeature : [$requiredFeature];
                $hasRequiredFeature = false;

                foreach ($requiredFeatures as $featureKey) {
                    if (isset($enabledFeaturesSet[$featureKey])) {
                        $hasRequiredFeature = true;
                        break;
                    }
                }

                // Skip limits for resources whose features are disabled
                if (!$hasRequiredFeature) {
                    continue;
                }
            }

            // Only set limit if explicitly configured in limitConfig
            // If not in config and feature is enabled, use default (unlimited)
            // If not in config and feature is disabled, skip (already handled above)
            $limitValue = $limitConfig[$resourceKey] ?? $defaultLimit;

            PlanLimit::updateOrCreate(
                ['plan_id' => $plan->id, 'resource_key' => $resourceKey],
                ['limit_value' => $limitValue, 'warning_threshold' => 80]
            );
        }
        
        // Remove limits for resources whose features are disabled
        // Get all resource keys that require features not enabled in this plan
        $disabledResourceKeys = [];
        foreach ($limitFeatureMap as $resourceKey => $requiredFeature) {
            $requiredFeatures = is_array($requiredFeature) ? $requiredFeature : [$requiredFeature];
            $hasRequiredFeature = false;

            foreach ($requiredFeatures as $featureKey) {
                if (isset($enabledFeaturesSet[$featureKey])) {
                    $hasRequiredFeature = true;
                    break;
                }
            }

            if (!$hasRequiredFeature) {
                $disabledResourceKeys[] = $resourceKey;
            }
        }
        
        // Delete limits for disabled features
        if (!empty($disabledResourceKeys)) {
            PlanLimit::where('plan_id', $plan->id)
                ->whereIn('resource_key', $disabledResourceKeys)
                ->delete();
        }
    }
}
