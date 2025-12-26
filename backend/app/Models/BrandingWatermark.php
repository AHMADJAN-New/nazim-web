<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class BrandingWatermark extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'branding_watermarks';

    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'organization_id',
        'branding_id',
        'report_key',
        'wm_type',
        'image_binary',
        'image_mime',
        'text',
        'font_family',
        'color',
        'opacity',
        'rotation_deg',
        'scale',
        'position',
        'pos_x',
        'pos_y',
        'repeat_pattern',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'opacity' => 'float',
        'rotation_deg' => 'integer',
        'scale' => 'float',
        'pos_x' => 'float',
        'pos_y' => 'float',
        'sort_order' => 'integer',
        'is_active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Attributes to hide when converting to array/JSON
     * image_binary is excluded because it contains binary data that causes UTF-8 encoding issues
     */
    protected $hidden = [
        'image_binary',
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
     * Get the organization that owns this watermark
     */
    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    /**
     * Get the school branding this watermark belongs to
     */
    public function branding()
    {
        return $this->belongsTo(SchoolBranding::class, 'branding_id');
    }

    /**
     * Scope to filter by organization
     */
    public function scopeForOrganization($query, $organizationId)
    {
        return $query->where('organization_id', $organizationId);
    }

    /**
     * Scope to filter by branding
     */
    public function scopeForBranding($query, $brandingId)
    {
        return $query->where('branding_id', $brandingId);
    }

    /**
     * Scope to filter by report key (including global watermarks where report_key is null)
     */
    public function scopeForReport($query, $reportKey)
    {
        return $query->where(function ($q) use ($reportKey) {
            $q->where('report_key', $reportKey)
              ->orWhereNull('report_key');
        });
    }

    /**
     * Scope to filter active watermarks
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to order by sort_order
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order', 'asc');
    }

    /**
     * Check if this is an image watermark
     */
    public function isImage(): bool
    {
        return $this->wm_type === 'image';
    }

    /**
     * Check if this is a text watermark
     */
    public function isText(): bool
    {
        return $this->wm_type === 'text';
    }

    /**
     * Get image as base64 data URI
     */
    public function getImageDataUri(): ?string
    {
        if (!$this->isImage() || empty($this->image_binary)) {
            return null;
        }

        try {
            $mime = $this->image_mime ?? 'image/png';
            
            // Ensure image_binary is a string (not a resource)
            $imageData = $this->image_binary;
            if (is_resource($imageData)) {
                $imageData = stream_get_contents($imageData);
            }
            
            // Validate that we have valid binary data
            if (empty($imageData) || !is_string($imageData)) {
                return null;
            }
            
            $base64 = base64_encode($imageData);
            
            // Validate base64 encoding succeeded
            if ($base64 === false) {
                return null;
            }
            
            return "data:{$mime};base64,{$base64}";
        } catch (\Exception $e) {
            \Log::warning("Failed to encode image data URI: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Convert binary fields to base64 data URI when serializing to array/JSON
     * Similar to SchoolBranding model's toArray() method
     * 
     * IMPORTANT: We manually build the array to avoid parent::toArray() trying to serialize
     * binary data, which causes UTF-8 encoding errors.
     */
    public function toArray()
    {
        // Manually build array to avoid parent::toArray() serializing binary data
        $array = [
            'id' => $this->id,
            'organization_id' => $this->organization_id,
            'branding_id' => $this->branding_id,
            'report_key' => $this->report_key,
            'wm_type' => $this->wm_type,
            'text' => $this->text,
            'font_family' => $this->font_family,
            'color' => $this->color,
            'opacity' => $this->opacity,
            'rotation_deg' => $this->rotation_deg,
            'scale' => $this->scale,
            'position' => $this->position,
            'pos_x' => $this->pos_x,
            'pos_y' => $this->pos_y,
            'repeat_pattern' => $this->repeat_pattern,
            'sort_order' => $this->sort_order,
            'is_active' => $this->is_active,
            'image_mime' => $this->image_mime,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'deleted_at' => $this->deleted_at?->toISOString(),
        ];

        // Get image data URI using DB query (like BrandingCacheService does for logos)
        // This avoids loading binary data into the model which causes UTF-8 encoding issues
        if ($this->isImage() && $this->id) {
            try {
                $imageData = \Illuminate\Support\Facades\DB::selectOne(
                    "SELECT 
                        CASE 
                            WHEN image_binary IS NULL THEN NULL 
                            ELSE encode(image_binary, 'base64') 
                        END as image_base64,
                        image_mime
                    FROM branding_watermarks 
                    WHERE id = ? AND deleted_at IS NULL",
                    [$this->id]
                );
                
                if ($imageData && !empty($imageData->image_base64)) {
                    $mime = $imageData->image_mime ?? 'image/png';
                    $array['image_data_uri'] = "data:{$mime};base64,{$imageData->image_base64}";
                }
            } catch (\Exception $e) {
                \Log::warning("Failed to get image data URI in toArray() for watermark {$this->id}: " . $e->getMessage());
            }
        }

        return $array;
    }

    /**
     * Get CSS transform value for rotation and scale
     */
    public function getCssTransform(): string
    {
        $transforms = [];

        if ($this->rotation_deg != 0) {
            $transforms[] = "rotate({$this->rotation_deg}deg)";
        }

        if ($this->scale != 1.0) {
            $transforms[] = "scale({$this->scale})";
        }

        return empty($transforms) ? 'none' : implode(' ', $transforms);
    }

    /**
     * Get CSS position properties
     */
    public function getCssPosition(): array
    {
        $positionMap = [
            'center' => ['top' => '50%', 'left' => '50%', 'transform' => 'translate(-50%, -50%)'],
            'top-left' => ['top' => '10%', 'left' => '10%', 'transform' => 'none'],
            'top-right' => ['top' => '10%', 'right' => '10%', 'transform' => 'none'],
            'bottom-left' => ['bottom' => '10%', 'left' => '10%', 'transform' => 'none'],
            'bottom-right' => ['bottom' => '10%', 'right' => '10%', 'transform' => 'none'],
        ];

        return $positionMap[$this->position] ?? $positionMap['center'];
    }
}
