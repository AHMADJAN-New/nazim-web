<?php

namespace App\Models;

use App\Traits\LogsActivityWithContext;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Spatie\Activitylog\LogOptions;

class ExpenseEntry extends Model
{
    use HasFactory, LogsActivityWithContext, SoftDeletes;

    protected $connection = 'pgsql';

    protected $table = 'expense_entries';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'organization_id',
        'school_id',
        'currency_id',
        'account_id',
        'expense_category_id',
        'project_id',
        'amount',
        'date',
        'reference_no',
        'description',
        'paid_to',
        'payment_method',
        'approved_by_user_id',
        'approved_at',
        'status',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'date' => 'date',
        'approved_at' => 'datetime',
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

        // Update balances when expense is created (wrapped in transaction)
        static::created(function ($model) {
            DB::transaction(function () use ($model) {
                $model->updateRelatedBalances();
            });
        });

        // Update balances when expense is updated (wrapped in transaction)
        static::updated(function ($model) {
            DB::transaction(function () use ($model) {
                $model->updateRelatedBalances();
            });
        });

        // Update balances when expense is deleted (wrapped in transaction)
        static::deleted(function ($model) {
            DB::transaction(function () use ($model) {
                $model->updateRelatedBalances();
            });
        });
    }

    /**
     * Update related balances (account, project)
     * This method should be called within a transaction
     */
    public function updateRelatedBalances()
    {
        // Refresh relationships to get fresh data
        $this->load(['account', 'project']);

        // Update account balance
        if ($this->account) {
            $this->account->recalculateBalance();
        }

        // Update project totals
        if ($this->project) {
            $this->project->recalculateTotals();
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
     * Get the account where money came from
     */
    public function account()
    {
        return $this->belongsTo(FinanceAccount::class, 'account_id');
    }

    /**
     * Get the expense category
     */
    public function expenseCategory()
    {
        return $this->belongsTo(ExpenseCategory::class, 'expense_category_id');
    }

    /**
     * Get the project (optional)
     */
    public function project()
    {
        return $this->belongsTo(FinanceProject::class, 'project_id');
    }

    /**
     * Get the user who approved the expense
     */
    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by_user_id');
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
        return $query->where('expense_category_id', $categoryId);
    }

    /**
     * Scope to filter by project
     */
    public function scopeForProject($query, $projectId)
    {
        return $query->where('project_id', $projectId);
    }

    /**
     * Scope to filter by status
     */
    public function scopeStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope to filter approved expenses
     */
    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    /**
     * Get the activity log options for the model.
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnlyDirty()
            ->logFillable()
            ->dontSubmitEmptyLogs();
    }
}
