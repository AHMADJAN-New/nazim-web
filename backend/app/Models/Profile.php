<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Profile extends Model
{
    use HasFactory;

    protected $connection = 'pgsql';
    protected $table = 'profiles';

    protected $fillable = [
        'id',
        'email',
        'full_name',
        'role',
        'clearance_level_key',
        'organization_id',
        'event_id',
        'is_event_user',
        'phone',
        'avatar_url',
        'is_active',
        'default_school_id',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_event_user' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the user associated with the profile
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'id', 'id');
    }

    /**
     * Get the organization
     */
    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    /**
     * Get the event this user is assigned to (for event-specific users)
     */
    public function event()
    {
        return $this->belongsTo(Event::class, 'event_id');
    }

    /**
     * Scope to filter event-specific users
     */
    public function scopeEventUsers($query)
    {
        return $query->where('is_event_user', true);
    }

    /**
     * Scope to filter users for a specific event
     */
    public function scopeForEvent($query, $eventId)
    {
        return $query->where('event_id', $eventId)
            ->where('is_event_user', true);
    }
}
