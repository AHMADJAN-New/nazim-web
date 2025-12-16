<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class ExamPaperTemplateFile extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'exam_paper_template_files';
    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    /**
     * Supported languages
     */
    public const LANGUAGE_ENGLISH = 'en';
    public const LANGUAGE_PASHTO = 'ps';
    public const LANGUAGE_FARSI = 'fa';
    public const LANGUAGE_ARABIC = 'ar';

    public const LANGUAGES = [
        self::LANGUAGE_ENGLISH,
        self::LANGUAGE_PASHTO,
        self::LANGUAGE_FARSI,
        self::LANGUAGE_ARABIC,
    ];

    protected $fillable = [
        'id',
        'organization_id',
        'name',
        'description',
        'template_html',
        'css_styles',
        'language',
        'is_default',
        'is_active',
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'is_active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    protected $attributes = [
        'language' => 'en',
        'is_default' => false,
        'is_active' => true,
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });

        // When setting a template as default, unset other defaults for the same language and organization
        static::updating(function ($model) {
            if ($model->isDirty('is_default') && $model->is_default) {
                static::where('organization_id', $model->organization_id)
                    ->where('language', $model->language)
                    ->where('id', '!=', $model->id)
                    ->whereNull('deleted_at')
                    ->update(['is_default' => false]);
            }
        });
    }

    // ========== Relationships ==========

    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    public function templates()
    {
        return $this->hasMany(ExamPaperTemplate::class, 'template_file_id');
    }

    // ========== Scopes ==========

    public function scopeForOrganization($query, $organizationId)
    {
        return $query->where('organization_id', $organizationId);
    }

    public function scopeForLanguage($query, $language)
    {
        return $query->where('language', $language);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeDefault($query)
    {
        return $query->where('is_default', true);
    }

    // ========== Helper Methods ==========

    /**
     * Get template HTML content
     */
    public function getTemplateHtml(): string
    {
        return $this->template_html ?? '';
    }

    /**
     * Get CSS styles
     */
    public function getCssStyles(): ?string
    {
        return $this->css_styles;
    }

    /**
     * Check if this is a RTL language
     */
    public function isRtl(): bool
    {
        return in_array($this->language, [
            self::LANGUAGE_ARABIC,
            self::LANGUAGE_PASHTO,
            self::LANGUAGE_FARSI,
        ]);
    }
}
