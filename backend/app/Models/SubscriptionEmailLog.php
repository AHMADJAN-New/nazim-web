<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class SubscriptionEmailLog extends Model
{
    use HasFactory;

    protected $connection = 'pgsql';
    protected $table = 'subscription_email_logs';

    public $incrementing = false;
    protected $keyType = 'string';

    // Disable updated_at since we only have created_at
    const UPDATED_AT = null;

    protected $fillable = [
        'id',
        'organization_id',
        'subscription_id',
        'email_type',
        'recipient_email',
        'subject',
        'body',
        'status',
        'sent_at',
        'error_message',
        'metadata',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
        'metadata' => 'array',
        'created_at' => 'datetime',
    ];

    // Email type constants
    const TYPE_TRIAL_WELCOME = 'trial_welcome';
    const TYPE_TRIAL_ENDING = 'trial_ending';
    const TYPE_TRIAL_EXPIRED = 'trial_expired';
    const TYPE_RENEWAL_REMINDER_30 = 'renewal_reminder_30';
    const TYPE_RENEWAL_REMINDER_14 = 'renewal_reminder_14';
    const TYPE_RENEWAL_REMINDER_7 = 'renewal_reminder_7';
    const TYPE_RENEWAL_REMINDER_1 = 'renewal_reminder_1';
    const TYPE_SUBSCRIPTION_EXPIRED = 'subscription_expired';
    const TYPE_GRACE_PERIOD_START = 'grace_period_start';
    const TYPE_GRACE_PERIOD_ENDING = 'grace_period_ending';
    const TYPE_READONLY_PERIOD_START = 'readonly_period_start';
    const TYPE_ACCOUNT_SUSPENDED = 'account_suspended';
    const TYPE_PAYMENT_CONFIRMED = 'payment_confirmed';
    const TYPE_PAYMENT_REJECTED = 'payment_rejected';
    const TYPE_SUBSCRIPTION_ACTIVATED = 'subscription_activated';
    const TYPE_SUBSCRIPTION_UPGRADED = 'subscription_upgraded';
    const TYPE_LIMIT_WARNING = 'limit_warning';
    const TYPE_LIMIT_REACHED = 'limit_reached';

    // Status constants
    const STATUS_SENT = 'sent';
    const STATUS_FAILED = 'failed';
    const STATUS_PENDING = 'pending';

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
            if (empty($model->sent_at)) {
                $model->sent_at = now();
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
     * Log an email
     */
    public static function log(
        string $organizationId,
        string $emailType,
        string $recipientEmail,
        string $subject,
        ?string $body = null,
        string $status = self::STATUS_SENT,
        ?string $subscriptionId = null,
        ?string $errorMessage = null,
        ?array $metadata = null
    ): self {
        return self::create([
            'organization_id' => $organizationId,
            'subscription_id' => $subscriptionId,
            'email_type' => $emailType,
            'recipient_email' => $recipientEmail,
            'subject' => $subject,
            'body' => $body,
            'status' => $status,
            'error_message' => $errorMessage,
            'metadata' => $metadata,
        ]);
    }
}
