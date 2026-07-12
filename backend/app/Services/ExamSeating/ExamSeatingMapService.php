<?php

namespace App\Services\ExamSeating;

use App\Models\Exam;
use App\Models\ExamSeatAssignment;
use App\Models\ExamSeatingClassColor;
use App\Models\ExamSeatingMap;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class ExamSeatingMapService
{
    public function __construct(
        private ExamSeatingSolverService $solverService
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function createMap(
        Exam $exam,
        string $organizationId,
        string $schoolId,
        array $data
    ): ExamSeatingMap {
        $this->assertExamMutable($exam);

        $rows = (int) $data['rows'];
        $columns = (int) $data['columns'];
        $startSeatNumber = (int) ($data['start_seat_number'] ?? 1);

        $this->assertSeatRangeAvailable(
            $exam->id,
            $organizationId,
            $schoolId,
            $startSeatNumber,
            $rows,
            $columns
        );

        return DB::transaction(function () use ($exam, $organizationId, $schoolId, $data, $rows, $columns, $startSeatNumber): ExamSeatingMap {
            $map = ExamSeatingMap::create([
                'organization_id' => $organizationId,
                'school_id' => $schoolId,
                'exam_id' => $exam->id,
                'room_id' => $data['room_id'] ?? null,
                'name' => $data['name'],
                'rows' => $rows,
                'columns' => $columns,
                'start_seat_number' => $startSeatNumber,
            ]);

            $this->createEmptyGrid($map);
            $this->refreshInputChecksum($map);

            return $map->fresh(['assignments', 'classColors']);
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function updateMap(ExamSeatingMap $map, Exam $exam, array $data): ExamSeatingMap
    {
        $this->assertExamMutable($exam);
        $this->assertEditable($map);

        $rows = (int) ($data['rows'] ?? $map->rows);
        $columns = (int) ($data['columns'] ?? $map->columns);
        $startSeatNumber = (int) ($data['start_seat_number'] ?? $map->start_seat_number);
        $dimensionsChanged = $rows !== $map->rows
            || $columns !== $map->columns
            || $startSeatNumber !== $map->start_seat_number;

        if ($dimensionsChanged) {
            $this->assertSeatRangeAvailable(
                $exam->id,
                $map->organization_id,
                $map->school_id,
                $startSeatNumber,
                $rows,
                $columns,
                $map->id
            );
        }

        return DB::transaction(function () use ($map, $data, $rows, $columns, $startSeatNumber, $dimensionsChanged): ExamSeatingMap {
            $map->fill([
                'name' => $data['name'] ?? $map->name,
                'room_id' => array_key_exists('room_id', $data) ? $data['room_id'] : $map->room_id,
                'rows' => $rows,
                'columns' => $columns,
                'start_seat_number' => $startSeatNumber,
            ]);
            $map->save();

            if ($dimensionsChanged) {
                ExamSeatAssignment::query()
                    ->where('exam_seating_map_id', $map->id)
                    ->whereNull('deleted_at')
                    ->get()
                    ->each->delete();

                $this->createEmptyGrid($map->fresh());
                $map->revision = $map->revision + 1;
                $map->solver_status = ExamSeatingMap::SOLVER_NOT_RUN;
                $map->solver_diagnostics = null;
                $map->save();
            }

            $this->refreshInputChecksum($map);

            return $map->fresh(['assignments', 'classColors']);
        });
    }

    public function deleteMap(ExamSeatingMap $map, Exam $exam): void
    {
        $this->assertExamMutable($exam);
        $this->assertEditable($map);

        DB::transaction(function () use ($map): void {
            $map->assignments()->delete();
            $map->classColors()->delete();
            $map->delete();
        });
    }

    /**
     * @param  array<int, array<string, mixed>>  $assignments
     */
    public function syncAssignments(
        ExamSeatingMap $map,
        Exam $exam,
        array $assignments,
        string $userId
    ): ExamSeatingMap {
        $this->assertExamMutable($exam);
        $this->assertEditable($map);

        return DB::transaction(function () use ($map, $assignments, $userId): ExamSeatingMap {
            $cells = ExamSeatAssignment::query()
                ->where('exam_seating_map_id', $map->id)
                ->whereNull('deleted_at')
                ->get()
                ->keyBy(fn (ExamSeatAssignment $assignment): string => "{$assignment->row_number}:{$assignment->column_number}");

            foreach ($assignments as $item) {
                $key = "{$item['row_number']}:{$item['column_number']}";
                /** @var ExamSeatAssignment|null $cell */
                $cell = $cells->get($key);

                if (! $cell) {
                    throw new RuntimeException("Seat at row {$item['row_number']} column {$item['column_number']} does not exist on this map");
                }

                if ($cell->is_locked) {
                    continue;
                }

                $examStudentId = $item['exam_student_id'] ?? null;
                $isDisabled = array_key_exists('is_disabled', $item)
                    ? (bool) $item['is_disabled']
                    : $examStudentId === null;

                if ($isDisabled) {
                    $cell->exam_student_id = null;
                    $cell->is_disabled = true;
                } else {
                    if ($examStudentId === null) {
                        throw new RuntimeException('Assigned seats must include an exam_student_id');
                    }

                    $cell->exam_student_id = $examStudentId;
                    $cell->is_disabled = false;
                }

                if (! empty($item['is_locked'])) {
                    $cell->is_locked = true;
                    $cell->locked_at = now();
                    $cell->locked_by = $userId;
                }

                $cell->save();
            }

            $map->revision = $map->revision + 1;
            $map->solver_status = ExamSeatingMap::SOLVER_NOT_RUN;
            $map->solver_diagnostics = null;
            $map->save();

            $this->refreshInputChecksum($map);

            return $map->fresh(['assignments', 'classColors']);
        });
    }

    /**
     * @param  array<int, array<string, mixed>>  $colors
     */
    public function syncClassColors(ExamSeatingMap $map, Exam $exam, array $colors): ExamSeatingMap
    {
        $this->assertExamMutable($exam);
        $this->assertEditable($map);

        return DB::transaction(function () use ($map, $colors): ExamSeatingMap {
            ExamSeatingClassColor::query()
                ->where('exam_seating_map_id', $map->id)
                ->whereNull('deleted_at')
                ->get()
                ->each->delete();

            foreach ($colors as $color) {
                ExamSeatingClassColor::create([
                    'organization_id' => $map->organization_id,
                    'school_id' => $map->school_id,
                    'exam_seating_map_id' => $map->id,
                    'exam_class_id' => $color['exam_class_id'],
                    'color_hex' => strtoupper($color['color_hex']),
                ]);
            }

            return $map->fresh(['assignments', 'classColors']);
        });
    }

    public function validateRevisionChecksum(ExamSeatingMap $map, int $revision, string $checksum): void
    {
        if ($map->revision !== $revision) {
            throw new RuntimeException('Map revision is stale. Reload the map and try again.');
        }

        $currentChecksum = $this->solverService->buildSolverInput($map)['checksum'];

        if (! hash_equals($currentChecksum, trim($checksum))) {
            throw new RuntimeException('Map input checksum is stale. Reload the map and try again.');
        }
    }

    /**
     * @param  array<string, mixed>  $solverResult
     */
    public function applySolverResults(
        ExamSeatingMap $map,
        int $revision,
        string $checksum,
        array $solverResult,
        string $userId
    ): ExamSeatingMap {
        $map->refresh();
        $this->validateRevisionChecksum($map, $revision, $checksum);

        if (! in_array($solverResult['status'] ?? '', ['optimal', 'feasible'], true)) {
            throw new RuntimeException('Solver did not return a usable assignment');
        }

        return DB::transaction(function () use ($map, $solverResult, $userId): ExamSeatingMap {
            $cells = ExamSeatAssignment::query()
                ->where('exam_seating_map_id', $map->id)
                ->whereNull('deleted_at')
                ->get()
                ->keyBy(fn (ExamSeatAssignment $assignment): string => "{$assignment->row_number}:{$assignment->column_number}");

            foreach ($cells as $cell) {
                if ($cell->is_locked) {
                    continue;
                }

                if ($cell->exam_student_id === null && $cell->is_disabled) {
                    continue;
                }

                $cell->exam_student_id = null;
                $cell->is_disabled = true;
                $cell->save();
            }

            foreach ($solverResult['assignments'] as $item) {
                $row = ((int) $item['row']) + 1;
                $col = ((int) $item['col']) + 1;
                $key = "{$row}:{$col}";
                /** @var ExamSeatAssignment|null $cell */
                $cell = $cells->get($key);

                if (! $cell || $cell->is_locked) {
                    continue;
                }

                $cell->exam_student_id = $item['exam_student_id'];
                $cell->is_disabled = false;
                $cell->save();
            }

            $map->status = ExamSeatingMap::STATUS_GENERATED;
            $map->solver_status = ExamSeatingMap::SOLVER_SUCCEEDED;
            $map->solver_diagnostics = [
                'status' => $solverResult['status'],
                'mode_used' => $solverResult['mode_used'] ?? null,
                'conflicts_count' => $solverResult['conflicts_count'] ?? 0,
                'conflict_pairs' => $solverResult['conflict_pairs'] ?? [],
            ];
            $map->applied_at = now();
            $map->applied_by = $userId;
            $map->save();

            $this->refreshInputChecksum($map);

            return $map->fresh(['assignments', 'classColors']);
        });
    }

    public function finalizeMap(ExamSeatingMap $map, Exam $exam, string $userId): ExamSeatingMap
    {
        $this->assertExamMutable($exam);

        if ($map->status === ExamSeatingMap::STATUS_FINALIZED) {
            throw new RuntimeException('Map is already finalized');
        }

        $map->status = ExamSeatingMap::STATUS_FINALIZED;
        $map->finalized_at = now();
        $map->finalized_by = $userId;
        $map->save();

        return $map->fresh(['assignments', 'classColors']);
    }

    public function duplicateMap(ExamSeatingMap $map, Exam $exam, ?string $name = null): ExamSeatingMap
    {
        $this->assertExamMutable($exam);

        $map->loadMissing(['assignments', 'classColors']);

        $startSeatNumber = $this->nextAvailableStartSeatNumber(
            $exam->id,
            $map->organization_id,
            $map->school_id,
            $map->rows,
            $map->columns
        );

        return DB::transaction(function () use ($map, $name, $startSeatNumber): ExamSeatingMap {
            $duplicate = ExamSeatingMap::create([
                'organization_id' => $map->organization_id,
                'school_id' => $map->school_id,
                'exam_id' => $map->exam_id,
                'room_id' => $map->room_id,
                'name' => $name ?? "{$map->name} (copy)",
                'rows' => $map->rows,
                'columns' => $map->columns,
                'start_seat_number' => $startSeatNumber,
                'status' => ExamSeatingMap::STATUS_DRAFT,
                'revision' => 1,
            ]);

            $seatNumber = $startSeatNumber;

            foreach ($map->assignments->sortBy([
                ['row_number', 'asc'],
                ['column_number', 'asc'],
            ]) as $assignment) {
                ExamSeatAssignment::create([
                    'organization_id' => $map->organization_id,
                    'school_id' => $map->school_id,
                    'exam_seating_map_id' => $duplicate->id,
                    'exam_id' => $map->exam_id,
                    'exam_student_id' => $assignment->exam_student_id,
                    'row_number' => $assignment->row_number,
                    'column_number' => $assignment->column_number,
                    'seat_number' => $seatNumber,
                    'is_locked' => $assignment->is_locked,
                    'is_disabled' => $assignment->is_disabled,
                    'locked_at' => $assignment->locked_at,
                    'locked_by' => $assignment->locked_by,
                ]);

                $seatNumber++;
            }

            foreach ($map->classColors as $color) {
                ExamSeatingClassColor::create([
                    'organization_id' => $map->organization_id,
                    'school_id' => $map->school_id,
                    'exam_seating_map_id' => $duplicate->id,
                    'exam_class_id' => $color->exam_class_id,
                    'color_hex' => $color->color_hex,
                ]);
            }

            $this->refreshInputChecksum($duplicate);

            return $duplicate->fresh(['assignments', 'classColors']);
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function buildReportData(ExamSeatingMap $map): array
    {
        $map->loadMissing([
            'room',
            'assignments.examStudent.studentAdmission.student',
            'assignments.examStudent.examClass.classAcademicYear.class',
            'classColors.examClass.classAcademicYear.class',
        ]);

        $assignments = $map->assignments
            ->sortBy([
                ['seat_number', 'asc'],
                ['row_number', 'asc'],
                ['column_number', 'asc'],
            ])
            ->values();

        $assignmentRows = $assignments->map(function (ExamSeatAssignment $assignment): array {
            $examStudent = $assignment->examStudent;

            return [
                'id' => $assignment->id,
                'row_number' => $assignment->row_number,
                'column_number' => $assignment->column_number,
                'seat_number' => $assignment->seat_number,
                'is_locked' => $assignment->is_locked,
                'is_disabled' => $assignment->is_disabled,
                'exam_student_id' => $assignment->exam_student_id,
                'student_name' => $examStudent?->studentAdmission?->student?->full_name,
                'class_name' => $examStudent?->examClass?->classAcademicYear?->class?->name,
                'exam_roll_number' => $examStudent?->exam_roll_number,
            ];
        })->all();

        $columns = [
            ['key' => 'seat_number', 'label' => 'Seat #'],
            ['key' => 'row_number', 'label' => 'Row'],
            ['key' => 'column_number', 'label' => 'Column'],
            ['key' => 'student_name', 'label' => 'Student'],
            ['key' => 'class_name', 'label' => 'Class'],
            ['key' => 'exam_roll_number', 'label' => 'Roll #'],
        ];

        $rows = collect($assignmentRows)
            ->filter(fn (array $row): bool => ! ($row['is_disabled'] ?? false) && ! empty($row['exam_student_id']))
            ->map(fn (array $row): array => [
                'seat_number' => $row['seat_number'],
                'row_number' => $row['row_number'],
                'column_number' => $row['column_number'],
                'student_name' => $row['student_name'],
                'class_name' => $row['class_name'],
                'exam_roll_number' => $row['exam_roll_number'],
            ])
            ->values()
            ->all();

        $classColors = $map->classColors
            ->map(fn (ExamSeatingClassColor $color): array => [
                'exam_class_id' => $color->exam_class_id,
                'color_hex' => $color->color_hex,
                'class_name' => $color->examClass?->classAcademicYear?->class?->name,
            ])
            ->values()
            ->all();

        return [
            'map' => $this->serializeMap($map),
            'assignments' => $assignmentRows,
            'class_colors' => $classColors,
            'columns' => $columns,
            'rows' => $rows,
            'filters' => [
                'map_name' => $map->name,
                'room' => $map->room?->room_number,
                'start_seat_number' => (string) $map->start_seat_number,
                'seat_range_end' => (string) $map->seatRangeEnd(),
            ],
            'grid' => [
                'rows' => $map->rows,
                'columns' => $map->columns,
                'cells' => $assignments->map(fn (ExamSeatAssignment $assignment): array => [
                    'row_number' => $assignment->row_number,
                    'column_number' => $assignment->column_number,
                    'seat_number' => $assignment->seat_number,
                    'is_disabled' => $assignment->is_disabled,
                    'is_locked' => $assignment->is_locked,
                    'student_name' => $assignment->examStudent?->studentAdmission?->student?->full_name,
                    'class_name' => $assignment->examStudent?->examClass?->classAcademicYear?->class?->name,
                    'exam_class_id' => $assignment->examStudent?->exam_class_id,
                    'exam_roll_number' => $assignment->examStudent?->exam_roll_number,
                    'color_hex' => $map->classColors
                        ->firstWhere('exam_class_id', $assignment->examStudent?->exam_class_id)
                        ?->color_hex,
                ])->values()->all(),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function serializeMap(ExamSeatingMap $map): array
    {
        $map->loadMissing(['assignments', 'classColors', 'room']);

        return [
            'id' => $map->id,
            'organization_id' => $map->organization_id,
            'school_id' => $map->school_id,
            'exam_id' => $map->exam_id,
            'room_id' => $map->room_id,
            'room_number' => $map->room?->room_number,
            'name' => $map->name,
            'rows' => $map->rows,
            'columns' => $map->columns,
            'start_seat_number' => $map->start_seat_number,
            'seat_range_end' => $map->seatRangeEnd(),
            'status' => $map->status,
            'revision' => $map->revision,
            'input_checksum' => $map->input_checksum ? trim($map->input_checksum) : null,
            'solver_status' => $map->solver_status,
            'solver_diagnostics' => $map->solver_diagnostics,
            'applied_at' => $map->applied_at?->toIso8601String(),
            'applied_by' => $map->applied_by,
            'finalized_at' => $map->finalized_at?->toIso8601String(),
            'finalized_by' => $map->finalized_by,
            'is_editable' => $map->isEditable(),
            'assignments' => $map->assignments
                ->sortBy([
                    ['row_number', 'asc'],
                    ['column_number', 'asc'],
                ])
                ->map(fn (ExamSeatAssignment $assignment): array => [
                    'id' => $assignment->id,
                    'row_number' => $assignment->row_number,
                    'column_number' => $assignment->column_number,
                    'seat_number' => $assignment->seat_number,
                    'exam_student_id' => $assignment->exam_student_id,
                    'is_locked' => $assignment->is_locked,
                    'is_disabled' => $assignment->is_disabled,
                    'locked_at' => $assignment->locked_at?->toIso8601String(),
                    'locked_by' => $assignment->locked_by,
                ])
                ->values()
                ->all(),
            'class_colors' => $map->classColors
                ->map(fn (ExamSeatingClassColor $color): array => [
                    'id' => $color->id,
                    'exam_class_id' => $color->exam_class_id,
                    'color_hex' => $color->color_hex,
                ])
                ->values()
                ->all(),
            'created_at' => $map->created_at?->toIso8601String(),
            'updated_at' => $map->updated_at?->toIso8601String(),
        ];
    }

    public function refreshInputChecksum(ExamSeatingMap $map): void
    {
        $map->refresh();
        $map->loadMissing(['assignments']);

        $checksum = $this->solverService->buildSolverInput($map)['checksum'];
        $map->input_checksum = $checksum;
        $map->save();
    }

    public function assertEditable(ExamSeatingMap $map): void
    {
        if ($map->isLockedForEditing()) {
            throw new RuntimeException('This seating map is finalized or applied and cannot be edited');
        }
    }

    public function assertExamMutable(Exam $exam): void
    {
        if ($exam->isConfigurationLocked()) {
            throw new RuntimeException('Cannot modify seating maps for a completed or archived exam');
        }
    }

    public function assertSeatRangeAvailable(
        string $examId,
        string $organizationId,
        string $schoolId,
        int $startSeatNumber,
        int $rows,
        int $columns,
        ?string $excludeMapId = null
    ): void {
        $newEnd = $startSeatNumber + ($rows * $columns) - 1;

        $query = ExamSeatingMap::query()
            ->where('exam_id', $examId)
            ->where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->whereNull('deleted_at');

        if ($excludeMapId !== null) {
            $query->where('id', '!=', $excludeMapId);
        }

        /** @var Collection<int, ExamSeatingMap> $existingMaps */
        $existingMaps = $query->get();

        foreach ($existingMaps as $existing) {
            $existingStart = $existing->start_seat_number;
            $existingEnd = $existing->seatRangeEnd();

            $overlaps = ! ($newEnd < $existingStart || $startSeatNumber > $existingEnd);

            if ($overlaps) {
                throw new RuntimeException(
                    "Seat range {$startSeatNumber}-{$newEnd} overlaps map \"{$existing->name}\" ({$existingStart}-{$existingEnd})"
                );
            }
        }
    }

    private function createEmptyGrid(ExamSeatingMap $map): void
    {
        $seatNumber = $map->start_seat_number;

        for ($row = 1; $row <= $map->rows; $row++) {
            for ($column = 1; $column <= $map->columns; $column++) {
                ExamSeatAssignment::create([
                    'organization_id' => $map->organization_id,
                    'school_id' => $map->school_id,
                    'exam_seating_map_id' => $map->id,
                    'exam_id' => $map->exam_id,
                    'row_number' => $row,
                    'column_number' => $column,
                    'seat_number' => $seatNumber,
                    'is_disabled' => true,
                    'exam_student_id' => null,
                ]);

                $seatNumber++;
            }
        }
    }

    private function nextAvailableStartSeatNumber(
        string $examId,
        string $organizationId,
        string $schoolId,
        int $rows,
        int $columns
    ): int {
        $maps = ExamSeatingMap::query()
            ->where('exam_id', $examId)
            ->where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->whereNull('deleted_at')
            ->get();

        if ($maps->isEmpty()) {
            return 1;
        }

        return $maps->max(fn (ExamSeatingMap $map): int => $map->seatRangeEnd()) + 1;
    }
}
