<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class ExamPaperTemplate extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'exam_paper_templates';
    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    /**
     * Supported languages
     */
    public const LANGUAGE_ENGLISH = 'en';
    public const LANGUAGE_PASHTO = 'ps';
    public const LANGUAGE_FARSI = 'fa';
    public const LANGUAGE_ARABIC = 'ar';

    public const LANGUAGES = [
        self::LANGUAGE_ENGLISH,
        self::LANGUAGE_PASHTO,
        self::LANGUAGE_FARSI,
        self::LANGUAGE_ARABIC,
    ];

    protected $fillable = [
        'id',
        'organization_id',
        'school_id',
        'exam_id',
        'exam_subject_id',
        'subject_id',
        'class_academic_year_id',
        'title',
        'language',
        'total_marks',
        'duration_minutes',
        'header_html',
        'footer_html',
        'instructions',
        'is_default_for_exam_subject',
        'is_active',
        'created_by',
        'updated_by',
        'deleted_by',
    ];

    protected $casts = [
        'total_marks' => 'decimal:2',
        'duration_minutes' => 'integer',
        'is_default_for_exam_subject' => 'boolean',
        'is_active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    protected $attributes = [
        'language' => 'en',
        'is_default_for_exam_subject' => false,
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

    public function exam()
    {
        return $this->belongsTo(Exam::class, 'exam_id');
    }

    public function examSubject()
    {
        return $this->belongsTo(ExamSubject::class, 'exam_subject_id');
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class, 'subject_id');
    }

    public function classAcademicYear()
    {
        return $this->belongsTo(ClassAcademicYear::class, 'class_academic_year_id');
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

    public function items()
    {
        return $this->hasMany(ExamPaperItem::class, 'exam_paper_template_id')
            ->orderBy('section_label')
            ->orderBy('position');
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

    public function scopeForExam($query, $examId)
    {
        return $query->where('exam_id', $examId);
    }

    public function scopeForExamSubject($query, $examSubjectId)
    {
        return $query->where('exam_subject_id', $examSubjectId);
    }

    public function scopeForSubject($query, $subjectId)
    {
        return $query->where('subject_id', $subjectId);
    }

    public function scopeForClassAcademicYear($query, $classAcademicYearId)
    {
        return $query->where('class_academic_year_id', $classAcademicYearId);
    }

    public function scopeGeneric($query)
    {
        // Templates not tied to any specific exam
        return $query->whereNull('exam_id');
    }

    public function scopeExamSpecific($query)
    {
        // Templates tied to a specific exam
        return $query->whereNotNull('exam_id');
    }

    public function scopeDefaultForExamSubject($query)
    {
        return $query->where('is_default_for_exam_subject', true);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    // ========== Helper Methods ==========

    /**
     * Calculate total marks from items
     */
    public function calculateTotalMarks(): float
    {
        $items = $this->items()->with('question')->get();
        $total = 0;

        foreach ($items as $item) {
            // Use marks_override if set, otherwise use question marks
            $marks = $item->marks_override ?? ($item->question->marks ?? 0);
            $total += floatval($marks);
        }

        return $total;
    }

    /**
     * Get computed total marks (use total_marks if set, otherwise calculate)
     */
    public function getComputedTotalMarks(): float
    {
        if ($this->total_marks !== null) {
            return floatval($this->total_marks);
        }

        return $this->calculateTotalMarks();
    }

    /**
     * Check if manual total_marks differs significantly from computed
     */
    public function hasMarksDiscrepancy(float $threshold = 0.05): bool
    {
        if ($this->total_marks === null) {
            return false;
        }

        $computed = $this->calculateTotalMarks();
        if ($computed == 0) {
            return false;
        }

        $diff = abs($this->total_marks - $computed) / $computed;
        return $diff > $threshold;
    }

    /**
     * Get items grouped by section
     */
    public function getItemsBySections(): array
    {
        $items = $this->items()->with('question')->get();
        $sections = [];

        foreach ($items as $item) {
            $sectionLabel = $item->section_label ?? 'default';
            if (!isset($sections[$sectionLabel])) {
                $sections[$sectionLabel] = [];
            }
            $sections[$sectionLabel][] = $item;
        }

        return $sections;
    }

    /**
     * Get item count
     */
    public function getItemCount(): int
    {
        return $this->items()->count();
    }

    /**
     * Check if this is a RTL language
     */
    public function isRtl(): bool
    {
        return in_array($this->language, [
            self::LANGUAGE_ARABIC,
            self::LANGUAGE_PASHTO,
            self::LANGUAGE_FARSI,
        ]);
    }
}
