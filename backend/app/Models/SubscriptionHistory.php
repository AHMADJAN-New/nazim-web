<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class SubscriptionHistory extends Model
{
    use HasFactory;

    protected $connection = 'pgsql';
    protected $table = 'subscription_history';

    public $incrementing = false;
    protected $keyType = 'string';

    // Disable updated_at since we only have created_at
    const UPDATED_AT = null;

    protected $fillable = [
        'id',
        'organization_id',
        'subscription_id',
        'action',
        'from_plan_id',
        'to_plan_id',
        'from_status',
        'to_status',
        'performed_by',
        'notes',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
        'created_at' => 'datetime',
    ];

    // Action constants
    const ACTION_CREATED = 'created';
    const ACTION_TRIAL_STARTED = 'trial_started';
    const ACTION_ACTIVATED = 'activated';
    const ACTION_RENEWED = 'renewed';
    const ACTION_UPGRADED = 'upgraded';
    const ACTION_DOWNGRADED = 'downgraded';
    const ACTION_GRACE_PERIOD = 'grace_period';
    const ACTION_READONLY = 'readonly';
    const ACTION_EXPIRED = 'expired';
    const ACTION_SUSPENDED = 'suspended';
    const ACTION_CANCELLED = 'cancelled';
    const ACTION_REACTIVATED = 'reactivated';
    const ACTION_LIMIT_OVERRIDE = 'limit_override';
    const ACTION_ADDON_ADDED = 'addon_added';
    const ACTION_ADDON_REMOVED = 'addon_removed';

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
     * Get the subscription
     */
    public function subscription()
    {
        return $this->belongsTo(OrganizationSubscription::class, 'subscription_id');
    }

    /**
     * Get the from plan
     */
    public function fromPlan()
    {
        return $this->belongsTo(SubscriptionPlan::class, 'from_plan_id');
    }

    /**
     * Get the to plan
     */
    public function toPlan()
    {
        return $this->belongsTo(SubscriptionPlan::class, 'to_plan_id');
    }

    /**
     * Get the user who performed the action
     */
    public function performedByUser()
    {
        return $this->belongsTo(User::class, 'performed_by');
    }

    /**
     * Create a history entry
     */
    public static function log(
        string $organizationId,
        string $action,
        ?string $subscriptionId = null,
        ?string $fromPlanId = null,
        ?string $toPlanId = null,
        ?string $fromStatus = null,
        ?string $toStatus = null,
        ?string $performedBy = null,
        ?string $notes = null,
        ?array $metadata = null
    ): self {
        return self::create([
            'organization_id' => $organizationId,
            'subscription_id' => $subscriptionId,
            'action' => $action,
            'from_plan_id' => $fromPlanId,
            'to_plan_id' => $toPlanId,
            'from_status' => $fromStatus,
            'to_status' => $toStatus,
            'performed_by' => $performedBy,
            'notes' => $notes,
            'metadata' => $metadata,
        ]);
    }
}
