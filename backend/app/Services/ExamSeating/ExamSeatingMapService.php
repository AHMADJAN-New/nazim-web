<?php

namespace App\Services\ExamSeating;

use App\Models\Exam;
use App\Models\ExamClass;
use App\Models\ExamSeatAssignment;
use App\Models\ExamSeatingClassColor;
use App\Models\ExamSeatingMap;
use App\Models\ExamSeatingMapClass;
use App\Models\ExamSeatingRun;
use App\Models\ExamStudent;
use App\Models\Student;
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

        $examClassIds = $this->normalizeExamClassIds($data['exam_class_ids'] ?? []);
        $this->assertExamClassesBelongToExam($exam, $organizationId, $schoolId, $examClassIds);

        return DB::transaction(function () use ($exam, $organizationId, $schoolId, $data, $rows, $columns, $startSeatNumber, $examClassIds): ExamSeatingMap {
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
            $this->replaceMapClasses($map, $examClassIds);
            $this->refreshInputChecksum($map);

            return $map->fresh(['assignments', 'classColors', 'mapClasses']);
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

        DB::transaction(function () use ($map): void {
            $map->assignments()->delete();
            $map->classColors()->delete();
            $map->mapClasses()->delete();
            $map->delete();
        });
    }

    /**
     * Replace the map's allowed exam classes. Seats for removed classes are cleared.
     *
     * @param  list<string>  $examClassIds
     */
    public function syncMapClasses(ExamSeatingMap $map, Exam $exam, array $examClassIds): ExamSeatingMap
    {
        $this->assertExamMutable($exam);
        $this->assertEditable($map);

        $examClassIds = $this->normalizeExamClassIds($examClassIds);
        $this->assertExamClassesBelongToExam(
            $exam,
            $map->organization_id,
            $map->school_id,
            $examClassIds
        );

        return DB::transaction(function () use ($map, $examClassIds): ExamSeatingMap {
            $previousIds = $map->examClassIds();
            $removedIds = array_values(array_diff($previousIds, $examClassIds));

            if ($removedIds !== []) {
                $this->clearSeatsForExamClasses($map, $removedIds);
                ExamSeatingClassColor::query()
                    ->where('exam_seating_map_id', $map->id)
                    ->whereNull('deleted_at')
                    ->whereIn('exam_class_id', $removedIds)
                    ->get()
                    ->each->delete();
            }

            $this->replaceMapClasses($map, $examClassIds);

            $map->revision = $map->revision + 1;
            $map->solver_status = ExamSeatingMap::SOLVER_NOT_RUN;
            $map->solver_diagnostics = null;
            $map->save();

            $this->refreshInputChecksum($map);

            return $map->fresh(['assignments', 'classColors', 'mapClasses']);
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

                if ($examStudentId !== null) {
                    $cell->exam_student_id = $examStudentId;
                    $cell->is_disabled = false;
                } else {
                    $cell->exam_student_id = null;
                    $cell->is_disabled = array_key_exists('is_disabled', $item)
                        ? (bool) $item['is_disabled']
                        : true;
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

        $allowedClassIds = $map->examClassIds();
        if ($allowedClassIds === []) {
            throw new RuntimeException('Map has no classes assigned. Select classes for this map first.');
        }

        foreach ($colors as $color) {
            $examClassId = (string) ($color['exam_class_id'] ?? '');
            if ($examClassId === '' || ! in_array($examClassId, $allowedClassIds, true)) {
                throw new RuntimeException('Class colors may only include classes assigned to this map');
            }
        }

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

            return $map->fresh(['assignments', 'classColors', 'mapClasses']);
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
     * Checksum of this map's seat grid + who sits where.
     * Used for Apply Roll Numbers so applying/finalizing another map
     * (which changes the solver "available students" set) does not
     * invalidate roll confirm tokens for this map.
     */
    public function buildSeatAssignmentsChecksum(ExamSeatingMap $map): string
    {
        $map->unsetRelation('assignments');
        $map->load(['assignments']);

        $seats = $map->assignments
            ->sortBy([
                ['row_number', 'asc'],
                ['column_number', 'asc'],
            ])
            ->map(fn (ExamSeatAssignment $assignment): array => [
                'row' => (int) $assignment->row_number,
                'col' => (int) $assignment->column_number,
                'seat_number' => (int) $assignment->seat_number,
                'is_disabled' => (bool) $assignment->is_disabled,
                'is_locked' => (bool) $assignment->is_locked,
                'exam_student_id' => $assignment->exam_student_id
                    ? (string) $assignment->exam_student_id
                    : null,
            ])
            ->values()
            ->all();

        $payload = [
            'rows' => (int) $map->rows,
            'cols' => (int) $map->columns,
            'start_seat_number' => (int) $map->start_seat_number,
            'seats' => $seats,
        ];

        return $this->solverService->computeChecksum($payload);
    }

    public function validateRevisionSeatChecksum(ExamSeatingMap $map, int $revision, string $checksum): void
    {
        if ($map->revision !== $revision) {
            throw new RuntimeException('Map revision is stale. Reload the map and try again.');
        }

        $currentChecksum = $this->buildSeatAssignmentsChecksum($map);

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

        $solverAssignments = $solverResult['assignments'] ?? [];
        if (! is_array($solverAssignments) || $solverAssignments === []) {
            throw new RuntimeException(
                'Solver returned no seat assignments. No eligible students were available for this map\'s selected classes.'
            );
        }

        return DB::transaction(function () use ($map, $solverResult, $solverAssignments, $userId): ExamSeatingMap {
            $claimedStudentIds = collect($solverAssignments)
                ->pluck('exam_student_id')
                ->filter(fn ($id) => is_string($id) && $id !== '')
                ->unique()
                ->values()
                ->all();

            if ($claimedStudentIds !== []) {
                $this->clearStudentsFromEditableOtherMaps($map, $claimedStudentIds);
            }

            $cells = ExamSeatAssignment::query()
                ->where('exam_seating_map_id', $map->id)
                ->whereNull('deleted_at')
                ->get()
                ->keyBy(fn (ExamSeatAssignment $assignment): string => "{$assignment->row_number}:{$assignment->column_number}");

            // Clear unlocked seats that the solver may reassign. Always leave
            // unlocked seats enabled so leftover empties stay in the active pool
            // (even spacing) and re-solve can rearrange freely. Users can disable
            // seats again after the solve if needed.
            foreach ($cells as $cell) {
                if ($cell->is_locked) {
                    continue;
                }

                $cell->exam_student_id = null;
                $cell->is_disabled = false;
                $cell->save();
            }

            foreach ($solverAssignments as $item) {
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

    /**
     * Reopen an applied or finalized map for editing. Seat assignments are left unchanged.
     */
    public function reopenMap(ExamSeatingMap $map, Exam $exam): ExamSeatingMap
    {
        $this->assertExamMutable($exam);

        if (! in_array($map->status, [
            ExamSeatingMap::STATUS_APPLIED,
            ExamSeatingMap::STATUS_FINALIZED,
        ], true)) {
            return $map->fresh(['assignments', 'classColors', 'mapClasses']) ?? $map;
        }

        $map->status = ExamSeatingMap::STATUS_GENERATED;
        $map->finalized_at = null;
        $map->finalized_by = null;
        $map->save();

        return $map->fresh(['assignments', 'classColors', 'mapClasses']) ?? $map;
    }

    public function duplicateMap(ExamSeatingMap $map, Exam $exam, ?string $name = null): ExamSeatingMap
    {
        $this->assertExamMutable($exam);

        $map->loadMissing(['assignments', 'classColors', 'mapClasses']);

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
                ['column_number', 'asc'],
                ['row_number', 'asc'],
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

            foreach ($map->mapClasses as $mapClass) {
                ExamSeatingMapClass::create([
                    'organization_id' => $map->organization_id,
                    'school_id' => $map->school_id,
                    'exam_seating_map_id' => $duplicate->id,
                    'exam_class_id' => $mapClass->exam_class_id,
                ]);
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

            return $duplicate->fresh(['assignments', 'classColors', 'mapClasses']);
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function buildReportData(ExamSeatingMap $map): array
    {
        $map->loadMissing([
            'room',
            'assignments.examStudent.studentAdmission.student' => fn ($query) => $query->withTrashed(),
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

        $colorLookup = $this->buildClassColorLookup($map);

        $assignmentRows = $assignments->map(function (ExamSeatAssignment $assignment) use ($colorLookup): array {
            $examStudent = $assignment->examStudent;
            $className = $examStudent?->examClass?->classAcademicYear?->class?->name;
            $examClassId = $examStudent?->exam_class_id !== null
                ? (string) $examStudent->exam_class_id
                : null;
            $person = $examStudent ? $this->resolveExamStudentPerson($examStudent) : null;

            return [
                'id' => $assignment->id,
                'row_number' => $assignment->row_number,
                'column_number' => $assignment->column_number,
                'seat_number' => $assignment->seat_number,
                'is_locked' => $assignment->is_locked,
                'is_disabled' => $assignment->is_disabled,
                'exam_student_id' => $assignment->exam_student_id,
                'student_name' => $person['full_name'] ?? null,
                'class_name' => $className,
                'exam_roll_number' => $examStudent?->exam_roll_number,
                'color_hex' => $this->resolveColorHex($colorLookup, $examClassId, $className),
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

        $classColors = collect($colorLookup['legend'])
            ->map(fn (array $entry): array => [
                'exam_class_id' => $entry['exam_class_id'],
                'color_hex' => $entry['color_hex'],
                'class_name' => $entry['class_name'],
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
                'cells' => $assignments->map(function (ExamSeatAssignment $assignment) use ($colorLookup): array {
                    $examStudent = $assignment->examStudent;
                    $className = $examStudent?->examClass?->classAcademicYear?->class?->name;
                    $examClassId = $examStudent?->exam_class_id !== null
                        ? (string) $examStudent->exam_class_id
                        : null;
                    $person = $examStudent ? $this->resolveExamStudentPerson($examStudent) : null;

                    return [
                        'row_number' => $assignment->row_number,
                        'column_number' => $assignment->column_number,
                        'seat_number' => $assignment->seat_number,
                        'is_disabled' => $assignment->is_disabled,
                        'is_locked' => $assignment->is_locked,
                        'exam_student_id' => $assignment->exam_student_id,
                        'student_id' => $person['student_id'] ?? null,
                        'admission_no' => $person['admission_no'] ?? null,
                        'student_name' => $person['full_name'] ?? null,
                        'father_name' => $person['father_name'] ?? null,
                        'class_name' => $className,
                        'exam_class_id' => $examClassId,
                        'exam_roll_number' => $examStudent?->exam_roll_number,
                        'color_hex' => $this->resolveColorHex($colorLookup, $examClassId, $className),
                    ];
                })->values()->all(),
            ],
        ];
    }

    /**
     * Build multi-sheet Excel export payload (visual seating map + student list),
     * matching the desktop seating tool layout.
     *
     * @param  array<string, mixed>  $reportData
     * @return array<int, array<string, mixed>>
     */
    public function buildExcelExportSheets(array $reportData, string $title = ''): array
    {
        $map = $reportData['map'] ?? [];
        $grid = $reportData['grid'] ?? [];
        $filters = $reportData['filters'] ?? [];
        $gridRows = (int) ($grid['rows'] ?? ($map['rows'] ?? 0));
        $gridColumns = (int) ($grid['columns'] ?? ($map['columns'] ?? 0));
        $mapName = (string) ($filters['map_name'] ?? ($map['name'] ?? 'Seating Map'));
        $sheetTitle = trim($title) !== '' ? $title : $mapName.' - Seating Map';

        $cellsByPosition = [];
        foreach (($grid['cells'] ?? []) as $cell) {
            if (! is_array($cell)) {
                continue;
            }
            $row = (int) ($cell['row_number'] ?? 0);
            $col = (int) ($cell['column_number'] ?? 0);
            if ($row < 1 || $col < 1) {
                continue;
            }
            $cellsByPosition["{$row}-{$col}"] = $cell;
        }

        $gridCells = [];
        $listRows = [];

        for ($row = 1; $row <= $gridRows; $row++) {
            for ($col = 1; $col <= $gridColumns; $col++) {
                $cell = $cellsByPosition["{$row}-{$col}"] ?? null;
                $seatNumber = (int) ($cell['seat_number'] ?? 0);
                $isDisabled = (bool) ($cell['is_disabled'] ?? false);
                $hasStudent = ! empty($cell['exam_student_id'] ?? null)
                    || ! empty($cell['student_name'] ?? null);

                if ($hasStudent && ! $isDisabled) {
                    $studentId = (string) ($cell['admission_no']
                        ?? $cell['exam_roll_number']
                        ?? $cell['student_id']
                        ?? '');
                    $studentName = (string) ($cell['student_name'] ?? '');
                    $fatherName = (string) ($cell['father_name'] ?? '');
                    $className = (string) ($cell['class_name'] ?? '');
                    $rollNumber = (string) ($cell['exam_roll_number'] ?? $seatNumber);
                    $fill = ltrim((string) ($cell['color_hex'] ?? 'FFFFFF'), '#');
                    if ($fill === '' || strlen($fill) !== 6 || ! ctype_xdigit($fill)) {
                        $fill = 'FFFFFF';
                    } else {
                        $fill = strtoupper($fill);
                    }

                    $text = implode("\n", array_values(array_filter([
                        (string) $seatNumber,
                        $studentId !== '' ? $studentId : null,
                        $studentName !== '' ? $studentName : null,
                        $fatherName !== '' ? $fatherName : null,
                        $className !== '' ? $className : null,
                    ], fn ($value) => $value !== null)));

                    $gridCells[] = [
                        'row' => $row,
                        'col' => $col,
                        'text' => $text,
                        'fill' => $fill,
                    ];

                    $listRows[] = [
                        'student_id' => $studentId,
                        'seat_number' => $rollNumber !== '' ? $rollNumber : $seatNumber,
                        'student_name' => $studentName,
                        'father_name' => $fatherName,
                        'class_name' => $className,
                        '_sort_seat' => $seatNumber,
                    ];
                } else {
                    $fill = $isDisabled ? 'E2E8F0' : 'FFFFFF';
                    $gridCells[] = [
                        'row' => $row,
                        'col' => $col,
                        'text' => (string) $seatNumber,
                        'fill' => $fill,
                    ];
                }
            }
        }

        usort($listRows, fn (array $a, array $b): int => ((int) $a['_sort_seat']) <=> ((int) $b['_sort_seat']));
        $listRows = array_map(function (array $row): array {
            unset($row['_sort_seat']);

            return $row;
        }, $listRows);

        return [
            [
                'sheet_name' => 'Seating Map',
                'type' => 'seating_grid',
                'title' => $sheetTitle,
                'grid_rows' => $gridRows,
                'grid_columns' => $gridColumns,
                'cells' => $gridCells,
                'page_size' => 'A3',
                'orientation' => 'landscape',
            ],
            [
                'sheet_name' => 'Student List',
                'type' => 'table',
                'title' => 'Student List',
                'columns' => [
                    ['key' => 'student_id', 'label' => 'ID'],
                    ['key' => 'seat_number', 'label' => 'Seat / Roll'],
                    ['key' => 'student_name', 'label' => 'Name'],
                    ['key' => 'father_name', 'label' => 'Father'],
                    ['key' => 'class_name', 'label' => 'Class'],
                ],
                'rows' => $listRows,
                'page_size' => 'A4',
                'orientation' => 'portrait',
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function serializeMap(ExamSeatingMap $map, bool $detailed = false): array
    {
        $relations = ['assignments', 'classColors', 'mapClasses', 'room'];

        if ($detailed) {
            $relations = [
                'assignments.examStudent.studentAdmission.student' => fn ($query) => $query->withTrashed(),
                'assignments.examStudent.examClass.classAcademicYear.class',
                'classColors',
                'mapClasses',
                'room',
                'runs' => fn ($query) => $query->orderByDesc('created_at')->limit(1),
            ];
        }

        $map->loadMissing($relations);

        $assignments = $map->assignments
            ->sortBy([
                ['row_number', 'asc'],
                ['column_number', 'asc'],
            ])
            ->values();

        $payload = [
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
            'assigned_count' => $assignments->whereNotNull('exam_student_id')->count(),
            'total_seats' => $map->rows * $map->columns,
            'assignments' => $assignments
                ->map(function (ExamSeatAssignment $assignment) use ($detailed): array {
                    $row = [
                        'id' => $assignment->id,
                        'organization_id' => $assignment->organization_id,
                        'school_id' => $assignment->school_id,
                        'exam_seating_map_id' => $assignment->exam_seating_map_id,
                        'exam_id' => $assignment->exam_id,
                        'row_number' => $assignment->row_number,
                        'column_number' => $assignment->column_number,
                        'seat_number' => $assignment->seat_number,
                        'exam_student_id' => $assignment->exam_student_id,
                        'is_locked' => $assignment->is_locked,
                        'is_disabled' => $assignment->is_disabled,
                        'locked_at' => $assignment->locked_at?->toIso8601String(),
                        'locked_by' => $assignment->locked_by,
                        'created_at' => $assignment->created_at?->toIso8601String(),
                        'updated_at' => $assignment->updated_at?->toIso8601String(),
                    ];

                    if ($detailed) {
                        $row['exam_student'] = $this->serializeExamStudent($assignment->examStudent);
                    }

                    return $row;
                })
                ->all(),
            'class_colors' => $map->classColors
                ->map(fn (ExamSeatingClassColor $color): array => [
                    'id' => $color->id,
                    'organization_id' => $color->organization_id,
                    'school_id' => $color->school_id,
                    'exam_seating_map_id' => $color->exam_seating_map_id,
                    'exam_class_id' => $color->exam_class_id,
                    'color_hex' => $color->color_hex,
                    'created_at' => $color->created_at?->toIso8601String(),
                    'updated_at' => $color->updated_at?->toIso8601String(),
                ])
                ->values()
                ->all(),
            'exam_class_ids' => $map->mapClasses
                ->pluck('exam_class_id')
                ->map(fn ($id): string => (string) $id)
                ->values()
                ->all(),
            'created_at' => $map->created_at?->toIso8601String(),
            'updated_at' => $map->updated_at?->toIso8601String(),
        ];

        if ($detailed) {
            $availability = $this->describeStudentAvailability($map);
            $payload['available_student_count'] = $availability['available_count'];
            $payload['seated_elsewhere_count'] = $availability['seated_elsewhere_count'];
            $payload['seated_elsewhere_maps'] = $availability['seated_elsewhere_maps'];
            $payload['unassigned_students'] = $this->buildUnassignedStudents($map);
            $latestRun = $map->runs->first();
            $payload['latest_run'] = $latestRun instanceof ExamSeatingRun
                ? $this->serializeRun($latestRun)
                : null;
        }

        return $payload;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function buildUnassignedStudents(ExamSeatingMap $map): array
    {
        $onThisMapIds = ExamSeatAssignment::query()
            ->where('exam_seating_map_id', $map->id)
            ->whereNull('deleted_at')
            ->whereNotNull('exam_student_id')
            ->pluck('exam_student_id')
            ->all();

        $lockedElsewhereIds = $this->examStudentIdsLockedOnOtherMaps($map);
        $excludedIds = array_values(array_unique(array_merge($onThisMapIds, $lockedElsewhereIds)));
        $mapClassIds = $map->examClassIds();

        return ExamStudent::query()
            ->with([
                'studentAdmission.student' => fn ($query) => $query->withTrashed(),
                'examClass.classAcademicYear.class',
            ])
            ->where('exam_id', $map->exam_id)
            ->where('organization_id', $map->organization_id)
            ->where('school_id', $map->school_id)
            ->whereNull('deleted_at')
            ->when(
                $mapClassIds !== [],
                fn ($query) => $query->whereIn('exam_class_id', $mapClassIds),
                fn ($query) => $query->whereRaw('1 = 0')
            )
            ->when($excludedIds !== [], fn ($query) => $query->whereNotIn('id', $excludedIds))
            ->get()
            ->sortBy(function (ExamStudent $student): string {
                $className = $student->examClass?->classAcademicYear?->class?->name ?? '';
                $person = $this->resolveExamStudentPerson($student);
                $fullName = $person['full_name'] !== '' ? $person['full_name'] : $student->id;

                return mb_strtolower("{$className}\0{$fullName}");
            })
            ->map(fn (ExamStudent $student): array => $this->serializeUnassignedStudent($student))
            ->values()
            ->all();
    }

    /**
     * @return array{
     *     available_count: int,
     *     seated_elsewhere_count: int,
     *     seated_elsewhere_maps: list<array{id: string, name: string, count: int}>
     * }
     */
    public function describeStudentAvailability(ExamSeatingMap $map): array
    {
        $mapClassIds = $map->examClassIds();
        $elsewhereMaps = $this->seatedElsewhereMapBreakdown($map);
        $lockedIds = $this->examStudentIdsLockedOnOtherMaps($map);

        if ($mapClassIds === []) {
            return [
                'available_count' => 0,
                'seated_elsewhere_count' => array_sum(array_column($elsewhereMaps, 'count')),
                'seated_elsewhere_maps' => $elsewhereMaps,
            ];
        }

        $availableCount = ExamStudent::query()
            ->where('exam_id', $map->exam_id)
            ->where('organization_id', $map->organization_id)
            ->where('school_id', $map->school_id)
            ->whereNull('deleted_at')
            ->whereIn('exam_class_id', $mapClassIds)
            ->when($lockedIds !== [], fn ($query) => $query->whereNotIn('id', $lockedIds))
            ->count();

        return [
            'available_count' => $availableCount,
            'seated_elsewhere_count' => array_sum(array_column($elsewhereMaps, 'count')),
            'seated_elsewhere_maps' => $elsewhereMaps,
        ];
    }

    /**
     * Re-open unlocked empty seats before solving so a prior layout's leftover
     * empties (previously marked disabled) can be redistributed evenly.
     * User-locked seats are left untouched.
     */
    public function reopenUnlockedEmptySeatsForSolve(ExamSeatingMap $map): void
    {
        ExamSeatAssignment::query()
            ->where('exam_seating_map_id', $map->id)
            ->whereNull('deleted_at')
            ->where('is_locked', false)
            ->where('is_disabled', true)
            ->whereNull('exam_student_id')
            ->update([
                'is_disabled' => false,
                'updated_at' => now(),
            ]);

        $map->unsetRelation('assignments');
    }

    public function assertMapHasStudentsForSolve(ExamSeatingMap $map): void
    {
        $availability = $this->describeStudentAvailability($map);
        if ($availability['available_count'] > 0) {
            return;
        }

        if ($map->examClassIds() === []) {
            throw new RuntimeException(
                'This map has no classes selected. Select at least one class before running the solver.'
            );
        }

        if ($availability['seated_elsewhere_count'] > 0) {
            $names = collect($availability['seated_elsewhere_maps'])
                ->map(fn (array $row): string => "\"{$row['name']}\" ({$row['count']})")
                ->implode(', ');

            throw new RuntimeException(
                "No students are available to seat. {$availability['seated_elsewhere_count']} student(s) from this map's classes are already seated on applied/finalized map(s): {$names}. Clear or reopen those maps before solving here."
            );
        }

        throw new RuntimeException(
            'No students are available to seat for this map\'s selected classes.'
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeUnassignedStudent(ExamStudent $student): array
    {
        $person = $this->resolveExamStudentPerson($student);

        return [
            'exam_student_id' => $student->id,
            'student_id' => $person['student_id'],
            'full_name' => $person['full_name'],
            'father_name' => $person['father_name'],
            'exam_roll_number' => $student->exam_roll_number,
            'class_name' => $student->examClass?->classAcademicYear?->class?->name ?? '',
            'exam_class_id' => (string) $student->exam_class_id,
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function serializeExamStudent(?ExamStudent $examStudent): ?array
    {
        if (! $examStudent) {
            return null;
        }

        $person = $this->resolveExamStudentPerson($examStudent);

        return [
            'id' => $examStudent->id,
            'student_id' => $person['student_id'],
            'full_name' => $person['full_name'],
            'father_name' => $person['father_name'],
            'exam_roll_number' => $examStudent->exam_roll_number,
            'class_name' => $examStudent->examClass?->classAcademicYear?->class?->name ?? '',
            'exam_class_id' => (string) $examStudent->exam_class_id,
        ];
    }

    /**
     * Resolve display fields for an exam student, including soft-deleted students
     * (exam seating maps often retain historical enrollments).
     *
     * @return array{
     *     student_id: string|null,
     *     full_name: string,
     *     father_name: string|null,
     *     admission_no: string|null
     * }
     */
    private function resolveExamStudentPerson(ExamStudent $examStudent): array
    {
        $admission = $examStudent->studentAdmission;
        $studentId = $admission?->student_id ? (string) $admission->student_id : null;
        $student = $admission?->student;

        if (! $student && $studentId) {
            $student = Student::withTrashed()->find($studentId);
        }

        return [
            'student_id' => $studentId,
            'full_name' => $student?->full_name ?? '',
            'father_name' => $student?->father_name,
            'admission_no' => $student?->admission_no,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function serializeRun(ExamSeatingRun $run): array
    {
        return [
            'id' => $run->id,
            'organization_id' => $run->organization_id,
            'school_id' => $run->school_id,
            'exam_seating_map_id' => $run->exam_seating_map_id,
            'exam_id' => $run->exam_id,
            'revision' => $run->revision,
            'input_checksum' => $run->input_checksum ? trim($run->input_checksum) : null,
            'algorithm_version' => $run->algorithm_version,
            'idempotency_key' => $run->idempotency_key,
            'status' => $run->status,
            'seed' => $run->seed,
            'conflict_count' => $run->conflict_count,
            'diagnostics' => $run->diagnostics,
            'error_message' => $run->error_message,
            'started_at' => $run->started_at?->toIso8601String(),
            'completed_at' => $run->completed_at?->toIso8601String(),
            'failed_at' => $run->failed_at?->toIso8601String(),
            'created_at' => $run->created_at?->toIso8601String(),
            'updated_at' => $run->updated_at?->toIso8601String(),
        ];
    }

    public function refreshInputChecksum(ExamSeatingMap $map): void
    {
        $map->refresh();
        // Always reload seats — loadMissing keeps a pre-sync relation that can
        // store a checksum that no longer matches the database.
        $map->unsetRelation('assignments');
        $map->load(['assignments']);

        $checksum = $this->solverService->buildSolverInput($map)['checksum'];
        $map->input_checksum = $checksum;
        $map->save();
    }

    /**
     * Build continuous (dense) exam roll numbers for seated students on a map.
     *
     * Seat numbers stay on the map for hall layout. Roll numbers are assigned
     * in seat-number order, continuing after the highest numeric roll already
     * used by other students in the same exam (students on this map who will
     * be reassigned are ignored when computing the start).
     *
     * @return array{
     *     items: list<array<string, mixed>>,
     *     will_override_count: int,
     *     collision_count: int,
     *     start_roll: int
     * }
     */
    public function buildContinuousRollAssignmentsFromMap(
        ExamSeatingMap $map,
        string $examId,
        string $organizationId,
        string $schoolId
    ): array {
        if (! $map->relationLoaded('assignments')) {
            $map->load([
                'assignments.examStudent.studentAdmission.student',
                'assignments.examStudent.examClass.classAcademicYear.class',
            ]);
        }

        $seatedAssignments = $map->assignments
            ->filter(static function (ExamSeatAssignment $assignment): bool {
                if ($assignment->exam_student_id === null || $assignment->is_disabled) {
                    return false;
                }

                $admission = $assignment->examStudent?->studentAdmission;
                $student = $admission?->student;

                // Skip deleted students / inactive admissions (would show as Unknown)
                return $admission !== null
                    && $admission->enrollment_status === 'active'
                    && $student !== null;
            })
            ->sortBy([
                ['seat_number', 'asc'],
                ['row_number', 'asc'],
                ['column_number', 'asc'],
            ])
            ->values();

        $mapStudentIds = $seatedAssignments
            ->pluck('exam_student_id')
            ->filter()
            ->map(static fn ($id): string => (string) $id)
            ->unique()
            ->values()
            ->all();

        $mapStudentIdSet = array_fill_keys($mapStudentIds, true);

        $existingStudents = ExamStudent::query()
            ->where('exam_id', $examId)
            ->where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->whereNull('deleted_at')
            ->whereNotNull('exam_roll_number')
            ->get(['id', 'exam_roll_number']);

        /** @var array<string, string> $existingByRoll */
        $existingByRoll = [];
        $maxOtherNumeric = 0;

        foreach ($existingStudents as $existing) {
            $roll = (string) $existing->exam_roll_number;
            $existingByRoll[$roll] = (string) $existing->id;

            if (isset($mapStudentIdSet[(string) $existing->id])) {
                continue;
            }

            if (ctype_digit($roll)) {
                $maxOtherNumeric = max($maxOtherNumeric, (int) $roll);
            }
        }

        $currentNumber = $maxOtherNumeric + 1;
        $startRoll = $currentNumber;
        $willOverrideCount = 0;
        $collisionCount = 0;
        $items = [];
        /** @var array<string, string> $plannedByRoll */
        $plannedByRoll = [];

        foreach ($seatedAssignments as $assignment) {
            $examStudent = $assignment->examStudent;
            if (! $examStudent) {
                continue;
            }

            $newNumber = (string) $currentNumber;
            $currentNumber++;

            $hasExisting = $examStudent->exam_roll_number !== null && $examStudent->exam_roll_number !== '';
            if ($hasExisting) {
                $willOverrideCount++;
            }

            $ownerId = $existingByRoll[$newNumber] ?? $plannedByRoll[$newNumber] ?? null;
            $collision = $ownerId !== null && $ownerId !== (string) $examStudent->id;
            if ($collision) {
                $collisionCount++;
            }

            $plannedByRoll[$newNumber] = (string) $examStudent->id;

            $person = $this->resolveExamStudentPerson($examStudent);

            $items[] = [
                'exam_student_id' => $examStudent->id,
                'student_id' => $person['student_id'],
                'student_name' => $person['full_name'] !== '' ? $person['full_name'] : 'Unknown',
                'class_name' => $examStudent->examClass?->classAcademicYear?->class?->name ?? 'Unknown',
                'seat_number' => $assignment->seat_number,
                'current_roll_number' => $examStudent->exam_roll_number,
                'new_roll_number' => $newNumber,
                'will_override' => $hasExisting,
                'has_collision' => $collision,
            ];
        }

        return [
            'items' => $items,
            'will_override_count' => $willOverrideCount,
            'collision_count' => $collisionCount,
            'start_roll' => $startRoll,
        ];
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

        // Column-major: fill top-to-bottom in each column, then move to the next column.
        for ($column = 1; $column <= $map->columns; $column++) {
            for ($row = 1; $row <= $map->rows; $row++) {
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

    /**
     * @return list<string>
     */
    private function normalizeExamClassIds(mixed $examClassIds): array
    {
        if (! is_array($examClassIds)) {
            return [];
        }

        $normalized = [];
        foreach ($examClassIds as $id) {
            if (! is_string($id) && ! is_numeric($id)) {
                continue;
            }
            $value = (string) $id;
            if ($value === '') {
                continue;
            }
            $normalized[$value] = $value;
        }

        return array_values($normalized);
    }

    /**
     * @param  list<string>  $examClassIds
     */
    private function assertExamClassesBelongToExam(
        Exam $exam,
        string $organizationId,
        string $schoolId,
        array $examClassIds
    ): void {
        if ($examClassIds === []) {
            throw new RuntimeException('At least one exam class must be selected for the seating map');
        }

        $validCount = ExamClass::query()
            ->where('exam_id', $exam->id)
            ->where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->whereNull('deleted_at')
            ->whereIn('id', $examClassIds)
            ->count();

        if ($validCount !== count($examClassIds)) {
            throw new RuntimeException('One or more selected classes do not belong to this exam');
        }
    }

    /**
     * @param  list<string>  $examClassIds
     */
    private function replaceMapClasses(ExamSeatingMap $map, array $examClassIds): void
    {
        ExamSeatingMapClass::query()
            ->where('exam_seating_map_id', $map->id)
            ->whereNull('deleted_at')
            ->get()
            ->each->delete();

        foreach ($examClassIds as $examClassId) {
            ExamSeatingMapClass::create([
                'organization_id' => $map->organization_id,
                'school_id' => $map->school_id,
                'exam_seating_map_id' => $map->id,
                'exam_class_id' => $examClassId,
            ]);
        }
    }

    /**
     * @param  list<string>  $examClassIds
     */
    private function clearSeatsForExamClasses(ExamSeatingMap $map, array $examClassIds): void
    {
        if ($examClassIds === []) {
            return;
        }

        $studentIds = ExamStudent::query()
            ->where('exam_id', $map->exam_id)
            ->where('organization_id', $map->organization_id)
            ->where('school_id', $map->school_id)
            ->whereNull('deleted_at')
            ->whereIn('exam_class_id', $examClassIds)
            ->pluck('id')
            ->all();

        if ($studentIds === []) {
            return;
        }

        ExamSeatAssignment::query()
            ->where('exam_seating_map_id', $map->id)
            ->whereNull('deleted_at')
            ->whereIn('exam_student_id', $studentIds)
            ->get()
            ->each(function (ExamSeatAssignment $assignment): void {
                if ($assignment->is_locked) {
                    $assignment->is_locked = false;
                    $assignment->locked_at = null;
                    $assignment->locked_by = null;
                }
                $assignment->exam_student_id = null;
                $assignment->is_disabled = true;
                $assignment->save();
            });
    }

    /**
     * @return list<string>
     */
    private function examStudentIdsLockedOnOtherMaps(ExamSeatingMap $map): array
    {
        $lockedMapIds = ExamSeatingMap::query()
            ->where('exam_id', $map->exam_id)
            ->where('organization_id', $map->organization_id)
            ->where('school_id', $map->school_id)
            ->where('id', '!=', $map->id)
            ->whereNull('deleted_at')
            ->whereIn('status', [
                ExamSeatingMap::STATUS_APPLIED,
                ExamSeatingMap::STATUS_FINALIZED,
            ])
            ->pluck('id')
            ->all();

        if ($lockedMapIds === []) {
            return [];
        }

        return ExamSeatAssignment::query()
            ->whereIn('exam_seating_map_id', $lockedMapIds)
            ->whereNull('deleted_at')
            ->whereNotNull('exam_student_id')
            ->pluck('exam_student_id')
            ->map(fn ($id): string => (string) $id)
            ->unique()
            ->values()
            ->all();
    }

    /**
     * @return list<array{id: string, name: string, count: int}>
     */
    private function seatedElsewhereMapBreakdown(ExamSeatingMap $map): array
    {
        $mapClassIds = $map->examClassIds();
        if ($mapClassIds === []) {
            return [];
        }

        $studentIds = ExamStudent::query()
            ->where('exam_id', $map->exam_id)
            ->where('organization_id', $map->organization_id)
            ->where('school_id', $map->school_id)
            ->whereNull('deleted_at')
            ->whereIn('exam_class_id', $mapClassIds)
            ->pluck('id')
            ->all();

        if ($studentIds === []) {
            return [];
        }

        $rows = DB::table('exam_seat_assignments')
            ->join('exam_seating_maps', 'exam_seating_maps.id', '=', 'exam_seat_assignments.exam_seating_map_id')
            ->where('exam_seat_assignments.exam_id', $map->exam_id)
            ->where('exam_seat_assignments.organization_id', $map->organization_id)
            ->where('exam_seat_assignments.school_id', $map->school_id)
            ->where('exam_seat_assignments.exam_seating_map_id', '!=', $map->id)
            ->whereNull('exam_seat_assignments.deleted_at')
            ->whereNull('exam_seating_maps.deleted_at')
            ->whereNotNull('exam_seat_assignments.exam_student_id')
            ->whereIn('exam_seat_assignments.exam_student_id', $studentIds)
            ->whereIn('exam_seating_maps.status', [
                ExamSeatingMap::STATUS_APPLIED,
                ExamSeatingMap::STATUS_FINALIZED,
            ])
            ->groupBy('exam_seating_maps.id', 'exam_seating_maps.name')
            ->orderBy('exam_seating_maps.name')
            ->get([
                'exam_seating_maps.id',
                'exam_seating_maps.name',
                DB::raw('COUNT(*) as count'),
            ]);

        return $rows
            ->map(fn ($row): array => [
                'id' => (string) $row->id,
                'name' => (string) $row->name,
                'count' => (int) $row->count,
            ])
            ->values()
            ->all();
    }

    /**
     * @param  list<string>  $examStudentIds
     */
    private function clearStudentsFromEditableOtherMaps(ExamSeatingMap $map, array $examStudentIds): void
    {
        if ($examStudentIds === []) {
            return;
        }

        $editableMaps = ExamSeatingMap::query()
            ->where('exam_id', $map->exam_id)
            ->where('organization_id', $map->organization_id)
            ->where('school_id', $map->school_id)
            ->where('id', '!=', $map->id)
            ->whereNull('deleted_at')
            ->whereNotIn('status', [
                ExamSeatingMap::STATUS_APPLIED,
                ExamSeatingMap::STATUS_FINALIZED,
            ])
            ->get();

        if ($editableMaps->isEmpty()) {
            return;
        }

        $editableMapIds = $editableMaps->pluck('id')->all();

        $touchedMapIds = [];
        ExamSeatAssignment::query()
            ->whereIn('exam_seating_map_id', $editableMapIds)
            ->whereNull('deleted_at')
            ->whereIn('exam_student_id', $examStudentIds)
            ->get()
            ->each(function (ExamSeatAssignment $assignment) use (&$touchedMapIds): void {
                if ($assignment->is_locked) {
                    $assignment->is_locked = false;
                    $assignment->locked_at = null;
                    $assignment->locked_by = null;
                }
                $assignment->exam_student_id = null;
                $assignment->is_disabled = true;
                $assignment->save();
                $touchedMapIds[(string) $assignment->exam_seating_map_id] = true;
            });

        // Keep revision/checksum in sync so Apply Roll / Solve on those maps
        // does not fail with "checksum is stale" after seats were cleared here.
        foreach ($editableMaps as $otherMap) {
            if (! isset($touchedMapIds[(string) $otherMap->id])) {
                continue;
            }
            $otherMap->revision = ((int) $otherMap->revision) + 1;
            $otherMap->save();
            $this->refreshInputChecksum($otherMap);
        }
    }

    /**
     * Resolve class colors for reports (Excel fills + PDF backgrounds).
     * Prefers saved colors, then falls back to the same default palette used in the editor UI.
     *
     * @return array{
     *     by_exam_class_id: array<string, string>,
     *     by_class_name: array<string, string>,
     *     legend: list<array{exam_class_id: string|null, class_name: string|null, color_hex: string}>
     * }
     */
    private function buildClassColorLookup(ExamSeatingMap $map): array
    {
        $defaultPalette = [
            '#3B82F6',
            '#10B981',
            '#F59E0B',
            '#EF4444',
            '#8B5CF6',
            '#EC4899',
            '#14B8A6',
            '#F97316',
        ];

        $byExamClassId = [];
        $byClassName = [];
        $legend = [];
        $paletteIndex = 0;

        foreach ($map->classColors as $color) {
            $normalized = $this->normalizeHexColor($color->color_hex);
            if ($normalized === null) {
                continue;
            }

            $examClassId = (string) $color->exam_class_id;
            $className = $color->examClass?->classAcademicYear?->class?->name;
            $byExamClassId[$examClassId] = $normalized;
            if (is_string($className) && trim($className) !== '') {
                $byClassName[mb_strtolower(trim($className))] = $normalized;
            }

            $legend[] = [
                'exam_class_id' => $examClassId,
                'class_name' => $className,
                'color_hex' => $normalized,
            ];
        }

        // Ensure every seated class has a color even when nothing was saved yet.
        $seenClassNames = [];
        foreach ($map->assignments as $assignment) {
            if ($assignment->is_disabled || empty($assignment->exam_student_id)) {
                continue;
            }

            $examClassId = $assignment->examStudent?->exam_class_id !== null
                ? (string) $assignment->examStudent->exam_class_id
                : null;
            $className = $assignment->examStudent?->examClass?->classAcademicYear?->class?->name;
            $classNameKey = is_string($className) && trim($className) !== ''
                ? mb_strtolower(trim($className))
                : null;

            if ($examClassId !== null && isset($byExamClassId[$examClassId])) {
                continue;
            }
            if ($classNameKey !== null && isset($byClassName[$classNameKey])) {
                if ($examClassId !== null) {
                    $byExamClassId[$examClassId] = $byClassName[$classNameKey];
                }

                continue;
            }

            $fallbackKey = $classNameKey ?? ($examClassId ?? 'unknown');
            if (isset($seenClassNames[$fallbackKey])) {
                $normalized = $seenClassNames[$fallbackKey];
            } else {
                $normalized = $defaultPalette[$paletteIndex % count($defaultPalette)];
                $paletteIndex += 1;
                $seenClassNames[$fallbackKey] = $normalized;
                $legend[] = [
                    'exam_class_id' => $examClassId,
                    'class_name' => $className,
                    'color_hex' => $normalized,
                ];
            }

            if ($examClassId !== null) {
                $byExamClassId[$examClassId] = $normalized;
            }
            if ($classNameKey !== null) {
                $byClassName[$classNameKey] = $normalized;
            }
        }

        return [
            'by_exam_class_id' => $byExamClassId,
            'by_class_name' => $byClassName,
            'legend' => $legend,
        ];
    }

    /**
     * @param  array{
     *     by_exam_class_id: array<string, string>,
     *     by_class_name: array<string, string>,
     *     legend: list<array{exam_class_id: string|null, class_name: string|null, color_hex: string}>
     * }  $lookup
     */
    private function resolveColorHex(array $lookup, ?string $examClassId, ?string $className): ?string
    {
        if ($examClassId !== null && $examClassId !== '' && isset($lookup['by_exam_class_id'][$examClassId])) {
            return $lookup['by_exam_class_id'][$examClassId];
        }

        if (is_string($className) && trim($className) !== '') {
            $key = mb_strtolower(trim($className));
            if (isset($lookup['by_class_name'][$key])) {
                return $lookup['by_class_name'][$key];
            }
        }

        return null;
    }

    private function normalizeHexColor(mixed $color): ?string
    {
        if (! is_string($color) || trim($color) === '') {
            return null;
        }

        $hex = strtoupper(ltrim(trim($color), '#'));
        if (! preg_match('/^[0-9A-F]{6}$/', $hex)) {
            return null;
        }

        return '#'.$hex;
    }
}
