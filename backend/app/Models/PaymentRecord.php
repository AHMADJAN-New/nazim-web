<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class PaymentRecord extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'payment_records';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'organization_id',
        'subscription_id',
        'amount',
        'currency',
        'payment_method',
        'payment_reference',
        'payment_date',
        'period_start',
        'period_end',
        'status',
        'confirmed_by',
        'confirmed_at',
        'discount_code_id',
        'discount_amount',
        'notes',
        'receipt_path',
        'metadata',
        // New payment type fields
        'payment_type',
        'billing_period',
        'is_recurring',
        'invoice_number',
        'invoice_generated_at',
        'maintenance_invoice_id',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'payment_date' => 'date',
        'period_start' => 'date',
        'period_end' => 'date',
        'confirmed_at' => 'datetime',
        'invoice_generated_at' => 'datetime',
        'is_recurring' => 'boolean',
        'metadata' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    // Status constants
    const STATUS_PENDING = 'pending';
    const STATUS_CONFIRMED = 'confirmed';
    const STATUS_REJECTED = 'rejected';

    // Payment method constants
    const METHOD_BANK_TRANSFER = 'bank_transfer';
    const METHOD_CASH = 'cash';
    const METHOD_CHECK = 'check';
    const METHOD_MOBILE_MONEY = 'mobile_money';
    const METHOD_OTHER = 'other';

    // Payment type constants
    const TYPE_LICENSE = 'license';
    const TYPE_MAINTENANCE = 'maintenance';
    const TYPE_RENEWAL = 'renewal'; // Legacy - for backward compatibility

    // Billing period constants
    const BILLING_MONTHLY = 'monthly';
    const BILLING_QUARTERLY = 'quarterly';
    const BILLING_YEARLY = 'yearly';
    const BILLING_CUSTOM = 'custom';

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
     * Check if payment is confirmed
     */
    public function isConfirmed(): bool
    {
        return $this->status === self::STATUS_CONFIRMED;
    }

    /**
     * Check if payment is pending
     */
    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    /**
     * Check if payment was rejected
     */
    public function isRejected(): bool
    {
        return $this->status === self::STATUS_REJECTED;
    }

    /**
     * Check if this is a license payment
     */
    public function isLicensePayment(): bool
    {
        return $this->payment_type === self::TYPE_LICENSE;
    }

    /**
     * Check if this is a maintenance payment
     */
    public function isMaintenancePayment(): bool
    {
        return $this->payment_type === self::TYPE_MAINTENANCE;
    }

    /**
     * Check if this is a legacy renewal payment
     */
    public function isRenewalPayment(): bool
    {
        return $this->payment_type === self::TYPE_RENEWAL;
    }

    /**
     * Check if this is a recurring payment
     */
    public function isRecurring(): bool
    {
        return $this->is_recurring === true;
    }

    /**
     * Get net amount after discount
     */
    public function getNetAmount(): float
    {
        return (float) $this->amount - (float) $this->discount_amount;
    }

    /**
     * Get the payment type label
     */
    public function getPaymentTypeLabel(): string
    {
        return match($this->payment_type) {
            self::TYPE_LICENSE => 'License Fee',
            self::TYPE_MAINTENANCE => 'Maintenance Fee',
            self::TYPE_RENEWAL => 'Renewal',
            default => 'Payment',
        };
    }

    /**
     * Get the billing period label
     */
    public function getBillingPeriodLabel(): string
    {
        return match($this->billing_period) {
            self::BILLING_MONTHLY => 'Monthly',
            self::BILLING_QUARTERLY => 'Quarterly',
            self::BILLING_YEARLY => 'Yearly',
            self::BILLING_CUSTOM => 'Custom',
            default => 'Yearly',
        };
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
     * Get the discount code used
     */
    public function discountCode()
    {
        return $this->belongsTo(DiscountCode::class, 'discount_code_id');
    }

    /**
     * Get the user who confirmed the payment
     */
    public function confirmedByUser()
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }

    /**
     * Get the maintenance invoice this payment is for
     */
    public function maintenanceInvoice()
    {
        return $this->belongsTo(MaintenanceInvoice::class, 'maintenance_invoice_id');
    }

    /**
     * Scope for pending payments
     */
    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    /**
     * Scope for confirmed payments
     */
    public function scopeConfirmed($query)
    {
        return $query->where('status', self::STATUS_CONFIRMED);
    }

    /**
     * Scope for rejected payments
     */
    public function scopeRejected($query)
    {
        return $query->where('status', self::STATUS_REJECTED);
    }

    /**
     * Scope for license payments
     */
    public function scopeLicensePayments($query)
    {
        return $query->where('payment_type', self::TYPE_LICENSE);
    }

    /**
     * Scope for maintenance payments
     */
    public function scopeMaintenancePayments($query)
    {
        return $query->where('payment_type', self::TYPE_MAINTENANCE);
    }

    /**
     * Scope for renewal payments (legacy)
     */
    public function scopeRenewalPayments($query)
    {
        return $query->where('payment_type', self::TYPE_RENEWAL);
    }

    /**
     * Scope for recurring payments
     */
    public function scopeRecurring($query)
    {
        return $query->where('is_recurring', true);
    }

    /**
     * Scope for one-time payments
     */
    public function scopeOneTime($query)
    {
        return $query->where('is_recurring', false);
    }

    /**
     * Scope to filter by billing period
     */
    public function scopeByBillingPeriod($query, string $period)
    {
        return $query->where('billing_period', $period);
    }

    /**
     * Scope to filter by payment type
     */
    public function scopeByPaymentType($query, string $type)
    {
        return $query->where('payment_type', $type);
    }

    /**
     * Get all available payment types
     */
    public static function getPaymentTypes(): array
    {
        return [
            self::TYPE_LICENSE => 'License Fee',
            self::TYPE_MAINTENANCE => 'Maintenance Fee',
            self::TYPE_RENEWAL => 'Renewal (Legacy)',
        ];
    }

    /**
     * Get all available billing periods
     */
    public static function getBillingPeriods(): array
    {
        return [
            self::BILLING_MONTHLY => 'Monthly',
            self::BILLING_QUARTERLY => 'Quarterly',
            self::BILLING_YEARLY => 'Yearly',
            self::BILLING_CUSTOM => 'Custom',
        ];
    }
}
