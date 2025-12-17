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
        'letter_type',
        'default_for_layout',
        'position',
        'preview_url',
        'active',
    ];

    protected $casts = [
        'active' => 'boolean',
    ];

    /**
     * Get the preview URL for the letterhead.
     * If preview_url is set, return it; otherwise return file serve URL.
     */
    public function getPreviewUrlAttribute($value)
    {
        // Return stored preview_url if available
        if ($value) {
            return $value;
        }

        // Return file serve URL as fallback
        $filePath = $this->attributes['file_path'] ?? null;
        if ($filePath) {
            return route('dms.letterheads.serve', ['id' => $this->id]);
        }

        return null;
    }

    /**
     * Get the file URL for the letterhead.
     */
    public function getFileUrlAttribute()
    {
        $filePath = $this->attributes['file_path'] ?? null;
        if ($filePath) {
            return route('dms.letterheads.serve', ['id' => $this->id]);
        }
        return null;
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
