<?php

namespace App\Http\Controllers;

use App\Http\Requests\SubjectImport\CommitSubjectImportFileRequest;
use App\Http\Requests\SubjectImport\DownloadSubjectImportTemplateRequest;
use App\Http\Requests\SubjectImport\ValidateSubjectImportFileRequest;
use App\Jobs\SubjectImportCommitJob;
use App\Services\Imports\SubjectImportService;
use App\Services\Imports\SubjectImportXlsxService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class SubjectImportController extends Controller
{
    public function __construct(
        private SubjectImportXlsxService $xlsxService,
        private SubjectImportService $importService
    ) {}

    public function downloadTemplate(DownloadSubjectImportTemplateRequest $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (! $profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        if (! $this->userCanImport($user)) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $organizationId = $profile->organization_id;
        $schoolId = $this->getCurrentSchoolId($request);
        $spec = $request->validated();

        try {
            $xlsx = $this->xlsxService->generateTemplate($spec, $organizationId, $schoolId);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            Log::error('Subject import template generation failed: '.$e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json(['error' => 'Failed to generate import template'], 500);
        }

        return response($xlsx['content'], 200, [
            'Content-Type' => $xlsx['mime'],
            'Content-Disposition' => 'attachment; filename="'.$xlsx['filename'].'"',
            'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
        ]);
    }

    public function validateFile(ValidateSubjectImportFileRequest $request)
    {
        $this->applyImportRuntimeLimits();

        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (! $profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        if (! $this->userCanImport($user)) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $organizationId = $profile->organization_id;
        $schoolId = $this->getCurrentSchoolId($request);
        $file = $request->file('file');
        if (! $file) {
            return response()->json(['error' => 'File is required'], 422);
        }

        try {
            $parsed = $this->importService->parse($file);
            $result = $this->importService->validateImport($parsed, $organizationId, $schoolId);

            return response()->json([
                'meta' => $parsed['meta'],
                'result' => $result,
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            Log::error('Subject import validation failed: '.$e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json(['error' => 'Failed to validate import file'], 500);
        }
    }

    public function commit(CommitSubjectImportFileRequest $request)
    {
        $this->applyImportRuntimeLimits();

        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (! $profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        if (! $this->userCanImport($user)) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $organizationId = $profile->organization_id;
        $schoolId = $this->getCurrentSchoolId($request);
        $file = $request->file('file');
        if (! $file) {
            return response()->json(['error' => 'File is required'], 422);
        }

        try {
            $storedPath = $file->store('imports/subject-import', 'local');
            if (! is_string($storedPath) || trim($storedPath) === '') {
                return response()->json(['error' => 'Failed to queue import file'], 500);
            }

            $jobId = (string) Str::uuid();
            $statusPayload = [
                'job_id' => $jobId,
                'status' => 'queued',
                'organization_id' => $organizationId,
                'user_id' => (string) $user->id,
                'created_subjects' => 0,
                'skipped_subjects' => 0,
                'created_templates' => 0,
                'skipped_templates' => 0,
                'created_class_subjects' => 0,
                'skipped_class_subjects' => 0,
                'updated_at' => now()->toIso8601String(),
            ];
            Cache::put($this->statusKey($jobId), $statusPayload, now()->addHours(6));

            if ($this->shouldDispatchAfterResponse()) {
                SubjectImportCommitJob::dispatchAfterResponse(
                    $jobId,
                    $storedPath,
                    $organizationId,
                    $schoolId,
                    (string) $user->id
                );
            } else {
                SubjectImportCommitJob::dispatch(
                    $jobId,
                    $storedPath,
                    $organizationId,
                    $schoolId,
                    (string) $user->id
                );
            }

            return response()->json([
                'accepted' => true,
                'job_id' => $jobId,
                'status' => 'queued',
                'message' => 'Subject import has been queued',
            ], 202);
        } catch (\Exception $e) {
            Log::error('Subject import queue dispatch failed: '.$e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json(['error' => 'Failed to queue subject import'], 500);
        }
    }

    public function commitStatus(Request $request, string $jobId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (! $profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        if (! $this->userCanImport($user)) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $status = Cache::get($this->statusKey($jobId));
        if (! is_array($status)) {
            return response()->json(['error' => 'Import job not found or expired'], 404);
        }

        $jobOrgId = (string) ($status['organization_id'] ?? '');
        if ($jobOrgId !== (string) $profile->organization_id) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        return response()->json([
            'job_id' => $jobId,
            'status' => $status['status'] ?? 'queued',
            'created_subjects' => (int) ($status['created_subjects'] ?? 0),
            'skipped_subjects' => (int) ($status['skipped_subjects'] ?? 0),
            'created_templates' => (int) ($status['created_templates'] ?? 0),
            'skipped_templates' => (int) ($status['skipped_templates'] ?? 0),
            'created_class_subjects' => (int) ($status['created_class_subjects'] ?? 0),
            'skipped_class_subjects' => (int) ($status['skipped_class_subjects'] ?? 0),
            'error' => $status['error'] ?? null,
            'message' => $status['message'] ?? null,
            'updated_at' => $status['updated_at'] ?? null,
        ]);
    }

    private function userCanImport($user): bool
    {
        try {
            return $user->hasPermissionTo('subjects.create');
        } catch (\Exception $e) {
            Log::warning('Permission check failed for subjects.create (subject import): '.$e->getMessage());

            return false;
        }
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

    private function statusKey(string $jobId): string
    {
        return "subject_import_job:{$jobId}";
    }

    private function shouldDispatchAfterResponse(): bool
    {
        $queueConnection = (string) config('queue.default', 'database');

        return $queueConnection === 'database' && app()->environment(['local', 'testing']);
    }
}
