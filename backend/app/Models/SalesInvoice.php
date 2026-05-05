<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SalesInvoice extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'sales_invoices';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'organization_id',
        'subscription_id',
        'organization_order_form_id',
        'invoice_number',
        'currency',
        'subtotal',
        'tax_amount',
        'discount_amount',
        'total_amount',
        'status',
        'issued_at',
        'sent_at',
        'paid_at',
        'cancelled_at',
        'due_date',
        'notes',
        'metadata',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'issued_at' => 'date',
        'due_date' => 'date',
        'sent_at' => 'datetime',
        'paid_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'metadata' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    public const STATUS_DRAFT = 'draft';
    public const STATUS_SENT = 'sent';
    public const STATUS_PAID = 'paid';
    public const STATUS_CANCELLED = 'cancelled';

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }

            if (empty($model->invoice_number)) {
                $model->invoice_number = self::generateInvoiceNumber($model->organization_id);
            }

            if (empty($model->issued_at)) {
                $model->issued_at = Carbon::now()->toDateString();
            }
        });
    }

    /**
     * Generate a unique invoice number using OrganizationCounter (concurrency-safe).
     * Format: SAL-YYYYMM-NNNN.
     */
    public static function generateInvoiceNumber(?string $organizationId = null): string
    {
        $prefix = 'SAL';
        $ym = date('Ym');

        if ($organizationId === null || $organizationId === '') {
            $last = self::where('invoice_number', 'like', "{$prefix}-{$ym}-%")
                ->orderBy('invoice_number', 'desc')
                ->first();
            $sequence = $last ? (int) explode('-', $last->invoice_number)[2] + 1 : 1;

            return sprintf('%s-%s-%04d', $prefix, $ym, $sequence);
        }

        $counterType = "sales_invoice_{$ym}";

        $sequence = DB::transaction(function () use ($organizationId, $counterType) {
            $counter = OrganizationCounter::lockForUpdate()
                ->where('organization_id', $organizationId)
                ->where('counter_type', $counterType)
                ->first();

            if (! $counter) {
                $counter = OrganizationCounter::create([
                    'organization_id' => $organizationId,
                    'counter_type' => $counterType,
                    'last_value' => 0,
                ]);
            }

            $counter->increment('last_value');
            $counter->refresh();

            return (int) $counter->last_value;
        });

        return sprintf('%s-%s-%04d', $prefix, $ym, $sequence);
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    public function subscription()
    {
        return $this->belongsTo(OrganizationSubscription::class, 'subscription_id');
    }

    public function orderForm()
    {
        return $this->belongsTo(OrganizationOrderForm::class, 'organization_order_form_id');
    }

    public function items()
    {
        return $this->hasMany(SalesInvoiceItem::class, 'sales_invoice_id')
            ->whereNull('deleted_at')
            ->orderBy('sort_order')
            ->orderBy('created_at');
    }

    public function paymentRecords()
    {
        return $this->hasMany(PaymentRecord::class, 'sales_invoice_id')
            ->whereNull('deleted_at')
            ->orderByDesc('payment_date')
            ->orderByDesc('created_at');
    }
}

