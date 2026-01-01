<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class MaintenanceLog extends Model
{
    use HasFactory, SoftDeletes;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'message',
        'affected_services',
        'started_at',
        'scheduled_end_at',
        'actual_end_at',
        'started_by',
        'ended_by',
        'status',
        'notes',
    ];

    protected $casts = [
        'affected_services' => 'array',
        'started_at' => 'datetime',
        'scheduled_end_at' => 'datetime',
        'actual_end_at' => 'datetime',
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

    public function startedBy()
    {
        return $this->belongsTo(Profile::class, 'started_by', 'id');
    }

    public function endedBy()
    {
        return $this->belongsTo(Profile::class, 'ended_by', 'id');
    }
}
