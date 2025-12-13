<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

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
     * Update the current balance based on income and expenses
     */
    public function recalculateBalance()
    {
        $totalIncome = $this->incomeEntries()->whereNull('deleted_at')->sum('amount');
        $totalExpense = $this->expenseEntries()->whereNull('deleted_at')->where('status', 'approved')->sum('amount');
        
        $this->current_balance = $this->opening_balance + $totalIncome - $totalExpense;
        $this->save();
        
        return $this->current_balance;
    }
}
