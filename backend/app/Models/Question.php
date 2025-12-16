<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Question extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'questions';
    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    /**
     * Question types
     */
    public const TYPE_MCQ = 'mcq';
    public const TYPE_SHORT = 'short';
    public const TYPE_DESCRIPTIVE = 'descriptive';
    public const TYPE_TRUE_FALSE = 'true_false';
    public const TYPE_ESSAY = 'essay';

    public const TYPES = [
        self::TYPE_MCQ,
        self::TYPE_SHORT,
        self::TYPE_DESCRIPTIVE,
        self::TYPE_TRUE_FALSE,
        self::TYPE_ESSAY,
    ];

    /**
     * Difficulty levels
     */
    public const DIFFICULTY_EASY = 'easy';
    public const DIFFICULTY_MEDIUM = 'medium';
    public const DIFFICULTY_HARD = 'hard';

    public const DIFFICULTIES = [
        self::DIFFICULTY_EASY,
        self::DIFFICULTY_MEDIUM,
        self::DIFFICULTY_HARD,
    ];

    protected $fillable = [
        'id',
        'organization_id',
        'school_id',
        'subject_id',
        'class_academic_year_id',
        'exam_id',
        'type',
        'difficulty',
        'marks',
        'text',
        'text_rtl',
        'options',
        'correct_answer',
        'reference',
        'tags',
        'is_active',
        'created_by',
        'updated_by',
        'deleted_by',
    ];

    protected $casts = [
        'marks' => 'decimal:2',
        'text_rtl' => 'boolean',
        'options' => 'array',
        'tags' => 'array',
        'is_active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    protected $attributes = [
        'difficulty' => 'medium',
        'marks' => 1,
        'text_rtl' => false,
        'is_active' => true,
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

    // ========== Relationships ==========

    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    public function school()
    {
        return $this->belongsTo(SchoolBranding::class, 'school_id');
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class, 'subject_id');
    }

    public function classAcademicYear()
    {
        return $this->belongsTo(ClassAcademicYear::class, 'class_academic_year_id');
    }

    public function exam()
    {
        return $this->belongsTo(Exam::class, 'exam_id');
    }

    public function creator()
    {
        return $this->belongsTo(Profile::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(Profile::class, 'updated_by');
    }

    public function deleter()
    {
        return $this->belongsTo(Profile::class, 'deleted_by');
    }

    public function examPaperItems()
    {
        return $this->hasMany(ExamPaperItem::class, 'question_id');
    }

    // ========== Scopes ==========

    public function scopeForOrganization($query, $organizationId)
    {
        return $query->where('organization_id', $organizationId);
    }

    public function scopeForSchool($query, $schoolId)
    {
        return $query->where('school_id', $schoolId);
    }

    public function scopeForSubject($query, $subjectId)
    {
        return $query->where('subject_id', $subjectId);
    }

    public function scopeForClassAcademicYear($query, $classAcademicYearId)
    {
        return $query->where('class_academic_year_id', $classAcademicYearId);
    }

    public function scopeForExam($query, $examId)
    {
        return $query->where('exam_id', $examId);
    }

    public function scopeCompatibleWithClassAcademicYear($query, $classAcademicYearId)
    {
        // Questions with matching class_academic_year_id OR generic questions (null)
        return $query->where(function ($q) use ($classAcademicYearId) {
            $q->where('class_academic_year_id', $classAcademicYearId)
              ->orWhereNull('class_academic_year_id');
        });
    }

    public function scopeOfType($query, $type)
    {
        return $query->where('type', $type);
    }

    public function scopeOfDifficulty($query, $difficulty)
    {
        return $query->where('difficulty', $difficulty);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeSearch($query, $searchTerm)
    {
        return $query->where(function ($q) use ($searchTerm) {
            $q->where('text', 'ilike', "%{$searchTerm}%")
              ->orWhere('reference', 'ilike', "%{$searchTerm}%")
              ->orWhereJsonContains('tags', $searchTerm);
        });
    }

    // ========== Helper Methods ==========

    /**
     * Check if this is an MCQ or True/False question (requires options)
     */
    public function hasOptions(): bool
    {
        return in_array($this->type, [self::TYPE_MCQ, self::TYPE_TRUE_FALSE]);
    }

    /**
     * Get the correct option for MCQ questions
     */
    public function getCorrectOption(): ?array
    {
        if (!$this->hasOptions() || empty($this->options)) {
            return null;
        }

        foreach ($this->options as $option) {
            if (!empty($option['is_correct'])) {
                return $option;
            }
        }

        return null;
    }

    /**
     * Validate options for MCQ/True-False questions
     */
    public function validateOptions(): array
    {
        $errors = [];

        if (!$this->hasOptions()) {
            return $errors;
        }

        $options = $this->options ?? [];

        // Check minimum options
        if (count($options) < 2) {
            $errors[] = 'At least 2 options are required for MCQ/True-False questions.';
        }

        // Check maximum options
        if (count($options) > 6) {
            $errors[] = 'Maximum 6 options are allowed.';
        }

        // Check for exactly one correct answer for MCQ
        if ($this->type === self::TYPE_MCQ) {
            $correctCount = 0;
            foreach ($options as $option) {
                if (!empty($option['is_correct'])) {
                    $correctCount++;
                }
            }
            if ($correctCount !== 1) {
                $errors[] = 'MCQ questions must have exactly one correct option.';
            }
        }

        return $errors;
    }
}
