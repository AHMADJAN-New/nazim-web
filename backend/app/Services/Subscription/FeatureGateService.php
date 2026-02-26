<?php

namespace App\Services\Subscription;

use App\Models\FeatureDefinition;
use App\Models\OrganizationFeatureAddon;
use App\Models\OrganizationSubscription;
use App\Models\PlanFeature;
use App\Models\SubscriptionPlan;
use Illuminate\Support\Facades\Cache;

class FeatureGateService
{
    private const FEATURE_ALIASES = [
        'timetable' => 'timetables',
        'reports' => 'pdf_reports',
    ];

    public function __construct(
        private SubscriptionService $subscriptionService,
        private UsageTrackingService $usageTrackingService
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

    private function getFeatureCatalog(): array
    {
        return config('subscription_features.features', []);
    }

    private function getFeatureMetadata(string $featureKey): array
    {
        $canonical = $this->normalizeFeatureKey($featureKey);
        $catalog = $this->getFeatureCatalog();

        return $catalog[$canonical] ?? [];
    }

    private function getFeatureDependencies(string $featureKey): array
    {
        $metadata = $this->getFeatureMetadata($featureKey);
        $dependencies = $metadata['dependencies'] ?? [];

        if (! empty($metadata['parent'])) {
            $dependencies[] = $metadata['parent'];
        }

        return $dependencies;
    }

    private function getFeatureParent(string $featureKey): ?string
    {
        $metadata = $this->getFeatureMetadata($featureKey);

        return $metadata['parent'] ?? null;
    }

    private function getPlanInheritanceChain(string $planSlug): array
    {
        $order = config('subscription_features.plan_order', []);
        $index = array_search($planSlug, $order, true);

        if ($index === false) {
            return [$planSlug];
        }

        return array_slice($order, 0, $index + 1);
    }

    private function getPlanFeatureKeysWithInheritance(SubscriptionPlan $plan): array
    {
        $slugs = $this->getPlanInheritanceChain($plan->slug);

        if (count($slugs) === 1) {
            return $plan->enabledFeatures()->pluck('feature_key')->toArray();
        }

        $planIds = SubscriptionPlan::whereIn('slug', $slugs)->pluck('id')->toArray();

        return PlanFeature::whereIn('plan_id', $planIds)
            ->where('is_enabled', true)
            ->pluck('feature_key')
            ->toArray();
    }

    private function getMinimumPlanForFeature(string $featureKey): ?array
    {
        $canonical = $this->normalizeFeatureKey($featureKey);
        static $cache = [];

        if (array_key_exists($canonical, $cache)) {
            return $cache[$canonical];
        }

        $order = config('subscription_features.plan_order', []);

        if (empty($order)) {
            return $cache[$canonical] = null;
        }

        $plans = SubscriptionPlan::whereIn('slug', $order)->get()->keyBy('slug');

        foreach ($order as $slug) {
            $plan = $plans->get($slug);
            if (! $plan) {
                continue;
            }

            $features = $this->getPlanFeatureKeysWithInheritance($plan);
            if (in_array($canonical, $features, true)) {
                return $cache[$canonical] = ['slug' => $plan->slug, 'name' => $plan->name];
            }
        }

        return $cache[$canonical] = null;
    }

    private function getLockedFeatures(OrganizationSubscription $subscription): array
    {
        $metadata = $subscription->metadata ?? [];
        $locked = $metadata['locked_features'] ?? [];

        if (! is_array($locked)) {
            return [];
        }

        return array_values(array_unique(array_map([$this, 'normalizeFeatureKey'], $locked)));
    }

    private function getMissingDependencies(string $featureKey, array $enabledFeatures, array &$visited = []): array
    {
        $canonical = $this->normalizeFeatureKey($featureKey);

        if (isset($visited[$canonical])) {
            return [];
        }

        $visited[$canonical] = true;
        $missing = [];

        foreach ($this->getFeatureDependencies($canonical) as $dependency) {
            $dependencyKey = $this->normalizeFeatureKey($dependency);

            if (! in_array($dependencyKey, $enabledFeatures, true)) {
                $missing[] = $dependencyKey;

                continue;
            }

            $childMissing = $this->getMissingDependencies($dependencyKey, $enabledFeatures, $visited);
            if (! empty($childMissing)) {
                $missing = array_merge($missing, $childMissing);
            }
        }

        return array_values(array_unique($missing));
    }

    /**
     * Resolve feature access with dependency enforcement and downgrade read-only support.
     */
    public function getFeatureAccessStatus(string $organizationId, string $featureKey): array
    {
        $subscription = $this->subscriptionService->getCurrentSubscription($organizationId);
        $enabledFeatures = $this->getEnabledFeatures($organizationId);

        return $this->getFeatureAccessStatusWithContext(
            $organizationId,
            $featureKey,
            $subscription,
            $enabledFeatures
        );
    }

    /**
     * Internal resolver to avoid repeated DB work when caller already has context.
     */
    private function getFeatureAccessStatusWithContext(
        string $organizationId,
        string $featureKey,
        ?OrganizationSubscription $subscription,
        array $enabledFeatures
    ): array {
        $canonical = $this->normalizeFeatureKey($featureKey);

        if (! $subscription) {
            return [
                'allowed' => false,
                'access_level' => 'none',
                'reason' => 'no_subscription',
                'feature_key' => $canonical,
                'missing_dependencies' => [],
                'required_plan' => null,
            ];
        }

        if ($subscription->isBlocked() || $subscription->shouldBeSuspendedForPayment()) {
            return [
                'allowed' => false,
                'access_level' => 'none',
                'reason' => 'subscription_blocked',
                'feature_key' => $canonical,
                'missing_dependencies' => [],
                'required_plan' => null,
            ];
        }

        if (! $subscription->relationLoaded('plan')) {
            try {
                $subscription->load('plan');
            } catch (\Exception $e) {
                \Log::warning('Failed to load plan relationship in feature access resolver: '.$e->getMessage());

                return [
                    'allowed' => false,
                    'access_level' => 'none',
                    'reason' => 'plan_not_loaded',
                    'feature_key' => $canonical,
                    'missing_dependencies' => [],
                    'required_plan' => null,
                ];
            }
        }

        $isEnabled = in_array($canonical, $enabledFeatures, true);
        $lockedFeatures = $this->getLockedFeatures($subscription);
        $isLockedReadonly = in_array($canonical, $lockedFeatures, true);

        if ($isEnabled) {
            $missingDependencies = $this->getMissingDependencies($canonical, $enabledFeatures);

            if (! empty($missingDependencies)) {
                return [
                    'allowed' => false,
                    'access_level' => 'none',
                    'reason' => 'dependency_missing',
                    'feature_key' => $canonical,
                    'missing_dependencies' => $missingDependencies,
                    'required_plan' => $this->getMinimumPlanForFeature($canonical),
                ];
            }

            return [
                'allowed' => true,
                'access_level' => 'full',
                'reason' => null,
                'feature_key' => $canonical,
                'missing_dependencies' => [],
                'required_plan' => null,
            ];
        }

        if ($isLockedReadonly) {
            return [
                'allowed' => true,
                'access_level' => 'readonly',
                'reason' => 'locked_readonly',
                'feature_key' => $canonical,
                'missing_dependencies' => [],
                'required_plan' => $this->getMinimumPlanForFeature($canonical),
            ];
        }

        return [
            'allowed' => false,
            'access_level' => 'none',
            'reason' => 'feature_not_in_plan',
            'feature_key' => $canonical,
            'missing_dependencies' => [],
            'required_plan' => $this->getMinimumPlanForFeature($canonical),
        ];
    }

    /**
     * Check if an organization has access to a feature
     * CRITICAL: Only returns true if feature is explicitly enabled in plan or as addon
     * NO fallback to permission-based access - enforces subscription-based access control
     */
    public function hasFeature(string $organizationId, string $featureKey): bool
    {
        $access = $this->getFeatureAccessStatus($organizationId, $featureKey);

        return $access['allowed'] ?? false;
    }

    /**
     * Assert that feature is available, throws exception if not
     */
    public function assertFeature(string $organizationId, string $featureKey): void
    {
        if (! $this->hasFeature($organizationId, $featureKey)) {
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
        $cacheKey = "subscription:enabled-features:v1:{$organizationId}";

        return Cache::remember($cacheKey, now()->addMinutes(5), function () use ($organizationId) {
            $subscription = $this->subscriptionService->getCurrentSubscription($organizationId);
            $enabledFeatures = [];

            // Get plan features
            if ($subscription) {
                // Load plan relationship if not already loaded
                if (! $subscription->relationLoaded('plan')) {
                    $subscription->load('plan');
                }

                if ($subscription->plan) {
                    $planFeatures = $this->getPlanFeatureKeysWithInheritance($subscription->plan);
                    $enabledFeatures = array_merge($enabledFeatures, $planFeatures);
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

            // Org-level disable: exclude features that have an addon row with is_enabled = false
            $disabledOverrides = OrganizationFeatureAddon::where('organization_id', $organizationId)
                ->where('is_enabled', false)
                ->whereNull('deleted_at')
                ->pluck('feature_key')
                ->toArray();
            if (! empty($disabledOverrides)) {
                $enabledFeatures = array_values(array_diff($enabledFeatures, $disabledOverrides));
            }

            $normalizedFeatures = [];
            foreach ($enabledFeatures as $featureKey) {
                $normalizedFeatures = array_merge($normalizedFeatures, $this->getFeatureKeyVariants($featureKey));
            }

            // CRITICAL: Only return features that are explicitly enabled in the plan or as addons
            return array_values(array_unique($normalizedFeatures));
        });
    }

    /**
     * Get all features with their status for an organization
     */
    public function getAllFeaturesStatus(string $organizationId): array
    {
        $subscription = $this->subscriptionService->getCurrentSubscription($organizationId);
        if ($subscription && ! $subscription->relationLoaded('plan')) {
            try {
                $subscription->load('plan');
            } catch (\Exception $e) {
                \Log::warning('Failed to load plan relationship in getAllFeaturesStatus: '.$e->getMessage());
            }
        }

        $enabledFeatures = $this->getEnabledFeatures($organizationId);
        $addonsByKey = OrganizationFeatureAddon::where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->get()
            ->keyBy('feature_key');

        $allFeatures = FeatureDefinition::active()
            ->orderBy('category')
            ->orderBy('sort_order')
            ->get();

        $result = [];

        foreach ($allFeatures as $feature) {
            $isEnabled = in_array($feature->feature_key, $enabledFeatures, true);
            $access = $this->getFeatureAccessStatusWithContext(
                $organizationId,
                $feature->feature_key,
                $subscription,
                $enabledFeatures
            );
            $parentFeature = $this->getFeatureParent($feature->feature_key);

            // Check if it's from addon (including disabled addons for display)
            $addon = $addonsByKey->get($feature->feature_key);
            $isAddon = $addon !== null;

            $result[] = [
                'feature_key' => $feature->feature_key,
                'name' => $feature->name,
                'description' => $feature->description,
                'category' => $feature->category,
                'is_enabled' => $isEnabled,
                'is_accessible' => $access['allowed'] ?? false,
                'access_level' => $access['access_level'] ?? 'none',
                'missing_dependencies' => $access['missing_dependencies'] ?? [],
                'required_plan' => $access['required_plan'] ?? null,
                'parent_feature' => $parentFeature,
                'is_addon' => $isAddon,
                'can_purchase_addon' => $feature->is_addon && ! $isEnabled,
                'addon_price_afn' => $feature->addon_price_yearly_afn,
                'addon_price_usd' => $feature->addon_price_yearly_usd,
            ];
        }

        return $result;
    }

    /**
     * Filter usage data to only include limits tied to enabled features.
     * CRITICAL: storage_gb is always included (no feature required)
     */
    public function filterUsageByFeatures(string $organizationId, array $usage): array
    {
        $limitFeatureMap = config('subscription_features.limit_feature_map', []);
        if (empty($limitFeatureMap) || empty($usage)) {
            return $usage;
        }

        $enabledFeatures = $this->getEnabledFeatures($organizationId);
        $enabledSet = array_fill_keys($enabledFeatures, true);
        $filtered = [];

        foreach ($usage as $resourceKey => $info) {
            $required = $limitFeatureMap[$resourceKey] ?? null;

            // Always include storage_gb (no feature required)
            if ($resourceKey === 'storage_gb') {
                $filtered[$resourceKey] = $info;

                continue;
            }

            // If no features are enabled and this resource requires a feature, skip it
            if (empty($enabledFeatures) && $required !== null) {
                continue;
            }

            // If resource requires a feature, check if feature is enabled
            if ($required !== null) {
                $requiredFeatures = is_array($required) ? $required : [$required];
                $hasAny = false;

                foreach ($requiredFeatures as $featureKey) {
                    if (isset($enabledSet[$featureKey])) {
                        $hasAny = true;
                        break;
                    }
                }

                if (! $hasAny) {
                    continue;
                }
            }

            // If no feature required or feature is enabled, include it
            $filtered[$resourceKey] = $info;
        }

        return $filtered;
    }

    /**
     * Filter warnings to only include limits tied to enabled features.
     */
    public function filterWarningsByFeatures(string $organizationId, array $warnings): array
    {
        $limitFeatureMap = config('subscription_features.limit_feature_map', []);
        if (empty($limitFeatureMap) || empty($warnings)) {
            return $warnings;
        }

        $enabledFeatures = $this->getEnabledFeatures($organizationId);
        $enabledSet = array_fill_keys($enabledFeatures, true);
        $filtered = [];

        foreach ($warnings as $warning) {
            $resourceKey = $warning['resource_key'] ?? null;
            if (! $resourceKey) {
                continue;
            }

            $required = $limitFeatureMap[$resourceKey] ?? null;

            // Always include storage_gb warnings (no feature required)
            if ($resourceKey === 'storage_gb') {
                $filtered[] = $warning;

                continue;
            }

            // If no features are enabled and this resource requires a feature, skip it
            if (empty($enabledFeatures) && $required !== null) {
                continue;
            }

            // If resource requires a feature, check if feature is enabled
            if ($required !== null) {
                $requiredFeatures = is_array($required) ? $required : [$required];
                $hasAny = false;

                foreach ($requiredFeatures as $featureKey) {
                    if (isset($enabledSet[$featureKey])) {
                        $hasAny = true;
                        break;
                    }
                }

                if (! $hasAny) {
                    continue;
                }
            }

            // If no feature required or feature is enabled, include it
            $filtered[] = $warning;
        }

        return $filtered;
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
     * Check if a subfeature can be used (maps to its own feature_key and requires parent).
     */
    public function canUseSubfeature(string $organizationId, string $featureKey, string $subfeatureKey): array
    {
        $access = $this->getFeatureAccessStatus($organizationId, $subfeatureKey);
        $access['base_feature'] = $this->normalizeFeatureKey($featureKey);
        $access['subfeature_key'] = $this->normalizeFeatureKey($subfeatureKey);

        return $access;
    }

    /**
     * Check usage limits via the central entitlement resolver.
     */
    public function checkLimit(string $organizationId, string $resourceKey): array
    {
        return $this->usageTrackingService->canCreate($organizationId, $resourceKey);
    }

    /**
     * Check subscription access level
     * CRITICAL: Maintenance overdue or unpaid license fee will block access
     */
    public function getAccessLevel(string $organizationId): string
    {
        $subscription = $this->subscriptionService->getCurrentSubscription($organizationId);

        if (! $subscription) {
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

        if (! $subscription) {
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
            if (! $subscription->relationLoaded('plan')) {
                $subscription->load('plan');
            }
        } catch (\Exception $e) {
            // If plan loading fails, continue without plan
            \Log::warning('Failed to load plan relationship in getSubscriptionStatus: '.$e->getMessage());
        }

        $plan = $subscription->plan;
        $accessLevel = $this->getAccessLevel($organizationId);

        // Build message based on status and payment issues
        $message = match ($subscription->status) {
            OrganizationSubscription::STATUS_TRIAL => "Trial period - {$subscription->trialDaysLeft()} days left",
            OrganizationSubscription::STATUS_ACTIVE => 'Active subscription',
            OrganizationSubscription::STATUS_PENDING_RENEWAL => 'Subscription expired - please renew',
            OrganizationSubscription::STATUS_GRACE_PERIOD => 'Grace period - please renew to continue',
            OrganizationSubscription::STATUS_READONLY => 'Read-only mode - please renew to regain full access',
            OrganizationSubscription::STATUS_EXPIRED => 'Subscription expired - please renew',
            OrganizationSubscription::STATUS_SUSPENDED => 'Account suspended: '.($subscription->suspension_reason ?? 'Contact support'),
            OrganizationSubscription::STATUS_CANCELLED => 'Subscription cancelled',
            default => 'Unknown status',
        };

        // Override message if payment issues exist (takes precedence)
        if ($subscription->shouldBeSuspendedForPayment()) {
            $reasons = [];

            if ($subscription->isMaintenanceOverdue()) {
                $daysOverdue = $subscription->daysMaintenanceOverdue();
                $reasons[] = "Maintenance fee overdue ({$daysOverdue} day(s))";
            }

            if ($subscription->isLicenseFeePending()) {
                $reasons[] = 'License fee not paid';
            }

            $message = 'Account suspended: '.implode(', ', $reasons).'. Please make payment to restore access.';
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
