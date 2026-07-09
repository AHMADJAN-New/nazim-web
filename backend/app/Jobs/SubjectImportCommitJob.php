<?php

namespace App\Jobs;

use App\Services\Imports\SubjectImportService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class SubjectImportCommitJob implements ShouldQueue
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

    public function handle(SubjectImportService $importService): void
    {
        $this->applyImportRuntimeLimits();

        $this->putStatus([
            'status' => 'running',
            'message' => 'Import is being processed',
        ]);

        try {
            $absolutePath = Storage::disk('local')->path($this->filePath);
            $parsed = $importService->parse($absolutePath);
            $validation = $importService->validateImport($parsed, $this->organizationId, $this->schoolId);

            if (! ($validation['is_valid'] ?? false)) {
                $this->putStatus([
                    'status' => 'failed',
                    'error' => 'Validation failed during import processing',
                    'result' => $validation,
                ]);

                return;
            }

            $commitResult = $importService->commit($parsed, $this->organizationId, $this->schoolId, $validation);

            $this->putStatus([
                'status' => 'completed',
                'created_subjects' => (int) ($commitResult['created_subjects'] ?? 0),
                'skipped_subjects' => (int) ($commitResult['skipped_subjects'] ?? 0),
                'created_templates' => (int) ($commitResult['created_templates'] ?? 0),
                'skipped_templates' => (int) ($commitResult['skipped_templates'] ?? 0),
                'created_class_subjects' => (int) ($commitResult['created_class_subjects'] ?? 0),
                'skipped_class_subjects' => (int) ($commitResult['skipped_class_subjects'] ?? 0),
            ]);
        } catch (\Throwable $e) {
            Log::error('Subject import async commit failed: '.$e->getMessage(), [
                'job_id' => $this->jobId,
                'organization_id' => $this->organizationId,
                'user_id' => $this->userId,
                'trace' => $e->getTraceAsString(),
            ]);

            $this->putStatus([
                'status' => 'failed',
                'error' => 'Failed to import subjects',
            ]);
        } finally {
            Storage::disk('local')->delete($this->filePath);
        }
    }

    private function putStatus(array $updates): void
    {
        $key = $this->statusKey();
        $existing = Cache::get($key, []);
        if (! is_array($existing)) {
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
        return "subject_import_job:{$this->jobId}";
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('Subject import async job failed(): '.$exception->getMessage(), [
            'job_id' => $this->jobId,
            'organization_id' => $this->organizationId,
            'user_id' => $this->userId,
            'trace' => $exception->getTraceAsString(),
        ]);

        $this->putStatus([
            'status' => 'failed',
            'error' => 'Failed to import subjects',
        ]);
    }

    private function applyImportRuntimeLimits(): void
    {
        $limit = env('SUBJECT_IMPORT_MEMORY_LIMIT', env('STUDENT_IMPORT_MEMORY_LIMIT', '1024M'));
        if (is_string($limit) && trim($limit) !== '') {
            @ini_set('memory_limit', $limit);
        }

        $maxExecutionTime = env('SUBJECT_IMPORT_MAX_EXECUTION_TIME', env('STUDENT_IMPORT_MAX_EXECUTION_TIME', '0'));
        if (is_string($maxExecutionTime) && is_numeric($maxExecutionTime) && function_exists('set_time_limit')) {
            $seconds = (int) $maxExecutionTime;
            @ini_set('max_execution_time', (string) $seconds);
            @set_time_limit($seconds);
        }
    }
}
