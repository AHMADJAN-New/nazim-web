<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class UsageSnapshot extends Model
{
    use HasFactory;

    protected $connection = 'pgsql';
    protected $table = 'usage_snapshots';

    public $incrementing = false;
    protected $keyType = 'string';

    // Disable updated_at since we only have created_at
    const UPDATED_AT = null;

    protected $fillable = [
        'id',
        'organization_id',
        'snapshot_date',
        'plan_id',
        'plan_name',
        'usage_data',
        'limits_data',
    ];

    protected $casts = [
        'snapshot_date' => 'date',
        'usage_data' => 'array',
        'limits_data' => 'array',
        'created_at' => 'datetime',
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
     * Get usage value for a resource
     */
    public function getUsage(string $resourceKey): ?int
    {
        return $this->usage_data[$resourceKey] ?? null;
    }

    /**
     * Get limit value for a resource
     */
    public function getLimit(string $resourceKey): ?int
    {
        return $this->limits_data[$resourceKey] ?? null;
    }

    /**
     * Get the organization
     */
    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    /**
     * Get the plan at time of snapshot
     */
    public function plan()
    {
        return $this->belongsTo(SubscriptionPlan::class, 'plan_id');
    }

    /**
     * Create a snapshot for an organization
     */
    public static function capture(
        string $organizationId,
        string $planId,
        string $planName,
        array $usageData,
        array $limitsData
    ): self {
        return self::updateOrCreate(
            [
                'organization_id' => $organizationId,
                'snapshot_date' => now()->toDateString(),
            ],
            [
                'plan_id' => $planId,
                'plan_name' => $planName,
                'usage_data' => $usageData,
                'limits_data' => $limitsData,
            ]
        );
    }
}
