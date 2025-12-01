<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class SchoolBranding extends Model
{
    use HasFactory;

    protected $connection = 'pgsql';
    protected $table = 'school_branding';

    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'organization_id',
        'school_name',
        'school_name_arabic',
        'school_name_pashto',
        'school_address',
        'school_phone',
        'school_email',
        'school_website',
        'logo_path',
        'header_image_path',
        'footer_text',
        'primary_color',
        'secondary_color',
        'accent_color',
        'font_family',
        'report_font_size',
        'primary_logo_binary',
        'primary_logo_mime_type',
        'primary_logo_filename',
        'primary_logo_size',
        'secondary_logo_binary',
        'secondary_logo_mime_type',
        'secondary_logo_filename',
        'secondary_logo_size',
        'ministry_logo_binary',
        'ministry_logo_mime_type',
        'ministry_logo_filename',
        'ministry_logo_size',
        'primary_logo_usage',
        'secondary_logo_usage',
        'ministry_logo_usage',
        'header_text',
        'table_alternating_colors',
        'show_page_numbers',
        'show_generation_date',
        'report_logo_selection',
        'calendar_preference',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'table_alternating_colors' => 'boolean',
        'show_page_numbers' => 'boolean',
        'show_generation_date' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Boot the model
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    /**
     * Get the organization that owns the school branding
     */
    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }
}

