<?php

namespace App\Models;

use DomainException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class ExamSeatingMap extends Model
{
    use HasFactory, SoftDeletes;

    public const STATUS_DRAFT = 'draft';

    public const STATUS_GENERATED = 'generated';

    public const STATUS_APPLIED = 'applied';

    public const STATUS_FINALIZED = 'finalized';

    public const SOLVER_NOT_RUN = 'not_run';

    public const SOLVER_PENDING = 'pending';

    public const SOLVER_RUNNING = 'running';

    public const SOLVER_SUCCEEDED = 'succeeded';

    public const SOLVER_FAILED = 'failed';

    protected $connection = 'pgsql';

    protected $table = 'exam_seating_maps';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'id',
        'organization_id',
        'school_id',
        'exam_id',
        'room_id',
        'name',
        'rows',
        'columns',
        'start_seat_number',
        'status',
        'revision',
        'input_checksum',
        'solver_status',
        'solver_diagnostics',
        'applied_at',
        'applied_by',
        'finalized_at',
        'finalized_by',
    ];

    protected $attributes = [
        'start_seat_number' => 1,
        'status' => self::STATUS_DRAFT,
        'revision' => 1,
        'solver_status' => self::SOLVER_NOT_RUN,
    ];

    protected function casts(): array
    {
        return [
            'rows' => 'integer',
            'columns' => 'integer',
            'start_seat_number' => 'integer',
            'revision' => 'integer',
            'solver_diagnostics' => 'array',
            'applied_at' => 'datetime',
            'finalized_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (ExamSeatingMap $map): void {
            if (empty($map->id)) {
                $map->id = (string) Str::uuid();
            }
        });

        static::saving(function (ExamSeatingMap $map): void {
            $matchesTenantExam = Exam::query()
                ->whereKey($map->exam_id)
                ->where('organization_id', $map->organization_id)
                ->where('school_id', $map->school_id)
                ->exists();

            if (! $matchesTenantExam) {
                throw new DomainException(
                    'The seating map exam must belong to the same organization and school.'
                );
            }

            if ($map->room_id === null) {
                return;
            }

            $matchesRoom = Room::query()
                ->whereKey($map->room_id)
                ->where('school_id', $map->school_id)
                ->exists();

            if (! $matchesRoom) {
                throw new DomainException(
                    'The seating map room must belong to the same school.'
                );
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

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class, 'exam_id');
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class, 'room_id');
    }

    public function appliedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'applied_by');
    }

    public function finalizedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'finalized_by');
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(ExamSeatAssignment::class, 'exam_seating_map_id');
    }

    public function classColors(): HasMany
    {
        return $this->hasMany(ExamSeatingClassColor::class, 'exam_seating_map_id');
    }

    public function mapClasses(): HasMany
    {
        return $this->hasMany(ExamSeatingMapClass::class, 'exam_seating_map_id');
    }

    public function runs(): HasMany
    {
        return $this->hasMany(ExamSeatingRun::class, 'exam_seating_map_id');
    }

    /**
     * @return list<string>
     */
    public function examClassIds(): array
    {
        return $this->mapClasses()
            ->whereNull('deleted_at')
            ->pluck('exam_class_id')
            ->map(fn ($id): string => (string) $id)
            ->values()
            ->all();
    }

    public function scopeForOrganization(Builder $query, string $organizationId): Builder
    {
        return $query->where('organization_id', $organizationId);
    }

    public function scopeForSchool(Builder $query, string $schoolId): Builder
    {
        return $query->where('school_id', $schoolId);
    }

    public function scopeForExam(Builder $query, string $examId): Builder
    {
        return $query->where('exam_id', $examId);
    }

    public function scopeWithStatus(Builder $query, string $status): Builder
    {
        return $query->where('status', $status);
    }

    public function seatRangeEnd(): int
    {
        return $this->start_seat_number + ($this->rows * $this->columns) - 1;
    }

    public function isLockedForEditing(): bool
    {
        return in_array($this->status, [self::STATUS_FINALIZED, self::STATUS_APPLIED], true);
    }

    public function isEditable(): bool
    {
        return ! $this->isLockedForEditing();
    }
}
