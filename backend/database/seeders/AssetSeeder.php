<?php

namespace Database\Seeders;

use App\Models\Asset;
use App\Models\AssetCategory;
use App\Models\FinanceAccount;
use App\Models\Currency;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Carbon\Carbon;

class AssetSeeder extends Seeder
{
    /**
     * Seed the assets table.
     *
     * Creates assets for all categories in all organizations.
     * Each category gets at least 5 assets.
     */
    public function run(): void
    {
        $this->command->info('Seeding assets...');

        // Get all active organizations
        $organizations = DB::table('organizations')
            ->whereNull('deleted_at')
            ->get();

        if ($organizations->isEmpty()) {
            $this->command->warn('No organizations found. Please run OrganizationSeeder or DatabaseSeeder first.');
            return;
        }

        // Check if category_id column exists
        $hasCategoryId = Schema::hasColumn('assets', 'category_id');
        
        // Check if finance fields exist
        $hasCurrencyId = Schema::hasColumn('assets', 'currency_id');
        $hasFinanceAccountId = Schema::hasColumn('assets', 'finance_account_id');

        // Define assets for each category (by category code)
        $assetsByCategory = [
            'furniture' => [
                ['name' => 'Student Desk', 'serial_number' => 'DESK-001', 'condition' => 'excellent', 'vendor' => 'Furniture Co.', 'purchase_price' => 150.00],
                ['name' => 'Teacher Chair', 'serial_number' => 'CHR-002', 'condition' => 'good', 'vendor' => 'Office Supplies Inc.', 'purchase_price' => 200.00],
                ['name' => 'Storage Cabinet', 'serial_number' => 'CAB-003', 'condition' => 'excellent', 'vendor' => 'Furniture Co.', 'purchase_price' => 350.00],
                ['name' => 'Conference Table', 'serial_number' => 'TBL-004', 'condition' => 'good', 'vendor' => 'Office Supplies Inc.', 'purchase_price' => 500.00],
                ['name' => 'Bookshelf', 'serial_number' => 'BSH-005', 'condition' => 'excellent', 'vendor' => 'Furniture Co.', 'purchase_price' => 180.00],
            ],
            'electronics' => [
                ['name' => 'Desktop Computer', 'serial_number' => 'PC-001', 'condition' => 'excellent', 'vendor' => 'Tech Solutions', 'purchase_price' => 800.00],
                ['name' => 'Laptop Computer', 'serial_number' => 'LAP-002', 'condition' => 'good', 'vendor' => 'Tech Solutions', 'purchase_price' => 1200.00],
                ['name' => 'Projector', 'serial_number' => 'PRJ-003', 'condition' => 'excellent', 'vendor' => 'AV Equipment Ltd.', 'purchase_price' => 600.00],
                ['name' => 'Printer', 'serial_number' => 'PRT-004', 'condition' => 'good', 'vendor' => 'Tech Solutions', 'purchase_price' => 400.00],
                ['name' => 'Interactive Whiteboard', 'serial_number' => 'IWB-005', 'condition' => 'excellent', 'vendor' => 'AV Equipment Ltd.', 'purchase_price' => 1500.00],
            ],
            'equipment' => [
                ['name' => 'Microscope', 'serial_number' => 'MIC-001', 'condition' => 'excellent', 'vendor' => 'Lab Equipment Co.', 'purchase_price' => 450.00],
                ['name' => 'Basketball Set', 'serial_number' => 'BKB-002', 'condition' => 'good', 'vendor' => 'Sports Equipment Inc.', 'purchase_price' => 300.00],
                ['name' => 'Chemistry Lab Kit', 'serial_number' => 'CHM-003', 'condition' => 'excellent', 'vendor' => 'Lab Equipment Co.', 'purchase_price' => 550.00],
                ['name' => 'Soccer Ball Set', 'serial_number' => 'SOC-004', 'condition' => 'good', 'vendor' => 'Sports Equipment Inc.', 'purchase_price' => 250.00],
                ['name' => 'Physics Lab Equipment', 'serial_number' => 'PHY-005', 'condition' => 'excellent', 'vendor' => 'Lab Equipment Co.', 'purchase_price' => 600.00],
            ],
            'vehicles' => [
                ['name' => 'School Bus', 'serial_number' => 'BUS-001', 'condition' => 'good', 'vendor' => 'Vehicle Dealership', 'purchase_price' => 45000.00],
                ['name' => 'Van', 'serial_number' => 'VAN-002', 'condition' => 'excellent', 'vendor' => 'Vehicle Dealership', 'purchase_price' => 25000.00],
                ['name' => 'Maintenance Truck', 'serial_number' => 'TRK-003', 'condition' => 'good', 'vendor' => 'Vehicle Dealership', 'purchase_price' => 30000.00],
                ['name' => 'Minibus', 'serial_number' => 'MIN-004', 'condition' => 'excellent', 'vendor' => 'Vehicle Dealership', 'purchase_price' => 35000.00],
                ['name' => 'Utility Vehicle', 'serial_number' => 'UTL-005', 'condition' => 'good', 'vendor' => 'Vehicle Dealership', 'purchase_price' => 20000.00],
            ],
            'infrastructure' => [
                ['name' => 'Air Conditioning Unit', 'serial_number' => 'AC-001', 'condition' => 'excellent', 'vendor' => 'HVAC Systems', 'purchase_price' => 2000.00],
                ['name' => 'Generator', 'serial_number' => 'GEN-002', 'condition' => 'good', 'vendor' => 'Power Solutions', 'purchase_price' => 5000.00],
                ['name' => 'Water Pump System', 'serial_number' => 'WTR-003', 'condition' => 'excellent', 'vendor' => 'Plumbing Services', 'purchase_price' => 1500.00],
                ['name' => 'Security Camera System', 'serial_number' => 'CAM-004', 'condition' => 'excellent', 'vendor' => 'Security Systems Inc.', 'purchase_price' => 3000.00],
                ['name' => 'Fire Safety System', 'serial_number' => 'FIRE-005', 'condition' => 'excellent', 'vendor' => 'Safety Equipment Co.', 'purchase_price' => 4000.00],
            ],
        ];

        $totalCreated = 0;
        $totalSkipped = 0;

        // Create assets for each organization
        foreach ($organizations as $organization) {
            $this->command->info("Creating assets for organization: {$organization->name}");

            // Get all categories for this organization
            $categories = AssetCategory::where('organization_id', $organization->id)
                ->whereNull('deleted_at')
                ->where('is_active', true)
                ->get();

            if ($categories->isEmpty()) {
                $this->command->warn("  No categories found for {$organization->name}. Please run AssetCategorySeeder first.");
                continue;
            }

            $orgCreated = 0;
            $orgSkipped = 0;

            // Get finance accounts and currencies for this organization (if columns exist)
            $financeAccounts = [];
            $currencies = [];
            $baseCurrency = null;
            
            if ($hasFinanceAccountId || $hasCurrencyId) {
                // Get finance accounts for this organization
                $financeAccounts = FinanceAccount::where('organization_id', $organization->id)
                    ->whereNull('deleted_at')
                    ->where('is_active', true)
                    ->get();
                
                // Get currencies for this organization
                $currencies = Currency::where('organization_id', $organization->id)
                    ->whereNull('deleted_at')
                    ->where('is_active', true)
                    ->get();
                
                // Get base currency
                $baseCurrency = $currencies->where('is_base', true)->first();
            }

            foreach ($categories as $category) {
                $categoryCode = $category->code;
                
                // Get assets for this category
                $assets = $assetsByCategory[$categoryCode] ?? [];

                if (empty($assets)) {
                    $this->command->warn("  No assets defined for category: {$category->name} ({$categoryCode})");
                    continue;
                }

                $assetCounter = 1;
                foreach ($assets as $assetData) {
                    // Check if asset already exists for this organization (by asset_tag)
                    $assetTag = 'AST-' . strtoupper(substr($organization->slug ?? substr($organization->id, 0, 3), 0, 3)) . '-' . strtoupper(substr($categoryCode, 0, 3)) . '-' . str_pad((string)$assetCounter, 4, '0', STR_PAD_LEFT);
                    
                    $existing = Asset::where('organization_id', $organization->id)
                        ->where('asset_tag', $assetTag)
                        ->whereNull('deleted_at')
                        ->first();

                    if ($existing) {
                        $orgSkipped++;
                        $assetCounter++; // Increment counter even when skipping
                        continue;
                    }

                    // Generate purchase date (random date within last 2 years)
                    $purchaseDate = Carbon::now()->subYears(rand(0, 2))->subDays(rand(0, 365));
                    
                    // Generate warranty expiry (1-3 years from purchase date)
                    $warrantyExpiry = $purchaseDate->copy()->addYears(rand(1, 3));

                    // Create asset
                    try {
                        $assetDataToCreate = [
                            'organization_id' => $organization->id,
                            'name' => $assetData['name'],
                            'asset_tag' => $assetTag,
                            'category' => $category->name, // Keep for backward compatibility
                            'serial_number' => $assetData['serial_number'] ?? null,
                            'purchase_date' => $purchaseDate->format('Y-m-d'),
                            'purchase_price' => $assetData['purchase_price'] ?? null,
                            'status' => 'available',
                            'condition' => $assetData['condition'] ?? 'good',
                            'vendor' => $assetData['vendor'] ?? null,
                            'warranty_expiry' => $warrantyExpiry->format('Y-m-d'),
                            'notes' => "Asset for {$category->name} category",
                        ];
                        
                        // Add category_id only if column exists
                        if ($hasCategoryId) {
                            $assetDataToCreate['category_id'] = $category->id;
                        }
                        
                        // Add finance_account_id and currency_id if columns exist and data is available
                        if ($hasFinanceAccountId && $financeAccounts->isNotEmpty()) {
                            // Assign a random finance account (or use first one)
                            // For variety, we can cycle through accounts
                            $accountIndex = ($orgCreated + $assetCounter) % $financeAccounts->count();
                            $selectedAccount = $financeAccounts->get($accountIndex);
                            if ($selectedAccount) {
                                $assetDataToCreate['finance_account_id'] = $selectedAccount->id;
                                
                                // If account has currency, use it; otherwise use base currency
                                if ($hasCurrencyId) {
                                    if ($selectedAccount->currency_id) {
                                        $assetDataToCreate['currency_id'] = $selectedAccount->currency_id;
                                    } elseif ($baseCurrency) {
                                        $assetDataToCreate['currency_id'] = $baseCurrency->id;
                                    }
                                }
                            }
                        } elseif ($hasCurrencyId && $baseCurrency) {
                            // If only currency_id column exists, use base currency
                            $assetDataToCreate['currency_id'] = $baseCurrency->id;
                        }
                        
                        Asset::create($assetDataToCreate);

                        $orgCreated++;
                        $assetCounter++;
                    } catch (\Exception $e) {
                        $this->command->error("  ✗ Failed to create asset '{$assetData['name']}': {$e->getMessage()}");
                        $assetCounter++; // Increment even on error to avoid duplicate tags
                    }
                }
            }

            $totalCreated += $orgCreated;
            $totalSkipped += $orgSkipped;

            if ($orgCreated > 0) {
                $this->command->info("  → Created {$orgCreated} asset(s) for {$organization->name}");
            }
            if ($orgSkipped > 0) {
                $this->command->info("  → Skipped {$orgSkipped} existing asset(s) for {$organization->name}");
            }
        }

        $this->command->info("✅ Assets seeded successfully!");
        $this->command->info("   Total created: {$totalCreated}");
        $this->command->info("   Total skipped: {$totalSkipped}");
    }
}

