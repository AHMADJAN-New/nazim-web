<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class LoginAttempt extends Model
{
    use HasUuids;

    protected $connection = 'pgsql';

    /** Resolved via search_path (public,nazim_logs) so schema-qualified name is not quoted as one identifier */
    protected $table = 'login_attempts';

    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    protected $fillable = [
        'attempted_at',
        'email',
        'user_id',
        'success',
        'failure_reason',
        'organization_id',
        'school_id',
        'ip_address',
        'user_agent',
        'login_context',
        'consecutive_failures',
        'was_locked',
    ];

    protected $casts = [
        'attempted_at' => 'datetime',
        'success' => 'boolean',
        'was_locked' => 'boolean',
    ];
}
