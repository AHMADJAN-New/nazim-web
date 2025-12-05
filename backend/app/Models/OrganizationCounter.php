<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class OrganizationCounter extends Model
{
    use HasFactory;

    protected $connection = 'pgsql';
    protected $table = 'organization_counters';

    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    // Counter type constants
    const COUNTER_TYPE_STUDENTS = 'students';
    const COUNTER_TYPE_STAFF = 'staff';

    protected $fillable = [
        'id',
        'organization_id',
        'counter_type',
        'last_value',
    ];

    protected $casts = [
        'last_value' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
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
     * Get the organization that owns this counter
     */
    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }
}

