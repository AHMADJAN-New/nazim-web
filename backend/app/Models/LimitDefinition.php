<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class LimitDefinition extends Model
{
    use HasFactory;

    protected $connection = 'pgsql';
    protected $table = 'limit_definitions';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'resource_key',
        'name',
        'description',
        'unit',
        'reset_period',
        'category',
        'count_query',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Reset period constants
    const RESET_NEVER = 'never';
    const RESET_MONTHLY = 'monthly';
    const RESET_YEARLY = 'yearly';

    // Unit constants
    const UNIT_COUNT = 'count';
    const UNIT_GB = 'gb';
    const UNIT_MB = 'mb';

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
     * Check if this limit resets periodically
     */
    public function resetsMonthly(): bool
    {
        return $this->reset_period === self::RESET_MONTHLY;
    }

    /**
     * Check if this limit resets yearly
     */
    public function resetsYearly(): bool
    {
        return $this->reset_period === self::RESET_YEARLY;
    }

    /**
     * Check if this limit never resets
     */
    public function neverResets(): bool
    {
        return $this->reset_period === self::RESET_NEVER;
    }

    /**
     * Get plan limits for this definition
     */
    public function planLimits()
    {
        return $this->hasMany(PlanLimit::class, 'resource_key', 'resource_key');
    }

    /**
     * Scope to get active limits
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to filter by category
     */
    public function scopeCategory($query, string $category)
    {
        return $query->where('category', $category);
    }
}
