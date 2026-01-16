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

            // Get all schools for this organization
            $schools = DB::table('school_branding')
                ->where('organization_id', $organization->id)
                ->whereNull('deleted_at')
                ->get();

            if ($schools->isEmpty()) {
                $this->command->warn("  ⚠ No schools found for organization {$organization->name}. Skipping finance account seeding for this org.");
                continue;
            }

            foreach ($schools as $school) {
                $this->command->info("Creating finance accounts for {$organization->name} - school: {$school->school_name}...");

                // Get base currency for this school
                $baseCurrency = Currency::where('organization_id', $organization->id)
                    ->where('school_id', $school->id)
                    ->where('is_base', true)
                    ->whereNull('deleted_at')
                    ->first();

                if (!$baseCurrency) {
                    $this->command->warn("  ⚠ No base currency found for {$organization->name} - {$school->school_name}. Skipping accounts.");
                    continue;
                }

                // Create accounts for this school
                $created = $this->createAccountsForSchool($organization->id, $school->id, $baseCurrency->id);
                $totalCreated += $created;

                if ($created > 0) {
                    $this->command->info("  → Created {$created} account(s) for {$organization->name} - {$school->school_name}");
                }
            }
        }

        if ($totalCreated > 0) {
            $this->command->info("  → Total: Created {$totalCreated} account(s)");
        }

        $this->command->info('✅ Finance accounts seeded successfully!');
    }

    /**
     * Create finance accounts for a specific school
     */
    protected function createAccountsForSchool(string $organizationId, string $schoolId, string $currencyId): int
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
            // Use firstOrCreate to handle duplicates gracefully
            // This will create if doesn't exist, or return existing if it does (even if soft-deleted)
            $account = FinanceAccount::withTrashed()
                ->firstOrCreate(
                    [
                        'organization_id' => $organizationId,
                        'school_id' => $schoolId,
                        'code' => $accountData['code'],
                    ],
                    [
                        'currency_id' => $currencyId,
                        'name' => $accountData['name'],
                        'type' => $accountData['type'],
                        'description' => $accountData['description'],
                        'opening_balance' => $accountData['opening_balance'],
                        'current_balance' => $accountData['opening_balance'],
                        'is_active' => true,
                    ]
                );

            // If account was soft-deleted, restore it and update fields
            if ($account->trashed()) {
                $account->restore();
                $account->update([
                    'currency_id' => $currencyId,
                    'name' => $accountData['name'],
                    'type' => $accountData['type'],
                    'description' => $accountData['description'],
                    'is_active' => true,
                ]);
                $this->command->info("    ↻ Restored and updated account: {$accountData['name']} ({$accountData['name_en']})");
                $createdCount++;
            } elseif ($account->wasRecentlyCreated) {
                $createdCount++;
                $this->command->info("    ✓ Created account: {$accountData['name']} ({$accountData['name_en']})");
            } else {
                // Account exists and is not deleted - update if needed
                $needsUpdate = false;
                $updates = [];

                if ($account->currency_id !== $currencyId) {
                    $updates['currency_id'] = $currencyId;
                    $needsUpdate = true;
                }
                if ($account->name !== $accountData['name']) {
                    $updates['name'] = $accountData['name'];
                    $needsUpdate = true;
                }
                if ($account->description !== $accountData['description']) {
                    $updates['description'] = $accountData['description'];
                    $needsUpdate = true;
                }
                if ($account->type !== $accountData['type']) {
                    $updates['type'] = $accountData['type'];
                    $needsUpdate = true;
                }
                if (!$account->is_active) {
                    $updates['is_active'] = true;
                    $needsUpdate = true;
                }

                if ($needsUpdate) {
                    $account->update($updates);
                    $this->command->info("    ↻ Updated account: {$accountData['name']} ({$accountData['name_en']})");
                } else {
                    $this->command->info("    ⊘ Account {$accountData['code']} already exists for this school");
                }
            }
        }

        return $createdCount;
    }
}

