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
        'body_html',
        'variables',
        'allow_edit_body',
        'default_security_level_key',
        'page_layout',
        'is_mass_template',
        'active',
    ];

    protected $casts = [
        'variables' => 'array',
        'allow_edit_body' => 'boolean',
        'is_mass_template' => 'boolean',
        'active' => 'boolean',
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
