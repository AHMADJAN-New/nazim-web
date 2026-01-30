<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use App\Services\CodeGenerator;

class OnlineAdmission extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'online_admissions';

    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'organization_id',
        'school_id',
        'student_id',
        'application_no',
        'status',
        'submitted_at',
        'reviewed_by',
        'reviewed_at',
        'accepted_at',
        'rejected_at',
        'rejection_reason',
        'notes',
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
        'previous_grade_level',
        'previous_academic_year',
        'previous_school_notes',
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
        'disability_status',
        'emergency_contact_name',
        'emergency_contact_phone',
        'family_income',
        'picture_path',
    ];

    protected $casts = [
        'submitted_at' => 'datetime',
        'reviewed_at' => 'datetime',
        'accepted_at' => 'datetime',
        'rejected_at' => 'datetime',
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

            if (empty($model->application_no) && !empty($model->organization_id)) {
                $model->application_no = CodeGenerator::generateAdmissionNumber($model->organization_id);
            }
        });
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    public function school()
    {
        return $this->belongsTo(SchoolBranding::class, 'school_id');
    }

    public function student()
    {
        return $this->belongsTo(Student::class, 'student_id');
    }

    public function reviewedBy()
    {
        return $this->belongsTo(Profile::class, 'reviewed_by');
    }

    public function documents()
    {
        return $this->hasMany(OnlineAdmissionDocument::class, 'online_admission_id');
    }

    public function fieldValues()
    {
        return $this->hasMany(OnlineAdmissionFieldValue::class, 'online_admission_id');
    }
}
