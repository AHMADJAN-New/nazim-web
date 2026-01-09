<?php

namespace App\Services\Subscription;

use App\Models\OrganizationSubscription;
use App\Models\PaymentRecord;
use App\Models\SubscriptionHistory;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class LicenseFeeService
{
    public function __construct(
        private SubscriptionService $subscriptionService
    ) {}

    /**
     * Record a license fee payment
     */
    public function recordLicensePayment(
        OrganizationSubscription $subscription,
        float $amount,
        string $currency,
        string $paymentMethod,
        ?string $paymentReference = null,
        ?string $discountCodeId = null,
        float $discountAmount = 0,
        ?string $notes = null
    ): PaymentRecord {
        return DB::transaction(function () use (
            $subscription, $amount, $currency, $paymentMethod, 
            $paymentReference, $discountCodeId, $discountAmount, $notes
        ) {
            // Create payment record
            $payment = PaymentRecord::create([
                'organization_id' => $subscription->organization_id,
                'subscription_id' => $subscription->id,
                'amount' => $amount,
                'currency' => $currency,
                'payment_method' => $paymentMethod,
                'payment_reference' => $paymentReference,
                'payment_date' => Carbon::now(),
                'status' => PaymentRecord::STATUS_PENDING,
                'payment_type' => PaymentRecord::TYPE_LICENSE,
                'billing_period' => 'one_time', // License is always one-time
                'is_recurring' => false,
                'discount_code_id' => $discountCodeId,
                'discount_amount' => $discountAmount,
                'notes' => $notes,
            ]);
            
            return $payment;
        });
    }

    /**
     * Confirm a license payment and update subscription
     */
    public function confirmLicensePayment(
        PaymentRecord $payment,
        string $confirmedBy
    ): PaymentRecord {
        return DB::transaction(function () use ($payment, $confirmedBy) {
            // Update payment status
            $payment->update([
                'status' => PaymentRecord::STATUS_CONFIRMED,
                'confirmed_by' => $confirmedBy,
                'confirmed_at' => Carbon::now(),
            ]);
            
            // Update subscription license tracking
            $subscription = $payment->subscription;
            if ($subscription) {
                $subscription->markLicensePaid($payment->id);
                
                // Log history
                SubscriptionHistory::create([
                    'organization_id' => $subscription->organization_id,
                    'subscription_id' => $subscription->id,
                    'action' => 'license_paid',
                    'from_status' => $subscription->status,
                    'to_status' => $subscription->status,
                    'performed_by' => $confirmedBy,
                    'notes' => "License fee paid: {$payment->currency} {$payment->amount}",
                    'metadata' => [
                        'payment_id' => $payment->id,
                        'amount' => $payment->amount,
                        'currency' => $payment->currency,
                    ],
                ]);
            }
            
            return $payment;
        });
    }

    /**
     * Check if organization has paid the license fee
     */
    public function checkLicenseStatus(string $organizationId): array
    {
        $subscription = $this->subscriptionService->getCurrentSubscription($organizationId);
        
        if (!$subscription) {
            return [
                'has_subscription' => false,
                'license_required' => false,
                'license_paid' => false,
            ];
        }
        
        $plan = $subscription->plan;
        $hasLicenseFee = $plan && $plan->hasLicenseFee();
        $licensePaid = $subscription->hasLicensePaid();
        
        return [
            'has_subscription' => true,
            'subscription_id' => $subscription->id,
            'license_required' => $hasLicenseFee,
            'license_paid' => $licensePaid,
            'license_paid_at' => $subscription->license_paid_at,
            'license_payment_id' => $subscription->license_payment_id,
            'license_pending' => $hasLicenseFee && !$licensePaid,
            'license_amount' => $hasLicenseFee ? $plan->getLicenseFee($subscription->currency ?? 'AFN') : 0,
            'currency' => $subscription->currency ?? 'AFN',
        ];
    }

    /**
     * Get license payment history for an organization
     */
    public function getLicensePaymentHistory(string $organizationId): Collection
    {
        return PaymentRecord::where('organization_id', $organizationId)
            ->licensePayments()
            ->orderBy('payment_date', 'desc')
            ->get();
    }

    /**
     * Get all organizations with unpaid license fees (platform-wide)
     */
    public function getUnpaidLicenseFees(): Collection
    {
        return OrganizationSubscription::with(['plan', 'organization'])
            ->licenseUnpaid()
            ->whereIn('status', [
                OrganizationSubscription::STATUS_TRIAL,
                OrganizationSubscription::STATUS_ACTIVE,
                OrganizationSubscription::STATUS_GRACE_PERIOD,
            ])
            ->orderBy('created_at')
            ->get()
            ->map(function ($subscription) {
                $plan = $subscription->plan;
                return [
                    'subscription_id' => $subscription->id,
                    'organization_id' => $subscription->organization_id,
                    'organization_name' => $subscription->organization?->name,
                    'plan_name' => $plan?->name,
                    'license_amount_afn' => $plan?->getLicenseFee('AFN') ?? 0,
                    'license_amount_usd' => $plan?->getLicenseFee('USD') ?? 0,
                    'currency' => $subscription->currency ?? 'AFN',
                    'status' => $subscription->status,
                    'started_at' => $subscription->started_at,
                ];
            });
    }

    /**
     * Calculate the license fee for a subscription
     */
    public function calculateLicenseFee(OrganizationSubscription $subscription, string $currency = 'AFN'): float
    {
        $plan = $subscription->plan;
        if (!$plan) {
            return 0;
        }
        
        return $plan->getLicenseFee($currency);
    }

    /**
     * Get pending license payments for an organization
     */
    public function getPendingLicensePayments(string $organizationId): Collection
    {
        return PaymentRecord::where('organization_id', $organizationId)
            ->licensePayments()
            ->pending()
            ->orderBy('payment_date', 'desc')
            ->get();
    }

    /**
     * Get confirmed license payments for an organization
     */
    public function getConfirmedLicensePayments(string $organizationId): Collection
    {
        return PaymentRecord::where('organization_id', $organizationId)
            ->licensePayments()
            ->confirmed()
            ->orderBy('payment_date', 'desc')
            ->get();
    }
}


