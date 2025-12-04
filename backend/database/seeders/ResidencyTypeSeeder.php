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
     * Creates global residency types (organization_id = NULL) available to all organizations:
     * - لیلیه (Night)
     * - نهاري (Day)
     */
    public function run(): void
    {
        $this->command->info('Seeding residency types...');

        // Define residency types (global - available to all organizations)
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
        foreach ($residencyTypes as $typeData) {
            // Check if residency type already exists (global or any organization)
            $existing = ResidencyType::where('code', $typeData['code'])
                ->whereNull('deleted_at')
                ->first();

            if ($existing) {
                $this->command->info("  ✓ Residency type '{$typeData['name']}' ({$typeData['code']}) already exists.");
                continue;
            }

            ResidencyType::create([
                'organization_id' => null, // Global type - available to all organizations
                'name' => $typeData['name'],
                'code' => $typeData['code'],
                'description' => $typeData['description'],
                'is_active' => $typeData['is_active'],
            ]);

            $this->command->info("  ✓ Created residency type: {$typeData['name']} ({$typeData['code']})");
            $createdCount++;
        }

        if ($createdCount > 0) {
            $this->command->info("  → Created {$createdCount} residency type(s)");
        }

        $this->command->info('✅ Residency types seeded successfully!');
    }
}

