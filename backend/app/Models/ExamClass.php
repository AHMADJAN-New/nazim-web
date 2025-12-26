<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class ExamClass extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'exam_classes';
    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'exam_id',
        'class_academic_year_id',
        'organization_id',
        'school_id',
    ];

    protected $casts = [
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

    public function classAcademicYear()
    {
        return $this->belongsTo(ClassAcademicYear::class, 'class_academic_year_id');
    }

    public function examSubjects()
    {
        return $this->hasMany(ExamSubject::class, 'exam_class_id');
    }

    public function examTimes()
    {
        return $this->hasMany(ExamTime::class, 'exam_class_id');
    }

    public function examStudents()
    {
        return $this->hasMany(ExamStudent::class, 'exam_class_id');
    }
}
