<?php

namespace App\Http\Controllers;

use App\Http\Requests\StudentImport\CommitStudentImportFileRequest;
use App\Http\Requests\StudentImport\DownloadStudentImportTemplateRequest;
use App\Http\Requests\StudentImport\ValidateStudentImportFileRequest;
use App\Services\Imports\StudentImportService;
use App\Services\Imports\StudentImportXlsxService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class StudentImportController extends Controller
{
    public function __construct(
        private StudentImportXlsxService $xlsxService,
        private StudentImportService $importService
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

        try {
            $parsed = $this->importService->parse($file);
            $result = $this->importService->validateImport($parsed, $organizationId);
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
            $parsed = $this->importService->parse($file);
            $validation = $this->importService->validateImport($parsed, $organizationId);
            if (!($validation['is_valid'] ?? false)) {
                return response()->json([
                    'error' => 'Validation failed',
                    'meta' => $parsed['meta'],
                    'result' => $validation,
                ], 422);
            }

            $commitResult = $this->importService->commit($parsed, $organizationId, $schoolId);

            return response()->json([
                'success' => true,
                'created_students' => $commitResult['created_students'],
                'created_admissions' => $commitResult['created_admissions'],
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            Log::error('Student import commit failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['error' => 'Failed to import students'], 500);
        }
    }
}


