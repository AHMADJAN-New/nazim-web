<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class CourseStudentDisciplineRecord extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'course_student_discipline_records';

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'course_student_id',
        'organization_id',
        'school_id',
        'course_id',
        'incident_date',
        'incident_type',
        'description',
        'severity',
        'action_taken',
        'resolved',
        'resolved_date',
        'resolved_by',
        'created_by',
    ];

    protected $casts = [
        'incident_date' => 'date',
        'resolved' => 'boolean',
        'resolved_date' => 'date',
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

            if (empty($model->severity)) {
                $model->severity = 'minor';
            }

            $model->resolved = $model->resolved ?? false;
        });
    }

    public function courseStudent()
    {
        return $this->belongsTo(CourseStudent::class, 'course_student_id');
    }

    public function course()
    {
        return $this->belongsTo(ShortTermCourse::class, 'course_id');
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(Profile::class, 'created_by');
    }

    public function resolvedBy()
    {
        return $this->belongsTo(Profile::class, 'resolved_by');
    }

    public function resolve(?string $date = null, ?string $profileId = null): void
    {
        $this->resolved = true;
        $this->resolved_date = $date ? now()->parse($date) : now();
        $this->resolved_by = $profileId;
        $this->save();
    }
}
