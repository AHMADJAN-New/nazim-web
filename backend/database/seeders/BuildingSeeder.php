<?php

namespace Database\Seeders;

use App\Models\Building;
use App\Models\SchoolBranding;
use Illuminate\Database\Seeder;

class BuildingSeeder extends Seeder
{
    /**
     * Seed the buildings table.
     */
    public function run(): void
    {
        $this->command->info('Seeding buildings...');

        $schools = SchoolBranding::whereNull('deleted_at')->get();

        if ($schools->isEmpty()) {
            $this->command->warn('No schools found. Please run SchoolBrandingSeeder first.');
            return;
        }

        foreach ($schools as $school) {
            $this->createBuildingsForSchool($school);
        }

        $this->command->info('Buildings seeded successfully.');
    }

    /**
     * Create buildings for a specific school.
     */
    protected function createBuildingsForSchool(SchoolBranding $school): void
    {
        $buildingNames = [
            'Main Building',
            'Academic Building',
            'Administration Building',
        ];

        $createdCount = 0;
        foreach ($buildingNames as $buildingName) {
            $existing = Building::where('school_id', $school->id)
                ->where('building_name', $buildingName)
                ->whereNull('deleted_at')
                ->first();

            if ($existing) {
                continue;
            }

            Building::create([
                'school_id' => $school->id,
                'building_name' => $buildingName,
            ]);

            $createdCount++;
        }

        if ($createdCount > 0) {
            $this->command->info("Created {$createdCount} building(s) for school: {$school->school_name}");
        }
    }
}
