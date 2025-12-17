<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class CertificateAuditLog extends Model
{
    use HasFactory;

    public const ENTITY_GRADUATION_BATCH = 'graduation_batch';
    public const ENTITY_ISSUED_CERTIFICATE = 'issued_certificate';
    public const ENTITY_TEMPLATE = 'template';

    public const ACTION_CREATE = 'create';
    public const ACTION_UPDATE = 'update';
    public const ACTION_APPROVE = 'approve';
    public const ACTION_GENERATE_STUDENTS = 'generate_students';
    public const ACTION_ISSUE = 'issue';
    public const ACTION_PRINT = 'print';
    public const ACTION_REVOKE = 'revoke';
    public const ACTION_ACTIVATE = 'activate';
    public const ACTION_DEACTIVATE = 'deactivate';

    protected $connection = 'pgsql';
    protected $table = 'certificate_audit_logs';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'organization_id',
        'school_id',
        'entity_type',
        'entity_id',
        'action',
        'metadata_json',
        'performed_by',
        'performed_at',
    ];

    protected $casts = [
        'metadata_json' => 'array',
        'performed_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }
}
