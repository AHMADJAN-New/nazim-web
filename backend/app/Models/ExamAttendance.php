<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class ExamAttendance extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'exam_attendances';

    public $incrementing = false;
    protected $keyType = 'string';

    // Status constants
    public const STATUS_PRESENT = 'present';
    public const STATUS_ABSENT = 'absent';
    public const STATUS_LATE = 'late';
    public const STATUS_EXCUSED = 'excused';

    public const STATUSES = [
        self::STATUS_PRESENT,
        self::STATUS_ABSENT,
        self::STATUS_LATE,
        self::STATUS_EXCUSED,
    ];

    protected $fillable = [
        'id',
        'organization_id',
        'school_id',
        'exam_id',
        'exam_time_id',
        'exam_class_id',
        'exam_subject_id',
        'student_id',
        'status',
        'checked_in_at',
        'seat_number',
        'notes',
    ];

    protected $casts = [
        'checked_in_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Boot function to generate UUID on creating
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

    // ========== Relationships ==========

    /**
     * Get the organization that owns the attendance record
     */
    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    /**
     * Get the exam this attendance belongs to
     */
    public function exam()
    {
        return $this->belongsTo(Exam::class, 'exam_id');
    }

    /**
     * Get the exam time slot this attendance belongs to
     */
    public function examTime()
    {
        return $this->belongsTo(ExamTime::class, 'exam_time_id');
    }

    /**
     * Get the exam class this attendance belongs to
     */
    public function examClass()
    {
        return $this->belongsTo(ExamClass::class, 'exam_class_id');
    }

    /**
     * Get the exam subject this attendance belongs to
     */
    public function examSubject()
    {
        return $this->belongsTo(ExamSubject::class, 'exam_subject_id');
    }

    /**
     * Get the student this attendance belongs to
     */
    public function student()
    {
        return $this->belongsTo(Student::class, 'student_id');
    }

    // ========== Scopes ==========

    /**
     * Scope to filter by organization
     */
    public function scopeForOrganization($query, $organizationId)
    {
        return $query->where('organization_id', $organizationId);
    }

    /**
     * Scope to filter by exam
     */
    public function scopeForExam($query, $examId)
    {
        return $query->where('exam_id', $examId);
    }

    /**
     * Scope to filter by exam time
     */
    public function scopeForExamTime($query, $examTimeId)
    {
        return $query->where('exam_time_id', $examTimeId);
    }

    /**
     * Scope to filter by exam class
     */
    public function scopeForExamClass($query, $examClassId)
    {
        return $query->where('exam_class_id', $examClassId);
    }

    /**
     * Scope to filter by status
     */
    public function scopeWithStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope to get present attendances
     */
    public function scopePresent($query)
    {
        return $query->where('status', self::STATUS_PRESENT);
    }

    /**
     * Scope to get absent attendances
     */
    public function scopeAbsent($query)
    {
        return $query->where('status', self::STATUS_ABSENT);
    }

    /**
     * Scope to get late attendances
     */
    public function scopeLate($query)
    {
        return $query->where('status', self::STATUS_LATE);
    }

    /**
     * Scope to get excused attendances
     */
    public function scopeExcused($query)
    {
        return $query->where('status', self::STATUS_EXCUSED);
    }

    // ========== Helper Methods ==========

    /**
     * Check if student is marked as present
     */
    public function isPresent(): bool
    {
        return $this->status === self::STATUS_PRESENT;
    }

    /**
     * Check if student is marked as absent
     */
    public function isAbsent(): bool
    {
        return $this->status === self::STATUS_ABSENT;
    }

    /**
     * Check if student is marked as late
     */
    public function isLate(): bool
    {
        return $this->status === self::STATUS_LATE;
    }

    /**
     * Check if student is marked as excused
     */
    public function isExcused(): bool
    {
        return $this->status === self::STATUS_EXCUSED;
    }

    /**
     * Check if the attendance can be modified based on exam status
     */
    public function canBeModified(): bool
    {
        if (!$this->exam) {
            return false;
        }

        // Only allow modification for scheduled or in_progress exams
        return in_array($this->exam->status, [Exam::STATUS_SCHEDULED, Exam::STATUS_IN_PROGRESS]);
    }

    /**
     * Validate that this attendance record is properly linked
     */
    public static function validateAttendanceData(
        string $examId,
        string $examTimeId,
        string $examClassId,
        string $examSubjectId,
        string $studentId
    ): array {
        $errors = [];

        // Validate exam time belongs to the exam
        $examTime = ExamTime::where('id', $examTimeId)
            ->where('exam_id', $examId)
            ->whereNull('deleted_at')
            ->first();

        if (!$examTime) {
            $errors[] = 'Exam time slot does not belong to this exam';
        }

        // Validate exam class belongs to the exam
        $examClass = ExamClass::where('id', $examClassId)
            ->where('exam_id', $examId)
            ->whereNull('deleted_at')
            ->first();

        if (!$examClass) {
            $errors[] = 'Exam class does not belong to this exam';
        }

        // Validate exam subject belongs to the exam and class
        $examSubject = ExamSubject::where('id', $examSubjectId)
            ->where('exam_id', $examId)
            ->where('exam_class_id', $examClassId)
            ->whereNull('deleted_at')
            ->first();

        if (!$examSubject) {
            $errors[] = 'Exam subject does not belong to this exam class';
        }

        // Validate exam time matches the class and subject
        if ($examTime) {
            if ($examTime->exam_class_id !== $examClassId) {
                $errors[] = 'Exam time slot does not match the exam class';
            }
            if ($examTime->exam_subject_id !== $examSubjectId) {
                $errors[] = 'Exam time slot does not match the exam subject';
            }
        }

        // Validate student is enrolled in the exam
        $examStudent = ExamStudent::where('exam_id', $examId)
            ->where('exam_class_id', $examClassId)
            ->whereHas('studentAdmission', function ($query) use ($studentId) {
                $query->where('student_id', $studentId);
            })
            ->whereNull('deleted_at')
            ->first();

        if (!$examStudent) {
            $errors[] = 'Student is not enrolled in this exam class';
        }

        return $errors;
    }
}
