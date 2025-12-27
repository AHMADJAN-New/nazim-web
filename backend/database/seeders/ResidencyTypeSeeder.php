<?php

namespace Database\Seeders;

use App\Models\ResidencyType;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ResidencyTypeSeeder extends Seeder
{
    /**
     * Seed the residency_types table.
     *
     * Creates residency types per organization + per school (strict school scoping):
     * - لیلیه (Night)
     * - نهاري (Day)
     */
    public function run(): void
    {
        $this->command->info('Seeding residency types...');

        // Define residency types (school-scoped)
        $residencyTypes = [
            [
                'name' => 'لیلیه',
                'code' => 'night',
                'description' => 'Night residency type',
                'is_active' => true,
            ],
            [
                'name' => 'نهاري',
                'code' => 'day',
                'description' => 'Day residency type',
                'is_active' => true,
            ],
        ];

        $createdCount = 0;
        $skippedCount = 0;

        $organizations = DB::table('organizations')->whereNull('deleted_at')->get();
        foreach ($organizations as $organization) {
            $schools = DB::table('school_branding')
                ->where('organization_id', $organization->id)
                ->whereNull('deleted_at')
                ->get();

            if ($schools->isEmpty()) {
                $this->command->warn("  ⚠ No schools found for organization {$organization->name}. Skipping residency type seeding for this org.");
                continue;
            }

            foreach ($schools as $school) {
                foreach ($residencyTypes as $typeData) {
                    $existing = ResidencyType::where('code', $typeData['code'])
                        ->where('organization_id', $organization->id)
                        ->where('school_id', $school->id)
                        ->whereNull('deleted_at')
                        ->first();

                    if ($existing) {
                        $skippedCount++;
                        continue;
                    }

                    ResidencyType::create([
                        'organization_id' => $organization->id,
                        'school_id' => $school->id,
                        'name' => $typeData['name'],
                        'code' => $typeData['code'],
                        'description' => $typeData['description'],
                        'is_active' => $typeData['is_active'],
                    ]);

                    $createdCount++;
                }
            }
        }

        if ($createdCount > 0 || $skippedCount > 0) {
            $this->command->info("  → Created {$createdCount} residency type(s), skipped {$skippedCount} existing");
        }

        $this->command->info('✅ Residency types seeded successfully!');
    }
}

