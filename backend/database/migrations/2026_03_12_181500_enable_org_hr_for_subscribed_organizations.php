<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Enable Organization HR features (org_hr_core, org_hr_payroll, org_hr_analytics)
     * for every organization that has a subscription, and for any org without the addon
     * so the feature is available after migrate.
     */
    public function up(): void
    {
        $orgIds = DB::table('organization_subscriptions')
            ->whereNull('deleted_at')
            ->distinct()
            ->pluck('organization_id');

        $features = ['org_hr_core', 'org_hr_payroll', 'org_hr_analytics'];

        foreach ($orgIds as $organizationId) {
            foreach ($features as $featureKey) {
                $exists = DB::table('organization_feature_addons')
                    ->where('organization_id', $organizationId)
                    ->where('feature_key', $featureKey)
                    ->whereNull('deleted_at')
                    ->exists();

                if (!$exists) {
                    DB::table('organization_feature_addons')->insert([
                        'id' => (string) \Illuminate\Support\Str::uuid(),
                        'organization_id' => $organizationId,
                        'feature_key' => $featureKey,
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

        // Also enable for organizations that have no subscription yet (e.g. fresh dev)
        // so that the first org can use org-admin/HR
        $orgsWithoutAddon = DB::table('organizations')
            ->whereNull('deleted_at')
            ->whereNotIn('id', function ($q) {
                $q->select('organization_id')
                    ->from('organization_feature_addons')
                    ->where('feature_key', 'org_hr_core')
                    ->whereNull('deleted_at');
            })
            ->pluck('id');

        foreach ($orgsWithoutAddon as $organizationId) {
            foreach ($features as $featureKey) {
                DB::table('organization_feature_addons')->insert([
                    'id' => (string) \Illuminate\Support\Str::uuid(),
                    'organization_id' => $organizationId,
                    'feature_key' => $featureKey,
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
        // Feature cache (subscription:enabled-features:v1:*) TTL is 5 min; new addons will be picked up after expiry.
    }

    public function down(): void
    {
        // Do not remove addons on rollback to avoid breaking existing usage
    }
};
