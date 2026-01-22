<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class CourseStudent extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'course_students';

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'organization_id',
        'school_id',
        'course_id',
        'main_student_id',
        'admission_no',
        'registration_date',
        'completion_status',
        'completion_date',
        'grade',
        'certificate_issued',
        'certificate_issued_date',
        'certificate_template_id',
        'certificate_number',
        'fee_paid',
        'fee_paid_date',
        'fee_amount',
        'card_number',
        'full_name',
        'father_name',
        'grandfather_name',
        'mother_name',
        'gender',
        'birth_year',
        'birth_date',
        'age',
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
        'emergency_contact_name',
        'emergency_contact_phone',
        'family_income',
        'picture_path',
        'is_orphan',
        'disability_status',
    ];

    protected $casts = [
        'registration_date' => 'date',
        'completion_date' => 'date',
        'certificate_issued' => 'boolean',
        'certificate_issued_date' => 'date',
        'fee_paid' => 'boolean',
        'fee_paid_date' => 'date',
        'fee_amount' => 'decimal:2',
        'birth_date' => 'date',
        'birth_year' => 'integer',
        'age' => 'integer',
        'is_orphan' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }

            if (empty($model->completion_status)) {
                $model->completion_status = 'enrolled';
            }
        });
    }

    public function course()
    {
        return $this->belongsTo(ShortTermCourse::class, 'course_id');
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    public function mainStudent()
    {
        return $this->belongsTo(Student::class, 'main_student_id');
    }

    public function disciplineRecords()
    {
        return $this->hasMany(CourseStudentDisciplineRecord::class, 'course_student_id');
    }

    public function certificateTemplate()
    {
        return $this->belongsTo(CertificateTemplate::class, 'certificate_template_id');
    }

    public function scopeEnrolled($query)
    {
        return $query->where('completion_status', 'enrolled');
    }

    public function scopeCompleted($query)
    {
        return $query->where('completion_status', 'completed');
    }

    public function scopeDropped($query)
    {
        return $query->where('completion_status', 'dropped');
    }

    public function markCompleted(?string $date = null): void
    {
        $this->completion_status = 'completed';
        $this->completion_date = $date ? now()->parse($date) : now();
        $this->save();
    }

    public function markDropped(): void
    {
        $this->completion_status = 'dropped';
        $this->save();
    }

    public function issueCertificate(?string $date = null): void
    {
        $this->certificate_issued = true;
        $this->certificate_issued_date = $date ? now()->parse($date) : now();
        $this->save();
    }
}
