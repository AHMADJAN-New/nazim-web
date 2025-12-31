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

            // Prefer ImageMagick for better font and RTL support
            if (extension_loaded('imagick')) {
                return $this->renderWithImagick($template, $studentData, $side, $width, $height);
            }

            // Fallback to GD if ImageMagick is not available
            if (!extension_loaded('gd')) {
                \Log::error('Neither ImageMagick nor GD extension is available for ID card rendering');
                return null;
            }

            return $this->renderWithGD($template, $studentData, $side, $width, $height);
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
     * Render ID card using ImageMagick (preferred method)
     */
    protected function renderWithImagick(IdCardTemplate $template, array $studentData, string $side, int $width, int $height): ?string
    {
        try {
            // Create new Imagick image with white background
            $image = new \Imagick();
            $image->newImage($width, $height, new \ImagickPixel('white'));
            $image->setImageFormat('png');
            $image->setImageResolution(300, 300);
            $image->setImageUnits(\Imagick::RESOLUTION_PIXELSPERINCH);

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
                    $this->drawBackgroundImageImagick($image, $backgroundPath, $width, $height);
                }

                // Draw enabled fields
                $this->drawFieldsImagick($image, $layout, $studentData, $width, $height);
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
            $image->writeImage($fullPath);
            $image->clear();
            $image->destroy();

            return $path;
        } catch (\Exception $e) {
            \Log::error("ImageMagick ID card rendering failed: " . $e->getMessage(), [
                'template_id' => $template->id,
                'side' => $side,
                'exception' => $e,
            ]);
            return null;
        }
    }

    /**
     * Render ID card using GD (fallback method)
     */
    protected function renderWithGD(IdCardTemplate $template, array $studentData, string $side, int $width, int $height): ?string
    {
        try {
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
            \Log::error("GD ID card rendering failed: " . $e->getMessage(), [
                'template_id' => $template->id,
                'side' => $side,
                'exception' => $e,
            ]);
            return null;
        }
    }

    /**
     * Draw background image on ImageMagick canvas
     */
    protected function drawBackgroundImageImagick(\Imagick $image, string $backgroundPath, int $width, int $height): void
    {
        try {
            $fullPath = \Storage::path($backgroundPath);
            if (!file_exists($fullPath)) {
                return;
            }

            $bgImage = new \Imagick($fullPath);
            $bgImage->resizeImage($width, $height, \Imagick::FILTER_LANCZOS, 1, true);
            $image->compositeImage($bgImage, \Imagick::COMPOSITE_OVER, 0, 0);
            $bgImage->clear();
            $bgImage->destroy();
        } catch (\Exception $e) {
            \Log::warning("Failed to draw background image with ImageMagick: " . $e->getMessage());
        }
    }

    /**
     * Draw background image on canvas using GD
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
     * Draw enabled fields on canvas using ImageMagick
     */
    protected function drawFieldsImagick(\Imagick $image, array $layout, array $studentData, int $width, int $height): void
    {
        $enabledFields = $layout['enabledFields'] ?? [];
        $isRtl = $layout['rtl'] ?? false;
        $baseFontSize = $layout['fontSize'] ?? 12;
        $baseFontFamily = $layout['fontFamily'] ?? 'Arial';
        $textColor = $layout['textColor'] ?? '#000000';

        // Get field-specific font settings
        $fieldFonts = $layout['fieldFonts'] ?? [];

        foreach ($enabledFields as $fieldId) {
            $positionKey = $fieldId . 'Position';
            $position = $layout[$positionKey] ?? null;

            if (!$position || !isset($position['x']) || !isset($position['y'])) {
                continue;
            }

            $text = $this->getFieldValue($fieldId, $studentData);
            if (!$text) {
                continue;
            }

            // Get field-specific font settings or use defaults
            $fieldFont = $fieldFonts[$fieldId] ?? [];
            $fontSize = $fieldFont['fontSize'] ?? $position['fontSize'] ?? $baseFontSize;
            $fontFamily = $fieldFont['fontFamily'] ?? $position['fontFamily'] ?? $baseFontFamily;
            $fieldTextColor = $fieldFont['textColor'] ?? $textColor;
            $fontWeight = $fieldFont['fontWeight'] ?? ($fieldId === 'studentName' ? 'bold' : 'normal');

            // Calculate pixel position
            $x = (int)(($position['x'] / 100) * $width);
            $y = (int)(($position['y'] / 100) * $height);

            // Get text alignment (default to center for most fields)
            $textAlign = $position['textAlign'] ?? 'center';

            // Draw text using ImageMagick
            $this->drawTextImagick($image, $text, $x, $y, $fontSize, $fontFamily, $fieldTextColor, $fontWeight, $textAlign, $isRtl);
        }

        // Draw student photo if enabled
        if (in_array('studentPhoto', $enabledFields) && !empty($studentData['student_photo'])) {
            $this->drawStudentPhotoImagick($image, $studentData['student_photo'], $layout['studentPhotoPosition'] ?? null, $width, $height);
        }

        // Draw QR code if enabled
        if (in_array('qrCode', $enabledFields) && !empty($studentData['student_code'])) {
            $this->drawQrCodeImagick($image, $studentData['student_code'], $layout['qrCodePosition'] ?? null, $width, $height);
        }
    }

    /**
     * Draw text on ImageMagick canvas with proper font and RTL support
     */
    protected function drawTextImagick(\Imagick $image, string $text, int $x, int $y, int $fontSize, string $fontFamily, string $textColor, string $fontWeight, string $textAlign, bool $isRtl): void
    {
        try {
            // Find font file path
            $fontPath = $this->findFontPath($fontFamily);
            
            // Create draw object
            $draw = new \ImagickDraw();
            
            // Set font - prefer font file path if found, otherwise use font name
            if ($fontPath && file_exists($fontPath)) {
                $draw->setFont($fontPath);
            } else {
                // Try to use font by name (ImageMagick will search system fonts)
                // Remove quotes from font name
                $cleanFontName = trim($fontFamily, '"\'');
                $draw->setFont($cleanFontName);
            }

            // Set font size
            $draw->setFontSize($fontSize);

            // Set font weight
            if ($fontWeight === 'bold') {
                $draw->setFontWeight(700);
            } else {
                $draw->setFontWeight(400);
            }

            // Set text color
            $draw->setFillColor(new \ImagickPixel($textColor));

            // Set text encoding to UTF-8 for proper Unicode support
            $draw->setTextEncoding('UTF-8');

            // Calculate text metrics for alignment
            // Note: queryFontMetrics may not work correctly for RTL text, but we'll use it for positioning
            $metrics = $image->queryFontMetrics($draw, $text);
            $textWidth = isset($metrics['textWidth']) ? $metrics['textWidth'] : ($fontSize * mb_strlen($text) * 0.6);
            $textHeight = isset($metrics['textHeight']) ? $metrics['textHeight'] : $fontSize;

            // Adjust X position based on alignment and RTL
            $adjustedX = $x;
            if ($isRtl) {
                // For RTL, reverse the alignment logic
                if ($textAlign === 'center') {
                    $adjustedX = $x - ($textWidth / 2);
                } elseif ($textAlign === 'left') {
                    // In RTL, 'left' means start from right
                    $adjustedX = $x - $textWidth;
                } else {
                    // 'right' in RTL means start from left
                    $adjustedX = $x;
                }
            } else {
                // LTR alignment
                if ($textAlign === 'center') {
                    $adjustedX = $x - ($textWidth / 2);
                } elseif ($textAlign === 'right') {
                    $adjustedX = $x - $textWidth;
                } else {
                    // 'left' is default
                    $adjustedX = $x;
                }
            }

            // Adjust Y position (ImageMagick uses baseline, we want center)
            $adjustedY = $y;
            if (isset($metrics['ascender']) && isset($metrics['descender'])) {
                $adjustedY = $y + (($metrics['ascender'] - $metrics['descender']) / 2) - $metrics['descender'];
            } else {
                // Fallback: center vertically based on font size
                $adjustedY = $y + ($textHeight / 2);
            }

            // Draw text
            // Note: ImageMagick will render RTL text correctly if the font supports it (like Bahij Nassim)
            $image->annotateImage($draw, $adjustedX, $adjustedY, 0, $text);

            $draw->clear();
            $draw->destroy();
        } catch (\Exception $e) {
            \Log::warning("Failed to draw text with ImageMagick: " . $e->getMessage(), [
                'text' => mb_substr($text, 0, 50),
                'font' => $fontFamily,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Find font file path for a given font family name
     */
    protected function findFontPath(string $fontFamily): ?string
    {
        // Remove quotes and clean font name
        $fontName = trim($fontFamily, '"\'');
        
        // Normalize font name for searching (remove spaces, handle variations)
        $normalizedName = str_replace(' ', '', $fontName);
        $searchNames = [
            $fontName,                    // Original: "Bahij Nassim"
            $normalizedName,              // "BahijNassim"
            strtolower($normalizedName),  // "bahijnassim"
            str_replace(' ', '-', $fontName), // "Bahij-Nassim"
        ];
        
        // Common font paths
        $fontPaths = [
            '/usr/share/fonts/truetype/',
            '/usr/share/fonts/TTF/',
            '/usr/share/fonts/opentype/',
            '/usr/share/fonts/',
            '/usr/local/share/fonts/',
            '/System/Library/Fonts/',
            '/Library/Fonts/',
            storage_path('fonts/'),
            base_path('storage/fonts/'),
        ];

        // Common font file extensions
        $extensions = ['ttf', 'otf', 'ttc'];

        // Try to find font file
        foreach ($fontPaths as $basePath) {
            if (!is_dir($basePath)) {
                continue;
            }

            foreach ($searchNames as $searchName) {
                foreach ($extensions as $ext) {
                    // Try exact match
                    $fontFile = $basePath . $searchName . '.' . $ext;
                    if (file_exists($fontFile)) {
                        return $fontFile;
                    }

                    // Try case-insensitive glob match
                    $pattern = $basePath . '*' . $searchName . '*.' . $ext;
                    $files = glob($pattern, GLOB_NOCASE);
                    if (!empty($files)) {
                        return $files[0];
                    }
                }
            }

            // Try recursive search (slower but more thorough)
            try {
                $iterator = new \RecursiveIteratorIterator(
                    new \RecursiveDirectoryIterator($basePath, \RecursiveDirectoryIterator::SKIP_DOTS)
                );
                foreach ($iterator as $file) {
                    if (!$file->isFile()) {
                        continue;
                    }
                    
                    $ext = strtolower($file->getExtension());
                    if (!in_array($ext, $extensions)) {
                        continue;
                    }
                    
                    $filename = $file->getFilename();
                    foreach ($searchNames as $searchName) {
                        if (stripos($filename, $searchName) !== false) {
                            return $file->getPathname();
                        }
                    }
                }
            } catch (\Exception $e) {
                // Skip if directory is not readable
                continue;
            }
        }

        // If not found, return null (ImageMagick will try to find it by name)
        \Log::debug("Font file not found for: {$fontName}, ImageMagick will attempt to find it by name");
        return null;
    }

    /**
     * Draw enabled fields on canvas using GD (fallback)
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
     * Draw student photo on ImageMagick canvas
     */
    protected function drawStudentPhotoImagick(\Imagick $image, string $photoPath, ?array $position, int $width, int $height): void
    {
        if (!$position || !\Storage::exists($photoPath)) {
            return;
        }

        try {
            $fullPath = \Storage::path($photoPath);
            if (!file_exists($fullPath)) {
                return;
            }

            $photoImage = new \Imagick($fullPath);
            // Use saved width/height from config, or default 8% width x 12% height (ID card appropriate sizes)
            $photoWidthPercent = $position['width'] ?? 8;
            $photoHeightPercent = $position['height'] ?? 12;
            $targetWidth = (int)(($photoWidthPercent / 100) * $width);
            $targetHeight = (int)(($photoHeightPercent / 100) * $height);
            
            // Positions in the layout designer are CENTER-based, so draw image centered
            $centerX = (int)(($position['x'] / 100) * $width);
            $centerY = (int)(($position['y'] / 100) * $height);
            $x = $centerX - ($targetWidth / 2);
            $y = $centerY - ($targetHeight / 2);

            $photoImage->resizeImage($targetWidth, $targetHeight, \Imagick::FILTER_LANCZOS, 1, true);
            $image->compositeImage($photoImage, \Imagick::COMPOSITE_OVER, $x, $y);
            $photoImage->clear();
            $photoImage->destroy();
        } catch (\Exception $e) {
            \Log::warning("Failed to draw student photo with ImageMagick: " . $e->getMessage());
        }
    }

    /**
     * Draw student photo on canvas using GD
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
                // Use saved width/height from config, or default 8% width x 12% height (ID card appropriate sizes)
                $photoWidthPercent = $position['width'] ?? 8;
                $photoHeightPercent = $position['height'] ?? 12;
                $targetWidth = (int)(($photoWidthPercent / 100) * $width);
                $targetHeight = (int)(($photoHeightPercent / 100) * $height);
                
                // Positions in the layout designer are CENTER-based, so draw image centered
                $centerX = (int)(($position['x'] / 100) * $width);
                $centerY = (int)(($position['y'] / 100) * $height);
                $x = $centerX - ($targetWidth / 2);
                $y = $centerY - ($targetHeight / 2);

                imagecopyresampled($image, $photoImage, $x, $y, 0, 0, $targetWidth, $targetHeight, $photoWidth, $photoHeight);
                imagedestroy($photoImage);
            }
        } catch (\Exception $e) {
            \Log::warning("Failed to draw student photo: " . $e->getMessage());
        }
    }

    /**
     * Draw QR code on ImageMagick canvas
     */
    protected function drawQrCodeImagick(\Imagick $image, string $studentCode, ?array $position, int $width, int $height): void
    {
        if (!$position) {
            return;
        }

        try {
            // Generate QR code
            $qrBase64 = $this->generateQrCode($studentCode, 200);
            
            // Decode base64
            $qrData = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $qrBase64));
            
            $qrImage = new \Imagick();
            $qrImage->readImageBlob($qrData);
            
            // Use saved width/height from config, or default 10% x 10% (square)
            // QR codes should always be square - use the smaller dimension to prevent stretching
            $qrWidthPercent = $position['width'] ?? 10;
            $qrHeightPercent = $position['height'] ?? 10;
            $qrWidth = (int)(($qrWidthPercent / 100) * $width);
            $qrHeight = (int)(($qrHeightPercent / 100) * $height);
            $targetSize = min($qrWidth, $qrHeight); // Use smaller dimension for square
            $targetWidth = $targetSize;
            $targetHeight = $targetSize;
            
            // Positions in the layout designer are CENTER-based, so draw QR code centered
            $centerX = (int)(($position['x'] / 100) * $width);
            $centerY = (int)(($position['y'] / 100) * $height);
            $x = $centerX - ($targetSize / 2);
            $y = $centerY - ($targetSize / 2);

            $qrImage->resizeImage($targetWidth, $targetHeight, \Imagick::FILTER_LANCZOS, 1, true);
            $image->compositeImage($qrImage, \Imagick::COMPOSITE_OVER, $x, $y);
            $qrImage->clear();
            $qrImage->destroy();
        } catch (\Exception $e) {
            \Log::warning("Failed to draw QR code with ImageMagick: " . $e->getMessage());
        }
    }

    /**
     * Draw QR code on canvas using GD
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
                
                // Use saved width/height from config, or default 10% x 10% (square)
                // QR codes should always be square - use the smaller dimension to prevent stretching
                $qrWidthPercent = $position['width'] ?? 10;
                $qrHeightPercent = $position['height'] ?? 10;
                $calcWidth = (int)(($qrWidthPercent / 100) * $width);
                $calcHeight = (int)(($qrHeightPercent / 100) * $height);
                $targetSize = min($calcWidth, $calcHeight); // Use smaller dimension for square
                $targetWidth = $targetSize;
                $targetHeight = $targetSize;
                
                // Positions in the layout designer are CENTER-based, so draw QR code centered
                $centerX = (int)(($position['x'] / 100) * $width);
                $centerY = (int)(($position['y'] / 100) * $height);
                $x = $centerX - ($targetSize / 2);
                $y = $centerY - ($targetSize / 2);

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

