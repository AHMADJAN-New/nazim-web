<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class FacilityMaintenance extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';

    protected $table = 'facility_maintenance';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'facility_id',
        'maintained_at',
        'description',
        'status',
        'cost_amount',
        'currency_id',
        'expense_entry_id',
    ];

    protected function casts(): array
    {
        return [
            'maintained_at' => 'date',
            'cost_amount' => 'decimal:2',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    public function facility()
    {
        return $this->belongsTo(OrgFacility::class, 'facility_id');
    }

    public function currency()
    {
        return $this->belongsTo(Currency::class, 'currency_id');
    }

    public function expenseEntry()
    {
        return $this->belongsTo(ExpenseEntry::class, 'expense_entry_id');
    }
}
