<?php

namespace App\Jobs;

use App\Services\Imports\StudentImportService;
use App\Services\Subscription\UsageTrackingService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class StudentImportCommitJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 0;

    public function __construct(
        public string $jobId,
        public string $filePath,
        public string $organizationId,
        public string $schoolId,
        public string $userId
    ) {}

    public function handle(StudentImportService $importService, UsageTrackingService $usageTrackingService): void
    {
        $this->applyImportRuntimeLimits();

        $this->putStatus([
            'status' => 'running',
            'message' => 'Import is being processed',
        ]);

        try {
            $absolutePath = Storage::disk('local')->path($this->filePath);
            $parsed = $importService->parse($absolutePath);
            $validation = $importService->validateImport($parsed, $this->organizationId);

            if (!($validation['is_valid'] ?? false)) {
                $this->putStatus([
                    'status' => 'failed',
                    'error' => 'Validation failed during import processing',
                    'result' => $validation,
                ]);
                return;
            }

            $totalStudentsToCreate = (int) ($validation['valid_rows'] ?? 0);
            if ($totalStudentsToCreate > 0) {
                // Force fresh count to prevent stale-limit decisions for bulk imports.
                $limitCheck = $usageTrackingService->canCreate($this->organizationId, 'students', true);
                $remaining = $limitCheck['limit'] === -1 ? -1 : max(0, $limitCheck['remaining']);
                if ($limitCheck['limit'] !== -1 && $remaining !== -1 && $totalStudentsToCreate > $remaining) {
                    $this->putStatus([
                        'status' => 'failed',
                        'error' => "Cannot import {$totalStudentsToCreate} students. Only {$remaining} student slots remaining.",
                        'code' => 'LIMIT_REACHED',
                    ]);
                    return;
                }
            }

            $commitResult = $importService->commit($parsed, $this->organizationId, $this->schoolId, $validation);
            $usageRecalculated = false;
            try {
                // Recalculate cached usage immediately so limit dashboards reflect imported rows right away.
                $usageTrackingService->recalculateUsage($this->organizationId);
                $usageRecalculated = true;
            } catch (\Throwable $recalcError) {
                // Do not fail successful imports if recalculation fails; status endpoint can retry.
                Log::warning('Student import usage recalculation failed after commit: ' . $recalcError->getMessage(), [
                    'job_id' => $this->jobId,
                    'organization_id' => $this->organizationId,
                    'trace' => $recalcError->getTraceAsString(),
                ]);
            }

            $this->putStatus([
                'status' => 'completed',
                'created_students' => (int) ($commitResult['created_students'] ?? 0),
                'created_admissions' => (int) ($commitResult['created_admissions'] ?? 0),
                'usage_recalculated' => $usageRecalculated,
                'usage_recalculated_at' => $usageRecalculated ? now()->toIso8601String() : null,
            ]);
        } catch (\Throwable $e) {
            Log::error('Student import async commit failed: ' . $e->getMessage(), [
                'job_id' => $this->jobId,
                'organization_id' => $this->organizationId,
                'user_id' => $this->userId,
                'trace' => $e->getTraceAsString(),
            ]);

            $this->putStatus([
                'status' => 'failed',
                'error' => 'Failed to import students',
            ]);
        } finally {
            Storage::disk('local')->delete($this->filePath);
        }
    }

    private function putStatus(array $updates): void
    {
        $key = $this->statusKey();
        $existing = Cache::get($key, []);
        if (!is_array($existing)) {
            $existing = [];
        }

        Cache::put($key, array_merge($existing, $updates, [
            'job_id' => $this->jobId,
            'organization_id' => $this->organizationId,
            'user_id' => $this->userId,
            'updated_at' => now()->toIso8601String(),
        ]), now()->addHours(6));
    }

    private function statusKey(): string
    {
        return "student_import_job:{$this->jobId}";
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('Student import async job failed(): ' . $exception->getMessage(), [
            'job_id' => $this->jobId,
            'organization_id' => $this->organizationId,
            'user_id' => $this->userId,
            'trace' => $exception->getTraceAsString(),
        ]);

        $this->putStatus([
            'status' => 'failed',
            'error' => 'Failed to import students',
        ]);
    }

    private function applyImportRuntimeLimits(): void
    {
        $limit = env('STUDENT_IMPORT_MEMORY_LIMIT', '1024M');
        if (is_string($limit) && trim($limit) !== '') {
            @ini_set('memory_limit', $limit);
        }

        $maxExecutionTime = env('STUDENT_IMPORT_MAX_EXECUTION_TIME', '0');
        if (is_string($maxExecutionTime) && is_numeric($maxExecutionTime) && function_exists('set_time_limit')) {
            $seconds = (int) $maxExecutionTime;
            @ini_set('max_execution_time', (string) $seconds);
            @set_time_limit($seconds);
        }
    }
}

