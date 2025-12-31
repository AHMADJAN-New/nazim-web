<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class PlanLimit extends Model
{
    use HasFactory;

    protected $connection = 'pgsql';
    protected $table = 'plan_limits';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'plan_id',
        'resource_key',
        'limit_value',
        'warning_threshold',
    ];

    protected $casts = [
        'limit_value' => 'integer',
        'warning_threshold' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Special limit values
    const UNLIMITED = -1;
    const DISABLED = 0;

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
     * Check if this limit is unlimited
     */
    public function isUnlimited(): bool
    {
        return $this->limit_value === self::UNLIMITED;
    }

    /**
     * Check if this resource is disabled
     */
    public function isDisabled(): bool
    {
        return $this->limit_value === self::DISABLED;
    }

    /**
     * Get the plan
     */
    public function plan()
    {
        return $this->belongsTo(SubscriptionPlan::class, 'plan_id');
    }

    /**
     * Get the limit definition
     */
    public function definition()
    {
        return $this->belongsTo(LimitDefinition::class, 'resource_key', 'resource_key');
    }
}
