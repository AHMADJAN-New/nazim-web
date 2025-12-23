<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class LibraryBook extends Model
{
    use HasFactory, SoftDeletes;

    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'organization_id',
        'currency_id',
        'finance_account_id',
        'title',
        'author',
        'isbn',
        'book_number',
        'category',
        'category_id',
        'volume',
        'description',
        'price',
        'default_loan_days',
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

        // Update finance account balance when library book is created
        static::created(function ($model) {
            DB::transaction(function () use ($model) {
                $model->updateRelatedBalances();
            });
        });

        // Update finance account balance when library book is updated
        static::updated(function ($model) {
            DB::transaction(function () use ($model) {
                $model->updateRelatedBalances();
            });
        });

        // Update finance account balance when library book is deleted
        static::deleted(function ($model) {
            DB::transaction(function () use ($model) {
                $model->updateRelatedBalances();
            });
        });
    }

    /**
     * Update related balances (finance account)
     * This method should be called within a transaction
     */
    public function updateRelatedBalances()
    {
        // Refresh relationships to get fresh data
        $this->load(['financeAccount']);

        // Update finance account balance if book is linked to an account
        if ($this->financeAccount) {
            $this->financeAccount->recalculateBalance();
        }

        // Also update if finance_account_id changed (check original value)
        if ($this->wasChanged('finance_account_id')) {
            $originalAccountId = $this->getOriginal('finance_account_id');
            if ($originalAccountId && $originalAccountId !== $this->finance_account_id) {
                // Book was moved to a different account, update old account too
                $oldAccount = FinanceAccount::find($originalAccountId);
                if ($oldAccount) {
                    $oldAccount->recalculateBalance();
                }
            }
        }
    }

    public function copies()
    {
        return $this->hasMany(LibraryCopy::class, 'book_id');
    }

    public function loans()
    {
        return $this->hasMany(LibraryLoan::class, 'book_id');
    }

    /**
     * Get the category that owns the book
     */
    public function category()
    {
        return $this->belongsTo(LibraryCategory::class, 'category_id');
    }

    /**
     * Get the currency for the book
     */
    public function currency()
    {
        return $this->belongsTo(Currency::class, 'currency_id');
    }

    /**
     * Get the finance account for the book
     */
    public function financeAccount()
    {
        return $this->belongsTo(FinanceAccount::class, 'finance_account_id');
    }
}
