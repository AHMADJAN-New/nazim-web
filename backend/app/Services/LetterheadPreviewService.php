<?php

namespace App\Services;

use App\Models\Letterhead;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class LetterheadPreviewService
{
    /**
     * Generate preview image for letterhead.
     * Returns the preview URL or null if generation fails.
     */
    public function generatePreview(Letterhead $letterhead, int $maxWidth = 800, int $maxHeight = 600): ?string
    {
        if (!$letterhead->file_path || !Storage::exists($letterhead->file_path)) {
            return null;
        }

        // Only generate preview for images
        if ($letterhead->file_type !== 'image') {
            return null;
        }

        try {
            $filePath = Storage::path($letterhead->file_path);
            $mimeType = Storage::mimeType($letterhead->file_path);
            
            // Check if GD is available
            if (!extension_loaded('gd')) {
                Log::warning("GD extension not available for image processing");
                // Fallback: return original file URL
                return Storage::url($letterhead->file_path);
            }

            // Create image resource based on file type
            $image = null;
            switch ($mimeType) {
                case 'image/jpeg':
                case 'image/jpg':
                    $image = imagecreatefromjpeg($filePath);
                    break;
                case 'image/png':
                    $image = imagecreatefrompng($filePath);
                    break;
                case 'image/gif':
                    $image = imagecreatefromgif($filePath);
                    break;
                case 'image/webp':
                    if (function_exists('imagecreatefromwebp')) {
                        $image = imagecreatefromwebp($filePath);
                    }
                    break;
                default:
                    return Storage::url($letterhead->file_path);
            }

            if (!$image) {
                return Storage::url($letterhead->file_path);
            }

            // Get original dimensions
            $originalWidth = imagesx($image);
            $originalHeight = imagesy($image);

            // Calculate new dimensions maintaining aspect ratio
            $ratio = min($maxWidth / $originalWidth, $maxHeight / $originalHeight);
            $newWidth = (int)($originalWidth * $ratio);
            $newHeight = (int)($originalHeight * $ratio);

            // Create resized image
            $resized = imagecreatetruecolor($newWidth, $newHeight);
            
            // Preserve transparency for PNG
            if ($mimeType === 'image/png') {
                imagealphablending($resized, false);
                imagesavealpha($resized, true);
                $transparent = imagecolorallocatealpha($resized, 255, 255, 255, 127);
                imagefilledrectangle($resized, 0, 0, $newWidth, $newHeight, $transparent);
            }

            // Resize image
            imagecopyresampled($resized, $image, 0, 0, 0, 0, $newWidth, $newHeight, $originalWidth, $originalHeight);

            // Generate preview path
            $previewPath = 'letterheads/previews/' . basename($letterhead->file_path, '.' . pathinfo($filePath, PATHINFO_EXTENSION)) . '_preview.jpg';
            
            // Save preview
            $previewFullPath = Storage::path($previewPath);
            $previewDir = dirname($previewFullPath);
            if (!is_dir($previewDir)) {
                try {
                    if (!mkdir($previewDir, 0775, true)) {
                        throw new \RuntimeException("Failed to create preview directory: {$previewDir}");
                    }
                    // Ensure www-data owns the directory (important for Docker)
                    if (function_exists('chown') && function_exists('posix_geteuid') && posix_geteuid() === 0) {
                        @chown($previewDir, 'www-data');
                        @chgrp($previewDir, 'www-data');
                    }
                } catch (\Exception $e) {
                    \Log::error('Failed to create preview directory: ' . $e->getMessage());
                    throw new \RuntimeException('Failed to create preview directory. Please ensure storage/app/letterheads/previews is writable.');
                }
            }
            
            // Save as JPEG
            imagejpeg($resized, $previewFullPath, 85);
            
            // Clean up
            imagedestroy($image);
            imagedestroy($resized);
            
            // Return public URL
            return Storage::url($previewPath);
        } catch (\Exception $e) {
            Log::warning("Failed to generate letterhead preview: " . $e->getMessage());
            // Fallback: return original file URL
            return Storage::url($letterhead->file_path);
        }
    }

    /**
     * Get preview URL for letterhead.
     * Returns existing preview_url or generates new one.
     */
    public function getPreviewUrl(Letterhead $letterhead): ?string
    {
        if ($letterhead->preview_url) {
            return $letterhead->preview_url;
        }

        // Generate preview if image
        if ($letterhead->file_type === 'image') {
            $previewUrl = $this->generatePreview($letterhead);
            if ($previewUrl) {
                $letterhead->preview_url = $previewUrl;
                $letterhead->save();
                return $previewUrl;
            }
        }

        // Fallback: return original file URL for images
        if ($letterhead->file_type === 'image' && $letterhead->file_path) {
            return Storage::url($letterhead->file_path);
        }

        return null;
    }
}

