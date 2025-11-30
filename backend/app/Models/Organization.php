<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Organization extends Model
{
    use HasFactory;

    protected $connection = 'pgsql';
    protected $table = 'organizations';

    protected $fillable = [
        'name',
        'slug',
        'settings',
        'deleted_at',
    ];

    protected $casts = [
        'settings' => 'array',
        'deleted_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get all profiles for this organization
     */
    public function profiles()
    {
        return $this->hasMany(Profile::class, 'organization_id');
    }
}
