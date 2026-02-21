<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class LoginLockout extends Model
{
    use HasUuids;

    protected $connection = 'pgsql';

    /** Resolved via search_path (public,nazim_logs) so schema-qualified name is not quoted as one identifier */
    protected $table = 'login_lockouts';

    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    protected $fillable = [
        'email',
        'locked_at',
        'unlocked_at',
        'unlock_reason',
        'unlocked_by',
        'failed_attempt_count',
        'ip_address',
    ];

    protected $casts = [
        'locked_at' => 'datetime',
        'unlocked_at' => 'datetime',
    ];
}
