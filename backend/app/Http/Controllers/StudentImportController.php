<?php

namespace App\Http\Controllers;

use App\Http\Requests\StudentImport\CommitStudentImportFileRequest;
use App\Http\Requests\StudentImport\DownloadStudentImportTemplateRequest;
use App\Http\Requests\StudentImport\ValidateStudentImportFileRequest;
use App\Services\Imports\StudentImportService;
use App\Services\Imports\StudentImportXlsxService;
use App\Services\Subscription\UsageTrackingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

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
            $limitCheck = $this->usageTrackingService->canCreate($organizationId, 'students');
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
                    $limitCheck = $this->usageTrackingService->canCreate($organizationId, 'students');
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

            // Count total students that will be created
            $totalStudentsToCreate = 0;
            foreach (($parsed['sheets'] ?? []) as $sheet) {
                $rows = is_array($sheet['rows'] ?? null) ? $sheet['rows'] : [];
                // Count only valid rows (rows that passed validation)
                foreach ($rows as $row) {
                    // Check if row is in valid rows from validation result
                    $rowNumber = (int) ($row['__row'] ?? 0);
                    $isValid = true;
                    if (isset($validation['row_errors'])) {
                        foreach ($validation['row_errors'] as $error) {
                            if (isset($error['row']) && $error['row'] === $rowNumber) {
                                $isValid = false;
                                break;
                            }
                        }
                    }
                    if ($isValid) {
                        $totalStudentsToCreate++;
                    }
                }
            }

            // Check subscription limit for bulk import
            if ($totalStudentsToCreate > 0) {
                try {
                    $limitCheck = $this->usageTrackingService->canCreate($organizationId, 'students');
                    $remaining = $limitCheck['limit'] === -1 ? -1 : max(0, $limitCheck['remaining']);
                    
                    if ($limitCheck['limit'] !== -1 && $remaining !== -1 && $totalStudentsToCreate > $remaining) {
                        return response()->json([
                            'error' => "Cannot import {$totalStudentsToCreate} students. Only {$remaining} student slots remaining. Please reduce the number of students or upgrade your plan.",
                            'code' => 'LIMIT_REACHED',
                            'resource_key' => 'students',
                            'total_students' => $totalStudentsToCreate,
                            'current' => $limitCheck['current'],
                            'limit' => $limitCheck['limit'],
                            'remaining' => $remaining,
                            'upgrade_required' => true,
                        ], 402);
                    }
                } catch (\Exception $e) {
                    Log::warning("Failed to check student limit during import commit: " . $e->getMessage());
                    // Continue with import even if limit check fails (graceful degradation)
                }
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


