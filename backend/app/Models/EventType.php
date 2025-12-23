<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class EventType extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'event_types';

    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'organization_id',
        'school_id',
        'name',
        'description',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
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
     * Get the organization that owns this event type
     */
    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    /**
     * Get the school that owns this event type
     */
    public function school()
    {
        return $this->belongsTo(SchoolBranding::class, 'school_id');
    }

    /**
     * Get the field groups for this event type
     */
    public function fieldGroups()
    {
        return $this->hasMany(EventTypeFieldGroup::class, 'event_type_id')
            ->orderBy('sort_order');
    }

    /**
     * Get the fields for this event type
     */
    public function fields()
    {
        return $this->hasMany(EventTypeField::class, 'event_type_id')
            ->orderBy('sort_order');
    }

    /**
     * Get enabled fields for this event type
     */
    public function enabledFields()
    {
        return $this->hasMany(EventTypeField::class, 'event_type_id')
            ->where('is_enabled', true)
            ->orderBy('sort_order');
    }

    /**
     * Get the events for this event type
     */
    public function events()
    {
        return $this->hasMany(Event::class, 'event_type_id');
    }

    /**
     * Scope to filter by organization
     */
    public function scopeForOrganization($query, $organizationId)
    {
        return $query->where('organization_id', $organizationId);
    }

    /**
     * Scope to filter by school
     */
    public function scopeForSchool($query, $schoolId)
    {
        return $query->where('school_id', $schoolId);
    }

    /**
     * Scope to filter active event types
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
