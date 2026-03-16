<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class OrgFacility extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';

    protected $table = 'org_facilities';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'organization_id',
        'facility_type_id',
        'name',
        'address',
        'area_sqm',
        'city',
        'district',
        'landmark',
        'latitude',
        'longitude',
        'finance_account_id',
        'school_id',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'area_sqm' => 'decimal:2',
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
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

    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    public function facilityType()
    {
        return $this->belongsTo(FacilityType::class, 'facility_type_id');
    }

    public function financeAccount()
    {
        return $this->belongsTo(FinanceAccount::class, 'finance_account_id');
    }

    public function school()
    {
        return $this->belongsTo(SchoolBranding::class, 'school_id');
    }

    public function facilityStaff()
    {
        return $this->hasMany(FacilityStaff::class, 'facility_id');
    }

    public function facilityMaintenance()
    {
        return $this->hasMany(FacilityMaintenance::class, 'facility_id');
    }

    public function expenseEntries()
    {
        return $this->hasMany(ExpenseEntry::class, 'facility_id');
    }

    public function incomeEntries()
    {
        return $this->hasMany(IncomeEntry::class, 'facility_id');
    }

    public function facilityDocuments()
    {
        return $this->hasMany(FacilityDocument::class, 'facility_id');
    }

    public function scopeForOrganization($query, string $organizationId)
    {
        return $query->where('organization_id', $organizationId);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
