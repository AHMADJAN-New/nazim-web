<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class ExamDocument extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'exam_documents';

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'organization_id',
        'school_id',
        'exam_id',
        'exam_class_id',
        'exam_student_id',
        'document_type',
        'title',
        'description',
        'file_name',
        'file_path',
        'mime_type',
        'file_size',
        'uploaded_by',
    ];

    protected $casts = [
        'file_size' => 'integer',
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

    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    public function exam()
    {
        return $this->belongsTo(Exam::class, 'exam_id');
    }

    public function examClass()
    {
        return $this->belongsTo(ExamClass::class, 'exam_class_id');
    }

    public function examStudent()
    {
        return $this->belongsTo(ExamStudent::class, 'exam_student_id');
    }

    public function uploadedBy()
    {
        return $this->belongsTo(Profile::class, 'uploaded_by');
    }

    public function scopeForExam($query, string $examId)
    {
        return $query->where('exam_id', $examId)->whereNull('exam_class_id')->whereNull('exam_student_id');
    }

    public function scopeForClass($query, string $examClassId)
    {
        return $query->where('exam_class_id', $examClassId)->whereNull('exam_student_id');
    }

    public function scopeForStudent($query, string $examStudentId)
    {
        return $query->where('exam_student_id', $examStudentId);
    }

    public function scopeByType($query, string $type)
    {
        return $query->where('document_type', $type);
    }
}
