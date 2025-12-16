<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class ExamPaperItem extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'exam_paper_items';
    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'organization_id',
        'school_id',
        'exam_paper_template_id',
        'question_id',
        'section_label',
        'position',
        'marks_override',
        'answer_lines_count',
        'show_answer_lines',
        'is_mandatory',
        'notes',
        'created_by',
        'updated_by',
        'deleted_by',
    ];

    protected $casts = [
        'position' => 'integer',
        'marks_override' => 'decimal:2',
        'answer_lines_count' => 'integer',
        'show_answer_lines' => 'boolean',
        'is_mandatory' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    protected $attributes = [
        'position' => 0,
        'is_mandatory' => true,
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

    public function template()
    {
        return $this->belongsTo(ExamPaperTemplate::class, 'exam_paper_template_id');
    }

    public function question()
    {
        return $this->belongsTo(Question::class, 'question_id');
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

    // ========== Scopes ==========

    public function scopeForTemplate($query, $templateId)
    {
        return $query->where('exam_paper_template_id', $templateId);
    }

    public function scopeForQuestion($query, $questionId)
    {
        return $query->where('question_id', $questionId);
    }

    public function scopeInSection($query, $sectionLabel)
    {
        return $query->where('section_label', $sectionLabel);
    }

    public function scopeMandatory($query)
    {
        return $query->where('is_mandatory', true);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('section_label')
                    ->orderBy('position');
    }

    // ========== Helper Methods ==========

    /**
     * Get effective marks (override or question marks)
     */
    public function getEffectiveMarks(): float
    {
        if ($this->marks_override !== null) {
            return floatval($this->marks_override);
        }

        return floatval($this->question->marks ?? 0);
    }

    /**
     * Check if marks are overridden
     */
    public function hasMarksOverride(): bool
    {
        return $this->marks_override !== null;
    }
}
