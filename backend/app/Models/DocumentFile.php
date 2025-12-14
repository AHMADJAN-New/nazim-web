<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class DocumentFile extends Model
{
    use HasFactory;

    protected $table = 'document_files';
    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $connection = 'pgsql';

    protected $fillable = [
        'id',
        'organization_id',
        'school_id',
        'owner_type',
        'owner_id',
        'file_type',
        'original_name',
        'mime_type',
        'size_bytes',
        'storage_path',
        'sha256',
        'version',
        'uploaded_by_user_id',
    ];

    protected $casts = [
        'size_bytes' => 'integer',
        'version' => 'integer',
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
}
