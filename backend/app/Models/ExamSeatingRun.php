<?php

namespace App\Models;

use DomainException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;
use LogicException;

class ExamSeatingRun extends Model
{
    use HasFactory;

    public const STATUS_PENDING = 'pending';

    public const STATUS_RUNNING = 'running';

    public const STATUS_SUCCEEDED = 'succeeded';

    public const STATUS_FAILED = 'failed';

    protected $connection = 'pgsql';

    protected $table = 'exam_seating_runs';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'id',
        'organization_id',
        'school_id',
        'exam_seating_map_id',
        'exam_id',
        'revision',
        'input_checksum',
        'algorithm_version',
        'idempotency_key',
        'status',
        'seed',
        'conflict_count',
        'diagnostics',
        'error_message',
        'started_at',
        'completed_at',
        'failed_at',
    ];

    protected $attributes = [
        'status' => self::STATUS_PENDING,
        'conflict_count' => 0,
    ];

    protected function casts(): array
    {
        return [
            'revision' => 'integer',
            'seed' => 'integer',
            'conflict_count' => 'integer',
            'diagnostics' => 'array',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'failed_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (ExamSeatingRun $run): void {
            if (empty($run->id)) {
                $run->id = (string) Str::uuid();
            }

            $matchesMap = ExamSeatingMap::query()
                ->whereKey($run->exam_seating_map_id)
                ->where('exam_id', $run->exam_id)
                ->where('organization_id', $run->organization_id)
                ->where('school_id', $run->school_id)
                ->exists();

            if (! $matchesMap) {
                throw new DomainException(
                    'The seating run map must belong to the same exam, organization, and school.'
                );
            }
        });

        static::updating(function (): never {
            throw new LogicException('Exam seating runs are immutable after creation.');
        });

        static::deleting(function (): never {
            throw new LogicException('Exam seating runs are immutable and cannot be deleted.');
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

    public function seatingMap(): BelongsTo
    {
        return $this->belongsTo(ExamSeatingMap::class, 'exam_seating_map_id');
    }

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class, 'exam_id');
    }

    public function scopeForOrganization(Builder $query, string $organizationId): Builder
    {
        return $query->where('organization_id', $organizationId);
    }

    public function scopeForSchool(Builder $query, string $schoolId): Builder
    {
        return $query->where('school_id', $schoolId);
    }

    public function scopeForMap(Builder $query, string $mapId): Builder
    {
        return $query->where('exam_seating_map_id', $mapId);
    }

    public function scopeWithStatus(Builder $query, string $status): Builder
    {
        return $query->where('status', $status);
    }
}
