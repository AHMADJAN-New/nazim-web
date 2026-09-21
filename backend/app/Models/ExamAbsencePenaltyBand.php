<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class ExamAbsencePenaltyBand extends Model
{
    use HasFactory;

    protected $connection = 'pgsql';

    protected $table = 'exam_absence_penalty_bands';

    protected $primaryKey = 'id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'organization_id',
        'school_id',
        'min_absences',
        'max_absences',
        'marks_per_absence',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'min_absences' => 'integer',
            'max_absences' => 'integer',
            'marks_per_absence' => 'decimal:2',
            'sort_order' => 'integer',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
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

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(SchoolBranding::class, 'school_id');
    }

    /**
     * Whether absence number N (1-based count position) falls in this band.
     * Bands use inclusive absence counts: min_absences..max_absences (or open-ended).
     */
    public function containsAbsenceNumber(int $absenceNumber): bool
    {
        if ($absenceNumber < $this->min_absences) {
            return false;
        }

        if ($this->max_absences === null) {
            return true;
        }

        return $absenceNumber <= $this->max_absences;
    }
}
