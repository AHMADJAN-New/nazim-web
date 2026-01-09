<?php

namespace App\Http\Controllers;

use App\Models\PaymentRecord;
use App\Services\Subscription\LicenseFeeService;
use App\Services\Subscription\SubscriptionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class LicenseFeeController extends Controller
{
    public function __construct(
        private LicenseFeeService $licenseFeeService,
        private SubscriptionService $subscriptionService
    ) {}

    /**
     * Get license fee status for the current organization
     */
    public function status(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission
        try {
            if (!$user->hasPermissionTo('subscription.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subscription.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        try {
            $status = $this->licenseFeeService->checkLicenseStatus($profile->organization_id);

            return response()->json([
                'data' => $status,
            ]);
        } catch (\Exception $e) {
            Log::error("Failed to get license fee status: " . $e->getMessage());
            return response()->json(['error' => 'Failed to get license fee status'], 500);
        }
    }

    /**
     * Submit a license fee payment
     */
    public function submitPayment(Request $request)
    {
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

        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission
        try {
            if (!$user->hasPermissionTo('subscription.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subscription.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        try {
            // Get current subscription
            $subscription = $this->subscriptionService->getCurrentSubscription($profile->organization_id);

            if (!$subscription) {
                return response()->json(['error' => 'No active subscription found'], 400);
            }

            // Check if license is already paid
            if ($subscription->hasLicensePaid()) {
                return response()->json(['error' => 'License fee has already been paid'], 400);
            }

            // Check if there's a pending license payment
            $pendingPayments = $this->licenseFeeService->getPendingLicensePayments($profile->organization_id);
            if ($pendingPayments->isNotEmpty()) {
                return response()->json([
                    'error' => 'There is already a pending license fee payment awaiting confirmation',
                    'pending_payment_id' => $pendingPayments->first()->id,
                ], 400);
            }

            // Record the payment
            $payment = $this->licenseFeeService->recordLicensePayment(
                $subscription,
                $request->amount,
                $request->currency,
                $request->payment_method,
                $request->payment_reference,
                null, // discount_code_id
                0,    // discount_amount
                $request->notes
            );

            return response()->json([
                'data' => [
                    'id' => $payment->id,
                    'amount' => $payment->amount,
                    'currency' => $payment->currency,
                    'payment_method' => $payment->payment_method,
                    'payment_reference' => $payment->payment_reference,
                    'payment_date' => $payment->payment_date?->toDateString(),
                    'status' => $payment->status,
                    'payment_type' => $payment->payment_type,
                    'billing_period' => $payment->billing_period,
                    'is_recurring' => $payment->is_recurring,
                ],
                'message' => 'License fee payment submitted successfully. Awaiting confirmation.',
            ], 201);
        } catch (\Exception $e) {
            Log::error("Failed to submit license fee payment: " . $e->getMessage());
            return response()->json(['error' => 'Failed to submit payment: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Get license payment history for the current organization
     */
    public function paymentHistory(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission
        try {
            if (!$user->hasPermissionTo('subscription.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subscription.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        try {
            $payments = $this->licenseFeeService->getLicensePaymentHistory($profile->organization_id);

            return response()->json([
                'data' => $payments->map(function ($payment) {
                    return [
                        'id' => $payment->id,
                        'amount' => $payment->amount,
                        'currency' => $payment->currency,
                        'payment_method' => $payment->payment_method,
                        'payment_reference' => $payment->payment_reference,
                        'payment_date' => $payment->payment_date?->toDateString(),
                        'status' => $payment->status,
                        'payment_type' => $payment->payment_type,
                        'billing_period' => $payment->billing_period,
                        'is_recurring' => $payment->is_recurring,
                        'confirmed_at' => $payment->confirmed_at?->toISOString(),
                        'notes' => $payment->notes,
                    ];
                }),
            ]);
        } catch (\Exception $e) {
            Log::error("Failed to get license payment history: " . $e->getMessage());
            return response()->json(['error' => 'Failed to get payment history'], 500);
        }
    }
}


