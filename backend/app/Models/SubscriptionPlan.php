<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class SubscriptionPlan extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'subscription_plans';

    public $incrementing = false;
    protected $keyType = 'string';

    // Billing period constants
    const BILLING_PERIOD_MONTHLY = 'monthly';
    const BILLING_PERIOD_QUARTERLY = 'quarterly';
    const BILLING_PERIOD_YEARLY = 'yearly';
    const BILLING_PERIOD_CUSTOM = 'custom';

    protected $fillable = [
        'id',
        'name',
        'slug',
        'description',
        'price_yearly_afn',
        'price_yearly_usd',
        'is_active',
        'is_default',
        'is_custom',
        'custom_for_organization_id',
        'trial_days',
        'grace_period_days',
        'readonly_period_days',
        'max_schools',
        'per_school_price_afn',
        'per_school_price_usd',
        // New fee separation fields
        'billing_period',
        'custom_billing_days',
        'license_fee_afn',
        'license_fee_usd',
        'maintenance_fee_afn',
        'maintenance_fee_usd',
        'per_school_maintenance_fee_afn',
        'per_school_maintenance_fee_usd',
        'sort_order',
        'metadata',
    ];

    protected $casts = [
        'price_yearly_afn' => 'decimal:2',
        'price_yearly_usd' => 'decimal:2',
        'per_school_price_afn' => 'decimal:2',
        'per_school_price_usd' => 'decimal:2',
        // New fee fields
        'license_fee_afn' => 'decimal:2',
        'license_fee_usd' => 'decimal:2',
        'maintenance_fee_afn' => 'decimal:2',
        'maintenance_fee_usd' => 'decimal:2',
        'per_school_maintenance_fee_afn' => 'decimal:2',
        'per_school_maintenance_fee_usd' => 'decimal:2',
        'custom_billing_days' => 'integer',
        'is_active' => 'boolean',
        'is_default' => 'boolean',
        'is_custom' => 'boolean',
        'trial_days' => 'integer',
        'grace_period_days' => 'integer',
        'readonly_period_days' => 'integer',
        'max_schools' => 'integer',
        'sort_order' => 'integer',
        'metadata' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

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
     * Get the price for a given currency (legacy - returns yearly price)
     * @deprecated Use getLicenseFee() and getMaintenanceFee() instead
     */
    public function getPrice(string $currency = 'AFN'): float
    {
        return $currency === 'USD' 
            ? (float) $this->price_yearly_usd 
            : (float) $this->price_yearly_afn;
    }

    /**
     * Get the per-school price for a given currency (legacy)
     * @deprecated Use getPerSchoolMaintenanceFee() instead
     */
    public function getPerSchoolPrice(string $currency = 'AFN'): float
    {
        return $currency === 'USD' 
            ? (float) $this->per_school_price_usd 
            : (float) $this->per_school_price_afn;
    }

    /**
     * Get the one-time license fee for a given currency
     */
    public function getLicenseFee(string $currency = 'AFN'): float
    {
        return $currency === 'USD' 
            ? (float) ($this->license_fee_usd ?? 0)
            : (float) ($this->license_fee_afn ?? 0);
    }

    /**
     * Get the recurring maintenance fee for a given currency
     * This is the fee per billing period
     */
    public function getMaintenanceFee(string $currency = 'AFN'): float
    {
        return $currency === 'USD' 
            ? (float) ($this->maintenance_fee_usd ?? 0)
            : (float) ($this->maintenance_fee_afn ?? 0);
    }

    /**
     * Get the per-school maintenance fee for a given currency
     */
    public function getPerSchoolMaintenanceFee(string $currency = 'AFN'): float
    {
        return $currency === 'USD' 
            ? (float) ($this->per_school_maintenance_fee_usd ?? 0)
            : (float) ($this->per_school_maintenance_fee_afn ?? 0);
    }

    /**
     * Get the total maintenance fee including additional schools
     */
    public function getTotalMaintenanceFee(string $currency = 'AFN', int $additionalSchools = 0): float
    {
        $baseFee = $this->getMaintenanceFee($currency);
        $perSchoolFee = $this->getPerSchoolMaintenanceFee($currency);
        
        return $baseFee + ($perSchoolFee * $additionalSchools);
    }

    /**
     * Get the total cost for initial subscription (license + first maintenance period)
     */
    public function getTotalInitialCost(string $currency = 'AFN', int $additionalSchools = 0): float
    {
        $licenseFee = $this->getLicenseFee($currency);
        $maintenanceFee = $this->getTotalMaintenanceFee($currency, $additionalSchools);
        
        return $licenseFee + $maintenanceFee;
    }

    /**
     * Get the number of days in the billing period
     */
    public function getBillingPeriodDays(): int
    {
        switch ($this->billing_period) {
            case self::BILLING_PERIOD_MONTHLY:
                return 30;
            case self::BILLING_PERIOD_QUARTERLY:
                return 90;
            case self::BILLING_PERIOD_YEARLY:
                return 365;
            case self::BILLING_PERIOD_CUSTOM:
                return $this->custom_billing_days ?? 365;
            default:
                return 365;
        }
    }

    /**
     * Get the billing period label for display
     */
    public function getBillingPeriodLabel(): string
    {
        switch ($this->billing_period) {
            case self::BILLING_PERIOD_MONTHLY:
                return 'Monthly';
            case self::BILLING_PERIOD_QUARTERLY:
                return 'Quarterly';
            case self::BILLING_PERIOD_YEARLY:
                return 'Yearly';
            case self::BILLING_PERIOD_CUSTOM:
                return $this->custom_billing_days . ' days';
            default:
                return 'Yearly';
        }
    }

    /**
     * Calculate the maintenance fee for a different billing period
     * Useful for displaying monthly equivalent of yearly price, etc.
     */
    public function getMaintenanceFeeForPeriod(string $currency = 'AFN', string $targetPeriod = 'monthly'): float
    {
        $fee = $this->getMaintenanceFee($currency);
        $currentDays = $this->getBillingPeriodDays();
        
        $targetDays = match($targetPeriod) {
            'monthly' => 30,
            'quarterly' => 90,
            'yearly' => 365,
            default => 365,
        };
        
        // Convert to target period
        return ($fee / $currentDays) * $targetDays;
    }

    /**
     * Check if this plan has a license fee
     */
    public function hasLicenseFee(): bool
    {
        return $this->getLicenseFee('AFN') > 0 || $this->getLicenseFee('USD') > 0;
    }

    /**
     * Check if this plan has a maintenance fee
     */
    public function hasMaintenanceFee(): bool
    {
        return $this->getMaintenanceFee('AFN') > 0 || $this->getMaintenanceFee('USD') > 0;
    }

    /**
     * Check if this is a free/trial plan
     */
    public function isFree(): bool
    {
        return !$this->hasLicenseFee() && !$this->hasMaintenanceFee();
    }

    /**
     * Check if this is a trial plan
     */
    public function isTrial(): bool
    {
        return $this->slug === 'trial' || $this->trial_days > 0;
    }

    /**
     * Get features for this plan
     */
    public function features()
    {
        return $this->hasMany(PlanFeature::class, 'plan_id');
    }

    /**
     * Get enabled features for this plan
     */
    public function enabledFeatures()
    {
        return $this->features()->where('is_enabled', true);
    }

    /**
     * Get limits for this plan
     */
    public function limits()
    {
        return $this->hasMany(PlanLimit::class, 'plan_id');
    }

    /**
     * Get subscriptions using this plan
     */
    public function subscriptions()
    {
        return $this->hasMany(OrganizationSubscription::class, 'plan_id');
    }

    /**
     * Check if a feature is enabled for this plan
     */
    public function hasFeature(string $featureKey): bool
    {
        return $this->features()
            ->where('feature_key', $featureKey)
            ->where('is_enabled', true)
            ->exists();
    }

    /**
     * Get limit value for a resource
     */
    public function getLimit(string $resourceKey): int
    {
        $limit = $this->limits()
            ->where('resource_key', $resourceKey)
            ->first();

        return $limit ? $limit->limit_value : -1; // -1 = unlimited
    }

    /**
     * Get warning threshold for a resource
     */
    public function getWarningThreshold(string $resourceKey): int
    {
        try {
            $limit = $this->limits()
                ->where('resource_key', $resourceKey)
                ->first();

            return $limit ? $limit->warning_threshold : 80;
        } catch (\Exception $e) {
            \Log::warning("Failed to get warning threshold for resource {$resourceKey} in plan {$this->id}: " . $e->getMessage());
            return 80; // Default threshold
        }
    }

    /**
     * Scope to get active plans
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to get non-custom plans
     */
    public function scopeStandard($query)
    {
        return $query->where('is_custom', false);
    }

    /**
     * Scope to get the default plan
     */
    public function scopeDefault($query)
    {
        return $query->where('is_default', true);
    }

    /**
     * Scope to filter by billing period
     */
    public function scopeByBillingPeriod($query, string $period)
    {
        return $query->where('billing_period', $period);
    }

    /**
     * Get all available billing periods
     */
    public static function getBillingPeriods(): array
    {
        return [
            self::BILLING_PERIOD_MONTHLY => 'Monthly',
            self::BILLING_PERIOD_QUARTERLY => 'Quarterly',
            self::BILLING_PERIOD_YEARLY => 'Yearly',
            self::BILLING_PERIOD_CUSTOM => 'Custom',
        ];
    }
}
