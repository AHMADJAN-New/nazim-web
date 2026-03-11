<?php

namespace App\Http\Controllers;

use App\Http\Requests\StudentImport\CommitStudentImportFileRequest;
use App\Http\Requests\StudentImport\DownloadStudentImportTemplateRequest;
use App\Http\Requests\StudentImport\ValidateStudentImportFileRequest;
use App\Jobs\StudentImportCommitJob;
use App\Services\Imports\StudentImportService;
use App\Services\Imports\StudentImportXlsxService;
use App\Services\Subscription\UsageTrackingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class StudentImportController extends Controller
{
    public function __construct(
        private StudentImportXlsxService $xlsxService,
        private StudentImportService $importService,
        private UsageTrackingService $usageTrackingService
    ) {}

    public function downloadTemplate(DownloadStudentImportTemplateRequest $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('students.import')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for students.import: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $organizationId = $profile->organization_id;
        $schoolId = $this->getCurrentSchoolId($request);

        $spec = $request->validated();

        $xlsx = $this->xlsxService->generateTemplate($spec, $organizationId, $schoolId);

        return response($xlsx['content'], 200, [
            'Content-Type' => $xlsx['mime'],
            'Content-Disposition' => 'attachment; filename="' . $xlsx['filename'] . '"',
            'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
        ]);
    }

    public function validateFile(ValidateStudentImportFileRequest $request)
    {
        $this->applyImportRuntimeLimits();

        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('students.import')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for students.import: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $organizationId = $profile->organization_id;
        $file = $request->file('file');
        if (!$file) {
            return response()->json(['error' => 'File is required'], 422);
        }

        // Check subscription limit before parsing file
        try {
            // Force fresh count for import checks so large imports use precise current usage.
            $limitCheck = $this->usageTrackingService->canCreate($organizationId, 'students', true);
            if (!$limitCheck['allowed']) {
                return response()->json([
                    'error' => $limitCheck['message'] ?? 'Student limit reached',
                    'code' => 'LIMIT_REACHED',
                    'resource_key' => 'students',
                    'current' => $limitCheck['current'],
                    'limit' => $limitCheck['limit'],
                    'remaining' => $limitCheck['remaining'],
                    'upgrade_required' => true,
                ], 402);
            }
        } catch (\Exception $e) {
            Log::warning("Failed to check student limit during import validation: " . $e->getMessage());
            // Continue with validation even if limit check fails (graceful degradation)
        }

        try {
            $parsed = $this->importService->parse($file);
            $result = $this->importService->validateImport($parsed, $organizationId);
            
            // Check if the number of students in the import would exceed the limit
            $totalRows = 0;
            foreach (($parsed['sheets'] ?? []) as $sheet) {
                $rows = is_array($sheet['rows'] ?? null) ? $sheet['rows'] : [];
                $totalRows += count($rows);
            }
            
            // Check if adding these students would exceed the limit
            if ($totalRows > 0) {
                try {
                    // Force fresh count to avoid stale cache during import planning.
                    $limitCheck = $this->usageTrackingService->canCreate($organizationId, 'students', true);
                    $remaining = $limitCheck['limit'] === -1 ? -1 : max(0, $limitCheck['remaining']);
                    
                    if ($limitCheck['limit'] !== -1 && $remaining !== -1 && $totalRows > $remaining) {
                        $result['limit_warning'] = [
                            'message' => "Import contains {$totalRows} students, but only {$remaining} slots remaining. Please reduce the number of students or upgrade your plan.",
                            'total_rows' => $totalRows,
                            'remaining' => $remaining,
                            'limit' => $limitCheck['limit'],
                            'current' => $limitCheck['current'],
                        ];
                    }
                } catch (\Exception $e) {
                    Log::warning("Failed to check student limit for import rows: " . $e->getMessage());
                }
            }
            
            return response()->json([
                'meta' => $parsed['meta'],
                'result' => $result,
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            Log::error('Student import validation failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['error' => 'Failed to validate import file'], 500);
        }
    }

    public function commit(CommitStudentImportFileRequest $request)
    {
        $this->applyImportRuntimeLimits();

        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('students.import')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for students.import: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $organizationId = $profile->organization_id;
        $schoolId = $this->getCurrentSchoolId($request);
        $file = $request->file('file');
        if (!$file) {
            return response()->json(['error' => 'File is required'], 422);
        }

        try {
            $storedPath = $file->store('imports/student-import', 'local');
            if (!is_string($storedPath) || trim($storedPath) === '') {
                return response()->json(['error' => 'Failed to queue import file'], 500);
            }

            $jobId = (string) Str::uuid();
            $statusPayload = [
                'job_id' => $jobId,
                'status' => 'queued',
                'organization_id' => $organizationId,
                'user_id' => (string) $user->id,
                'created_students' => 0,
                'created_admissions' => 0,
                'updated_at' => now()->toIso8601String(),
            ];
            Cache::put($this->statusKey($jobId), $statusPayload, now()->addHours(6));

            StudentImportCommitJob::dispatch(
                $jobId,
                $storedPath,
                $organizationId,
                $schoolId,
                (string) $user->id
            );

            return response()->json([
                'accepted' => true,
                'job_id' => $jobId,
                'status' => 'queued',
                'message' => 'Student import has been queued',
            ], 202);
        } catch (\Exception $e) {
            Log::error('Student import queue dispatch failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['error' => 'Failed to queue student import'], 500);
        }
    }

    public function commitStatus(Request $request, string $jobId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('students.import')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for students.import: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $status = Cache::get($this->statusKey($jobId));
        if (!is_array($status)) {
            return response()->json(['error' => 'Import job not found or expired'], 404);
        }

        $jobOrgId = (string) ($status['organization_id'] ?? '');
        if ($jobOrgId !== (string) $profile->organization_id) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Backfill for older queue workers or transient failures:
        // if import is completed but usage was not recalculated, do it here once.
        if (($status['status'] ?? null) === 'completed' && !($status['usage_recalculated'] ?? false)) {
            try {
                $this->usageTrackingService->recalculateUsage((string) $profile->organization_id);
                $status['usage_recalculated'] = true;
                $status['usage_recalculated_at'] = now()->toIso8601String();
                Cache::put($this->statusKey($jobId), $status, now()->addHours(6));
            } catch (\Throwable $e) {
                Log::warning('Student import status usage recalculation retry failed: ' . $e->getMessage(), [
                    'job_id' => $jobId,
                    'organization_id' => (string) $profile->organization_id,
                    'trace' => $e->getTraceAsString(),
                ]);
            }
        }

        return response()->json([
            'job_id' => $jobId,
            'status' => $status['status'] ?? 'queued',
            'created_students' => (int) ($status['created_students'] ?? 0),
            'created_admissions' => (int) ($status['created_admissions'] ?? 0),
            'usage_recalculated' => (bool) ($status['usage_recalculated'] ?? false),
            'usage_recalculated_at' => $status['usage_recalculated_at'] ?? null,
            'error' => $status['error'] ?? null,
            'message' => $status['message'] ?? null,
            'updated_at' => $status['updated_at'] ?? null,
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

    private function statusKey(string $jobId): string
    {
        return "student_import_job:{$jobId}";
    }
}


