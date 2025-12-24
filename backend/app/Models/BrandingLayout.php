<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class BrandingLayout extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'branding_layouts';

    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'organization_id',
        'branding_id',
        'layout_name',
        'page_size',
        'orientation',
        'margins',
        'rtl',
        'header_html',
        'footer_html',
        'extra_css',
        'show_primary_logo',
        'show_secondary_logo',
        'show_ministry_logo',
        'logo_height_px',
        'header_height_px',
        'header_layout_style',
        'is_active',
        'is_default',
    ];

    protected $casts = [
        'rtl' => 'boolean',
        'show_primary_logo' => 'boolean',
        'show_secondary_logo' => 'boolean',
        'show_ministry_logo' => 'boolean',
        'logo_height_px' => 'integer',
        'header_height_px' => 'integer',
        'is_active' => 'boolean',
        'is_default' => 'boolean',
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
     * Get the organization that owns this layout
     */
    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    /**
     * Get the school branding this layout belongs to
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
     * Scope to filter active layouts
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to filter default layouts
     */
    public function scopeDefault($query)
    {
        return $query->where('is_default', true);
    }

    /**
     * Get margins as array [top, right, bottom, left]
     */
    public function getMarginsArray(): array
    {
        $parts = explode(' ', $this->margins);
        return [
            'top' => $parts[0] ?? '15mm',
            'right' => $parts[1] ?? '12mm',
            'bottom' => $parts[2] ?? '18mm',
            'left' => $parts[3] ?? '12mm',
        ];
    }

    /**
     * Get page size for CSS @page rule
     */
    public function getPageSizeForCss(): string
    {
        $size = strtoupper($this->page_size);
        $orientation = strtolower($this->orientation);
        return "{$size} {$orientation}";
    }
}
