<?php

namespace Database\Seeders;

use App\Models\Currency;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CurrencySeeder extends Seeder
{
    /**
     * Seed the currencies table.
     *
     * Creates 4 currencies for each organization:
     * - AFG (Afghan Afghani)
     * - PKR (Pakistani Rupee)
     * - USD (US Dollar)
     * - SAR (Saudi Riyal)
     */
    public function run(): void
    {
        $this->command->info('Seeding currencies...');

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
            $this->command->info("Creating currencies for {$organization->name}...");

            // Get all schools for this organization
            $schools = DB::table('school_branding')
                ->where('organization_id', $organization->id)
                ->whereNull('deleted_at')
                ->get();

            if ($schools->isEmpty()) {
                $this->command->warn("  ⚠ No schools found for organization {$organization->name}. Skipping currency seeding for this org.");
                continue;
            }

            foreach ($schools as $school) {
                $this->command->info("Creating currencies for {$organization->name} - school: {$school->school_name}...");

                // Create currencies for this school
                $created = $this->createCurrenciesForSchool($organization->id, $school->id);
                $totalCreated += $created;

                if ($created > 0) {
                    $this->command->info("  → Created {$created} currency(ies) for {$organization->name} - {$school->school_name}");
                }
            }
        }

        if ($totalCreated > 0) {
            $this->command->info("  → Total: Created {$totalCreated} currency(ies)");
        }

        $this->command->info('✅ Currencies seeded successfully!');
    }

    /**
     * Create currencies for a specific school
     */
    protected function createCurrenciesForSchool(string $organizationId, string $schoolId): int
    {
        $createdCount = 0;

        // Define the currencies to create
        $currencies = [
            [
                'code' => 'AFN',
                'name' => 'Afghan Afghani',
                'symbol' => '؋',
                'decimal_places' => 2,
                'is_base' => true, // First currency is base
            ],
            [
                'code' => 'PKR',
                'name' => 'Pakistani Rupee',
                'symbol' => 'Rs',
                'decimal_places' => 2,
                'is_base' => false,
            ],
            [
                'code' => 'USD',
                'name' => 'US Dollar',
                'symbol' => '$',
                'decimal_places' => 2,
                'is_base' => false,
            ],
            [
                'code' => 'SAR',
                'name' => 'Saudi Riyal',
                'symbol' => '﷼',
                'decimal_places' => 2,
                'is_base' => false,
            ],
        ];

        foreach ($currencies as $currencyData) {
            // Check if currency already exists for this school (by code, organization_id, and school_id)
            $exists = Currency::where('organization_id', $organizationId)
                ->where('school_id', $schoolId)
                ->where('code', $currencyData['code'])
                ->whereNull('deleted_at')
                ->exists();

            if (!$exists) {
                Currency::create([
                    'organization_id' => $organizationId,
                    'school_id' => $schoolId,
                    'code' => $currencyData['code'],
                    'name' => $currencyData['name'],
                    'symbol' => $currencyData['symbol'],
                    'decimal_places' => $currencyData['decimal_places'],
                    'is_base' => $currencyData['is_base'],
                    'is_active' => true,
                ]);

                $createdCount++;
                $this->command->info("    ✓ Created currency: {$currencyData['code']} - {$currencyData['name']}");
            } else {
                $this->command->info("    ⊘ Currency {$currencyData['code']} already exists for this school");
            }
        }

        return $createdCount;
    }
}

