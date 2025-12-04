<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class ClassSubject extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'class_subjects';

    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'class_subject_template_id',
        'class_academic_year_id',
        'subject_id',
        'organization_id',
        'teacher_id',
        'room_id',
        'credits',
        'hours_per_week',
        'is_required',
        'notes',
    ];

    protected $casts = [
        'credits' => 'integer',
        'hours_per_week' => 'integer',
        'is_required' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Boot the model
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
     * Get the class academic year
     */
    public function classAcademicYear()
    {
        return $this->belongsTo(ClassAcademicYear::class, 'class_academic_year_id');
    }

    /**
     * Get the subject
     */
    public function subject()
    {
        return $this->belongsTo(Subject::class, 'subject_id');
    }

    /**
     * Get the organization
     */
    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    /**
     * Get the teacher (profile)
     */
    public function teacher()
    {
        return $this->belongsTo(Profile::class, 'teacher_id', 'id');
    }

    /**
     * Get the room
     */
    public function room()
    {
        return $this->belongsTo(Room::class, 'room_id');
    }
}
