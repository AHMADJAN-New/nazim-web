<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Carbon\Carbon;

class OrganizationSubscription extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'organization_subscriptions';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'organization_id',
        'plan_id',
        'status',
        'started_at',
        'expires_at',
        'trial_ends_at',
        'grace_period_ends_at',
        'readonly_period_ends_at',
        'cancelled_at',
        'suspension_reason',
        'auto_renew',
        'currency',
        'amount_paid',
        // New billing tracking fields
        'license_paid_at',
        'license_payment_id',
        'billing_period',
        'next_maintenance_due_at',
        'last_maintenance_paid_at',
        'additional_schools',
        'notes',
        'metadata',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'expires_at' => 'datetime',
        'trial_ends_at' => 'datetime',
        'grace_period_ends_at' => 'datetime',
        'readonly_period_ends_at' => 'datetime',
        'cancelled_at' => 'datetime',
        // New date fields
        'license_paid_at' => 'datetime',
        'next_maintenance_due_at' => 'datetime',
        'last_maintenance_paid_at' => 'datetime',
        'auto_renew' => 'boolean',
        'amount_paid' => 'decimal:2',
        'additional_schools' => 'integer',
        'metadata' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    // Status constants
    const STATUS_TRIAL = 'trial';
    const STATUS_ACTIVE = 'active';
    const STATUS_PENDING_RENEWAL = 'pending_renewal';
    const STATUS_GRACE_PERIOD = 'grace_period';
    const STATUS_READONLY = 'readonly';
    const STATUS_EXPIRED = 'expired';
    const STATUS_SUSPENDED = 'suspended';
    const STATUS_CANCELLED = 'cancelled';

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    /**
     * Get the organization
     */
    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    /**
     * Get the plan
     */
    public function plan()
    {
        return $this->belongsTo(SubscriptionPlan::class, 'plan_id');
    }

    /**
     * Get payment records for this subscription
     */
    public function payments()
    {
        return $this->hasMany(PaymentRecord::class, 'subscription_id');
    }

    /**
     * Get the license payment record
     */
    public function licensePayment()
    {
        return $this->belongsTo(PaymentRecord::class, 'license_payment_id');
    }

    /**
     * Get all maintenance payments for this subscription
     */
    public function maintenancePayments()
    {
        return $this->hasMany(PaymentRecord::class, 'subscription_id')
            ->where('payment_type', PaymentRecord::TYPE_MAINTENANCE)
            ->orderBy('payment_date', 'desc');
    }

    /**
     * Get all license payments for this subscription
     */
    public function licensePayments()
    {
        return $this->hasMany(PaymentRecord::class, 'subscription_id')
            ->where('payment_type', PaymentRecord::TYPE_LICENSE)
            ->orderBy('payment_date', 'desc');
    }

    /**
     * Get maintenance invoices for this subscription
     */
    public function maintenanceInvoices()
    {
        return $this->hasMany(MaintenanceInvoice::class, 'subscription_id');
    }

    /**
     * Get renewal requests for this subscription
     */
    public function renewalRequests()
    {
        return $this->hasMany(RenewalRequest::class, 'subscription_id');
    }

    /**
     * Get history for this subscription
     */
    public function history()
    {
        return $this->hasMany(SubscriptionHistory::class, 'subscription_id');
    }

    /**
     * Check if the license fee has been paid
     */
    public function hasLicensePaid(): bool
    {
        return $this->license_paid_at !== null;
    }

    /**
     * Check if a license fee is required for this subscription
     */
    public function requiresLicenseFee(): bool
    {
        $plan = $this->plan;
        return $plan && $plan->hasLicenseFee();
    }

    /**
     * Check if the license fee is pending (required but not paid)
     */
    public function isLicenseFeePending(): bool
    {
        return $this->requiresLicenseFee() && !$this->hasLicensePaid();
    }

    /**
     * Get the next maintenance due date
     */
    public function getNextMaintenanceDueDate(): ?Carbon
    {
        return $this->next_maintenance_due_at;
    }

    /**
     * Check if maintenance fee is overdue
     */
    public function isMaintenanceOverdue(): bool
    {
        if (!$this->next_maintenance_due_at) {
            return false;
        }
        
        return $this->next_maintenance_due_at->isPast();
    }

    /**
     * Get days until next maintenance is due
     */
    public function daysUntilMaintenanceDue(): ?int
    {
        if (!$this->next_maintenance_due_at) {
            return null;
        }
        
        return max(0, Carbon::now()->diffInDays($this->next_maintenance_due_at, false));
    }

    /**
     * Get days overdue for maintenance
     */
    public function daysMaintenanceOverdue(): int
    {
        if (!$this->next_maintenance_due_at || !$this->isMaintenanceOverdue()) {
            return 0;
        }
        
        return abs(Carbon::now()->diffInDays($this->next_maintenance_due_at, false));
    }

    /**
     * Calculate the next maintenance due date based on billing period
     */
    public function calculateNextMaintenanceDueDate(?Carbon $fromDate = null): Carbon
    {
        $from = $fromDate ?? ($this->last_maintenance_paid_at ?? $this->started_at ?? Carbon::now());
        $plan = $this->plan;
        
        if (!$plan) {
            // Default to yearly if no plan
            return $from->copy()->addDays(365);
        }
        
        $days = $plan->getBillingPeriodDays();
        return $from->copy()->addDays($days);
    }

    /**
     * Update the next maintenance due date after a payment
     */
    public function updateNextMaintenanceDueDate(): void
    {
        $this->next_maintenance_due_at = $this->calculateNextMaintenanceDueDate(Carbon::now());
        $this->last_maintenance_paid_at = Carbon::now();
        $this->save();
    }

    /**
     * Mark license as paid
     */
    public function markLicensePaid(?string $paymentId = null): void
    {
        $this->license_paid_at = Carbon::now();
        $this->license_payment_id = $paymentId;
        $this->save();
    }

    /**
     * Get the billing period for this subscription
     */
    public function getBillingPeriod(): string
    {
        return $this->billing_period ?? 'yearly';
    }

    /**
     * Get the billing period label
     */
    public function getBillingPeriodLabel(): string
    {
        $plan = $this->plan;
        if ($plan) {
            return $plan->getBillingPeriodLabel();
        }
        
        return match($this->billing_period) {
            'monthly' => 'Monthly',
            'quarterly' => 'Quarterly',
            'yearly' => 'Yearly',
            'custom' => 'Custom',
            default => 'Yearly',
        };
    }

    /**
     * Check if subscription is on trial
     */
    public function isOnTrial(): bool
    {
        return $this->status === self::STATUS_TRIAL 
            && $this->trial_ends_at 
            && $this->trial_ends_at->isFuture();
    }

    /**
     * Check if subscription is active
     */
    public function isActive(): bool
    {
        return in_array($this->status, [
            self::STATUS_TRIAL,
            self::STATUS_ACTIVE,
        ]);
    }

    /**
     * Check if subscription allows write access
     */
    public function canWrite(): bool
    {
        return in_array($this->status, [
            self::STATUS_TRIAL,
            self::STATUS_ACTIVE,
            self::STATUS_PENDING_RENEWAL,
            self::STATUS_GRACE_PERIOD,
        ]);
    }

    /**
     * Check if subscription allows read access
     */
    public function canRead(): bool
    {
        return in_array($this->status, [
            self::STATUS_TRIAL,
            self::STATUS_ACTIVE,
            self::STATUS_PENDING_RENEWAL,
            self::STATUS_GRACE_PERIOD,
            self::STATUS_READONLY,
        ]);
    }

    /**
     * Check if subscription is completely blocked
     */
    public function isBlocked(): bool
    {
        return in_array($this->status, [
            self::STATUS_EXPIRED,
            self::STATUS_SUSPENDED,
            self::STATUS_CANCELLED,
        ]);
    }

    /**
     * Check if in grace period
     */
    public function isInGracePeriod(): bool
    {
        return $this->status === self::STATUS_GRACE_PERIOD
            || ($this->grace_period_ends_at && $this->grace_period_ends_at->isFuture());
    }

    /**
     * Check if in readonly period
     */
    public function isInReadonlyPeriod(): bool
    {
        return $this->status === self::STATUS_READONLY
            || ($this->readonly_period_ends_at && $this->readonly_period_ends_at->isFuture());
    }

    /**
     * Get days until expiry
     */
    public function daysUntilExpiry(): ?int
    {
        if (!$this->expires_at) {
            return null;
        }

        return max(0, Carbon::now()->diffInDays($this->expires_at, false));
    }

    /**
     * Get days left in trial
     */
    public function trialDaysLeft(): ?int
    {
        if (!$this->trial_ends_at) {
            return null;
        }

        return max(0, Carbon::now()->diffInDays($this->trial_ends_at, false));
    }

    /**
     * Get total schools allowed
     */
    public function getTotalSchoolsAllowed(): int
    {
        $plan = $this->plan;
        if (!$plan) {
            return 1;
        }

        return $plan->max_schools + $this->additional_schools;
    }

    /**
     * Scope for active subscriptions
     */
    public function scopeActive($query)
    {
        return $query->whereIn('status', [
            self::STATUS_TRIAL,
            self::STATUS_ACTIVE,
        ]);
    }

    /**
     * Scope for subscriptions needing renewal reminder
     */
    public function scopeNeedsRenewalReminder($query, int $daysBeforeExpiry)
    {
        return $query->whereIn('status', [self::STATUS_TRIAL, self::STATUS_ACTIVE])
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', Carbon::now()->addDays($daysBeforeExpiry))
            ->where('expires_at', '>', Carbon::now());
    }

    /**
     * Scope for expired subscriptions
     */
    public function scopeExpired($query)
    {
        return $query->where('expires_at', '<', Carbon::now())
            ->whereNotIn('status', [
                self::STATUS_SUSPENDED,
                self::STATUS_CANCELLED,
            ]);
    }

    /**
     * Scope for subscriptions with maintenance due soon
     */
    public function scopeMaintenanceDueSoon($query, int $daysBeforeDue = 30)
    {
        return $query->whereIn('status', [self::STATUS_ACTIVE, self::STATUS_GRACE_PERIOD])
            ->whereNotNull('next_maintenance_due_at')
            ->where('next_maintenance_due_at', '<=', Carbon::now()->addDays($daysBeforeDue))
            ->where('next_maintenance_due_at', '>', Carbon::now());
    }

    /**
     * Scope for subscriptions with overdue maintenance
     */
    public function scopeMaintenanceOverdue($query)
    {
        return $query->whereIn('status', [self::STATUS_ACTIVE, self::STATUS_GRACE_PERIOD, self::STATUS_READONLY])
            ->whereNotNull('next_maintenance_due_at')
            ->where('next_maintenance_due_at', '<', Carbon::now());
    }

    /**
     * Scope for subscriptions with unpaid license fee
     */
    public function scopeLicenseUnpaid($query)
    {
        return $query->whereNull('license_paid_at')
            ->whereHas('plan', function ($q) {
                $q->where(function ($q2) {
                    $q2->where('license_fee_afn', '>', 0)
                       ->orWhere('license_fee_usd', '>', 0);
                });
            });
    }

    /**
     * Scope to filter by billing period
     */
    public function scopeByBillingPeriod($query, string $period)
    {
        return $query->where('billing_period', $period);
    }
}
