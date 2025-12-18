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
        'letter_type',
        'body_html',
        'template_file_path',
        'template_file_type',
        'variables',
        'header_structure',
        'field_positions',
        'allow_edit_body',
        'default_security_level_key',
        'page_layout',
        'is_mass_template',
        'active',
    ];

    protected $casts = [
        'variables' => 'array',
        'header_structure' => 'array',
        'field_positions' => 'array',
        'allow_edit_body' => 'boolean',
        'is_mass_template' => 'boolean',
        'active' => 'boolean',
    ];

    /**
     * Get the letterhead associated with this template.
     */
    public function letterhead()
    {
        return $this->belongsTo(Letterhead::class, 'letterhead_id');
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
