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
        'school_id',
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
                    ->where('school_id', $model->school_id)
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
     * Get the school that owns the academic year
     */
    public function school()
    {
        return $this->belongsTo(SchoolBranding::class, 'school_id');
    }

    /**
     * Get all class academic year instances for this academic year
     */
    public function classAcademicYears()
    {
        return $this->hasMany(ClassAcademicYear::class, 'academic_year_id');
    }

    /**
     * Get all exams for this academic year
     */
    public function exams()
    {
        return $this->hasMany(Exam::class, 'academic_year_id');
    }

    /**
     * Scope to filter by organization.
     * Note: Academic years are strictly school-scoped (no global rows).
     */
    public function scopeForOrganization($query, $organizationId)
    {
        if (!$organizationId) {
            return $query->whereRaw('1=0');
        }
        return $query->where('organization_id', $organizationId);
    }

    /**
     * Scope to filter current academic year
     */
    public function scopeCurrent($query)
    {
        return $query->where('is_current', true);
    }
}
