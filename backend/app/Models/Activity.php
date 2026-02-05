<?php

namespace App\Models;

use Illuminate\Support\Str;
use Spatie\Activitylog\Models\Activity as SpatieActivity;

class Activity extends SpatieActivity
{
    protected $connection = 'pgsql';
    protected $table = 'nazim_logs.activity_log';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'log_name',
        'description',
        'subject_type',
        'subject_id',
        'event',
        'causer_type',
        'causer_id',
        'properties',
        'batch_uuid',
        'organization_id',
        'school_id',
        'ip_address',
        'user_agent',
        'request_method',
        'route',
        'status_code',
        'session_id',
        'request_id',
    ];

    protected $casts = [
        'properties' => 'array',
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

    /**
     * Get the organization that owns this activity log
     */
    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    /**
     * Get the school that owns this activity log
     */
    public function school()
    {
        return $this->belongsTo(SchoolBranding::class, 'school_id');
    }

    /**
     * Scope to filter by organization
     */
    public function scopeForOrganization($query, string $organizationId)
    {
        return $query->where('organization_id', $organizationId);
    }

    /**
     * Scope to filter by school
     */
    public function scopeForSchool($query, string $schoolId)
    {
        return $query->where('school_id', $schoolId);
    }

    /**
     * Scope to filter by user (causer)
     */
    public function scopeForUser($query, string $userId)
    {
        return $query->where('causer_id', $userId)
            ->where('causer_type', 'App\\Models\\User');
    }

    /**
     * Scope to filter by entity (subject)
     */
    public function scopeForEntity($query, string $entityType, string $entityId)
    {
        return $query->where('subject_type', $entityType)
            ->where('subject_id', $entityId);
    }

    /**
     * Scope to filter by action/event
     */
    public function scopeByEvent($query, string $event)
    {
        return $query->where('event', $event);
    }

    /**
     * Scope to filter by log name
     */
    public function scopeByLogName($query, string $logName)
    {
        return $query->where('log_name', $logName);
    }
}
