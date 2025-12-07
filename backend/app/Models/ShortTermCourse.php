<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class ShortTermCourse extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'short_term_courses';

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'organization_id',
        'name',
        'name_en',
        'name_ar',
        'name_ps',
        'name_fa',
        'description',
        'start_date',
        'end_date',
        'duration_days',
        'max_students',
        'status',
        'fee_amount',
        'instructor_name',
        'location',
        'created_by',
        'closed_at',
        'closed_by',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'duration_days' => 'integer',
        'max_students' => 'integer',
        'fee_amount' => 'decimal:2',
        'closed_at' => 'datetime',
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

            if (empty($model->status)) {
                $model->status = 'draft';
            }
        });
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(Profile::class, 'created_by');
    }

    public function closedBy()
    {
        return $this->belongsTo(Profile::class, 'closed_by');
    }

    public function courseStudents()
    {
        return $this->hasMany(CourseStudent::class, 'course_id');
    }

    public function scopeOpen($query)
    {
        return $query->where('status', 'open');
    }

    public function scopeClosed($query)
    {
        return $query->where('status', 'closed');
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopeDraft($query)
    {
        return $query->where('status', 'draft');
    }

    public function close(string $profileId): void
    {
        $this->status = 'closed';
        $this->closed_at = now();
        $this->closed_by = $profileId;
        $this->save();
    }

    public function reopen(): void
    {
        $this->status = 'open';
        $this->closed_at = null;
        $this->closed_by = null;
        $this->save();
    }

    public function canEnroll(): bool
    {
        if ($this->status !== 'open') {
            return false;
        }

        if ($this->max_students === null) {
            return true;
        }

        return $this->enrollmentCount() < $this->max_students;
    }

    public function enrollmentCount(): int
    {
        return $this->courseStudents()->whereNull('deleted_at')->count();
    }
}
