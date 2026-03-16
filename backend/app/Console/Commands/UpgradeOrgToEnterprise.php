<?php

namespace App\Console\Commands;

use App\Models\Organization;
use App\Models\SubscriptionPlan;
use App\Services\Subscription\SubscriptionService;
use Illuminate\Console\Command;

class UpgradeOrgToEnterprise extends Command
{
    protected $signature = 'organizations:upgrade-to-enterprise {organization_id : Organization UUID to upgrade}';

    protected $description = 'Upgrade an organization\'s subscription to Enterprise plan (required for /org-admin access)';

    public function handle(SubscriptionService $subscriptionService): int
    {
        $organizationId = $this->argument('organization_id');

        $organization = Organization::where('id', $organizationId)->whereNull('deleted_at')->first();

        if (! $organization) {
            $this->error("Organization not found: {$organizationId}");

            return 1;
        }

        $enterprisePlan = SubscriptionPlan::where('slug', 'enterprise')->where('is_active', true)->first();

        if (! $enterprisePlan) {
            $this->error('Enterprise plan not found. Run SubscriptionSeeder first.');

            return 1;
        }

        $currentSubscription = $subscriptionService->getCurrentSubscription($organizationId);

        if (! $currentSubscription) {
            $this->error('Organization has no subscription. Creating trial first...');
            $currentSubscription = $subscriptionService->createTrialSubscription($organizationId);
        }

        if ($currentSubscription->plan_id === $enterprisePlan->id) {
            $this->info("Organization {$organization->name} is already on Enterprise plan.");

            return 0;
        }

        try {
            $subscriptionService->activateSubscription(
                $organizationId,
                (string) $enterprisePlan->id,
                'AFN',
                0.0,
                0,
                null,
                'Upgraded via artisan command for org-admin access',
                true
            );
            $this->info("Successfully upgraded {$organization->name} to Enterprise plan. Org-admin access should now work.");

            return 0;
        } catch (\Exception $e) {
            $this->error('Upgrade failed: '.$e->getMessage());

            return 1;
        }
    }
}
