<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Grade extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'grades';

    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'organization_id',
        'name_en',
        'name_ar',
        'name_ps',
        'name_fa',
        'min_percentage',
        'max_percentage',
        'order',
        'is_pass',
    ];

    protected $casts = [
        'min_percentage' => 'decimal:2',
        'max_percentage' => 'decimal:2',
        'order' => 'integer',
        'is_pass' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Boot the model
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
     * Get the organization that owns the grade
     */
    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    /**
     * Scope to filter by organization
     */
    public function scopeForOrganization($query, $organizationId)
    {
        return $query->where('organization_id', $organizationId);
    }

    /**
     * Scope to order by grade order (descending - highest first)
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('order', 'desc');
    }

    /**
     * Scope to get passing grades only
     */
    public function scopePassing($query)
    {
        return $query->where('is_pass', true);
    }

    /**
     * Scope to get failing grades only
     */
    public function scopeFailing($query)
    {
        return $query->where('is_pass', false);
    }

    /**
     * Get the name based on locale
     */
    public function getName(?string $locale = null): string
    {
        $locale = $locale ?? app()->getLocale();

        return match($locale) {
            'ar' => $this->name_ar,
            'ps' => $this->name_ps,
            'fa' => $this->name_fa,
            default => $this->name_en,
        };
    }
}
