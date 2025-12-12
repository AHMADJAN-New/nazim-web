<?php

namespace Database\Seeders;

use App\Models\Grade;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class GradeSeeder extends Seeder
{
    /**
     * Seed the grades table.
     *
     * Creates default Islamic school grades for each organization:
     * - ممتاز (Excellent): 80-100%
     * - جید جدا (Very Good): 70-79.99%
     * - جید (Good): 60-69.99%
     * - مقبول (Pass): 40-59.99%
     * - راسب (Fail): 0-39.99%
     */
    public function run(): void
    {
        $this->command->info('Seeding grades...');

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
            $this->command->info("Creating grades for {$organization->name}...");

            // Create grades for this organization
            $created = $this->createGradesForOrganization($organization->id);
            $totalCreated += $created;

            $this->command->info("  → Created {$created} grade(s) for {$organization->name}");
        }

        if ($totalCreated > 0) {
            $this->command->info("  → Total: Created {$totalCreated} grade(s)");
        }

        $this->command->info('✅ Grades seeded successfully!');
    }

    /**
     * Create grades for a specific organization
     */
    protected function createGradesForOrganization(string $organizationId): int
    {
        $createdCount = 0;

        // Define default Islamic school grades
        // Based on: ممتاز 80+, جید جدا 70+, جید 60+, مقبول 40+, راسب -40
        $grades = [
            [
                'name_en' => 'Excellent',
                'name_ar' => 'ممتاز',
                'name_ps' => 'ممتاز',
                'name_fa' => 'ممتاز',
                'min_percentage' => 80.00,
                'max_percentage' => 100.00,
                'order' => 5,
                'is_pass' => true,
            ],
            [
                'name_en' => 'Very Good',
                'name_ar' => 'جید جدا',
                'name_ps' => 'جید جدا',
                'name_fa' => 'جید جدا',
                'min_percentage' => 70.00,
                'max_percentage' => 79.99,
                'order' => 4,
                'is_pass' => true,
            ],
            [
                'name_en' => 'Good',
                'name_ar' => 'جید',
                'name_ps' => 'جید',
                'name_fa' => 'جید',
                'min_percentage' => 60.00,
                'max_percentage' => 69.99,
                'order' => 3,
                'is_pass' => true,
            ],
            [
                'name_en' => 'Pass',
                'name_ar' => 'مقبول',
                'name_ps' => 'مقبول',
                'name_fa' => 'مقبول',
                'min_percentage' => 40.00,
                'max_percentage' => 59.99,
                'order' => 2,
                'is_pass' => true,
            ],
            [
                'name_en' => 'Fail',
                'name_ar' => 'راسب',
                'name_ps' => 'راسب',
                'name_fa' => 'راسب',
                'min_percentage' => 0.00,
                'max_percentage' => 39.99,
                'order' => 1,
                'is_pass' => false,
            ],
        ];

        foreach ($grades as $gradeData) {
            // Check if grade already exists for this organization (by percentage range)
            $existing = Grade::where('organization_id', $organizationId)
                ->where('min_percentage', $gradeData['min_percentage'])
                ->where('max_percentage', $gradeData['max_percentage'])
                ->whereNull('deleted_at')
                ->first();

            if ($existing) {
                $this->command->info("  ✓ Grade '{$gradeData['name_en']}' ({$gradeData['min_percentage']}-{$gradeData['max_percentage']}%) already exists.");
                continue;
            }

            Grade::create([
                'organization_id' => $organizationId,
                'name_en' => $gradeData['name_en'],
                'name_ar' => $gradeData['name_ar'],
                'name_ps' => $gradeData['name_ps'],
                'name_fa' => $gradeData['name_fa'],
                'min_percentage' => $gradeData['min_percentage'],
                'max_percentage' => $gradeData['max_percentage'],
                'order' => $gradeData['order'],
                'is_pass' => $gradeData['is_pass'],
            ]);

            $this->command->info("  ✓ Created grade: {$gradeData['name_en']} ({$gradeData['min_percentage']}-{$gradeData['max_percentage']}%)" . ($gradeData['is_pass'] ? ' [PASS]' : ' [FAIL]'));
            $createdCount++;
        }

        return $createdCount;
    }
}
