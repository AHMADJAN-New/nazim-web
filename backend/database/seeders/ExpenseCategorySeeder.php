<?php

namespace Database\Seeders;

use App\Models\ExpenseCategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ExpenseCategorySeeder extends Seeder
{
    /**
     * Seed the expense_categories table.
     *
     * Creates Islamic Pashto expense categories for schools for each organization.
     */
    public function run(): void
    {
        $this->command->info('Seeding expense categories...');

        // Get all organizations
        $organizations = DB::table('organizations')
            ->whereNull('deleted_at')
            ->get();

        if ($organizations->isEmpty()) {
            $this->command->warn('No organizations found. Please run DatabaseSeeder first.');
            return;
        }

        $totalCreated = 0;

        foreach ($organizations as $organization) {
            $this->command->info("Creating expense categories for {$organization->name}...");

            // Get all schools for this organization
            $schools = DB::table('school_branding')
                ->where('organization_id', $organization->id)
                ->whereNull('deleted_at')
                ->get();

            if ($schools->isEmpty()) {
                $this->command->warn("  ⚠ No schools found for organization {$organization->name}. Skipping expense category seeding for this org.");
                continue;
            }

            foreach ($schools as $school) {
                $this->command->info("Creating expense categories for {$organization->name} - school: {$school->school_name}...");

                // Create expense categories for this school
                $created = $this->createExpenseCategoriesForSchool($organization->id, $school->id);
                $totalCreated += $created;

                if ($created > 0) {
                    $this->command->info("  → Created {$created} expense category(ies) for {$organization->name} - {$school->school_name}");
                }
            }
        }

        if ($totalCreated > 0) {
            $this->command->info("  → Total: Created {$totalCreated} expense category(ies)");
        }

        $this->command->info('✅ Expense categories seeded successfully!');
    }

    /**
     * Create expense categories for a specific school
     */
    protected function createExpenseCategoriesForSchool(string $organizationId, string $schoolId): int
    {
        $createdCount = 0;
        $displayOrder = 1;

        // Define the expense categories to create (Islamic Pashto categories for schools)
        $categories = [
            [
                'name' => 'د استادانو معاشات',
                'name_en' => 'Teacher Salaries',
                'code' => 'TEACHER_SAL',
                'description' => 'د استادانو او ښوونکو معاشات',
                'description_en' => 'Salaries for teachers and instructors',
            ],
            [
                'name' => 'د کارمندانو معاشات',
                'name_en' => 'Staff Salaries',
                'code' => 'STAFF_SAL',
                'description' => 'د کارمندانو معاشات',
                'description_en' => 'Salaries for administrative staff',
            ],
            [
                'name' => 'د بریښنا پیسې',
                'name_en' => 'Electricity',
                'code' => 'ELECTRICITY',
                'description' => 'د بریښنا بلونه',
                'description_en' => 'Electricity bills',
            ],
            [
                'name' => 'د اوبو پیسې',
                'name_en' => 'Water',
                'code' => 'WATER',
                'description' => 'د اوبو بلونه',
                'description_en' => 'Water bills',
            ],
            [
                'name' => 'د ګاز پیسې',
                'name_en' => 'Gas',
                'code' => 'GAS',
                'description' => 'د ګاز بلونه',
                'description_en' => 'Gas bills',
            ],
            [
                'name' => 'د انټرنټ پیسې',
                'name_en' => 'Internet',
                'code' => 'INTERNET',
                'description' => 'د انټرنټ بلونه',
                'description_en' => 'Internet bills',
            ],
            [
                'name' => 'د کتابونو پیسې',
                'name_en' => 'Books & Materials',
                'code' => 'BOOKS',
                'description' => 'د کتابونو او زده کړو موادو پیسې',
                'description_en' => 'Books and educational materials',
            ],
            [
                'name' => 'د فرنیچر پیسې',
                'name_en' => 'Furniture',
                'code' => 'FURNITURE',
                'description' => 'د میزو، کرسیو او نورو فرنیچر پیسې',
                'description_en' => 'Tables, chairs and other furniture',
            ],
            [
                'name' => 'د ساتنې پیسې',
                'name_en' => 'Maintenance',
                'code' => 'MAINTENANCE',
                'description' => 'د ودانۍ او سامان ساتنې پیسې',
                'description_en' => 'Building and equipment maintenance',
            ],
            [
                'name' => 'د پاکولو پیسې',
                'name_en' => 'Cleaning',
                'code' => 'CLEANING',
                'description' => 'د پاکولو او صفایۍ پیسې',
                'description_en' => 'Cleaning and sanitation expenses',
            ],
            [
                'name' => 'د سفر پیسې',
                'name_en' => 'Transportation',
                'code' => 'TRANSPORT',
                'description' => 'د سفر او ترانسپورټ پیسې',
                'description_en' => 'Transportation and travel expenses',
            ],
            [
                'name' => 'د روغتیا پیسې',
                'name_en' => 'Medical',
                'code' => 'MEDICAL',
                'description' => 'د روغتیا او درملنې پیسې',
                'description_en' => 'Medical and health expenses',
            ],
            [
                'name' => 'د خوړو پیسې',
                'name_en' => 'Food & Catering',
                'code' => 'FOOD',
                'description' => 'د خوړو او میلمستیا پیسې',
                'description_en' => 'Food and catering expenses',
            ],
            [
                'name' => 'د پروژو پیسې',
                'name_en' => 'Project Expenses',
                'code' => 'PROJECT',
                'description' => 'د ځانګړو پروژو پیسې',
                'description_en' => 'Special project expenses',
            ],
            [
                'name' => 'نور مصارف',
                'name_en' => 'Other Expenses',
                'code' => 'OTHER',
                'description' => 'نور مصارف',
                'description_en' => 'Other miscellaneous expenses',
            ],
        ];

        foreach ($categories as $categoryData) {
            // Check if category already exists for this school (by code, organization_id, and school_id)
            $exists = ExpenseCategory::where('organization_id', $organizationId)
                ->where('school_id', $schoolId)
                ->where('code', $categoryData['code'])
                ->whereNull('deleted_at')
                ->exists();

            if (!$exists) {
                ExpenseCategory::create([
                    'organization_id' => $organizationId,
                    'school_id' => $schoolId,
                    'name' => $categoryData['name'],
                    'code' => $categoryData['code'],
                    'description' => $categoryData['description'],
                    'is_active' => true,
                    'display_order' => $displayOrder++,
                ]);

                $createdCount++;
                $this->command->info("    ✓ Created expense category: {$categoryData['name']} ({$categoryData['name_en']})");
            } else {
                $this->command->info("    ⊘ Expense category {$categoryData['code']} already exists for this school");
            }
        }

        return $createdCount;
    }
}

