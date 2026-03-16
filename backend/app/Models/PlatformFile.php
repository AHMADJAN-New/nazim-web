<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class PlatformFile extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';

    protected $table = 'platform_files';

    public $incrementing = false;

    protected $keyType = 'string';

    public const CATEGORY_CONTRACT_TEMPLATE = 'contract_template';

    public const CATEGORY_SIGNED_CONTRACT = 'signed_contract';

    public const CATEGORY_LICENSE_SCAN = 'license_scan';

    public const CATEGORY_RECEIPT = 'receipt';

    public const CATEGORY_BUSINESS_DOCUMENT = 'business_document';

    public const CATEGORY_OTHER = 'other';

    public const CATEGORIES = [
        self::CATEGORY_CONTRACT_TEMPLATE,
        self::CATEGORY_SIGNED_CONTRACT,
        self::CATEGORY_LICENSE_SCAN,
        self::CATEGORY_RECEIPT,
        self::CATEGORY_BUSINESS_DOCUMENT,
        self::CATEGORY_OTHER,
    ];

    protected $fillable = [
        'id',
        'organization_id',
        'category',
        'title',
        'notes',
        'file_path',
        'file_name',
        'mime_type',
        'file_size',
        'uploaded_by',
    ];

    protected $casts = [
        'file_size' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
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

    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    public function uploadedByUser()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
