<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class GraduationBatch extends Model
{
    use HasFactory, SoftDeletes;

    public const STATUS_DRAFT = 'draft';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_ISSUED = 'issued';

    public const TYPE_FINAL_YEAR = 'final_year';
    public const TYPE_PROMOTION = 'promotion';
    public const TYPE_TRANSFER = 'transfer';

    protected $connection = 'pgsql';
    protected $table = 'graduation_batches';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'organization_id',
        'school_id',
        'academic_year_id',
        'class_id',
        'exam_id', // Keep for backward compatibility
        'graduation_type',
        'from_class_id',
        'to_class_id',
        'graduation_date',
        'status',
        'min_attendance_percentage',
        'require_attendance',
        'exclude_approved_leaves',
        'approved_by',
        'approved_at',
        'created_by',
    ];

    protected $casts = [
        'graduation_date' => 'date',
        'approved_at' => 'datetime',
        'min_attendance_percentage' => 'decimal:2',
        'require_attendance' => 'boolean',
        'exclude_approved_leaves' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
            if (empty($model->status)) {
                $model->status = self::STATUS_DRAFT;
            }
        });
    }

    public function students()
    {
        return $this->hasMany(GraduationStudent::class, 'batch_id');
    }

    public function school()
    {
        return $this->belongsTo(SchoolBranding::class, 'school_id');
    }

    public function exam()
    {
        return $this->belongsTo(Exam::class, 'exam_id');
    }

    public function academicYear()
    {
        return $this->belongsTo(AcademicYear::class, 'academic_year_id');
    }

    public function class()
    {
        return $this->belongsTo(ClassModel::class, 'class_id');
    }

    public function fromClass()
    {
        return $this->belongsTo(ClassModel::class, 'from_class_id');
    }

    public function toClass()
    {
        return $this->belongsTo(ClassModel::class, 'to_class_id');
    }

    public function exams()
    {
        return $this->belongsToMany(Exam::class, 'graduation_batch_exams', 'batch_id', 'exam_id')
            ->withPivot('weight_percentage', 'is_required', 'display_order')
            ->orderByPivot('display_order');
    }
}
