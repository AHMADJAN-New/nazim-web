<?php

namespace Tests\Unit;

use App\Models\SubscriptionPlan;
use Tests\TestCase;

class SubscriptionPlanBillingTest extends TestCase
{
    public function test_billing_period_days_and_labels(): void
    {
        $monthly = new SubscriptionPlan(['billing_period' => SubscriptionPlan::BILLING_PERIOD_MONTHLY]);
        $this->assertSame(30, $monthly->getBillingPeriodDays());
        $this->assertSame('Monthly', $monthly->getBillingPeriodLabel());

        $quarterly = new SubscriptionPlan(['billing_period' => SubscriptionPlan::BILLING_PERIOD_QUARTERLY]);
        $this->assertSame(90, $quarterly->getBillingPeriodDays());
        $this->assertSame('Quarterly', $quarterly->getBillingPeriodLabel());

        $yearly = new SubscriptionPlan(['billing_period' => SubscriptionPlan::BILLING_PERIOD_YEARLY]);
        $this->assertSame(365, $yearly->getBillingPeriodDays());
        $this->assertSame('Yearly', $yearly->getBillingPeriodLabel());

        $custom = new SubscriptionPlan([
            'billing_period' => SubscriptionPlan::BILLING_PERIOD_CUSTOM,
            'custom_billing_days' => 45,
        ]);
        $this->assertSame(45, $custom->getBillingPeriodDays());
        $this->assertSame('45 days', $custom->getBillingPeriodLabel());
    }

    public function test_fee_totals_include_license_and_per_school_maintenance(): void
    {
        $plan = new SubscriptionPlan([
            'license_fee_afn' => 1000,
            'maintenance_fee_afn' => 365,
            'per_school_maintenance_fee_afn' => 10,
        ]);

        $this->assertSame(1000.0, $plan->getLicenseFee('AFN'));
        $this->assertSame(365.0, $plan->getMaintenanceFee('AFN'));
        $this->assertSame(10.0, $plan->getPerSchoolMaintenanceFee('AFN'));

        $this->assertSame(395.0, $plan->getTotalMaintenanceFee('AFN', 3));
        $this->assertSame(1395.0, $plan->getTotalInitialCost('AFN', 3));
    }

    public function test_maintenance_fee_conversion_to_target_period(): void
    {
        // 365 AFN/yearly -> 30 AFN/monthly (because 365 days -> 30 days)
        $plan = new SubscriptionPlan([
            'billing_period' => SubscriptionPlan::BILLING_PERIOD_YEARLY,
            'maintenance_fee_afn' => 365,
        ]);

        $monthly = $plan->getMaintenanceFeeForPeriod('AFN', 'monthly');
        $this->assertEqualsWithDelta(30.0, $monthly, 0.0001);
    }
}

