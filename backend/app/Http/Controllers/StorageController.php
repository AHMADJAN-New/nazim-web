<?php

namespace App\Http\Controllers;

use App\Services\Storage\FileStorageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Storage Controller
 *
 * Handles secure file downloads for private files and public file serving.
 * - Private files: download/forceDownload/info (require auth, base64 path).
 * - Public files: servePublic (no auth, for website images and other public disk files).
 */
class StorageController extends Controller
{
    /** Public disk name - used for website images, media, etc. */
    private const DISK_PUBLIC = 'public';

    public function __construct(
        private FileStorageService $fileStorageService
    ) {}

    /**
     * Serve a file from the public disk (no auth).
     * Used for website images and other public assets so /storage/organizations/.../website/images/... work.
     */
    public function servePublic(Request $request, string $path): \Symfony\Component\HttpFoundation\Response
    {
        $path = trim($path, '/');
        if ($path === '' || str_contains($path, '..')) {
            abort(404);
        }

        if (!$this->fileStorageService->fileExists($path, self::DISK_PUBLIC)) {
            abort(404);
        }

        $file = $this->fileStorageService->getFile($path, self::DISK_PUBLIC);
        if ($file === null) {
            abort(404);
        }

        $mimeType = $this->fileStorageService->getMimeType($path, self::DISK_PUBLIC)
            ?? $this->fileStorageService->getMimeTypeFromExtension($path);

        return response($file, 200)
            ->header('Content-Type', $mimeType)
            ->header('Cache-Control', 'public, max-age=86400');
    }

    /**
     * Download a private file
     *
     * @param Request $request
     * @param string $encodedPath Base64 encoded file path
     */
    public function download(Request $request, string $encodedPath)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $profile = DB::table('profiles')->where('id', $user->id)->first();
        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Decode the path
        $path = base64_decode($encodedPath, true);
        if ($path === false) {
            return response()->json(['error' => 'Invalid file path'], 400);
        }

        // Validate path doesn't contain directory traversal attempts
        if (preg_match('/\.\./', $path)) {
            Log::warning('Directory traversal attempt detected', [
                'user_id' => $user->id,
                'path' => $path,
            ]);
            return response()->json(['error' => 'Invalid file path'], 400);
        }

        // Extract organization ID from path and validate access
        // Expected format: organizations/{org_id}/...
        if (preg_match('/^organizations\/([a-f0-9-]+)\//', $path, $matches)) {
            $pathOrgId = $matches[1];

            if ($pathOrgId !== $profile->organization_id) {
                Log::warning('Unauthorized file access attempt', [
                    'user_id' => $user->id,
                    'user_org_id' => $profile->organization_id,
                    'path_org_id' => $pathOrgId,
                    'path' => $path,
                ]);
                return response()->json(['error' => 'Access denied'], 403);
            }
        } else {
            // For legacy paths without organization prefix, allow access based on context
            // This supports backward compatibility during migration
            Log::info('Legacy path access', [
                'user_id' => $user->id,
                'path' => $path,
            ]);
        }

        // Check if file exists
        if (!$this->fileStorageService->fileExists($path)) {
            return response()->json(['error' => 'File not found'], 404);
        }

        // Get MIME type
        $mimeType = $this->fileStorageService->getMimeType($path);
        if (!$mimeType) {
            $mimeType = $this->fileStorageService->getMimeTypeFromExtension($path);
        }

        // Get filename for download
        $filename = basename($path);

        try {
            $file = $this->fileStorageService->getFile($path);

            return response($file, 200)
                ->header('Content-Type', $mimeType)
                ->header('Content-Disposition', 'inline; filename="' . $filename . '"')
                ->header('Cache-Control', 'private, max-age=3600');
        } catch (\Exception $e) {
            Log::error('Error downloading file', [
                'path' => $path,
                'error' => $e->getMessage(),
            ]);
            return response()->json(['error' => 'Error retrieving file'], 500);
        }
    }

    /**
     * Force download a private file (as attachment)
     *
     * @param Request $request
     * @param string $encodedPath Base64 encoded file path
     */
    public function forceDownload(Request $request, string $encodedPath)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $profile = DB::table('profiles')->where('id', $user->id)->first();
        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Decode the path
        $path = base64_decode($encodedPath, true);
        if ($path === false) {
            return response()->json(['error' => 'Invalid file path'], 400);
        }

        // Validate path doesn't contain directory traversal attempts
        if (preg_match('/\.\./', $path)) {
            return response()->json(['error' => 'Invalid file path'], 400);
        }

        // Extract organization ID from path and validate access
        if (preg_match('/^organizations\/([a-f0-9-]+)\//', $path, $matches)) {
            $pathOrgId = $matches[1];

            if ($pathOrgId !== $profile->organization_id) {
                return response()->json(['error' => 'Access denied'], 403);
            }
        }

        // Check if file exists
        if (!$this->fileStorageService->fileExists($path)) {
            return response()->json(['error' => 'File not found'], 404);
        }

        try {
            return $this->fileStorageService->downloadFile($path);
        } catch (\Exception $e) {
            Log::error('Error forcing file download', [
                'path' => $path,
                'error' => $e->getMessage(),
            ]);
            return response()->json(['error' => 'Error retrieving file'], 500);
        }
    }

    /**
     * Get file info without downloading
     *
     * @param Request $request
     * @param string $encodedPath Base64 encoded file path
     */
    public function info(Request $request, string $encodedPath)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $profile = DB::table('profiles')->where('id', $user->id)->first();
        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Decode the path
        $path = base64_decode($encodedPath, true);
        if ($path === false) {
            return response()->json(['error' => 'Invalid file path'], 400);
        }

        // Validate organization access
        if (preg_match('/^organizations\/([a-f0-9-]+)\//', $path, $matches)) {
            $pathOrgId = $matches[1];
            if ($pathOrgId !== $profile->organization_id) {
                return response()->json(['error' => 'Access denied'], 403);
            }
        }

        // Check if file exists
        if (!$this->fileStorageService->fileExists($path)) {
            return response()->json(['error' => 'File not found'], 404);
        }

        return response()->json([
            'exists' => true,
            'path' => $path,
            'filename' => basename($path),
            'mime_type' => $this->fileStorageService->getMimeType($path)
                ?? $this->fileStorageService->getMimeTypeFromExtension($path),
            'size' => $this->fileStorageService->getFileSize($path),
        ]);
    }
}
