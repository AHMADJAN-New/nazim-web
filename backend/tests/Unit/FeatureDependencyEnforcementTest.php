<?php

namespace Tests\Unit;

use App\Models\Organization;
use App\Models\OrganizationSubscription;
use App\Models\PlanFeature;
use App\Models\SubscriptionPlan;
use App\Services\Subscription\FeatureGateService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FeatureDependencyEnforcementTest extends TestCase
{
    use RefreshDatabase;

    private function createPlan(string $slug, string $name): SubscriptionPlan
    {
        return SubscriptionPlan::create([
            'name' => $name,
            'slug' => $slug,
            'description' => "{$name} plan (test)",
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

    private function enablePlanFeature(SubscriptionPlan $plan, string $featureKey): void
    {
        PlanFeature::create([
            'plan_id' => $plan->id,
            'feature_key' => $featureKey,
            'is_enabled' => true,
        ]);
    }

    public function test_missing_dependencies_block_feature_access(): void
    {
        // Create the ordered plans used for minimum-plan detection.
        $starter = $this->createPlan('starter', 'Starter');
        $pro = $this->createPlan('pro', 'Pro');

        // Pro includes "classes" but does NOT include its dependencies (students, staff)
        $this->enablePlanFeature($pro, 'classes');

        $org = Organization::create([
            'name' => 'Test Org',
            'slug' => 'test-org',
            'settings' => [],
        ]);

        OrganizationSubscription::create([
            'organization_id' => $org->id,
            'plan_id' => $pro->id,
            'status' => OrganizationSubscription::STATUS_ACTIVE,
            'started_at' => now(),
            'expires_at' => now()->addDays(30),
            'currency' => 'AFN',
        ]);

        $gate = app(FeatureGateService::class);
        $access = $gate->getFeatureAccessStatus($org->id, 'classes');

        $this->assertFalse($access['allowed']);
        $this->assertSame('dependency_missing', $access['reason']);
        $this->assertSame('classes', $access['feature_key']);
        $this->assertEqualsCanonicalizing(['students', 'staff'], $access['missing_dependencies']);
        $this->assertSame(['slug' => 'pro', 'name' => 'Pro'], $access['required_plan']);
    }

    public function test_feature_is_allowed_when_dependencies_are_enabled(): void
    {
        $starter = $this->createPlan('starter', 'Starter');
        $pro = $this->createPlan('pro', 'Pro');

        // Satisfy deps + feature in the pro chain.
        $this->enablePlanFeature($pro, 'students');
        $this->enablePlanFeature($pro, 'staff');
        $this->enablePlanFeature($pro, 'classes');

        $org = Organization::create([
            'name' => 'Deps OK Org',
            'slug' => 'deps-ok-org',
            'settings' => [],
        ]);

        OrganizationSubscription::create([
            'organization_id' => $org->id,
            'plan_id' => $pro->id,
            'status' => OrganizationSubscription::STATUS_ACTIVE,
            'started_at' => now(),
            'expires_at' => now()->addDays(30),
            'currency' => 'AFN',
        ]);

        $gate = app(FeatureGateService::class);
        $access = $gate->getFeatureAccessStatus($org->id, 'classes');

        $this->assertTrue($access['allowed']);
        $this->assertSame('full', $access['access_level']);
        $this->assertNull($access['reason']);
        $this->assertSame('classes', $access['feature_key']);
        $this->assertSame([], $access['missing_dependencies']);
        $this->assertNull($access['required_plan']);
    }
}

