<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class TimetableEntry extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'timetable_entries';

    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'organization_id',
        'timetable_id',
        'class_academic_year_id',
        'subject_id',
        'teacher_id',
        'schedule_slot_id',
        'day_name',
        'period_order',
    ];

    protected $casts = [
        'period_order' => 'integer',
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
     * Get the organization that owns the timetable entry
     */
    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    /**
     * Get the timetable this entry belongs to
     */
    public function timetable()
    {
        return $this->belongsTo(GeneratedTimetable::class, 'timetable_id');
    }

    /**
     * Get the class academic year for this entry
     */
    public function classAcademicYear()
    {
        return $this->belongsTo(ClassAcademicYear::class, 'class_academic_year_id');
    }

    /**
     * Get the subject for this entry
     */
    public function subject()
    {
        return $this->belongsTo(Subject::class, 'subject_id');
    }

    /**
     * Get the teacher for this entry
     */
    public function teacher()
    {
        return $this->belongsTo(Staff::class, 'teacher_id');
    }

    /**
     * Get the schedule slot for this entry
     */
    public function scheduleSlot()
    {
        return $this->belongsTo(ScheduleSlot::class, 'schedule_slot_id');
    }

    /**
     * Scope to filter by organization
     */
    public function scopeForOrganization($query, $organizationId)
    {
        if ($organizationId === null) {
            return $query->whereNull('organization_id');
        }
        return $query->where(function ($q) use ($organizationId) {
            $q->where('organization_id', $organizationId)
              ->orWhereNull('organization_id');
        });
    }

    /**
     * Scope to filter by timetable
     */
    public function scopeForTimetable($query, $timetableId)
    {
        return $query->where('timetable_id', $timetableId);
    }

    /**
     * Scope to order by period order
     */
    public function scopeOrderedByPeriod($query)
    {
        return $query->orderBy('period_order', 'asc');
    }
}

