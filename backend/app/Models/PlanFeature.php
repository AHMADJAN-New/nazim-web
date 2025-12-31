<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class PlanFeature extends Model
{
    use HasFactory;

    protected $connection = 'pgsql';
    protected $table = 'plan_features';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'plan_id',
        'feature_key',
        'is_enabled',
    ];

    protected $casts = [
        'is_enabled' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
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
     * Get the plan
     */
    public function plan()
    {
        return $this->belongsTo(SubscriptionPlan::class, 'plan_id');
    }

    /**
     * Get the feature definition
     */
    public function definition()
    {
        return $this->belongsTo(FeatureDefinition::class, 'feature_key', 'feature_key');
    }

    /**
     * Scope to get enabled features
     */
    public function scopeEnabled($query)
    {
        return $query->where('is_enabled', true);
    }
}
