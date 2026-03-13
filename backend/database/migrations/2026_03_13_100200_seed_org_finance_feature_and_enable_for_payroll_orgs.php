<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Add org_finance feature definition and enable it for every organization
     * that has org_hr_payroll (additive rollout).
     */
    public function up(): void
    {
        $exists = DB::table('feature_definitions')->where('feature_key', 'org_finance')->exists();
        if (!$exists) {
            DB::table('feature_definitions')->insert([
                'feature_key' => 'org_finance',
                'name' => 'Organization Finance',
                'description' => 'Organization-level finance: accounts, categories, entries, and payroll expense integration.',
                'category' => 'org_finance',
                'is_addon' => true,
                'addon_price_yearly_afn' => 0,
                'addon_price_yearly_usd' => 0,
                'sort_order' => 310,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $orgIdsWithPayroll = DB::table('organization_feature_addons')
            ->where('feature_key', 'org_hr_payroll')
            ->whereNull('deleted_at')
            ->where('is_enabled', true)
            ->distinct()
            ->pluck('organization_id');

        foreach ($orgIdsWithPayroll as $organizationId) {
            $existsAddon = DB::table('organization_feature_addons')
                ->where('organization_id', $organizationId)
                ->where('feature_key', 'org_finance')
                ->whereNull('deleted_at')
                ->exists();

            if (!$existsAddon) {
                DB::table('organization_feature_addons')->insert([
                    'id' => (string) \Illuminate\Support\Str::uuid(),
                    'organization_id' => $organizationId,
                    'feature_key' => 'org_finance',
                    'is_enabled' => true,
                    'started_at' => now(),
                    'expires_at' => null,
                    'price_paid' => 0,
                    'currency' => 'AFN',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        // Do not remove feature definition or addons on rollback
    }
};
