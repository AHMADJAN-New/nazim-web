<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Carbon\Carbon;

class MaintenanceInvoice extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'maintenance_invoices';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'organization_id',
        'subscription_id',
        'invoice_number',
        'amount',
        'currency',
        'billing_period',
        'period_start',
        'period_end',
        'due_date',
        'status',
        'generated_at',
        'sent_at',
        'paid_at',
        'cancelled_at',
        'payment_record_id',
        'notes',
        'metadata',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'period_start' => 'date',
        'period_end' => 'date',
        'due_date' => 'date',
        'generated_at' => 'datetime',
        'sent_at' => 'datetime',
        'paid_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'metadata' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    // Status constants
    const STATUS_PENDING = 'pending';
    const STATUS_SENT = 'sent';
    const STATUS_PAID = 'paid';
    const STATUS_OVERDUE = 'overdue';
    const STATUS_CANCELLED = 'cancelled';

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
            
            // Generate invoice number if not set
            if (empty($model->invoice_number)) {
                $model->invoice_number = self::generateInvoiceNumber($model->organization_id);
            }
            
            // Set generated_at if not set
            if (empty($model->generated_at)) {
                $model->generated_at = Carbon::now();
            }
        });
    }

    /**
     * Generate a unique invoice number
     */
    public static function generateInvoiceNumber(?string $organizationId = null): string
    {
        $prefix = 'MNT';
        $year = date('Y');
        $month = date('m');
        
        // Get the last invoice number for this month
        $lastInvoice = self::where('invoice_number', 'like', "{$prefix}-{$year}{$month}-%")
            ->orderBy('invoice_number', 'desc')
            ->first();
        
        if ($lastInvoice) {
            // Extract the sequence number and increment
            $parts = explode('-', $lastInvoice->invoice_number);
            $sequence = (int) end($parts) + 1;
        } else {
            $sequence = 1;
        }
        
        return sprintf('%s-%s%s-%04d', $prefix, $year, $month, $sequence);
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
     * Get the payment record
     */
    public function paymentRecord()
    {
        return $this->belongsTo(PaymentRecord::class, 'payment_record_id');
    }

    /**
     * Check if invoice is pending
     */
    public function isPending(): bool
    {
        return in_array($this->status, [self::STATUS_PENDING, self::STATUS_SENT]);
    }

    /**
     * Check if invoice is paid
     */
    public function isPaid(): bool
    {
        return $this->status === self::STATUS_PAID;
    }

    /**
     * Check if invoice is overdue
     */
    public function isOverdue(): bool
    {
        if ($this->status === self::STATUS_OVERDUE) {
            return true;
        }
        
        if ($this->isPaid() || $this->isCancelled()) {
            return false;
        }
        
        return $this->due_date && $this->due_date->isPast();
    }

    /**
     * Check if invoice is cancelled
     */
    public function isCancelled(): bool
    {
        return $this->status === self::STATUS_CANCELLED;
    }

    /**
     * Get days until due
     */
    public function daysUntilDue(): ?int
    {
        if (!$this->due_date) {
            return null;
        }
        
        return max(0, Carbon::now()->diffInDays($this->due_date, false));
    }

    /**
     * Get days overdue
     */
    public function daysOverdue(): int
    {
        if (!$this->due_date || !$this->isOverdue()) {
            return 0;
        }
        
        return abs(Carbon::now()->diffInDays($this->due_date, false));
    }

    /**
     * Mark invoice as sent
     */
    public function markAsSent(): void
    {
        $this->status = self::STATUS_SENT;
        $this->sent_at = Carbon::now();
        $this->save();
    }

    /**
     * Mark invoice as paid
     */
    public function markAsPaid(?string $paymentRecordId = null): void
    {
        $this->status = self::STATUS_PAID;
        $this->paid_at = Carbon::now();
        $this->payment_record_id = $paymentRecordId;
        $this->save();
    }

    /**
     * Mark invoice as overdue
     */
    public function markAsOverdue(): void
    {
        $this->status = self::STATUS_OVERDUE;
        $this->save();
    }

    /**
     * Cancel the invoice
     */
    public function cancel(?string $reason = null): void
    {
        $this->status = self::STATUS_CANCELLED;
        $this->cancelled_at = Carbon::now();
        if ($reason) {
            $this->notes = ($this->notes ? $this->notes . "\n" : '') . "Cancelled: {$reason}";
        }
        $this->save();
    }

    /**
     * Get billing period label
     */
    public function getBillingPeriodLabel(): string
    {
        return match($this->billing_period) {
            'monthly' => 'Monthly',
            'quarterly' => 'Quarterly',
            'yearly' => 'Yearly',
            'custom' => 'Custom',
            default => 'Yearly',
        };
    }

    /**
     * Get status label
     */
    public function getStatusLabel(): string
    {
        return match($this->status) {
            self::STATUS_PENDING => 'Pending',
            self::STATUS_SENT => 'Sent',
            self::STATUS_PAID => 'Paid',
            self::STATUS_OVERDUE => 'Overdue',
            self::STATUS_CANCELLED => 'Cancelled',
            default => 'Unknown',
        };
    }

    /**
     * Scope for pending invoices
     */
    public function scopePending($query)
    {
        return $query->whereIn('status', [self::STATUS_PENDING, self::STATUS_SENT]);
    }

    /**
     * Scope for paid invoices
     */
    public function scopePaid($query)
    {
        return $query->where('status', self::STATUS_PAID);
    }

    /**
     * Scope for overdue invoices
     */
    public function scopeOverdue($query)
    {
        return $query->where(function ($q) {
            $q->where('status', self::STATUS_OVERDUE)
              ->orWhere(function ($q2) {
                  $q2->whereIn('status', [self::STATUS_PENDING, self::STATUS_SENT])
                     ->where('due_date', '<', Carbon::now());
              });
        });
    }

    /**
     * Scope for cancelled invoices
     */
    public function scopeCancelled($query)
    {
        return $query->where('status', self::STATUS_CANCELLED);
    }

    /**
     * Scope for invoices due soon
     */
    public function scopeDueSoon($query, int $days = 7)
    {
        return $query->whereIn('status', [self::STATUS_PENDING, self::STATUS_SENT])
            ->where('due_date', '<=', Carbon::now()->addDays($days))
            ->where('due_date', '>=', Carbon::now());
    }

    /**
     * Scope to filter by billing period
     */
    public function scopeByBillingPeriod($query, string $period)
    {
        return $query->where('billing_period', $period);
    }

    /**
     * Get all available statuses
     */
    public static function getStatuses(): array
    {
        return [
            self::STATUS_PENDING => 'Pending',
            self::STATUS_SENT => 'Sent',
            self::STATUS_PAID => 'Paid',
            self::STATUS_OVERDUE => 'Overdue',
            self::STATUS_CANCELLED => 'Cancelled',
        ];
    }
}

