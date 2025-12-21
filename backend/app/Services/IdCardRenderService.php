<?php

namespace App\Services;

use App\Models\IdCardTemplate;
use Illuminate\Support\Facades\Storage;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class IdCardRenderService
{
    /**
     * Generate ID card image/PDF from template
     * 
     * @param IdCardTemplate $template
     * @param array $studentData
     * @param string $side 'front' or 'back'
     * @return string|null Path to generated file or null on error
     */
    public function render(IdCardTemplate $template, array $studentData, string $side = 'front'): ?string
    {
        try {
            // CR80 dimensions: 85.6mm × 53.98mm
            // At 300 DPI: 1011px × 637px
            // At 96 DPI (screen): 323px × 204px
            // Use 300 DPI for high quality
            $width = 1011;
            $height = 637;

            // Check if GD is available
            if (!extension_loaded('gd')) {
                \Log::error('GD extension not available for ID card rendering');
                return null;
            }

            // Create image canvas
            $image = imagecreatetruecolor($width, $height);
            if (!$image) {
                \Log::error('Failed to create image canvas');
                return null;
            }

            // Fill white background
            $white = imagecolorallocate($image, 255, 255, 255);
            imagefill($image, 0, 0, $white);

            // Get layout config (handle JSON string or array)
            $layoutRaw = $side === 'front' 
                ? $template->layout_config_front 
                : $template->layout_config_back;
            
            // Decode if it's a JSON string
            $layout = null;
            if (is_string($layoutRaw)) {
                $layout = json_decode($layoutRaw, true);
            } elseif (is_array($layoutRaw)) {
                $layout = $layoutRaw;
            }

            if (!$layout || !is_array($layout)) {
                \Log::warning("No layout config for {$side} side of template {$template->id}", [
                    'template_id' => $template->id,
                    'side' => $side,
                    'layout_type' => gettype($layoutRaw),
                ]);
                // Still save the white image (card with no fields)
            } else {
                // Draw background image if available
                $backgroundPath = $side === 'front'
                    ? $template->background_image_path_front
                    : $template->background_image_path_back;

                if ($backgroundPath && \Storage::exists($backgroundPath)) {
                    $this->drawBackgroundImage($image, $backgroundPath, $width, $height);
                }

                // Draw enabled fields
                $this->drawFields($image, $layout, $studentData, $width, $height);
            }

            // Save image to storage
            $filename = \Illuminate\Support\Str::uuid()->toString() . '.png';
            $directory = 'id-cards/generated';
            $path = $directory . '/' . $filename;
            $fullPath = \Storage::path($path);

            // Create directory if it doesn't exist
            $dirPath = dirname($fullPath);
            if (!is_dir($dirPath)) {
                mkdir($dirPath, 0755, true);
            }

            // Save image
            imagepng($image, $fullPath, 9); // Quality 9 (0-9, 9 is highest)
            imagedestroy($image);

            return $path;
        } catch (\Exception $e) {
            \Log::error("ID card rendering failed: " . $e->getMessage(), [
                'template_id' => $template->id,
                'side' => $side,
                'exception' => $e,
            ]);
            return null;
        }
    }

    /**
     * Draw background image on canvas
     */
    protected function drawBackgroundImage($image, string $backgroundPath, int $width, int $height): void
    {
        try {
            $fullPath = \Storage::path($backgroundPath);
            $mimeType = \Storage::mimeType($backgroundPath);

            $bgImage = null;
            switch ($mimeType) {
                case 'image/jpeg':
                case 'image/jpg':
                    $bgImage = imagecreatefromjpeg($fullPath);
                    break;
                case 'image/png':
                    $bgImage = imagecreatefrompng($fullPath);
                    break;
                case 'image/gif':
                    $bgImage = imagecreatefromgif($fullPath);
                    break;
                case 'image/webp':
                    if (function_exists('imagecreatefromwebp')) {
                        $bgImage = imagecreatefromwebp($fullPath);
                    }
                    break;
            }

            if ($bgImage) {
                // Get background dimensions
                $bgWidth = imagesx($bgImage);
                $bgHeight = imagesy($bgImage);

                // Scale and center background
                imagecopyresampled($image, $bgImage, 0, 0, 0, 0, $width, $height, $bgWidth, $bgHeight);
                imagedestroy($bgImage);
            }
        } catch (\Exception $e) {
            \Log::warning("Failed to draw background image: " . $e->getMessage());
        }
    }

    /**
     * Draw enabled fields on canvas
     */
    protected function drawFields($image, array $layout, array $studentData, int $width, int $height): void
    {
        $enabledFields = $layout['enabledFields'] ?? [];
        $isRtl = $layout['rtl'] ?? false;
        $fontSize = $layout['fontSize'] ?? 12;
        $fontFamily = $layout['fontFamily'] ?? 'Arial';
        $textColor = $this->hexToRgb($layout['textColor'] ?? '#000000');
        $textColorAllocated = imagecolorallocate($image, $textColor['r'], $textColor['g'], $textColor['b']);

        // Use built-in fonts (GD limitation - for better fonts, use imagick or HTML-to-image)
        $font = 5; // Built-in font size 5 (largest)

        foreach ($enabledFields as $fieldId) {
            $positionKey = $fieldId . 'Position';
            $position = $layout[$positionKey] ?? null;

            if (!$position || !isset($position['x']) || !isset($position['y'])) {
                continue;
            }

            $x = (int)(($position['x'] / 100) * $width);
            $y = (int)(($position['y'] / 100) * $height);

            $text = $this->getFieldValue($fieldId, $studentData);
            if (!$text) {
                continue;
            }

            // Draw text (GD built-in fonts are limited, but functional)
            imagestring($image, $font, $x, $y, $text, $textColorAllocated);
        }

        // Draw student photo if enabled
        if (in_array('studentPhoto', $enabledFields) && !empty($studentData['student_photo'])) {
            $this->drawStudentPhoto($image, $studentData['student_photo'], $layout['studentPhotoPosition'] ?? null, $width, $height);
        }

        // Draw QR code if enabled
        if (in_array('qrCode', $enabledFields) && !empty($studentData['student_code'])) {
            $this->drawQrCode($image, $studentData['student_code'], $layout['qrCodePosition'] ?? null, $width, $height);
        }
    }

    /**
     * Get field value from student data
     */
    protected function getFieldValue(string $fieldId, array $studentData): ?string
    {
        $fieldMap = [
            'studentName' => 'student_name',
            'fatherName' => 'father_name',
            'studentCode' => 'student_code',
            'admissionNumber' => 'admission_number',
            'cardNumber' => 'card_number',
            'class' => 'class_name',
            'academicYear' => 'academic_year',
            'schoolName' => 'school_name',
        ];

        $dataKey = $fieldMap[$fieldId] ?? null;
        return $dataKey ? ($studentData[$dataKey] ?? null) : null;
    }

    /**
     * Draw student photo on canvas
     */
    protected function drawStudentPhoto($image, string $photoPath, ?array $position, int $width, int $height): void
    {
        if (!$position || !\Storage::exists($photoPath)) {
            return;
        }

        try {
            $fullPath = \Storage::path($photoPath);
            $mimeType = \Storage::mimeType($photoPath);

            $photoImage = null;
            switch ($mimeType) {
                case 'image/jpeg':
                case 'image/jpg':
                    $photoImage = imagecreatefromjpeg($fullPath);
                    break;
                case 'image/png':
                    $photoImage = imagecreatefrompng($fullPath);
                    break;
                case 'image/gif':
                    $photoImage = imagecreatefromgif($fullPath);
                    break;
                case 'image/webp':
                    if (function_exists('imagecreatefromwebp')) {
                        $photoImage = imagecreatefromwebp($fullPath);
                    }
                    break;
            }

            if ($photoImage) {
                $photoWidth = imagesx($photoImage);
                $photoHeight = imagesy($photoImage);
                $targetWidth = $position['width'] ? (int)(($position['width'] / 100) * $width) : 100;
                $targetHeight = $position['height'] ? (int)(($position['height'] / 100) * $height) : 100;
                $x = (int)(($position['x'] / 100) * $width);
                $y = (int)(($position['y'] / 100) * $height);

                imagecopyresampled($image, $photoImage, $x, $y, 0, 0, $targetWidth, $targetHeight, $photoWidth, $photoHeight);
                imagedestroy($photoImage);
            }
        } catch (\Exception $e) {
            \Log::warning("Failed to draw student photo: " . $e->getMessage());
        }
    }

    /**
     * Draw QR code on canvas
     */
    protected function drawQrCode($image, string $studentCode, ?array $position, int $width, int $height): void
    {
        if (!$position) {
            return;
        }

        try {
            // Generate QR code
            $qrBase64 = $this->generateQrCode($studentCode, 200);
            
            // Decode base64
            $qrData = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $qrBase64));
            $qrImage = imagecreatefromstring($qrData);

            if ($qrImage) {
                $qrWidth = imagesx($qrImage);
                $qrHeight = imagesy($qrImage);
                $targetWidth = $position['width'] ? (int)(($position['width'] / 100) * $width) : 120;
                $targetHeight = $position['height'] ? (int)(($position['height'] / 100) * $height) : 120;
                $x = (int)(($position['x'] / 100) * $width);
                $y = (int)(($position['y'] / 100) * $height);

                imagecopyresampled($image, $qrImage, $x, $y, 0, 0, $targetWidth, $targetHeight, $qrWidth, $qrHeight);
                imagedestroy($qrImage);
            }
        } catch (\Exception $e) {
            \Log::warning("Failed to draw QR code: " . $e->getMessage());
        }
    }

    /**
     * Convert hex color to RGB
     */
    protected function hexToRgb(string $hex): array
    {
        $hex = ltrim($hex, '#');
        if (strlen($hex) === 3) {
            $hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] . $hex[2] . $hex[2];
        }
        return [
            'r' => hexdec(substr($hex, 0, 2)),
            'g' => hexdec(substr($hex, 2, 2)),
            'b' => hexdec(substr($hex, 4, 2)),
        ];
    }

    /**
     * Generate QR code for student code
     * 
     * @param string $studentCode
     * @param int $size
     * @return string Base64 encoded QR code image
     */
    public function generateQrCode(string $studentCode, int $size = 100): string
    {
        $qrCode = QrCode::format('png')
            ->size($size)
            ->generate($studentCode);

        return 'data:image/png;base64,' . base64_encode($qrCode);
    }

    /**
     * Get background image as base64
     * 
     * @param IdCardTemplate $template
     * @param string $side 'front' or 'back'
     * @return string|null Base64 encoded image or null
     */
    public function getBackgroundImage(IdCardTemplate $template, string $side = 'front'): ?string
    {
        $backgroundPath = $side === 'front' 
            ? $template->background_image_path_front 
            : $template->background_image_path_back;

        if (!$backgroundPath || !Storage::exists($backgroundPath)) {
            return null;
        }

        $imageContent = Storage::get($backgroundPath);
        $imageExtension = pathinfo($backgroundPath, PATHINFO_EXTENSION);
        $mimeType = match (strtolower($imageExtension)) {
            'jpg', 'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'webp' => 'image/webp',
            default => 'image/png',
        };

        return 'data:' . $mimeType . ';base64,' . base64_encode($imageContent);
    }
}

