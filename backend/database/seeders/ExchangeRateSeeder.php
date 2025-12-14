<?php

namespace Database\Seeders;

use App\Models\Currency;
use App\Models\ExchangeRate;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ExchangeRateSeeder extends Seeder
{
    /**
     * Seed the exchange_rates table.
     *
     * Creates bidirectional exchange rates for all currency pairs:
     * - USD, AFN (Afghan Afghani), PKR (Pakistani Rupee), SAR (Saudi Riyal)
     * 
     * Rates are based on approximate market values (as of 2024):
     * - 1 USD = 70 AFN
     * - 1 USD = 280 PKR
     * - 1 USD = 3.75 SAR
     */
    public function run(): void
    {
        $this->command->info('Seeding exchange rates...');

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
            $this->command->info("Creating exchange rates for {$organization->name}...");

            // Get currencies for this organization
            $currencies = Currency::where('organization_id', $organization->id)
                ->whereNull('deleted_at')
                ->where('is_active', true)
                ->get()
                ->keyBy('code');

            if ($currencies->isEmpty()) {
                $this->command->warn("  ⚠ No currencies found for {$organization->name}. Please run CurrencySeeder first.");
                continue;
            }

            // Create exchange rates for this organization
            $created = $this->createExchangeRatesForOrganization($organization->id, $currencies);
            $totalCreated += $created;

            $this->command->info("  → Created {$created} exchange rate(s) for {$organization->name}");
        }

        if ($totalCreated > 0) {
            $this->command->info("  → Total: Created {$totalCreated} exchange rate(s)");
        }

        $this->command->info('✅ Exchange rates seeded successfully!');
    }

    /**
     * Create exchange rates for a specific organization
     */
    protected function createExchangeRatesForOrganization(string $organizationId, $currencies): int
    {
        $createdCount = 0;
        $effectiveDate = Carbon::today()->toDateString();

        // Define base rates relative to USD (1 USD = X other currency)
        // These are approximate market rates - adjust as needed
        // All rates are calculated from USD as the base
        $usdRates = [
            'AFN' => 70.00,    // 1 USD = 70 AFN
            'PKR' => 280.00,   // 1 USD = 280 PKR
            'SAR' => 3.75,     // 1 USD = 3.75 SAR
        ];

        // Get currency IDs
        $currencyIds = [];
        foreach (['USD', 'AFN', 'PKR', 'SAR'] as $code) {
            if (isset($currencies[$code])) {
                $currencyIds[$code] = $currencies[$code]->id;
            } else {
                $this->command->warn("    ⚠ Currency {$code} not found for this organization");
            }
        }

        if (count($currencyIds) < 2) {
            $this->command->warn("    ⚠ Need at least 2 currencies to create exchange rates");
            return 0;
        }

        // Create bidirectional rates for all currency pairs
        $currencyCodes = array_keys($currencyIds);
        $pairsCreated = [];

        for ($i = 0; $i < count($currencyCodes); $i++) {
            for ($j = $i + 1; $j < count($currencyCodes); $j++) {
                $fromCode = $currencyCodes[$i];
                $toCode = $currencyCodes[$j];

                // Calculate rate (rounded to 2 decimal places)
                $rate = round($this->calculateRate($fromCode, $toCode, $usdRates), 2);
                $reverseRate = round(1.0 / $rate, 2);

                // Create forward rate (from -> to)
                $created = $this->createRateIfNotExists(
                    $organizationId,
                    $currencyIds[$fromCode],
                    $currencyIds[$toCode],
                    $rate,
                    $effectiveDate,
                    "Direct rate: 1 {$fromCode} = {$rate} {$toCode}"
                );
                if ($created) {
                    $createdCount++;
                    $pairsCreated[] = "{$fromCode} → {$toCode}";
                }

                // Create reverse rate (to -> from)
                $created = $this->createRateIfNotExists(
                    $organizationId,
                    $currencyIds[$toCode],
                    $currencyIds[$fromCode],
                    $reverseRate,
                    $effectiveDate,
                    "Reverse rate: 1 {$toCode} = {$reverseRate} {$fromCode}"
                );
                if ($created) {
                    $createdCount++;
                    $pairsCreated[] = "{$toCode} → {$fromCode}";
                }
            }
        }

        if (!empty($pairsCreated)) {
            $this->command->info("    ✓ Created rates: " . implode(', ', array_unique($pairsCreated)));
        }

        return $createdCount;
    }

    /**
     * Calculate exchange rate between two currencies
     * All rates are calculated relative to USD
     */
    protected function calculateRate(string $fromCode, string $toCode, array $usdRates): float
    {
        // Same currency
        if ($fromCode === $toCode) {
            return 1.0;
        }

        // Both are USD (shouldn't happen, but handle it)
        if ($fromCode === 'USD' && $toCode === 'USD') {
            return 1.0;
        }

        // From USD to another currency
        if ($fromCode === 'USD' && isset($usdRates[$toCode])) {
            return $usdRates[$toCode];
        }

        // From another currency to USD
        if ($toCode === 'USD' && isset($usdRates[$fromCode])) {
            return 1.0 / $usdRates[$fromCode];
        }

        // Both currencies are not USD - calculate through USD
        // 1 FROM = (1/USD_FROM) USD = (1/USD_FROM) * USD_TO TO
        if (isset($usdRates[$fromCode]) && isset($usdRates[$toCode])) {
            $fromToUsd = 1.0 / $usdRates[$fromCode];  // 1 FROM = X USD
            $usdToTo = $usdRates[$toCode];            // 1 USD = Y TO
            return $fromToUsd * $usdToTo;             // 1 FROM = X * Y TO
        }

        // Fallback: return 1.0 (should not happen with our currency set)
        $this->command->warn("    ⚠ Could not calculate rate from {$fromCode} to {$toCode}");
        return 1.0;
    }

    /**
     * Create an exchange rate if it doesn't already exist
     */
    protected function createRateIfNotExists(
        string $organizationId,
        string $fromCurrencyId,
        string $toCurrencyId,
        float $rate,
        string $effectiveDate,
        string $notes = null
    ): bool {
        // Check if rate already exists for this date
        $exists = ExchangeRate::where('organization_id', $organizationId)
            ->where('from_currency_id', $fromCurrencyId)
            ->where('to_currency_id', $toCurrencyId)
            ->where('effective_date', $effectiveDate)
            ->whereNull('deleted_at')
            ->exists();

        if ($exists) {
            return false;
        }

        ExchangeRate::create([
            'organization_id' => $organizationId,
            'from_currency_id' => $fromCurrencyId,
            'to_currency_id' => $toCurrencyId,
            'rate' => $rate, // Already rounded to 2 decimal places before calling
            'effective_date' => $effectiveDate,
            'notes' => $notes,
            'is_active' => true,
        ]);

        return true;
    }
}

