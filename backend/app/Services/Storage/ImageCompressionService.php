<?php

namespace App\Services\Storage;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;

/**
 * Centralized Image Compression Service
 * 
 * Compresses images before storage to reduce file size and save storage space.
 * Uses Intervention Image library with GD/Imagick fallback.
 */
class ImageCompressionService
{
    private const DEFAULT_MAX_WIDTH = 1920;
    private const DEFAULT_MAX_HEIGHT = 1920;
    private const DEFAULT_QUALITY = 85;
    private const DEFAULT_MAX_FILE_SIZE_MB = 0.5; // Skip compression if file is smaller than 500KB
    private const MAX_FILE_SIZE_MB = 10; // Don't compress files larger than 10MB to avoid memory issues

    private $imageManager = null;

    public function __construct()
    {
        $this->initializeImageManager();
    }

    /**
     * Initialize image manager with available driver
     */
    private function initializeImageManager(): void
    {
        // Check if Intervention Image is available
        if (!class_exists(\Intervention\Image\ImageManager::class)) {
            Log::warning('ImageCompressionService: Intervention Image library not available');
            return;
        }

        try {
            // Try Imagick first (better quality)
            if (extension_loaded('imagick') && class_exists(\Intervention\Image\Drivers\Imagick\Driver::class)) {
                $this->imageManager = new \Intervention\Image\ImageManager(new \Intervention\Image\Drivers\Imagick\Driver());
                Log::debug('ImageCompressionService: Using Imagick driver');
                return;
            }
        } catch (\Exception $e) {
            Log::warning('ImageCompressionService: Imagick driver failed, falling back to GD: ' . $e->getMessage());
        }

        // Fallback to GD
        if (extension_loaded('gd') && class_exists(\Intervention\Image\Drivers\Gd\Driver::class)) {
            try {
                $this->imageManager = new \Intervention\Image\ImageManager(new \Intervention\Image\Drivers\Gd\Driver());
                Log::debug('ImageCompressionService: Using GD driver');
            } catch (\Exception $e) {
                Log::error('ImageCompressionService: GD driver failed: ' . $e->getMessage());
            }
        }

        if (!$this->imageManager) {
            Log::warning('ImageCompressionService: No image driver available (neither Imagick nor GD)');
        }
    }

    /**
     * Check if file should be compressed
     */
    public function shouldCompress(UploadedFile $file): bool
    {
        // Check if file is an image
        if (!str_starts_with($file->getMimeType(), 'image/')) {
            return false;
        }

        // Check if image manager is available
        if (!$this->imageManager) {
            return false;
        }

        // Skip if file is too small (already compressed enough)
        $fileSizeMB = $file->getSize() / (1024 * 1024);
        if ($fileSizeMB < self::DEFAULT_MAX_FILE_SIZE_MB) {
            return false;
        }

        // Skip if file is too large (avoid memory issues)
        if ($fileSizeMB > self::MAX_FILE_SIZE_MB) {
            Log::warning("ImageCompressionService: File too large ({$fileSizeMB}MB), skipping compression", [
                'filename' => $file->getClientOriginalName(),
                'size_mb' => round($fileSizeMB, 2),
            ]);
            return false;
        }

        return true;
    }

    /**
     * Compress an uploaded image file
     * 
     * @param UploadedFile $file Original file
     * @param array $options Compression options:
     *   - max_width: Maximum width (default: 1920)
     *   - max_height: Maximum height (default: 1920)
     *   - quality: JPEG quality 0-100 (default: 85)
     * @return UploadedFile|null Compressed file or null if compression failed/not needed
     */
    public function compressImage(UploadedFile $file, array $options = []): ?UploadedFile
    {
        // Check if compression is needed
        if (!$this->shouldCompress($file)) {
            return null;
        }

        $maxWidth = $options['max_width'] ?? self::DEFAULT_MAX_WIDTH;
        $maxHeight = $options['max_height'] ?? self::DEFAULT_MAX_HEIGHT;
        $quality = $options['quality'] ?? self::DEFAULT_QUALITY;

        if (!$this->imageManager) {
            Log::warning("ImageCompressionService: Image manager not available, skipping compression");
            return null;
        }

        try {
            $originalSize = $file->getSize();
            $mimeType = $file->getMimeType();

            // Read image using Intervention Image
            $image = $this->imageManager->read($file->getRealPath());

            // Get original dimensions
            $originalWidth = $image->width();
            $originalHeight = $image->height();

            // Resize if image is larger than max dimensions (maintain aspect ratio)
            if ($originalWidth > $maxWidth || $originalHeight > $maxHeight) {
                $image->scaleDown($maxWidth, $maxHeight);
                Log::debug("ImageCompressionService: Image resized", [
                    'original' => "{$originalWidth}x{$originalHeight}",
                    'new' => "{$image->width()}x{$image->height()}",
                ]);
            }

            // Determine output format based on original MIME type
            $outputFormat = $this->getOutputFormat($mimeType);
            
            // Encode image with compression
            $compressedData = $this->encodeImage($image, $outputFormat, $quality);

            if (!$compressedData || strlen($compressedData) === 0) {
                Log::warning("ImageCompressionService: Failed to encode compressed image");
                return null;
            }

            $compressedSize = strlen($compressedData);
            $savings = $originalSize - $compressedSize;
            $savingsPercent = $originalSize > 0 ? round(($savings / $originalSize) * 100, 1) : 0;

            // Only use compressed version if it's actually smaller
            if ($compressedSize >= $originalSize) {
                Log::debug("ImageCompressionService: Compressed size not smaller, keeping original", [
                    'original_size' => $originalSize,
                    'compressed_size' => $compressedSize,
                ]);
                return null;
            }

            Log::info("ImageCompressionService: Image compressed successfully", [
                'filename' => $file->getClientOriginalName(),
                'original_size' => $this->formatBytes($originalSize),
                'compressed_size' => $this->formatBytes($compressedSize),
                'savings' => $this->formatBytes($savings),
                'savings_percent' => $savingsPercent . '%',
                'dimensions' => "{$image->width()}x{$image->height()}",
            ]);

            // Create new UploadedFile from compressed data
            $tempPath = tempnam(sys_get_temp_dir(), 'compressed_');
            file_put_contents($tempPath, $compressedData);

            // Determine new extension based on output format
            $newExtension = $this->getExtensionFromFormat($outputFormat);
            $originalName = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
            $newName = $originalName . '.' . $newExtension;

            // Create new UploadedFile instance
            $compressedFile = new UploadedFile(
                $tempPath,
                $newName,
                $this->getMimeTypeFromFormat($outputFormat),
                null,
                true // Test mode - file will be deleted after request
            );

            return $compressedFile;

        } catch (\Exception $e) {
            Log::error("ImageCompressionService: Error compressing image", [
                'filename' => $file->getClientOriginalName(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return null;
        }
    }

    /**
     * Determine output format based on input MIME type
     */
    private function getOutputFormat(string $mimeType): string
    {
        return match ($mimeType) {
            'image/jpeg', 'image/jpg' => 'jpeg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            'image/gif' => 'gif',
            default => 'jpeg', // Default to JPEG for best compression
        };
    }

    /**
     * Encode image to specified format
     */
    private function encodeImage($image, string $format, int $quality): ?string
    {
        try {
            return match ($format) {
                'jpeg' => $image->toJpeg($quality),
                'png' => $image->toPng(),
                'webp' => $image->toWebp($quality),
                'gif' => $image->toGif(),
                default => $image->toJpeg($quality),
            };
        } catch (\Exception $e) {
            Log::error("ImageCompressionService: Failed to encode image as {$format}: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Get file extension from format
     */
    private function getExtensionFromFormat(string $format): string
    {
        return match ($format) {
            'jpeg' => 'jpg',
            'png' => 'png',
            'webp' => 'webp',
            'gif' => 'gif',
            default => 'jpg',
        };
    }

    /**
     * Get MIME type from format
     */
    private function getMimeTypeFromFormat(string $format): string
    {
        return match ($format) {
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'webp' => 'image/webp',
            'gif' => 'image/gif',
            default => 'image/jpeg',
        };
    }

    /**
     * Format bytes to human-readable format
     */
    private function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $unitIndex = 0;
        $size = $bytes;

        while ($size >= 1024 && $unitIndex < count($units) - 1) {
            $size /= 1024;
            $unitIndex++;
        }

        return round($size, 2) . ' ' . $units[$unitIndex];
    }
}
