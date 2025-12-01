<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class AcademicYear extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'academic_years';

    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'organization_id',
        'name',
        'start_date',
        'end_date',
        'is_current',
        'description',
        'status',
    ];

    protected $casts = [
        'is_current' => 'boolean',
        'start_date' => 'date',
        'end_date' => 'date',
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

        // When setting a year as current, unset others for the same organization
        static::updating(function ($model) {
            if ($model->isDirty('is_current') && $model->is_current === true) {
                static::where('organization_id', $model->organization_id)
                    ->where('id', '!=', $model->id)
                    ->whereNull('deleted_at')
                    ->update(['is_current' => false]);
            }
        });
    }

    /**
     * Get the organization that owns the academic year
     */
    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    /**
     * Get all class academic year instances for this academic year
     */
    public function classAcademicYears()
    {
        return $this->hasMany(ClassAcademicYear::class, 'academic_year_id');
    }

    /**
     * Scope to filter by organization (including global years)
     */
    public function scopeForOrganization($query, $organizationId)
    {
        if ($organizationId === null) {
            return $query->whereNull('organization_id');
        }
        return $query->where(function ($q) use ($organizationId) {
            $q->where('organization_id', $organizationId)
              ->orWhereNull('organization_id'); // Include global years
        });
    }

    /**
     * Scope to filter current academic year
     */
    public function scopeCurrent($query)
    {
        return $query->where('is_current', true);
    }
}
