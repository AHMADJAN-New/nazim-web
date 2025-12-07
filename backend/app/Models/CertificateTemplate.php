<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class CertificateTemplate extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'certificate_templates';

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'organization_id',
        'name',
        'description',
        'background_image_path',
        'layout_config',
        'is_default',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'layout_config' => 'array',
        'is_default' => 'boolean',
        'is_active' => 'boolean',
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

        // Ensure only one default template per organization
        static::saving(function ($model) {
            if ($model->is_default) {
                static::where('organization_id', $model->organization_id)
                    ->where('id', '!=', $model->id)
                    ->update(['is_default' => false]);
            }
        });
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(Profile::class, 'created_by');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeDefault($query)
    {
        return $query->where('is_default', true);
    }

    public static function getDefaultLayout(): array
    {
        return [
            'studentName' => ['x' => 50, 'y' => 40, 'fontSize' => 28, 'fontWeight' => 'bold', 'color' => '#1a365d'],
            'courseName' => ['x' => 50, 'y' => 50, 'fontSize' => 20, 'fontWeight' => 'normal', 'color' => '#2d3748'],
            'completionDate' => ['x' => 50, 'y' => 60, 'fontSize' => 14, 'fontWeight' => 'normal', 'color' => '#4a5568'],
            'certificateNumber' => ['x' => 50, 'y' => 85, 'fontSize' => 10, 'fontWeight' => 'normal', 'color' => '#718096'],
            'instructorName' => ['x' => 25, 'y' => 75, 'fontSize' => 12, 'fontWeight' => 'normal', 'color' => '#4a5568'],
            'organizationName' => ['x' => 75, 'y' => 75, 'fontSize' => 12, 'fontWeight' => 'normal', 'color' => '#4a5568'],
        ];
    }
}
