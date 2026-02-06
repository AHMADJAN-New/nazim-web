<?php

namespace App\Models;

use App\Traits\LogsActivityWithContext;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Room extends Model
{
    use HasFactory, SoftDeletes, LogsActivityWithContext;

    protected $connection = 'pgsql';
    protected $table = 'rooms';

    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'room_number',
        'building_id',
        'school_id',
        'staff_id',
    ];

    protected $casts = [
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
     * Get the building that contains this room
     */
    public function building()
    {
        return $this->belongsTo(Building::class, 'building_id');
    }

    /**
     * Get the school that owns this room
     */
    public function school()
    {
        return $this->belongsTo(SchoolBranding::class, 'school_id');
    }

    /**
     * Get the staff member assigned to this room
     */
    public function staff()
    {
        return $this->belongsTo(Staff::class, 'staff_id');
    }

    /**
     * Scope to filter by building
     */
    public function scopeForBuilding($query, $buildingId)
    {
        return $query->where('building_id', $buildingId);
    }

    /**
     * Scope to filter by school
     */
    public function scopeForSchool($query, $schoolId)
    {
        return $query->where('school_id', $schoolId);
    }

    /**
     * Scope to filter active rooms (not soft-deleted)
     */
    public function scopeActive($query)
    {
        return $query->whereNull('deleted_at');
    }
}
