<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class FeatureDefinition extends Model
{
    use HasFactory;

    protected $connection = 'pgsql';
    protected $table = 'feature_definitions';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'feature_key',
        'name',
        'description',
        'category',
        'is_addon',
        'addon_price_yearly_afn',
        'addon_price_yearly_usd',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'is_addon' => 'boolean',
        'is_active' => 'boolean',
        'addon_price_yearly_afn' => 'decimal:2',
        'addon_price_yearly_usd' => 'decimal:2',
        'sort_order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
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

    /**
     * Get the addon price for a given currency
     */
    public function getAddonPrice(string $currency = 'AFN'): float
    {
        return $currency === 'USD' 
            ? (float) $this->addon_price_yearly_usd 
            : (float) $this->addon_price_yearly_afn;
    }

    /**
     * Get plan features for this definition
     */
    public function planFeatures()
    {
        return $this->hasMany(PlanFeature::class, 'feature_key', 'feature_key');
    }

    /**
     * Scope to get active features
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to get addon features
     */
    public function scopeAddons($query)
    {
        return $query->where('is_addon', true);
    }

    /**
     * Scope to filter by category
     */
    public function scopeCategory($query, string $category)
    {
        return $query->where('category', $category);
    }
}
