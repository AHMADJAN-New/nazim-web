<?php

namespace App\Models;

use App\Traits\LogsActivityWithContext;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Building extends Model
{
    use HasFactory, SoftDeletes, LogsActivityWithContext;

    protected $connection = 'pgsql';
    protected $table = 'buildings';

    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'building_name',
        'school_id',
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
     * Get the school that owns the building
     */
    public function school()
    {
        return $this->belongsTo(SchoolBranding::class, 'school_id');
    }

    /**
     * Get all rooms in this building
     */
    public function rooms()
    {
        return $this->hasMany(Room::class, 'building_id');
    }

    /**
     * Scope to filter by school
     */
    public function scopeForSchool($query, $schoolId)
    {
        return $query->where('school_id', $schoolId);
    }

    /**
     * Scope to filter active buildings (not soft-deleted)
     */
    public function scopeActive($query)
    {
        return $query->whereNull('deleted_at');
    }
}
