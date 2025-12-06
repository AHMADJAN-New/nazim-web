<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Asset extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'assets';
    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $connection = 'pgsql';

    protected $fillable = [
        'id',
        'organization_id',
        'school_id',
        'building_id',
        'room_id',
        'name',
        'asset_tag',
        'category',
        'category_id',
        'serial_number',
        'purchase_date',
        'purchase_price',
        'status',
        'condition',
        'vendor',
        'warranty_expiry',
        'location_notes',
        'notes',
    ];

    protected $casts = [
        'purchase_date' => 'date',
        'purchase_price' => 'decimal:2',
        'warranty_expiry' => 'date',
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

    public function assignments()
    {
        return $this->hasMany(AssetAssignment::class);
    }

    public function activeAssignment()
    {
        return $this->hasOne(AssetAssignment::class)->where('status', 'active')->latest('assigned_on');
    }

    public function maintenanceRecords()
    {
        return $this->hasMany(AssetMaintenanceRecord::class);
    }

    public function history()
    {
        return $this->hasMany(AssetHistory::class);
    }

    public function building()
    {
        return $this->belongsTo(Building::class);
    }

    public function room()
    {
        return $this->belongsTo(Room::class);
    }

    public function category()
    {
        return $this->belongsTo(AssetCategory::class, 'category_id');
    }

    public function school()
    {
        return $this->belongsTo(SchoolBranding::class, 'school_id');
    }
}
