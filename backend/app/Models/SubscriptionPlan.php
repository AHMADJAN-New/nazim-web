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
        'sort_order',
        'metadata',
    ];

    protected $casts = [
        'price_yearly_afn' => 'decimal:2',
        'price_yearly_usd' => 'decimal:2',
        'per_school_price_afn' => 'decimal:2',
        'per_school_price_usd' => 'decimal:2',
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
     * Get the price for a given currency
     */
    public function getPrice(string $currency = 'AFN'): float
    {
        return $currency === 'USD' 
            ? (float) $this->price_yearly_usd 
            : (float) $this->price_yearly_afn;
    }

    /**
     * Get the per-school price for a given currency
     */
    public function getPerSchoolPrice(string $currency = 'AFN'): float
    {
        return $currency === 'USD' 
            ? (float) $this->per_school_price_usd 
            : (float) $this->per_school_price_afn;
    }

    /**
     * Check if this is a free/trial plan
     */
    public function isFree(): bool
    {
        return $this->price_yearly_afn == 0 && $this->price_yearly_usd == 0;
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
        $limit = $this->limits()
            ->where('resource_key', $resourceKey)
            ->first();

        return $limit ? $limit->warning_threshold : 80;
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
}
