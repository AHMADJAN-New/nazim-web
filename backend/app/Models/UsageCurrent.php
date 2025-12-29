<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class UsageCurrent extends Model
{
    use HasFactory;

    protected $connection = 'pgsql';
    protected $table = 'usage_current';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'organization_id',
        'resource_key',
        'current_count',
        'period_start',
        'period_end',
        'last_warning_sent_at',
        'last_calculated_at',
    ];

    protected $casts = [
        'current_count' => 'integer',
        'period_start' => 'datetime',
        'period_end' => 'datetime',
        'last_warning_sent_at' => 'datetime',
        'last_calculated_at' => 'datetime',
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

    /**
     * Increment the count (custom method to avoid conflict with Model::increment)
     */
    public function incrementCount(int $amount = 1): void
    {
        $this->current_count += $amount;
        $this->save();
    }

    /**
     * Decrement the count (custom method to avoid conflict with Model::decrement)
     */
    public function decrementCount(int $amount = 1): void
    {
        $this->current_count = max(0, $this->current_count - $amount);
        $this->save();
    }

    /**
     * Reset the count to zero
     */
    public function resetCount(): void
    {
        $this->current_count = 0;
        $this->save();
    }

    /**
     * Set the count to a specific value
     */
    public function setCount(int $count): void
    {
        $this->current_count = max(0, $count);
        $this->last_calculated_at = now();
        $this->save();
    }

    /**
     * Check if period needs reset
     */
    public function needsPeriodReset(): bool
    {
        if (!$this->period_end) {
            return false;
        }

        return $this->period_end->isPast();
    }

    /**
     * Get the organization
     */
    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    /**
     * Get the limit definition
     */
    public function definition()
    {
        return $this->belongsTo(LimitDefinition::class, 'resource_key', 'resource_key');
    }
}
