<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class ContactMessage extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'contact_messages';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'first_name',
        'last_name',
        'position',
        'email',
        'phone',
        'whatsapp',
        'preferred_contact_method',
        'school_name',
        'city',
        'country',
        'student_count',
        'number_of_schools',
        'staff_count',
        'message',
        'status',
        'urgency',
        'admin_notes',
        'replied_by',
        'replied_at',
        'follow_up_date',
        'reply_subject',
        'reply_message',
        'source',
        'referral_source',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'student_count' => 'integer',
        'number_of_schools' => 'integer',
        'staff_count' => 'integer',
        'replied_at' => 'datetime',
        'follow_up_date' => 'date',
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

    /**
     * Scope to filter by status
     */
    public function scopeStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope to get unread messages
     */
    public function scopeUnread($query)
    {
        return $query->where('status', 'new');
    }

    /**
     * Scope to get recent messages
     */
    public function scopeRecent($query, int $days = 30)
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }

    /**
     * Get full name
     */
    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }
}
