<?php

namespace Database\Seeders;

use App\Models\AssetCategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AssetCategorySeeder extends Seeder
{
    /**
     * Seed the asset_categories table.
     *
     * Creates asset categories for all organizations.
     * Categories are organization-specific (organization_id is required).
     */
    public function run(): void
    {
        $this->command->info('Seeding asset categories...');

        // Get all active organizations
        $organizations = DB::table('organizations')
            ->whereNull('deleted_at')
            ->get();

        if ($organizations->isEmpty()) {
            $this->command->warn('No organizations found. Please run OrganizationSeeder or DatabaseSeeder first.');
            return;
        }

        // Define asset categories
        $categories = [
            [
                'name' => 'Furniture',
                'code' => 'furniture',
                'description' => 'School furniture including desks, chairs, tables, cabinets, and storage units',
                'display_order' => 1,
            ],
            [
                'name' => 'Electronics',
                'code' => 'electronics',
                'description' => 'Electronic equipment including computers, printers, projectors, and audio-visual equipment',
                'display_order' => 2,
            ],
            [
                'name' => 'Equipment',
                'code' => 'equipment',
                'description' => 'General equipment including laboratory equipment, sports equipment, and teaching aids',
                'display_order' => 3,
            ],
            [
                'name' => 'Vehicles',
                'code' => 'vehicles',
                'description' => 'School vehicles including buses, vans, and maintenance vehicles',
                'display_order' => 4,
            ],
            [
                'name' => 'Infrastructure',
                'code' => 'infrastructure',
                'description' => 'Infrastructure assets including air conditioning units, generators, water systems, and building fixtures',
                'display_order' => 5,
            ],
        ];

        $totalCreated = 0;
        $totalSkipped = 0;

        // Create categories for each organization
        foreach ($organizations as $organization) {
            $this->command->info("Creating categories for organization: {$organization->name}");

            $orgCreated = 0;
            $orgSkipped = 0;

            foreach ($categories as $categoryData) {
                // Check if category already exists for this organization
                $existing = AssetCategory::where('organization_id', $organization->id)
                    ->where('code', $categoryData['code'])
                    ->whereNull('deleted_at')
                    ->first();

                if ($existing) {
                    $orgSkipped++;
                    continue;
                }

                // Create category for this organization
                try {
                    AssetCategory::create([
                        'organization_id' => $organization->id,
                        'name' => $categoryData['name'],
                        'code' => $categoryData['code'],
                        'description' => $categoryData['description'],
                        'is_active' => true,
                        'display_order' => $categoryData['display_order'],
                    ]);

                    $orgCreated++;
                    $this->command->info("  ✓ Created: {$categoryData['name']} ({$categoryData['code']})");
                } catch (\Exception $e) {
                    $this->command->error("  ✗ Failed to create {$categoryData['name']}: {$e->getMessage()}");
                }
            }

            $totalCreated += $orgCreated;
            $totalSkipped += $orgSkipped;

            if ($orgCreated > 0) {
                $this->command->info("  → Created {$orgCreated} category/categories for {$organization->name}");
            }
            if ($orgSkipped === count($categories) && $orgCreated === 0) {
                $this->command->info("  ✓ All categories already exist for {$organization->name}");
            }
        }

        $this->command->info("✅ Asset categories seeded successfully!");
        $this->command->info("   Total created: {$totalCreated}");
        $this->command->info("   Total skipped: {$totalSkipped}");
    }
}

