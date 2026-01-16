<?php

namespace Tests\Unit;

use App\Models\Organization;
use App\Models\OrganizationLimitOverride;
use App\Models\OrganizationSubscription;
use App\Models\PlanFeature;
use App\Models\PlanLimit;
use App\Models\SubscriptionPlan;
use App\Services\Subscription\UsageTrackingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UsageLimitResolutionTest extends TestCase
{
    use RefreshDatabase;

    private function createPlan(string $slug): SubscriptionPlan
    {
        return SubscriptionPlan::create([
            'name' => strtoupper($slug),
            'slug' => $slug,
            'description' => "{$slug} plan (test)",
            'is_active' => true,
            'is_default' => false,
            'is_custom' => false,
            'trial_days' => 0,
            'grace_period_days' => 14,
            'readonly_period_days' => 60,
            'max_schools' => 1,
            'sort_order' => 0,
        ]);
    }

    private function setPlanLimit(SubscriptionPlan $plan, string $resourceKey, int $limitValue): void
    {
        PlanLimit::create([
            'plan_id' => $plan->id,
            'resource_key' => $resourceKey,
            'limit_value' => $limitValue,
            'warning_threshold' => 80,
        ]);
    }

    private function enablePlanFeature(SubscriptionPlan $plan, string $featureKey): void
    {
        PlanFeature::create([
            'plan_id' => $plan->id,
            'feature_key' => $featureKey,
            'is_enabled' => true,
        ]);
    }

    public function test_limit_resolution_prefers_active_override_over_plan_limit(): void
    {
        $plan = $this->createPlan('starter');
        $this->enablePlanFeature($plan, 'students');
        $this->setPlanLimit($plan, 'students', 100);

        $org = Organization::create([
            'name' => 'Limit Org',
            'slug' => 'limit-org',
            'settings' => [],
        ]);

        OrganizationSubscription::create([
            'organization_id' => $org->id,
            'plan_id' => $plan->id,
            'status' => OrganizationSubscription::STATUS_ACTIVE,
            'started_at' => now(),
            'expires_at' => now()->addDays(30),
            'currency' => 'AFN',
            'additional_schools' => 0,
        ]);

        $service = app(UsageTrackingService::class);
        $this->assertSame(100, $service->getLimit($org->id, 'students'));

        OrganizationLimitOverride::create([
            'organization_id' => $org->id,
            'resource_key' => 'students',
            'limit_value' => 150,
            'reason' => 'Test override',
        ]);

        $this->assertSame(150, $service->getLimit($org->id, 'students'));
    }

    public function test_schools_limit_adds_additional_schools_to_base_limit(): void
    {
        $plan = $this->createPlan('starter');
        $this->setPlanLimit($plan, 'schools', 1);

        $org = Organization::create([
            'name' => 'School Limit Org',
            'slug' => 'school-limit-org',
            'settings' => [],
        ]);

        OrganizationSubscription::create([
            'organization_id' => $org->id,
            'plan_id' => $plan->id,
            'status' => OrganizationSubscription::STATUS_ACTIVE,
            'started_at' => now(),
            'expires_at' => now()->addDays(30),
            'currency' => 'AFN',
            'additional_schools' => 2,
        ]);

        $service = app(UsageTrackingService::class);
        $this->assertSame(3, $service->getLimit($org->id, 'schools'));
    }
}

