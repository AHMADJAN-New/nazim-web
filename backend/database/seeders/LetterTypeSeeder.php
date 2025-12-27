<?php

namespace Database\Seeders;

use App\Models\LetterType;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class LetterTypeSeeder extends Seeder
{
    /**
     * Seed the letter_types table.
     *
     * Creates 4 default letter types per organization + per school (strict school scoping):
     * - application: Application Letters
     * - moe_letter: MOE Official Letters
     * - parent_letter: Parent Communication
     * - announcement: Announcements
     */
    public function run(): void
    {
        $this->command->info('Seeding letter types...');

        // Get all organizations
        $organizations = DB::table('organizations')
            ->whereNull('deleted_at')
            ->get();

        if ($organizations->isEmpty()) {
            $this->command->warn('No organizations found. Please run DatabaseSeeder first.');
            return;
        }

        $totalCreated = 0;
        $totalSkipped = 0;

        foreach ($organizations as $organization) {
            $this->command->info("Creating letter types for {$organization->name}...");

            $schools = DB::table('school_branding')
                ->where('organization_id', $organization->id)
                ->whereNull('deleted_at')
                ->get();

            if ($schools->isEmpty()) {
                $this->command->warn("  ⚠ No schools found for organization {$organization->name}. Skipping letter type seeding for this org.");
                continue;
            }

            foreach ($schools as $school) {
                // Create letter types for this organization and school
                $result = $this->createLetterTypesForSchool($organization->id, $school->id);
                $totalCreated += $result['created'];
                $totalSkipped += $result['skipped'];
            }
        }

        if ($totalCreated > 0 || $totalSkipped > 0) {
            $this->command->info("  → Total: Created {$totalCreated} letter type(s), skipped {$totalSkipped} existing");
        }

        $this->command->info('✅ Letter types seeded successfully!');
    }

    /**
     * Create letter types for a specific organization and school
     */
    protected function createLetterTypesForSchool(string $organizationId, string $schoolId): array
    {
        $createdCount = 0;
        $skippedCount = 0;

        // Define the 4 default letter types
        $letterTypes = [
            [
                'key' => 'application',
                'name' => 'Application Letters',
                'description' => 'Letters related to student applications, admissions, and enrollment',
                'active' => true,
            ],
            [
                'key' => 'moe_letter',
                'name' => 'MOE Official Letters',
                'description' => 'Official correspondence with the Ministry of Education',
                'active' => true,
            ],
            [
                'key' => 'parent_letter',
                'name' => 'Parent Communication',
                'description' => 'Letters and communications sent to parents and guardians',
                'active' => true,
            ],
            [
                'key' => 'announcement',
                'name' => 'Announcements',
                'description' => 'General announcements and circulars for students, staff, and parents',
                'active' => true,
            ],
        ];

        foreach ($letterTypes as $letterTypeData) {
            // Check if letter type already exists for this organization and school
            $exists = DB::table('letter_types')
                ->where('organization_id', $organizationId)
                ->where('school_id', $schoolId)
                ->where('key', $letterTypeData['key'])
                ->exists();

            if ($exists) {
                $skippedCount++;
                continue;
            }

            LetterType::create([
                'organization_id' => $organizationId,
                'school_id' => $schoolId,
                'key' => $letterTypeData['key'],
                'name' => $letterTypeData['name'],
                'description' => $letterTypeData['description'],
                'active' => $letterTypeData['active'],
            ]);
            $createdCount++;
        }

        return ['created' => $createdCount, 'skipped' => $skippedCount];
    }
}
