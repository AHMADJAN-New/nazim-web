<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class CourseDocument extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'course_documents';

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'organization_id',
        'school_id',
        'course_id',
        'course_student_id',
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

    public function course()
    {
        return $this->belongsTo(ShortTermCourse::class, 'course_id');
    }

    public function courseStudent()
    {
        return $this->belongsTo(CourseStudent::class, 'course_student_id');
    }

    public function uploadedBy()
    {
        return $this->belongsTo(Profile::class, 'uploaded_by');
    }

    public function scopeForCourse($query, string $courseId)
    {
        return $query->where('course_id', $courseId)->whereNull('course_student_id');
    }

    public function scopeForStudent($query, string $courseStudentId)
    {
        return $query->where('course_student_id', $courseStudentId);
    }

    public function scopeByType($query, string $type)
    {
        return $query->where('document_type', $type);
    }
}
