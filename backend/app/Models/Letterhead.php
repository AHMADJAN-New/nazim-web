<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Letterhead extends Model
{
    use HasFactory;

    protected $table = 'letterheads';
    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $connection = 'pgsql';

    protected $fillable = [
        'id',
        'organization_id',
        'school_id',
        'name',
        'file_path',
        'file_type',
        'letterhead_type',
        'letter_type',
        'preview_url',
        'active',
    ];

    protected $casts = [
        'active' => 'boolean',
    ];

    // Ensure computed URLs are returned in API responses
    protected $appends = [
        'file_url',
        'preview_url',
    ];

    /**
     * Get a signed/served URL for this letterhead file.
     */
    public function getFileUrlAttribute(): ?string
    {
        if (empty($this->attributes['file_path'])) {
            return null;
        }

        // Use the serve route so auth/org scoping is preserved
        try {
            return route('dms.letterheads.serve', ['id' => $this->id]);
        } catch (\Throwable $e) {
            return null;
        }
    }

    /**
     * Get the preview URL for the letterhead.
     * If preview_url is set, return it; otherwise return the served file URL.
     */
    public function getPreviewUrlAttribute($value): ?string
    {
        if ($value) {
            return $value;
        }

        return $this->file_url;
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
