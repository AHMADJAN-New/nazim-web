<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class IdCardTemplate extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'id_card_templates';

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'organization_id',
        'school_id',
        'name',
        'description',
        'background_image_path_front',
        'background_image_path_back',
        'layout_config_front',
        'layout_config_back',
        'card_size',
        'is_default',
        'is_active',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'layout_config_front' => 'array',
        'layout_config_back' => 'array',
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

    public function school()
    {
        return $this->belongsTo(SchoolBranding::class, 'school_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(Profile::class, 'created_by');
    }

    public function updatedBy()
    {
        return $this->belongsTo(Profile::class, 'updated_by');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeDefault($query)
    {
        return $query->where('is_default', true);
    }

    public static function getDefaultLayoutFront(): array
    {
        return [
            'enabledFields' => [
                'studentNameLabel',
                'studentName',
                'fatherNameLabel',
                'fatherName',
                'classLabel',
                'class',
                'roomLabel',
                'room',
                'admissionNumberLabel',
                'admissionNumber',
                'studentCodeLabel',
                'studentCode',
                'studentPhoto',
                'qrCode',
            ],
            'fieldValues' => [
                'studentNameLabel' => 'نوم',
                'fatherNameLabel' => 'د پلار نوم',
                'classLabel' => 'درجه',
                'roomLabel' => 'خونه',
                'admissionNumberLabel' => 'داخله نمبر',
                'studentCodeLabel' => 'ID',
                'cardNumberLabel' => 'کارت نمبر',
            ],
            'studentNameLabelPosition' => ['x' => 30, 'y' => 40],
            'studentNamePosition' => ['x' => 62, 'y' => 40],
            'fatherNameLabelPosition' => ['x' => 30, 'y' => 50],
            'fatherNamePosition' => ['x' => 62, 'y' => 50],
            'studentCodeLabelPosition' => ['x' => 30, 'y' => 60],
            'studentCodePosition' => ['x' => 62, 'y' => 60],
            'admissionNumberLabelPosition' => ['x' => 30, 'y' => 70],
            'admissionNumberPosition' => ['x' => 62, 'y' => 70],
            'classLabelPosition' => ['x' => 30, 'y' => 80],
            'classPosition' => ['x' => 62, 'y' => 80],
            'roomLabelPosition' => ['x' => 30, 'y' => 88],
            'roomPosition' => ['x' => 62, 'y' => 88],
            'studentPhotoPosition' => ['x' => 20, 'y' => 50, 'width' => 30, 'height' => 40],
            'qrCodePosition' => ['x' => 80, 'y' => 50, 'width' => 15, 'height' => 15],
            'fontSize' => 12,
            'fontFamily' => 'Arial',
            'textColor' => '#000000',
            'rtl' => false,
        ];
    }

    public static function getDefaultLayoutBack(): array
    {
        return [
            'enabledFields' => ['schoolName', 'cardNumberLabel', 'cardNumber', 'expiryDate'],
            'fieldValues' => [
                'studentNameLabel' => 'نوم',
                'fatherNameLabel' => 'د پلار نوم',
                'classLabel' => 'درجه',
                'roomLabel' => 'خونه',
                'admissionNumberLabel' => 'داخله نمبر',
                'studentCodeLabel' => 'ID',
                'cardNumberLabel' => 'کارت نمبر',
            ],
            'schoolNamePosition' => ['x' => 50, 'y' => 30],
            'cardNumberLabelPosition' => ['x' => 35, 'y' => 80],
            'expiryDatePosition' => ['x' => 50, 'y' => 60],
            'cardNumberPosition' => ['x' => 68, 'y' => 80],
            'fontSize' => 10,
            'fontFamily' => 'Arial',
            'textColor' => '#000000',
            'rtl' => false,
        ];
    }
}
