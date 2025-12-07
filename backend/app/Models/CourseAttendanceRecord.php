<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class CourseAttendanceRecord extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'course_attendance_records';

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'attendance_session_id',
        'organization_id',
        'course_id',
        'course_student_id',
        'status',
        'entry_method',
        'marked_at',
        'marked_by',
        'note',
    ];

    protected $casts = [
        'marked_at' => 'datetime',
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
            if (empty($model->marked_at)) {
                $model->marked_at = now();
            }
        });
    }

    public function session()
    {
        return $this->belongsTo(CourseAttendanceSession::class, 'attendance_session_id');
    }

    public function courseStudent()
    {
        return $this->belongsTo(CourseStudent::class, 'course_student_id');
    }

    public function course()
    {
        return $this->belongsTo(ShortTermCourse::class, 'course_id');
    }

    public function markedBy()
    {
        return $this->belongsTo(Profile::class, 'marked_by');
    }

    public function scopePresent($query)
    {
        return $query->where('status', 'present');
    }

    public function scopeAbsent($query)
    {
        return $query->where('status', 'absent');
    }
}
