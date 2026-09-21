<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class ExamAbsencePenaltySetting extends Model
{
    use HasFactory;

    protected $connection = 'pgsql';

    protected $table = 'exam_absence_penalty_settings';

    protected $primaryKey = 'id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'organization_id',
        'school_id',
        'is_enabled',
    ];

    protected function casts(): array
    {
        return [
            'is_enabled' => 'boolean',
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

    public function bands(): HasMany
    {
        return $this->hasMany(ExamAbsencePenaltyBand::class, 'school_id', 'school_id')
            ->orderBy('sort_order');
    }

    /**
     * @return \Illuminate\Database\Eloquent\Collection<int, ExamAbsencePenaltyBand>
     */
    public function bandsForSchool()
    {
        return ExamAbsencePenaltyBand::query()
            ->where('organization_id', $this->organization_id)
            ->where('school_id', $this->school_id)
            ->orderBy('sort_order')
            ->orderBy('min_absences')
            ->get();
    }
}
