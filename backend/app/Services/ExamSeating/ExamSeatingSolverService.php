<?php

namespace App\Services\ExamSeating;

use App\Models\ExamSeatAssignment;
use App\Models\ExamSeatingMap;
use App\Models\ExamStudent;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Symfony\Component\Process\Process;

class ExamSeatingSolverService
{
    /**
     * @return array{
     *     payload: array<string, mixed>,
     *     checksum: string
     * }
     */
    public function buildSolverInput(ExamSeatingMap $map, bool $strictMode = true, ?int $seed = null): array
    {
        $map->loadMissing(['assignments']);

        $inputPayload = [
            'contract_version' => '1.0',
            'map' => [
                'rows' => $map->rows,
                'cols' => $map->columns,
            ],
            'seats' => $this->buildSeatsPayload($map),
            'students' => $this->buildStudentsPayload($map),
        ];

        $checksum = $this->computeChecksum($inputPayload);

        $studentCount = count($inputPayload['students']);
        $cpSatTimeout = $this->resolveCpSatTimeoutSeconds($studentCount);

        $payload = array_merge($inputPayload, [
            'strict_mode' => $strictMode,
            'seed' => $seed ?? random_int(1, 2_147_483_647),
            'timeout_seconds' => (float) $cpSatTimeout,
        ]);

        return [
            'payload' => $payload,
            'checksum' => $checksum,
        ];
    }

    public function computeChecksum(array $payload): string
    {
        return hash('sha256', $this->canonicalJson($payload));
    }

    /**
     * @return array<string, mixed>
     */
    public function solve(ExamSeatingMap $map, bool $strictMode = true, ?int $seed = null): array
    {
        $built = $this->buildSolverInput($map, $strictMode, $seed);
        $result = $this->invokeSolver($built['payload']);

        return [
            'checksum' => $built['checksum'],
            'seed' => $built['payload']['seed'],
            'result' => $result,
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function invokeSolver(array $payload): array
    {
        $pythonPath = (string) config('exam_seating.python_path', 'python');
        $scriptPath = (string) config('exam_seating.solver_script');
        $cpSatTimeout = (int) ($payload['timeout_seconds'] ?? config('exam_seating.timeout_seconds', 300));
        // Strict mode may run CP-SAT twice (strict, then fallback).
        $processTimeout = ($cpSatTimeout * 2) + 60;

        if (! is_file($scriptPath)) {
            throw new RuntimeException("Exam seating solver script not found at {$scriptPath}");
        }

        $process = new Process([$pythonPath, $scriptPath]);
        $process->setInput($this->canonicalJson($payload));
        $process->setTimeout($processTimeout);

        Log::info('Exam seating solver process starting', [
            'students' => count($payload['students'] ?? []),
            'seats' => count($payload['seats'] ?? []),
            'cp_sat_timeout_seconds' => $cpSatTimeout,
            'process_timeout_seconds' => $processTimeout,
        ]);

        $process->run();

        if (! $process->isSuccessful()) {
            $stderr = trim($process->getErrorOutput());
            throw new RuntimeException(
                'Exam seating solver process failed'
                .($stderr !== '' ? ": {$stderr}" : '')
            );
        }

        $stdout = trim($process->getOutput());
        if ($stdout === '') {
            throw new RuntimeException('Exam seating solver returned empty output');
        }

        $decoded = json_decode($stdout, true);
        if (! is_array($decoded)) {
            throw new RuntimeException('Exam seating solver returned invalid JSON');
        }

        $this->validateOutputSchema($decoded);

        return $decoded;
    }

    /**
     * @param  array<string, mixed>  $output
     */
    public function validateOutputSchema(array $output): void
    {
        if (! isset($output['contract_version'], $output['status'])) {
            throw new RuntimeException('Solver output missing required fields');
        }

        if (! is_string($output['status'])) {
            throw new RuntimeException('Solver output status must be a string');
        }

        if (! in_array($output['status'], ['optimal', 'feasible', 'infeasible', 'timeout', 'error'], true)) {
            throw new RuntimeException("Unsupported solver status: {$output['status']}");
        }

        if (! isset($output['assignments']) || ! is_array($output['assignments'])) {
            throw new RuntimeException('Solver output assignments must be an array');
        }

        foreach ($output['assignments'] as $assignment) {
            if (! is_array($assignment)) {
                throw new RuntimeException('Solver assignment entries must be objects');
            }

            foreach (['exam_student_id', 'exam_class_id', 'row', 'col', 'seat_number'] as $field) {
                if (! array_key_exists($field, $assignment)) {
                    throw new RuntimeException("Solver assignment missing {$field}");
                }
            }
        }

        if (! isset($output['conflict_pairs']) || ! is_array($output['conflict_pairs'])) {
            throw new RuntimeException('Solver output conflict_pairs must be an array');
        }

        if (! isset($output['conflicts_count']) || ! is_int($output['conflicts_count'])) {
            throw new RuntimeException('Solver output conflicts_count must be an integer');
        }
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function buildSeatsPayload(ExamSeatingMap $map): array
    {
        return $map->assignments
            ->sortBy([
                ['row_number', 'asc'],
                ['column_number', 'asc'],
            ])
            ->map(function (ExamSeatAssignment $assignment): array {
                $hasStudent = $assignment->exam_student_id !== null;

                return [
                    'row' => $assignment->row_number - 1,
                    'col' => $assignment->column_number - 1,
                    'seat_number' => $assignment->seat_number,
                    'is_disabled' => (bool) $assignment->is_disabled,
                    'locked' => $hasStudent ? true : (bool) $assignment->is_locked,
                    'exam_student_id' => $assignment->exam_student_id,
                ];
            })
            ->values()
            ->all();
    }

    /**
     * Students available for this map: selected classes, not locked on applied/finalized maps.
     * Students already seated on other editable maps are included so solve can claim them.
     *
     * @return list<array<string, string>>
     */
    private function buildStudentsPayload(ExamSeatingMap $map): array
    {
        $lockedElsewhereIds = $this->examStudentIdsLockedOnOtherMaps($map);
        $mapClassIds = $map->examClassIds();

        return ExamStudent::query()
            ->with('examClass')
            ->where('exam_id', $map->exam_id)
            ->where('organization_id', $map->organization_id)
            ->where('school_id', $map->school_id)
            ->whereNull('deleted_at')
            ->when(
                $mapClassIds !== [],
                fn ($query) => $query->whereIn('exam_class_id', $mapClassIds),
                fn ($query) => $query->whereRaw('1 = 0')
            )
            ->when(
                $lockedElsewhereIds !== [],
                fn ($query) => $query->whereNotIn('id', $lockedElsewhereIds)
            )
            ->get()
            ->sortBy(fn (ExamStudent $student) => $student->id)
            ->map(fn (ExamStudent $student): array => [
                'exam_student_id' => $student->id,
                'exam_class_id' => (string) $student->exam_class_id,
            ])
            ->values()
            ->all();
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
     * @param  array<string, mixed>  $data
     */
    private function canonicalJson(array $data): string
    {
        return json_encode(
            $this->sortRecursive($data),
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
        ) ?: '{}';
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function sortRecursive(array $data): array
    {
        if ($this->isList($data)) {
            return array_map(function ($value) {
                return is_array($value) ? $this->sortRecursive($value) : $value;
            }, $data);
        }

        ksort($data);

        foreach ($data as $key => $value) {
            if (is_array($value)) {
                $data[$key] = $this->sortRecursive($value);
            }
        }

        return $data;
    }

    /**
     * @param  array<mixed>  $data
     */
    private function isList(array $data): bool
    {
        if ($data === []) {
            return true;
        }

        return array_keys($data) === range(0, count($data) - 1);
    }

    private function resolveCpSatTimeoutSeconds(int $studentCount): int
    {
        $base = (int) config('exam_seating.timeout_seconds', 300);
        $max = (int) config('exam_seating.max_timeout_seconds', 900);
        $scaled = 60 + (int) ceil($studentCount * 0.3);

        return min($max, max($base, $scaled));
    }
}
