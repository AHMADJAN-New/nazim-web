<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class EventCheckin extends Model
{
    use HasFactory;

    protected $connection = 'pgsql';
    protected $table = 'event_checkins';

    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'event_id',
        'guest_id',
        'scanned_at',
        'arrived_increment',
        'device_id',
        'user_id',
        'notes',
    ];

    protected $casts = [
        'scanned_at' => 'datetime',
        'arrived_increment' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
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

            if (empty($model->scanned_at)) {
                $model->scanned_at = now();
            }
        });
    }

    /**
     * Get the event for this check-in
     */
    public function event()
    {
        return $this->belongsTo(Event::class, 'event_id');
    }

    /**
     * Get the guest for this check-in
     */
    public function guest()
    {
        return $this->belongsTo(EventGuest::class, 'guest_id');
    }

    /**
     * Get the user who performed this check-in
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Scope to filter by event
     */
    public function scopeForEvent($query, $eventId)
    {
        return $query->where('event_id', $eventId);
    }

    /**
     * Scope to filter by guest
     */
    public function scopeForGuest($query, $guestId)
    {
        return $query->where('guest_id', $guestId);
    }

    /**
     * Scope to filter by date range
     */
    public function scopeBetweenDates($query, $startDate, $endDate)
    {
        return $query->whereBetween('scanned_at', [$startDate, $endDate]);
    }
}
