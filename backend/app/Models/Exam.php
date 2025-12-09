<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Exam extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'exams';
    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    /**
     * Allowed status values for exam lifecycle
     */
    public const STATUS_DRAFT = 'draft';
    public const STATUS_SCHEDULED = 'scheduled';
    public const STATUS_IN_PROGRESS = 'in_progress';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_ARCHIVED = 'archived';

    public const STATUSES = [
        self::STATUS_DRAFT,
        self::STATUS_SCHEDULED,
        self::STATUS_IN_PROGRESS,
        self::STATUS_COMPLETED,
        self::STATUS_ARCHIVED,
    ];

    protected $fillable = [
        'id',
        'organization_id',
        'academic_year_id',
        'name',
        'description',
        'start_date',
        'end_date',
        'status',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    protected $attributes = [
        'status' => 'draft',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
            // Set default status if not provided
            if (empty($model->status)) {
                $model->status = self::STATUS_DRAFT;
            }
        });
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    public function academicYear()
    {
        return $this->belongsTo(AcademicYear::class, 'academic_year_id');
    }

    public function examClasses()
    {
        return $this->hasMany(ExamClass::class, 'exam_id');
    }

    public function examSubjects()
    {
        return $this->hasMany(ExamSubject::class, 'exam_id');
    }

    public function examStudents()
    {
        return $this->hasMany(ExamStudent::class, 'exam_id');
    }

    public function examResults()
    {
        return $this->hasMany(ExamResult::class, 'exam_id');
    }

    public function examTimes()
    {
        return $this->hasMany(ExamTime::class, 'exam_id');
    }

    public function examAttendances()
    {
        return $this->hasMany(ExamAttendance::class, 'exam_id');
    }

    /**
     * Check if attendance can be marked for this exam
     */
    public function canMarkAttendance(): bool
    {
        return in_array($this->status, [self::STATUS_SCHEDULED, self::STATUS_IN_PROGRESS]);
    }

    /**
     * Check if exam has any attendance records
     */
    public function hasAttendance(): bool
    {
        return $this->examAttendances()->whereNull('deleted_at')->exists();
    }

    /**
     * Scope to filter by status
     */
    public function scopeWithStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope to filter draft exams
     */
    public function scopeDraft($query)
    {
        return $query->where('status', self::STATUS_DRAFT);
    }

    /**
     * Scope to filter scheduled exams
     */
    public function scopeScheduled($query)
    {
        return $query->where('status', self::STATUS_SCHEDULED);
    }

    /**
     * Scope to filter in-progress exams
     */
    public function scopeInProgress($query)
    {
        return $query->where('status', self::STATUS_IN_PROGRESS);
    }

    /**
     * Scope to filter completed exams
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', self::STATUS_COMPLETED);
    }

    /**
     * Scope to filter archived exams
     */
    public function scopeArchived($query)
    {
        return $query->where('status', self::STATUS_ARCHIVED);
    }

    /**
     * Check if exam can be modified (classes, subjects, timetable)
     */
    public function canBeModified(): bool
    {
        return in_array($this->status, [self::STATUS_DRAFT, self::STATUS_SCHEDULED]);
    }

    /**
     * Check if exam configuration is locked
     */
    public function isConfigurationLocked(): bool
    {
        return in_array($this->status, [self::STATUS_COMPLETED, self::STATUS_ARCHIVED]);
    }

    /**
     * Check if marks can be entered for this exam
     */
    public function canEnterMarks(): bool
    {
        return in_array($this->status, [self::STATUS_IN_PROGRESS]);
    }

    /**
     * Check if exam has any results entered
     */
    public function hasResults(): bool
    {
        return $this->examResults()->whereNull('deleted_at')->exists();
    }

    /**
     * Check if exam has any timetable entries
     */
    public function hasTimetable(): bool
    {
        return $this->examTimes()->whereNull('deleted_at')->exists();
    }

    /**
     * Check if a date is within the exam period
     */
    public function isDateWithinPeriod($date): bool
    {
        if (!$this->start_date || !$this->end_date) {
            return true; // Allow if dates not set
        }
        
        $checkDate = is_string($date) ? \Carbon\Carbon::parse($date) : $date;
        return $checkDate->between($this->start_date, $this->end_date);
    }

    /**
     * Get validation rules for status transition
     */
    public static function getStatusTransitionRules(): array
    {
        return [
            self::STATUS_DRAFT => [self::STATUS_SCHEDULED],
            self::STATUS_SCHEDULED => [self::STATUS_DRAFT, self::STATUS_IN_PROGRESS],
            self::STATUS_IN_PROGRESS => [self::STATUS_SCHEDULED, self::STATUS_COMPLETED],
            self::STATUS_COMPLETED => [self::STATUS_IN_PROGRESS, self::STATUS_ARCHIVED],
            self::STATUS_ARCHIVED => [self::STATUS_COMPLETED],
        ];
    }

    /**
     * Check if a status transition is valid
     */
    public function canTransitionTo(string $newStatus): bool
    {
        $allowedTransitions = self::getStatusTransitionRules()[$this->status] ?? [];
        return in_array($newStatus, $allowedTransitions);
    }
}
