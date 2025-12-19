<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class LetterTemplate extends Model
{
    use HasFactory;

    protected $table = 'letter_templates';
    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $connection = 'pgsql';

    protected $fillable = [
        'id',
        'organization_id',
        'school_id',
        'name',
        'category',
        'letterhead_id',
        'watermark_id',
        'letter_type',
        'body_text',
        'font_family',
        'font_size',
        'variables',
        'supports_tables',
        'table_structure',
        'field_positions',
        'default_security_level_key',
        'page_layout',
        'repeat_letterhead_on_pages',
        'is_mass_template',
        'active',
    ];

    protected $casts = [
        'variables' => 'array',
        'table_structure' => 'array',
        'field_positions' => 'array',
        'supports_tables' => 'boolean',
        'repeat_letterhead_on_pages' => 'boolean',
        'is_mass_template' => 'boolean',
        'active' => 'boolean',
    ];

    /**
     * Get the letterhead (background) associated with this template.
     */
    public function letterhead()
    {
        return $this->belongsTo(Letterhead::class, 'letterhead_id');
    }

    /**
     * Get the watermark associated with this template.
     */
    public function watermark()
    {
        return $this->belongsTo(Letterhead::class, 'watermark_id');
    }

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
