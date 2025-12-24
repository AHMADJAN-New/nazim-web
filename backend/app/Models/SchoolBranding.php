<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class SchoolBranding extends Model
{
    use HasFactory;

    protected $connection = 'pgsql';
    protected $table = 'school_branding';

    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'organization_id',
        'school_name',
        'school_name_arabic',
        'school_name_pashto',
        'school_address',
        'school_phone',
        'school_email',
        'school_website',
        'logo_path',
        'header_image_path',
        'footer_text',
        'primary_color',
        'secondary_color',
        'accent_color',
        'font_family',
        'report_font_size',
        'primary_logo_binary',
        'primary_logo_mime_type',
        'primary_logo_filename',
        'primary_logo_size',
        'secondary_logo_binary',
        'secondary_logo_mime_type',
        'secondary_logo_filename',
        'secondary_logo_size',
        'ministry_logo_binary',
        'ministry_logo_mime_type',
        'ministry_logo_filename',
        'ministry_logo_size',
        'primary_logo_usage',
        'secondary_logo_usage',
        'ministry_logo_usage',
        'header_text',
        'table_alternating_colors',
        'show_page_numbers',
        'show_generation_date',
        'report_logo_selection',
        'show_primary_logo',
        'show_secondary_logo',
        'show_ministry_logo',
        'primary_logo_position',
        'secondary_logo_position',
        'ministry_logo_position',
        'calendar_preference',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'table_alternating_colors' => 'boolean',
        'show_page_numbers' => 'boolean',
        'show_generation_date' => 'boolean',
        'show_primary_logo' => 'boolean',
        'show_secondary_logo' => 'boolean',
        'show_ministry_logo' => 'boolean',
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
     * Get the organization that owns the school branding
     */
    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    /**
     * Get all layouts for this branding
     */
    public function layouts()
    {
        return $this->hasMany(BrandingLayout::class, 'branding_id');
    }

    /**
     * Get the default layout for this branding
     */
    public function defaultLayout()
    {
        return $this->hasOne(BrandingLayout::class, 'branding_id')
            ->where('is_default', true)
            ->where('is_active', true);
    }

    /**
     * Get all notes for this branding
     */
    public function notes()
    {
        return $this->hasMany(BrandingNote::class, 'branding_id');
    }

    /**
     * Get active notes for a specific location
     */
    public function activeNotes(string $location = null)
    {
        $query = $this->notes()->where('is_active', true);
        if ($location) {
            $query->where('location', $location);
        }
        return $query;
    }

    /**
     * Get all watermarks for this branding
     */
    public function watermarks()
    {
        return $this->hasMany(BrandingWatermark::class, 'branding_id');
    }

    /**
     * Get the default watermark for this branding
     */
    public function defaultWatermark()
    {
        return $this->hasOne(BrandingWatermark::class, 'branding_id')
            ->where('is_default', true)
            ->where('is_active', true);
    }

    /**
     * Get all report runs for this branding
     */
    public function reportRuns()
    {
        return $this->hasMany(ReportRun::class, 'branding_id');
    }

    /**
     * Convert binary logo to base64 when serializing to JSON
     */
    protected function serializeDate(\DateTimeInterface $date)
    {
        return $date->format('Y-m-d H:i:s');
    }

    /**
     * Convert binary fields to base64 when serializing to array/JSON
     */
    public function toArray()
    {
        $array = parent::toArray();

        // Convert binary logo fields to base64 strings for JSON transmission
        // PostgreSQL BYTEA columns need special handling
        $logoFields = ['primary_logo_binary', 'secondary_logo_binary', 'ministry_logo_binary'];
        
        foreach ($logoFields as $field) {
            try {
                // Get the raw attribute value directly from the model
                $rawValue = $this->getAttribute($field);
                
                if ($rawValue !== null && $rawValue !== '') {
                    // PostgreSQL BYTEA is returned as a binary string
                    if (is_string($rawValue)) {
                        // Check if it's already base64 encoded (unlikely but possible)
                        $decoded = @base64_decode($rawValue, true);
                        if ($decoded !== false && base64_encode($decoded) === $rawValue) {
                            // Already base64, keep as is
                            $array[$field] = $rawValue;
                        } else {
                            // Encode binary string to base64
                            $array[$field] = base64_encode($rawValue);
                        }
                    } elseif (is_resource($rawValue)) {
                        // If it's a resource stream, read it
                        rewind($rawValue);
                        $binary = stream_get_contents($rawValue);
                        $array[$field] = base64_encode($binary);
                    } else {
                        // Fallback: try to convert to string and encode
                        $array[$field] = base64_encode((string)$rawValue);
                    }
                } else {
                    $array[$field] = null;
                }
            } catch (\Exception $e) {
                // If encoding fails, set to null to prevent JSON serialization errors
                \Log::warning("Error encoding {$field} to base64: " . $e->getMessage() . " | Type: " . gettype($this->getAttribute($field)));
                $array[$field] = null;
            }
        }

        return $array;
    }
}

