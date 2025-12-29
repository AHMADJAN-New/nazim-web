<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Organization extends Model
{
    use HasFactory;

    protected $connection = 'pgsql';
    protected $table = 'organizations';
    
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'name',
        'slug',
        'email',
        'phone',
        'website',
        'street_address',
        'city',
        'state_province',
        'country',
        'postal_code',
        'registration_number',
        'tax_id',
        'license_number',
        'type',
        'description',
        'established_date',
        'is_active',
        'contact_person_name',
        'contact_person_email',
        'contact_person_phone',
        'contact_person_position',
        'logo_url',
        'settings',
        'deleted_at',
    ];

    protected $casts = [
        'settings' => 'array',
        'is_active' => 'boolean',
        'established_date' => 'date',
        'deleted_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Boot the model.
     */
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
     * Get all profiles for this organization
     */
    public function profiles()
    {
        return $this->hasMany(Profile::class, 'organization_id');
    }
}
