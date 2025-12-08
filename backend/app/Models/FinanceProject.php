<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class FinanceProject extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'finance_projects';

    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'organization_id',
        'school_id',
        'name',
        'code',
        'description',
        'budget_amount',
        'total_income',
        'total_expense',
        'start_date',
        'end_date',
        'status',
        'is_active',
    ];

    protected $casts = [
        'budget_amount' => 'decimal:2',
        'total_income' => 'decimal:2',
        'total_expense' => 'decimal:2',
        'start_date' => 'date',
        'end_date' => 'date',
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
     * Get the organization that owns the project
     */
    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    /**
     * Get the school for the project (optional)
     */
    public function school()
    {
        return $this->belongsTo(SchoolBranding::class, 'school_id');
    }

    /**
     * Get all income entries for this project
     */
    public function incomeEntries()
    {
        return $this->hasMany(IncomeEntry::class, 'project_id');
    }

    /**
     * Get all expense entries for this project
     */
    public function expenseEntries()
    {
        return $this->hasMany(ExpenseEntry::class, 'project_id');
    }

    /**
     * Scope to filter by organization
     */
    public function scopeForOrganization($query, $organizationId)
    {
        return $query->where('organization_id', $organizationId);
    }

    /**
     * Scope to filter active projects
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to filter by status
     */
    public function scopeStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Recalculate project totals
     */
    public function recalculateTotals()
    {
        $this->total_income = $this->incomeEntries()->whereNull('deleted_at')->sum('amount');
        $this->total_expense = $this->expenseEntries()->whereNull('deleted_at')->where('status', 'approved')->sum('amount');
        $this->save();
        
        return [
            'total_income' => $this->total_income,
            'total_expense' => $this->total_expense,
            'balance' => $this->total_income - $this->total_expense,
        ];
    }

    /**
     * Get remaining balance
     */
    public function getRemainingBalanceAttribute()
    {
        return $this->total_income - $this->total_expense;
    }
}
