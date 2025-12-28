<?php

namespace App\Services\Storage;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
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
        $path = $this->buildPath($organizationId, $schoolId, self::PATH_STUDENTS, $studentId, 'pictures');
        return $this->storeFile($file, $path, self::DISK_PRIVATE);
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
        $subPath = $documentType ? "documents/{$documentType}" : 'documents';
        $path = $this->buildPath($organizationId, $schoolId, self::PATH_STUDENTS, $studentId, $subPath);
        return $this->storeFile($file, $path, self::DISK_PRIVATE);
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
        $path = $this->buildPath($organizationId, $schoolId, self::PATH_STAFF, $staffId, 'pictures');
        return $this->storeFile($file, $path, self::DISK_PUBLIC);
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
        $path = $this->buildPath($organizationId, $schoolId, self::PATH_STAFF, $staffId, 'pictures');
        return $this->storeFile($file, $path, self::DISK_PRIVATE);
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
        $subPath = $documentType ? "documents/{$documentType}" : 'documents';
        $path = $this->buildPath($organizationId, $schoolId, self::PATH_STAFF, $staffId, $subPath);
        return $this->storeFile($file, $path, self::DISK_PRIVATE);
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
        $subPath = $documentType ? "{$documentType}" : 'documents';
        $path = $this->buildPath($organizationId, $schoolId, self::PATH_COURSES, $courseId, $subPath);
        return $this->storeFile($file, $path, self::DISK_PRIVATE);
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
        $subPath = $documentType ? "{$documentType}" : 'documents';
        $path = $this->buildPath($organizationId, $schoolId, self::PATH_EXAMS, $examId, $subPath);
        return $this->storeFile($file, $path, self::DISK_PRIVATE);
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
        $subPath = $documentType ? "finance/{$documentType}" : 'finance';
        $path = $this->buildPath($organizationId, $schoolId, $subPath);
        return $this->storeFile($file, $path, self::DISK_PRIVATE);
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
        $path = $this->buildPath($organizationId, $schoolId, self::PATH_DMS, $documentType, $documentId, 'files');
        return $this->storeFile($file, $path, self::DISK_PRIVATE);
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
        $path = $this->buildPath($organizationId, $schoolId, self::PATH_EVENTS, $eventId, 'attachments');
        return $this->storeFile($file, $path, self::DISK_PRIVATE);
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
        $path = $this->buildPath($organizationId, $schoolId, self::PATH_EVENTS, $eventId, 'guests', $guestId);
        return $this->storeFile($file, $path, self::DISK_PRIVATE);
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
        $path = $this->buildPath($organizationId, $schoolId, self::PATH_EVENTS, $eventId, 'guests', $guestId);
        $fullPath = $path . '/' . $filename;
        Storage::disk(self::DISK_PUBLIC)->put($fullPath, $content);
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
        $path = $this->buildPath($organizationId, $schoolId, self::PATH_EVENTS, $eventId, 'guests', $guestId, 'thumbs');
        $fullPath = $path . '/' . $filename;
        Storage::disk(self::DISK_PUBLIC)->put($fullPath, $content);
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
        $path = $this->buildPath($organizationId, $schoolId, self::PATH_EVENTS, $eventId, 'banners');
        return $this->storeFile($file, $path, self::DISK_PUBLIC);
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
        $path = $this->buildPath($organizationId, $schoolId, self::PATH_EVENTS, $eventId, 'thumbnails');
        return $this->storeFile($file, $path, self::DISK_PUBLIC);
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
        $path = $this->buildPath($organizationId, $schoolId, self::PATH_TEMPLATES, 'id-cards', $templateId);
        $extension = strtolower($file->getClientOriginalExtension());
        $filename = "background_{$side}.{$extension}";

        return Storage::disk(self::DISK_PRIVATE)->putFileAs($path, $file, $filename);
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
        $path = $this->buildPath($organizationId, $schoolId, self::PATH_TEMPLATES, 'certificates', $templateId);
        $extension = strtolower($file->getClientOriginalExtension());
        $filename = "background.{$extension}";
        
        return Storage::disk(self::DISK_PRIVATE)->putFileAs($path, $file, $filename);
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
        $path = $this->buildPath($organizationId, $schoolId, self::PATH_REPORTS, $reportType);
        $fullPath = $path . '/' . $filename;

        Storage::disk(self::DISK_PRIVATE)->put($fullPath, $content);

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
        $path = $this->buildPath($organizationId, $schoolId, self::PATH_REPORTS, $reportType);
        return $this->storeFile($file, $path, self::DISK_PRIVATE);
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

        if (Storage::disk($disk)->exists($path)) {
            return Storage::disk($disk)->delete($path);
        }

        return false;
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
