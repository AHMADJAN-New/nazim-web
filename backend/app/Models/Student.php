<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Student extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'students';

    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'organization_id',
        'school_id',
        'card_number',
        'admission_no',
        'full_name',
        'father_name',
        'grandfather_name',
        'mother_name',
        'gender',
        'birth_year',
        'birth_date',
        'age',
        'admission_year',
        'orig_province',
        'orig_district',
        'orig_village',
        'curr_province',
        'curr_district',
        'curr_village',
        'nationality',
        'preferred_language',
        'previous_school',
        'guardian_name',
        'guardian_relation',
        'guardian_phone',
        'guardian_tazkira',
        'guardian_picture_path',
        'home_address',
        'zamin_name',
        'zamin_phone',
        'zamin_tazkira',
        'zamin_address',
        'applying_grade',
        'is_orphan',
        'admission_fee_status',
        'student_status',
        'disability_status',
        'emergency_contact_name',
        'emergency_contact_phone',
        'family_income',
        'picture_path',
    ];

    protected $casts = [
        'birth_date' => 'date',
        'age' => 'integer',
        'is_orphan' => 'boolean',
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
     * Get the organization that owns the student
     */
    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    /**
     * Get the school that owns the student
     */
    public function school()
    {
        return $this->belongsTo(SchoolBranding::class, 'school_id');
    }

    /**
     * Get the student's admissions
     */
    public function admissions()
    {
        return $this->hasMany(StudentAdmission::class, 'student_id');
    }

    /**
     * Get the student's documents
     */
    public function documents()
    {
        return $this->hasMany(StudentDocument::class, 'student_id');
    }

    /**
     * Get the student's educational history
     */
    public function educationalHistory()
    {
        return $this->hasMany(StudentEducationalHistory::class, 'student_id');
    }

    /**
     * Get the student's discipline records
     */
    public function disciplineRecords()
    {
        return $this->hasMany(StudentDisciplineRecord::class, 'student_id');
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
     * Scope to filter active students
     */
    public function scopeActive($query)
    {
        return $query->where('student_status', 'active');
    }

    /**
     * Scope to filter by status
     */
    public function scopeByStatus($query, $status)
    {
        return $query->where('student_status', $status);
    }

    /**
     * Scope to filter by gender
     */
    public function scopeByGender($query, $gender)
    {
        return $query->where('gender', $gender);
    }

    /**
     * Scope to filter orphans
     */
    public function scopeOrphans($query)
    {
        return $query->where('is_orphan', true);
    }

    /**
     * Scope to filter by fee status
     */
    public function scopeByFeeStatus($query, $status)
    {
        return $query->where('admission_fee_status', $status);
    }
}

