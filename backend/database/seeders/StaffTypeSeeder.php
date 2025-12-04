<?php

namespace Database\Seeders;

use App\Models\StaffType;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class StaffTypeSeeder extends Seeder
{
    /**
     * Seed the staff_types table.
     *
     * Creates global staff types (organization_id = NULL) available to all organizations:
     * - Teacher
     * - Administrator
     * - Accountant
     * - Librarian
     * - Hostel Manager
     * - Asset Manager
     * - Security
     * - Maintenance
     * - Other
     */
    public function run(): void
    {
        $this->command->info('Seeding staff types...');

        // Define staff types (global - available to all organizations)
        $staffTypes = [
            [
                'name' => 'Teacher',
                'code' => 'teacher',
                'description' => 'Teaching staff',
                'display_order' => 1,
                'is_active' => true,
            ],
            [
                'name' => 'Administrator',
                'code' => 'admin',
                'description' => 'Administrative staff',
                'display_order' => 2,
                'is_active' => true,
            ],
            [
                'name' => 'Accountant',
                'code' => 'accountant',
                'description' => 'Financial staff',
                'display_order' => 3,
                'is_active' => true,
            ],
            [
                'name' => 'Librarian',
                'code' => 'librarian',
                'description' => 'Library staff',
                'display_order' => 4,
                'is_active' => true,
            ],
            [
                'name' => 'Hostel Manager',
                'code' => 'hostel_manager',
                'description' => 'Hostel management staff',
                'display_order' => 5,
                'is_active' => true,
            ],
            [
                'name' => 'Asset Manager',
                'code' => 'asset_manager',
                'description' => 'Asset management staff',
                'display_order' => 6,
                'is_active' => true,
            ],
            [
                'name' => 'Security',
                'code' => 'security',
                'description' => 'Security staff',
                'display_order' => 7,
                'is_active' => true,
            ],
            [
                'name' => 'Maintenance',
                'code' => 'maintenance',
                'description' => 'Maintenance staff',
                'display_order' => 8,
                'is_active' => true,
            ],
            [
                'name' => 'Other',
                'code' => 'other',
                'description' => 'Other staff types',
                'display_order' => 9,
                'is_active' => true,
            ],
        ];

        $createdCount = 0;
        $skippedCount = 0;

        foreach ($staffTypes as $typeData) {
            // Check if staff type already exists (global scope)
            $existing = StaffType::where('code', $typeData['code'])
                ->whereNull('organization_id')
                ->whereNull('deleted_at')
                ->first();

            if ($existing) {
                $this->command->info("  ✓ Staff type '{$typeData['name']}' ({$typeData['code']}) already exists.");
                $skippedCount++;
                continue;
            }

            StaffType::create([
                'organization_id' => null, // Global type - available to all organizations
                'name' => $typeData['name'],
                'code' => $typeData['code'],
                'description' => $typeData['description'],
                'display_order' => $typeData['display_order'],
                'is_active' => $typeData['is_active'],
            ]);

            $this->command->info("  ✓ Created staff type: {$typeData['name']} ({$typeData['code']})");
            $createdCount++;
        }

        if ($createdCount > 0 || $skippedCount > 0) {
            $this->command->info("  → Created {$createdCount} staff type(s), skipped {$skippedCount} existing");
        }
        $this->command->info('✅ Staff types seeded successfully!');
    }
}

