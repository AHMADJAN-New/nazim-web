<?php

namespace App\Services\Subscription;

use App\Models\FeatureDefinition;
use App\Models\OrganizationFeatureAddon;
use App\Models\OrganizationSubscription;
use App\Models\PlanFeature;

class FeatureGateService
{
    private const FEATURE_ALIASES = [
        'timetable' => 'timetables',
        'reports' => 'pdf_reports',
    ];

    public function __construct(
        private SubscriptionService $subscriptionService
    ) {}

    private function normalizeFeatureKey(string $featureKey): string
    {
        return self::FEATURE_ALIASES[$featureKey] ?? $featureKey;
    }

    private function getFeatureKeyVariants(string $featureKey): array
    {
        $canonical = $this->normalizeFeatureKey($featureKey);
        $aliases = [];

        foreach (self::FEATURE_ALIASES as $alias => $canonicalKey) {
            if ($canonicalKey === $canonical) {
                $aliases[] = $alias;
            }
        }

        return array_values(array_unique(array_merge([$featureKey, $canonical], $aliases)));
    }

    /**
     * Check if an organization has access to a feature
     * CRITICAL: Only returns true if feature is explicitly enabled in plan or as addon
     * NO fallback to permission-based access - enforces subscription-based access control
     */
    public function hasFeature(string $organizationId, string $featureKey): bool
    {
        // First check subscription status
        $subscription = $this->subscriptionService->getCurrentSubscription($organizationId);
        
        // If no subscription exists, deny access (enforce subscription requirement)
        if (!$subscription) {
            return false;
        }

        // Blocked subscriptions have no feature access
        if ($subscription->isBlocked()) {
            return false;
        }

        // CRITICAL: Check if subscription should be suspended due to payment issues
        // Maintenance overdue or unpaid license fee blocks all feature access
        if ($subscription->shouldBeSuspendedForPayment()) {
            return false;
        }

        // Load plan relationship if not already loaded
        try {
            if (!$subscription->relationLoaded('plan')) {
                $subscription->load('plan');
            }
        } catch (\Exception $e) {
            // If plan loading fails, deny access (fail secure)
            \Log::warning('Failed to load plan relationship in hasFeature: ' . $e->getMessage());
            return false;
        }

        $featureKeys = $this->getFeatureKeyVariants($featureKey);

        // Check for feature addon first (addons override plan features)
        $addon = OrganizationFeatureAddon::where('organization_id', $organizationId)
            ->whereIn('feature_key', $featureKeys)
            ->where('is_enabled', true)
            ->whereNull('deleted_at')
            ->where(function ($q) {
                $q->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            })
            ->first();

        if ($addon) {
            return true;
        }

        // Check if feature is enabled in plan
        $plan = $subscription->plan;
        if ($plan && $plan->features()
            ->whereIn('feature_key', $featureKeys)
            ->where('is_enabled', true)
            ->exists()) {
            return true;
        }

        // CRITICAL: No fallback - if feature is not in plan and not an addon, deny access
        // This enforces subscription-based access control
        return false;
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
        $hasPlanFeatures = false;

        // Get plan features
        if ($subscription) {
            // Load plan relationship if not already loaded
            if (!$subscription->relationLoaded('plan')) {
                $subscription->load('plan');
            }
            
            if ($subscription->plan) {
                $planFeatures = $subscription->plan->enabledFeatures()->pluck('feature_key')->toArray();
                $enabledFeatures = array_merge($enabledFeatures, $planFeatures);
                // Check if plan has any features assigned (even if disabled)
                $hasPlanFeatures = $subscription->plan->features()->exists();
            }
        }

        // Get addon features (addons override plan features)
        $addonFeatures = OrganizationFeatureAddon::where('organization_id', $organizationId)
            ->where('is_enabled', true)
            ->whereNull('deleted_at')
            ->where(function ($q) {
                $q->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            })
            ->pluck('feature_key')
            ->toArray();

        // Addons override plan features - merge and deduplicate
        $enabledFeatures = array_unique(array_merge($enabledFeatures, $addonFeatures));

        $normalizedFeatures = [];
        foreach ($enabledFeatures as $featureKey) {
            $normalizedFeatures = array_merge($normalizedFeatures, $this->getFeatureKeyVariants($featureKey));
        }

        // CRITICAL: Only return features that are explicitly enabled in the plan or as addons
        // NO fallback to enable all features - this enforces subscription-based access control
        // Users must have the feature in their plan or as an addon to access it

        return array_values(array_unique($normalizedFeatures));
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
            
            // Check if it's from addon (including disabled addons for display)
            $addon = OrganizationFeatureAddon::where('organization_id', $organizationId)
                ->where('feature_key', $feature->feature_key)
                ->whereNull('deleted_at')
                ->first();
            $isAddon = $addon !== null;

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
     * CRITICAL: Maintenance overdue or unpaid license fee will block access
     */
    public function getAccessLevel(string $organizationId): string
    {
        $subscription = $this->subscriptionService->getCurrentSubscription($organizationId);

        if (!$subscription) {
            return 'none';
        }

        // CRITICAL: Check if subscription should be suspended due to maintenance/license issues
        // This takes precedence over other status checks
        if ($subscription->shouldBeSuspendedForPayment()) {
            return 'blocked';
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

        // Load plan relationship if not already loaded
        try {
            if (!$subscription->relationLoaded('plan')) {
                $subscription->load('plan');
            }
        } catch (\Exception $e) {
            // If plan loading fails, continue without plan
            \Log::warning('Failed to load plan relationship in getSubscriptionStatus: ' . $e->getMessage());
        }
        
        $plan = $subscription->plan;
        $accessLevel = $this->getAccessLevel($organizationId);

        // Build message based on status and payment issues
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

        // Override message if payment issues exist (takes precedence)
        if ($subscription->shouldBeSuspendedForPayment()) {
            $reasons = [];
            
            if ($subscription->isMaintenanceOverdue()) {
                $daysOverdue = $subscription->daysMaintenanceOverdue();
                $reasons[] = "Maintenance fee overdue ({$daysOverdue} day(s))";
            }
            
            if ($subscription->isLicenseFeePending()) {
                $reasons[] = "License fee not paid";
            }
            
            $message = "Account suspended: " . implode(", ", $reasons) . ". Please make payment to restore access.";
        }

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
            // Payment status information
            'maintenance_overdue' => $subscription->isMaintenanceOverdue(),
            'maintenance_days_overdue' => $subscription->daysMaintenanceOverdue(),
            'maintenance_days_until_due' => $subscription->daysUntilMaintenanceDue(),
            'next_maintenance_due_at' => $subscription->next_maintenance_due_at?->toISOString(),
            'license_fee_pending' => $subscription->isLicenseFeePending(),
            'license_fee_required' => $subscription->requiresLicenseFee(),
            'license_paid_at' => $subscription->license_paid_at?->toISOString(),
        ];
    }
}
