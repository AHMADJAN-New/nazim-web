<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class OutgoingDocument extends Model
{
    use HasFactory;

    protected $table = 'outgoing_documents';
    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $connection = 'pgsql';

    protected $fillable = [
        'id',
        'organization_id',
        'school_id',
        'academic_year_id',
        'template_id',
        'letterhead_id',
        'security_level_key',
        'outdoc_prefix',
        'outdoc_number',
        'full_outdoc_number',
        'is_manual_number',
        'manual_outdoc_number',
        'recipient_type',
        'recipient_id',
        'external_recipient_name',
        'external_recipient_org',
        'recipient_address',
        'subject',
        'description',
        'pages_count',
        'attachments_count',
        'body_html',
        'pdf_path',
        'issue_date',
        'signed_by_user_id',
        'status',
        'announcement_scope',
        'table_payload',
        'template_variables',
    ];

    protected $casts = [
        'is_manual_number' => 'boolean',
        'issue_date' => 'date',
        'announcement_scope' => 'array',
        'table_payload' => 'array',
        'template_variables' => 'array',
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

    public function academicYear()
    {
        return $this->belongsTo(AcademicYear::class, 'academic_year_id');
    }

    /**
     * Get the template associated with this document.
     */
    public function template()
    {
        return $this->belongsTo(LetterTemplate::class, 'template_id');
    }

    /**
     * Get the letterhead associated with this document.
     */
    public function letterhead()
    {
        return $this->belongsTo(Letterhead::class, 'letterhead_id');
    }
}
