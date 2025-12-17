<?php

namespace Database\Seeders;

use App\Models\FinanceAccount;
use App\Models\Currency;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class FinanceAccountSeeder extends Seeder
{
    /**
     * Seed the finance_accounts table.
     *
     * Creates default finance accounts for each organization.
     */
    public function run(): void
    {
        $this->command->info('Seeding finance accounts...');

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
            $this->command->info("Creating finance accounts for {$organization->name}...");

            // Get base currency for this organization
            $baseCurrency = Currency::where('organization_id', $organization->id)
                ->where('is_base', true)
                ->whereNull('deleted_at')
                ->first();

            if (!$baseCurrency) {
                $this->command->warn("  ⚠ No base currency found for {$organization->name}. Skipping accounts.");
                continue;
            }

            // Create accounts for this organization
            $created = $this->createAccountsForOrganization($organization->id, $baseCurrency->id);
            $totalCreated += $created;

            $this->command->info("  → Created {$created} account(s) for {$organization->name}");
        }

        if ($totalCreated > 0) {
            $this->command->info("  → Total: Created {$totalCreated} account(s)");
        }

        $this->command->info('✅ Finance accounts seeded successfully!');
    }

    /**
     * Create finance accounts for a specific organization
     */
    protected function createAccountsForOrganization(string $organizationId, string $currencyId): int
    {
        $createdCount = 0;

        // Define the accounts to create
        $accounts = [
            [
                'name' => 'د اصلي صندوق',
                'name_en' => 'Main Cash Box',
                'code' => 'MAIN_CASH',
                'type' => 'cash',
                'description' => 'د اصلي نغدو پیسو صندوق',
                'description_en' => 'Main cash box for daily operations',
                'opening_balance' => 0,
            ],
            [
                'name' => 'د فیس صندوق',
                'name_en' => 'Fee Account',
                'code' => 'FEE_ACCOUNT',
                'type' => 'cash',
                'description' => 'د فیس پیسو لپاره ځانګړی صندوق',
                'description_en' => 'Dedicated account for student fee collections',
                'opening_balance' => 0,
            ],
            [
                'name' => 'د بانک حساب',
                'name_en' => 'Bank Account',
                'code' => 'BANK_ACC',
                'type' => 'fund',
                'description' => 'د بانک حساب',
                'description_en' => 'Bank account for deposits',
                'opening_balance' => 0,
            ],
            [
                'name' => 'د زکات صندوق',
                'name_en' => 'Zakat Fund',
                'code' => 'ZAKAT_FUND',
                'type' => 'fund',
                'description' => 'د زکات پیسو ځانګړی صندوق',
                'description_en' => 'Dedicated fund for Zakat',
                'opening_balance' => 0,
            ],
            [
                'name' => 'د وقف صندوق',
                'name_en' => 'Waqf Fund',
                'code' => 'WAQF_FUND',
                'type' => 'fund',
                'description' => 'د وقف پیسو ځانګړی صندوق',
                'description_en' => 'Dedicated fund for Waqf',
                'opening_balance' => 0,
            ],
        ];

        foreach ($accounts as $accountData) {
            // Check if account already exists for this organization
            $exists = FinanceAccount::where('organization_id', $organizationId)
                ->where('code', $accountData['code'])
                ->whereNull('deleted_at')
                ->exists();

            if (!$exists) {
                FinanceAccount::create([
                    'organization_id' => $organizationId,
                    'school_id' => null,
                    'currency_id' => $currencyId,
                    'name' => $accountData['name'],
                    'code' => $accountData['code'],
                    'type' => $accountData['type'],
                    'description' => $accountData['description'],
                    'opening_balance' => $accountData['opening_balance'],
                    'current_balance' => $accountData['opening_balance'],
                    'is_active' => true,
                ]);

                $createdCount++;
                $this->command->info("    ✓ Created account: {$accountData['name']} ({$accountData['name_en']})");
            } else {
                $this->command->info("    ⊘ Account {$accountData['code']} already exists for this organization");
            }
        }

        return $createdCount;
    }
}

