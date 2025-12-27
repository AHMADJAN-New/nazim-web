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
     * Creates staff types per organization + per school (strict school scoping):
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

        // Define staff types (school-scoped)
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

        $organizations = DB::table('organizations')->whereNull('deleted_at')->get();
        foreach ($organizations as $organization) {
            $schools = DB::table('school_branding')
                ->where('organization_id', $organization->id)
                ->whereNull('deleted_at')
                ->get();

            if ($schools->isEmpty()) {
                $this->command->warn("  ⚠ No schools found for organization {$organization->name}. Skipping staff type seeding for this org.");
                continue;
            }

            foreach ($schools as $school) {
                foreach ($staffTypes as $typeData) {
                    $existing = StaffType::where('code', $typeData['code'])
                        ->where('organization_id', $organization->id)
                        ->where('school_id', $school->id)
                        ->whereNull('deleted_at')
                        ->first();

                    if ($existing) {
                        $skippedCount++;
                        continue;
                    }

                    StaffType::create([
                        'organization_id' => $organization->id,
                        'school_id' => $school->id,
                        'name' => $typeData['name'],
                        'code' => $typeData['code'],
                        'description' => $typeData['description'],
                        'display_order' => $typeData['display_order'],
                        'is_active' => $typeData['is_active'],
                    ]);

                    $createdCount++;
                }
            }
        }

        if ($createdCount > 0 || $skippedCount > 0) {
            $this->command->info("  → Created {$createdCount} staff type(s), skipped {$skippedCount} existing");
        }
        $this->command->info('✅ Staff types seeded successfully!');
    }
}

