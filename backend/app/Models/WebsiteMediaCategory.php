<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class WebsiteMediaCategory extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'website_media_categories';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'organization_id',
        'school_id',
        'name',
        'slug',
        'description',
        'cover_image_path',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
            if (empty($model->slug)) {
                $model->slug = Str::slug($model->name);
            }
        });
    }

    public function media()
    {
        return $this->hasMany(WebsiteMedia::class, 'category_id');
    }

    public function school()
    {
        return $this->belongsTo(SchoolBranding::class, 'school_id');
    }
}
