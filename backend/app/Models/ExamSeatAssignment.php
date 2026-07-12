<?php

namespace App\Models;

use DomainException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class ExamSeatAssignment extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';

    protected $table = 'exam_seat_assignments';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'id',
        'organization_id',
        'school_id',
        'exam_seating_map_id',
        'exam_id',
        'exam_student_id',
        'row_number',
        'column_number',
        'seat_number',
        'is_locked',
        'is_disabled',
        'locked_at',
        'locked_by',
    ];

    protected $attributes = [
        'is_locked' => false,
        'is_disabled' => false,
    ];

    protected function casts(): array
    {
        return [
            'row_number' => 'integer',
            'column_number' => 'integer',
            'seat_number' => 'integer',
            'is_locked' => 'boolean',
            'is_disabled' => 'boolean',
            'locked_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (ExamSeatAssignment $assignment): void {
            if (empty($assignment->id)) {
                $assignment->id = (string) Str::uuid();
            }
        });

        static::saving(function (ExamSeatAssignment $assignment): void {
            $matchesMap = ExamSeatingMap::query()
                ->whereKey($assignment->exam_seating_map_id)
                ->where('exam_id', $assignment->exam_id)
                ->where('organization_id', $assignment->organization_id)
                ->where('school_id', $assignment->school_id)
                ->exists();

            if (! $matchesMap) {
                throw new DomainException(
                    'The seat assignment map must belong to the same exam, organization, and school.'
                );
            }

            if ($assignment->exam_student_id === null) {
                return;
            }

            $matchesStudent = ExamStudent::query()
                ->whereKey($assignment->exam_student_id)
                ->where('exam_id', $assignment->exam_id)
                ->where('organization_id', $assignment->organization_id)
                ->where('school_id', $assignment->school_id)
                ->exists();

            if (! $matchesStudent) {
                throw new DomainException(
                    'The assigned student must belong to the same exam, organization, and school.'
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

    public function seatingMap(): BelongsTo
    {
        return $this->belongsTo(ExamSeatingMap::class, 'exam_seating_map_id');
    }

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class, 'exam_id');
    }

    public function examStudent(): BelongsTo
    {
        return $this->belongsTo(ExamStudent::class, 'exam_student_id');
    }

    public function lockedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'locked_by');
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

    public function scopeForMap(Builder $query, string $mapId): Builder
    {
        return $query->where('exam_seating_map_id', $mapId);
    }

    public function scopeLocked(Builder $query): Builder
    {
        return $query->where('is_locked', true);
    }

    public function scopeDisabled(Builder $query): Builder
    {
        return $query->where('is_disabled', true);
    }
}
