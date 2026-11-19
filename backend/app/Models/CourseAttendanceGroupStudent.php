<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class CourseAttendanceGroupStudent extends Model
{
    protected $connection = 'pgsql';

    protected $table = 'course_attendance_group_students';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'id',
        'organization_id',
        'school_id',
        'course_attendance_group_id',
        'course_student_id',
    ];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (CourseAttendanceGroupStudent $model): void {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    public function group(): BelongsTo
    {
        return $this->belongsTo(CourseAttendanceGroup::class, 'course_attendance_group_id');
    }

    public function courseStudent(): BelongsTo
    {
        return $this->belongsTo(CourseStudent::class, 'course_student_id');
    }
}
