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
}
