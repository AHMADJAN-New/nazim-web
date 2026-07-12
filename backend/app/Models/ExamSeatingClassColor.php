<?php

namespace App\Models;

use DomainException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class ExamSeatingClassColor extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';

    protected $table = 'exam_seating_class_colors';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'id',
        'organization_id',
        'school_id',
        'exam_seating_map_id',
        'exam_class_id',
        'color_hex',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (ExamSeatingClassColor $color): void {
            if (empty($color->id)) {
                $color->id = (string) Str::uuid();
            }
        });

        static::saving(function (ExamSeatingClassColor $color): void {
            $mapExamId = ExamSeatingMap::query()
                ->whereKey($color->exam_seating_map_id)
                ->where('organization_id', $color->organization_id)
                ->where('school_id', $color->school_id)
                ->value('exam_id');
            $classExamId = ExamClass::query()
                ->whereKey($color->exam_class_id)
                ->where('organization_id', $color->organization_id)
                ->where('school_id', $color->school_id)
                ->value('exam_id');

            if ($mapExamId === null || $classExamId === null || $mapExamId !== $classExamId) {
                throw new DomainException(
                    'The seating map and exam class must belong to the same exam and tenant.'
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

    public function examClass(): BelongsTo
    {
        return $this->belongsTo(ExamClass::class, 'exam_class_id');
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
}
