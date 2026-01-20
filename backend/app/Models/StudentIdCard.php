<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class StudentIdCard extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'student_id_cards';

    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'organization_id',
        'school_id',
        'student_id',
        'student_admission_id',
        'course_student_id',
        'id_card_template_id',
        'academic_year_id',
        'class_id',
        'class_academic_year_id',
        'card_number',
        'card_fee',
        'card_fee_paid',
        'card_fee_paid_date',
        'income_entry_id',
        'is_printed',
        'printed_at',
        'printed_by',
        'notes',
    ];

    protected $casts = [
        'card_fee' => 'decimal:2',
        'card_fee_paid' => 'boolean',
        'card_fee_paid_date' => 'datetime',
        'is_printed' => 'boolean',
        'printed_at' => 'datetime',
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
     * Get the organization that owns the ID card
     */
    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    /**
     * Get the school for this ID card
     */
    public function school()
    {
        return $this->belongsTo(SchoolBranding::class, 'school_id');
    }

    /**
     * Get the student for this ID card
     */
    public function student()
    {
        return $this->belongsTo(Student::class, 'student_id');
    }

    /**
     * Get the student admission for this ID card
     */
    public function studentAdmission()
    {
        return $this->belongsTo(StudentAdmission::class, 'student_admission_id');
    }

    /**
     * Get the course student for this ID card
     */
    public function courseStudent()
    {
        return $this->belongsTo(CourseStudent::class, 'course_student_id');
    }

    /**
     * Get the ID card template for this card
     */
    public function template()
    {
        return $this->belongsTo(IdCardTemplate::class, 'id_card_template_id');
    }

    /**
     * Get the academic year for this ID card
     */
    public function academicYear()
    {
        return $this->belongsTo(AcademicYear::class, 'academic_year_id');
    }

    /**
     * Get the class for this ID card
     */
    public function class()
    {
        return $this->belongsTo(ClassModel::class, 'class_id');
    }

    /**
     * Get the class academic year for this ID card
     */
    public function classAcademicYear()
    {
        return $this->belongsTo(ClassAcademicYear::class, 'class_academic_year_id');
    }

    /**
     * Get the user who printed this card
     */
    public function printedBy()
    {
        return $this->belongsTo(Profile::class, 'printed_by');
    }

    /**
     * Get the income entry for this ID card fee payment
     */
    public function incomeEntry()
    {
        return $this->belongsTo(IncomeEntry::class, 'income_entry_id');
    }

    /**
     * Scope to filter by organization
     */
    public function scopeForOrganization($query, $organizationId)
    {
        return $query->where('organization_id', $organizationId);
    }

    /**
     * Scope to filter by school
     */
    public function scopeForSchool($query, $schoolId)
    {
        return $query->where('school_id', $schoolId);
    }

    /**
     * Scope to filter by accessible schools
     */
    public function scopeForAccessibleSchools($query, array $schoolIds)
    {
        if (empty($schoolIds)) {
            return $query->whereRaw('1 = 0'); // Return no results if no accessible schools
        }
        return $query->whereIn('school_id', $schoolIds);
    }

    /**
     * Scope to filter by academic year
     */
    public function scopeForAcademicYear($query, $academicYearId)
    {
        return $query->where('academic_year_id', $academicYearId);
    }

    /**
     * Scope to filter by class
     */
    public function scopeForClass($query, $classId)
    {
        return $query->where('class_id', $classId);
    }

    /**
     * Scope to filter by class academic year
     */
    public function scopeForClassAcademicYear($query, $classAcademicYearId)
    {
        return $query->where('class_academic_year_id', $classAcademicYearId);
    }

    /**
     * Scope to filter by template
     */
    public function scopeForTemplate($query, $templateId)
    {
        return $query->where('id_card_template_id', $templateId);
    }

    /**
     * Scope to filter active cards (not soft-deleted)
     */
    public function scopeActive($query)
    {
        return $query->whereNull('deleted_at');
    }

    /**
     * Scope to filter printed cards
     */
    public function scopePrinted($query)
    {
        return $query->where('is_printed', true);
    }

    /**
     * Scope to filter unprinted cards
     */
    public function scopeUnprinted($query)
    {
        return $query->where('is_printed', false);
    }

    /**
     * Scope to filter fee paid cards
     */
    public function scopeFeePaid($query)
    {
        return $query->where('card_fee_paid', true);
    }

    /**
     * Scope to filter fee unpaid cards
     */
    public function scopeFeeUnpaid($query)
    {
        return $query->where('card_fee_paid', false);
    }

    /**
     * Scope to filter by course student
     */
    public function scopeForCourseStudent($query, $courseStudentId)
    {
        return $query->where('course_student_id', $courseStudentId);
    }

    /**
     * Scope to filter regular students only (exclude course students)
     */
    public function scopeForRegularStudents($query)
    {
        return $query->whereNull('course_student_id');
    }

    /**
     * Scope to filter course students only
     */
    public function scopeForCourseStudents($query)
    {
        return $query->whereNotNull('course_student_id');
    }
}

