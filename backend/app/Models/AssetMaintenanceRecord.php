<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class AssetMaintenanceRecord extends Model
{
    use HasFactory;

    protected $table = 'asset_maintenance_records';
    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $connection = 'pgsql';

    protected $fillable = [
        'id',
        'asset_id',
        'organization_id',
        'school_id',
        'maintenance_type',
        'status',
        'performed_on',
        'next_due_date',
        'cost',
        'vendor',
        'notes',
    ];

    protected $casts = [
        'performed_on' => 'date',
        'next_due_date' => 'date',
        'cost' => 'decimal:2',
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

    public function asset()
    {
        return $this->belongsTo(Asset::class);
    }

    public function school()
    {
        return $this->belongsTo(SchoolBranding::class, 'school_id');
    }
}
