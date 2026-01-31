<?php

namespace App\Http\Controllers;

use App\Models\DiscountCode;
use App\Models\FeatureDefinition;
use App\Models\LimitDefinition;
use App\Models\Organization;
use App\Models\OrganizationFeatureAddon;
use App\Models\OrganizationSubscription;
use App\Models\PaymentRecord;
use App\Models\RenewalRequest;
use App\Models\SubscriptionHistory;
use App\Models\SubscriptionPlan;
use App\Models\UsageSnapshot;
use App\Models\User;
use App\Models\SchoolBranding;
use App\Services\Subscription\FeatureGateService;
use Illuminate\Validation\ValidationException;
use App\Services\Subscription\SubscriptionService;
use Spatie\Permission\Models\Role;
use App\Services\Subscription\UsageTrackingService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class SubscriptionAdminController extends Controller
{
    public function __construct(
        private SubscriptionService $subscriptionService,
        private FeatureGateService $featureGateService,
        private UsageTrackingService $usageTrackingService
    ) {}

    /**
     * Check if user has subscription admin permission
     * This is a super-admin level permission for managing all subscriptions
     * CRITICAL: This is a GLOBAL permission (not organization-scoped)
     */
    private function checkSubscriptionAdminPermission(Request $request): bool
    {
        $user = $request->user();
        if (!$user) {
            return false;
        }

        try {
            // CRITICAL: Use platform org UUID as team context for global permissions
            // Global permissions are stored with platform org UUID (00000000-0000-0000-0000-000000000000)
            // in model_has_permissions, but the permission itself has organization_id = NULL
            $platformOrgId = '00000000-0000-0000-0000-000000000000';
            setPermissionsTeamId($platformOrgId);
            
            // Check for subscription.admin permission (global)
            return $user->hasPermissionTo('subscription.admin');
        } catch (\Exception $e) {
            \Log::warning("Permission check failed for subscription.admin: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Enforce subscription admin permission - abort if not authorized
     */
    private function enforceSubscriptionAdmin(Request $request): void
    {
        if (!$this->checkSubscriptionAdminPermission($request)) {
            abort(403, 'You do not have permission to access subscription administration');
        }
    }

    private function serializePlan(SubscriptionPlan $plan): array
    {
        $plan->loadMissing(['features', 'limits']);

        $enabledFeatures = $plan->features
            ->where('is_enabled', true)
            ->pluck('feature_key')
            ->values()
            ->all();

        $limits = $plan->limits->mapWithKeys(function ($limit) {
            return [$limit->resource_key => $limit->limit_value];
        })->toArray();

        return [
            'id' => $plan->id,
            'name' => $plan->name,
            'slug' => $plan->slug,
            'description' => $plan->description,
            // Legacy pricing fields (for backward compatibility)
            'price_yearly_afn' => $plan->price_yearly_afn,
            'price_yearly_usd' => $plan->price_yearly_usd,
            // New fee separation fields
            'billing_period' => $plan->billing_period ?? 'yearly',
            'billing_period_label' => $plan->getBillingPeriodLabel(),
            'billing_period_days' => $plan->getBillingPeriodDays(),
            'custom_billing_days' => $plan->custom_billing_days,
            'license_fee_afn' => $plan->license_fee_afn ?? 0,
            'license_fee_usd' => $plan->license_fee_usd ?? 0,
            'maintenance_fee_afn' => $plan->maintenance_fee_afn ?? $plan->price_yearly_afn ?? 0,
            'maintenance_fee_usd' => $plan->maintenance_fee_usd ?? $plan->price_yearly_usd ?? 0,
            'has_license_fee' => $plan->hasLicenseFee(),
            'has_maintenance_fee' => $plan->hasMaintenanceFee(),
            // Total fees (for display convenience)
            'total_fee_afn' => ($plan->license_fee_afn ?? 0) + ($plan->maintenance_fee_afn ?? $plan->price_yearly_afn ?? 0),
            'total_fee_usd' => ($plan->license_fee_usd ?? 0) + ($plan->maintenance_fee_usd ?? $plan->price_yearly_usd ?? 0),
            // Other plan fields
            'is_active' => $plan->is_active,
            'is_default' => $plan->is_default,
            'is_custom' => $plan->is_custom,
            'trial_days' => $plan->trial_days,
            'grace_period_days' => $plan->grace_period_days,
            'readonly_period_days' => $plan->readonly_period_days,
            'max_schools' => $plan->max_schools,
            'per_school_price_afn' => $plan->per_school_price_afn,
            'per_school_price_usd' => $plan->per_school_price_usd,
            'sort_order' => $plan->sort_order,
            'features' => $enabledFeatures,
            'limits' => $limits,
            'deleted_at' => $plan->deleted_at,
        ];
    }

    // =====================================================
    // DASHBOARD
    // =====================================================

    /**
     * Get subscription dashboard statistics
     */
    public function dashboard(Request $request)
    {
        $this->enforceSubscriptionAdmin($request);

        try {
            // Total organizations
            $totalOrgs = Organization::whereNull('deleted_at')->count();

            // Subscriptions by status
            $subscriptionsByStatus = OrganizationSubscription::whereNull('deleted_at')
                ->select('status', DB::raw('count(*) as count'))
                ->groupBy('status')
                ->get()
                ->pluck('count', 'status')
                ->toArray();

            // Subscriptions by plan (use left join to include subscriptions without plans)
            $subscriptionsByPlan = OrganizationSubscription::whereNull('organization_subscriptions.deleted_at')
                ->leftJoin('subscription_plans', 'organization_subscriptions.plan_id', '=', 'subscription_plans.id')
                ->whereNull('subscription_plans.deleted_at')
                ->select(DB::raw('COALESCE(subscription_plans.name, \'No Plan\') as name'), DB::raw('count(*) as count'))
                ->groupBy(DB::raw('COALESCE(subscription_plans.name, \'No Plan\')'))
                ->get()
                ->pluck('count', 'name')
                ->toArray();

            // Revenue this year (only confirmed payments with confirmed_at date)
            $revenueThisYear = PaymentRecord::where('status', PaymentRecord::STATUS_CONFIRMED)
                ->whereNotNull('confirmed_at')
                ->whereYear('confirmed_at', now()->year)
                ->select('currency', DB::raw('sum(COALESCE(amount, 0)) as total'))
                ->groupBy('currency')
                ->get()
                ->pluck('total', 'currency')
                ->toArray();

            // Ensure default values for currencies
            if (!isset($revenueThisYear['AFN'])) {
                $revenueThisYear['AFN'] = 0;
            }
            if (!isset($revenueThisYear['USD'])) {
                $revenueThisYear['USD'] = 0;
            }

            // Revenue breakdown by payment type this year
            $revenueByType = PaymentRecord::where('status', PaymentRecord::STATUS_CONFIRMED)
                ->whereNotNull('confirmed_at')
                ->whereYear('confirmed_at', now()->year)
                ->select(
                    'payment_type',
                    'currency',
                    DB::raw('sum(COALESCE(amount, 0)) as total')
                )
                ->groupBy('payment_type', 'currency')
                ->get()
                ->groupBy('payment_type')
                ->map(function ($group) {
                    return $group->pluck('total', 'currency')->toArray();
                })
                ->toArray();

            // Ensure all payment types have default values
            $paymentTypes = [PaymentRecord::TYPE_LICENSE, PaymentRecord::TYPE_MAINTENANCE, PaymentRecord::TYPE_RENEWAL];
            foreach ($paymentTypes as $type) {
                if (!isset($revenueByType[$type])) {
                    $revenueByType[$type] = ['AFN' => 0, 'USD' => 0];
                } else {
                    if (!isset($revenueByType[$type]['AFN'])) {
                        $revenueByType[$type]['AFN'] = 0;
                    }
                    if (!isset($revenueByType[$type]['USD'])) {
                        $revenueByType[$type]['USD'] = 0;
                    }
                }
            }

            // Pending payments
            $pendingPayments = PaymentRecord::pending()->count();

            // Pending renewal requests
            $pendingRenewals = RenewalRequest::pending()->count();

            // Expiring soon (next 30 days)
            $expiringSoon = OrganizationSubscription::whereNull('deleted_at')
                ->whereIn('status', [
                    OrganizationSubscription::STATUS_TRIAL,
                    OrganizationSubscription::STATUS_ACTIVE,
                ])
                ->whereNotNull('expires_at')
                ->where('expires_at', '<=', Carbon::now()->addDays(30))
                ->where('expires_at', '>', Carbon::now())
                ->count();

            // Recently expired
            $recentlyExpired = OrganizationSubscription::whereNull('deleted_at')
                ->whereIn('status', [
                    OrganizationSubscription::STATUS_GRACE_PERIOD,
                    OrganizationSubscription::STATUS_READONLY,
                    OrganizationSubscription::STATUS_EXPIRED,
                ])
                ->count();

            // Total schools across all organizations
            $totalSchools = DB::connection('pgsql')
                ->table('school_branding')
                ->whereNull('deleted_at')
                ->count();

            // Total students across all organizations
            $totalStudents = DB::connection('pgsql')
                ->table('students')
                ->whereNull('deleted_at')
                ->count();

            return response()->json([
                'data' => [
                    'total_organizations' => $totalOrgs,
                    'total_schools' => $totalSchools,
                    'total_students' => $totalStudents,
                    'subscriptions_by_status' => $subscriptionsByStatus,
                    'subscriptions_by_plan' => $subscriptionsByPlan,
                    'revenue_this_year' => $revenueThisYear,
                    'revenue_by_type' => $revenueByType,
                    'pending_payments' => $pendingPayments,
                    'pending_renewals' => $pendingRenewals,
                    'expiring_soon' => $expiringSoon,
                    'recently_expired' => $recentlyExpired,
                ],
            ]);
        } catch (\Exception $e) {
            \Log::error('Subscription dashboard error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'error' => 'Failed to load dashboard data',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    // =====================================================
    // PLANS MANAGEMENT
    // =====================================================

    /**
     * List all plans (including inactive)
     */
    public function listPlans(Request $request)
    {
        $this->enforceSubscriptionAdmin($request);

        $plans = SubscriptionPlan::withTrashed()
            ->with(['features', 'limits'])
            ->withCount('subscriptions')
            ->orderBy('sort_order')
            ->get();

        return response()->json([
            'data' => $plans->map(function ($plan) {
                $data = $this->serializePlan($plan);
                $data['features_count'] = count($data['features']);
                $data['subscriptions_count'] = $plan->subscriptions_count ?? 0;
                return $data;
            }),
        ]);
    }

    /**
     * Create a new plan
     */
    public function createPlan(Request $request)
    {
        $this->enforceSubscriptionAdmin($request);

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:100',
            'slug' => 'required|string|max:50|unique:subscription_plans,slug',
            'description' => 'nullable|string',
            // Legacy pricing (still required for backward compatibility)
            'price_yearly_afn' => 'required|numeric|min:0',
            'price_yearly_usd' => 'required|numeric|min:0',
            // New fee separation fields
            'billing_period' => 'nullable|in:monthly,quarterly,yearly,custom',
            'custom_billing_days' => 'nullable|integer|min:1|max:730',
            'license_fee_afn' => 'nullable|numeric|min:0',
            'license_fee_usd' => 'nullable|numeric|min:0',
            'maintenance_fee_afn' => 'nullable|numeric|min:0',
            'maintenance_fee_usd' => 'nullable|numeric|min:0',
            // Other plan fields
            'trial_days' => 'integer|min:0',
            'grace_period_days' => 'integer|min:0',
            'readonly_period_days' => 'integer|min:0',
            'max_schools' => 'integer|min:1',
            'per_school_price_afn' => 'numeric|min:0',
            'per_school_price_usd' => 'numeric|min:0',
            'sort_order' => 'integer|min:0',
            'features' => 'array',
            'limits' => 'array',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 422);
        }

        DB::beginTransaction();
        try {
            $plan = SubscriptionPlan::create([
                'name' => $request->name,
                'slug' => $request->slug,
                'description' => $request->description,
                'price_yearly_afn' => $request->price_yearly_afn,
                'price_yearly_usd' => $request->price_yearly_usd,
                // New fee separation fields
                'billing_period' => $request->billing_period ?? 'yearly',
                'custom_billing_days' => $request->custom_billing_days,
                'license_fee_afn' => $request->license_fee_afn ?? 0,
                'license_fee_usd' => $request->license_fee_usd ?? 0,
                // If maintenance fees not provided, use legacy price_yearly as maintenance fee
                'maintenance_fee_afn' => $request->maintenance_fee_afn ?? $request->price_yearly_afn,
                'maintenance_fee_usd' => $request->maintenance_fee_usd ?? $request->price_yearly_usd,
                // Other plan fields
                'trial_days' => $request->trial_days ?? 0,
                'grace_period_days' => $request->grace_period_days ?? 14,
                'readonly_period_days' => $request->readonly_period_days ?? 60,
                'max_schools' => $request->max_schools ?? 1,
                'per_school_price_afn' => $request->per_school_price_afn ?? 0,
                'per_school_price_usd' => $request->per_school_price_usd ?? 0,
                'sort_order' => $request->sort_order ?? 0,
            ]);

            // Add features
            if ($request->has('features')) {
                foreach ($request->features as $featureKey => $isEnabled) {
                    $plan->features()->create([
                        'feature_key' => $featureKey,
                        'is_enabled' => (bool) $isEnabled,
                    ]);
                }
            }

            // Add limits
            if ($request->has('limits')) {
                foreach ($request->limits as $resourceKey => $limitValue) {
                    $plan->limits()->create([
                        'resource_key' => $resourceKey,
                        'limit_value' => (int) $limitValue,
                    ]);
                }
            }

            DB::commit();

            Cache::forget('subscription:plans:public:v1');

            return response()->json([
                'data' => $this->serializePlan($plan->fresh(['features', 'limits'])),
                'message' => 'Plan created successfully',
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Update a plan
     */
    public function updatePlan(Request $request, string $id)
    {
        $this->enforceSubscriptionAdmin($request);

        $plan = SubscriptionPlan::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'string|max:100',
            'description' => 'nullable|string',
            // Legacy pricing
            'price_yearly_afn' => 'numeric|min:0',
            'price_yearly_usd' => 'numeric|min:0',
            // New fee separation fields
            'billing_period' => 'nullable|in:monthly,quarterly,yearly,custom',
            'custom_billing_days' => 'nullable|integer|min:1|max:730',
            'license_fee_afn' => 'nullable|numeric|min:0',
            'license_fee_usd' => 'nullable|numeric|min:0',
            'maintenance_fee_afn' => 'nullable|numeric|min:0',
            'maintenance_fee_usd' => 'nullable|numeric|min:0',
            // Other plan fields
            'is_active' => 'boolean',
            'trial_days' => 'integer|min:0',
            'grace_period_days' => 'integer|min:0',
            'readonly_period_days' => 'integer|min:0',
            'max_schools' => 'integer|min:1',
            'per_school_price_afn' => 'numeric|min:0',
            'per_school_price_usd' => 'numeric|min:0',
            'sort_order' => 'integer|min:0',
            'features' => 'array',
            'limits' => 'array',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 422);
        }

        DB::beginTransaction();
        try {
            $plan->update($request->only([
                'name', 'description', 'price_yearly_afn', 'price_yearly_usd',
                // New fee separation fields
                'billing_period', 'custom_billing_days',
                'license_fee_afn', 'license_fee_usd',
                'maintenance_fee_afn', 'maintenance_fee_usd',
                // Other plan fields
                'is_active', 'trial_days', 'grace_period_days', 'readonly_period_days',
                'max_schools', 'per_school_price_afn', 'per_school_price_usd', 'sort_order',
            ]));

            // Update features - ensure disabled features are explicitly set to false
            if ($request->has('features')) {
                $requestedFeatures = $request->features;
                
                // Get all feature definitions that exist for this plan (or all if updating)
                $existingPlanFeatures = $plan->features()->pluck('feature_key')->toArray();
                
                // Update/create features from request
                foreach ($requestedFeatures as $featureKey => $isEnabled) {
                    $plan->features()->updateOrCreate(
                        ['feature_key' => $featureKey],
                        ['is_enabled' => (bool) $isEnabled]
                    );
                }
                
                // CRITICAL: For features that exist in the plan but are NOT in the request,
                // explicitly set them to disabled (false). This handles the case where
                // a feature was previously enabled but the frontend didn't include it in the update.
                // Note: We only disable existing plan features, not all feature definitions,
                // to avoid auto-disabling newly added feature definitions.
                foreach ($existingPlanFeatures as $featureKey) {
                    if (!isset($requestedFeatures[$featureKey])) {
                        // Feature exists in plan but not in request - explicitly disable it
                        $plan->features()->where('feature_key', $featureKey)
                            ->update(['is_enabled' => false]);
                    }
                }
            }

            // Update limits
            if ($request->has('limits')) {
                foreach ($request->limits as $resourceKey => $limitValue) {
                    $plan->limits()->updateOrCreate(
                        ['resource_key' => $resourceKey],
                        ['limit_value' => (int) $limitValue]
                    );
                }
            }

            DB::commit();

            Cache::forget('subscription:plans:public:v1');

            return response()->json([
                'data' => $this->serializePlan($plan->fresh(['features', 'limits'])),
                'message' => 'Plan updated successfully',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    // =====================================================
    // ORGANIZATION SUBSCRIPTIONS
    // =====================================================

    /**
     * List all organization subscriptions
     */
    public function listSubscriptions(Request $request)
    {
        $this->enforceSubscriptionAdmin($request);

        $query = OrganizationSubscription::with(['organization', 'plan'])
            ->whereNull('deleted_at');

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by plan
        if ($request->has('plan_id')) {
            $query->where('plan_id', $request->plan_id);
        }

        // Filter expiring soon
        if ($request->has('expiring_days')) {
            $query->where('expires_at', '<=', Carbon::now()->addDays($request->expiring_days))
                ->where('expires_at', '>', Carbon::now());
        }

        $subscriptions = $query->orderBy('created_at', 'desc')
            ->paginate($request->per_page ?? 20);

        return response()->json($subscriptions);
    }

    /**
     * Get a specific organization's subscription details
     */
    public function getOrganizationSubscription(Request $request, string $organizationId)
    {
        $this->enforceSubscriptionAdmin($request);

        $subscription = $this->subscriptionService->getCurrentSubscription($organizationId);
        $status = $this->featureGateService->getSubscriptionStatus($organizationId);
        $usage = $this->usageTrackingService->getAllUsage($organizationId);
        $usage = $this->featureGateService->filterUsageByFeatures($organizationId, $usage);
        $features = $this->featureGateService->getAllFeaturesStatus($organizationId);

        return response()->json([
            'data' => [
                'subscription' => $subscription?->load(['plan', 'payments']),
                'status' => $status,
                'usage' => $usage,
                'features' => $features,
            ],
        ]);
    }

    /**
     * Manually activate a subscription for an organization
     */
    public function activateSubscription(Request $request, string $organizationId)
    {
        $this->enforceSubscriptionAdmin($request);

        $validator = Validator::make($request->all(), [
            'plan_id' => 'required|uuid|exists:subscription_plans,id',
            'currency' => 'required|in:AFN,USD',
            'amount_paid' => 'required|numeric|min:0',
            'additional_schools' => 'nullable|integer|min:0',
            'notes' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 422);
        }

        $user = $request->user();

        try {
            $subscription = $this->subscriptionService->activateSubscription(
                $organizationId,
                $request->plan_id,
                $request->currency,
                $request->amount_paid,
                $request->additional_schools ?? 0,
                $user->id,
                $request->notes
            );

            return response()->json([
                'data' => $subscription->load('plan'),
                'message' => 'Subscription activated successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    /**
     * Suspend an organization's subscription
     */
    public function suspendSubscription(Request $request, string $organizationId)
    {
        $this->enforceSubscriptionAdmin($request);

        $validator = Validator::make($request->all(), [
            'reason' => 'required|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 422);
        }

        $user = $request->user();

        try {
            $subscription = $this->subscriptionService->suspendSubscription(
                $organizationId,
                $request->reason,
                $user->id
            );

            return response()->json([
                'data' => $subscription,
                'message' => 'Subscription suspended',
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    /**
     * Add a limit override for an organization
     */
    public function addLimitOverride(Request $request, string $organizationId)
    {
        $this->enforceSubscriptionAdmin($request);

        $validator = Validator::make($request->all(), [
            'resource_key' => 'required|string|max:100',
            'limit_value' => 'required|integer|min:-1',
            'reason' => 'required|string|max:500',
            'expires_at' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 422);
        }

        $user = $request->user();

        try {
            $override = $this->subscriptionService->addLimitOverride(
                $organizationId,
                $request->resource_key,
                $request->limit_value,
                $request->reason,
                $user->id,
                $request->expires_at ? Carbon::parse($request->expires_at) : null
            );

            return response()->json([
                'data' => $override,
                'message' => 'Limit override added',
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    /**
     * Add a feature addon for an organization
     */
    public function addFeatureAddon(Request $request, string $organizationId)
    {
        $this->enforceSubscriptionAdmin($request);

        $validator = Validator::make($request->all(), [
            'feature_key' => 'required|string|max:100',
            'price_paid' => 'required|numeric|min:0',
            'currency' => 'required|in:AFN,USD',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 422);
        }

        $user = $request->user();

        try {
            $addon = $this->subscriptionService->addFeatureAddon(
                $organizationId,
                $request->feature_key,
                $request->price_paid,
                $request->currency,
                $user->id
            );

            return response()->json([
                'data' => $addon,
                'message' => 'Feature addon added',
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    /**
     * Toggle a feature for an organization (enable/disable)
     */
    public function toggleFeature(Request $request, string $organizationId, string $featureKey)
    {
        $this->enforceSubscriptionAdmin($request);

        $user = $request->user();
        if (!$user || !$user->id) {
            return response()->json(['error' => 'User not authenticated'], 401);
        }

        // Validate feature exists
        $featureDef = FeatureDefinition::where('feature_key', $featureKey)
            ->where('is_active', true)
            ->first();

        if (!$featureDef) {
            return response()->json(['error' => 'Feature not found or inactive'], 404);
        }

        $subscription = $this->subscriptionService->getCurrentSubscription($organizationId);
        $expiresAt = $subscription?->expires_at;

        // Check if feature is currently enabled via addon (we only toggle addons)
        $currentAddon = OrganizationFeatureAddon::where('organization_id', $organizationId)
            ->where('feature_key', $featureKey)
            ->whereNull('deleted_at')
            ->first();

        $isCurrentlyEnabled = $currentAddon && $currentAddon->is_enabled && 
            (!$currentAddon->expires_at || $currentAddon->expires_at->isFuture());

        if ($isCurrentlyEnabled) {
            // Disable the feature
            if ($currentAddon) {
                $currentAddon->update(['is_enabled' => false]);
            }

            SubscriptionHistory::log(
                $organizationId,
                SubscriptionHistory::ACTION_ADDON_REMOVED,
                $subscription?->id,
                null,
                null,
                null,
                null,
                $user->id,
                "Feature disabled: {$featureKey}",
                ['feature_key' => $featureKey]
            );

            Cache::forget("subscription:enabled-features:v1:{$organizationId}");

            return response()->json([
                'data' => $currentAddon->fresh(),
                'message' => 'Feature disabled',
            ]);
        } else {
            // Enable the feature
            $addon = OrganizationFeatureAddon::updateOrCreate(
                [
                    'organization_id' => $organizationId,
                    'feature_key' => $featureKey,
                ],
                [
                    'is_enabled' => true,
                    'started_at' => now(),
                    'expires_at' => $expiresAt,
                    'price_paid' => 0, // Free admin override
                    'currency' => 'AFN',
                ]
            );

            SubscriptionHistory::log(
                $organizationId,
                SubscriptionHistory::ACTION_ADDON_ADDED,
                $subscription?->id,
                null,
                null,
                null,
                null,
                $user->id,
                "Feature enabled: {$featureKey}",
                ['feature_key' => $featureKey]
            );

            Cache::forget("subscription:enabled-features:v1:{$organizationId}");

            return response()->json([
                'data' => $addon,
                'message' => 'Feature enabled',
            ]);
        }
    }

    // =====================================================
    // PAYMENTS & RENEWALS
    // =====================================================

    /**
     * List pending payments
     */
    public function listPendingPayments(Request $request)
    {
        $this->enforceSubscriptionAdmin($request);

        $payments = PaymentRecord::pending()
            ->with(['organization', 'subscription.plan'])
            ->orderBy('created_at', 'asc')
            ->paginate($request->per_page ?? 20);

        return response()->json($payments);
    }

    /**
     * Confirm a payment
     */
    public function confirmPayment(Request $request, string $paymentId)
    {
        $this->enforceSubscriptionAdmin($request);

        $user = $request->user();

        try {
            $result = DB::transaction(function () use ($paymentId, $user) {
                /** @var PaymentRecord $payment */
                $payment = PaymentRecord::where('id', $paymentId)->lockForUpdate()->firstOrFail();

                // Idempotent: already processed
                if (!$payment->isPending()) {
                    return [
                        'payment' => $payment->fresh(),
                        'message' => 'Payment already processed',
                    ];
                }

                // Prefer an explicitly linked renewal request
                $renewalRequest = RenewalRequest::where('payment_record_id', $payment->id)
                    ->lockForUpdate()
                    ->first();

                // Fallback: if exactly one pending request exists for this org, use it
                if (!$renewalRequest) {
                    $pendingForOrg = RenewalRequest::where('organization_id', $payment->organization_id)
                        ->pending()
                        ->lockForUpdate()
                        ->get();

                    if ($pendingForOrg->count() === 1) {
                        $renewalRequest = $pendingForOrg->first();
                    } elseif ($pendingForOrg->count() > 1) {
                        throw new \Exception('Multiple pending renewal requests exist. Please approve from the renewal request screen.');
                    }
                }

                if ($renewalRequest) {
                    // Approve the renewal request (service is idempotent + transactional)
                    $this->subscriptionService->approveRenewalRequest(
                        $renewalRequest->id,
                        $paymentId,
                        $user->id
                    );
                } else {
                    // Just confirm the payment
                    $payment->update([
                        'status' => PaymentRecord::STATUS_CONFIRMED,
                        'confirmed_by' => $user->id,
                        'confirmed_at' => now(),
                    ]);
                }

                return [
                    'payment' => $payment->fresh(),
                    'message' => 'Payment confirmed successfully',
                ];
            }, 3);

            return response()->json([
                'data' => $result['payment'],
                'message' => $result['message'],
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to confirm payment: ' . $e->getMessage(), [
                'payment_id' => $paymentId,
                'user_id' => $user?->id,
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    /**
     * Reject a payment
     */
    public function rejectPayment(Request $request, string $paymentId)
    {
        $this->enforceSubscriptionAdmin($request);

        $validator = Validator::make($request->all(), [
            'reason' => 'required|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 422);
        }

        $payment = PaymentRecord::findOrFail($paymentId);
        $user = $request->user();

        if (!$payment->isPending()) {
            return response()->json(['error' => 'Payment is not pending'], 400);
        }

        $payment->update([
            'status' => PaymentRecord::STATUS_REJECTED,
            'confirmed_by' => $user->id,
            'confirmed_at' => now(),
            'notes' => ($payment->notes ? $payment->notes . "\n" : '') . "Rejected: " . $request->reason,
        ]);

        // Reject associated renewal request
        $renewalRequest = RenewalRequest::where('organization_id', $payment->organization_id)
            ->pending()
            ->first();

        if ($renewalRequest) {
            $this->subscriptionService->rejectRenewalRequest(
                $renewalRequest->id,
                $request->reason,
                $user->id
            );
        }

        return response()->json([
            'data' => $payment->fresh(),
            'message' => 'Payment rejected',
        ]);
    }

    /**
     * List pending renewal requests
     */
    public function listPendingRenewals(Request $request)
    {
        $this->enforceSubscriptionAdmin($request);

        $renewals = RenewalRequest::pending()
            ->with([
                'organization', 
                'subscription' => function($query) {
                    $query->with('plan');
                },
                'requestedPlan', 
                'paymentRecord'
            ])
            ->orderBy('requested_at', 'asc')
            ->paginate($request->per_page ?? 20);

        // If subscription is missing for some renewals, load current subscriptions in bulk (avoid N+1)
        $collection = $renewals->getCollection();
        $missingOrgIds = $collection
            ->filter(fn ($r) => !$r->subscription && !empty($r->organization_id))
            ->pluck('organization_id')
            ->unique()
            ->values();

        if ($missingOrgIds->isNotEmpty()) {
            $subs = OrganizationSubscription::with('plan')
                ->whereIn('organization_id', $missingOrgIds->all())
                ->whereNull('deleted_at')
                ->orderBy('created_at', 'desc')
                ->get();

            $currentByOrg = [];
            foreach ($subs as $sub) {
                if (!isset($currentByOrg[$sub->organization_id])) {
                    $currentByOrg[$sub->organization_id] = $sub;
                }
            }

            $collection->transform(function ($renewal) use ($currentByOrg) {
                if ($renewal->subscription && !$renewal->subscription->relationLoaded('plan')) {
                    $renewal->subscription->load('plan');
                }

                if (!$renewal->subscription && $renewal->organization_id && isset($currentByOrg[$renewal->organization_id])) {
                    $renewal->setRelation('subscription', $currentByOrg[$renewal->organization_id]);
                }

                return $renewal;
            });
        }

        return response()->json($renewals);
    }

    /**
     * Get a specific renewal request
     */
    public function getRenewal(Request $request, string $renewalId)
    {
        $this->enforceSubscriptionAdmin($request);

        $renewal = RenewalRequest::with(['organization', 'subscription.plan', 'requestedPlan', 'paymentRecord'])
            ->findOrFail($renewalId);

        return response()->json([
            'data' => $renewal,
        ]);
    }

    /**
     * Approve a renewal request
     */
    public function approveRenewal(Request $request, string $renewalId)
    {
        $this->enforceSubscriptionAdmin($request);

        $user = $request->user();
        if (!$user || !$user->id) {
            return response()->json(['error' => 'User not authenticated'], 401);
        }

        $renewal = RenewalRequest::with(['organization', 'subscription.plan', 'requestedPlan', 'paymentRecord', 'discountCode'])
            ->findOrFail($renewalId);

        if ($renewal->status !== 'pending') {
            return response()->json(['error' => 'Renewal request is not pending'], 400);
        }

        $paymentRecordId = $renewal->payment_record_id;

        // If no payment record exists, create one from request data
        if (!$paymentRecordId) {
            $validator = Validator::make($request->all(), [
                'amount' => 'required|numeric|min:0',
                'currency' => 'required|in:AFN,USD',
                'payment_method' => 'required|in:bank_transfer,cash,check,mobile_money,other',
                'payment_reference' => 'nullable|string|max:255',
                'payment_date' => 'required|date',
                'notes' => 'nullable|string|max:1000',
            ]);

            if ($validator->fails()) {
                return response()->json(['error' => $validator->errors()->first()], 422);
            }

            // Calculate price with discount if applicable
            $priceInfo = $this->subscriptionService->calculatePrice(
                $renewal->requested_plan_id,
                $renewal->additional_schools,
                $renewal->discountCode?->code,
                $request->currency,
                $renewal->organization_id
            );

            $expectedTotal = (float) ($priceInfo['total'] ?? 0);
            $submittedAmount = (float) $request->amount;
            $tolerance = 0.01;

            if (abs($submittedAmount - $expectedTotal) > $tolerance) {
                return response()->json([
                    'error' => "Payment amount does not match expected total. Expected {$expectedTotal} {$request->currency}.",
                ], 422);
            }

            $subscription = $this->subscriptionService->getCurrentSubscription($renewal->organization_id);
            $plan = SubscriptionPlan::findOrFail($renewal->requested_plan_id);
            if (!$plan->is_active) {
                return response()->json(['error' => 'Selected plan is not active'], 422);
            }

            $billingDays = $plan->getBillingPeriodDays();
            $periodStart = Carbon::parse($request->payment_date)->toDateString();
            $periodEnd = Carbon::parse($request->payment_date)->addDays($billingDays)->toDateString();

            $paymentRecord = PaymentRecord::create([
                'organization_id' => $renewal->organization_id,
                'subscription_id' => $subscription?->id,
                'amount' => $submittedAmount,
                'currency' => $request->currency,
                'payment_method' => $request->payment_method,
                'payment_reference' => $request->payment_reference,
                'payment_date' => $request->payment_date,
                'period_start' => $periodStart,
                'period_end' => $periodEnd,
                'status' => PaymentRecord::STATUS_CONFIRMED, // Auto-confirm when created by admin
                'confirmed_by' => $user->id,
                'confirmed_at' => now(),
                'discount_code_id' => $renewal->discount_code_id,
                'discount_amount' => $priceInfo['discount_amount'],
                'notes' => $request->notes,
                // New fee separation fields
                'payment_type' => PaymentRecord::TYPE_RENEWAL,
                'billing_period' => $plan->billing_period ?? PaymentRecord::BILLING_YEARLY,
                'is_recurring' => true,
            ]);

            $paymentRecordId = $paymentRecord->id;
        }

        try {
            $subscription = $this->subscriptionService->approveRenewalRequest(
                $renewalId,
                $paymentRecordId,
                $user->id
            );

            return response()->json([
                'data' => $renewal->fresh(['organization', 'subscription.plan', 'requestedPlan', 'paymentRecord']),
                'message' => 'Renewal request approved successfully',
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to approve renewal request: ' . $e->getMessage(), [
                'renewal_id' => $renewalId,
                'user_id' => $user->id,
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    /**
     * Reject a renewal request
     */
    public function rejectRenewal(Request $request, string $renewalId)
    {
        $this->enforceSubscriptionAdmin($request);

        $user = $request->user();
        if (!$user || !$user->id) {
            return response()->json(['error' => 'User not authenticated'], 401);
        }

        $validator = Validator::make($request->all(), [
            'reason' => 'required|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 422);
        }

        $renewal = RenewalRequest::with(['organization', 'subscription.plan', 'requestedPlan', 'paymentRecord'])
            ->findOrFail($renewalId);

        if ($renewal->status !== 'pending') {
            return response()->json(['error' => 'Renewal request is not pending'], 400);
        }

        try {
            $this->subscriptionService->rejectRenewalRequest(
                $renewalId,
                $request->reason,
                $user->id
            );

            return response()->json([
                'data' => $renewal->fresh(['organization', 'subscription.plan', 'requestedPlan', 'paymentRecord']),
                'message' => 'Renewal request rejected',
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to reject renewal request: ' . $e->getMessage(), [
                'renewal_id' => $renewalId,
                'user_id' => $user->id,
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    /**
     * List all organizations (for subscription admin)
     */
    public function listOrganizations(Request $request)
    {
        $this->enforceSubscriptionAdmin($request);

        $organizations = Organization::whereNull('deleted_at')
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => $organizations,
        ]);
    }

    /**
     * List all platform admin users (users with subscription.admin permission)
     */
    public function listPlatformUsers(Request $request)
    {
        $this->enforceSubscriptionAdmin($request);

        try {
            // Find the subscription.admin permission (global, organization_id = NULL)
            $permission = DB::table('permissions')
                ->where('name', 'subscription.admin')
                ->whereNull('organization_id')
                ->first();

            if (!$permission) {
                return response()->json([
                    'data' => [],
                ]);
            }

            // Find all users with this permission
            $userIds = DB::table('model_has_permissions')
                ->where('permission_id', $permission->id)
                ->where('model_type', 'App\\Models\\User')
                ->pluck('model_id')
                ->toArray();

            if (empty($userIds)) {
                return response()->json([
                    'data' => [],
                ]);
            }

            // Load users + profiles in bulk (avoid N+1)
            $usersById = User::whereIn('id', $userIds)->get()->keyBy('id');
            $profilesById = DB::table('profiles')
                ->whereIn('id', $userIds)
                ->whereNull('deleted_at')
                ->get()
                ->keyBy('id');

            $users = collect($userIds)->map(function ($userId) use ($usersById, $profilesById) {
                $user = $usersById->get($userId);
                $profile = $profilesById->get($userId);

                if (!$user || !$profile) {
                    return null;
                }

                return [
                    'id' => $user->id,
                    'email' => $user->email,
                    'full_name' => $profile->full_name ?? null,
                    'phone' => $profile->phone ?? null,
                    'is_active' => $profile->is_active !== false,
                    'has_platform_admin' => true,
                    'created_at' => $profile->created_at ?? $user->created_at ?? now(),
                    'updated_at' => $profile->updated_at ?? $user->updated_at ?? now(),
                ];
            })->filter()->sortByDesc('created_at')->values();

            return response()->json([
                'data' => $users,
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to list platform users: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['error' => 'Failed to fetch platform users'], 500);
        }
    }

    /**
     * Create a platform admin user
     */
    public function createPlatformUser(Request $request)
    {
        $this->enforceSubscriptionAdmin($request);

        try {
            $request->validate([
                'email' => 'required|email|unique:users,email|max:255',
                'password' => 'required|string|min:8',
                'full_name' => 'required|string|max:255',
                'phone' => 'nullable|string|max:20',
            ]);
            // Create user in users table
            $userId = (string) Str::uuid();
            $encryptedPassword = Hash::make($request->password);

            DB::table('users')->insert([
                'id' => $userId,
                'email' => $request->email,
                'encrypted_password' => $encryptedPassword,
                'email_confirmed_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Create a test organization for the platform admin user
            // Using Organization::create() so OrganizationObserver fires and creates roles/permissions
            $organizationName = $request->full_name . "'s Test Organization";
            
            // Generate unique slug (max 100 chars, ensure uniqueness)
            $baseSlug = 'test-' . strtolower(preg_replace('/[^a-zA-Z0-9-]/', '-', substr($request->full_name, 0, 30)));
            $baseSlug = preg_replace('/-+/', '-', $baseSlug); // Remove multiple dashes
            $baseSlug = trim($baseSlug, '-'); // Remove leading/trailing dashes
            $uniqueId = substr((string) Str::uuid(), 0, 8);
            $organizationSlug = substr($baseSlug . '-' . $uniqueId, 0, 100); // Ensure max 100 chars
            
            // Ensure slug is unique
            $counter = 1;
            $originalSlug = $organizationSlug;
            while (DB::table('organizations')->where('slug', $organizationSlug)->exists()) {
                $organizationSlug = substr($originalSlug . '-' . $counter, 0, 100);
                $counter++;
            }
            
            $organization = Organization::create([
                'name' => $organizationName,
                'slug' => $organizationSlug,
                'settings' => [],
            ]);
            $organizationId = $organization->id;

            // Create default school for the organization
            $school = SchoolBranding::create([
                'organization_id' => $organizationId,
                'school_name' => 'Main School',
                'is_active' => true,
                'primary_color' => '#1e40af', // Default blue
                'secondary_color' => '#64748b', // Default slate
                'accent_color' => '#0ea5e9', // Default sky
                'font_family' => 'Inter',
                'report_font_size' => 12,
                'table_alternating_colors' => true,
                'show_page_numbers' => true,
                'show_generation_date' => true,
                'calendar_preference' => 'gregorian',
            ]);
            $schoolId = $school->id;

            // Create profile with organization_id (so they can test app functionality)
            DB::table('profiles')->insert([
                'id' => $userId,
                'full_name' => $request->full_name,
                'phone' => $request->phone,
                'organization_id' => $organizationId, // Assign to test organization
                'default_school_id' => $schoolId,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Create trial subscription for the organization
            $subscriptionService = app(SubscriptionService::class);
            $subscriptionService->createTrialSubscription($organizationId, $userId);

            // Assign admin role to user for the organization (gives all permissions)
            setPermissionsTeamId($organizationId);
            $userModel = User::find($userId);
            
            // Find or create admin role for this organization
            $adminRole = Role::firstOrCreate(
                [
                    'name' => 'admin',
                    'organization_id' => $organizationId,
                    'guard_name' => 'web',
                ],
                [
                    'description' => 'Administrator - Full access to organization resources'
                ]
            );

            // Assign role to user
            setPermissionsTeamId($organizationId);
            $userModel->assignRole($adminRole);
            
            // CRITICAL: Assign tours to user (especially initialSetup tour)
            // Do this AFTER role assignment so user has permissions
            try {
                $tourService = app(\App\Services\TourAssignmentService::class);
                
                // Always assign initialSetup tour first (no permissions required)
                $tourService->assignInitialSetupTour($userId);
                
                // Then assign other tours based on permissions
                if ($userModel) {
                    // Set organization context for permission checks
                    $userModel->setPermissionsTeamId($organizationId);
                    
                    // Get user's permissions (from roles and direct assignments)
                    $userPermissions = $userModel->getAllPermissions()->pluck('name')->toArray();
                    
                    // Assign other tours based on permissions
                    $assignedTours = $tourService->assignToursForUser($userId, $userPermissions);
                    
                    if (!empty($assignedTours) && config('app.debug')) {
                        Log::info("Assigned tours to platform user {$userId}: " . implode(', ', $assignedTours));
                    }
                }
            } catch (\Exception $e) {
                // Don't fail user creation if tour assignment fails
                Log::warning("Failed to assign tours to platform user {$userId}: " . $e->getMessage());
            }

            // Ensure organization_id is set in model_has_roles
            $roleAssignment = DB::table('model_has_roles')
                ->where('model_id', $userId)
                ->where('model_type', 'App\\Models\\User')
                ->where('role_id', $adminRole->id)
                ->first();
            
            if ($roleAssignment && !$roleAssignment->organization_id) {
                DB::table('model_has_roles')
                    ->where('model_id', $userId)
                    ->where('model_type', 'App\\Models\\User')
                    ->where('role_id', $adminRole->id)
                    ->update(['organization_id' => $organizationId]);
            }

            // Get the global subscription.admin permission
            $permission = DB::table('permissions')
                ->where('name', 'subscription.admin')
                ->whereNull('organization_id')
                ->first();

            if ($permission) {
                // Special UUID for "platform" organization (all zeros) - represents global permissions
                // This is used in model_has_permissions to work around the primary key constraint
                // The actual permission has organization_id = NULL (global)
                $platformOrgId = '00000000-0000-0000-0000-000000000000';

                // Check if platform organization exists, create if not
                $platformOrg = DB::table('organizations')
                    ->where('id', $platformOrgId)
                    ->first();

                if (!$platformOrg) {
                    // Create platform organization (special system organization for global permissions)
                    DB::table('organizations')->insert([
                        'id' => $platformOrgId,
                        'name' => 'Platform (Global Permissions)',
                        'slug' => 'platform-global',
                        'settings' => json_encode([]),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                // Assign permission using platform organization UUID
                // This works around the primary key constraint while still representing a global permission
                DB::table('model_has_permissions')->insert([
                    'permission_id' => $permission->id,
                    'model_type' => 'App\\Models\\User',
                    'model_id' => $userId,
                    'organization_id' => $platformOrgId, // Use platform org UUID (represents global)
                ]);
            }

            // Get created user
            $user = User::find($userId);
            $profile = DB::table('profiles')->where('id', $userId)->first();

            return response()->json([
                'data' => [
                    'id' => $user->id,
                    'email' => $user->email,
                    'full_name' => $profile->full_name,
                    'phone' => $profile->phone,
                    'is_active' => $profile->is_active !== false,
                    'has_platform_admin' => true,
                    'created_at' => $profile->created_at,
                    'updated_at' => $profile->updated_at,
                ],
            ], 201);
        } catch (ValidationException $e) {
            // Return validation errors in proper format
            return response()->json([
                'error' => 'Validation failed',
                'message' => 'The given data was invalid.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Failed to create platform user: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['error' => 'Failed to create platform user: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Update a platform admin user
     */
    public function updatePlatformUser(Request $request, string $id)
    {
        $this->enforceSubscriptionAdmin($request);

        $request->validate([
            'email' => ['sometimes', 'email', 'max:255', 'unique:users,email,' . $id],
            'full_name' => 'sometimes|string|max:255',
            'phone' => 'nullable|string|max:20',
        ]);

        try {
            $user = User::find($id);
            if (!$user) {
                return response()->json(['error' => 'User not found'], 404);
            }

            $profile = DB::table('profiles')->where('id', $id)->whereNull('deleted_at')->first();
            if (!$profile) {
                return response()->json(['error' => 'Profile not found'], 404);
            }

            // Verify this is a platform admin user (has subscription.admin permission)
            $permission = DB::table('permissions')
                ->where('name', 'subscription.admin')
                ->whereNull('organization_id')
                ->first();

            $platformOrgId = '00000000-0000-0000-0000-000000000000';

            if ($permission) {
                $hasPermission = DB::table('model_has_permissions')
                    ->where('permission_id', $permission->id)
                    ->where('model_type', 'App\\Models\\User')
                    ->where('model_id', $id)
                    ->where('organization_id', $platformOrgId) // Use platform org UUID
                    ->exists();

                if (!$hasPermission) {
                    return response()->json(['error' => 'User is not a platform admin'], 403);
                }
            }

            // Update user email if provided (validation already checked uniqueness)
            if ($request->has('email')) {
                DB::table('users')
                    ->where('id', $id)
                    ->update(['email' => $request->email, 'updated_at' => now()]);
            }

            // Update profile
            $updateData = [];
            if ($request->has('full_name')) {
                $updateData['full_name'] = $request->full_name;
            }
            if ($request->has('phone')) {
                $updateData['phone'] = $request->phone;
            }
            $updateData['updated_at'] = now();

            if (!empty($updateData)) {
                DB::table('profiles')
                    ->where('id', $id)
                    ->update($updateData);
            }

            // Get updated user
            $updatedUser = User::find($id);
            $updatedProfile = DB::table('profiles')->where('id', $id)->first();

            return response()->json([
                'data' => [
                    'id' => $updatedUser->id,
                    'email' => $updatedUser->email,
                    'full_name' => $updatedProfile->full_name,
                    'phone' => $updatedProfile->phone,
                    'is_active' => $updatedProfile->is_active !== false,
                    'has_platform_admin' => true,
                    'created_at' => $updatedProfile->created_at,
                    'updated_at' => $updatedProfile->updated_at,
                ],
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            // Return validation errors in proper format
            return response()->json([
                'error' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Failed to update platform user: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['error' => 'Failed to update platform user: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Delete a platform admin user
     */
    public function deletePlatformUser(Request $request, string $id)
    {
        $this->enforceSubscriptionAdmin($request);

        try {
            $user = User::find($id);
            if (!$user) {
                return response()->json(['error' => 'User not found'], 404);
            }

            // Verify this is a platform admin user
            $permission = DB::table('permissions')
                ->where('name', 'subscription.admin')
                ->whereNull('organization_id')
                ->first();

            $platformOrgId = '00000000-0000-0000-0000-000000000000';

            if ($permission) {
                $hasPermission = DB::table('model_has_permissions')
                    ->where('permission_id', $permission->id)
                    ->where('model_type', 'App\\Models\\User')
                    ->where('model_id', $id)
                    ->where('organization_id', $platformOrgId) // Use platform org UUID
                    ->exists();

                if (!$hasPermission) {
                    return response()->json(['error' => 'User is not a platform admin'], 403);
                }
            }

            // Remove subscription.admin permission first
            if ($permission) {
                DB::table('model_has_permissions')
                    ->where('permission_id', $permission->id)
                    ->where('model_type', 'App\\Models\\User')
                    ->where('model_id', $id)
                    ->where('organization_id', $platformOrgId) // Use platform org UUID
                    ->delete();
            }

            // Delete user and profile
            DB::table('profiles')->where('id', $id)->delete();
            DB::table('users')->where('id', $id)->delete();

            return response()->noContent();
        } catch (\Exception $e) {
            \Log::error('Failed to delete platform user: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['error' => 'Failed to delete platform user: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Reset password for a platform admin user
     */
    public function resetPlatformUserPassword(Request $request, string $id)
    {
        $this->enforceSubscriptionAdmin($request);

        $request->validate([
            'password' => 'required|string|min:8',
        ]);

        try {
            $user = User::find($id);
            if (!$user) {
                return response()->json(['error' => 'User not found'], 404);
            }

            // Verify this is a platform admin user
            $permission = DB::table('permissions')
                ->where('name', 'subscription.admin')
                ->whereNull('organization_id')
                ->first();

            $platformOrgId = '00000000-0000-0000-0000-000000000000';

            if ($permission) {
                $hasPermission = DB::table('model_has_permissions')
                    ->where('permission_id', $permission->id)
                    ->where('model_type', 'App\\Models\\User')
                    ->where('model_id', $id)
                    ->where('organization_id', $platformOrgId) // Use platform org UUID
                    ->exists();

                if (!$hasPermission) {
                    return response()->json(['error' => 'User is not a platform admin'], 403);
                }
            }

            // Update password
            $encryptedPassword = Hash::make($request->password);
            DB::table('users')
                ->where('id', $id)
                ->update([
                    'encrypted_password' => $encryptedPassword,
                    'updated_at' => now(),
                ]);

            return response()->json(['message' => 'Password reset successfully']);
        } catch (\Exception $e) {
            \Log::error('Failed to reset platform user password: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['error' => 'Failed to reset password: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Reset password for any user (organization admin or regular user)
     * Platform admins can reset passwords for any user in the system
     */
    public function resetUserPassword(Request $request, string $id)
    {
        $this->enforceSubscriptionAdmin($request);

        $request->validate([
            'password' => 'required|string|min:8',
        ]);

        try {
            $user = User::find($id);
            if (!$user) {
                return response()->json(['error' => 'User not found'], 404);
            }

            // Platform admins can reset passwords for any user
            // No need to check if user is platform admin or organization admin
            // Update password
            $encryptedPassword = Hash::make($request->password);
            DB::table('users')
                ->where('id', $id)
                ->update([
                    'encrypted_password' => $encryptedPassword,
                    'updated_at' => now(),
                ]);

            return response()->json(['message' => 'Password reset successfully']);
        } catch (\Exception $e) {
            \Log::error('Failed to reset user password: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['error' => 'Failed to reset password: ' . $e->getMessage()], 500);
        }
    }

    // =====================================================
    // DISCOUNT CODES
    // =====================================================

    /**
     * List all discount codes
     */
    public function listDiscountCodes(Request $request)
    {
        $this->enforceSubscriptionAdmin($request);

        $codes = DiscountCode::withTrashed()
            ->orderBy('created_at', 'desc')
            ->paginate($request->per_page ?? 20);

        return response()->json($codes);
    }

    /**
     * Create a discount code
     */
    public function createDiscountCode(Request $request)
    {
        $this->enforceSubscriptionAdmin($request);

        $validator = Validator::make($request->all(), [
            'code' => 'required|string|max:50|unique:discount_codes,code',
            'name' => 'required|string|max:150',
            'description' => 'nullable|string',
            'discount_type' => 'required|in:percentage,fixed',
            'discount_value' => 'required|numeric|min:0',
            'max_discount_amount' => 'nullable|numeric|min:0',
            'currency' => 'nullable|in:AFN,USD',
            'applicable_plan_id' => 'nullable|uuid|exists:subscription_plans,id',
            'max_uses' => 'nullable|integer|min:1',
            'max_uses_per_org' => 'integer|min:1',
            'valid_from' => 'nullable|date',
            'valid_until' => 'nullable|date|after:valid_from',
            'metadata' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 422);
        }

        $user = $request->user();

        $code = DiscountCode::create([
            'code' => strtoupper($request->code),
            'name' => $request->name,
            'description' => $request->description,
            'discount_type' => $request->discount_type,
            'discount_value' => $request->discount_value,
            'max_discount_amount' => $request->max_discount_amount,
            'currency' => $request->currency,
            'applicable_plan_id' => $request->applicable_plan_id,
            'max_uses' => $request->max_uses,
            'max_uses_per_org' => $request->max_uses_per_org ?? 1,
            'valid_from' => $request->valid_from,
            'valid_until' => $request->valid_until,
            'metadata' => $request->metadata,
            'created_by' => $user->id,
        ]);

        Cache::forget('subscription:plans:public:v1');

        return response()->json([
            'data' => $code,
            'message' => 'Discount code created successfully',
        ], 201);
    }

    /**
     * Update a discount code
     */
    public function updateDiscountCode(Request $request, string $id)
    {
        $this->enforceSubscriptionAdmin($request);

        $code = DiscountCode::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'string|max:150',
            'description' => 'nullable|string',
            'discount_value' => 'numeric|min:0',
            'max_discount_amount' => 'nullable|numeric|min:0',
            'max_uses' => 'nullable|integer|min:1',
            'max_uses_per_org' => 'integer|min:1',
            'valid_from' => 'nullable|date',
            'valid_until' => 'nullable|date|after:valid_from',
            'is_active' => 'boolean',
            'metadata' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 422);
        }

        $code->update($request->only([
            'name', 'description', 'discount_value', 'max_discount_amount',
            'max_uses', 'max_uses_per_org', 'valid_from', 'valid_until', 'is_active', 'metadata',
        ]));

        Cache::forget('subscription:plans:public:v1');

        return response()->json([
            'data' => $code->fresh(),
            'message' => 'Discount code updated',
        ]);
    }

    /**
     * Delete a discount code
     */
    public function deleteDiscountCode(Request $request, string $id)
    {
        $this->enforceSubscriptionAdmin($request);

        $code = DiscountCode::findOrFail($id);
        $code->delete();

        Cache::forget('subscription:plans:public:v1');

        return response()->noContent();
    }

    // =====================================================
    // FEATURE & LIMIT DEFINITIONS
    // =====================================================

    /**
     * List all feature definitions
     */
    public function listFeatureDefinitions(Request $request)
    {
        $this->enforceSubscriptionAdmin($request);

        $features = FeatureDefinition::orderBy('category')
            ->orderBy('sort_order')
            ->get();

        return response()->json(['data' => $features]);
    }

    /**
     * List all limit definitions
     */
    public function listLimitDefinitions(Request $request)
    {
        $this->enforceSubscriptionAdmin($request);

        $limits = LimitDefinition::orderBy('category')
            ->orderBy('sort_order')
            ->get();

        return response()->json(['data' => $limits]);
    }

    // =====================================================
    // REPORTS
    // =====================================================

    /**
     * Get usage snapshots for an organization
     */
    public function getUsageSnapshots(Request $request, string $organizationId)
    {
        $this->enforceSubscriptionAdmin($request);

        $snapshots = UsageSnapshot::where('organization_id', $organizationId)
            ->orderBy('snapshot_date', 'desc')
            ->limit(12)
            ->get();

        return response()->json(['data' => $snapshots]);
    }

    /**
     * Trigger usage recalculation for an organization
     */
    public function recalculateUsage(Request $request, string $organizationId)
    {
        $this->enforceSubscriptionAdmin($request);

        $recalculated = $this->usageTrackingService->recalculateUsage($organizationId);

        return response()->json([
            'data' => $recalculated,
            'message' => 'Usage recalculated successfully',
        ]);
    }

    /**
     * Process subscription status transitions (cron job)
     */
    public function processStatusTransitions(Request $request)
    {
        $this->enforceSubscriptionAdmin($request);

        $processed = $this->subscriptionService->processSubscriptionStatusTransitions();

        return response()->json([
            'data' => $processed,
            'message' => 'Status transitions processed',
        ]);
    }

    // =====================================================
    // MAINTENANCE FEES (PLATFORM ADMIN)
    // =====================================================

    /**
     * Get all maintenance fees overview (platform-wide)
     */
    public function listMaintenanceFees(Request $request)
    {
        $this->enforceSubscriptionAdmin($request);

        try {
            $maintenanceFeeService = app(\App\Services\Subscription\MaintenanceFeeService::class);

            // Get all subscriptions with maintenance info
            $subscriptions = OrganizationSubscription::with(['plan', 'organization'])
                ->whereNull('deleted_at')
                ->whereIn('status', [
                    OrganizationSubscription::STATUS_ACTIVE,
                    OrganizationSubscription::STATUS_GRACE_PERIOD,
                    OrganizationSubscription::STATUS_TRIAL,
                ])
                ->orderBy('next_maintenance_due_at')
                ->paginate($request->per_page ?? 20);

            $subscriptions->getCollection()->transform(function ($subscription) use ($maintenanceFeeService) {
                $currency = $subscription->currency ?? 'AFN';
                return [
                    'subscription_id' => $subscription->id,
                    'organization_id' => $subscription->organization_id,
                    'organization_name' => $subscription->organization?->name,
                    'plan_name' => $subscription->plan?->name,
                    'status' => $subscription->status,
                    'billing_period' => $subscription->billing_period,
                    'billing_period_label' => $subscription->getBillingPeriodLabel(),
                    'next_maintenance_due_at' => $subscription->next_maintenance_due_at?->toDateString(),
                    'last_maintenance_paid_at' => $subscription->last_maintenance_paid_at?->toDateString(),
                    'is_overdue' => $subscription->isMaintenanceOverdue(),
                    'days_until_due' => $subscription->daysUntilMaintenanceDue(),
                    'days_overdue' => $subscription->daysMaintenanceOverdue(),
                    'maintenance_amount' => $maintenanceFeeService->calculateMaintenanceAmount($subscription, $currency),
                    'currency' => $currency,
                ];
            });

            return response()->json($subscriptions);
        } catch (\Exception $e) {
            \Log::error('Failed to list maintenance fees: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['error' => 'Failed to list maintenance fees'], 500);
        }
    }

    /**
     * Get overdue maintenance fees (platform-wide)
     */
    public function listOverdueMaintenanceFees(Request $request)
    {
        $this->enforceSubscriptionAdmin($request);

        try {
            $maintenanceFeeService = app(\App\Services\Subscription\MaintenanceFeeService::class);
            $overdue = $maintenanceFeeService->getOverdueMaintenance();

            return response()->json([
                'data' => $overdue,
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to list overdue maintenance fees: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['error' => 'Failed to list overdue maintenance fees'], 500);
        }
    }

    /**
     * Generate maintenance invoices for due subscriptions
     */
    public function generateMaintenanceInvoices(Request $request)
    {
        $this->enforceSubscriptionAdmin($request);

        $validator = Validator::make($request->all(), [
            'days_before_due' => 'integer|min:1|max:90',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 422);
        }

        try {
            $maintenanceFeeService = app(\App\Services\Subscription\MaintenanceFeeService::class);
            $daysBeforeDue = $request->days_before_due ?? 30;
            
            $invoices = $maintenanceFeeService->generateInvoices($daysBeforeDue);

            return response()->json([
                'data' => [
                    'generated_count' => $invoices->count(),
                    'invoices' => $invoices->map(function ($invoice) {
                        return [
                            'id' => $invoice->id,
                            'invoice_number' => $invoice->invoice_number,
                            'organization_id' => $invoice->organization_id,
                            'amount' => $invoice->amount,
                            'currency' => $invoice->currency,
                            'due_date' => $invoice->due_date?->toDateString(),
                        ];
                    }),
                ],
                'message' => "Generated {$invoices->count()} maintenance invoice(s)",
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to generate maintenance invoices: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['error' => 'Failed to generate invoices: ' . $e->getMessage()], 500);
        }
    }

    /**
     * List all maintenance invoices (platform-wide)
     */
    public function listMaintenanceInvoices(Request $request)
    {
        $this->enforceSubscriptionAdmin($request);

        try {
            $query = \App\Models\MaintenanceInvoice::with(['organization', 'subscription.plan'])
                ->orderBy('due_date', 'desc');

            // Filter by status
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            // Filter by organization
            if ($request->has('organization_id')) {
                $query->where('organization_id', $request->organization_id);
            }

            // Filter by overdue
            if ($request->boolean('overdue')) {
                $query->overdue();
            }

            // Filter by due soon
            if ($request->has('due_within_days')) {
                $query->dueSoon($request->due_within_days);
            }

            $invoices = $query->paginate($request->per_page ?? 20);

            $invoices->getCollection()->transform(function ($invoice) {
                return [
                    'id' => $invoice->id,
                    'invoice_number' => $invoice->invoice_number,
                    'organization_id' => $invoice->organization_id,
                    'organization_name' => $invoice->organization?->name,
                    'subscription_id' => $invoice->subscription_id,
                    'plan_name' => $invoice->subscription?->plan?->name,
                    'amount' => $invoice->amount,
                    'currency' => $invoice->currency,
                    'billing_period' => $invoice->billing_period,
                    'billing_period_label' => $invoice->getBillingPeriodLabel(),
                    'period_start' => $invoice->period_start?->toDateString(),
                    'period_end' => $invoice->period_end?->toDateString(),
                    'due_date' => $invoice->due_date?->toDateString(),
                    'status' => $invoice->status,
                    'status_label' => $invoice->getStatusLabel(),
                    'is_overdue' => $invoice->isOverdue(),
                    'days_until_due' => $invoice->daysUntilDue(),
                    'days_overdue' => $invoice->daysOverdue(),
                    'generated_at' => $invoice->generated_at?->toISOString(),
                    'paid_at' => $invoice->paid_at?->toISOString(),
                ];
            });

            return response()->json($invoices);
        } catch (\Exception $e) {
            \Log::error('Failed to list maintenance invoices: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['error' => 'Failed to list maintenance invoices'], 500);
        }
    }

    /**
     * Confirm a maintenance fee payment (by platform admin)
     */
    public function confirmMaintenancePayment(Request $request, string $paymentId)
    {
        $this->enforceSubscriptionAdmin($request);

        $user = $request->user();

        try {
            $payment = PaymentRecord::findOrFail($paymentId);

            if ($payment->payment_type !== PaymentRecord::TYPE_MAINTENANCE) {
                return response()->json(['error' => 'Payment is not a maintenance fee payment'], 400);
            }

            if (!$payment->isPending()) {
                return response()->json(['error' => 'Payment is not pending'], 400);
            }

            $maintenanceFeeService = app(\App\Services\Subscription\MaintenanceFeeService::class);
            $confirmedPayment = $maintenanceFeeService->confirmMaintenancePayment($payment, $user->id);

            return response()->json([
                'data' => $confirmedPayment,
                'message' => 'Maintenance payment confirmed successfully',
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to confirm maintenance payment: ' . $e->getMessage(), [
                'payment_id' => $paymentId,
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['error' => 'Failed to confirm payment: ' . $e->getMessage()], 500);
        }
    }

    // =====================================================
    // LICENSE FEES (PLATFORM ADMIN)
    // =====================================================

    /**
     * Get all unpaid license fees (platform-wide)
     */
    public function listUnpaidLicenseFees(Request $request)
    {
        $this->enforceSubscriptionAdmin($request);

        try {
            $licenseFeeService = app(\App\Services\Subscription\LicenseFeeService::class);
            $unpaid = $licenseFeeService->getUnpaidLicenseFees();

            return response()->json([
                'data' => $unpaid,
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to list unpaid license fees: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['error' => 'Failed to list unpaid license fees'], 500);
        }
    }

    /**
     * Confirm a license fee payment (by platform admin)
     */
    public function confirmLicensePayment(Request $request, string $paymentId)
    {
        $this->enforceSubscriptionAdmin($request);

        $user = $request->user();

        try {
            $payment = PaymentRecord::findOrFail($paymentId);

            if ($payment->payment_type !== PaymentRecord::TYPE_LICENSE) {
                return response()->json(['error' => 'Payment is not a license fee payment'], 400);
            }

            if (!$payment->isPending()) {
                return response()->json(['error' => 'Payment is not pending'], 400);
            }

            $licenseFeeService = app(\App\Services\Subscription\LicenseFeeService::class);
            $confirmedPayment = $licenseFeeService->confirmLicensePayment($payment, $user->id);

            return response()->json([
                'data' => $confirmedPayment,
                'message' => 'License payment confirmed successfully',
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to confirm license payment: ' . $e->getMessage(), [
                'payment_id' => $paymentId,
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['error' => 'Failed to confirm payment: ' . $e->getMessage()], 500);
        }
    }

    /**
     * List all license fee payments (platform-wide)
     */
    public function listLicensePayments(Request $request)
    {
        $this->enforceSubscriptionAdmin($request);

        try {
            $query = PaymentRecord::with(['organization', 'subscription.plan'])
                ->licensePayments()
                ->orderBy('payment_date', 'desc');

            // Filter by status
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            // Filter by organization
            if ($request->has('organization_id')) {
                $query->where('organization_id', $request->organization_id);
            }

            $payments = $query->paginate($request->per_page ?? 20);

            $payments->getCollection()->transform(function ($payment) {
                return [
                    'id' => $payment->id,
                    'organization_id' => $payment->organization_id,
                    'organization_name' => $payment->organization?->name,
                    'subscription_id' => $payment->subscription_id,
                    'plan_name' => $payment->subscription?->plan?->name,
                    'amount' => $payment->amount,
                    'currency' => $payment->currency,
                    'payment_method' => $payment->payment_method,
                    'payment_reference' => $payment->payment_reference,
                    'payment_date' => $payment->payment_date?->toDateString(),
                    'status' => $payment->status,
                    'payment_type' => $payment->payment_type,
                    'confirmed_at' => $payment->confirmed_at?->toISOString(),
                    'notes' => $payment->notes,
                ];
            });

            return response()->json($payments);
        } catch (\Exception $e) {
            \Log::error('Failed to list license payments: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['error' => 'Failed to list license payments'], 500);
        }
    }

    /**
     * Get organization revenue history with breakdown
     */
    public function getOrganizationRevenueHistory(Request $request, string $organizationId)
    {
        $this->enforceSubscriptionAdmin($request);

        try {
            $organization = Organization::find($organizationId);
            if (!$organization) {
                return response()->json(['error' => 'Organization not found'], 404);
            }

            // Get all confirmed payments for this organization
            $payments = PaymentRecord::where('organization_id', $organizationId)
                ->where('status', PaymentRecord::STATUS_CONFIRMED)
                ->whereNotNull('confirmed_at')
                ->with(['subscription.plan', 'discountCode', 'confirmedByUser'])
                ->orderBy('confirmed_at', 'desc')
                ->get();

            // Calculate totals by payment type
            $totalsByType = [
                PaymentRecord::TYPE_LICENSE => ['AFN' => 0, 'USD' => 0, 'count' => 0],
                PaymentRecord::TYPE_MAINTENANCE => ['AFN' => 0, 'USD' => 0, 'count' => 0],
                PaymentRecord::TYPE_RENEWAL => ['AFN' => 0, 'USD' => 0, 'count' => 0],
            ];

            $totalRevenue = ['AFN' => 0, 'USD' => 0];
            $paymentsByYear = [];
            $paymentsByMonth = [];

            foreach ($payments as $payment) {
                $netAmount = $payment->getNetAmount();
                $currency = $payment->currency;
                $paymentType = $payment->payment_type ?? PaymentRecord::TYPE_RENEWAL;
                $confirmedAt = $payment->confirmed_at;

                // Update totals by type
                if (isset($totalsByType[$paymentType])) {
                    $totalsByType[$paymentType][$currency] += $netAmount;
                    $totalsByType[$paymentType]['count']++;
                }

                // Update total revenue
                $totalRevenue[$currency] += $netAmount;

                // Group by year
                $year = $confirmedAt->format('Y');
                if (!isset($paymentsByYear[$year])) {
                    $paymentsByYear[$year] = ['AFN' => 0, 'USD' => 0, 'count' => 0];
                }
                $paymentsByYear[$year][$currency] += $netAmount;
                $paymentsByYear[$year]['count']++;

                // Group by month
                $monthKey = $confirmedAt->format('Y-m');
                if (!isset($paymentsByMonth[$monthKey])) {
                    $paymentsByMonth[$monthKey] = ['AFN' => 0, 'USD' => 0, 'count' => 0];
                }
                $paymentsByMonth[$monthKey][$currency] += $netAmount;
                $paymentsByMonth[$monthKey]['count']++;
            }

            // Transform payments for response
            $paymentList = $payments->map(function ($payment) {
                return [
                    'id' => $payment->id,
                    'subscription_id' => $payment->subscription_id,
                    'plan_name' => $payment->subscription?->plan?->name,
                    'amount' => (float) $payment->amount,
                    'currency' => $payment->currency,
                    'discount_amount' => (float) $payment->discount_amount,
                    'net_amount' => $payment->getNetAmount(),
                    'payment_method' => $payment->payment_method,
                    'payment_reference' => $payment->payment_reference,
                    'payment_date' => $payment->payment_date?->toDateString(),
                    'payment_type' => $payment->payment_type ?? PaymentRecord::TYPE_RENEWAL,
                    'payment_type_label' => $payment->getPaymentTypeLabel(),
                    'billing_period' => $payment->billing_period,
                    'billing_period_label' => $payment->getBillingPeriodLabel(),
                    'is_recurring' => $payment->is_recurring,
                    'confirmed_at' => $payment->confirmed_at?->toISOString(),
                    'confirmed_by' => $payment->confirmedByUser?->email,
                    'discount_code' => $payment->discountCode?->code,
                    'notes' => $payment->notes,
                    'invoice_number' => $payment->invoice_number,
                ];
            });

            return response()->json([
                'data' => [
                    'organization' => [
                        'id' => $organization->id,
                        'name' => $organization->name,
                    ],
                    'total_revenue' => $totalRevenue,
                    'totals_by_type' => $totalsByType,
                    'payments_by_year' => $paymentsByYear,
                    'payments_by_month' => $paymentsByMonth,
                    'payments' => $paymentList,
                    'total_payments' => $payments->count(),
                ],
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to get organization revenue history: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['error' => 'Failed to get organization revenue history'], 500);
        }
    }
}
