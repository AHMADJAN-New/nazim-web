<?php

namespace App\Services\Storage;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * File Migration Service
 * 
 * Migrates existing files from old storage structure to new standardized structure:
 * Old: {org_id}/students/{id}/pictures/{file}
 * New: organizations/{org_id}/schools/{school_id}/students/{id}/pictures/{uuid}.{ext}
 */
class FileMigrationService
{
    public function __construct(
        private FileStorageService $fileStorageService
    ) {}

    /**
     * Migrate all files for an organization
     */
    public function migrateOrganization(string $organizationId, bool $dryRun = false): array
    {
        $results = [
            'students' => $this->migrateStudentFiles($organizationId, $dryRun),
            'staff' => $this->migrateStaffFiles($organizationId, $dryRun),
            'courses' => $this->migrateCourseFiles($organizationId, $dryRun),
            'dms' => $this->migrateDmsFiles($organizationId, $dryRun),
            'templates' => $this->migrateTemplateFiles($organizationId, $dryRun),
            'reports' => $this->migrateReportFiles($organizationId, $dryRun),
        ];

        return $results;
    }

    /**
     * Migrate student files
     */
    public function migrateStudentFiles(string $organizationId, bool $dryRun = false): array
    {
        $migrated = 0;
        $errors = 0;
        $skipped = 0;

        // Find all students with picture_path
        $students = DB::table('students')
            ->where('organization_id', $organizationId)
            ->whereNotNull('picture_path')
            ->whereNull('deleted_at')
            ->get();

        foreach ($students as $student) {
            try {
                $oldPath = $student->picture_path;
                
                // Skip if already in new format
                if (str_starts_with($oldPath, 'organizations/')) {
                    $skipped++;
                    continue;
                }

                // Check if file exists
                if (!Storage::disk('local')->exists($oldPath)) {
                    Log::warning("Student picture file not found", [
                        'student_id' => $student->id,
                        'old_path' => $oldPath,
                    ]);
                    $skipped++;
                    continue;
                }

                if (!$dryRun) {
                    // Read file content
                    $fileContent = Storage::disk('local')->get($oldPath);
                    
                    // Determine extension from old path
                    $extension = pathinfo($oldPath, PATHINFO_EXTENSION);
                    $newFilename = Str::uuid() . '.' . $extension;
                    
                    // Build new path
                    $newPath = $this->buildPath(
                        $organizationId,
                        $student->school_id,
                        'students',
                        $student->id,
                        'pictures'
                    );
                    $newFullPath = $newPath . '/' . $newFilename;

                    // Store in new location
                    Storage::disk('local')->put($newFullPath, $fileContent);

                    // Update database
                    DB::table('students')
                        ->where('id', $student->id)
                        ->update(['picture_path' => $newFullPath]);

                    // Delete old file (optional - can be done later)
                    // Storage::disk('local')->delete($oldPath);
                }

                $migrated++;
            } catch (\Exception $e) {
                Log::error("Failed to migrate student picture", [
                    'student_id' => $student->id,
                    'error' => $e->getMessage(),
                ]);
                $errors++;
            }
        }

        return [
            'migrated' => $migrated,
            'errors' => $errors,
            'skipped' => $skipped,
        ];
    }

    /**
     * Migrate staff files
     */
    public function migrateStaffFiles(string $organizationId, bool $dryRun = false): array
    {
        $migrated = 0;
        $errors = 0;
        $skipped = 0;

        // Find all staff with picture_url (public disk)
        $staff = DB::table('staff')
            ->where('organization_id', $organizationId)
            ->whereNotNull('picture_url')
            ->whereNull('deleted_at')
            ->get();

        foreach ($staff as $staffMember) {
            try {
                $oldPath = 'staff-files/' . $organizationId . '/' . ($staffMember->school_id ? $staffMember->school_id . '/' : '') . $staffMember->id . '/picture/' . $staffMember->picture_url;
                
                // Skip if already in new format
                if (str_starts_with($oldPath, 'organizations/')) {
                    $skipped++;
                    continue;
                }

                // Check if file exists on public disk
                if (!Storage::disk('public')->exists($oldPath)) {
                    Log::warning("Staff picture file not found", [
                        'staff_id' => $staffMember->id,
                        'old_path' => $oldPath,
                    ]);
                    $skipped++;
                    continue;
                }

                if (!$dryRun) {
                    // Read file content
                    $fileContent = Storage::disk('public')->get($oldPath);
                    
                    // Determine extension
                    $extension = pathinfo($staffMember->picture_url, PATHINFO_EXTENSION);
                    $newFilename = Str::uuid() . '.' . $extension;
                    
                    // Build new path (public disk for staff pictures)
                    $newPath = "organizations/{$organizationId}/schools/{$staffMember->school_id}/staff/{$staffMember->id}/pictures";
                    $newFullPath = $newPath . '/' . $newFilename;

                    // Store in new location (public disk)
                    Storage::disk('public')->put($newFullPath, $fileContent);

                    // Update database
                    DB::table('staff')
                        ->where('id', $staffMember->id)
                        ->update(['picture_url' => $newFilename]);
                }

                $migrated++;
            } catch (\Exception $e) {
                Log::error("Failed to migrate staff picture", [
                    'staff_id' => $staffMember->id,
                    'error' => $e->getMessage(),
                ]);
                $errors++;
            }
        }

        return [
            'migrated' => $migrated,
            'errors' => $errors,
            'skipped' => $skipped,
        ];
    }

    /**
     * Migrate course document files
     */
    public function migrateCourseFiles(string $organizationId, bool $dryRun = false): array
    {
        $migrated = 0;
        $errors = 0;
        $skipped = 0;

        $documents = DB::table('course_documents')
            ->where('organization_id', $organizationId)
            ->whereNotNull('file_path')
            ->whereNull('deleted_at')
            ->get();

        foreach ($documents as $document) {
            try {
                $oldPath = $document->file_path;
                
                // Skip if already in new format
                if (str_starts_with($oldPath, 'organizations/')) {
                    $skipped++;
                    continue;
                }

                // Check if file exists
                if (!Storage::disk('local')->exists($oldPath)) {
                    $skipped++;
                    continue;
                }

                if (!$dryRun) {
                    $fileContent = Storage::disk('local')->get($oldPath);
                    $extension = pathinfo($oldPath, PATHINFO_EXTENSION);
                    $newFilename = Str::uuid() . '.' . $extension;
                    
                    // Get course to find school_id
                    $course = DB::table('short_term_courses')
                        ->where('id', $document->course_id)
                        ->first();
                    
                    $newPath = "organizations/{$organizationId}/schools/{$course->school_id}/courses/{$document->course_id}/documents/{$document->document_type}";
                    $newFullPath = $newPath . '/' . $newFilename;

                    Storage::disk('local')->put($newFullPath, $fileContent);

                    DB::table('course_documents')
                        ->where('id', $document->id)
                        ->update(['file_path' => $newFullPath]);
                }

                $migrated++;
            } catch (\Exception $e) {
                Log::error("Failed to migrate course document", [
                    'document_id' => $document->id,
                    'error' => $e->getMessage(),
                ]);
                $errors++;
            }
        }

        return [
            'migrated' => $migrated,
            'errors' => $errors,
            'skipped' => $skipped,
        ];
    }

    /**
     * Migrate DMS files
     */
    public function migrateDmsFiles(string $organizationId, bool $dryRun = false): array
    {
        $migrated = 0;
        $errors = 0;
        $skipped = 0;

        $files = DB::table('document_files')
            ->where('organization_id', $organizationId)
            ->whereNotNull('storage_path')
            ->get();

        foreach ($files as $file) {
            try {
                $oldPath = $file->storage_path;
                
                // Skip if already in new format
                if (str_starts_with($oldPath, 'organizations/')) {
                    $skipped++;
                    continue;
                }

                if (!Storage::disk('local')->exists($oldPath)) {
                    $skipped++;
                    continue;
                }

                if (!$dryRun) {
                    // Get document to find school_id
                    $document = DB::table($file->owner_type === 'incoming' ? 'incoming_documents' : 'outgoing_documents')
                        ->where('id', $file->owner_id)
                        ->first();
                    
                    if (!$document) {
                        $skipped++;
                        continue;
                    }

                    $fileContent = Storage::disk('local')->get($oldPath);
                    $extension = pathinfo($oldPath, PATHINFO_EXTENSION);
                    $newFilename = Str::uuid() . '_' . basename($file->original_name);
                    
                    $newPath = "organizations/{$organizationId}/schools/{$document->school_id}/dms/{$file->owner_type}/{$file->owner_id}/files";
                    $newFullPath = $newPath . '/' . $newFilename;

                    Storage::disk('local')->put($newFullPath, $fileContent);

                    DB::table('document_files')
                        ->where('id', $file->id)
                        ->update(['storage_path' => $newFullPath]);
                }

                $migrated++;
            } catch (\Exception $e) {
                Log::error("Failed to migrate DMS file", [
                    'file_id' => $file->id,
                    'error' => $e->getMessage(),
                ]);
                $errors++;
            }
        }

        return [
            'migrated' => $migrated,
            'errors' => $errors,
            'skipped' => $skipped,
        ];
    }

    /**
     * Migrate template files
     */
    public function migrateTemplateFiles(string $organizationId, bool $dryRun = false): array
    {
        $migrated = 0;
        $errors = 0;
        $skipped = 0;

        // ID Card Templates
        $idCardTemplates = DB::table('id_card_templates')
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->get();

        foreach ($idCardTemplates as $template) {
            try {
                if ($template->background_image_path_front) {
                    $migrated += $this->migrateTemplateFile(
                        $template->background_image_path_front,
                        $organizationId,
                        $template->school_id,
                        'id-cards',
                        $template->id,
                        'background_front',
                        $dryRun
                    ) ? 1 : 0;
                }
                if ($template->background_image_path_back) {
                    $migrated += $this->migrateTemplateFile(
                        $template->background_image_path_back,
                        $organizationId,
                        $template->school_id,
                        'id-cards',
                        $template->id,
                        'background_back',
                        $dryRun
                    ) ? 1 : 0;
                }
            } catch (\Exception $e) {
                $errors++;
            }
        }

        // Certificate Templates
        $certTemplates = DB::table('certificate_templates')
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->get();

        foreach ($certTemplates as $template) {
            try {
                if ($template->background_image_path) {
                    $migrated += $this->migrateTemplateFile(
                        $template->background_image_path,
                        $organizationId,
                        $template->school_id,
                        'certificates',
                        $template->id,
                        'background',
                        $dryRun
                    ) ? 1 : 0;
                }
            } catch (\Exception $e) {
                $errors++;
            }
        }

        return [
            'migrated' => $migrated,
            'errors' => $errors,
            'skipped' => $skipped,
        ];
    }

    /**
     * Migrate a single template file
     */
    private function migrateTemplateFile(
        string $oldPath,
        string $organizationId,
        ?string $schoolId,
        string $templateType,
        string $templateId,
        string $side,
        bool $dryRun
    ): bool {
        if (str_starts_with($oldPath, 'organizations/')) {
            return false; // Already migrated
        }

        if (!Storage::disk('local')->exists($oldPath)) {
            return false;
        }

        if ($dryRun) {
            return true;
        }

        $fileContent = Storage::disk('local')->get($oldPath);
        $extension = pathinfo($oldPath, PATHINFO_EXTENSION);
        $newFilename = "background_{$side}.{$extension}";
        
        $newPath = "organizations/{$organizationId}/schools/{$schoolId}/templates/{$templateType}/{$templateId}";
        $newFullPath = $newPath . '/' . $newFilename;

        Storage::disk('local')->put($newFullPath, $fileContent);

        // Update appropriate table
        if ($templateType === 'id-cards') {
            $column = $side === 'background_front' ? 'background_image_path_front' : 'background_image_path_back';
            DB::table('id_card_templates')
                ->where('id', $templateId)
                ->update([$column => $newFullPath]);
        } else {
            DB::table('certificate_templates')
                ->where('id', $templateId)
                ->update(['background_image_path' => $newFullPath]);
        }

        return true;
    }

    /**
     * Migrate report files
     */
    public function migrateReportFiles(string $organizationId, bool $dryRun = false): array
    {
        $migrated = 0;
        $errors = 0;
        $skipped = 0;

        $reports = DB::table('report_runs')
            ->where('organization_id', $organizationId)
            ->whereNotNull('output_path')
            ->get();

        foreach ($reports as $report) {
            try {
                $oldPath = $report->output_path;
                
                if (str_starts_with($oldPath, 'organizations/')) {
                    $skipped++;
                    continue;
                }

                if (!Storage::disk('local')->exists($oldPath)) {
                    $skipped++;
                    continue;
                }

                if (!$dryRun) {
                    $fileContent = Storage::disk('local')->get($oldPath);
                    $filename = basename($oldPath);
                    
                    // Get school_id from branding_id
                    $schoolId = $report->branding_id;
                    $reportKey = $report->report_key ?? 'general';
                    
                    $newPath = "organizations/{$organizationId}/schools/{$schoolId}/reports/{$reportKey}";
                    $newFullPath = $newPath . '/' . $filename;

                    Storage::disk('local')->put($newFullPath, $fileContent);

                    DB::table('report_runs')
                        ->where('id', $report->id)
                        ->update(['output_path' => $newFullPath]);
                }

                $migrated++;
            } catch (\Exception $e) {
                $errors++;
            }
        }

        return [
            'migrated' => $migrated,
            'errors' => $errors,
            'skipped' => $skipped,
        ];
    }

    /**
     * Helper method to build path
     */
    private function buildPath(string $organizationId, ?string $schoolId, string ...$segments): string
    {
        $path = "organizations/{$organizationId}";
        if ($schoolId) {
            $path .= "/schools/{$schoolId}";
        }
        foreach ($segments as $segment) {
            if (!empty($segment)) {
                $path .= "/{$segment}";
            }
        }
        return $path;
    }
}
