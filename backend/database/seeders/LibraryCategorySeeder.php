<?php

namespace Database\Seeders;

use App\Models\LibraryCategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class LibraryCategorySeeder extends Seeder
{
    /**
     * Seed the library_categories table.
     *
     * Creates Islamic book categories in Arabic per organization + per school (strict school scoping).
     * Categories are school-specific (organization_id and school_id are required).
     */
    public function run(): void
    {
        $this->command->info('Seeding library categories...');

        // Get all active organizations
        $organizations = DB::table('organizations')
            ->whereNull('deleted_at')
            ->get();

        if ($organizations->isEmpty()) {
            $this->command->warn('No organizations found. Please run OrganizationSeeder or DatabaseSeeder first.');
            return;
        }

        // Define Islamic book categories in Arabic
        $categories = [
            [
                'name' => 'القرآن الكريم',
                'code' => 'quran',
                'description' => 'كتب القرآن الكريم وتلاوته وحفظه',
                'display_order' => 1,
            ],
            [
                'name' => 'التفسير',
                'code' => 'tafsir',
                'description' => 'كتب تفسير القرآن الكريم',
                'display_order' => 2,
            ],
            [
                'name' => 'الحديث',
                'code' => 'hadith',
                'description' => 'كتب الحديث النبوي الشريف',
                'display_order' => 3,
            ],
            [
                'name' => 'الفقه',
                'code' => 'fiqh',
                'description' => 'كتب الفقه الإسلامي والأحكام الشرعية',
                'display_order' => 4,
            ],
            [
                'name' => 'العقيدة',
                'code' => 'aqeedah',
                'description' => 'كتب العقيدة الإسلامية والإيمان',
                'display_order' => 5,
            ],
            [
                'name' => 'السيرة النبوية',
                'code' => 'seerah',
                'description' => 'كتب سيرة النبي محمد صلى الله عليه وسلم',
                'display_order' => 6,
            ],
            [
                'name' => 'التاريخ الإسلامي',
                'code' => 'islamic-history',
                'description' => 'كتب التاريخ الإسلامي والخلفاء الراشدين',
                'display_order' => 7,
            ],
            [
                'name' => 'اللغة العربية',
                'code' => 'arabic-language',
                'description' => 'كتب اللغة العربية والنحو والصرف',
                'display_order' => 8,
            ],
            [
                'name' => 'التربية الإسلامية',
                'code' => 'islamic-education',
                'description' => 'كتب التربية الإسلامية والتعليم الديني',
                'display_order' => 9,
            ],
            [
                'name' => 'الدعوة',
                'code' => 'dawah',
                'description' => 'كتب الدعوة إلى الإسلام وتبليغ الرسالة',
                'display_order' => 10,
            ],
            [
                'name' => 'الأخلاق والآداب',
                'code' => 'ethics-manners',
                'description' => 'كتب الأخلاق الإسلامية والآداب الشرعية',
                'display_order' => 11,
            ],
            [
                'name' => 'المرأة المسلمة',
                'code' => 'muslim-women',
                'description' => 'كتب خاصة بالمرأة المسلمة وحقوقها',
                'display_order' => 12,
            ],
            [
                'name' => 'الأسرة المسلمة',
                'code' => 'muslim-family',
                'description' => 'كتب عن الأسرة المسلمة وتربية الأبناء',
                'display_order' => 13,
            ],
            [
                'name' => 'كتب الأطفال',
                'code' => 'children-books',
                'description' => 'كتب إسلامية مخصصة للأطفال',
                'display_order' => 14,
            ],
            [
                'name' => 'العلوم الشرعية',
                'code' => 'islamic-sciences',
                'description' => 'كتب العلوم الشرعية المختلفة',
                'display_order' => 15,
            ],
            [
                'name' => 'الفتاوى',
                'code' => 'fatwa',
                'description' => 'كتب الفتاوى الشرعية والأحكام',
                'display_order' => 16,
            ],
            [
                'name' => 'السنة النبوية',
                'code' => 'sunnah',
                'description' => 'كتب السنة النبوية والهدي النبوي',
                'display_order' => 17,
            ],
            [
                'name' => 'العبادات',
                'code' => 'worship',
                'description' => 'كتب العبادات الإسلامية (الصلاة، الصوم، الزكاة، الحج)',
                'display_order' => 18,
            ],
            [
                'name' => 'المعاملات',
                'code' => 'transactions',
                'description' => 'كتب المعاملات الإسلامية والاقتصاد الإسلامي',
                'display_order' => 19,
            ],
            [
                'name' => 'المراجع والموسوعات',
                'code' => 'references-encyclopedias',
                'description' => 'المراجع الإسلامية والموسوعات الدينية',
                'display_order' => 20,
            ],
        ];

        $totalCreated = 0;
        $totalSkipped = 0;

        // Create categories for each organization and school
        foreach ($organizations as $organization) {
            $schools = DB::table('school_branding')
                ->where('organization_id', $organization->id)
                ->whereNull('deleted_at')
                ->get();

            if ($schools->isEmpty()) {
                $this->command->warn("  ⚠ No schools found for organization {$organization->name}. Skipping library category seeding for this org.");
                continue;
            }

            foreach ($schools as $school) {
                $orgCreated = 0;
                $orgSkipped = 0;

                foreach ($categories as $categoryData) {
                    // Check if category already exists for this organization and school
                    $existing = LibraryCategory::where('organization_id', $organization->id)
                        ->where('school_id', $school->id)
                        ->where('code', $categoryData['code'])
                        ->whereNull('deleted_at')
                        ->first();

                    if ($existing) {
                        $orgSkipped++;
                        continue;
                    }

                    // Create category for this organization and school
                    try {
                        LibraryCategory::create([
                            'organization_id' => $organization->id,
                            'school_id' => $school->id,
                            'name' => $categoryData['name'],
                            'code' => $categoryData['code'],
                            'description' => $categoryData['description'],
                            'is_active' => true,
                            'display_order' => $categoryData['display_order'],
                        ]);

                        $orgCreated++;
                    } catch (\Exception $e) {
                        $this->command->error("  ✗ Failed to create {$categoryData['name']}: {$e->getMessage()}");
                    }
                }

                $totalCreated += $orgCreated;
                $totalSkipped += $orgSkipped;
            }
        }

        $this->command->info("✅ Library categories seeded successfully!");
        $this->command->info("   Total created: {$totalCreated}");
        $this->command->info("   Total skipped: {$totalSkipped}");
    }
}

