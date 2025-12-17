<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class GraduationStudent extends Model
{
    use HasFactory;

    public const RESULT_PASS = 'pass';
    public const RESULT_FAIL = 'fail';
    public const RESULT_CONDITIONAL = 'conditional';

    protected $connection = 'pgsql';
    protected $table = 'graduation_students';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'batch_id',
        'student_id',
        'final_result_status',
        'position',
        'remarks',
        'eligibility_json',
    ];

    protected $casts = [
        'eligibility_json' => 'array',
        'position' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    public function batch()
    {
        return $this->belongsTo(GraduationBatch::class, 'batch_id');
    }

    public function student()
    {
        return $this->belongsTo(Student::class, 'student_id');
    }
}
