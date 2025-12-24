<?php

namespace App\Services\Storage;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * File Migration Service
 *
 * Migrates existing files from old path structure to new standardized structure.
 * Handles path mapping and database record updates.
 */
class FileMigrationService
{
    public function __construct(
        private FileStorageService $fileStorageService
    ) {}

    /**
     * Migrate all file types
     */
    public function migrateAll(bool $dryRun = false): array
    {
        $results = [
            'students' => $this->migrateStudentFiles($dryRun),
            'staff' => $this->migrateStaffFiles($dryRun),
            'courses' => $this->migrateCourseDocuments($dryRun),
            'dms' => $this->migrateDmsFiles($dryRun),
            'id_card_templates' => $this->migrateIdCardTemplates($dryRun),
            'certificate_templates' => $this->migrateCertificateTemplates($dryRun),
        ];

        return $results;
    }

    /**
     * Migrate student pictures and documents
     */
    public function migrateStudentFiles(bool $dryRun = false, ?string $organizationId = null): array
    {
        $migrated = 0;
        $failed = 0;
        $skipped = 0;
        $errors = [];

        $query = DB::table('students')->whereNull('deleted_at');
        if ($organizationId) {
            $query->where('organization_id', $organizationId);
        }

        $students = $query->get();

        foreach ($students as $student) {
            // Migrate picture
            if ($student->picture_path) {
                $result = $this->migrateFile(
                    $student->picture_path,
                    'students',
                    $student->id,
                    'pictures',
                    $student->organization_id,
                    $student->school_id,
                    $dryRun
                );

                if ($result['status'] === 'migrated') {
                    if (!$dryRun) {
                        DB::table('students')
                            ->where('id', $student->id)
                            ->update(['picture_path' => $result['new_path']]);
                    }
                    $migrated++;
                } elseif ($result['status'] === 'skipped') {
                    $skipped++;
                } else {
                    $failed++;
                    $errors[] = "Student {$student->id}: {$result['error']}";
                }
            }
        }

        // Migrate student documents
        $query = DB::table('student_documents')->whereNull('deleted_at');
        if ($organizationId) {
            $query->where('organization_id', $organizationId);
        }

        $documents = $query->get();

        foreach ($documents as $doc) {
            if ($doc->file_path) {
                $result = $this->migrateFile(
                    $doc->file_path,
                    'students',
                    $doc->student_id,
                    'documents/' . ($doc->document_type ?? 'general'),
                    $doc->organization_id,
                    $doc->school_id,
                    $dryRun
                );

                if ($result['status'] === 'migrated') {
                    if (!$dryRun) {
                        DB::table('student_documents')
                            ->where('id', $doc->id)
                            ->update(['file_path' => $result['new_path']]);
                    }
                    $migrated++;
                } elseif ($result['status'] === 'skipped') {
                    $skipped++;
                } else {
                    $failed++;
                    $errors[] = "StudentDocument {$doc->id}: {$result['error']}";
                }
            }
        }

        return [
            'migrated' => $migrated,
            'failed' => $failed,
            'skipped' => $skipped,
            'errors' => $errors,
        ];
    }

    /**
     * Migrate staff pictures and documents
     */
    public function migrateStaffFiles(bool $dryRun = false, ?string $organizationId = null): array
    {
        $migrated = 0;
        $failed = 0;
        $skipped = 0;
        $errors = [];

        $query = DB::table('staff')->whereNull('deleted_at');
        if ($organizationId) {
            $query->where('organization_id', $organizationId);
        }

        $staffMembers = $query->get();

        foreach ($staffMembers as $staff) {
            // Migrate picture (to public disk)
            if ($staff->picture_url) {
                $result = $this->migrateFile(
                    $staff->picture_url,
                    'staff',
                    $staff->id,
                    'pictures',
                    $staff->organization_id,
                    $staff->school_id,
                    $dryRun,
                    'public'
                );

                if ($result['status'] === 'migrated') {
                    if (!$dryRun) {
                        DB::table('staff')
                            ->where('id', $staff->id)
                            ->update(['picture_url' => $result['new_path']]);
                    }
                    $migrated++;
                } elseif ($result['status'] === 'skipped') {
                    $skipped++;
                } else {
                    $failed++;
                    $errors[] = "Staff {$staff->id}: {$result['error']}";
                }
            }
        }

        // Migrate staff documents
        $query = DB::table('staff_documents')->whereNull('deleted_at');
        if ($organizationId) {
            $query->where('organization_id', $organizationId);
        }

        $documents = $query->get();

        foreach ($documents as $doc) {
            if ($doc->file_path) {
                $result = $this->migrateFile(
                    $doc->file_path,
                    'staff',
                    $doc->staff_id,
                    'documents/' . ($doc->document_type ?? 'general'),
                    $doc->organization_id,
                    $doc->school_id,
                    $dryRun
                );

                if ($result['status'] === 'migrated') {
                    if (!$dryRun) {
                        DB::table('staff_documents')
                            ->where('id', $doc->id)
                            ->update(['file_path' => $result['new_path']]);
                    }
                    $migrated++;
                } elseif ($result['status'] === 'skipped') {
                    $skipped++;
                } else {
                    $failed++;
                    $errors[] = "StaffDocument {$doc->id}: {$result['error']}";
                }
            }
        }

        return [
            'migrated' => $migrated,
            'failed' => $failed,
            'skipped' => $skipped,
            'errors' => $errors,
        ];
    }

    /**
     * Migrate course documents
     */
    public function migrateCourseDocuments(bool $dryRun = false, ?string $organizationId = null): array
    {
        $migrated = 0;
        $failed = 0;
        $skipped = 0;
        $errors = [];

        $query = DB::table('course_documents')->whereNull('deleted_at');
        if ($organizationId) {
            $query->where('organization_id', $organizationId);
        }

        $documents = $query->get();

        foreach ($documents as $doc) {
            if ($doc->file_path) {
                // Get school_id from course if available
                $course = DB::table('short_term_courses')
                    ->where('id', $doc->course_id)
                    ->first();

                $result = $this->migrateFile(
                    $doc->file_path,
                    'courses',
                    $doc->course_id,
                    $doc->document_type ?? 'documents',
                    $doc->organization_id,
                    $course->school_id ?? null,
                    $dryRun
                );

                if ($result['status'] === 'migrated') {
                    if (!$dryRun) {
                        DB::table('course_documents')
                            ->where('id', $doc->id)
                            ->update(['file_path' => $result['new_path']]);
                    }
                    $migrated++;
                } elseif ($result['status'] === 'skipped') {
                    $skipped++;
                } else {
                    $failed++;
                    $errors[] = "CourseDocument {$doc->id}: {$result['error']}";
                }
            }
        }

        return [
            'migrated' => $migrated,
            'failed' => $failed,
            'skipped' => $skipped,
            'errors' => $errors,
        ];
    }

    /**
     * Migrate DMS document files
     */
    public function migrateDmsFiles(bool $dryRun = false, ?string $organizationId = null): array
    {
        $migrated = 0;
        $failed = 0;
        $skipped = 0;
        $errors = [];

        $query = DB::table('document_files');
        if ($organizationId) {
            $query->where('organization_id', $organizationId);
        }

        $files = $query->get();

        foreach ($files as $file) {
            if ($file->storage_path) {
                $result = $this->migrateFile(
                    $file->storage_path,
                    'dms',
                    $file->owner_type . '/' . $file->owner_id,
                    'files',
                    $file->organization_id,
                    $file->school_id,
                    $dryRun
                );

                if ($result['status'] === 'migrated') {
                    if (!$dryRun) {
                        DB::table('document_files')
                            ->where('id', $file->id)
                            ->update(['storage_path' => $result['new_path']]);
                    }
                    $migrated++;
                } elseif ($result['status'] === 'skipped') {
                    $skipped++;
                } else {
                    $failed++;
                    $errors[] = "DocumentFile {$file->id}: {$result['error']}";
                }
            }
        }

        return [
            'migrated' => $migrated,
            'failed' => $failed,
            'skipped' => $skipped,
            'errors' => $errors,
        ];
    }

    /**
     * Migrate ID card templates
     */
    public function migrateIdCardTemplates(bool $dryRun = false, ?string $organizationId = null): array
    {
        $migrated = 0;
        $failed = 0;
        $skipped = 0;
        $errors = [];

        $query = DB::table('id_card_templates')->whereNull('deleted_at');
        if ($organizationId) {
            $query->where('organization_id', $organizationId);
        }

        $templates = $query->get();

        foreach ($templates as $template) {
            // Migrate front background
            if ($template->background_image_path_front) {
                $result = $this->migrateFile(
                    $template->background_image_path_front,
                    'templates',
                    'id-cards',
                    null,
                    $template->organization_id,
                    $template->school_id,
                    $dryRun
                );

                if ($result['status'] === 'migrated') {
                    if (!$dryRun) {
                        DB::table('id_card_templates')
                            ->where('id', $template->id)
                            ->update(['background_image_path_front' => $result['new_path']]);
                    }
                    $migrated++;
                } elseif ($result['status'] === 'skipped') {
                    $skipped++;
                } else {
                    $failed++;
                    $errors[] = "IdCardTemplate {$template->id} (front): {$result['error']}";
                }
            }

            // Migrate back background
            if ($template->background_image_path_back) {
                $result = $this->migrateFile(
                    $template->background_image_path_back,
                    'templates',
                    'id-cards',
                    null,
                    $template->organization_id,
                    $template->school_id,
                    $dryRun
                );

                if ($result['status'] === 'migrated') {
                    if (!$dryRun) {
                        DB::table('id_card_templates')
                            ->where('id', $template->id)
                            ->update(['background_image_path_back' => $result['new_path']]);
                    }
                    $migrated++;
                } elseif ($result['status'] === 'skipped') {
                    $skipped++;
                } else {
                    $failed++;
                    $errors[] = "IdCardTemplate {$template->id} (back): {$result['error']}";
                }
            }
        }

        return [
            'migrated' => $migrated,
            'failed' => $failed,
            'skipped' => $skipped,
            'errors' => $errors,
        ];
    }

    /**
     * Migrate certificate templates
     */
    public function migrateCertificateTemplates(bool $dryRun = false, ?string $organizationId = null): array
    {
        $migrated = 0;
        $failed = 0;
        $skipped = 0;
        $errors = [];

        $query = DB::table('certificate_templates')->whereNull('deleted_at');
        if ($organizationId) {
            $query->where('organization_id', $organizationId);
        }

        $templates = $query->get();

        foreach ($templates as $template) {
            if ($template->background_image_path) {
                $result = $this->migrateFile(
                    $template->background_image_path,
                    'templates',
                    'certificates',
                    null,
                    $template->organization_id,
                    $template->school_id,
                    $dryRun
                );

                if ($result['status'] === 'migrated') {
                    if (!$dryRun) {
                        DB::table('certificate_templates')
                            ->where('id', $template->id)
                            ->update(['background_image_path' => $result['new_path']]);
                    }
                    $migrated++;
                } elseif ($result['status'] === 'skipped') {
                    $skipped++;
                } else {
                    $failed++;
                    $errors[] = "CertificateTemplate {$template->id}: {$result['error']}";
                }
            }
        }

        return [
            'migrated' => $migrated,
            'failed' => $failed,
            'skipped' => $skipped,
            'errors' => $errors,
        ];
    }

    /**
     * Migrate a single file from old path to new standardized path
     */
    private function migrateFile(
        string $oldPath,
        string $resourceType,
        string $resourceId,
        ?string $subPath,
        string $organizationId,
        ?string $schoolId,
        bool $dryRun,
        string $disk = 'local'
    ): array {
        // Skip if already in new format
        if (str_starts_with($oldPath, 'organizations/')) {
            return ['status' => 'skipped', 'reason' => 'Already in new format'];
        }

        // Check if old file exists
        if (!Storage::disk($disk)->exists($oldPath)) {
            return ['status' => 'failed', 'error' => 'Source file not found'];
        }

        try {
            // Build new path
            $newPath = "organizations/{$organizationId}";
            if ($schoolId) {
                $newPath .= "/schools/{$schoolId}";
            }
            $newPath .= "/{$resourceType}/{$resourceId}";
            if ($subPath) {
                $newPath .= "/{$subPath}";
            }

            // Generate new filename with UUID
            $extension = pathinfo($oldPath, PATHINFO_EXTENSION);
            $filename = Str::uuid() . '.' . $extension;
            $newPath .= '/' . $filename;

            if ($dryRun) {
                return [
                    'status' => 'migrated',
                    'old_path' => $oldPath,
                    'new_path' => $newPath,
                    'dry_run' => true,
                ];
            }

            // Copy file to new location
            $contents = Storage::disk($disk)->get($oldPath);
            Storage::disk($disk)->put($newPath, $contents);

            // Verify new file exists
            if (!Storage::disk($disk)->exists($newPath)) {
                return ['status' => 'failed', 'error' => 'Failed to copy file to new location'];
            }

            Log::info('File migrated successfully', [
                'old_path' => $oldPath,
                'new_path' => $newPath,
                'disk' => $disk,
            ]);

            return [
                'status' => 'migrated',
                'old_path' => $oldPath,
                'new_path' => $newPath,
            ];
        } catch (\Exception $e) {
            Log::error('File migration failed', [
                'old_path' => $oldPath,
                'error' => $e->getMessage(),
            ]);
            return ['status' => 'failed', 'error' => $e->getMessage()];
        }
    }

    /**
     * Cleanup old files after successful migration
     * This should be run separately after verifying migration was successful
     */
    public function cleanupOldFiles(array $migratedPaths, string $disk = 'local'): array
    {
        $deleted = 0;
        $failed = 0;
        $errors = [];

        foreach ($migratedPaths as $path) {
            try {
                if (Storage::disk($disk)->exists($path)) {
                    Storage::disk($disk)->delete($path);
                    $deleted++;
                }
            } catch (\Exception $e) {
                $failed++;
                $errors[] = "{$path}: {$e->getMessage()}";
            }
        }

        return [
            'deleted' => $deleted,
            'failed' => $failed,
            'errors' => $errors,
        ];
    }
}
