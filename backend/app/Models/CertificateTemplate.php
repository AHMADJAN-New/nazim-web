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
        'school_id',
        'course_id',
        'type',
        'name',
        'title',
        'description',
        'body_html',
        'background_image_path',
        'page_size',
        'custom_width_mm',
        'custom_height_mm',
        'rtl',
        'font_family',
        'layout_config',
        'is_default',
        'is_active',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'layout_config' => 'array',
        'is_default' => 'boolean',
        'is_active' => 'boolean',
        'rtl' => 'boolean',
        'custom_width_mm' => 'decimal:2',
        'custom_height_mm' => 'decimal:2',
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

            if (empty($model->type)) {
                $model->type = 'graduation';
            }
        });
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    public function school()
    {
        return $this->belongsTo(SchoolBranding::class, 'school_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(Profile::class, 'created_by');
    }

    public function course()
    {
        return $this->belongsTo(ShortTermCourse::class, 'course_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeDefault($query)
    {
        return $query->where('is_default', true);
    }

    public function scopeGraduation($query)
    {
        return $query->where('type', 'graduation');
    }

    public static function getDefaultLayout(): array
    {
        return [
            'enabledFields' => ['header', 'studentName', 'fatherName', 'courseName', 'certificateNumber', 'date'],
            'headerPosition' => ['x' => 50, 'y' => 15],
            'studentNamePosition' => ['x' => 50, 'y' => 35],
            'fatherNamePosition' => ['x' => 50, 'y' => 42],
            'courseNamePosition' => ['x' => 50, 'y' => 65],
            'certificateNumberPosition' => ['x' => 10, 'y' => 90],
            'datePosition' => ['x' => 90, 'y' => 90],
            'headerText' => 'Certificate of Completion',
            'courseNameText' => '',
            'dateText' => 'Date:',
            'fontSize' => 24,
            'fontFamily' => 'Arial',
            'textColor' => '#000000',
            'rtl' => true,
        ];
    }
}
