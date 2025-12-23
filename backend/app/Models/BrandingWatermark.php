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

        $mime = $this->image_mime ?? 'image/png';
        $base64 = base64_encode($this->image_binary);
        return "data:{$mime};base64,{$base64}";
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
