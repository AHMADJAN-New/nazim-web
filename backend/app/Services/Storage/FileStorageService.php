<?php

namespace App\Services\Storage;

use App\Services\Subscription\UsageTrackingService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Centralized File Storage Service
 *
 * Provides consistent file storage with:
 * - Standardized folder structure: organizations/{org_id}/schools/{school_id}/resource_type/...
 * - Public/Private disk separation
 * - UUID-based file naming
 * - School-scoped organization
 */
class FileStorageService
{
    // Storage disks
    private const DISK_PRIVATE = 'local';
    private const DISK_PUBLIC = 'public';

    public function __construct(
        private UsageTrackingService $usageTrackingService
    ) {}

    // Resource type paths
    private const PATH_STUDENTS = 'students';
    private const PATH_STAFF = 'staff';
    private const PATH_COURSES = 'courses';
    private const PATH_EXAMS = 'exams';
    private const PATH_DMS = 'dms';
    private const PATH_EVENTS = 'events';
    private const PATH_TEMPLATES = 'templates';
    private const PATH_REPORTS = 'reports';

    // ==============================================
    // STUDENT FILES
    // ==============================================

    /**
     * Store student picture (PRIVATE)
     * CRITICAL: Student files are school-scoped and MUST include schoolId
     */
    public function storeStudentPicture(
        UploadedFile $file,
        string $organizationId,
        string $studentId,
        string $schoolId
    ): string {
        // Check storage limit before storing
        $this->checkStorageLimit($file, $organizationId);

        $path = $this->buildPath($organizationId, $schoolId, self::PATH_STUDENTS, $studentId, 'pictures');
        $filePath = $this->storeFile($file, $path, self::DISK_PRIVATE);

        // Update storage usage after successful storage
        $this->updateStorageUsage($file, $organizationId);

        return $filePath;
    }

    /**
     * Store student document (PRIVATE)
     * CRITICAL: Student files are school-scoped and MUST include schoolId
     */
    public function storeStudentDocument(
        UploadedFile $file,
        string $organizationId,
        string $studentId,
        string $schoolId,
        ?string $documentType = null
    ): string {
        // Check storage limit before storing
        $this->checkStorageLimit($file, $organizationId);

        $subPath = $documentType ? "documents/{$documentType}" : 'documents';
        $path = $this->buildPath($organizationId, $schoolId, self::PATH_STUDENTS, $studentId, $subPath);
        $filePath = $this->storeFile($file, $path, self::DISK_PRIVATE);

        // Update storage usage after successful storage
        $this->updateStorageUsage($file, $organizationId);

        return $filePath;
    }

    // ==============================================
    // STAFF FILES
    // ==============================================

    /**
     * Store staff picture (PUBLIC - for display in UI)
     * CRITICAL: Staff files are school-scoped and MUST include schoolId
     */
    public function storeStaffPicturePublic(
        UploadedFile $file,
        string $organizationId,
        string $staffId,
        string $schoolId
    ): string {
        // Check storage limit before storing
        $this->checkStorageLimit($file, $organizationId);

        $path = $this->buildPath($organizationId, $schoolId, self::PATH_STAFF, $staffId, 'pictures');
        $filePath = $this->storeFile($file, $path, self::DISK_PUBLIC);

        // Update storage usage after successful storage
        $this->updateStorageUsage($file, $organizationId);

        return $filePath;
    }

    /**
     * Store staff picture (PRIVATE - for sensitive contexts)
     * CRITICAL: Staff files are school-scoped and MUST include schoolId
     */
    public function storeStaffPicturePrivate(
        UploadedFile $file,
        string $organizationId,
        string $staffId,
        string $schoolId
    ): string {
        // Check storage limit before storing
        $this->checkStorageLimit($file, $organizationId);

        $path = $this->buildPath($organizationId, $schoolId, self::PATH_STAFF, $staffId, 'pictures');
        $filePath = $this->storeFile($file, $path, self::DISK_PRIVATE);

        // Update storage usage after successful storage
        $this->updateStorageUsage($file, $organizationId);

        return $filePath;
    }

    /**
     * Store staff document (PRIVATE)
     * CRITICAL: Staff files are school-scoped and MUST include schoolId
     */
    public function storeStaffDocument(
        UploadedFile $file,
        string $organizationId,
        string $staffId,
        string $schoolId,
        ?string $documentType = null
    ): string {
        // Check storage limit before storing
        $this->checkStorageLimit($file, $organizationId);

        $subPath = $documentType ? "documents/{$documentType}" : 'documents';
        $path = $this->buildPath($organizationId, $schoolId, self::PATH_STAFF, $staffId, $subPath);
        $filePath = $this->storeFile($file, $path, self::DISK_PRIVATE);

        // Update storage usage after successful storage
        $this->updateStorageUsage($file, $organizationId);

        return $filePath;
    }

    // ==============================================
    // COURSE DOCUMENTS
    // ==============================================

    /**
     * Store course document (PRIVATE)
     * CRITICAL: Course files are school-scoped and MUST include schoolId
     */
    public function storeCourseDocument(
        UploadedFile $file,
        string $organizationId,
        string $courseId,
        string $schoolId,
        ?string $documentType = null
    ): string {
        // Check storage limit before storing
        $this->checkStorageLimit($file, $organizationId);

        $subPath = $documentType ? "{$documentType}" : 'documents';
        $path = $this->buildPath($organizationId, $schoolId, self::PATH_COURSES, $courseId, $subPath);
        $filePath = $this->storeFile($file, $path, self::DISK_PRIVATE);

        // Update storage usage after successful storage
        $this->updateStorageUsage($file, $organizationId);

        return $filePath;
    }

    // ==============================================
    // EXAM DOCUMENTS
    // ==============================================

    /**
     * Store exam document (PRIVATE)
     * CRITICAL: Exam files are school-scoped and MUST include schoolId
     */
    public function storeExamDocument(
        UploadedFile $file,
        string $organizationId,
        string $examId,
        string $schoolId,
        ?string $documentType = null
    ): string {
        // Check storage limit before storing
        $this->checkStorageLimit($file, $organizationId);

        $subPath = $documentType ? "{$documentType}" : 'documents';
        $path = $this->buildPath($organizationId, $schoolId, self::PATH_EXAMS, $examId, $subPath);
        $filePath = $this->storeFile($file, $path, self::DISK_PRIVATE);

        // Update storage usage after successful storage
        $this->updateStorageUsage($file, $organizationId);

        return $filePath;
    }

    // ==============================================
    // FINANCE FILES
    // ==============================================

    /**
     * Store finance document (PRIVATE)
     * CRITICAL: Finance files are school-scoped and MUST include schoolId
     */
    public function storeFinanceDocument(
        UploadedFile $file,
        string $organizationId,
        string $schoolId,
        ?string $documentType = null
    ): string {
        // Check storage limit before storing
        $this->checkStorageLimit($file, $organizationId);

        $subPath = $documentType ? "finance/{$documentType}" : 'finance';
        $path = $this->buildPath($organizationId, $schoolId, $subPath);
        $filePath = $this->storeFile($file, $path, self::DISK_PRIVATE);

        // Update storage usage after successful storage
        $this->updateStorageUsage($file, $organizationId);

        return $filePath;
    }

    // ==============================================
    // DMS FILES (Document Management System)
    // ==============================================

    /**
     * Store DMS file (PRIVATE, school-scoped)
     */
    public function storeDmsFile(
        UploadedFile $file,
        string $organizationId,
        string $schoolId,
        string $documentType,
        string $documentId
    ): string {
        // Check storage limit before storing
        $this->checkStorageLimit($file, $organizationId);

        $path = $this->buildPath($organizationId, $schoolId, self::PATH_DMS, $documentType, $documentId, 'files');
        $filePath = $this->storeFile($file, $path, self::DISK_PRIVATE);

        // Update storage usage after successful storage
        $this->updateStorageUsage($file, $organizationId);

        return $filePath;
    }

    // ==============================================
    // EVENT FILES
    // ==============================================

    /**
     * Store event attachment (PRIVATE)
     * CRITICAL: Event files are school-scoped and MUST include schoolId
     */
    public function storeEventAttachment(
        UploadedFile $file,
        string $organizationId,
        string $eventId,
        string $schoolId
    ): string {
        // Check storage limit before storing
        $this->checkStorageLimit($file, $organizationId);

        $path = $this->buildPath($organizationId, $schoolId, self::PATH_EVENTS, $eventId, 'attachments');
        $filePath = $this->storeFile($file, $path, self::DISK_PRIVATE);

        // Update storage usage after successful storage
        $this->updateStorageUsage($file, $organizationId);

        return $filePath;
    }

    /**
     * Store event guest photo (PRIVATE)
     * CRITICAL: Event files are school-scoped and MUST include schoolId
     */
    public function storeEventGuestPhoto(
        UploadedFile $file,
        string $organizationId,
        string $eventId,
        string $guestId,
        string $schoolId
    ): string {
        // Check storage limit before storing
        $this->checkStorageLimit($file, $organizationId);

        $path = $this->buildPath($organizationId, $schoolId, self::PATH_EVENTS, $eventId, 'guests', $guestId);
        $filePath = $this->storeFile($file, $path, self::DISK_PRIVATE);

        // Update storage usage after successful storage
        $this->updateStorageUsage($file, $organizationId);

        return $filePath;
    }

    /**
     * Store event guest photo (PUBLIC) - for processed/compressed images
     * CRITICAL: Event files are school-scoped and MUST include schoolId
     */
    public function storeEventGuestPhotoPublic(
        string $content,
        string $filename,
        string $organizationId,
        string $eventId,
        string $guestId,
        string $schoolId
    ): string {
        // Check storage limit before storing
        $contentSizeInGB = strlen($content) / 1073741824;
        $check = $this->usageTrackingService->canStoreFile($organizationId, $contentSizeInGB);
        if (!$check['allowed']) {
            // Use HttpException so Laravel properly handles 402 status code
            throw new HttpException(
                Response::HTTP_PAYMENT_REQUIRED,
                $check['message'] ?? 'Storage limit exceeded',
                null,
                [
                    'code' => 'STORAGE_LIMIT_REACHED',
                    'resource_key' => 'storage_gb',
                    'current' => $check['current'],
                    'limit' => $check['limit'],
                    'file_size_gb' => $contentSizeInGB,
                    'upgrade_required' => true,
                ]
            );
        }

        $path = $this->buildPath($organizationId, $schoolId, self::PATH_EVENTS, $eventId, 'guests', $guestId);
        $fullPath = $path . '/' . $filename;
        Storage::disk(self::DISK_PUBLIC)->put($fullPath, $content);

        // Update storage usage after successful storage
        $this->updateStorageUsageForContent($content, $organizationId);

        return $fullPath;
    }

    /**
     * Store event guest photo thumbnail (PUBLIC)
     * CRITICAL: Event files are school-scoped and MUST include schoolId
     */
    public function storeEventGuestPhotoThumbnail(
        string $content,
        string $filename,
        string $organizationId,
        string $eventId,
        string $guestId,
        string $schoolId
    ): string {
        // Check storage limit before storing
        $contentSizeInGB = strlen($content) / 1073741824;
        $check = $this->usageTrackingService->canStoreFile($organizationId, $contentSizeInGB);
        if (!$check['allowed']) {
            // Use HttpException so Laravel properly handles 402 status code
            throw new HttpException(
                Response::HTTP_PAYMENT_REQUIRED,
                $check['message'] ?? 'Storage limit exceeded',
                null,
                [
                    'code' => 'STORAGE_LIMIT_REACHED',
                    'resource_key' => 'storage_gb',
                    'current' => $check['current'],
                    'limit' => $check['limit'],
                    'file_size_gb' => $contentSizeInGB,
                    'upgrade_required' => true,
                ]
            );
        }

        $path = $this->buildPath($organizationId, $schoolId, self::PATH_EVENTS, $eventId, 'guests', $guestId, 'thumbs');
        $fullPath = $path . '/' . $filename;
        Storage::disk(self::DISK_PUBLIC)->put($fullPath, $content);

        // Update storage usage after successful storage
        $this->updateStorageUsageForContent($content, $organizationId);

        return $fullPath;
    }

    /**
     * Store event banner (PUBLIC)
     * CRITICAL: Event files are school-scoped and MUST include schoolId
     */
    public function storeEventBannerPublic(
        UploadedFile $file,
        string $organizationId,
        string $eventId,
        string $schoolId
    ): string {
        // Check storage limit before storing
        $this->checkStorageLimit($file, $organizationId);

        $path = $this->buildPath($organizationId, $schoolId, self::PATH_EVENTS, $eventId, 'banners');
        $filePath = $this->storeFile($file, $path, self::DISK_PUBLIC);

        // Update storage usage after successful storage
        $this->updateStorageUsage($file, $organizationId);

        return $filePath;
    }

    /**
     * Store event thumbnail (PUBLIC)
     * CRITICAL: Event files are school-scoped and MUST include schoolId
     */
    public function storeEventThumbnailPublic(
        UploadedFile $file,
        string $organizationId,
        string $eventId,
        string $schoolId
    ): string {
        // Check storage limit before storing
        $this->checkStorageLimit($file, $organizationId);

        $path = $this->buildPath($organizationId, $schoolId, self::PATH_EVENTS, $eventId, 'thumbnails');
        $filePath = $this->storeFile($file, $path, self::DISK_PUBLIC);

        // Update storage usage after successful storage
        $this->updateStorageUsage($file, $organizationId);

        return $filePath;
    }

    // ==============================================
    // TEMPLATE FILES
    // ==============================================

    /**
     * Store ID card template background (PRIVATE)
     * CRITICAL: Template files are school-scoped and MUST include schoolId
     */
    public function storeIdCardTemplateBackground(
        UploadedFile $file,
        string $organizationId,
        string $schoolId,
        string $templateId,
        string $side = 'front'
    ): string {
        // Check storage limit before storing
        $this->checkStorageLimit($file, $organizationId);

        $path = $this->buildPath($organizationId, $schoolId, self::PATH_TEMPLATES, 'id-cards', $templateId);
        $extension = strtolower($file->getClientOriginalExtension());
        $filename = "background_{$side}.{$extension}";

        $filePath = Storage::disk(self::DISK_PRIVATE)->putFileAs($path, $file, $filename);

        // Update storage usage after successful storage
        $this->updateStorageUsage($file, $organizationId);

        return $filePath;
    }

    /**
     * Store certificate template background (PRIVATE)
     * CRITICAL: Template files are school-scoped and MUST include schoolId
     */
    public function storeCertificateTemplateBackground(
        UploadedFile $file,
        string $organizationId,
        string $schoolId,
        string $templateId
    ): string {
        // Check storage limit before storing
        $this->checkStorageLimit($file, $organizationId);

        $path = $this->buildPath($organizationId, $schoolId, self::PATH_TEMPLATES, 'certificates', $templateId);
        $extension = strtolower($file->getClientOriginalExtension());
        $filename = "background.{$extension}";

        $filePath = Storage::disk(self::DISK_PRIVATE)->putFileAs($path, $file, $filename);

        // Update storage usage after successful storage
        $this->updateStorageUsage($file, $organizationId);

        return $filePath;
    }

    // ==============================================
    // REPORT FILES
    // ==============================================

    /**
     * Store generated report (PRIVATE)
     * CRITICAL: Reports are school-scoped and MUST include schoolId
     */
    public function storeReport(
        string $content,
        string $filename,
        string $organizationId,
        string $schoolId,
        string $reportType = 'general'
    ): string {
        // Check storage limit before storing
        $contentSizeInGB = strlen($content) / 1073741824;
        $check = $this->usageTrackingService->canStoreFile($organizationId, $contentSizeInGB);
        if (!$check['allowed']) {
            // Use HttpException so Laravel properly handles 402 status code
            throw new HttpException(
                Response::HTTP_PAYMENT_REQUIRED,
                $check['message'] ?? 'Storage limit exceeded',
                null,
                [
                    'code' => 'STORAGE_LIMIT_REACHED',
                    'resource_key' => 'storage_gb',
                    'current' => $check['current'],
                    'limit' => $check['limit'],
                    'file_size_gb' => $contentSizeInGB,
                    'upgrade_required' => true,
                ]
            );
        }

        $path = $this->buildPath($organizationId, $schoolId, self::PATH_REPORTS, $reportType);
        $fullPath = $path . '/' . $filename;

        Storage::disk(self::DISK_PRIVATE)->put($fullPath, $content);

        // Update storage usage after successful storage
        $this->updateStorageUsageForContent($content, $organizationId);

        return $fullPath;
    }

    /**
     * Store report from file (PRIVATE)
     * CRITICAL: Reports are school-scoped and MUST include schoolId
     */
    public function storeReportFile(
        UploadedFile $file,
        string $organizationId,
        string $schoolId,
        string $reportType = 'general'
    ): string {
        // Check storage limit before storing
        $this->checkStorageLimit($file, $organizationId);

        $path = $this->buildPath($organizationId, $schoolId, self::PATH_REPORTS, $reportType);
        $filePath = $this->storeFile($file, $path, self::DISK_PRIVATE);

        // Update storage usage after successful storage
        $this->updateStorageUsage($file, $organizationId);

        return $filePath;
    }

    // ==============================================
    // FILE OPERATIONS
    // ==============================================

    /**
     * Delete a file from storage
     */
    public function deleteFile(string $path, string $disk = self::DISK_PRIVATE): bool
    {
        if (empty($path)) {
            return false;
        }

        // Get file size before deletion for usage tracking
        $fileSize = null;
        $organizationId = null;

        try {
            if (Storage::disk($disk)->exists($path)) {
                $fileSize = Storage::disk($disk)->size($path);
                $organizationId = $this->extractOrganizationIdFromPath($path);
            }
        } catch (\Exception $e) {
            \Log::warning("Failed to get file size before deletion: " . $e->getMessage());
        }

        // Delete file
        $deleted = false;
        if (Storage::disk($disk)->exists($path)) {
            $deleted = Storage::disk($disk)->delete($path);
        }

        // Decrement storage usage after successful deletion
        if ($deleted && $fileSize !== null && $organizationId) {
            try {
                $fileSizeInGB = $fileSize / 1073741824; // Convert bytes to GB
                $this->usageTrackingService->decrementStorageUsage($organizationId, $fileSizeInGB);
            } catch (\Exception $e) {
                \Log::error("Failed to decrement storage usage after file deletion: " . $e->getMessage());
                // Don't throw - file is already deleted
            }
        }

        return $deleted;
    }

    /**
     * Check if file exists
     */
    public function fileExists(string $path, string $disk = self::DISK_PRIVATE): bool
    {
        return Storage::disk($disk)->exists($path);
    }

    /**
     * Get file contents
     */
    public function getFile(string $path, string $disk = self::DISK_PRIVATE): ?string
    {
        if (!$this->fileExists($path, $disk)) {
            return null;
        }

        return Storage::disk($disk)->get($path);
    }

    /**
     * Get public URL for a file on public disk
     */
    public function getPublicUrl(string $path): string
    {
        return Storage::disk(self::DISK_PUBLIC)->url($path);
    }

    /**
     * Get download URL for private files (returns base64 encoded path for API route)
     */
    public function getPrivateDownloadUrl(string $path): string
    {
        $encodedPath = base64_encode($path);
        return "/api/storage/download/{$encodedPath}";
    }

    /**
     * Download a file (returns StreamedResponse)
     */
    public function downloadFile(
        string $path,
        ?string $filename = null,
        string $disk = self::DISK_PRIVATE
    ): StreamedResponse {
        $filename = $filename ?? basename($path);
        return Storage::disk($disk)->download($path, $filename);
    }

    /**
     * Get file response for inline display
     */
    public function getFileResponse(string $path, string $disk = self::DISK_PRIVATE): StreamedResponse
    {
        return Storage::disk($disk)->response($path);
    }

    /**
     * Get file MIME type
     */
    public function getMimeType(string $path, string $disk = self::DISK_PRIVATE): ?string
    {
        if (!$this->fileExists($path, $disk)) {
            return null;
        }

        return Storage::disk($disk)->mimeType($path);
    }

    /**
     * Get file size in bytes
     */
    public function getFileSize(string $path, string $disk = self::DISK_PRIVATE): ?int
    {
        if (!$this->fileExists($path, $disk)) {
            return null;
        }

        return Storage::disk($disk)->size($path);
    }

    // ==============================================
    // BULK OPERATIONS
    // ==============================================

    /**
     * Get all files for a school
     */
    public function getSchoolFiles(
        string $organizationId,
        string $schoolId,
        ?string $resourceType = null
    ): array {
        $basePath = "organizations/{$organizationId}/schools/{$schoolId}";

        if ($resourceType) {
            $basePath .= "/{$resourceType}";
        }

        return Storage::disk(self::DISK_PRIVATE)->allFiles($basePath);
    }

    /**
     * Get all files for an organization
     */
    public function getOrganizationFiles(
        string $organizationId,
        ?string $resourceType = null
    ): array {
        $basePath = "organizations/{$organizationId}";

        if ($resourceType) {
            $basePath .= "/*/{$resourceType}";
        }

        return Storage::disk(self::DISK_PRIVATE)->allFiles($basePath);
    }

    /**
     * Delete all files for a resource (e.g., when deleting a student)
     * CRITICAL: Resource files are school-scoped and MUST include schoolId
     */
    public function deleteResourceFiles(
        string $organizationId,
        string $resourceType,
        string $resourceId,
        string $schoolId
    ): bool {
        $path = $this->buildPath($organizationId, $schoolId, $resourceType, $resourceId);

        if (Storage::disk(self::DISK_PRIVATE)->exists($path)) {
            return Storage::disk(self::DISK_PRIVATE)->deleteDirectory($path);
        }

        return false;
    }

    /**
     * Copy file to new location
     */
    public function copyFile(
        string $fromPath,
        string $toPath,
        string $fromDisk = self::DISK_PRIVATE,
        string $toDisk = self::DISK_PRIVATE
    ): bool {
        $contents = Storage::disk($fromDisk)->get($fromPath);
        return Storage::disk($toDisk)->put($toPath, $contents);
    }

    /**
     * Move file to new location
     */
    public function moveFile(
        string $fromPath,
        string $toPath,
        string $fromDisk = self::DISK_PRIVATE,
        string $toDisk = self::DISK_PRIVATE
    ): bool {
        if ($this->copyFile($fromPath, $toPath, $fromDisk, $toDisk)) {
            return $this->deleteFile($fromPath, $fromDisk);
        }

        return false;
    }

    // ==============================================
    // HELPER METHODS
    // ==============================================

    /**
     * Build standardized storage path
     * Format: organizations/{org_id}/schools/{school_id}/resource_type/...
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

    /**
     * Check storage limit before storing file
     */
    private function checkStorageLimit(UploadedFile $file, string $organizationId): void
    {
        try {
            $fileSizeInBytes = $file->getSize();
            $fileSizeInGB = $fileSizeInBytes / 1073741824; // Convert bytes to GB

            $check = $this->usageTrackingService->canStoreFile($organizationId, $fileSizeInGB);

            if (!$check['allowed']) {
                // Use HttpException so Laravel properly handles 402 status code
                throw new HttpException(
                    Response::HTTP_PAYMENT_REQUIRED,
                    $check['message'] ?? 'Storage limit exceeded',
                    null,
                    [
                        'code' => 'STORAGE_LIMIT_REACHED',
                        'resource_key' => 'storage_gb',
                        'current' => $check['current'],
                        'limit' => $check['limit'],
                        'file_size_gb' => $fileSizeInGB,
                        'upgrade_required' => true,
                    ]
                );
            }
        } catch (HttpException $e) {
            // Re-throw HttpException as-is (includes 402 status)
            throw $e;
        } catch (\Exception $e) {
            // Log other errors but don't block
            \Log::warning("Failed to check storage limit: " . $e->getMessage());
        }
    }

    /**
     * Update storage usage after file is stored
     */
    private function updateStorageUsage(UploadedFile $file, string $organizationId): void
    {
        try {
            $fileSizeInBytes = $file->getSize();
            $fileSizeInGB = $fileSizeInBytes / 1073741824; // Convert bytes to GB

            $this->usageTrackingService->incrementStorageUsage($organizationId, $fileSizeInGB);
        } catch (\Exception $e) {
            \Log::error("Failed to update storage usage: " . $e->getMessage());
            // Don't throw - file is already stored, just log the error
        }
    }

    /**
     * Update storage usage for file content (string)
     */
    private function updateStorageUsageForContent(string $content, string $organizationId): void
    {
        try {
            $fileSizeInBytes = strlen($content);
            $fileSizeInGB = $fileSizeInBytes / 1073741824; // Convert bytes to GB

            $this->usageTrackingService->incrementStorageUsage($organizationId, $fileSizeInGB);
        } catch (\Exception $e) {
            \Log::error("Failed to update storage usage for content: " . $e->getMessage());
        }
    }

    /**
     * Extract organization_id from file path
     * Path format: organizations/{org_id}/...
     */
    private function extractOrganizationIdFromPath(string $path): ?string
    {
        if (preg_match('/^organizations\/([^\/]+)/', $path, $matches)) {
            return $matches[1];
        }
        return null;
    }

    /**
     * Store file with UUID filename
     */
    private function storeFile(UploadedFile $file, string $path, string $disk): string
    {
        $extension = strtolower($file->getClientOriginalExtension());
        $filename = Str::uuid() . '.' . $extension;

        return Storage::disk($disk)->putFileAs($path, $file, $filename);
    }

    /**
     * Get disk constant for public files
     */
    public function getPublicDisk(): string
    {
        return self::DISK_PUBLIC;
    }

    /**
     * Get disk constant for private files
     */
    public function getPrivateDisk(): string
    {
        return self::DISK_PRIVATE;
    }

    /**
     * Determine MIME type from file extension (without php_fileinfo)
     */
    public function getMimeTypeFromExtension(string $path): string
    {
        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        $mimeTypes = [
            // Images
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'webp' => 'image/webp',
            'svg' => 'image/svg+xml',
            'bmp' => 'image/bmp',

            // Documents
            'pdf' => 'application/pdf',
            'doc' => 'application/msword',
            'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls' => 'application/vnd.ms-excel',
            'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'ppt' => 'application/vnd.ms-powerpoint',
            'pptx' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

            // Text
            'txt' => 'text/plain',
            'csv' => 'text/csv',
            'json' => 'application/json',
            'xml' => 'application/xml',

            // Archives
            'zip' => 'application/zip',
            'rar' => 'application/x-rar-compressed',
            'tar' => 'application/x-tar',
            'gz' => 'application/gzip',

            // Video
            'mp4' => 'video/mp4',
            'webm' => 'video/webm',
            'avi' => 'video/x-msvideo',

            // Audio
            'mp3' => 'audio/mpeg',
            'wav' => 'audio/wav',
            'ogg' => 'audio/ogg',
        ];

        return $mimeTypes[$extension] ?? 'application/octet-stream';
    }

    /**
     * Validate file extension against allowed types
     */
    public function isAllowedExtension(string $filename, array $allowedExtensions): bool
    {
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        return in_array($extension, $allowedExtensions);
    }

    /**
     * Get allowed image extensions
     */
    public function getAllowedImageExtensions(): array
    {
        return ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    }

    /**
     * Get allowed document extensions
     */
    public function getAllowedDocumentExtensions(): array
    {
        return ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv'];
    }
}
