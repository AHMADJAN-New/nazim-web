<?php

namespace App\Http\Controllers;

use App\Models\DiscountCode;
use App\Models\FeatureDefinition;
use App\Models\OrganizationSubscription;
use App\Models\PaymentRecord;
use App\Models\RenewalRequest;
use App\Models\SubscriptionPlan;
use App\Services\Subscription\FeatureGateService;
use App\Services\Subscription\SubscriptionService;
use App\Services\Subscription\UsageTrackingService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class SubscriptionController extends Controller
{
    public function __construct(
        private SubscriptionService $subscriptionService,
        private FeatureGateService $featureGateService,
        private UsageTrackingService $usageTrackingService
    ) {}

    /**
     * Get all available features (public endpoint for landing page)
     */
    public function allFeatures(Request $request)
    {
        $features = FeatureDefinition::active()
            ->orderBy('category')
            ->orderBy('sort_order')
            ->get();

        return response()->json([
            'data' => $features->map(function ($feature) {
                return [
                    'feature_key' => $feature->feature_key,
                    'name' => $feature->name,
                    'description' => $feature->description,
                    'category' => $feature->category,
                    'is_addon' => $feature->is_addon,
                ];
            }),
        ]);
    }

    /**
     * Get available subscription plans
     */
    public function plans(Request $request)
    {
        $cacheKey = 'subscription:plans:public:v1';

        $data = Cache::remember($cacheKey, now()->addHour(), function () {
            $plans = SubscriptionPlan::active()
                ->standard()
                ->with(['features', 'limits'])
                ->orderBy('sort_order')
                ->get();

            $landingDiscounts = DiscountCode::valid()
                ->where('metadata->show_on_landing', true)
                ->get();

            return $plans->map(function ($plan) use ($landingDiscounts) {
                $enabledFeatures = $plan->features
                    ->where('is_enabled', true)
                    ->pluck('feature_key')
                    ->values();

                $totalFeeAfn = ($plan->license_fee_afn ?? 0) + ($plan->maintenance_fee_afn ?? $plan->price_yearly_afn ?? 0);
                $totalFeeUsd = ($plan->license_fee_usd ?? 0) + ($plan->maintenance_fee_usd ?? $plan->price_yearly_usd ?? 0);

                $landingOffer = null;
                $matchingDiscounts = $landingDiscounts->filter(function ($discount) use ($plan) {
                    return $discount->appliesToPlan($plan->id);
                });

                if ($matchingDiscounts->isNotEmpty()) {
                    $bestOffer = $matchingDiscounts
                        ->sortByDesc(function ($discount) use ($totalFeeAfn) {
                            return $discount->calculateDiscount($totalFeeAfn, 'AFN');
                        })
                        ->first();

                    $discountAfn = $bestOffer->calculateDiscount($totalFeeAfn, 'AFN');
                    $discountUsd = $bestOffer->calculateDiscount($totalFeeUsd, 'USD');

                    $landingOffer = [
                        'id' => $bestOffer->id,
                        'code' => $bestOffer->code,
                        'name' => $bestOffer->name,
                        'description' => $bestOffer->description,
                        'discount_type' => $bestOffer->discount_type,
                        'discount_value' => (float) $bestOffer->discount_value,
                        'max_discount_amount' => $bestOffer->max_discount_amount !== null ? (float) $bestOffer->max_discount_amount : null,
                        'currency' => $bestOffer->currency,
                        'valid_from' => $bestOffer->valid_from?->toISOString(),
                        'valid_until' => $bestOffer->valid_until?->toISOString(),
                        'metadata' => $bestOffer->metadata,
                        'discount_amount_afn' => $discountAfn,
                        'discount_amount_usd' => $discountUsd,
                        'discounted_total_fee_afn' => max(0, $totalFeeAfn - $discountAfn),
                        'discounted_total_fee_usd' => max(0, $totalFeeUsd - $discountUsd),
                    ];
                }

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
                    'total_fee_afn' => $totalFeeAfn,
                    'total_fee_usd' => $totalFeeUsd,
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
                    'limits' => $plan->limits->mapWithKeys(function ($limit) {
                        return [$limit->resource_key => $limit->limit_value];
                    }),
                    'metadata' => $plan->metadata,
                    'export_level' => $plan->metadata['export_level'] ?? null,
                    'backup_mode' => $plan->metadata['backup_mode'] ?? null,
                    'permissions_level' => $plan->metadata['permissions_level'] ?? null,
                    'landing_offer' => $landingOffer,
                    'created_at' => $plan->created_at?->toISOString(),
                    'updated_at' => $plan->updated_at?->toISOString(),
                    'deleted_at' => $plan->deleted_at?->toISOString(),
                ];
            })->values();
        });

        return response()->json(['data' => $data]);
    }

    /**
     * Get current subscription status (lite version - no permission required)
     * 
     * CRITICAL: This endpoint is used for frontend gating and must be accessible to ALL authenticated users.
     * It returns only the minimal information needed for access control decisions.
     * No sensitive subscription details (plan, pricing, etc.) are exposed.
     */
    public function statusLite(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $organizationId = $profile->organization_id;
        $subscription = $this->subscriptionService->getCurrentSubscription($organizationId);

        if (!$subscription) {
            return response()->json([
                'data' => [
                    'status' => 'none',
                    'access_level' => 'none',
                    'can_read' => false,
                    'can_write' => false,
                    'trial_ends_at' => null,
                    'grace_period_ends_at' => null,
                    'readonly_period_ends_at' => null,
                    'message' => 'No active subscription',
                ],
            ]);
        }

        // Use FeatureGateService to get status (includes payment suspension logic)
        $statusInfo = $this->featureGateService->getSubscriptionStatus($organizationId);
        
        return response()->json([
            'data' => [
                'status' => $statusInfo['status'],
                'access_level' => $statusInfo['access_level'],
                'can_read' => $statusInfo['can_read'],
                'can_write' => $statusInfo['can_write'],
                'trial_ends_at' => $statusInfo['trial_ends_at'],
                'grace_period_ends_at' => $statusInfo['grace_period_ends_at'],
                'readonly_period_ends_at' => $statusInfo['readonly_period_ends_at'],
                'message' => $statusInfo['message'],
            ],
        ]);
    }

    /**
     * Get current subscription status (full version - requires subscription.read permission)
     */
    public function status(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('subscription.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subscription.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $status = $this->featureGateService->getSubscriptionStatus($profile->organization_id);

        return response()->json([
            'data' => $status,
        ]);
    }

    /**
     * Get current usage statistics
     */
    public function usage(Request $request)
    {
        try {
            $user = $request->user();
            $profile = DB::table('profiles')->where('id', $user->id)->first();

            if (!$profile || !$profile->organization_id) {
                return response()->json(['error' => 'User must be assigned to an organization'], 403);
            }

            // Check permission WITH organization context
            try {
                if (!$user->hasPermissionTo('subscription.read')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                Log::warning("Permission check failed for subscription.read: " . $e->getMessage());
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            // Get usage with error handling - returns empty array on error
            $usage = [];
            try {
                $usage = $this->usageTrackingService->getAllUsage($profile->organization_id);
            } catch (\Exception $e) {
                \Log::error('Failed to get usage: ' . $e->getMessage(), [
                    'trace' => $e->getTraceAsString(),
                    'organization_id' => $profile->organization_id,
                ]);
                // Continue with empty usage array
            }

            // Get warnings with error handling - returns empty array on error
            $warnings = [];
            try {
                $warnings = $this->usageTrackingService->hasWarnings($profile->organization_id);
            } catch (\Exception $e) {
                \Log::error('Failed to get warnings: ' . $e->getMessage(), [
                    'trace' => $e->getTraceAsString(),
                    'organization_id' => $profile->organization_id,
                ]);
                // Continue with empty warnings array
            }

            // Filter usage/warnings by enabled features so disabled modules don't show limits
            try {
                $usage = $this->featureGateService->filterUsageByFeatures($profile->organization_id, $usage);
                $warnings = $this->featureGateService->filterWarningsByFeatures($profile->organization_id, $warnings);
            } catch (\Exception $e) {
                \Log::warning('Failed to filter usage by features: ' . $e->getMessage(), [
                    'organization_id' => $profile->organization_id,
                ]);
            }

            return response()->json([
                'data' => [
                    'usage' => $usage,
                    'warnings' => $warnings,
                ],
            ]);
        } catch (\Exception $e) {
            \Log::error('Subscription usage error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'user_id' => $request->user()?->id,
            ]);
            
            // Return empty data instead of error to prevent frontend crashes
            return response()->json([
                'data' => [
                    'usage' => [],
                    'warnings' => [],
                ],
            ], 200);
        }
    }

    /**
     * Get all features and their status
     */
    public function features(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('subscription.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subscription.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $features = $this->featureGateService->getAllFeaturesStatus($profile->organization_id);

        return response()->json([
            'data' => $features,
        ]);
    }

    /**
     * Calculate price for a plan
     */
    public function calculatePrice(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'plan_id' => 'required|uuid|exists:subscription_plans,id',
            'additional_schools' => 'integer|min:0',
            'discount_code' => 'nullable|string|max:50',
            'currency' => 'in:AFN,USD',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 422);
        }

        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $price = $this->subscriptionService->calculatePrice(
            $request->plan_id,
            $request->additional_schools ?? 0,
            $request->discount_code,
            $request->currency ?? 'AFN',
            $profile->organization_id
        );

        return response()->json([
            'data' => $price,
        ]);
    }

    /**
     * Validate a discount code
     */
    public function validateDiscountCode(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'code' => 'required|string|max:50',
            'plan_id' => 'nullable|uuid|exists:subscription_plans,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 422);
        }

        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $code = DiscountCode::where('code', strtoupper($request->code))->first();

        if (!$code) {
            return response()->json([
                'valid' => false,
                'message' => 'Invalid discount code',
            ]);
        }

        if (!$code->isValid()) {
            return response()->json([
                'valid' => false,
                'message' => 'This discount code has expired or is no longer valid',
            ]);
        }

        if (!$code->canBeUsedByOrganization($profile->organization_id)) {
            return response()->json([
                'valid' => false,
                'message' => 'You have already used this discount code',
            ]);
        }

        if ($request->plan_id && !$code->appliesToPlan($request->plan_id)) {
            return response()->json([
                'valid' => false,
                'message' => 'This discount code does not apply to the selected plan',
            ]);
        }

        return response()->json([
            'valid' => true,
            'code' => $code->code,
            'name' => $code->name,
            'discount_type' => $code->discount_type,
            'discount_value' => $code->discount_value,
            'max_discount_amount' => $code->max_discount_amount,
        ]);
    }

    /**
     * Create a renewal request
     */
    public function createRenewalRequest(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'plan_id' => 'required|uuid|exists:subscription_plans,id',
            'additional_schools' => 'integer|min:0',
            'discount_code' => 'nullable|string|max:50',
            'notes' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 422);
        }

        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            $renewalRequest = $this->subscriptionService->createRenewalRequest(
                $profile->organization_id,
                $request->plan_id,
                $request->additional_schools ?? 0,
                $request->discount_code,
                $request->notes
            );

            return response()->json([
                'data' => $renewalRequest,
                'message' => 'Renewal request submitted successfully',
            ], 201);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    /**
     * Submit payment for a renewal request
     */
    public function submitPayment(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'renewal_request_id' => 'required|uuid|exists:renewal_requests,id',
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

        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            $paymentRecord = DB::transaction(function () use ($request, $profile) {
                /** @var RenewalRequest $renewalRequest */
                $renewalRequest = RenewalRequest::where('id', $request->renewal_request_id)
                    ->lockForUpdate()
                    ->firstOrFail();

                if ($renewalRequest->organization_id !== $profile->organization_id) {
                    throw new \Exception('Unauthorized');
                }

                if (!$renewalRequest->isPending()) {
                    throw new \Exception('Renewal request is not pending');
                }

                // Idempotency: if a pending payment already exists for this request, return it.
                if ($renewalRequest->payment_record_id) {
                    $existingPayment = PaymentRecord::where('id', $renewalRequest->payment_record_id)->first();
                    if ($existingPayment && $existingPayment->isPending()) {
                        return $existingPayment;
                    }
                }

                // Calculate price with discount for record-keeping (amount is flexible)
                $priceInfo = $this->subscriptionService->calculatePrice(
                    $renewalRequest->requested_plan_id,
                    $renewalRequest->additional_schools,
                    $renewalRequest->discountCode?->code,
                    $request->currency,
                    $profile->organization_id
                );

                $submittedAmount = (float) $request->amount;

                $subscription = $this->subscriptionService->getCurrentSubscription($profile->organization_id);
                $plan = SubscriptionPlan::findOrFail($renewalRequest->requested_plan_id);
                if (!$plan->is_active) {
                    throw new \Exception('Selected plan is not active');
                }

                $billingDays = $plan->getBillingPeriodDays();
                $periodStart = Carbon::parse($request->payment_date)->toDateString();
                $periodEnd = Carbon::parse($request->payment_date)->addDays($billingDays)->toDateString();

                $paymentRecord = PaymentRecord::create([
                    'organization_id' => $profile->organization_id,
                    'subscription_id' => $subscription?->id,
                    'amount' => $submittedAmount,
                    'currency' => $request->currency,
                    'payment_method' => $request->payment_method,
                    'payment_reference' => $request->payment_reference,
                    'payment_date' => $request->payment_date,
                    'period_start' => $periodStart,
                    'period_end' => $periodEnd,
                    'status' => PaymentRecord::STATUS_PENDING,
                    'discount_code_id' => $renewalRequest->discount_code_id,
                    'discount_amount' => $priceInfo['discount_amount'],
                    'notes' => $request->notes,
                    // New fee separation fields
                    'payment_type' => PaymentRecord::TYPE_RENEWAL,
                    'billing_period' => $plan->billing_period ?? PaymentRecord::BILLING_YEARLY,
                    'is_recurring' => true,
                ]);

                $renewalRequest->update(['payment_record_id' => $paymentRecord->id]);

                return $paymentRecord;
            }, 3);

            return response()->json([
                'data' => $paymentRecord,
                'message' => 'Payment submitted successfully. Awaiting confirmation.',
            ], 201);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    /**
     * Get renewal request history
     */
    public function renewalHistory(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('subscription.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subscription.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $requests = RenewalRequest::where('organization_id', $profile->organization_id)
            ->with(['requestedPlan', 'paymentRecord'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'data' => $requests,
        ]);
    }

    /**
     * Get payment history
     */
    public function paymentHistory(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('subscription.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subscription.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $payments = PaymentRecord::where('organization_id', $profile->organization_id)
            ->orderBy('payment_date', 'desc')
            ->get();

        return response()->json([
            'data' => $payments,
        ]);
    }

    /**
     * Get subscription history
     */
    public function subscriptionHistory(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('subscription.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subscription.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $history = \App\Models\SubscriptionHistory::where('organization_id', $profile->organization_id)
            ->with(['fromPlan', 'toPlan'])
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get();

        return response()->json([
            'data' => $history,
        ]);
    }
}
