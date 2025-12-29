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
use App\Services\Subscription\FeatureGateService;
use App\Services\Subscription\SubscriptionService;
use App\Services\Subscription\UsageTrackingService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
                ->select('currency', DB::raw('sum(COALESCE(amount, 0) - COALESCE(discount_amount, 0)) as total'))
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
            ->orderBy('sort_order')
            ->get();

        return response()->json([
            'data' => $plans->map(function ($plan) {
                return [
                    'id' => $plan->id,
                    'name' => $plan->name,
                    'slug' => $plan->slug,
                    'description' => $plan->description,
                    'price_yearly_afn' => $plan->price_yearly_afn,
                    'price_yearly_usd' => $plan->price_yearly_usd,
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
                    'features_count' => $plan->enabledFeatures()->count(),
                    'subscriptions_count' => $plan->subscriptions()->count(),
                    'deleted_at' => $plan->deleted_at,
                ];
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
            'price_yearly_afn' => 'required|numeric|min:0',
            'price_yearly_usd' => 'required|numeric|min:0',
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

            return response()->json([
                'data' => $plan->fresh(['features', 'limits']),
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
            'price_yearly_afn' => 'numeric|min:0',
            'price_yearly_usd' => 'numeric|min:0',
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
                'is_active', 'trial_days', 'grace_period_days', 'readonly_period_days',
                'max_schools', 'per_school_price_afn', 'per_school_price_usd', 'sort_order',
            ]));

            // Update features
            if ($request->has('features')) {
                foreach ($request->features as $featureKey => $isEnabled) {
                    $plan->features()->updateOrCreate(
                        ['feature_key' => $featureKey],
                        ['is_enabled' => (bool) $isEnabled]
                    );
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

            return response()->json([
                'data' => $plan->fresh(['features', 'limits']),
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

        $payment = PaymentRecord::findOrFail($paymentId);
        $user = $request->user();

        if (!$payment->isPending()) {
            return response()->json(['error' => 'Payment is not pending'], 400);
        }

        // Find associated renewal request
        $renewalRequest = RenewalRequest::where('organization_id', $payment->organization_id)
            ->pending()
            ->first();

        if ($renewalRequest) {
            // Approve the renewal request
            $subscription = $this->subscriptionService->approveRenewalRequest(
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

        return response()->json([
            'data' => $payment->fresh(),
            'message' => 'Payment confirmed successfully',
        ]);
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
            ->with(['organization', 'subscription.plan', 'requestedPlan', 'paymentRecord'])
            ->orderBy('requested_at', 'asc')
            ->paginate($request->per_page ?? 20);

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

            $subscription = $this->subscriptionService->getCurrentSubscription($renewal->organization_id);

            $paymentRecord = PaymentRecord::create([
                'organization_id' => $renewal->organization_id,
                'subscription_id' => $subscription?->id,
                'amount' => $request->amount,
                'currency' => $request->currency,
                'payment_method' => $request->payment_method,
                'payment_reference' => $request->payment_reference,
                'payment_date' => $request->payment_date,
                'period_start' => now()->toDateString(),
                'period_end' => now()->addYear()->toDateString(),
                'status' => PaymentRecord::STATUS_CONFIRMED, // Auto-confirm when created by admin
                'confirmed_by' => $user->id,
                'confirmed_at' => now(),
                'discount_code_id' => $renewal->discount_code_id,
                'discount_amount' => $priceInfo['discount_amount'],
                'notes' => $request->notes,
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
            'created_by' => $user->id,
        ]);

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
            'valid_until' => 'nullable|date',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 422);
        }

        $code->update($request->only([
            'name', 'description', 'discount_value', 'max_discount_amount',
            'max_uses', 'max_uses_per_org', 'valid_until', 'is_active',
        ]));

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
}
