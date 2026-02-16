<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class DesktopRelease extends Model
{
    use SoftDeletes;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'version',
        'display_name',
        'release_notes',
        'file_path',
        'file_name',
        'file_size',
        'file_hash',
        'file_hash_md5',
        'status',
        'is_latest',
        'download_available',
        'download_count',
        'published_at',
    ];

    protected function casts(): array
    {
        return [
            'is_latest' => 'boolean',
            'download_available' => 'boolean',
            'file_size' => 'integer',
            'download_count' => 'integer',
            'published_at' => 'datetime',
        ];
    }

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }
}
