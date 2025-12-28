<?php

namespace App\Services\Subscription;

use App\Models\FeatureDefinition;
use App\Models\OrganizationFeatureAddon;
use App\Models\OrganizationSubscription;
use App\Models\PlanFeature;

class FeatureGateService
{
    public function __construct(
        private SubscriptionService $subscriptionService
    ) {}

    /**
     * Check if an organization has access to a feature
     */
    public function hasFeature(string $organizationId, string $featureKey): bool
    {
        // First check subscription status
        $subscription = $this->subscriptionService->getCurrentSubscription($organizationId);
        
        if (!$subscription) {
            return false;
        }

        // Blocked subscriptions have no feature access
        if ($subscription->isBlocked()) {
            return false;
        }

        // Check if feature is enabled in plan
        $plan = $subscription->plan;
        if ($plan && $plan->hasFeature($featureKey)) {
            return true;
        }

        // Check for feature addon
        $addon = OrganizationFeatureAddon::where('organization_id', $organizationId)
            ->where('feature_key', $featureKey)
            ->active()
            ->first();

        return $addon !== null;
    }

    /**
     * Assert that feature is available, throws exception if not
     */
    public function assertFeature(string $organizationId, string $featureKey): void
    {
        if (!$this->hasFeature($organizationId, $featureKey)) {
            $definition = FeatureDefinition::where('feature_key', $featureKey)->first();
            $featureName = $definition?->name ?? $featureKey;
            
            throw new \Exception("{$featureName} is not available on your current plan. Please upgrade to access this feature.");
        }
    }

    /**
     * Get all enabled features for an organization
     */
    public function getEnabledFeatures(string $organizationId): array
    {
        $subscription = $this->subscriptionService->getCurrentSubscription($organizationId);
        $enabledFeatures = [];

        // Get plan features
        if ($subscription && $subscription->plan) {
            $planFeatures = $subscription->plan->enabledFeatures()->pluck('feature_key')->toArray();
            $enabledFeatures = array_merge($enabledFeatures, $planFeatures);
        }

        // Get addon features
        $addonFeatures = OrganizationFeatureAddon::where('organization_id', $organizationId)
            ->active()
            ->pluck('feature_key')
            ->toArray();

        $enabledFeatures = array_merge($enabledFeatures, $addonFeatures);

        return array_unique($enabledFeatures);
    }

    /**
     * Get all features with their status for an organization
     */
    public function getAllFeaturesStatus(string $organizationId): array
    {
        $enabledFeatures = $this->getEnabledFeatures($organizationId);
        $allFeatures = FeatureDefinition::active()
            ->orderBy('category')
            ->orderBy('sort_order')
            ->get();

        $result = [];

        foreach ($allFeatures as $feature) {
            $isEnabled = in_array($feature->feature_key, $enabledFeatures);
            
            // Check if it's from addon
            $isAddon = OrganizationFeatureAddon::where('organization_id', $organizationId)
                ->where('feature_key', $feature->feature_key)
                ->active()
                ->exists();

            $result[] = [
                'feature_key' => $feature->feature_key,
                'name' => $feature->name,
                'description' => $feature->description,
                'category' => $feature->category,
                'is_enabled' => $isEnabled,
                'is_addon' => $isAddon,
                'can_purchase_addon' => $feature->is_addon && !$isEnabled,
                'addon_price_afn' => $feature->addon_price_yearly_afn,
                'addon_price_usd' => $feature->addon_price_yearly_usd,
            ];
        }

        return $result;
    }

    /**
     * Get features available for purchase as addons
     */
    public function getAvailableAddons(string $organizationId): array
    {
        $enabledFeatures = $this->getEnabledFeatures($organizationId);

        return FeatureDefinition::active()
            ->addons()
            ->whereNotIn('feature_key', $enabledFeatures)
            ->orderBy('category')
            ->orderBy('sort_order')
            ->get()
            ->map(function ($feature) {
                return [
                    'feature_key' => $feature->feature_key,
                    'name' => $feature->name,
                    'description' => $feature->description,
                    'category' => $feature->category,
                    'addon_price_afn' => $feature->addon_price_yearly_afn,
                    'addon_price_usd' => $feature->addon_price_yearly_usd,
                ];
            })
            ->toArray();
    }

    /**
     * Check subscription access level
     */
    public function getAccessLevel(string $organizationId): string
    {
        $subscription = $this->subscriptionService->getCurrentSubscription($organizationId);

        if (!$subscription) {
            return 'none';
        }

        if ($subscription->isBlocked()) {
            return 'blocked';
        }

        if ($subscription->isInReadonlyPeriod() || $subscription->status === OrganizationSubscription::STATUS_READONLY) {
            return 'readonly';
        }

        if ($subscription->isInGracePeriod() || $subscription->status === OrganizationSubscription::STATUS_GRACE_PERIOD) {
            return 'grace';
        }

        if ($subscription->canWrite()) {
            return 'full';
        }

        return 'readonly';
    }

    /**
     * Check if organization can perform write operations
     */
    public function canWrite(string $organizationId): bool
    {
        $accessLevel = $this->getAccessLevel($organizationId);
        return in_array($accessLevel, ['full', 'grace']);
    }

    /**
     * Check if organization can perform read operations
     */
    public function canRead(string $organizationId): bool
    {
        $accessLevel = $this->getAccessLevel($organizationId);
        return in_array($accessLevel, ['full', 'grace', 'readonly']);
    }

    /**
     * Get subscription status info for display
     */
    public function getSubscriptionStatus(string $organizationId): array
    {
        $subscription = $this->subscriptionService->getCurrentSubscription($organizationId);

        if (!$subscription) {
            return [
                'status' => 'none',
                'message' => 'No active subscription',
                'can_read' => false,
                'can_write' => false,
                'plan' => null,
                'expires_at' => null,
                'days_left' => null,
            ];
        }

        $plan = $subscription->plan;
        $accessLevel = $this->getAccessLevel($organizationId);

        $message = match ($subscription->status) {
            OrganizationSubscription::STATUS_TRIAL => "Trial period - {$subscription->trialDaysLeft()} days left",
            OrganizationSubscription::STATUS_ACTIVE => "Active subscription",
            OrganizationSubscription::STATUS_PENDING_RENEWAL => "Subscription expired - please renew",
            OrganizationSubscription::STATUS_GRACE_PERIOD => "Grace period - please renew to continue",
            OrganizationSubscription::STATUS_READONLY => "Read-only mode - please renew to regain full access",
            OrganizationSubscription::STATUS_EXPIRED => "Subscription expired - please renew",
            OrganizationSubscription::STATUS_SUSPENDED => "Account suspended: " . ($subscription->suspension_reason ?? 'Contact support'),
            OrganizationSubscription::STATUS_CANCELLED => "Subscription cancelled",
            default => "Unknown status",
        };

        return [
            'status' => $subscription->status,
            'access_level' => $accessLevel,
            'message' => $message,
            'can_read' => $this->canRead($organizationId),
            'can_write' => $this->canWrite($organizationId),
            'plan' => $plan ? [
                'id' => $plan->id,
                'name' => $plan->name,
                'slug' => $plan->slug,
            ] : null,
            'started_at' => $subscription->started_at?->toISOString(),
            'expires_at' => $subscription->expires_at?->toISOString(),
            'trial_ends_at' => $subscription->trial_ends_at?->toISOString(),
            'grace_period_ends_at' => $subscription->grace_period_ends_at?->toISOString(),
            'readonly_period_ends_at' => $subscription->readonly_period_ends_at?->toISOString(),
            'days_left' => $subscription->daysUntilExpiry(),
            'trial_days_left' => $subscription->trialDaysLeft(),
            'is_trial' => $subscription->isOnTrial(),
            'additional_schools' => $subscription->additional_schools,
            'total_schools_allowed' => $subscription->getTotalSchoolsAllowed(),
        ];
    }
}
