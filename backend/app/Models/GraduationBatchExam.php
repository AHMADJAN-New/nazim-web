<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class GraduationBatchExam extends Model
{
    use HasFactory;

    protected $connection = 'pgsql';
    protected $table = 'graduation_batch_exams';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'batch_id',
        'exam_id',
        'weight_percentage',
        'is_required',
        'display_order',
    ];

    protected $casts = [
        'weight_percentage' => 'decimal:2',
        'is_required' => 'boolean',
        'display_order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
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

    public function batch()
    {
        return $this->belongsTo(GraduationBatch::class, 'batch_id');
    }

    public function exam()
    {
        return $this->belongsTo(Exam::class, 'exam_id');
    }
}

