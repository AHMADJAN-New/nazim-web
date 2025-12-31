<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class DiscountCode extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'discount_codes';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'code',
        'name',
        'description',
        'discount_type',
        'discount_value',
        'max_discount_amount',
        'currency',
        'applicable_plan_id',
        'max_uses',
        'current_uses',
        'max_uses_per_org',
        'valid_from',
        'valid_until',
        'is_active',
        'created_by',
        'metadata',
    ];

    protected $casts = [
        'discount_value' => 'decimal:2',
        'max_discount_amount' => 'decimal:2',
        'max_uses' => 'integer',
        'current_uses' => 'integer',
        'max_uses_per_org' => 'integer',
        'valid_from' => 'datetime',
        'valid_until' => 'datetime',
        'is_active' => 'boolean',
        'metadata' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    // Discount type constants
    const TYPE_PERCENTAGE = 'percentage';
    const TYPE_FIXED = 'fixed';

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
            // Uppercase the code
            $model->code = strtoupper($model->code);
        });
    }

    /**
     * Check if discount code is currently valid
     */
    public function isValid(): bool
    {
        if (!$this->is_active) {
            return false;
        }

        if ($this->valid_from && $this->valid_from->isFuture()) {
            return false;
        }

        if ($this->valid_until && $this->valid_until->isPast()) {
            return false;
        }

        if ($this->max_uses !== null && $this->current_uses >= $this->max_uses) {
            return false;
        }

        return true;
    }

    /**
     * Check if organization can use this code
     */
    public function canBeUsedByOrganization(string $organizationId): bool
    {
        if (!$this->isValid()) {
            return false;
        }

        // Check per-org usage limit
        $usageCount = DiscountCodeUsage::where('discount_code_id', $this->id)
            ->where('organization_id', $organizationId)
            ->count();

        return $usageCount < $this->max_uses_per_org;
    }

    /**
     * Check if code applies to a specific plan
     */
    public function appliesToPlan(?string $planId): bool
    {
        // If no specific plan is set, applies to all plans
        if (!$this->applicable_plan_id) {
            return true;
        }

        return $this->applicable_plan_id === $planId;
    }

    /**
     * Calculate discount amount for a given price
     */
    public function calculateDiscount(float $originalPrice, string $currency = 'AFN'): float
    {
        if ($this->discount_type === self::TYPE_PERCENTAGE) {
            $discount = $originalPrice * ($this->discount_value / 100);
        } else {
            // Fixed discount - check currency match if specified
            if ($this->currency && $this->currency !== $currency) {
                return 0;
            }
            $discount = (float) $this->discount_value;
        }

        // Apply max discount cap if set
        if ($this->max_discount_amount) {
            $discount = min($discount, (float) $this->max_discount_amount);
        }

        // Can't discount more than the original price
        return min($discount, $originalPrice);
    }

    /**
     * Increment usage count
     */
    public function incrementUsage(): void
    {
        $this->current_uses++;
        $this->save();
    }

    /**
     * Get the applicable plan
     */
    public function applicablePlan()
    {
        return $this->belongsTo(SubscriptionPlan::class, 'applicable_plan_id');
    }

    /**
     * Get usage records
     */
    public function usages()
    {
        return $this->hasMany(DiscountCodeUsage::class, 'discount_code_id');
    }

    /**
     * Get the creator user
     */
    public function createdByUser()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Scope for active codes
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope for valid codes (active and within date range)
     */
    public function scopeValid($query)
    {
        return $query->where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('valid_from')
                    ->orWhere('valid_from', '<=', now());
            })
            ->where(function ($q) {
                $q->whereNull('valid_until')
                    ->orWhere('valid_until', '>=', now());
            })
            ->where(function ($q) {
                $q->whereNull('max_uses')
                    ->orWhereRaw('current_uses < max_uses');
            });
    }
}
