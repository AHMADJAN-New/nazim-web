<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class ExchangeRate extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'exchange_rates';

    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'organization_id',
        'from_currency_id',
        'to_currency_id',
        'rate',
        'effective_date',
        'notes',
        'is_active',
    ];

    protected $casts = [
        'rate' => 'decimal:6',
        'effective_date' => 'date',
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
     * Get the organization that owns the exchange rate
     */
    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    /**
     * Get the source currency
     */
    public function fromCurrency()
    {
        return $this->belongsTo(Currency::class, 'from_currency_id');
    }

    /**
     * Get the target currency
     */
    public function toCurrency()
    {
        return $this->belongsTo(Currency::class, 'to_currency_id');
    }

    /**
     * Scope to filter by organization
     */
    public function scopeForOrganization($query, $organizationId)
    {
        return $query->where('organization_id', $organizationId);
    }

    /**
     * Scope to filter active rates
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to get rate for a specific date
     */
    public function scopeForDate($query, $date)
    {
        return $query->where('effective_date', '<=', $date)
            ->orderBy('effective_date', 'desc');
    }

    /**
     * Get the most recent active rate between two currencies
     */
    public static function getRate($organizationId, $fromCurrencyId, $toCurrencyId, $date = null, $visited = [])
    {
        $date = $date ?? now()->toDateString();

        // Same currency
        if ($fromCurrencyId === $toCurrencyId) {
            return 1.0;
        }

        // Prevent infinite loops by tracking visited currency pairs
        $key = $fromCurrencyId . '_' . $toCurrencyId;
        if (in_array($key, $visited)) {
            return null; // Already visited this pair, prevent infinite loop
        }
        $visited[] = $key;

        // Direct rate
        $rate = static::where('organization_id', $organizationId)
            ->where('from_currency_id', $fromCurrencyId)
            ->where('to_currency_id', $toCurrencyId)
            ->where('effective_date', '<=', $date)
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->orderBy('effective_date', 'desc')
            ->first();

        if ($rate) {
            return (float) $rate->rate;
        }

        // Reverse rate (1 / reverse_rate)
        $reverseRate = static::where('organization_id', $organizationId)
            ->where('from_currency_id', $toCurrencyId)
            ->where('to_currency_id', $fromCurrencyId)
            ->where('effective_date', '<=', $date)
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->orderBy('effective_date', 'desc')
            ->first();

        if ($reverseRate) {
            return 1.0 / (float) $reverseRate->rate;
        }

        // Try to find rate through base currency (only if neither currency is the base)
        $baseCurrency = Currency::where('organization_id', $organizationId)
            ->where('is_base', true)
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->first();

        if ($baseCurrency && $fromCurrencyId !== $baseCurrency->id && $toCurrencyId !== $baseCurrency->id) {
            // Only try base currency conversion if neither currency is the base
            $fromToBase = static::getRate($organizationId, $fromCurrencyId, $baseCurrency->id, $date, $visited);
            $baseToTo = static::getRate($organizationId, $baseCurrency->id, $toCurrencyId, $date, $visited);

            if ($fromToBase !== null && $baseToTo !== null) {
                return $fromToBase * $baseToTo;
            }
        }

        return null; // No rate found
    }
}
