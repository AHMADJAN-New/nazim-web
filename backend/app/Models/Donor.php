<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use App\Models\ExchangeRate;
use App\Models\Currency;

class Donor extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'donors';

    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'organization_id',
        'school_id',
        'name',
        'phone',
        'email',
        'address',
        'type',
        'contact_person',
        'notes',
        'total_donated',
        'is_active',
    ];

    protected $casts = [
        'total_donated' => 'decimal:2',
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
     * Get the organization that owns the donor
     */
    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    /**
     * Get all income entries from this donor
     */
    public function incomeEntries()
    {
        return $this->hasMany(IncomeEntry::class, 'donor_id');
    }

    /**
     * Scope to filter by organization
     */
    public function scopeForOrganization($query, $organizationId)
    {
        return $query->where('organization_id', $organizationId);
    }

    /**
     * Scope to filter active donors
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to filter by type
     */
    public function scopeType($query, $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Recalculate total donated
     * Converts all donations to organization's base currency for consistent reporting
     */
    public function recalculateTotalDonated()
    {
        // Get organization's base currency
        $baseCurrency = Currency::where('organization_id', $this->organization_id)
            ->where('school_id', $this->school_id)
            ->where('is_base', true)
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->first();
        
        if (!$baseCurrency) {
            // If no base currency, use simple sum (backward compatibility)
            $this->total_donated = $this->incomeEntries()->whereNull('deleted_at')->sum('amount');
        } else {
            // Convert all donations to base currency
            $totalDonated = 0;
            
            foreach ($this->incomeEntries()->whereNull('deleted_at')->get() as $entry) {
                $amount = (float) $entry->amount;
                if ($entry->currency_id && $entry->currency_id !== $baseCurrency->id) {
                    $rate = ExchangeRate::getRate(
                        $this->organization_id,
                        $this->school_id,
                        $entry->currency_id,
                        $baseCurrency->id,
                        $entry->date ? $entry->date->toDateString() : null
                    );
                    if ($rate !== null) {
                        $amount = $amount * $rate;
                    }
                    // If rate not found, use original amount (graceful degradation)
                }
                $totalDonated += $amount;
            }
            
            $this->total_donated = $totalDonated;
        }
        
        $this->save();
        
        return $this->total_donated;
    }

    /**
     * Get donations for a specific period
     * Returns sum in organization's base currency
     */
    public function getDonationsForPeriod($startDate, $endDate)
    {
        // Get organization's base currency
        $baseCurrency = Currency::where('organization_id', $this->organization_id)
            ->where('school_id', $this->school_id)
            ->where('is_base', true)
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->first();
        
        if (!$baseCurrency) {
            // If no base currency, use simple sum (backward compatibility)
            return $this->incomeEntries()
                ->whereNull('deleted_at')
                ->whereBetween('date', [$startDate, $endDate])
                ->sum('amount');
        }
        
        // Convert all donations to base currency
        $totalDonated = 0;
        
        foreach ($this->incomeEntries()
            ->whereNull('deleted_at')
            ->whereBetween('date', [$startDate, $endDate])
            ->get() as $entry) {
            $amount = (float) $entry->amount;
            if ($entry->currency_id && $entry->currency_id !== $baseCurrency->id) {
                $rate = ExchangeRate::getRate(
                    $this->organization_id,
                    $this->school_id,
                    $entry->currency_id,
                    $baseCurrency->id,
                    $entry->date ? $entry->date->toDateString() : null
                );
                if ($rate !== null) {
                    $amount = $amount * $rate;
                }
                // If rate not found, use original amount (graceful degradation)
            }
            $totalDonated += $amount;
        }
        
        return $totalDonated;
    }
}
