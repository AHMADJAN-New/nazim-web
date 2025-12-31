<?php

namespace App\Http\Controllers;

use App\Models\DiscountCode;
use App\Models\OrganizationSubscription;
use App\Models\PaymentRecord;
use App\Models\RenewalRequest;
use App\Models\SubscriptionPlan;
use App\Services\Subscription\FeatureGateService;
use App\Services\Subscription\SubscriptionService;
use App\Services\Subscription\UsageTrackingService;
use Illuminate\Http\Request;
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
     * Get available subscription plans
     */
    public function plans(Request $request)
    {
        $plans = $this->subscriptionService->getAvailablePlans();

        return response()->json([
            'data' => $plans->map(function ($plan) {
                return [
                    'id' => $plan->id,
                    'name' => $plan->name,
                    'slug' => $plan->slug,
                    'description' => $plan->description,
                    'price_yearly_afn' => $plan->price_yearly_afn,
                    'price_yearly_usd' => $plan->price_yearly_usd,
                    'is_default' => $plan->is_default,
                    'trial_days' => $plan->trial_days,
                    'max_schools' => $plan->max_schools,
                    'per_school_price_afn' => $plan->per_school_price_afn,
                    'per_school_price_usd' => $plan->per_school_price_usd,
                    'features' => $plan->enabledFeatures()->pluck('feature_key'),
                    'limits' => $plan->limits->mapWithKeys(function ($limit) {
                        return [$limit->resource_key => $limit->limit_value];
                    }),
                ];
            }),
        ]);
    }

    /**
     * Get current subscription status
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

        $renewalRequest = RenewalRequest::find($request->renewal_request_id);

        if ($renewalRequest->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        if (!$renewalRequest->isPending()) {
            return response()->json(['error' => 'Renewal request is not pending'], 400);
        }

        // Calculate price with discount if applicable
        $priceInfo = $this->subscriptionService->calculatePrice(
            $renewalRequest->requested_plan_id,
            $renewalRequest->additional_schools,
            $renewalRequest->discountCode?->code,
            $request->currency,
            $profile->organization_id
        );

        $subscription = $this->subscriptionService->getCurrentSubscription($profile->organization_id);

        $paymentRecord = PaymentRecord::create([
            'organization_id' => $profile->organization_id,
            'subscription_id' => $subscription?->id,
            'amount' => $request->amount,
            'currency' => $request->currency,
            'payment_method' => $request->payment_method,
            'payment_reference' => $request->payment_reference,
            'payment_date' => $request->payment_date,
            'period_start' => now()->toDateString(),
            'period_end' => now()->addYear()->toDateString(),
            'status' => PaymentRecord::STATUS_PENDING,
            'discount_code_id' => $renewalRequest->discount_code_id,
            'discount_amount' => $priceInfo['discount_amount'],
            'notes' => $request->notes,
        ]);

        return response()->json([
            'data' => $paymentRecord,
            'message' => 'Payment submitted successfully. Awaiting confirmation.',
        ], 201);
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
