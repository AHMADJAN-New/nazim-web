<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class NotificationEvent extends Model
{
    use HasFactory;

    protected $connection = 'pgsql';
    protected $table = 'notification_events';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'organization_id',
        'type',
        'actor_user_id',
        'entity_type',
        'entity_id',
        'payload_json',
    ];

    protected $casts = [
        'payload_json' => 'array',
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

    public function notifications()
    {
        return $this->hasMany(Notification::class, 'event_id');
    }

    public function deliveries()
    {
        return $this->hasMany(NotificationDelivery::class, 'event_id');
    }

    public function actor()
    {
        return $this->belongsTo(User::class, 'actor_user_id');
    }
}
