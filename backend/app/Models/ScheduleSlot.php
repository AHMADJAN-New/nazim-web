<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class ScheduleSlot extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'schedule_slots';

    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'organization_id',
        'name',
        'code',
        'start_time',
        'end_time',
        'days_of_week',
        'default_duration_minutes',
        'academic_year_id',
        'school_id',
        'sort_order',
        'is_active',
        'description',
    ];

    protected $casts = [
        'days_of_week' => 'array', // JSONB array of day names
        'default_duration_minutes' => 'integer',
        'sort_order' => 'integer',
        'is_active' => 'boolean',
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
     * Get the organization that owns the schedule slot
     */
    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    /**
     * Get the academic year for this schedule slot
     */
    public function academicYear()
    {
        return $this->belongsTo(AcademicYear::class, 'academic_year_id');
    }

    /**
     * Get the school for this schedule slot
     */
    public function school()
    {
        return $this->belongsTo(SchoolBranding::class, 'school_id');
    }

    /**
     * Scope to filter by organization
     */
    public function scopeForOrganization($query, $organizationId)
    {
        if ($organizationId === null) {
            return $query->whereNull('organization_id');
        }
        return $query->where('organization_id', $organizationId);
    }

    /**
     * Scope to include global schedule slots (organization_id IS NULL)
     */
    public function scopeWithGlobal($query, $organizationId)
    {
        if ($organizationId === null) {
            return $query->whereNull('organization_id');
        }
        return $query->where(function ($q) use ($organizationId) {
            $q->where('organization_id', $organizationId)
              ->orWhereNull('organization_id');
        });
    }

    /**
     * Scope to filter active schedule slots
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to filter by academic year
     */
    public function scopeForAcademicYear($query, $academicYearId)
    {
        if ($academicYearId === null) {
            return $query->whereNull('academic_year_id');
        }
        return $query->where('academic_year_id', $academicYearId);
    }
}

