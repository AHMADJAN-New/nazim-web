<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class CourseAttendanceGroup extends Model
{
    use SoftDeletes;

    protected $connection = 'pgsql';

    protected $table = 'course_attendance_groups';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'id',
        'organization_id',
        'school_id',
        'course_id',
        'name',
        'description',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (CourseAttendanceGroup $model): void {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(ShortTermCourse::class, 'course_id');
    }

    public function members(): HasMany
    {
        return $this->hasMany(CourseAttendanceGroupStudent::class, 'course_attendance_group_id');
    }

    public function students(): BelongsToMany
    {
        return $this->belongsToMany(
            CourseStudent::class,
            'course_attendance_group_students',
            'course_attendance_group_id',
            'course_student_id'
        )->whereNull('course_students.deleted_at');
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(CourseAttendanceSession::class, 'attendance_group_id');
    }
}
