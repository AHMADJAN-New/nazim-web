<?php

namespace App\Services\Reports;

/**
 * Service for compressing and resizing logos for reports
 */
class LogoCompressionService
{
    private const MAX_WIDTH = 200;
    private const MAX_HEIGHT = 200;
    private const QUALITY = 85; // JPEG quality (0-100)
    private const PNG_COMPRESSION = 6; // PNG compression (0-9, 6 is good balance)

    /**
     * Compress and resize a logo image from binary data
     * 
     * @param string $binaryData Raw binary image data
     * @param string $mimeType Image MIME type (e.g., 'image/png', 'image/jpeg')
     * @return array|null ['binary' => compressed binary, 'mime_type' => mime type, 'size' => size in bytes] or null on failure
     */
    public function compressLogo(string $binaryData, string $mimeType): ?array
    {
        try {
            // Check if GD extension is available
            if (!extension_loaded('gd')) {
                \Log::warning("GD extension not loaded, skipping logo compression");
                return null;
            }

            $originalSize = strlen($binaryData);
            
            // If image is already small (< 50KB), skip compression to save memory
            if ($originalSize < 50 * 1024) {
                \Log::debug("Logo is already small ({$originalSize} bytes), skipping compression");
                return [
                    'binary' => $binaryData,
                    'mime_type' => $mimeType,
                    'size' => $originalSize,
                ];
            }
            
            // If image is large (> 200KB), skip compression to avoid memory issues
            // These will be resized by CSS max-width/max-height instead
            // Note: Large images should be compressed when uploaded, not during report generation
            if ($originalSize > 200 * 1024) {
                \Log::warning("Logo is large ({$this->bytesToHuman($originalSize)}), skipping compression to avoid memory issues. Will be resized by CSS. Consider compressing during upload.");
                return [
                    'binary' => $binaryData,
                    'mime_type' => $mimeType,
                    'size' => $originalSize,
                ];
            }

            // Check available memory before processing
            $memoryLimitBytes = $this->convertToBytes(ini_get('memory_limit'));
            $memoryUsed = memory_get_usage(true);
            $memoryAvailable = $memoryLimitBytes - $memoryUsed;
            
            // Rough estimate: need 4x image size in memory for processing
            $requiredMemory = $originalSize * 4;
            
            // If not enough memory, try to increase limit
            if ($requiredMemory > $memoryAvailable) {
                $originalMemoryLimit = ini_get('memory_limit');
                $newLimitBytes = max($memoryLimitBytes, $requiredMemory * 2); // Need at least 2x required
                $newLimit = $this->bytesToHuman($newLimitBytes);
                
                // Only increase if we can (some servers don't allow ini_set)
                if (@ini_set('memory_limit', $newLimit) !== false) {
                    \Log::debug("Temporarily increased memory limit from {$originalMemoryLimit} to {$newLimit} for logo compression");
                } else {
                    \Log::warning("Cannot increase memory limit, may run out of memory. Required: {$this->bytesToHuman($requiredMemory)}, Available: {$this->bytesToHuman($memoryAvailable)}");
                    // Try anyway, but log warning
                }
            }

            // Create image resource from binary data
            // Use error suppression and check for memory errors
            $image = @imagecreatefromstring($binaryData);
            if ($image === false) {
                $error = error_get_last();
                if ($error && strpos($error['message'], 'memory') !== false) {
                    \Log::error("Out of memory while creating image from binary data. Image size: {$this->bytesToHuman($originalSize)}");
                } else {
                    \Log::warning("Failed to create image from binary data");
                }
                // Restore original memory limit if we changed it
                if (isset($originalMemoryLimit) && isset($newLimit)) {
                    @ini_set('memory_limit', $originalMemoryLimit);
                }
                return null;
            }

            // Get original dimensions
            $originalWidth = imagesx($image);
            $originalHeight = imagesy($image);

            // Calculate new dimensions while maintaining aspect ratio
            $ratio = min(self::MAX_WIDTH / $originalWidth, self::MAX_HEIGHT / $originalHeight);
            $newWidth = (int)($originalWidth * $ratio);
            $newHeight = (int)($originalHeight * $ratio);

            // If image is already smaller than max size, return original (but still compress)
            if ($newWidth >= $originalWidth && $newHeight >= $originalHeight) {
                $newWidth = $originalWidth;
                $newHeight = $originalHeight;
            }

            // Create new image with new dimensions
            $compressedImage = imagecreatetruecolor($newWidth, $newHeight);

            // Preserve transparency for PNG
            if ($mimeType === 'image/png' || $mimeType === 'image/gif') {
                imagealphablending($compressedImage, false);
                imagesavealpha($compressedImage, true);
                $transparent = imagecolorallocatealpha($compressedImage, 0, 0, 0, 127);
                imagefill($compressedImage, 0, 0, $transparent);
            }

            // Resize image
            imagecopyresampled(
                $compressedImage,
                $image,
                0, 0, 0, 0,
                $newWidth,
                $newHeight,
                $originalWidth,
                $originalHeight
            );

            // Output compressed image to buffer
            ob_start();
            
            if ($mimeType === 'image/png') {
                imagepng($compressedImage, null, self::PNG_COMPRESSION);
            } elseif ($mimeType === 'image/jpeg' || $mimeType === 'image/jpg') {
                imagejpeg($compressedImage, null, self::QUALITY);
                $mimeType = 'image/jpeg'; // Normalize to jpeg
            } elseif ($mimeType === 'image/gif') {
                imagegif($compressedImage);
            } else {
                // Default to PNG for unknown types
                imagepng($compressedImage, null, self::PNG_COMPRESSION);
                $mimeType = 'image/png';
            }

            $compressedBinary = ob_get_clean();

            // Clean up immediately to free memory
            imagedestroy($image);
            imagedestroy($compressedImage);
            
            // Force garbage collection to free memory
            if (function_exists('gc_collect_cycles')) {
                gc_collect_cycles();
            }

            // Restore original memory limit if we changed it
            if (isset($originalMemoryLimit) && isset($newLimit)) {
                @ini_set('memory_limit', $originalMemoryLimit);
            }

            if ($compressedBinary === false || empty($compressedBinary)) {
                \Log::warning("Failed to compress logo image");
                return null;
            }

            $compressedSize = strlen($compressedBinary);
            $savings = $originalSize - $compressedSize;
            $savingsPercent = $originalSize > 0 ? round(($savings / $originalSize) * 100, 1) : 0;

            \Log::debug("Logo compressed: {$originalWidth}x{$originalHeight} -> {$newWidth}x{$newHeight}, {$originalSize} bytes -> {$compressedSize} bytes (saved {$savingsPercent}%)");

            return [
                'binary' => $compressedBinary,
                'mime_type' => $mimeType,
                'size' => $compressedSize,
            ];
        } catch (\Exception $e) {
            \Log::error("Error compressing logo: " . $e->getMessage());
            \Log::error("Stack trace: " . $e->getTraceAsString());
            
            // Restore original memory limit on error
            if (isset($originalMemoryLimit) && isset($newLimit)) {
                @ini_set('memory_limit', $originalMemoryLimit);
            }
            
            return null;
        } catch (\Error $e) {
            // Catch fatal errors (like memory exhaustion)
            \Log::error("Fatal error compressing logo: " . $e->getMessage());
            
            // Restore original memory limit on error
            if (isset($originalMemoryLimit) && isset($newLimit)) {
                @ini_set('memory_limit', $originalMemoryLimit);
            }
            
            return null;
        }
    }

    /**
     * Convert memory limit string to bytes
     * 
     * @param string $value Memory limit string (e.g., "128M", "512K")
     * @return int Bytes
     */
    private function convertToBytes(string $value): int
    {
        $value = trim($value);
        $last = strtolower($value[strlen($value) - 1]);
        $value = (int)$value;

        switch ($last) {
            case 'g':
                $value *= 1024;
                // no break
            case 'm':
                $value *= 1024;
                // no break
            case 'k':
                $value *= 1024;
        }

        return $value;
    }

    /**
     * Convert bytes to human-readable format
     * 
     * @param int $bytes Bytes
     * @return string Human-readable format (e.g., "256M")
     */
    private function bytesToHuman(int $bytes): string
    {
        $units = ['B', 'K', 'M', 'G'];
        $unitIndex = 0;
        $size = $bytes;

        while ($size >= 1024 && $unitIndex < count($units) - 1) {
            $size /= 1024;
            $unitIndex++;
        }

        return round($size) . $units[$unitIndex];
    }

    /**
     * Compress logo from base64 string
     * 
     * @param string $base64String Base64 encoded image
     * @param string $mimeType Image MIME type
     * @return array|null Same as compressLogo()
     */
    public function compressLogoFromBase64(string $base64String, string $mimeType): ?array
    {
        $binaryData = base64_decode($base64String, true);
        if ($binaryData === false) {
            \Log::warning("Failed to decode base64 logo string");
            return null;
        }

        return $this->compressLogo($binaryData, $mimeType);
    }
}

