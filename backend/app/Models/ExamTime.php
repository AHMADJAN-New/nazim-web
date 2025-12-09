<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class ExamTime extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'exam_times';
    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'organization_id',
        'exam_id',
        'exam_class_id',
        'exam_subject_id',
        'date',
        'start_time',
        'end_time',
        'room_id',
        'invigilator_id',
        'notes',
        'is_locked',
    ];

    protected $casts = [
        'date' => 'date',
        'start_time' => 'string',
        'end_time' => 'string',
        'is_locked' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Boot method to auto-generate UUID
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    /**
     * Get the organization that owns this exam time.
     */
    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    /**
     * Get the exam this time slot belongs to.
     */
    public function exam()
    {
        return $this->belongsTo(Exam::class, 'exam_id');
    }

    /**
     * Get the exam class this time slot is for.
     */
    public function examClass()
    {
        return $this->belongsTo(ExamClass::class, 'exam_class_id');
    }

    /**
     * Get the exam subject this time slot is for.
     */
    public function examSubject()
    {
        return $this->belongsTo(ExamSubject::class, 'exam_subject_id');
    }

    /**
     * Get the room assigned for this exam time slot.
     */
    public function room()
    {
        return $this->belongsTo(Room::class, 'room_id');
    }

    /**
     * Get the invigilator (staff member) assigned for this exam.
     */
    public function invigilator()
    {
        return $this->belongsTo(Staff::class, 'invigilator_id');
    }

    /**
     * Get the attendance records for this exam time slot.
     */
    public function examAttendances()
    {
        return $this->hasMany(ExamAttendance::class, 'exam_time_id');
    }

    /**
     * Scope to filter by organization.
     */
    public function scopeForOrganization($query, $organizationId)
    {
        return $query->where('organization_id', $organizationId);
    }

    /**
     * Scope to filter by exam.
     */
    public function scopeForExam($query, $examId)
    {
        return $query->where('exam_id', $examId);
    }

    /**
     * Scope to filter by exam class.
     */
    public function scopeForExamClass($query, $examClassId)
    {
        return $query->where('exam_class_id', $examClassId);
    }

    /**
     * Scope to filter by date.
     */
    public function scopeOnDate($query, $date)
    {
        return $query->whereDate('date', $date);
    }

    /**
     * Scope to filter locked time slots.
     */
    public function scopeLocked($query)
    {
        return $query->where('is_locked', true);
    }

    /**
     * Scope to filter unlocked time slots.
     */
    public function scopeUnlocked($query)
    {
        return $query->where('is_locked', false);
    }

    /**
     * Check if there's a time conflict with another exam time.
     * Returns true if there's an overlap.
     */
    public function hasTimeConflict($date, $startTime, $endTime, $roomId = null, $excludeId = null)
    {
        $query = static::where('organization_id', $this->organization_id)
            ->whereDate('date', $date)
            ->whereNull('deleted_at');

        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }

        // Check for room conflict if room is specified
        if ($roomId) {
            $query->where('room_id', $roomId);
        }

        // Check for time overlap
        $query->where(function ($q) use ($startTime, $endTime) {
            $q->where(function ($inner) use ($startTime, $endTime) {
                // New time starts during existing time
                $inner->where('start_time', '<=', $startTime)
                      ->where('end_time', '>', $startTime);
            })->orWhere(function ($inner) use ($startTime, $endTime) {
                // New time ends during existing time
                $inner->where('start_time', '<', $endTime)
                      ->where('end_time', '>=', $endTime);
            })->orWhere(function ($inner) use ($startTime, $endTime) {
                // New time completely contains existing time
                $inner->where('start_time', '>=', $startTime)
                      ->where('end_time', '<=', $endTime);
            });
        });

        return $query->exists();
    }
}
