<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class BrandingNote extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'branding_notes';

    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'organization_id',
        'branding_id',
        'report_key',
        'note_text',
        'language',
        'location',
        'show_on',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
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
     * Get the organization that owns this note
     */
    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    /**
     * Get the school branding this note belongs to
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
     * Scope to filter by report key (including global notes where report_key is null)
     */
    public function scopeForReport($query, $reportKey)
    {
        return $query->where(function ($q) use ($reportKey) {
            $q->where('report_key', $reportKey)
              ->orWhereNull('report_key');
        });
    }

    /**
     * Scope to filter by location
     */
    public function scopeInLocation($query, $location)
    {
        return $query->where('location', $location);
    }

    /**
     * Scope to filter active notes
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to filter by show_on (pdf, excel, all)
     */
    public function scopeShowOn($query, $format)
    {
        return $query->where(function ($q) use ($format) {
            $q->where('show_on', $format)
              ->orWhere('show_on', 'all');
        });
    }

    /**
     * Scope to order by sort_order
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order', 'asc');
    }
}
