<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use App\Models\ExchangeRate;

class FinanceAccount extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'finance_accounts';

    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'organization_id',
        'school_id',
        'currency_id',
        'name',
        'code',
        'type',
        'description',
        'opening_balance',
        'current_balance',
        'is_active',
    ];

    protected $casts = [
        'opening_balance' => 'decimal:2',
        'current_balance' => 'decimal:2',
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
            // Initialize current_balance with opening_balance
            if ($model->current_balance === null) {
                $model->current_balance = $model->opening_balance ?? 0;
            }
        });
    }

    /**
     * Get the organization that owns the account
     */
    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    /**
     * Get the school for the account (optional)
     */
    public function school()
    {
        return $this->belongsTo(SchoolBranding::class, 'school_id');
    }

    /**
     * Get the currency for the account
     */
    public function currency()
    {
        return $this->belongsTo(Currency::class, 'currency_id');
    }

    /**
     * Get all income entries for this account
     */
    public function incomeEntries()
    {
        return $this->hasMany(IncomeEntry::class, 'account_id');
    }

    /**
     * Get all expense entries for this account
     */
    public function expenseEntries()
    {
        return $this->hasMany(ExpenseEntry::class, 'account_id');
    }

    /**
     * Get all assets linked to this account
     */
    public function assets()
    {
        return $this->hasMany(Asset::class, 'finance_account_id');
    }

    /**
     * Scope to filter by organization
     */
    public function scopeForOrganization($query, $organizationId)
    {
        return $query->where('organization_id', $organizationId);
    }

    /**
     * Scope to filter active accounts
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Update the current balance based on income, expenses, and assets
     * Converts all entries to account's currency if account has a currency
     */
    public function recalculateBalance()
    {
        if (!$this->currency_id) {
            // If account has no currency, use simple sum (backward compatibility)
            $totalIncome = $this->incomeEntries()->whereNull('deleted_at')->sum('amount');
            $totalExpense = $this->expenseEntries()->whereNull('deleted_at')->where('status', 'approved')->sum('amount');
            
            // Add assets value (simple sum without currency conversion)
            $totalAssets = $this->assets()
                ->whereNull('deleted_at')
                ->whereIn('status', ['available', 'assigned', 'maintenance'])
                ->whereNotNull('purchase_price')
                ->sum('purchase_price');
            
            $this->current_balance = $this->opening_balance + $totalIncome - $totalExpense + (float) $totalAssets;
        } else {
            // Convert all entries to account's currency
            $totalIncome = 0;
            $totalExpense = 0;
            $totalAssets = 0;
            
            // Process income entries
            foreach ($this->incomeEntries()->whereNull('deleted_at')->get() as $entry) {
                $amount = (float) $entry->amount;
                if ($entry->currency_id && $entry->currency_id !== $this->currency_id) {
                    $rate = ExchangeRate::getRate(
                        $this->organization_id,
                        $entry->currency_id,
                        $this->currency_id,
                        $entry->date ? $entry->date->toDateString() : null
                    );
                    if ($rate !== null) {
                        $amount = $amount * $rate;
                    }
                    // If rate not found, use original amount (graceful degradation)
                }
                $totalIncome += $amount;
            }
            
            // Process expense entries (only approved)
            foreach ($this->expenseEntries()->whereNull('deleted_at')->where('status', 'approved')->get() as $entry) {
                $amount = (float) $entry->amount;
                if ($entry->currency_id && $entry->currency_id !== $this->currency_id) {
                    $rate = ExchangeRate::getRate(
                        $this->organization_id,
                        $entry->currency_id,
                        $this->currency_id,
                        $entry->date ? $entry->date->toDateString() : null
                    );
                    if ($rate !== null) {
                        $amount = $amount * $rate;
                    }
                    // If rate not found, use original amount (graceful degradation)
                }
                $totalExpense += $amount;
            }
            
            // Process assets (convert to account's currency)
            $assets = $this->assets()
                ->whereNull('deleted_at')
                ->whereIn('status', ['available', 'assigned', 'maintenance'])
                ->whereNotNull('purchase_price')
                ->with(['currency', 'financeAccount.currency'])
                ->get();
            
            foreach ($assets as $asset) {
                $price = (float) $asset->purchase_price;
                if ($price <= 0) {
                    continue;
                }
                
                // Determine asset's currency
                $assetCurrencyId = $asset->currency_id;
                if (!$assetCurrencyId && $asset->financeAccount && $asset->financeAccount->currency_id) {
                    // Use account's currency if asset doesn't have one
                    $assetCurrencyId = $asset->financeAccount->currency_id;
                }
                if (!$assetCurrencyId) {
                    // If no currency found, skip (or use account currency as fallback)
                    $assetCurrencyId = $this->currency_id;
                }
                
                // Convert to account's currency
                if ($assetCurrencyId && $assetCurrencyId !== $this->currency_id) {
                    $rate = ExchangeRate::getRate(
                        $this->organization_id,
                        $assetCurrencyId,
                        $this->currency_id,
                        $asset->purchase_date ? $asset->purchase_date->toDateString() : null
                    );
                    if ($rate !== null) {
                        $price = $price * $rate;
                    }
                    // If rate not found, use original price (graceful degradation)
                }
                
                $totalAssets += $price;
            }
            
            $this->current_balance = $this->opening_balance + $totalIncome - $totalExpense + $totalAssets;
        }
        
        $this->save();
        
        return $this->current_balance;
    }
}
