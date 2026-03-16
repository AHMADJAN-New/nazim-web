<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class FacilityDocument extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'facility_documents';

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'facility_id',
        'organization_id',
        'document_type',
        'title',
        'description',
        'file_path',
        'file_name',
        'mime_type',
        'file_size',
        'uploaded_by',
        'document_date',
    ];

    protected function casts(): array
    {
        return [
            'file_size' => 'integer',
            'document_date' => 'date',
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

    public function facility()
    {
        return $this->belongsTo(OrgFacility::class, 'facility_id');
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }
}
