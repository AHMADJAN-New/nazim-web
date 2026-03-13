<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class OrgSchoolTransfer extends Model
{
    protected $connection = 'pgsql';

    protected $table = 'org_school_transfers';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'id',
        'organization_id',
        'school_id',
        'org_account_id',
        'school_account_id',
        'currency_id',
        'amount',
        'transfer_date',
        'reference_no',
        'notes',
        'status',
        'org_expense_entry_id',
        'school_income_entry_id',
        'created_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'transfer_date' => 'date',
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

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(SchoolBranding::class, 'school_id');
    }

    public function orgAccount(): BelongsTo
    {
        return $this->belongsTo(FinanceAccount::class, 'org_account_id');
    }

    public function schoolAccount(): BelongsTo
    {
        return $this->belongsTo(FinanceAccount::class, 'school_account_id');
    }

    public function currency(): BelongsTo
    {
        return $this->belongsTo(Currency::class, 'currency_id');
    }

    public function orgExpenseEntry(): BelongsTo
    {
        return $this->belongsTo(ExpenseEntry::class, 'org_expense_entry_id');
    }

    public function schoolIncomeEntry(): BelongsTo
    {
        return $this->belongsTo(IncomeEntry::class, 'school_income_entry_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
