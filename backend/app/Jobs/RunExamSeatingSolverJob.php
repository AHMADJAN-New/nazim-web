<?php

namespace App\Jobs;

use App\Models\ExamSeatingMap;
use App\Models\ExamSeatingRun;
use App\Services\ExamSeating\ExamSeatingMapService;
use App\Services\ExamSeating\ExamSeatingSolverService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

class RunExamSeatingSolverJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    /** Allow long CP-SAT runs (strict + fallback) for large exams. */
    public int $timeout = 1200;

    public function __construct(
        public string $mapId,
        public int $revision,
        public string $inputChecksum,
        public bool $strictMode,
        public ?int $seed,
        public string $userId,
        public string $idempotencyKey
    ) {}

    public function handle(
        ExamSeatingSolverService $solverService,
        ExamSeatingMapService $mapService
    ): void {
        $startedAt = now();

        $map = ExamSeatingMap::query()
            ->with(['assignments'])
            ->whereNull('deleted_at')
            ->find($this->mapId);

        if (! $map) {
            Log::warning('Exam seating solver job skipped: map not found', [
                'map_id' => $this->mapId,
            ]);

            return;
        }

        try {
            // Validate against a freshly loaded map before marking running.
            // Controller already checked; this catches edits while the job waited
            // in queue. Revision is the authoritative concurrency token.
            $map->refresh();
            $map->unsetRelation('assignments');
            $map->load(['assignments']);

            if ((int) $map->revision !== (int) $this->revision) {
                throw new \RuntimeException('Map revision is stale. Reload the map and try again.');
            }

            $freshChecksum = $solverService->buildSolverInput($map)['checksum'];
            if (! hash_equals($freshChecksum, trim($this->inputChecksum))) {
                // Common after solver code changes if queue:work was not restarted.
                Log::warning('Exam seating solver checksum mismatch', [
                    'map_id' => $this->mapId,
                    'revision' => $this->revision,
                    'expected' => $this->inputChecksum,
                    'fresh' => $freshChecksum,
                    'algorithm_version' => config('exam_seating.algorithm_version'),
                ]);
                throw new \RuntimeException(
                    'Map input checksum is stale. Reload the map and try again.'
                    .' If you recently updated the app, restart the queue worker (php artisan queue:restart) first.'
                );
            }

            $mapService->assertMapHasStudentsForSolve($map);

            $map->solver_status = ExamSeatingMap::SOLVER_RUNNING;
            $map->save();

            // Free unlocked empty seats left disabled by a previous solve so the
            // solver can rearrange students and spread empties across the hall.
            // Checksum is revalidated against the solved payload below.
            $mapService->reopenUnlockedEmptySeatsForSolve($map);
            $map->unsetRelation('assignments');
            $map->load(['assignments']);

            $solved = $solverService->solve($map, $this->strictMode, $this->seed);
            $result = $solved['result'];

            $map->refresh();

            $applied = false;
            if (in_array($result['status'], ['optimal', 'feasible'], true)) {
                try {
                    $mapService->applySolverResults(
                        $map,
                        $this->revision,
                        $solved['checksum'],
                        $result,
                        $this->userId
                    );
                    $applied = true;
                } catch (Throwable $applyException) {
                    Log::error('Exam seating solver apply failed after successful solve', [
                        'map_id' => $this->mapId,
                        'status' => $result['status'] ?? null,
                        'assignment_count' => count($result['assignments'] ?? []),
                        'error' => $applyException->getMessage(),
                    ]);
                    throw $applyException;
                }
            } else {
                Log::warning('Exam seating solver finished without usable assignments', [
                    'map_id' => $this->mapId,
                    'status' => $result['status'] ?? null,
                    'message' => $result['message'] ?? null,
                    'mode_used' => $result['mode_used'] ?? null,
                ]);
            }

            $map->refresh();

            ExamSeatingRun::create([
                'organization_id' => $map->organization_id,
                'school_id' => $map->school_id,
                'exam_seating_map_id' => $map->id,
                'exam_id' => $map->exam_id,
                'revision' => $this->revision,
                'input_checksum' => $this->inputChecksum,
                'algorithm_version' => (string) config('exam_seating.algorithm_version'),
                'idempotency_key' => $this->idempotencyKey,
                'status' => ExamSeatingRun::STATUS_SUCCEEDED,
                'seed' => $solved['seed'],
                'conflict_count' => (int) ($result['conflicts_count'] ?? 0),
                'diagnostics' => [
                    'status' => $result['status'],
                    'mode_used' => $result['mode_used'] ?? null,
                    'conflict_pairs' => $result['conflict_pairs'] ?? [],
                    'message' => $result['message'] ?? null,
                    'applied' => $applied,
                    'assignment_count' => count($result['assignments'] ?? []),
                ],
                'started_at' => $startedAt,
                'completed_at' => now(),
            ]);

            if ($map->solver_status !== ExamSeatingMap::SOLVER_SUCCEEDED) {
                $map->solver_status = $applied
                    ? ExamSeatingMap::SOLVER_SUCCEEDED
                    : ExamSeatingMap::SOLVER_FAILED;
                $map->solver_diagnostics = [
                    'status' => $result['status'],
                    'mode_used' => $result['mode_used'] ?? null,
                    'conflicts_count' => $result['conflicts_count'] ?? 0,
                    'conflict_pairs' => $result['conflict_pairs'] ?? [],
                    'message' => $result['message'] ?? null,
                    'applied' => $applied,
                ];
                $map->save();
            }
        } catch (Throwable $exception) {
            $map->refresh();
            $map->solver_status = ExamSeatingMap::SOLVER_FAILED;
            $map->solver_diagnostics = [
                'error' => $exception->getMessage(),
            ];
            $map->save();

            try {
                ExamSeatingRun::create([
                    'organization_id' => $map->organization_id,
                    'school_id' => $map->school_id,
                    'exam_seating_map_id' => $map->id,
                    'exam_id' => $map->exam_id,
                    'revision' => $this->revision,
                    'input_checksum' => $this->inputChecksum,
                    'algorithm_version' => (string) config('exam_seating.algorithm_version'),
                    'idempotency_key' => $this->idempotencyKey,
                    'status' => ExamSeatingRun::STATUS_FAILED,
                    'seed' => $this->seed,
                    'conflict_count' => 0,
                    'diagnostics' => [
                        'error' => $exception->getMessage(),
                    ],
                    'error_message' => $exception->getMessage(),
                    'started_at' => $startedAt,
                    'failed_at' => now(),
                ]);
            } catch (Throwable $runException) {
                Log::error('Failed to persist exam seating run failure record', [
                    'map_id' => $this->mapId,
                    'error' => $runException->getMessage(),
                ]);
            }

            Log::error('Exam seating solver job failed', [
                'map_id' => $this->mapId,
                'error' => $exception->getMessage(),
            ]);

            throw $exception;
        }
    }
}
