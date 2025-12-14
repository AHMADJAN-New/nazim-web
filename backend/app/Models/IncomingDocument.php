<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class IncomingDocument extends Model
{
    use HasFactory;

    protected $table = 'incoming_documents';
    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $connection = 'pgsql';

    protected $fillable = [
        'id',
        'organization_id',
        'school_id',
        'academic_year_id',
        'security_level_key',
        'indoc_prefix',
        'indoc_number',
        'full_indoc_number',
        'is_manual_number',
        'manual_indoc_number',
        'external_doc_number',
        'external_doc_date',
        'sender_name',
        'sender_org',
        'sender_address',
        'subject',
        'description',
        'pages_count',
        'attachments_count',
        'received_date',
        'routing_department_id',
        'assigned_to_user_id',
        'status',
        'notes',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'is_manual_number' => 'boolean',
        'received_date' => 'date',
        'external_doc_date' => 'date',
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

    public function routingDepartment()
    {
        return $this->belongsTo(Department::class, 'routing_department_id');
    }
}
