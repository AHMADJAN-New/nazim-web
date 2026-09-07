<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class ClientErrorReport extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';

    protected $table = 'client_error_reports';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'client_error_id',
        'message',
        'stack',
        'component_stack',
        'url',
        'user_agent',
        'level',
        'user_id',
        'organization_id',
        'school_id',
        'user_reported',
        'user_note',
        'status',
        'admin_notes',
        'reviewed_by',
        'reviewed_at',
        'ip_address',
    ];

    protected function casts(): array
    {
        return [
            'user_reported' => 'boolean',
            'reviewed_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }
}
