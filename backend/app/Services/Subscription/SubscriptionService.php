<?php

namespace App\Services\Subscription;

use App\Models\DiscountCode;
use App\Models\DiscountCodeUsage;
use App\Models\Organization;
use App\Models\OrganizationFeatureAddon;
use App\Models\OrganizationLimitOverride;
use App\Models\OrganizationSubscription;
use App\Models\PaymentRecord;
use App\Models\PlanFeature;
use App\Models\RenewalRequest;
use App\Models\SubscriptionHistory;
use App\Models\SubscriptionPlan;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class SubscriptionService
{
    /**
     * Lock the organization row to serialize subscription state changes.
     */
    private function lockOrganizationForUpdate(string $organizationId): void
    {
        Organization::where('id', $organizationId)->lockForUpdate()->first();
    }

    /**
     * Get current subscription row locked for update.
     * Must be called inside a DB transaction.
     */
    private function getCurrentSubscriptionLocked(string $organizationId): ?OrganizationSubscription
    {
        return OrganizationSubscription::where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->orderBy('created_at', 'desc')
            ->lockForUpdate()
            ->first();
    }

    /**
     * Get the current subscription for an organization
     */
    public function getCurrentSubscription(string $organizationId): ?OrganizationSubscription
    {
        return OrganizationSubscription::where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->orderBy('created_at', 'desc')
            ->first();
    }

    /**
     * Get the current plan for an organization
     */
    public function getCurrentPlan(string $organizationId): ?SubscriptionPlan
    {
        try {
            $subscription = $this->getCurrentSubscription($organizationId);
            if (!$subscription) {
                return null;
            }
            
            // Load plan relationship if not already loaded
            if (!$subscription->relationLoaded('plan')) {
                $subscription->load('plan');
            }
            
            return $subscription->plan;
        } catch (\Exception $e) {
            \Log::warning("Failed to get current plan for organization {$organizationId}: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Create a trial subscription for a new organization
     */
    public function createTrialSubscription(string $organizationId, ?string $performedBy = null): OrganizationSubscription
    {
        $trialPlan = SubscriptionPlan::where('slug', 'trial')
            ->where('is_active', true)
            ->first();

        if (!$trialPlan) {
            throw new \Exception('Trial plan not found. Please run the subscription seeder.');
        }

        $trialDays = $trialPlan->trial_days ?: 7;
        $trialEndsAt = Carbon::now()->addDays($trialDays);

        $subscription = OrganizationSubscription::create([
            'organization_id' => $organizationId,
            'plan_id' => $trialPlan->id,
            'status' => OrganizationSubscription::STATUS_TRIAL,
            'started_at' => now(),
            'trial_ends_at' => $trialEndsAt,
            'expires_at' => $trialEndsAt,
            'currency' => 'AFN',
        ]);

        SubscriptionHistory::log(
            $organizationId,
            SubscriptionHistory::ACTION_TRIAL_STARTED,
            $subscription->id,
            null,
            $trialPlan->id,
            null,
            OrganizationSubscription::STATUS_TRIAL,
            $performedBy,
            "Trial started for {$trialDays} days"
        );

        return $subscription;
    }

    /**
     * Activate a subscription (after payment confirmation)
     */
    public function activateSubscription(
        string $organizationId,
        string $planId,
        string $currency = 'AFN',
        float $amountPaid = 0,
        int $additionalSchools = 0,
        ?string $performedBy = null,
        ?string $notes = null,
        bool $licensePaid = false,
        ?string $licensePaymentId = null
    ): OrganizationSubscription {
        return DB::transaction(function () use (
            $organizationId,
            $planId,
            $currency,
            $amountPaid,
            $additionalSchools,
            $performedBy,
            $notes,
            $licensePaid,
            $licensePaymentId
        ) {
            return $this->activateSubscriptionInTransaction(
                $organizationId,
                $planId,
                $currency,
                $amountPaid,
                $additionalSchools,
                $performedBy,
                $notes,
                $licensePaid,
                $licensePaymentId
            );
        }, 3);
    }

    /**
     * Internal activation implementation.
     * Must be called inside a DB transaction.
     */
    private function activateSubscriptionInTransaction(
        string $organizationId,
        string $planId,
        string $currency = 'AFN',
        float $amountPaid = 0,
        int $additionalSchools = 0,
        ?string $performedBy = null,
        ?string $notes = null,
        bool $licensePaid = false,
        ?string $licensePaymentId = null
    ): OrganizationSubscription {
        $this->lockOrganizationForUpdate($organizationId);

        $plan = SubscriptionPlan::findOrFail($planId);
        if (!$plan->is_active) {
            throw new \Exception('Selected plan is not active');
        }
        $currentSubscription = $this->getCurrentSubscriptionLocked($organizationId);

        $startsAt = now();
        
        // Calculate expiry based on billing period
        $billingPeriodDays = $plan->getBillingPeriodDays();
        $expiresAt = Carbon::now()->addDays($billingPeriodDays);

        // Determine action type
        $action = SubscriptionHistory::ACTION_ACTIVATED;
        $fromPlanId = null;
        $fromStatus = null;
        $lockedFeatures = [];
        $metadata = $currentSubscription?->metadata ?? [];

        if ($currentSubscription) {
            $fromPlanId = $currentSubscription->plan_id;
            $fromStatus = $currentSubscription->status;

            if ($currentSubscription->plan_id !== $planId) {
                if (!$currentSubscription->relationLoaded('plan')) {
                    $currentSubscription->load('plan');
                }
                $currentPlan = $currentSubscription->plan;
                // Compare total costs (license + maintenance) for upgrade/downgrade determination
                $newTotalCost = $plan->getTotalInitialCost($currency, $additionalSchools);
                $currentTotalCost = $currentPlan ? $currentPlan->getTotalInitialCost($currency, $currentSubscription->additional_schools ?? 0) : 0;
                
                if ($currentPlan && $newTotalCost > $currentTotalCost) {
                    $action = SubscriptionHistory::ACTION_UPGRADED;
                } elseif ($currentPlan && $newTotalCost < $currentTotalCost) {
                    $action = SubscriptionHistory::ACTION_DOWNGRADED;
                }

                if ($action === SubscriptionHistory::ACTION_DOWNGRADED && $currentPlan) {
                    $lockedFeatures = $this->getRemovedFeaturesForDowngrade($organizationId, $currentPlan, $plan);
                    if (!empty($lockedFeatures)) {
                        $metadata['locked_features'] = $lockedFeatures;
                        $metadata['locked_at'] = now()->toISOString();
                        $metadata['locked_reason'] = 'plan_downgrade';
                    }
                } else {
                    unset($metadata['locked_features'], $metadata['locked_at'], $metadata['locked_reason']);
                }
            } elseif (in_array($currentSubscription->status, [
                OrganizationSubscription::STATUS_PENDING_RENEWAL,
                OrganizationSubscription::STATUS_GRACE_PERIOD,
                OrganizationSubscription::STATUS_READONLY,
                OrganizationSubscription::STATUS_EXPIRED,
            ])) {
                $action = SubscriptionHistory::ACTION_RENEWED;
            }

            // Soft delete old subscription
            $currentSubscription->delete();
        }

        // Calculate next maintenance due date
        $nextMaintenanceDueAt = Carbon::now()->addDays($billingPeriodDays);

        $subscription = OrganizationSubscription::create([
            'organization_id' => $organizationId,
            'plan_id' => $planId,
            'status' => OrganizationSubscription::STATUS_ACTIVE,
            'started_at' => $startsAt,
            'expires_at' => $expiresAt,
            'currency' => $currency,
            'amount_paid' => $amountPaid,
            'additional_schools' => $additionalSchools,
            'notes' => $notes,
            'metadata' => !empty($metadata) ? $metadata : null,
            // New billing fields
            'billing_period' => $plan->billing_period ?? 'yearly',
            'next_maintenance_due_at' => $nextMaintenanceDueAt,
            'last_maintenance_paid_at' => $startsAt,
            'license_paid_at' => $licensePaid ? $startsAt : null,
            'license_payment_id' => $licensePaymentId,
        ]);

        SubscriptionHistory::log(
            $organizationId,
            $action,
            $subscription->id,
            $fromPlanId,
            $planId,
            $fromStatus,
            OrganizationSubscription::STATUS_ACTIVE,
            $performedBy,
            $notes
        );

        // Invalidate org-scoped entitlement caches
        Cache::forget("subscription:enabled-features:v1:{$organizationId}");

        return $subscription;
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

    private function getRemovedFeaturesForDowngrade(
        string $organizationId,
        SubscriptionPlan $fromPlan,
        SubscriptionPlan $toPlan
    ): array {
        $fromFeatures = $this->getPlanFeatureKeysWithInheritance($fromPlan);
        $toFeatures = $this->getPlanFeatureKeysWithInheritance($toPlan);

        $removed = array_values(array_diff($fromFeatures, $toFeatures));

        if (empty($removed)) {
            return [];
        }

        $addonFeatures = OrganizationFeatureAddon::where('organization_id', $organizationId)
            ->where('is_enabled', true)
            ->whereNull('deleted_at')
            ->where(function ($q) {
                $q->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            })
            ->pluck('feature_key')
            ->toArray();

        return array_values(array_diff($removed, $addonFeatures));
    }

    /**
     * Process subscription status transitions
     */
    public function processSubscriptionStatusTransitions(): array
    {
        return DB::transaction(function () {
            $processed = [
                'to_grace_period' => 0,
                'to_readonly' => 0,
                'to_expired' => 0,
            ];

            // Trial/Active → Grace Period (expired but within grace period)
            $toGracePeriod = OrganizationSubscription::with('plan')
                ->whereIn('status', [
                    OrganizationSubscription::STATUS_TRIAL,
                    OrganizationSubscription::STATUS_ACTIVE,
                    OrganizationSubscription::STATUS_PENDING_RENEWAL,
                ])
                ->where('expires_at', '<', now())
                ->whereNull('deleted_at')
                ->lockForUpdate()
                ->get();

            foreach ($toGracePeriod as $subscription) {
                $oldStatus = $subscription->status;
                $plan = $subscription->plan;
                $gracePeriodDays = $plan ? $plan->grace_period_days : 14;

                $subscription->update([
                    'status' => OrganizationSubscription::STATUS_GRACE_PERIOD,
                    'grace_period_ends_at' => Carbon::now()->addDays($gracePeriodDays),
                ]);

                SubscriptionHistory::log(
                    $subscription->organization_id,
                    SubscriptionHistory::ACTION_GRACE_PERIOD,
                    $subscription->id,
                    null,
                    null,
                    $oldStatus,
                    OrganizationSubscription::STATUS_GRACE_PERIOD,
                    null,
                    "Subscription entered {$gracePeriodDays}-day grace period"
                );

                $processed['to_grace_period']++;
            }

            // Grace Period → Readonly (grace period ended but within readonly period)
            $toReadonly = OrganizationSubscription::with('plan')
                ->where('status', OrganizationSubscription::STATUS_GRACE_PERIOD)
                ->where('grace_period_ends_at', '<', now())
                ->whereNull('deleted_at')
                ->lockForUpdate()
                ->get();

            foreach ($toReadonly as $subscription) {
                $plan = $subscription->plan;
                $readonlyPeriodDays = $plan ? $plan->readonly_period_days : 60;

                $subscription->update([
                    'status' => OrganizationSubscription::STATUS_READONLY,
                    'readonly_period_ends_at' => Carbon::now()->addDays($readonlyPeriodDays),
                ]);

                SubscriptionHistory::log(
                    $subscription->organization_id,
                    SubscriptionHistory::ACTION_READONLY,
                    $subscription->id,
                    null,
                    null,
                    OrganizationSubscription::STATUS_GRACE_PERIOD,
                    OrganizationSubscription::STATUS_READONLY,
                    null,
                    "Subscription entered {$readonlyPeriodDays}-day readonly period"
                );

                $processed['to_readonly']++;
            }

            // Readonly → Expired (readonly period ended)
            $toExpired = OrganizationSubscription::where('status', OrganizationSubscription::STATUS_READONLY)
                ->where('readonly_period_ends_at', '<', now())
                ->whereNull('deleted_at')
                ->lockForUpdate()
                ->get();

            foreach ($toExpired as $subscription) {
                $subscription->update([
                    'status' => OrganizationSubscription::STATUS_EXPIRED,
                ]);

                SubscriptionHistory::log(
                    $subscription->organization_id,
                    SubscriptionHistory::ACTION_EXPIRED,
                    $subscription->id,
                    null,
                    null,
                    OrganizationSubscription::STATUS_READONLY,
                    OrganizationSubscription::STATUS_EXPIRED,
                    null,
                    "Subscription expired after readonly period"
                );

                $processed['to_expired']++;
            }

            return $processed;
        }, 3);
    }

    /**
     * Create a renewal request
     */
    public function createRenewalRequest(
        string $organizationId,
        string $planId,
        int $additionalSchools = 0,
        ?string $discountCode = null,
        ?string $notes = null
    ): RenewalRequest {
        $subscription = $this->getCurrentSubscription($organizationId);
        
        if (!$subscription) {
            throw new \Exception('No active subscription found');
        }

        $plan = SubscriptionPlan::findOrFail($planId);
        if (!$plan->is_active) {
            throw new \Exception('Selected plan is not active');
        }

        $discountCodeId = null;
        if ($discountCode) {
            $code = DiscountCode::where('code', strtoupper($discountCode))->first();
            if ($code && $code->canBeUsedByOrganization($organizationId) && $code->appliesToPlan($planId)) {
                $discountCodeId = $code->id;
            }
        }

        return RenewalRequest::create([
            'organization_id' => $organizationId,
            'subscription_id' => $subscription->id,
            'requested_plan_id' => $planId,
            'additional_schools' => $additionalSchools,
            'discount_code_id' => $discountCodeId,
            'notes' => $notes,
        ]);
    }

    /**
     * Approve a renewal request
     */
    public function approveRenewalRequest(
        string $requestId,
        string $paymentRecordId,
        string $performedBy
    ): OrganizationSubscription {
        return DB::transaction(function () use ($requestId, $paymentRecordId, $performedBy) {
            $request = RenewalRequest::where('id', $requestId)->lockForUpdate()->firstOrFail();

            // Idempotency: if already approved with this payment, return the linked subscription.
            if ($request->status === RenewalRequest::STATUS_APPROVED) {
                if ($request->payment_record_id && $request->payment_record_id !== $paymentRecordId) {
                    throw new \Exception('Renewal request already approved with a different payment');
                }

                $paymentRecord = PaymentRecord::where('id', $paymentRecordId)->lockForUpdate()->firstOrFail();
                if ($paymentRecord->subscription_id) {
                    $existing = OrganizationSubscription::find($paymentRecord->subscription_id);
                    if ($existing) {
                        return $existing;
                    }
                }

                $current = $this->getCurrentSubscription($request->organization_id);
                if ($current) {
                    return $current;
                }
            }

            if (!$request->isPending()) {
                throw new \Exception('Renewal request is not pending');
            }

            $this->lockOrganizationForUpdate($request->organization_id);

            $paymentRecord = PaymentRecord::where('id', $paymentRecordId)->lockForUpdate()->firstOrFail();

            if ($paymentRecord->organization_id !== $request->organization_id) {
                throw new \Exception('Payment does not belong to this organization');
            }

            if ($paymentRecord->isRejected()) {
                throw new \Exception('Payment was rejected');
            }

            // Amount is flexible; notes are required when creating the payment record so admins document any variance

            // Confirm payment (idempotent)
            if ($paymentRecord->isPending()) {
                $paymentRecord->update([
                    'status' => PaymentRecord::STATUS_CONFIRMED,
                    'confirmed_by' => $performedBy,
                    'confirmed_at' => now(),
                ]);
            }

            $currentSubscription = $this->getCurrentSubscriptionLocked($request->organization_id);

            // Apply discount code if used (idempotent per payment record)
            if ($request->discount_code_id) {
                $alreadyLogged = DiscountCodeUsage::where('payment_record_id', $paymentRecord->id)->exists();
                if (!$alreadyLogged) {
                    $discountCode = DiscountCode::find($request->discount_code_id);
                    if ($discountCode) {
                        $discountCode->incrementUsage();

                        DiscountCodeUsage::create([
                            'discount_code_id' => $discountCode->id,
                            'organization_id' => $request->organization_id,
                            'payment_record_id' => $paymentRecord->id,
                            'discount_applied' => $paymentRecord->discount_amount,
                        ]);
                    }
                }
            }

            // Activate the new subscription (within the same transaction)
            $subscription = $this->activateSubscriptionInTransaction(
                $request->organization_id,
                $request->requested_plan_id,
                $paymentRecord->currency,
                $paymentRecord->amount,
                $request->additional_schools,
                $performedBy,
                "Renewed via request #{$request->id}",
                // Preserve license payment state across renewals/upgrades
                !empty($currentSubscription?->license_paid_at),
                $currentSubscription?->license_payment_id
            );

            // Update the request
            $request->update([
                'status' => RenewalRequest::STATUS_APPROVED,
                'processed_by' => $performedBy,
                'processed_at' => now(),
                'payment_record_id' => $paymentRecord->id,
            ]);

            // Link payment to new subscription
            $paymentRecord->update(['subscription_id' => $subscription->id]);

            return $subscription;
        }, 3);
    }

    /**
     * Reject a renewal request
     */
    public function rejectRenewalRequest(
        string $requestId,
        string $reason,
        string $performedBy
    ): RenewalRequest {
        $request = RenewalRequest::findOrFail($requestId);
        
        if (!$request->isPending()) {
            throw new \Exception('Renewal request is not pending');
        }

        $request->update([
            'status' => RenewalRequest::STATUS_REJECTED,
            'processed_by' => $performedBy,
            'processed_at' => now(),
            'rejection_reason' => $reason,
        ]);

        return $request;
    }

    /**
     * Cancel a subscription
     */
    public function cancelSubscription(
        string $organizationId,
        string $reason,
        ?string $performedBy = null
    ): OrganizationSubscription {
        $subscription = $this->getCurrentSubscription($organizationId);
        
        if (!$subscription) {
            throw new \Exception('No active subscription found');
        }

        $oldStatus = $subscription->status;

        $subscription->update([
            'status' => OrganizationSubscription::STATUS_CANCELLED,
            'cancelled_at' => now(),
            'suspension_reason' => $reason,
        ]);

        SubscriptionHistory::log(
            $organizationId,
            SubscriptionHistory::ACTION_CANCELLED,
            $subscription->id,
            null,
            null,
            $oldStatus,
            OrganizationSubscription::STATUS_CANCELLED,
            $performedBy,
            $reason
        );

        return $subscription;
    }

    /**
     * Suspend a subscription
     */
    public function suspendSubscription(
        string $organizationId,
        string $reason,
        ?string $performedBy = null
    ): OrganizationSubscription {
        $subscription = $this->getCurrentSubscription($organizationId);
        
        if (!$subscription) {
            throw new \Exception('No active subscription found');
        }

        $oldStatus = $subscription->status;

        $subscription->update([
            'status' => OrganizationSubscription::STATUS_SUSPENDED,
            'suspension_reason' => $reason,
        ]);

        SubscriptionHistory::log(
            $organizationId,
            SubscriptionHistory::ACTION_SUSPENDED,
            $subscription->id,
            null,
            null,
            $oldStatus,
            OrganizationSubscription::STATUS_SUSPENDED,
            $performedBy,
            $reason
        );

        return $subscription;
    }

    /**
     * Add a feature addon to an organization
     */
    public function addFeatureAddon(
        string $organizationId,
        string $featureKey,
        float $pricePaid,
        string $currency = 'AFN',
        ?string $performedBy = null
    ): OrganizationFeatureAddon {
        $subscription = $this->getCurrentSubscription($organizationId);
        $expiresAt = $subscription?->expires_at;

        $addon = OrganizationFeatureAddon::updateOrCreate(
            [
                'organization_id' => $organizationId,
                'feature_key' => $featureKey,
            ],
            [
                'is_enabled' => true,
                'started_at' => now(),
                'expires_at' => $expiresAt,
                'price_paid' => $pricePaid,
                'currency' => $currency,
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
            $performedBy,
            "Added feature addon: {$featureKey}",
            ['feature_key' => $featureKey, 'price_paid' => $pricePaid]
        );

        Cache::forget("subscription:enabled-features:v1:{$organizationId}");

        return $addon;
    }

    /**
     * Add a limit override for an organization
     */
    public function addLimitOverride(
        string $organizationId,
        string $resourceKey,
        int $limitValue,
        string $reason,
        ?string $grantedBy = null,
        ?Carbon $expiresAt = null
    ): OrganizationLimitOverride {
        $override = OrganizationLimitOverride::updateOrCreate(
            [
                'organization_id' => $organizationId,
                'resource_key' => $resourceKey,
            ],
            [
                'limit_value' => $limitValue,
                'reason' => $reason,
                'granted_by' => $grantedBy,
                'expires_at' => $expiresAt,
            ]
        );

        $subscription = $this->getCurrentSubscription($organizationId);

        SubscriptionHistory::log(
            $organizationId,
            SubscriptionHistory::ACTION_LIMIT_OVERRIDE,
            $subscription?->id,
            null,
            null,
            null,
            null,
            $grantedBy,
            "Added limit override for {$resourceKey}: {$limitValue}",
            ['resource_key' => $resourceKey, 'limit_value' => $limitValue]
        );

        return $override;
    }

    /**
     * Calculate price for a plan with addons and discount
     * 
     * @deprecated Use calculatePriceWithFees() for new fee separation model
     */
    public function calculatePrice(
        string $planId,
        int $additionalSchools = 0,
        ?string $discountCode = null,
        string $currency = 'AFN',
        ?string $organizationId = null
    ): array {
        $plan = SubscriptionPlan::findOrFail($planId);

        $basePrice = $plan->getPrice($currency);
        $schoolsPrice = $additionalSchools * $plan->getPerSchoolPrice($currency);
        $subtotal = $basePrice + $schoolsPrice;

        $discountAmount = 0;
        $discountInfo = null;

        if ($discountCode && $organizationId) {
            $code = DiscountCode::where('code', strtoupper($discountCode))->first();
            if ($code && $code->canBeUsedByOrganization($organizationId) && $code->appliesToPlan($planId)) {
                $discountAmount = $code->calculateDiscount($subtotal, $currency);
                $discountInfo = [
                    'code' => $code->code,
                    'type' => $code->discount_type,
                    'value' => $code->discount_value,
                ];
            }
        }

        $total = $subtotal - $discountAmount;

        return [
            'plan_id' => $planId,
            'plan_name' => $plan->name,
            'currency' => $currency,
            'base_price' => $basePrice,
            'additional_schools' => $additionalSchools,
            'schools_price' => $schoolsPrice,
            'subtotal' => $subtotal,
            'discount_amount' => $discountAmount,
            'discount_info' => $discountInfo,
            'total' => $total,
        ];
    }

    /**
     * Calculate price with separate license and maintenance fees
     * 
     * This is the new fee separation model:
     * - License fee: One-time payment
     * - Maintenance fee: Recurring based on billing period
     */
    public function calculatePriceWithFees(
        string $planId,
        int $additionalSchools = 0,
        ?string $discountCode = null,
        string $currency = 'AFN',
        ?string $organizationId = null,
        bool $includeLicenseFee = true
    ): array {
        $plan = SubscriptionPlan::findOrFail($planId);

        // License fee (one-time)
        $licenseFee = $includeLicenseFee ? $plan->getLicenseFee($currency) : 0;
        
        // Maintenance fee (recurring per billing period)
        $maintenanceFee = $plan->getMaintenanceFee($currency);
        $perSchoolMaintenanceFee = $plan->getPerSchoolMaintenanceFee($currency);
        $schoolsMaintenanceFee = $additionalSchools * $perSchoolMaintenanceFee;
        $totalMaintenanceFee = $maintenanceFee + $schoolsMaintenanceFee;
        
        // Subtotal (license + maintenance for first period)
        $subtotal = $licenseFee + $totalMaintenanceFee;

        $discountAmount = 0;
        $discountInfo = null;

        if ($discountCode && $organizationId) {
            $code = DiscountCode::where('code', strtoupper($discountCode))->first();
            if ($code && $code->canBeUsedByOrganization($organizationId) && $code->appliesToPlan($planId)) {
                // Apply discount to maintenance fee only (license is one-time)
                $discountAmount = $code->calculateDiscount($totalMaintenanceFee, $currency);
                $discountInfo = [
                    'code' => $code->code,
                    'type' => $code->discount_type,
                    'value' => $code->discount_value,
                    'applied_to' => 'maintenance_fee',
                ];
            }
        }

        $total = $subtotal - $discountAmount;

        return [
            'plan_id' => $planId,
            'plan_name' => $plan->name,
            'currency' => $currency,
            'billing_period' => $plan->billing_period ?? 'yearly',
            'billing_period_label' => $plan->getBillingPeriodLabel(),
            'billing_period_days' => $plan->getBillingPeriodDays(),
            
            // License fee breakdown
            'license_fee' => $licenseFee,
            'license_fee_included' => $includeLicenseFee,
            
            // Maintenance fee breakdown
            'maintenance_fee' => $maintenanceFee,
            'per_school_maintenance_fee' => $perSchoolMaintenanceFee,
            'additional_schools' => $additionalSchools,
            'schools_maintenance_fee' => $schoolsMaintenanceFee,
            'total_maintenance_fee' => $totalMaintenanceFee,
            
            // Totals
            'subtotal' => $subtotal,
            'discount_amount' => $discountAmount,
            'discount_info' => $discountInfo,
            'total' => $total,
            
            // Legacy fields for backward compatibility
            'base_price' => $plan->getPrice($currency),
            'schools_price' => $additionalSchools * $plan->getPerSchoolPrice($currency),
        ];
    }

    /**
     * Calculate renewal price (maintenance fee only, no license fee)
     */
    public function calculateRenewalPrice(
        string $planId,
        int $additionalSchools = 0,
        ?string $discountCode = null,
        string $currency = 'AFN',
        ?string $organizationId = null
    ): array {
        // Renewal doesn't include license fee
        return $this->calculatePriceWithFees(
            $planId,
            $additionalSchools,
            $discountCode,
            $currency,
            $organizationId,
            false // Don't include license fee
        );
    }

    /**
     * Get fee breakdown for a plan
     */
    public function getPlanFeeBreakdown(string $planId, string $currency = 'AFN'): array
    {
        $plan = SubscriptionPlan::findOrFail($planId);
        
        return [
            'plan_id' => $planId,
            'plan_name' => $plan->name,
            'currency' => $currency,
            'billing_period' => $plan->billing_period ?? 'yearly',
            'billing_period_label' => $plan->getBillingPeriodLabel(),
            'billing_period_days' => $plan->getBillingPeriodDays(),
            'custom_billing_days' => $plan->custom_billing_days,
            
            'license_fee' => $plan->getLicenseFee($currency),
            'has_license_fee' => $plan->hasLicenseFee(),
            
            'maintenance_fee' => $plan->getMaintenanceFee($currency),
            'per_school_maintenance_fee' => $plan->getPerSchoolMaintenanceFee($currency),
            'has_maintenance_fee' => $plan->hasMaintenanceFee(),
            
            // Monthly equivalent (for display)
            'monthly_equivalent' => $plan->getMaintenanceFeeForPeriod($currency, 'monthly'),
            
            // Legacy fields
            'price_yearly' => $plan->getPrice($currency),
            'per_school_price' => $plan->getPerSchoolPrice($currency),
        ];
    }

    /**
     * Get all available plans (non-custom, active)
     */
    public function getAvailablePlans(): \Illuminate\Database\Eloquent\Collection
    {
        return SubscriptionPlan::active()
            ->standard()
            ->orderBy('sort_order')
            ->get();
    }

    /**
     * Get subscriptions needing renewal reminders
     */
    public function getSubscriptionsNeedingReminder(int $daysBeforeExpiry): \Illuminate\Database\Eloquent\Collection
    {
        return OrganizationSubscription::needsRenewalReminder($daysBeforeExpiry)
            ->with(['organization', 'plan'])
            ->get();
    }
}
