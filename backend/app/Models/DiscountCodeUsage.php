<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class DiscountCodeUsage extends Model
{
    use HasFactory;

    protected $connection = 'pgsql';
    protected $table = 'discount_code_usage';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'discount_code_id',
        'organization_id',
        'payment_record_id',
        'discount_applied',
        'used_at',
    ];

    protected $casts = [
        'discount_applied' => 'decimal:2',
        'used_at' => 'datetime',
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
            if (empty($model->used_at)) {
                $model->used_at = now();
            }
        });
    }

    /**
     * Get the discount code
     */
    public function discountCode()
    {
        return $this->belongsTo(DiscountCode::class, 'discount_code_id');
    }

    /**
     * Get the organization
     */
    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    /**
     * Get the payment record
     */
    public function paymentRecord()
    {
        return $this->belongsTo(PaymentRecord::class, 'payment_record_id');
    }
}
