<?php

namespace App\Http\Controllers;

use App\Models\MaintenanceInvoice;
use App\Models\PaymentRecord;
use App\Services\Subscription\MaintenanceFeeService;
use App\Services\Subscription\SubscriptionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class MaintenanceFeeController extends Controller
{
    public function __construct(
        private MaintenanceFeeService $maintenanceFeeService,
        private SubscriptionService $subscriptionService
    ) {}

    /**
     * Get maintenance fee status for the current organization
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
            $status = $this->maintenanceFeeService->getMaintenanceFeeStatus($profile->organization_id);

            return response()->json([
                'data' => $status,
            ]);
        } catch (\Exception $e) {
            Log::error("Failed to get maintenance fee status: " . $e->getMessage());
            return response()->json(['error' => 'Failed to get maintenance fee status'], 500);
        }
    }

    /**
     * Get upcoming maintenance fees for the current organization
     */
    public function upcoming(Request $request)
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
            $days = $request->input('days', 90);
            $upcoming = $this->maintenanceFeeService->getUpcomingMaintenance($profile->organization_id, $days);

            return response()->json([
                'data' => $upcoming,
            ]);
        } catch (\Exception $e) {
            Log::error("Failed to get upcoming maintenance fees: " . $e->getMessage());
            return response()->json(['error' => 'Failed to get upcoming maintenance fees'], 500);
        }
    }

    /**
     * Get maintenance invoices for the current organization
     */
    public function invoices(Request $request)
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
            $status = $request->input('status');
            $invoices = $this->maintenanceFeeService->getMaintenanceInvoices($profile->organization_id, $status);

            return response()->json([
                'data' => $invoices->map(function ($invoice) {
                    return [
                        'id' => $invoice->id,
                        'invoice_number' => $invoice->invoice_number,
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
                        'payment_record_id' => $invoice->payment_record_id,
                        'notes' => $invoice->notes,
                    ];
                }),
            ]);
        } catch (\Exception $e) {
            Log::error("Failed to get maintenance invoices: " . $e->getMessage());
            return response()->json(['error' => 'Failed to get maintenance invoices'], 500);
        }
    }

    /**
     * Get a specific maintenance invoice
     */
    public function showInvoice(Request $request, string $id)
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
            $invoice = MaintenanceInvoice::where('id', $id)
                ->where('organization_id', $profile->organization_id)
                ->with(['subscription.plan', 'paymentRecord'])
                ->first();

            if (!$invoice) {
                return response()->json(['error' => 'Invoice not found'], 404);
            }

            return response()->json([
                'data' => [
                    'id' => $invoice->id,
                    'invoice_number' => $invoice->invoice_number,
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
                    'sent_at' => $invoice->sent_at?->toISOString(),
                    'paid_at' => $invoice->paid_at?->toISOString(),
                    'cancelled_at' => $invoice->cancelled_at?->toISOString(),
                    'payment_record_id' => $invoice->payment_record_id,
                    'notes' => $invoice->notes,
                    'subscription' => $invoice->subscription ? [
                        'id' => $invoice->subscription->id,
                        'plan_name' => $invoice->subscription->plan?->name,
                    ] : null,
                    'payment' => $invoice->paymentRecord ? [
                        'id' => $invoice->paymentRecord->id,
                        'amount' => $invoice->paymentRecord->amount,
                        'currency' => $invoice->paymentRecord->currency,
                        'payment_method' => $invoice->paymentRecord->payment_method,
                        'payment_date' => $invoice->paymentRecord->payment_date?->toDateString(),
                        'status' => $invoice->paymentRecord->status,
                    ] : null,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error("Failed to get maintenance invoice: " . $e->getMessage());
            return response()->json(['error' => 'Failed to get maintenance invoice'], 500);
        }
    }

    /**
     * Submit a maintenance fee payment
     */
    public function submitPayment(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'invoice_id' => 'nullable|uuid|exists:maintenance_invoices,id',
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

            // If invoice_id provided, validate it belongs to this organization
            $invoiceId = null;
            if ($request->invoice_id) {
                $invoice = MaintenanceInvoice::where('id', $request->invoice_id)
                    ->where('organization_id', $profile->organization_id)
                    ->first();

                if (!$invoice) {
                    return response()->json(['error' => 'Invoice not found'], 404);
                }

                if (!$invoice->isPending()) {
                    return response()->json(['error' => 'Invoice is not pending payment'], 400);
                }

                $invoiceId = $invoice->id;
            }

            // Record the payment
            $payment = $this->maintenanceFeeService->recordMaintenancePayment(
                $subscription,
                $request->amount,
                $request->currency,
                $request->payment_method,
                $request->payment_reference,
                $invoiceId,
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
                    'period_start' => $payment->period_start?->toDateString(),
                    'period_end' => $payment->period_end?->toDateString(),
                    'status' => $payment->status,
                    'payment_type' => $payment->payment_type,
                    'billing_period' => $payment->billing_period,
                    'is_recurring' => $payment->is_recurring,
                    'invoice_number' => $payment->invoice_number,
                ],
                'message' => 'Maintenance fee payment submitted successfully. Awaiting confirmation.',
            ], 201);
        } catch (\Exception $e) {
            Log::error("Failed to submit maintenance fee payment: " . $e->getMessage());
            return response()->json(['error' => 'Failed to submit payment: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Get maintenance payment history for the current organization
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
            $payments = PaymentRecord::where('organization_id', $profile->organization_id)
                ->where('payment_type', PaymentRecord::TYPE_MAINTENANCE)
                ->orderBy('payment_date', 'desc')
                ->get();

            return response()->json([
                'data' => $payments->map(function ($payment) {
                    return [
                        'id' => $payment->id,
                        'amount' => $payment->amount,
                        'currency' => $payment->currency,
                        'payment_method' => $payment->payment_method,
                        'payment_reference' => $payment->payment_reference,
                        'payment_date' => $payment->payment_date?->toDateString(),
                        'period_start' => $payment->period_start?->toDateString(),
                        'period_end' => $payment->period_end?->toDateString(),
                        'status' => $payment->status,
                        'payment_type' => $payment->payment_type,
                        'billing_period' => $payment->billing_period,
                        'is_recurring' => $payment->is_recurring,
                        'invoice_number' => $payment->invoice_number,
                        'confirmed_at' => $payment->confirmed_at?->toISOString(),
                        'notes' => $payment->notes,
                    ];
                }),
            ]);
        } catch (\Exception $e) {
            Log::error("Failed to get maintenance payment history: " . $e->getMessage());
            return response()->json(['error' => 'Failed to get payment history'], 500);
        }
    }
}

