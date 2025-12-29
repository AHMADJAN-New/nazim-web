<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, HasRoles;

    protected $connection = 'pgsql';
    protected $table = 'users'; // Now in public schema
    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';
    
    /**
     * The guard name for Spatie permissions
     * This is CRITICAL for Sanctum authentication to work with permissions
     */
    protected $guard_name = 'web';

    /**
     * Get the name of the guard used by this model
     * Required for Spatie permissions to work correctly
     * Must return a Collection, not an array
     */
    public function getGuardNames()
    {
        return collect(['web']);
    }

    protected $fillable = [
        'email',
        'encrypted_password',
    ];

    protected $hidden = [
        'encrypted_password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * Get the profile associated with the user
     */
    public function profile()
    {
        return $this->hasOne(Profile::class, 'id', 'id');
    }
}
