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
            // Core - Always enabled
            ['feature_key' => 'students', 'name' => 'Student Management', 'category' => 'core', 'is_addon' => false, 'sort_order' => 1],
            ['feature_key' => 'attendance', 'name' => 'Basic Attendance', 'category' => 'core', 'is_addon' => false, 'sort_order' => 2],
            ['feature_key' => 'classes', 'name' => 'Class Management', 'category' => 'core', 'is_addon' => false, 'sort_order' => 3],
            ['feature_key' => 'pdf_reports', 'name' => 'PDF Reports', 'category' => 'core', 'is_addon' => false, 'sort_order' => 4],
            
            // Academic
            ['feature_key' => 'subjects', 'name' => 'Subject Management', 'category' => 'academic', 'is_addon' => true, 'addon_price_yearly_afn' => 2000, 'addon_price_yearly_usd' => 25, 'sort_order' => 10],
            ['feature_key' => 'exams', 'name' => 'Exam Management', 'category' => 'academic', 'is_addon' => true, 'addon_price_yearly_afn' => 5000, 'addon_price_yearly_usd' => 60, 'sort_order' => 11],
            ['feature_key' => 'grades', 'name' => 'Grade Management', 'category' => 'academic', 'is_addon' => true, 'addon_price_yearly_afn' => 3000, 'addon_price_yearly_usd' => 35, 'sort_order' => 12],
            ['feature_key' => 'question_bank', 'name' => 'Question Bank', 'category' => 'academic', 'is_addon' => true, 'addon_price_yearly_afn' => 5000, 'addon_price_yearly_usd' => 60, 'sort_order' => 13],
            ['feature_key' => 'exam_paper_generator', 'name' => 'Exam Paper Generator', 'category' => 'academic', 'is_addon' => true, 'addon_price_yearly_afn' => 8000, 'addon_price_yearly_usd' => 95, 'sort_order' => 14],
            ['feature_key' => 'timetables', 'name' => 'Timetable Generation', 'category' => 'academic', 'is_addon' => true, 'addon_price_yearly_afn' => 5000, 'addon_price_yearly_usd' => 60, 'sort_order' => 15],
            ['feature_key' => 'graduation', 'name' => 'Graduation & Certificates', 'category' => 'academic', 'is_addon' => true, 'addon_price_yearly_afn' => 8000, 'addon_price_yearly_usd' => 95, 'sort_order' => 16],
            
            // Finance
            ['feature_key' => 'finance', 'name' => 'Finance Module', 'category' => 'finance', 'is_addon' => true, 'addon_price_yearly_afn' => 10000, 'addon_price_yearly_usd' => 120, 'sort_order' => 20],
            ['feature_key' => 'fees', 'name' => 'Fee Management', 'category' => 'finance', 'is_addon' => true, 'addon_price_yearly_afn' => 8000, 'addon_price_yearly_usd' => 95, 'sort_order' => 21],
            ['feature_key' => 'multi_currency', 'name' => 'Multi-Currency Support', 'category' => 'finance', 'is_addon' => true, 'addon_price_yearly_afn' => 5000, 'addon_price_yearly_usd' => 60, 'sort_order' => 22],
            
            // Documents
            ['feature_key' => 'dms', 'name' => 'Document Management (DMS)', 'category' => 'documents', 'is_addon' => true, 'addon_price_yearly_afn' => 10000, 'addon_price_yearly_usd' => 120, 'sort_order' => 30],
            ['feature_key' => 'letter_templates', 'name' => 'Letter Templates', 'category' => 'documents', 'is_addon' => true, 'addon_price_yearly_afn' => 5000, 'addon_price_yearly_usd' => 60, 'sort_order' => 31],
            ['feature_key' => 'excel_export', 'name' => 'Excel Export', 'category' => 'documents', 'is_addon' => true, 'addon_price_yearly_afn' => 3000, 'addon_price_yearly_usd' => 35, 'sort_order' => 32],
            
            // Library
            ['feature_key' => 'library', 'name' => 'Library Management', 'category' => 'library', 'is_addon' => true, 'addon_price_yearly_afn' => 5000, 'addon_price_yearly_usd' => 60, 'sort_order' => 40],
            
            // Assets
            ['feature_key' => 'assets', 'name' => 'Asset Management', 'category' => 'assets', 'is_addon' => true, 'addon_price_yearly_afn' => 5000, 'addon_price_yearly_usd' => 60, 'sort_order' => 50],
            
            // Events
            ['feature_key' => 'events', 'name' => 'Event Management', 'category' => 'events', 'is_addon' => true, 'addon_price_yearly_afn' => 8000, 'addon_price_yearly_usd' => 95, 'sort_order' => 60],
            
            // ID Cards
            ['feature_key' => 'id_cards', 'name' => 'ID Card Generation', 'category' => 'id_cards', 'is_addon' => true, 'addon_price_yearly_afn' => 5000, 'addon_price_yearly_usd' => 60, 'sort_order' => 70],
            ['feature_key' => 'custom_id_templates', 'name' => 'Custom ID Templates', 'category' => 'id_cards', 'is_addon' => true, 'addon_price_yearly_afn' => 3000, 'addon_price_yearly_usd' => 35, 'sort_order' => 71],
            
            // Branding
            ['feature_key' => 'custom_branding', 'name' => 'Custom Branding', 'category' => 'branding', 'is_addon' => true, 'addon_price_yearly_afn' => 5000, 'addon_price_yearly_usd' => 60, 'sort_order' => 80],
            
            // Short-term courses
            ['feature_key' => 'short_courses', 'name' => 'Short-Term Courses', 'category' => 'courses', 'is_addon' => true, 'addon_price_yearly_afn' => 5000, 'addon_price_yearly_usd' => 60, 'sort_order' => 90],
            
            // Leave Management
            ['feature_key' => 'leave_management', 'name' => 'Leave Management', 'category' => 'hr', 'is_addon' => true, 'addon_price_yearly_afn' => 3000, 'addon_price_yearly_usd' => 35, 'sort_order' => 100],
            
            // Hostel
            ['feature_key' => 'hostel', 'name' => 'Hostel Management', 'category' => 'hostel', 'is_addon' => true, 'addon_price_yearly_afn' => 8000, 'addon_price_yearly_usd' => 95, 'sort_order' => 110],
            
            // Enterprise
            ['feature_key' => 'multi_school', 'name' => 'Multi-School Support', 'category' => 'enterprise', 'is_addon' => true, 'addon_price_yearly_afn' => 20000, 'addon_price_yearly_usd' => 240, 'sort_order' => 200],
            ['feature_key' => 'api_access', 'name' => 'API Access', 'category' => 'enterprise', 'is_addon' => true, 'addon_price_yearly_afn' => 15000, 'addon_price_yearly_usd' => 180, 'sort_order' => 201],
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
            ['resource_key' => 'schools', 'name' => 'Schools', 'description' => 'Maximum number of schools', 'unit' => 'count', 'category' => 'core', 'reset_period' => 'never', 'sort_order' => 4],
            ['resource_key' => 'classes', 'name' => 'Classes', 'description' => 'Maximum number of classes', 'unit' => 'count', 'category' => 'academic', 'reset_period' => 'never', 'sort_order' => 10],
            ['resource_key' => 'documents', 'name' => 'DMS Documents', 'description' => 'Maximum number of documents', 'unit' => 'count', 'category' => 'documents', 'reset_period' => 'never', 'sort_order' => 20],
            ['resource_key' => 'exams', 'name' => 'Exams', 'description' => 'Maximum number of exams', 'unit' => 'count', 'category' => 'academic', 'reset_period' => 'never', 'sort_order' => 11],
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
                'price_yearly_afn' => 0,
                'price_yearly_usd' => 0,
                'is_default' => true,
                'trial_days' => 7,
                'grace_period_days' => 14,
                'readonly_period_days' => 60,
                'max_schools' => 1,
                'sort_order' => 0,
                'features' => [
                    'students' => true, 'attendance' => true, 'classes' => true, 'pdf_reports' => true,
                    'subjects' => true, 'exams' => true, 'grades' => true, 'question_bank' => true,
                    'exam_paper_generator' => true, 'timetables' => true, 'graduation' => true,
                    'finance' => true, 'fees' => true, 'multi_currency' => true,
                    'dms' => true, 'letter_templates' => true, 'excel_export' => true,
                    'library' => true, 'assets' => true, 'events' => true,
                    'id_cards' => true, 'custom_id_templates' => true, 'custom_branding' => true,
                    'short_courses' => true, 'leave_management' => true, 'hostel' => true,
                    'multi_school' => false, 'api_access' => false,
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
                'description' => 'For small madrasas with up to 50 students',
                'price_yearly_afn' => 5000,
                'price_yearly_usd' => 60,
                'is_default' => false,
                'trial_days' => 0,
                'grace_period_days' => 14,
                'readonly_period_days' => 60,
                'max_schools' => 1,
                'sort_order' => 1,
                'features' => [
                    'students' => true, 'attendance' => true, 'classes' => true, 'pdf_reports' => true,
                    'subjects' => false, 'exams' => false, 'grades' => false, 'question_bank' => false,
                    'exam_paper_generator' => false, 'timetables' => false, 'graduation' => false,
                    'finance' => false, 'fees' => false, 'multi_currency' => false,
                    'dms' => false, 'letter_templates' => false, 'excel_export' => false,
                    'library' => false, 'assets' => false, 'events' => false,
                    'id_cards' => false, 'custom_id_templates' => false, 'custom_branding' => false,
                    'short_courses' => false, 'leave_management' => false, 'hostel' => false,
                    'multi_school' => false, 'api_access' => false,
                ],
                'limits' => [
                    'students' => 50, 'staff' => 10, 'users' => 3, 'schools' => 1, 'classes' => 10,
                    'documents' => 100, 'exams' => 5, 'report_exports' => 20, 'finance_accounts' => 5,
                    'income_entries' => 200, 'expense_entries' => 200, 'assets' => 50,
                    'library_books' => 100, 'events' => 5, 'certificate_templates' => 3,
                    'id_card_templates' => 2, 'storage_gb' => 1,
                ],
            ],
            [
                'name' => 'Basic',
                'slug' => 'basic',
                'description' => 'For small schools with up to 200 students',
                'price_yearly_afn' => 15000,
                'price_yearly_usd' => 180,
                'is_default' => false,
                'trial_days' => 0,
                'grace_period_days' => 14,
                'readonly_period_days' => 60,
                'max_schools' => 1,
                'sort_order' => 2,
                'features' => [
                    'students' => true, 'attendance' => true, 'classes' => true, 'pdf_reports' => true,
                    'subjects' => true, 'exams' => true, 'grades' => true, 'question_bank' => false,
                    'exam_paper_generator' => false, 'timetables' => false, 'graduation' => false,
                    'finance' => true, 'fees' => false, 'multi_currency' => false,
                    'dms' => false, 'letter_templates' => false, 'excel_export' => true,
                    'library' => true, 'assets' => false, 'events' => false,
                    'id_cards' => true, 'custom_id_templates' => false, 'custom_branding' => false,
                    'short_courses' => false, 'leave_management' => true, 'hostel' => false,
                    'multi_school' => false, 'api_access' => false,
                ],
                'limits' => [
                    'students' => 200, 'staff' => 30, 'users' => 10, 'schools' => 1, 'classes' => 30,
                    'documents' => 500, 'exams' => 20, 'report_exports' => 100, 'finance_accounts' => 15,
                    'income_entries' => 1000, 'expense_entries' => 1000, 'assets' => 200,
                    'library_books' => 500, 'events' => 20, 'certificate_templates' => 10,
                    'id_card_templates' => 5, 'storage_gb' => 5,
                ],
            ],
            [
                'name' => 'Pro',
                'slug' => 'pro',
                'description' => 'For medium schools with up to 1000 students',
                'price_yearly_afn' => 35000,
                'price_yearly_usd' => 420,
                'is_default' => false,
                'trial_days' => 0,
                'grace_period_days' => 14,
                'readonly_period_days' => 60,
                'max_schools' => 1,
                'sort_order' => 3,
                'features' => [
                    'students' => true, 'attendance' => true, 'classes' => true, 'pdf_reports' => true,
                    'subjects' => true, 'exams' => true, 'grades' => true, 'question_bank' => true,
                    'exam_paper_generator' => true, 'timetables' => true, 'graduation' => true,
                    'finance' => true, 'fees' => true, 'multi_currency' => false,
                    'dms' => true, 'letter_templates' => true, 'excel_export' => true,
                    'library' => true, 'assets' => true, 'events' => true,
                    'id_cards' => true, 'custom_id_templates' => true, 'custom_branding' => true,
                    'short_courses' => true, 'leave_management' => true, 'hostel' => true,
                    'multi_school' => false, 'api_access' => false,
                ],
                'limits' => [
                    'students' => 1000, 'staff' => 100, 'users' => 30, 'schools' => 1, 'classes' => 100,
                    'documents' => 2000, 'exams' => 50, 'report_exports' => 500, 'finance_accounts' => 50,
                    'income_entries' => 5000, 'expense_entries' => 5000, 'assets' => 1000,
                    'library_books' => 2000, 'events' => 100, 'certificate_templates' => 30,
                    'id_card_templates' => 20, 'storage_gb' => 20,
                ],
            ],
            [
                'name' => 'Enterprise',
                'slug' => 'enterprise',
                'description' => 'For large schools and multi-school organizations',
                'price_yearly_afn' => 75000,
                'price_yearly_usd' => 900,
                'is_default' => false,
                'trial_days' => 0,
                'grace_period_days' => 14,
                'readonly_period_days' => 60,
                'max_schools' => 5,
                'per_school_price_afn' => 10000,
                'per_school_price_usd' => 120,
                'sort_order' => 4,
                'features' => [
                    'students' => true, 'attendance' => true, 'classes' => true, 'pdf_reports' => true,
                    'subjects' => true, 'exams' => true, 'grades' => true, 'question_bank' => true,
                    'exam_paper_generator' => true, 'timetables' => true, 'graduation' => true,
                    'finance' => true, 'fees' => true, 'multi_currency' => true,
                    'dms' => true, 'letter_templates' => true, 'excel_export' => true,
                    'library' => true, 'assets' => true, 'events' => true,
                    'id_cards' => true, 'custom_id_templates' => true, 'custom_branding' => true,
                    'short_courses' => true, 'leave_management' => true, 'hostel' => true,
                    'multi_school' => true, 'api_access' => true,
                ],
                'limits' => [
                    'students' => -1, 'staff' => -1, 'users' => -1, 'schools' => 5, 'classes' => -1,
                    'documents' => -1, 'exams' => -1, 'report_exports' => -1, 'finance_accounts' => -1,
                    'income_entries' => -1, 'expense_entries' => -1, 'assets' => -1,
                    'library_books' => -1, 'events' => -1, 'certificate_templates' => -1,
                    'id_card_templates' => -1, 'storage_gb' => 100,
                ],
            ],
        ];

        foreach ($plans as $planData) {
            $features = $planData['features'];
            $limits = $planData['limits'];
            unset($planData['features'], $planData['limits']);

            $plan = SubscriptionPlan::updateOrCreate(
                ['slug' => $planData['slug']],
                array_merge($planData, [
                    'per_school_price_afn' => $planData['per_school_price_afn'] ?? 0,
                    'per_school_price_usd' => $planData['per_school_price_usd'] ?? 0,
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

            // Create plan features
            foreach ($features as $featureKey => $isEnabled) {
                PlanFeature::updateOrCreate(
                    ['plan_id' => $plan->id, 'feature_key' => $featureKey],
                    ['is_enabled' => $isEnabled]
                );
            }

            // Create plan limits
            foreach ($limits as $resourceKey => $limitValue) {
                PlanLimit::updateOrCreate(
                    ['plan_id' => $plan->id, 'resource_key' => $resourceKey],
                    ['limit_value' => $limitValue, 'warning_threshold' => 80]
                );
            }
        }
    }
}
