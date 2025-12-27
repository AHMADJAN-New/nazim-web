<?php

namespace Database\Seeders;

use App\Models\IncomeCategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class IncomeCategorySeeder extends Seeder
{
    /**
     * Seed the income_categories table.
     *
     * Creates Islamic Pashto income categories for schools for each organization.
     */
    public function run(): void
    {
        $this->command->info('Seeding income categories...');

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
            $this->command->info("Creating income categories for {$organization->name}...");

            // Get all schools for this organization
            $schools = DB::table('school_branding')
                ->where('organization_id', $organization->id)
                ->whereNull('deleted_at')
                ->get();

            if ($schools->isEmpty()) {
                $this->command->warn("  ⚠ No schools found for organization {$organization->name}. Skipping income category seeding for this org.");
                continue;
            }

            foreach ($schools as $school) {
                $this->command->info("Creating income categories for {$organization->name} - school: {$school->school_name}...");

                // Create income categories for this school
                $created = $this->createIncomeCategoriesForSchool($organization->id, $school->id);
                $totalCreated += $created;

                if ($created > 0) {
                    $this->command->info("  → Created {$created} income category(ies) for {$organization->name} - {$school->school_name}");
                }
            }
        }

        if ($totalCreated > 0) {
            $this->command->info("  → Total: Created {$totalCreated} income category(ies)");
        }

        $this->command->info('✅ Income categories seeded successfully!');
    }

    /**
     * Create income categories for a specific school
     */
    protected function createIncomeCategoriesForSchool(string $organizationId, string $schoolId): int
    {
        $createdCount = 0;
        $displayOrder = 1;

        // Define the income categories to create (Islamic Pashto categories for schools)
        $categories = [
            [
                'name' => 'د زده کړیالانو فیس',
                'name_en' => 'Student Fees',
                'code' => 'STUDENT_FEES',
                'description' => 'د زده کړیالانو ټولو فیسونو لپاره تادیات',
                'description_en' => 'Student fees and tuition',
                'is_restricted' => false,
            ],
            [
                'name' => 'د فیسو پیسې',
                'name_en' => 'Tuition Fees',
                'code' => 'TUITION',
                'description' => 'د زده کړیالانو د فیسو پیسې',
                'description_en' => 'Student tuition fees',
                'is_restricted' => false,
            ],
            [
                'name' => 'د ثبتولو فیس',
                'name_en' => 'Registration Fees',
                'code' => 'REG_FEE',
                'description' => 'د نویو زده کړیالانو د ثبتولو فیس',
                'description_en' => 'New student registration fees',
                'is_restricted' => false,
            ],
            [
                'name' => 'د ازموینې فیس',
                'name_en' => 'Exam Fees',
                'code' => 'EXAM_FEE',
                'description' => 'د ازموینو فیس',
                'description_en' => 'Examination fees',
                'is_restricted' => false,
            ],
            [
                'name' => 'د کتابونو پیسې',
                'name_en' => 'Book Fees',
                'code' => 'BOOK_FEE',
                'description' => 'د کتابونو او موادو پیسې',
                'description_en' => 'Books and materials fees',
                'is_restricted' => false,
            ],
            [
                'name' => 'زکات',
                'name_en' => 'Zakat',
                'code' => 'ZAKAT',
                'description' => 'زکات پیسې',
                'description_en' => 'Zakat donations',
                'is_restricted' => true,
            ],
            [
                'name' => 'صدقه',
                'name_en' => 'Sadaqah',
                'code' => 'SADAQAH',
                'description' => 'صدقه پیسې',
                'description_en' => 'Sadaqah donations',
                'is_restricted' => false,
            ],
            [
                'name' => 'وقف',
                'name_en' => 'Waqf',
                'code' => 'WAQF',
                'description' => 'وقف پیسې',
                'description_en' => 'Waqf donations',
                'is_restricted' => true,
            ],
            [
                'name' => 'عطیات',
                'name_en' => 'General Donations',
                'code' => 'DONATION',
                'description' => 'عمومی عطیات',
                'description_en' => 'General donations',
                'is_restricted' => false,
            ],
            [
                'name' => 'د پروژو پیسې',
                'name_en' => 'Project Funds',
                'code' => 'PROJECT',
                'description' => 'د ځانګړو پروژو پیسې',
                'description_en' => 'Special project funds',
                'is_restricted' => false,
            ],
            [
                'name' => 'د نورو پیسو',
                'name_en' => 'Other Income',
                'code' => 'OTHER',
                'description' => 'نور پیسې',
                'description_en' => 'Other income sources',
                'is_restricted' => false,
            ],
        ];

        foreach ($categories as $categoryData) {
            // Check if category already exists for this school (by code, organization_id, and school_id)
            $exists = IncomeCategory::where('organization_id', $organizationId)
                ->where('school_id', $schoolId)
                ->where('code', $categoryData['code'])
                ->whereNull('deleted_at')
                ->exists();

            if (!$exists) {
                IncomeCategory::create([
                    'organization_id' => $organizationId,
                    'school_id' => $schoolId,
                    'name' => $categoryData['name'],
                    'code' => $categoryData['code'],
                    'description' => $categoryData['description'],
                    'is_restricted' => $categoryData['is_restricted'],
                    'is_active' => true,
                    'display_order' => $displayOrder++,
                ]);

                $createdCount++;
                $this->command->info("    ✓ Created income category: {$categoryData['name']} ({$categoryData['name_en']})");
            } else {
                $this->command->info("    ⊘ Income category {$categoryData['code']} already exists for this school");
            }
        }

        return $createdCount;
    }
}

