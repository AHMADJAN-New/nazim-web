<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class IssuedCertificate extends Model
{
    use HasFactory;

    protected $connection = 'pgsql';
    protected $table = 'issued_certificates';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'organization_id',
        'school_id',
        'template_id',
        'batch_id',
        'student_id',
        'certificate_no',
        'verification_hash',
        'qr_payload',
        'issued_by',
        'issued_at',
        'revoked_at',
        'revoked_by',
        'revoke_reason',
        'pdf_path',
    ];

    protected $casts = [
        'issued_at' => 'datetime',
        'revoked_at' => 'datetime',
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

    public function student()
    {
        return $this->belongsTo(Student::class, 'student_id');
    }

    public function template()
    {
        return $this->belongsTo(CertificateTemplate::class, 'template_id');
    }

    public function batch()
    {
        return $this->belongsTo(GraduationBatch::class, 'batch_id');
    }

    public function school()
    {
        return $this->belongsTo(SchoolBranding::class, 'school_id');
    }
}
