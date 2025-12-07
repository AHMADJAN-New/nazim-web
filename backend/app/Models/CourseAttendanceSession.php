<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class CourseAttendanceSession extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'course_attendance_sessions';

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'organization_id',
        'course_id',
        'session_date',
        'session_title',
        'method',
        'status',
        'remarks',
        'created_by',
        'closed_at',
        'closed_by',
    ];

    protected $casts = [
        'session_date' => 'date',
        'closed_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
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

    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    public function course()
    {
        return $this->belongsTo(ShortTermCourse::class, 'course_id');
    }

    public function records()
    {
        return $this->hasMany(CourseAttendanceRecord::class, 'attendance_session_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(Profile::class, 'created_by');
    }

    public function closedBy()
    {
        return $this->belongsTo(Profile::class, 'closed_by');
    }

    public function scopeOpen($query)
    {
        return $query->where('status', 'open');
    }

    public function scopeClosed($query)
    {
        return $query->where('status', 'closed');
    }

    public function close(string $profileId): void
    {
        $this->status = 'closed';
        $this->closed_at = now();
        $this->closed_by = $profileId;
        $this->save();
    }

    public function reopen(): void
    {
        $this->status = 'open';
        $this->closed_at = null;
        $this->closed_by = null;
        $this->save();
    }

    public function getAttendanceStats(): array
    {
        $records = $this->records()->whereNull('deleted_at')->get();

        return [
            'total' => $records->count(),
            'present' => $records->where('status', 'present')->count(),
            'absent' => $records->where('status', 'absent')->count(),
            'late' => $records->where('status', 'late')->count(),
            'excused' => $records->where('status', 'excused')->count(),
            'sick' => $records->where('status', 'sick')->count(),
            'leave' => $records->where('status', 'leave')->count(),
        ];
    }
}
