<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class AssetCopy extends Model
{
    use HasFactory, SoftDeletes;

    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'asset_id',
        'organization_id',
        'copy_code',
        'status',
        'acquired_at',
    ];

    protected $casts = [
        'acquired_at' => 'date',
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

    public function asset()
    {
        return $this->belongsTo(Asset::class, 'asset_id');
    }

    public function assignments()
    {
        return $this->hasMany(AssetAssignment::class, 'asset_copy_id');
    }

    public function activeAssignment()
    {
        return $this->hasOne(AssetAssignment::class, 'asset_copy_id')
            ->where('status', 'active')
            ->latest('assigned_on');
    }
}

