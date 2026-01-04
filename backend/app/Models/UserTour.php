<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Support\Str;

class UserTour extends Model
{
    use HasUuids, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'user_tours';
    protected $keyType = 'string';
    public $incrementing = false;

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
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'id',
        'user_id',
        'tour_id',
        'tour_version',
        'tour_title',
        'tour_description',
        'assigned_by',
        'required_permissions',
        'trigger_route',
        'is_completed',
        'completed_at',
        'last_step_id',
        'last_step_index',
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'required_permissions' => 'array',
        'is_completed' => 'boolean',
        'completed_at' => 'datetime',
        'last_step_index' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Get the user that owns this tour.
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
