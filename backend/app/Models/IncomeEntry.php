<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class IncomeEntry extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'income_entries';

    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'organization_id',
        'school_id',
        'currency_id',
        'account_id',
        'income_category_id',
        'project_id',
        'donor_id',
        'amount',
        'date',
        'reference_no',
        'description',
        'received_by_user_id',
        'payment_method',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'date' => 'date',
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

        // Update balances when income is created (wrapped in transaction)
        static::created(function ($model) {
            DB::transaction(function () use ($model) {
                $model->updateRelatedBalances();
            });
        });

        // Update balances when income is updated (wrapped in transaction)
        static::updated(function ($model) {
            DB::transaction(function () use ($model) {
                $model->updateRelatedBalances();
            });
        });

        // Update balances when income is deleted (wrapped in transaction)
        static::deleted(function ($model) {
            DB::transaction(function () use ($model) {
                $model->updateRelatedBalances();
            });
        });
    }

    /**
     * Update related balances (account, project, donor)
     * This method should be called within a transaction
     */
    public function updateRelatedBalances()
    {
        // Refresh relationships to get fresh data
        $this->load(['account', 'project', 'donor']);

        // Update account balance
        if ($this->account) {
            $this->account->recalculateBalance();
        }

        // Update project totals
        if ($this->project) {
            $this->project->recalculateTotals();
        }

        // Update donor total
        if ($this->donor) {
            $this->donor->recalculateTotalDonated();
        }
    }

    /**
     * Get the organization that owns the entry
     */
    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    /**
     * Get the school for the entry (optional)
     */
    public function school()
    {
        return $this->belongsTo(SchoolBranding::class, 'school_id');
    }

    /**
     * Get the currency for the entry
     */
    public function currency()
    {
        return $this->belongsTo(Currency::class, 'currency_id');
    }

    /**
     * Get the account where money went
     */
    public function account()
    {
        return $this->belongsTo(FinanceAccount::class, 'account_id');
    }

    /**
     * Get the income category
     */
    public function incomeCategory()
    {
        return $this->belongsTo(IncomeCategory::class, 'income_category_id');
    }

    /**
     * Get the project (optional)
     */
    public function project()
    {
        return $this->belongsTo(FinanceProject::class, 'project_id');
    }

    /**
     * Get the donor (optional)
     */
    public function donor()
    {
        return $this->belongsTo(Donor::class, 'donor_id');
    }

    /**
     * Get the user who received the money
     */
    public function receivedBy()
    {
        return $this->belongsTo(User::class, 'received_by_user_id');
    }

    /**
     * Scope to filter by organization
     */
    public function scopeForOrganization($query, $organizationId)
    {
        return $query->where('organization_id', $organizationId);
    }

    /**
     * Scope to filter by date range
     */
    public function scopeDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('date', [$startDate, $endDate]);
    }

    /**
     * Scope to filter by account
     */
    public function scopeForAccount($query, $accountId)
    {
        return $query->where('account_id', $accountId);
    }

    /**
     * Scope to filter by category
     */
    public function scopeForCategory($query, $categoryId)
    {
        return $query->where('income_category_id', $categoryId);
    }

    /**
     * Scope to filter by project
     */
    public function scopeForProject($query, $projectId)
    {
        return $query->where('project_id', $projectId);
    }

    /**
     * Scope to filter by donor
     */
    public function scopeForDonor($query, $donorId)
    {
        return $query->where('donor_id', $donorId);
    }
}
