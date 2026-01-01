<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class NotificationDelivery extends Model
{
    use HasFactory;

    protected $connection = 'pgsql';
    protected $table = 'notification_deliveries';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'notification_id',
        'user_id',
        'event_id',
        'channel',
        'to_address',
        'status',
        'provider_message_id',
        'error',
        'sent_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'sent_at' => 'datetime',
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

    public function notification()
    {
        return $this->belongsTo(Notification::class, 'notification_id');
    }

    public function event()
    {
        return $this->belongsTo(NotificationEvent::class, 'event_id');
    }
}
