<?php

namespace Database\Seeders;

use App\Models\Building;
use App\Models\SchoolBranding;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class BuildingSeeder extends Seeder
{
    /**
     * Seed the buildings table.
     *
     * Creates buildings for all schools in both organizations.
     */
    public function run(): void
    {
        $this->command->info('Seeding buildings...');

        // Get organizations
        $org1 = DB::table('organizations')
            ->where('slug', 'org-one')
            ->whereNull('deleted_at')
            ->first();

        $org2 = DB::table('organizations')
            ->where('slug', 'org-two')
            ->whereNull('deleted_at')
            ->first();

        if (!$org1) {
            $this->command->warn('Organization One not found. Please run DatabaseSeeder first.');
            return;
        }

        if (!$org2) {
            $this->command->warn('Organization Two not found. Please run DatabaseSeeder first.');
            return;
        }

        // Get schools for Organization One
        $org1Schools = SchoolBranding::where('organization_id', $org1->id)
            ->whereNull('deleted_at')
            ->get();

        // Get schools for Organization Two
        $org2Schools = SchoolBranding::where('organization_id', $org2->id)
            ->whereNull('deleted_at')
            ->get();

        if ($org1Schools->isEmpty()) {
            $this->command->warn('No schools found for Organization One. Please run SchoolBrandingSeeder first.');
        } else {
            $this->command->info('Creating buildings for Organization One...');
            foreach ($org1Schools as $school) {
                $this->createBuildingsForSchool($school);
            }
        }

        if ($org2Schools->isEmpty()) {
            $this->command->warn('No schools found for Organization Two. Please run SchoolBrandingSeeder first.');
        } else {
            $this->command->info('Creating buildings for Organization Two...');
            foreach ($org2Schools as $school) {
                $this->createBuildingsForSchool($school);
            }
        }

        $this->command->info('✅ Buildings seeded successfully!');
    }

    /**
     * Create buildings for a specific school
     */
    protected function createBuildingsForSchool(SchoolBranding $school): void
    {
        // Define building names (can be customized per school)
        $buildingNames = [
            'Main Building',
            'Academic Building',
            'Administration Building',
        ];

        $createdCount = 0;
        foreach ($buildingNames as $buildingName) {
            // Check if building already exists for this school
            $existing = Building::where('school_id', $school->id)
                ->where('building_name', $buildingName)
                ->whereNull('deleted_at')
                ->first();

            if ($existing) {
                $this->command->info("  ✓ Building '{$buildingName}' already exists for school '{$school->school_name}'.");
                continue;
            }

            Building::create([
                'school_id' => $school->id,
                'building_name' => $buildingName,
            ]);

            $this->command->info("  ✓ Created building: {$buildingName} for school: {$school->school_name}");
            $createdCount++;
        }

        if ($createdCount > 0) {
            $this->command->info("  → Created {$createdCount} building(s) for school: {$school->school_name}");
        }
    }
}

