<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Donor extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'donors';

    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'organization_id',
        'name',
        'phone',
        'email',
        'address',
        'type',
        'contact_person',
        'notes',
        'total_donated',
        'is_active',
    ];

    protected $casts = [
        'total_donated' => 'decimal:2',
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
     * Get the organization that owns the donor
     */
    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    /**
     * Get all income entries from this donor
     */
    public function incomeEntries()
    {
        return $this->hasMany(IncomeEntry::class, 'donor_id');
    }

    /**
     * Scope to filter by organization
     */
    public function scopeForOrganization($query, $organizationId)
    {
        return $query->where('organization_id', $organizationId);
    }

    /**
     * Scope to filter active donors
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to filter by type
     */
    public function scopeType($query, $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Recalculate total donated
     */
    public function recalculateTotalDonated()
    {
        $this->total_donated = $this->incomeEntries()->whereNull('deleted_at')->sum('amount');
        $this->save();
        
        return $this->total_donated;
    }

    /**
     * Get donations for a specific period
     */
    public function getDonationsForPeriod($startDate, $endDate)
    {
        return $this->incomeEntries()
            ->whereNull('deleted_at')
            ->whereBetween('date', [$startDate, $endDate])
            ->sum('amount');
    }
}
