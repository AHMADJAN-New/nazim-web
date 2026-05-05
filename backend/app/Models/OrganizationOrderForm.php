<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class OrganizationOrderForm extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'organization_order_forms';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'organization_id',
        'subscription_id',
        'plan_id',
        'status',
        'form_number',
        'issue_date',
        'currency',
        'customer_organization_name',
        'customer_address',
        'customer_contact_name',
        'customer_contact_title',
        'customer_email',
        'customer_phone',
        'customer_whatsapp',
        'customer_notes',
        'provider_organization_name',
        'provider_address',
        'provider_contact_name',
        'provider_contact_title',
        'provider_email',
        'provider_phone',
        'provider_website',
        'provider_notes',
        'plan_name_override',
        'plan_description',
        'billing_cycle',
        'subscription_start_date',
        'subscription_end_date',
        'license_fee',
        'maintenance_fee',
        'additional_services_fee',
        'tax_amount',
        'discount_name',
        'discount_percentage',
        'discount_amount',
        'total_amount',
        'payment_terms',
        'payment_notes',
        'max_students',
        'max_staff',
        'max_system_users',
        'max_storage_gb',
        'limits_notes',
        'implementation_date',
        'training_mode',
        'special_requirements',
        'additional_modules',
        'important_terms',
        'acceptance_notes',
        'acceptance_confirmed',
        'customer_signatory_name',
        'customer_signatory_title',
        'customer_signed_at',
        'provider_signatory_name',
        'provider_signatory_title',
        'provider_signed_at',
        'internal_notes',
        'created_by',
        'updated_by',
        'metadata',
    ];

    protected $casts = [
        'issue_date' => 'date',
        'subscription_start_date' => 'date',
        'subscription_end_date' => 'date',
        'license_fee' => 'decimal:2',
        'maintenance_fee' => 'decimal:2',
        'additional_services_fee' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'discount_percentage' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'max_storage_gb' => 'decimal:2',
        'implementation_date' => 'date',
        'acceptance_confirmed' => 'boolean',
        'customer_signed_at' => 'date',
        'provider_signed_at' => 'date',
        'metadata' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
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

    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    public function subscription()
    {
        return $this->belongsTo(OrganizationSubscription::class, 'subscription_id');
    }

    public function plan()
    {
        return $this->belongsTo(SubscriptionPlan::class, 'plan_id');
    }

    public function documents()
    {
        return $this->hasMany(OrganizationOrderFormDocument::class, 'organization_order_form_id')
            ->whereNull('deleted_at')
            ->orderByDesc('created_at');
    }

    public function payments()
    {
        return $this->hasMany(OrganizationOrderFormPayment::class, 'organization_order_form_id')
            ->whereNull('deleted_at')
            ->orderByDesc('payment_date')
            ->orderByDesc('created_at');
    }

    public function createdByUser()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedByUser()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
