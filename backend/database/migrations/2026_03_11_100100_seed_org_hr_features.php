<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $features = [
            ['feature_key' => 'org_hr_core', 'name' => 'Organization HR Core', 'description' => 'Centralized organization HR staff and assignments.'],
            ['feature_key' => 'org_hr_payroll', 'name' => 'Organization HR Payroll', 'description' => 'Organization-wide payroll processing module.'],
            ['feature_key' => 'org_hr_analytics', 'name' => 'Organization HR Analytics', 'description' => 'Organization HR analytics and planning dashboards.'],
        ];

        foreach ($features as $feature) {
            $exists = DB::table('feature_definitions')->where('feature_key', $feature['feature_key'])->exists();
            if (!$exists) {
                DB::table('feature_definitions')->insert([
                    'feature_key' => $feature['feature_key'],
                    'name' => $feature['name'],
                    'description' => $feature['description'],
                    'is_core' => false,
                    'is_addon' => true,
                    'addon_price_yearly_afn' => 0,
                    'addon_price_yearly_usd' => 0,
                    'sort_order' => 300,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        // no-op to avoid destructive feature config rollback
    }
};
