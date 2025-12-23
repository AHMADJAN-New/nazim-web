<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class Asset extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'assets';
    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $connection = 'pgsql';

    protected $fillable = [
        'id',
        'organization_id',
        'currency_id',
        'finance_account_id',
        'school_id',
        'building_id',
        'room_id',
        'name',
        'asset_tag',
        'category',
        'category_id',
        'serial_number',
        'purchase_date',
        'purchase_price',
        'total_copies',
        'status',
        'condition',
        'vendor',
        'warranty_expiry',
        'location_notes',
        'notes',
    ];

    protected $casts = [
        'purchase_date' => 'date',
        'purchase_price' => 'decimal:2',
        'warranty_expiry' => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });

        // Update finance account balance when asset is created
        static::created(function ($model) {
            DB::transaction(function () use ($model) {
                $model->updateRelatedBalances();
            });
        });

        // Update finance account balance when asset is updated
        // Check if any balance-affecting fields changed
        static::updated(function ($model) {
            // Only recalculate if fields that affect balance changed
            $balanceAffectingFields = ['finance_account_id', 'purchase_price', 'total_copies', 'status', 'currency_id'];
            $hasRelevantChange = false;
            
            foreach ($balanceAffectingFields as $field) {
                if ($model->wasChanged($field)) {
                    $hasRelevantChange = true;
                    break;
                }
            }
            
            if ($hasRelevantChange) {
                DB::transaction(function () use ($model) {
                    $model->updateRelatedBalances();
                });
            }
        });

        // Update finance account balance when asset is deleted
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

        // Update finance account balance if asset is linked to an account
        if ($this->financeAccount) {
            $this->financeAccount->recalculateBalance();
        }

        // Also update if finance_account_id changed (check original value)
        if ($this->wasChanged('finance_account_id')) {
            $originalAccountId = $this->getOriginal('finance_account_id');
            if ($originalAccountId && $originalAccountId !== $this->finance_account_id) {
                // Asset was moved to a different account, update old account too
                $oldAccount = FinanceAccount::find($originalAccountId);
                if ($oldAccount) {
                    $oldAccount->recalculateBalance();
                }
            }
        }
    }

    public function assignments()
    {
        return $this->hasMany(AssetAssignment::class);
    }

    public function activeAssignment()
    {
        return $this->hasOne(AssetAssignment::class)->where('status', 'active')->latest('assigned_on');
    }

    public function maintenanceRecords()
    {
        return $this->hasMany(AssetMaintenanceRecord::class);
    }

    public function history()
    {
        return $this->hasMany(AssetHistory::class);
    }

    public function building()
    {
        return $this->belongsTo(Building::class);
    }

    public function room()
    {
        return $this->belongsTo(Room::class);
    }

    public function category()
    {
        return $this->belongsTo(AssetCategory::class, 'category_id');
    }

    public function school()
    {
        return $this->belongsTo(SchoolBranding::class, 'school_id');
    }

    public function copies()
    {
        return $this->hasMany(AssetCopy::class, 'asset_id');
    }

    public function currency()
    {
        return $this->belongsTo(Currency::class, 'currency_id');
    }

    public function financeAccount()
    {
        return $this->belongsTo(FinanceAccount::class, 'finance_account_id');
    }
}
