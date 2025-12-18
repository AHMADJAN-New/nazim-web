<?php

namespace App\Services;

use App\Models\Letterhead;
use Illuminate\Support\Facades\Storage;

class DocumentRenderingService
{
    /**
     * Render complete HTML document with letterhead, positioned blocks, and proper fonts.
     */
    public function render(string $bodyHtml, array $options = []): string
    {
        $letterheadHtml = $options['letterhead_html'] ?? '';
        $tablePayload = $options['table_payload'] ?? null;
        $pageLayout = $options['page_layout'] ?? 'A4_portrait';
        $fieldPositions = $options['field_positions'] ?? [];
        $variables = $options['variables'] ?? [];
        $useBase64 = $options['use_base64'] ?? true;

        $tableHtml = $tablePayload ? $this->renderTablePayload($tablePayload) : '';

        // Render positioned blocks if available
        $positionedBlocksHtml = '';
        if (!empty($fieldPositions)) {
            $positionedBlocksHtml = $this->renderPositionedBlocks($fieldPositions, $variables);
        }

        // Build content: letterhead background + positioned blocks + body content
        $content = $letterheadHtml . $positionedBlocksHtml . $bodyHtml . $tableHtml;

        // Get font CSS
        $fontCss = $this->getFontCss($useBase64);

        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob: https:;">
    <style>
        {$fontCss}

        @page {
            size: {$this->pageSize($pageLayout)};
            margin: 0;
        }

        * {
            box-sizing: border-box;
        }

        html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
        }

        body {
            font-family: 'Bahij Nassim', 'Inter', 'Arial', sans-serif;
            line-height: 1.4;
            position: relative;
        }

        .page-container {
            position: relative;
            width: {$this->pageWidth($pageLayout)};
            min-height: {$this->pageHeight($pageLayout)};
            margin: 0 auto;
            padding: 20mm;
            background: white;
        }

        .letterhead-layer {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 0;
            pointer-events: none;
        }

        .content-layer {
            position: relative;
            z-index: 1;
        }

        .positioned-blocks-layer {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 2;
            pointer-events: none;
        }

        .positioned-block {
            position: absolute;
            pointer-events: auto;
            overflow: hidden;
            word-wrap: break-word;
        }

        .rtl {
            direction: rtl;
            text-align: right;
        }

        .ltr {
            direction: ltr;
            text-align: left;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        thead {
            display: table-header-group;
        }

        tfoot {
            display: table-row-group;
        }

        tr {
            page-break-inside: avoid;
        }

        th, td {
            border: 1px solid #333;
            padding: 6px;
            font-size: 12px;
        }

        .page-break {
            page-break-after: always;
        }

        /* PDF Letterhead Placeholder */
        .pdf-letterhead-placeholder {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%);
            border: 2px dashed #999;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #666;
            font-size: 14px;
            text-align: center;
            z-index: -1;
        }

        .pdf-letterhead-placeholder::before {
            content: 'PDF Letterhead Background';
            display: block;
            padding: 20px;
        }
    </style>
</head>
<body>
    <div class="page-container">
        <div class="letterhead-layer">{$letterheadHtml}</div>
        <div class="positioned-blocks-layer">{$positionedBlocksHtml}</div>
        <div class="content-layer">{$bodyHtml}{$tableHtml}</div>
    </div>
</body>
</html>
HTML;
    }

    /**
     * Get font CSS with optional base64 encoding.
     */
    private function getFontCss(bool $useBase64 = true): string
    {
        if ($useBase64) {
            $nassimRegular = $this->getBase64Font('Bahij Nassim-Regular.woff');
            $nassimBold = $this->getBase64Font('Bahij Nassim-Bold.woff');
            $titrBold = $this->getBase64Font('Bahij Titr-Bold.woff');

            return <<<CSS
@font-face {
    font-family: 'Bahij Nassim';
    src: url(data:font/woff;base64,{$nassimRegular}) format('woff');
    font-weight: normal;
    font-style: normal;
}

@font-face {
    font-family: 'Bahij Nassim';
    src: url(data:font/woff;base64,{$nassimBold}) format('woff');
    font-weight: bold;
    font-style: normal;
}

@font-face {
    font-family: 'Bahij Titr';
    src: url(data:font/woff;base64,{$titrBold}) format('woff');
    font-weight: bold;
    font-style: normal;
}
CSS;
        }

        return <<<CSS
@font-face {
    font-family: 'Bahij Nassim';
    src: url('/fonts/Bahij Nassim-Regular.woff') format('woff');
    font-weight: normal;
    font-style: normal;
}

@font-face {
    font-family: 'Bahij Nassim';
    src: url('/fonts/Bahij Nassim-Bold.woff') format('woff');
    font-weight: bold;
    font-style: normal;
}

@font-face {
    font-family: 'Bahij Titr';
    src: url('/fonts/Bahij Titr-Bold.woff') format('woff');
    font-weight: bold;
    font-style: normal;
}
CSS;
    }

    /**
     * Get base64 encoded font.
     */
    private function getBase64Font(string $fontName): string
    {
        $fontPath = public_path("fonts/{$fontName}");
        if (file_exists($fontPath)) {
            return base64_encode(file_get_contents($fontPath));
        }
        return '';
    }

    /**
     * Render positioned text blocks.
     */
    private function renderPositionedBlocks(array $fieldPositions, array $variables = []): string
    {
        $html = '';

        foreach ($fieldPositions as $block) {
            $id = $block['id'] ?? uniqid('block-');
            $type = $block['type'] ?? 'text';
            $x = $block['x'] ?? 0;
            $y = $block['y'] ?? 0;
            $width = $block['width'] ?? 200;
            $height = $block['height'] ?? 50;
            $content = $block['content'] ?? '';
            $variableName = $block['variableName'] ?? null;
            $styles = $block['styles'] ?? [];

            // Get content based on type
            if ($type === 'variable' && $variableName && isset($variables[$variableName])) {
                $content = $variables[$variableName];
            }

            // Build inline styles
            $inlineStyles = $this->buildInlineStyles($styles, $x, $y, $width, $height);

            $html .= sprintf(
                '<div class="positioned-block" id="%s" style="%s">%s</div>',
                e($id),
                e($inlineStyles),
                $content // Content may contain HTML
            );
        }

        return $html;
    }

    /**
     * Build inline CSS styles for a positioned block.
     */
    private function buildInlineStyles(array $styles, float $x, float $y, float $width, float $height): string
    {
        $css = [];

        // Position (using mm for print accuracy)
        $css[] = "left: {$x}mm";
        $css[] = "top: {$y}mm";
        $css[] = "width: {$width}mm";
        $css[] = "min-height: {$height}mm";

        // Font family
        $fontFamily = $styles['fontFamily'] ?? 'Bahij Nassim';
        $css[] = "font-family: '{$fontFamily}', 'Inter', 'Arial', sans-serif";

        // Font size
        $fontSize = $styles['fontSize'] ?? 14;
        $css[] = "font-size: {$fontSize}px";

        // Font weight
        $fontWeight = $styles['fontWeight'] ?? 'normal';
        $css[] = "font-weight: {$fontWeight}";

        // Text color
        $color = $styles['color'] ?? '#000000';
        $css[] = "color: {$color}";

        // Text alignment
        $textAlign = $styles['textAlign'] ?? 'left';
        $css[] = "text-align: {$textAlign}";

        // Direction (RTL/LTR)
        $direction = $styles['direction'] ?? 'ltr';
        $css[] = "direction: {$direction}";

        // Line height
        $lineHeight = $styles['lineHeight'] ?? 1.5;
        $css[] = "line-height: {$lineHeight}";

        // Background (optional)
        if (isset($styles['backgroundColor'])) {
            $css[] = "background-color: {$styles['backgroundColor']}";
        }

        // Border (optional)
        if (isset($styles['border'])) {
            $css[] = "border: {$styles['border']}";
        }

        // Padding (optional)
        $padding = $styles['padding'] ?? '2px';
        $css[] = "padding: {$padding}";

        return implode('; ', $css);
    }

    private function renderTablePayload(array $payload): string
    {
        if (empty($payload['headers']) || empty($payload['rows'])) {
            return '';
        }

        $headers = array_map(fn ($h) => sprintf('<th>%s</th>', e($h)), $payload['headers']);
        $rows = collect($payload['rows'])->map(function ($row) {
            $cells = array_map(fn ($cell) => sprintf('<td>%s</td>', e((string) $cell)), $row);
            return '<tr>' . implode('', $cells) . '</tr>';
        })->implode('');

        return '<table><thead><tr>' . implode('', $headers) . '</tr></thead><tbody>' . $rows . '</tbody></table>';
    }

    private function pageSize(string $layout): string
    {
        return $layout === 'A4_landscape' ? 'A4 landscape' : 'A4 portrait';
    }

    private function pageWidth(string $layout): string
    {
        return $layout === 'A4_landscape' ? '297mm' : '210mm';
    }

    private function pageHeight(string $layout): string
    {
        return $layout === 'A4_landscape' ? '210mm' : '297mm';
    }

    /**
     * Process letterhead file and convert to HTML with base64 encoding.
     */
    public function processLetterheadFile(Letterhead $letterhead, bool $useBase64 = true): string
    {
        if (!$letterhead->file_path || !Storage::exists($letterhead->file_path)) {
            return '';
        }

        $fileType = $letterhead->file_type ?? 'image';
        $position = $letterhead->position ?? 'header';

        if ($fileType === 'pdf') {
            // Try to convert PDF to image for better preview
            $imageData = $this->convertPdfToImage($letterhead->file_path);
            if ($imageData) {
                return $this->renderImageLetterhead($imageData, $letterhead->name, $position);
            }
            // Fallback to PDF embed if conversion fails
            if ($useBase64) {
                $fileContent = Storage::get($letterhead->file_path);
                $base64 = base64_encode($fileContent);
                $dataUri = "data:application/pdf;base64,{$base64}";
            } else {
                $dataUri = Storage::url($letterhead->file_path);
            }
            return $this->renderPdfLetterhead($dataUri, $letterhead->name, $position, $useBase64);
        }

        // For images
        if ($useBase64) {
            $fileContent = Storage::get($letterhead->file_path);
            $mimeType = Storage::mimeType($letterhead->file_path) ?: 'image/png';
            $base64 = base64_encode($fileContent);
            $dataUri = "data:{$mimeType};base64,{$base64}";
        } else {
            $dataUri = Storage::url($letterhead->file_path);
        }

        return $this->renderImageLetterhead($dataUri, $letterhead->name, $position);
    }

    /**
     * Convert PDF first page to image using Imagick.
     */
    private function convertPdfToImage(string $filePath): ?string
    {
        // Check if Imagick is available
        if (!extension_loaded('imagick')) {
            return null;
        }

        try {
            $fullPath = Storage::path($filePath);
            if (!file_exists($fullPath)) {
                return null;
            }

            $imagick = new \Imagick();
            $imagick->setResolution(150, 150); // 150 DPI for good quality
            $imagick->readImage($fullPath . '[0]'); // First page only
            $imagick->setImageFormat('png');
            $imagick->setImageCompressionQuality(90);

            // Get image as base64
            $imageData = $imagick->getImageBlob();
            $base64 = base64_encode($imageData);

            $imagick->clear();
            $imagick->destroy();

            return "data:image/png;base64,{$base64}";
        } catch (\Exception $e) {
            // Log error and return null to use fallback
            \Log::warning('PDF to image conversion failed: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Render image letterhead based on position.
     */
    private function renderImageLetterhead(string $src, string $name, string $position): string
    {
        if ($position === 'background') {
            return sprintf(
                '<div style="position: absolute; top: 0; left: 0; width: 100%%; height: 100%%; background-image: url(%s); background-size: cover; background-repeat: no-repeat; background-position: center; opacity: 0.15; z-index: -1;"></div>',
                e($src)
            );
        } elseif ($position === 'watermark') {
            return sprintf(
                '<div style="position: absolute; top: 50%%; left: 50%%; transform: translate(-50%%, -50%%) rotate(-45deg); opacity: 0.08; z-index: -1;"><img src="%s" alt="%s" style="max-width: 80%%; max-height: 80%%; width: auto; height: auto;" /></div>',
                e($src),
                e($name)
            );
        } else {
            // Default: header - full page background
            return sprintf(
                '<div style="position: absolute; top: 0; left: 0; width: 100%%; height: 100%%; z-index: -1;"><img src="%s" alt="%s" style="width: 100%%; height: 100%%; object-fit: contain; object-position: top center;" /></div>',
                e($src),
                e($name)
            );
        }
    }

    /**
     * Render PDF letterhead based on position.
     */
    private function renderPdfLetterhead(string $src, string $name, string $position, bool $useBase64 = true): string
    {
        // For PDF letterheads, embed the PDF directly using object tag
        if ($position === 'background') {
            // Background PDF - display at lower opacity behind content
            return sprintf(
                '<div style="position: absolute; top: 0; left: 0; width: 100%%; height: 100%%; z-index: -1; opacity: 0.15;">
                    <object data="%s" type="application/pdf" style="width: 100%%; height: 100%%; border: none;">
                        <embed src="%s" type="application/pdf" style="width: 100%%; height: 100%%;">
                    </object>
                </div>',
                e($src),
                e($src)
            );
        } else {
            // Header position - display PDF at full size as background
            return sprintf(
                '<div style="position: absolute; top: 0; left: 0; width: 100%%; height: 100%%; z-index: -1;">
                    <object data="%s" type="application/pdf" style="width: 100%%; height: 100%%; border: none;">
                        <embed src="%s" type="application/pdf" style="width: 100%%; height: 100%%;">
                    </object>
                </div>',
                e($src),
                e($src)
            );
        }
    }

    /**
     * Replace template variables in HTML content.
     */
    public function replaceTemplateVariables(string $html, array $variables): string
    {
        foreach ($variables as $key => $value) {
            // Replace {{variable}} and {{ variable }} patterns
            $html = str_replace("{{$key}}", $value, $html);
            $html = str_replace("{{ {$key} }}", $value, $html);
            $html = str_replace("{{ {$key}}}", $value, $html);
            $html = str_replace("{{{$key} }}", $value, $html);
        }

        return $html;
    }

    /**
     * Render document with letterhead and positioned fields.
     */
    public function renderWithLetterhead(string $bodyHtml, ?Letterhead $letterhead = null, array $options = []): string
    {
        $letterheadHtml = '';
        $useBase64 = $options['use_base64'] ?? true;

        if ($letterhead) {
            $letterheadHtml = $this->processLetterheadFile($letterhead, $useBase64);
        }

        // Replace variables if provided
        if (isset($options['variables']) && is_array($options['variables'])) {
            $bodyHtml = $this->replaceTemplateVariables($bodyHtml, $options['variables']);
        }

        return $this->render($bodyHtml, array_merge($options, [
            'letterhead_html' => $letterheadHtml,
            'use_base64' => $useBase64,
        ]));
    }

    /**
     * Get letterhead as base64 data URI for frontend preview.
     */
    public function getLetterheadBase64(Letterhead $letterhead): ?string
    {
        if (!$letterhead->file_path || !Storage::exists($letterhead->file_path)) {
            return null;
        }

        $fileType = $letterhead->file_type ?? 'image';

        // For PDF, convert to image first
        if ($fileType === 'pdf') {
            $imageData = $this->convertPdfToImage($letterhead->file_path);
            if ($imageData) {
                return $imageData;
            }
            // Fallback to PDF data URI
            $fileContent = Storage::get($letterhead->file_path);
            return "data:application/pdf;base64," . base64_encode($fileContent);
        }

        // For images, return as-is
        $fileContent = Storage::get($letterhead->file_path);
        $mimeType = Storage::mimeType($letterhead->file_path) ?: 'image/png';

        return "data:{$mimeType};base64," . base64_encode($fileContent);
    }

    /**
     * Render preview HTML specifically for iframe embedding.
     * This version ensures all resources are embedded as base64.
     */
    public function renderPreviewHtml(
        string $bodyHtml,
        ?Letterhead $letterhead = null,
        array $fieldPositions = [],
        array $variables = [],
        string $pageLayout = 'A4_portrait'
    ): string {
        $letterheadHtml = '';

        if ($letterhead) {
            $letterheadHtml = $this->processLetterheadFile($letterhead, true);
        }

        // Replace variables in body
        $bodyHtml = $this->replaceTemplateVariables($bodyHtml, $variables);

        return $this->render($bodyHtml, [
            'letterhead_html' => $letterheadHtml,
            'field_positions' => $fieldPositions,
            'variables' => $variables,
            'page_layout' => $pageLayout,
            'use_base64' => true,
        ]);
    }
}
