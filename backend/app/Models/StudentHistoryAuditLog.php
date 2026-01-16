<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class StudentHistoryAuditLog extends Model
{
    use HasFactory;

    protected $connection = 'pgsql';
    protected $table = 'student_history_audit_logs';

    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    // Only created_at, no updated_at for audit logs
    const UPDATED_AT = null;

    protected $fillable = [
        'id',
        'student_id',
        'user_id',
        'action',
        'section',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'created_at' => 'datetime',
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
     * Get the student for this audit log
     */
    public function student()
    {
        return $this->belongsTo(Student::class, 'student_id');
    }

    /**
     * Get the user who performed the action
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Scope to filter by student
     */
    public function scopeForStudent($query, string $studentId)
    {
        return $query->where('student_id', $studentId);
    }

    /**
     * Scope to filter by user
     */
    public function scopeForUser($query, string $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope to filter by action
     */
    public function scopeByAction($query, string $action)
    {
        return $query->where('action', $action);
    }

    /**
     * Scope to filter by section
     */
    public function scopeBySection($query, string $section)
    {
        return $query->where('section', $section);
    }

    /**
     * Scope to filter by date range
     */
    public function scopeInDateRange($query, $from, $to)
    {
        if ($from) {
            $query->where('created_at', '>=', $from);
        }
        if ($to) {
            $query->where('created_at', '<=', $to);
        }
        return $query;
    }
}

