<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class StudentAdmission extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'student_admissions';

    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'organization_id',
        'school_id',
        'student_id',
        'academic_year_id',
        'class_id',
        'class_academic_year_id',
        'residency_type_id',
        'room_id',
        'admission_year',
        'admission_date',
        'enrollment_status',
        'enrollment_type',
        'shift',
        'is_boarder',
        'fee_status',
        'placement_notes',
    ];

    protected $casts = [
        'admission_date' => 'date',
        'is_boarder' => 'boolean',
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
     * Get the student for this admission
     */
    public function student()
    {
        return $this->belongsTo(Student::class, 'student_id');
    }

    /**
     * Get the organization that owns the admission
     */
    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    /**
     * Get the school for this admission
     */
    public function school()
    {
        return $this->belongsTo(SchoolBranding::class, 'school_id');
    }

    /**
     * Get the academic year for this admission
     */
    public function academicYear()
    {
        return $this->belongsTo(AcademicYear::class, 'academic_year_id');
    }

    /**
     * Get the class for this admission
     */
    public function class()
    {
        return $this->belongsTo(ClassModel::class, 'class_id');
    }

    /**
     * Get the class academic year for this admission
     */
    public function classAcademicYear()
    {
        return $this->belongsTo(ClassAcademicYear::class, 'class_academic_year_id');
    }

    /**
     * Get the residency type for this admission
     */
    public function residencyType()
    {
        return $this->belongsTo(ResidencyType::class, 'residency_type_id');
    }

    /**
     * Get the room for this admission
     */
    public function room()
    {
        return $this->belongsTo(Room::class, 'room_id');
    }

    /**
     * Scope to filter by organization
     */
    public function scopeForOrganization($query, $organizationId)
    {
        return $query->where('organization_id', $organizationId);
    }

    /**
     * Scope to filter by student
     */
    public function scopeForStudent($query, $studentId)
    {
        return $query->where('student_id', $studentId);
    }

    /**
     * Scope to filter by academic year
     */
    public function scopeForAcademicYear($query, $academicYearId)
    {
        return $query->where('academic_year_id', $academicYearId);
    }

    /**
     * Scope to filter by enrollment status
     */
    public function scopeByStatus($query, $status)
    {
        return $query->where('enrollment_status', $status);
    }

    /**
     * Scope to filter boarders
     */
    public function scopeBoarders($query)
    {
        return $query->where('is_boarder', true);
    }

    /**
     * Scope to filter active enrollments
     */
    public function scopeActive($query)
    {
        return $query->where('enrollment_status', 'active');
    }
}

