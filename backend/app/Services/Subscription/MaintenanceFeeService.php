<?php

namespace App\Services\Subscription;

use App\Models\MaintenanceInvoice;
use App\Models\Organization;
use App\Models\OrganizationSubscription;
use App\Models\PaymentRecord;
use App\Models\SubscriptionHistory;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class MaintenanceFeeService
{
    public function __construct(
        private SubscriptionService $subscriptionService
    ) {}

    /**
     * Generate maintenance invoices for all subscriptions that are due
     * 
     * @param int $daysBeforeDue Generate invoices this many days before due date
     * @return Collection Collection of generated invoices
     */
    public function generateInvoices(int $daysBeforeDue = 30): Collection
    {
        $generatedInvoices = collect();
        
        // Find subscriptions with maintenance due soon that don't have pending invoices
        $subscriptions = OrganizationSubscription::with(['plan', 'organization'])
            ->whereIn('status', [
                OrganizationSubscription::STATUS_ACTIVE,
                OrganizationSubscription::STATUS_GRACE_PERIOD,
            ])
            ->whereNotNull('next_maintenance_due_at')
            ->where('next_maintenance_due_at', '<=', Carbon::now()->addDays($daysBeforeDue))
            ->get();
        
        foreach ($subscriptions as $subscription) {
            // Check if there's already a pending invoice for this period
            $existingInvoice = MaintenanceInvoice::where('subscription_id', $subscription->id)
                ->whereIn('status', [MaintenanceInvoice::STATUS_PENDING, MaintenanceInvoice::STATUS_SENT])
                ->where('period_start', '>=', $subscription->last_maintenance_paid_at ?? $subscription->started_at)
                ->first();
            
            if ($existingInvoice) {
                continue; // Skip - invoice already exists
            }
            
            try {
                $invoice = $this->generateInvoiceForSubscription($subscription);
                if ($invoice) {
                    $generatedInvoices->push($invoice);
                }
            } catch (\Exception $e) {
                Log::error("Failed to generate maintenance invoice for subscription {$subscription->id}: " . $e->getMessage());
            }
        }
        
        return $generatedInvoices;
    }

    /**
     * Generate a maintenance invoice for a specific subscription
     */
    public function generateInvoiceForSubscription(OrganizationSubscription $subscription): ?MaintenanceInvoice
    {
        $plan = $subscription->plan;
        if (!$plan || !$plan->hasMaintenanceFee()) {
            return null;
        }
        
        $currency = $subscription->currency ?? 'AFN';
        $amount = $this->calculateMaintenanceAmount($subscription, $currency);
        
        if ($amount <= 0) {
            return null;
        }
        
        $periodStart = $subscription->last_maintenance_paid_at ?? $subscription->started_at ?? Carbon::now();
        $periodEnd = $subscription->calculateNextMaintenanceDueDate($periodStart);
        $dueDate = $subscription->next_maintenance_due_at ?? $periodEnd;
        
        return MaintenanceInvoice::create([
            'organization_id' => $subscription->organization_id,
            'subscription_id' => $subscription->id,
            'amount' => $amount,
            'currency' => $currency,
            'billing_period' => $subscription->billing_period ?? 'yearly',
            'period_start' => $periodStart,
            'period_end' => $periodEnd,
            'due_date' => $dueDate,
            'status' => MaintenanceInvoice::STATUS_PENDING,
            'generated_at' => Carbon::now(),
        ]);
    }

    /**
     * Calculate the maintenance fee amount for a subscription
     */
    public function calculateMaintenanceAmount(OrganizationSubscription $subscription, string $currency = 'AFN'): float
    {
        $plan = $subscription->plan;
        if (!$plan) {
            return 0;
        }
        
        return $plan->getTotalMaintenanceFee($currency, $subscription->additional_schools ?? 0);
    }

    /**
     * Record a maintenance fee payment
     */
    public function recordMaintenancePayment(
        OrganizationSubscription $subscription,
        float $amount,
        string $currency,
        string $paymentMethod,
        ?string $paymentReference = null,
        ?string $invoiceId = null,
        ?string $discountCodeId = null,
        float $discountAmount = 0,
        ?string $notes = null
    ): PaymentRecord {
        return DB::transaction(function () use (
            $subscription, $amount, $currency, $paymentMethod, 
            $paymentReference, $invoiceId, $discountCodeId, $discountAmount, $notes
        ) {
            $periodStart = $subscription->next_maintenance_due_at ?? Carbon::now();
            $periodEnd = $subscription->calculateNextMaintenanceDueDate($periodStart);
            
            // Create payment record
            $payment = PaymentRecord::create([
                'organization_id' => $subscription->organization_id,
                'subscription_id' => $subscription->id,
                'amount' => $amount,
                'currency' => $currency,
                'payment_method' => $paymentMethod,
                'payment_reference' => $paymentReference,
                'payment_date' => Carbon::now(),
                'period_start' => $periodStart,
                'period_end' => $periodEnd,
                'status' => PaymentRecord::STATUS_PENDING,
                'payment_type' => PaymentRecord::TYPE_MAINTENANCE,
                'billing_period' => $subscription->billing_period ?? 'yearly',
                'is_recurring' => true,
                'maintenance_invoice_id' => $invoiceId,
                'discount_code_id' => $discountCodeId,
                'discount_amount' => $discountAmount,
                'notes' => $notes,
            ]);
            
            return $payment;
        });
    }

    /**
     * Confirm a maintenance payment and update subscription
     */
    public function confirmMaintenancePayment(
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
            
            // Update subscription maintenance tracking
            $subscription = $payment->subscription;
            if ($subscription) {
                $subscription->updateNextMaintenanceDueDate();
                
                // If subscription was in grace period due to overdue maintenance, reactivate
                if ($subscription->status === OrganizationSubscription::STATUS_GRACE_PERIOD) {
                    $subscription->update(['status' => OrganizationSubscription::STATUS_ACTIVE]);
                }
                
                // Log history
                SubscriptionHistory::create([
                    'organization_id' => $subscription->organization_id,
                    'subscription_id' => $subscription->id,
                    'action' => 'maintenance_paid',
                    'from_status' => $subscription->status,
                    'to_status' => $subscription->status,
                    'performed_by' => $confirmedBy,
                    'notes' => "Maintenance fee paid: {$payment->currency} {$payment->amount}",
                    'metadata' => [
                        'payment_id' => $payment->id,
                        'amount' => $payment->amount,
                        'currency' => $payment->currency,
                        'billing_period' => $payment->billing_period,
                    ],
                ]);
            }
            
            // Update invoice if linked
            if ($payment->maintenance_invoice_id) {
                $invoice = MaintenanceInvoice::find($payment->maintenance_invoice_id);
                if ($invoice) {
                    $invoice->markAsPaid($payment->id);
                }
            }
            
            return $payment;
        });
    }

    /**
     * Get upcoming maintenance fees for an organization
     */
    public function getUpcomingMaintenance(string $organizationId, int $days = 90): Collection
    {
        return OrganizationSubscription::with(['plan'])
            ->where('organization_id', $organizationId)
            ->whereIn('status', [
                OrganizationSubscription::STATUS_ACTIVE,
                OrganizationSubscription::STATUS_GRACE_PERIOD,
            ])
            ->whereNotNull('next_maintenance_due_at')
            ->where('next_maintenance_due_at', '<=', Carbon::now()->addDays($days))
            ->orderBy('next_maintenance_due_at')
            ->get()
            ->map(function ($subscription) {
                return [
                    'subscription_id' => $subscription->id,
                    'organization_id' => $subscription->organization_id,
                    'plan_name' => $subscription->plan?->name,
                    'billing_period' => $subscription->billing_period,
                    'next_due_date' => $subscription->next_maintenance_due_at,
                    'days_until_due' => $subscription->daysUntilMaintenanceDue(),
                    'is_overdue' => $subscription->isMaintenanceOverdue(),
                    'amount' => $this->calculateMaintenanceAmount($subscription, $subscription->currency ?? 'AFN'),
                    'currency' => $subscription->currency ?? 'AFN',
                ];
            });
    }

    /**
     * Get overdue maintenance fees (platform-wide)
     */
    public function getOverdueMaintenance(): Collection
    {
        return OrganizationSubscription::with(['plan', 'organization'])
            ->maintenanceOverdue()
            ->orderBy('next_maintenance_due_at')
            ->get()
            ->map(function ($subscription) {
                return [
                    'subscription_id' => $subscription->id,
                    'organization_id' => $subscription->organization_id,
                    'organization_name' => $subscription->organization?->name,
                    'plan_name' => $subscription->plan?->name,
                    'billing_period' => $subscription->billing_period,
                    'due_date' => $subscription->next_maintenance_due_at,
                    'days_overdue' => $subscription->daysMaintenanceOverdue(),
                    'amount' => $this->calculateMaintenanceAmount($subscription, $subscription->currency ?? 'AFN'),
                    'currency' => $subscription->currency ?? 'AFN',
                    'status' => $subscription->status,
                ];
            });
    }

    /**
     * Get maintenance fee status for an organization
     */
    public function getMaintenanceFeeStatus(string $organizationId): array
    {
        $subscription = $this->subscriptionService->getCurrentSubscription($organizationId);
        
        if (!$subscription) {
            return [
                'has_subscription' => false,
                'maintenance_required' => false,
            ];
        }
        
        $plan = $subscription->plan;
        $hasMaintenanceFee = $plan && $plan->hasMaintenanceFee();
        
        return [
            'has_subscription' => true,
            'subscription_id' => $subscription->id,
            'maintenance_required' => $hasMaintenanceFee,
            'billing_period' => $subscription->billing_period,
            'billing_period_label' => $subscription->getBillingPeriodLabel(),
            'next_due_date' => $subscription->next_maintenance_due_at,
            'last_paid_date' => $subscription->last_maintenance_paid_at,
            'is_overdue' => $subscription->isMaintenanceOverdue(),
            'days_until_due' => $subscription->daysUntilMaintenanceDue(),
            'days_overdue' => $subscription->daysMaintenanceOverdue(),
            'amount' => $hasMaintenanceFee ? $this->calculateMaintenanceAmount($subscription, $subscription->currency ?? 'AFN') : 0,
            'currency' => $subscription->currency ?? 'AFN',
        ];
    }

    /**
     * Get maintenance invoices for an organization
     */
    public function getMaintenanceInvoices(string $organizationId, ?string $status = null): Collection
    {
        $query = MaintenanceInvoice::where('organization_id', $organizationId)
            ->orderBy('due_date', 'desc');
        
        if ($status) {
            $query->where('status', $status);
        }
        
        return $query->get();
    }

    /**
     * Update overdue invoices status
     */
    public function updateOverdueInvoices(): int
    {
        $updated = 0;
        
        $overdueInvoices = MaintenanceInvoice::whereIn('status', [
            MaintenanceInvoice::STATUS_PENDING,
            MaintenanceInvoice::STATUS_SENT,
        ])
            ->where('due_date', '<', Carbon::now())
            ->get();
        
        foreach ($overdueInvoices as $invoice) {
            $invoice->markAsOverdue();
            $updated++;
        }
        
        return $updated;
    }
}

