<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class ExamStudent extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'exam_students';
    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'exam_id',
        'exam_class_id',
        'student_admission_id',
        'organization_id',
        'exam_roll_number',
        'exam_secret_number',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
        'exam_roll_number' => 'string',
        'exam_secret_number' => 'string',
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

    public function exam()
    {
        return $this->belongsTo(Exam::class, 'exam_id');
    }

    public function examClass()
    {
        return $this->belongsTo(ExamClass::class, 'exam_class_id');
    }

    public function studentAdmission()
    {
        return $this->belongsTo(StudentAdmission::class, 'student_admission_id');
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    public function examResults()
    {
        return $this->hasMany(ExamResult::class, 'exam_student_id');
    }

    public function examAttendances()
    {
        return $this->hasMany(ExamAttendance::class, 'student_id', 'student_admission_id');
    }

    /**
     * Scope to filter by exam
     */
    public function scopeForExam($query, string $examId)
    {
        return $query->where('exam_id', $examId);
    }

    /**
     * Scope to filter by exam class
     */
    public function scopeForExamClass($query, string $examClassId)
    {
        return $query->where('exam_class_id', $examClassId);
    }

    /**
     * Scope to filter students missing roll number
     */
    public function scopeMissingRollNumber($query)
    {
        return $query->whereNull('exam_roll_number');
    }

    /**
     * Scope to filter students missing secret number
     */
    public function scopeMissingSecretNumber($query)
    {
        return $query->whereNull('exam_secret_number');
    }

    /**
     * Scope to filter students with roll number
     */
    public function scopeHasRollNumber($query)
    {
        return $query->whereNotNull('exam_roll_number');
    }

    /**
     * Scope to filter students with secret number
     */
    public function scopeHasSecretNumber($query)
    {
        return $query->whereNotNull('exam_secret_number');
    }

    /**
     * Check if roll number is unique within exam scope
     */
    public static function isRollNumberUnique(string $examId, string $rollNumber, ?string $excludeId = null): bool
    {
        $query = self::where('exam_id', $examId)
            ->where('exam_roll_number', $rollNumber)
            ->whereNull('deleted_at');
        
        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }
        
        return !$query->exists();
    }

    /**
     * Check if secret number is unique within exam scope
     */
    public static function isSecretNumberUnique(string $examId, string $secretNumber, ?string $excludeId = null): bool
    {
        $query = self::where('exam_id', $examId)
            ->where('exam_secret_number', $secretNumber)
            ->whereNull('deleted_at');
        
        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }
        
        return !$query->exists();
    }

    /**
     * Get the next available roll number for an exam
     */
    public static function getNextRollNumber(string $examId, int $startFrom = 1001): string
    {
        $maxRollNumber = self::where('exam_id', $examId)
            ->whereNull('deleted_at')
            ->whereNotNull('exam_roll_number')
            ->max('exam_roll_number');
        
        if ($maxRollNumber === null) {
            return (string) $startFrom;
        }
        
        // Try to extract numeric part
        if (is_numeric($maxRollNumber)) {
            return (string) (intval($maxRollNumber) + 1);
        }
        
        // If not numeric, return startFrom
        return (string) $startFrom;
    }

    /**
     * Get the next available secret number for an exam
     */
    public static function getNextSecretNumber(string $examId, int $startFrom = 1): string
    {
        $maxSecretNumber = self::where('exam_id', $examId)
            ->whereNull('deleted_at')
            ->whereNotNull('exam_secret_number')
            ->max('exam_secret_number');
        
        if ($maxSecretNumber === null) {
            return (string) $startFrom;
        }
        
        // Try to extract numeric part
        if (is_numeric($maxSecretNumber)) {
            return (string) (intval($maxSecretNumber) + 1);
        }
        
        // If not numeric, return startFrom
        return (string) $startFrom;
    }
}
