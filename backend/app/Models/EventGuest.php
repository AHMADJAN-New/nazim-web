<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;

class EventGuest extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'event_guests';

    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'event_id',
        'organization_id',
        'school_id',
        'guest_code',
        'guest_type',
        'full_name',
        'phone',
        'invite_count',
        'arrived_count',
        'status',
        'photo_path',
        'qr_token',
    ];

    protected $casts = [
        'invite_count' => 'integer',
        'arrived_count' => 'integer',
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

            // Generate guest_code if not provided
            if (empty($model->guest_code)) {
                $model->guest_code = self::generateGuestCode();
            }

            // Generate qr_token if not provided
            // Note: We generate it here even if id is not set yet, as it will be set by the UUID generation above
            if (empty($model->qr_token)) {
                // Use the id that was just generated, or generate a temporary one
                $guestId = $model->id ?? Str::uuid();
                $model->qr_token = self::generateQrToken($model->event_id, $guestId);
            }
        });
    }

    /**
     * Generate a unique guest code
     */
    public static function generateGuestCode(): string
    {
        $prefix = 'G';
        $timestamp = base_convert(time(), 10, 36);
        $random = strtoupper(Str::random(4));
        return $prefix . $timestamp . $random;
    }

    /**
     * Generate a unique QR token
     */
    public static function generateQrToken(?string $eventId, ?string $guestId): string
    {
        $data = ($eventId ?? '') . ($guestId ?? Str::uuid()) . Str::random(16);
        return base64_encode(hash('sha256', $data, true));
    }

    /**
     * Get the event that owns this guest
     */
    public function event()
    {
        return $this->belongsTo(Event::class, 'event_id');
    }

    /**
     * Get the organization that owns this guest
     */
    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    /**
     * Get the school that owns this guest
     */
    public function school()
    {
        return $this->belongsTo(SchoolBranding::class, 'school_id');
    }

    /**
     * Get the field values for this guest
     */
    public function fieldValues()
    {
        return $this->hasMany(EventGuestFieldValue::class, 'guest_id');
    }

    /**
     * Get the check-ins for this guest
     */
    public function checkins()
    {
        return $this->hasMany(EventCheckin::class, 'guest_id');
    }

    /**
     * Get the photo URL
     */
    public function getPhotoUrlAttribute()
    {
        if (empty($this->photo_path)) {
            return null;
        }
        return Storage::url($this->photo_path);
    }

    /**
     * Get remaining invite count
     */
    public function getRemainingInvitesAttribute()
    {
        return max(0, $this->invite_count - $this->arrived_count);
    }

    /**
     * Check if guest can check in more people
     */
    public function canCheckIn(int $count = 1): bool
    {
        return ($this->arrived_count + $count) <= $this->invite_count;
    }

    /**
     * Scope to filter by event
     */
    public function scopeForEvent($query, $eventId)
    {
        return $query->where('event_id', $eventId);
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
     * Scope to filter by status
     */
    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope to filter by guest type
     */
    public function scopeByType($query, $type)
    {
        return $query->where('guest_type', $type);
    }

    /**
     * Scope to search by name or phone
     */
    public function scopeSearch($query, $search)
    {
        return $query->where(function ($q) use ($search) {
            $q->where('full_name', 'ilike', "%{$search}%")
              ->orWhere('phone', 'ilike', "%{$search}%")
              ->orWhere('guest_code', 'ilike', "%{$search}%");
        });
    }
}
