<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class TeacherSubjectAssignment extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'teacher_subject_assignments';

    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'organization_id',
        'teacher_id',
        'class_academic_year_id',
        'subject_id',
        'schedule_slot_ids',
        'school_id',
        'academic_year_id',
        'is_active',
        'notes',
    ];

    protected $casts = [
        'schedule_slot_ids' => 'array', // JSONB array of UUIDs
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

            // Auto-set organization_id and academic_year_id from class_academic_year if not provided
            if (empty($model->organization_id) || empty($model->academic_year_id)) {
                $classAcademicYear = DB::table('class_academic_years')
                    ->where('id', $model->class_academic_year_id)
                    ->whereNull('deleted_at')
                    ->first();

                if ($classAcademicYear) {
                    if (empty($model->organization_id)) {
                        $model->organization_id = $classAcademicYear->organization_id;
                    }
                    if (empty($model->academic_year_id)) {
                        $model->academic_year_id = $classAcademicYear->academic_year_id;
                    }
                }
            }
        });

        static::updating(function ($model) {
            // Auto-set organization_id and academic_year_id from class_academic_year if not provided
            if (empty($model->organization_id) || empty($model->academic_year_id)) {
                $classAcademicYear = DB::table('class_academic_years')
                    ->where('id', $model->class_academic_year_id)
                    ->whereNull('deleted_at')
                    ->first();

                if ($classAcademicYear) {
                    if (empty($model->organization_id)) {
                        $model->organization_id = $classAcademicYear->organization_id;
                    }
                    if (empty($model->academic_year_id)) {
                        $model->academic_year_id = $classAcademicYear->academic_year_id;
                    }
                }
            }
        });
    }

    /**
     * Get the teacher (staff member)
     */
    public function teacher()
    {
        return $this->belongsTo(Staff::class, 'teacher_id');
    }

    /**
     * Get the subject
     */
    public function subject()
    {
        return $this->belongsTo(Subject::class, 'subject_id');
    }

    /**
     * Get the class academic year
     */
    public function classAcademicYear()
    {
        return $this->belongsTo(ClassAcademicYear::class, 'class_academic_year_id');
    }

    /**
     * Get the academic year
     */
    public function academicYear()
    {
        return $this->belongsTo(AcademicYear::class, 'academic_year_id');
    }

    /**
     * Get the school
     */
    public function school()
    {
        return $this->belongsTo(SchoolBranding::class, 'school_id');
    }

    /**
     * Get the organization
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
        if ($organizationId === null) {
            return $query->whereNull('organization_id');
        }
        return $query->where('organization_id', $organizationId);
    }

    /**
     * Scope to filter by teacher
     */
    public function scopeForTeacher($query, $teacherId)
    {
        return $query->where('teacher_id', $teacherId);
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

    /**
     * Scope to filter active assignments
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}

