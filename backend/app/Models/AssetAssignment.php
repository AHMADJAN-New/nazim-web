<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class AssetAssignment extends Model
{
    use HasFactory;

    protected $table = 'asset_assignments';
    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $connection = 'pgsql';

    protected $fillable = [
        'id',
        'asset_id',
        'organization_id',
        'assigned_to_type',
        'assigned_to_id',
        'assigned_on',
        'expected_return_date',
        'returned_on',
        'status',
        'notes',
    ];

    protected $casts = [
        'assigned_on' => 'date',
        'expected_return_date' => 'date',
        'returned_on' => 'date',
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
}
