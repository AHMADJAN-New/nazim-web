<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class ExamResult extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'exam_results';
    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'exam_id',
        'exam_subject_id',
        'exam_student_id',
        'student_admission_id',
        'marks_obtained',
        'is_absent',
        'remarks',
        'organization_id',
        'school_id',
    ];

    protected $casts = [
        'marks_obtained' => 'decimal:2',
        'is_absent' => 'boolean',
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
        });
    }

    public function exam()
    {
        return $this->belongsTo(Exam::class, 'exam_id');
    }

    public function examSubject()
    {
        return $this->belongsTo(ExamSubject::class, 'exam_subject_id');
    }

    public function examStudent()
    {
        return $this->belongsTo(ExamStudent::class, 'exam_student_id');
    }

    public function studentAdmission()
    {
        return $this->belongsTo(StudentAdmission::class, 'student_admission_id');
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }
}
