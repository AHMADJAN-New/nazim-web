<?php

namespace App\Services;

use App\Models\Letterhead;
use App\Models\LetterTemplate;
use App\Models\OutgoingDocument;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Spatie\Browsershot\Browsershot;

class DocumentRenderingService
{
    /**
     * Render document with layered PDF generation
     *
     * @param LetterTemplate $template
     * @param string $bodyText Processed text with replaced placeholders
     * @param array $options Additional rendering options
     * @return string HTML ready for PDF conversion
     */
    public function render(LetterTemplate $template, string $bodyText, array $options = []): string
    {
        $letterhead = $template->letterhead;
        $watermark = $template->watermark;
        $pageLayout = $template->page_layout ?? 'A4_portrait';
        $repeatLetterhead = $template->repeat_letterhead_on_pages ?? true;
        $tablePayload = $options['table_payload'] ?? null;
        $forBrowser = $options['for_browser'] ?? false; // For browser preview vs PDF generation

        // Build CSS styles
        $styles = $this->buildStyles($pageLayout);

        // Build letterhead background CSS
        $letterheadStyles = $this->buildLetterheadStyles($letterhead, $repeatLetterhead, $forBrowser);

        // Build letterhead HTML element (for browser preview)
        $letterheadHtml = $forBrowser ? $this->buildLetterheadHtml($letterhead) : '';

        // Build watermark HTML
        $watermarkHtml = $this->buildWatermarkHtml($watermark, $forBrowser);

        // Build table HTML if provided
        $tableHtml = $tablePayload ? $this->renderTablePayload($tablePayload) : '';

        // Build content HTML with positioning support
        $fieldPositions = $template->field_positions ?? [];
        $contentHtml = $this->formatBodyTextWithPositions($bodyText, $fieldPositions) . $tableHtml;
        
        // Add wrapper class based on whether we have positioned blocks
        $hasPositionedBlocks = !empty($fieldPositions);
        $wrapperClass = $hasPositionedBlocks ? 'content-wrapper positioned-content' : 'content-wrapper';

        // For browser preview, don't add CSP meta tag - parent page already has CSP
        // Adding CSP to iframe content causes conflicts and "Refused to frame" errors
        // The parent page's CSP is sufficient for security, and iframe content is already sandboxed
        $cspMeta = '';

        return $this->buildHtmlDocument($styles, $letterheadStyles, $letterheadHtml, $watermarkHtml, $contentHtml, $cspMeta, $wrapperClass);
    }

    /**
     * Generate PDF from template and data
     * Uses Browsershot (headless Chrome) for better CSS support and exact positioning
     *
     * @param LetterTemplate $template
     * @param string $bodyText
     * @param array $options
     * @return string Returns storage file path (e.g., 'temp/{uuid}.pdf')
     * @throws \RuntimeException If Browsershot is not available or PDF generation fails
     */
    public function generatePdf(LetterTemplate $template, string $bodyText, array $options = []): string
    {
        if (!class_exists(Browsershot::class)) {
            throw new \RuntimeException('Browsershot is required for PDF generation. Please install spatie/browsershot package.');
        }

        $html = $this->render($template, $bodyText, $options);
        $pageLayout = $template->page_layout ?? 'A4_portrait';
        $orientation = str_contains($pageLayout, 'landscape') ? 'landscape' : 'portrait';

        // Create temporary file path
        $tempDir = storage_path('app/temp');
        if (!is_dir($tempDir)) {
            mkdir($tempDir, 0755, true);
        }
        
        $filename = Str::uuid()->toString() . '.pdf';
        $pdfPath = $tempDir . '/' . $filename;

        try {
            // Configure Browsershot
            $browsershot = Browsershot::html($html)
                ->format('A4')
                ->showBackground() // Critical for letterheads and backgrounds
                ->margins(20, 20, 20, 20, 'mm') // Top, Right, Bottom, Left
                ->waitUntilNetworkIdle() // Wait for all resources to load
                ->timeout(120); // 2 minute timeout for complex documents

            if ($orientation === 'landscape') {
                $browsershot->landscape();
            }

            // Generate PDF
            $browsershot->save($pdfPath);

            // Return the storage file path (caller can use Storage::get() or return file response)
            return 'temp/' . $filename;
        } catch (\Exception $e) {
            \Log::error("Browsershot PDF generation failed: {$e->getMessage()}", [
                'template_id' => $template->id,
                'exception' => $e,
            ]);
            throw new \RuntimeException("PDF generation failed: {$e->getMessage()}", 0, $e);
        }
    }

    /**
     * Helper method to get PDF content as string
     *
     * @param LetterTemplate $template
     * @param string $bodyText
     * @param array $options
     * @return string PDF content as binary string
     * @throws \RuntimeException If PDF generation fails
     */
    public function generatePdfContent(LetterTemplate $template, string $bodyText, array $options = []): string
    {
        $filePath = $this->generatePdf($template, $bodyText, $options);
        return Storage::get($filePath);
    }

    /**
     * Helper method to save PDF to storage
     *
     * @param LetterTemplate $template
     * @param string $bodyText
     * @param string $storagePath Path in storage (e.g., 'dms/documents/document.pdf')
     * @param array $options
     * @return string Storage path of saved PDF
     * @throws \RuntimeException If PDF generation fails
     */
    public function generatePdfToStorage(LetterTemplate $template, string $bodyText, string $storagePath, array $options = []): string
    {
        $tempPath = $this->generatePdf($template, $bodyText, $options);
        
        // Move temp file to desired location
        $content = Storage::get($tempPath);
        Storage::put($storagePath, $content);
        Storage::delete($tempPath); // Clean up temp file
        
        return $storagePath;
    }

    /**
     * Build complete HTML document structure
     *
     * @param string $styles
     * @param string $letterheadStyles
     * @param string $letterheadHtml
     * @param string $watermarkHtml
     * @param string $contentHtml
     * @return string
     */
    private function buildHtmlDocument(
        string $styles,
        string $letterheadStyles,
        string $letterheadHtml,
        string $watermarkHtml,
        string $contentHtml,
        string $cspMeta = '',
        string $wrapperClass = 'content-wrapper'
    ): string {
        return <<<HTML
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    {$cspMeta}
    <title>Document</title>
    <style>
        {$styles}
        {$letterheadStyles}
    </style>
</head>
<body>
    {$letterheadHtml}
    {$watermarkHtml}
    <div class="{$wrapperClass}">
        {$contentHtml}
    </div>
</body>
</html>
HTML;
    }

    /**
     * Build a permissive CSP meta tag for browser previews (dev) to allow embedded PDF/object/image letterheads.
     */
    private function buildPreviewCspMeta(): string
    {
        // Note: frame-ancestors cannot be set via meta tag, only via HTTP headers
        // For iframe preview, we need a permissive CSP to allow the content to render
        // but still block external network requests to prevent auth issues
        $policy = [
            "default-src 'self' blob: data:",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob:", // Only allow data URLs for images
            "object-src 'self' blob: data:", // Only allow data URLs for objects (covers embeds too)
            "frame-src 'self' blob: data: about: srcdoc:", // Allow data URLs, about:, and srcdoc for iframes (needed for PDF preview and nested iframes)
            "connect-src 'none'", // Block all network requests from iframe (prevents auth requests)
            "font-src 'self' data:",
            "base-uri 'self'",
            "form-action 'self'",
        ];

        return '<meta http-equiv="Content-Security-Policy" content="' . implode('; ', $policy) . '">';
    }

    /**
     * Build CSS styles for the document
     *
     * @param string $pageLayout
     * @return string
     */
    private function buildStyles(string $pageLayout): string
    {
        $pageSize = $this->getPageSize($pageLayout);

        return <<<CSS
        @page {
            size: {$pageSize};
            margin: 25mm 20mm 20mm 20mm;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Arial', 'Helvetica', 'DejaVu Sans', 'Liberation Sans', sans-serif;
            font-size: 14px;
            line-height: 1.8;
            color: #000;
            direction: rtl;
            text-align: right;
            position: relative; /* Required for absolute positioning of text blocks */
            min-height: 100vh;
        }

        .content-wrapper {
            position: relative;
            z-index: 10; /* Above letterhead */
            min-height: 100vh;
            background: transparent !important; /* Don't cover letterhead - force transparent */
        }
        
        /* Ensure positioned text blocks don't have solid backgrounds that cover letterhead */
        .positioned-text-block {
            background-color: rgba(255, 255, 255, 0.9) !important; /* Semi-transparent so letterhead shows through */
        }

        /* Positioned text blocks - positioned relative to body */
        .positioned-text-block {
            position: absolute;
            word-wrap: break-word;
            white-space: pre-wrap;
            z-index: 10;
            box-sizing: border-box;
            overflow: hidden;
            background-color: rgba(255, 255, 255, 0.9); /* Slight background for readability */
        }

        /* When content wrapper has positioned blocks, remove padding */
        .content-wrapper.positioned-content {
            padding: 0;
        }

        /* Default padding for non-positioned content */
        .content-wrapper:not(.positioned-content) {
            padding: 20px;
        }

        /* RTL Support */
        .rtl {
            direction: rtl;
            text-align: right;
        }

        .ltr {
            direction: ltr;
            text-align: left;
        }

        /* Typography */
        p {
            margin-bottom: 12px;
            text-align: justify;
        }

        h1, h2, h3, h4, h5, h6 {
            margin-bottom: 10px;
            font-weight: bold;
        }

        /* Table Styles */
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            direction: rtl;
        }

        thead {
            display: table-header-group;
        }

        tfoot {
            display: table-footer-group;
        }

        tbody {
            display: table-row-group;
        }

        tr {
            page-break-inside: avoid;
        }

        th {
            background-color: #f0f0f0;
            font-weight: bold;
            padding: 10px;
            border: 1px solid #333;
            text-align: center;
        }

        td {
            padding: 8px 10px;
            border: 1px solid #666;
            text-align: right;
        }

        /* Page Break Control */
        .page-break {
            page-break-after: always;
        }

        .no-break {
            page-break-inside: avoid;
        }

        /* Watermark */
        .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            opacity: 0.08;
            z-index: 1;
            width: 60%;
            height: auto;
        }

        .watermark img {
            width: 100%;
            height: auto;
            max-width: 500px;
        }
CSS;
    }

    /**
     * Build letterhead background styles
     *
     * @param Letterhead|null $letterhead
     * @param bool $repeatOnPages
     * @param bool $forBrowser Whether this is for browser preview (true) or PDF generation (false)
     * @return string
     */
    private function buildLetterheadStyles(?Letterhead $letterhead, bool $repeatOnPages, bool $forBrowser = false): string
    {
        if (!$letterhead || !$letterhead->file_path || !Storage::exists($letterhead->file_path)) {
            return '';
        }

        $mimeType = Storage::mimeType($letterhead->file_path);
        $isPdf = $mimeType === 'application/pdf';

        $backgroundRepeat = $repeatOnPages ? 'repeat' : 'no-repeat';

        $css = '';
        
        // @page rule only works for PDF generation, not for browser preview
        // For browser preview, letterhead is rendered via HTML element (buildLetterheadHtml)
        if (!$forBrowser) {
            // For PDF generation, use file:// path (Browsershot can access local files)
            $fileUrl = 'file://' . Storage::path($letterhead->file_path);
            $css .= <<<CSS
        @page {
            background: url('{$fileUrl}') no-repeat center top;
            background-size: 100% auto;
        }

        body {
            background: url('{$fileUrl}') {$backgroundRepeat} center top;
            background-size: 100% auto;
        }
CSS;
        } else {
            // For browser preview, use a different approach with letterhead container
            $css .= <<<CSS
        html, body {
            margin: 0;
            padding: 0;
            min-height: 100vh;
            position: relative;
            background: transparent; /* Ensure body doesn't cover letterhead */
        }

        .letterhead-background,
        .letterhead-header {
            position: fixed; /* Use fixed instead of absolute for better positioning */
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100%;
            height: 100%;
            z-index: 1; /* Behind content but visible */
            pointer-events: none;
            overflow: hidden;
        }

        .letterhead-background {
            min-height: 100vh;
        }

        .letterhead-background img,
        .letterhead-header img {
            width: 100%;
            height: 100%;
            display: block;
            object-fit: cover; /* Ensure image covers entire area */
        }

        .letterhead-background img {
            min-height: 100vh;
        }

        .letterhead-background embed.letterhead-pdf,
        .letterhead-background iframe.letterhead-pdf,
        .letterhead-background object.letterhead-pdf {
            width: 100%;
            height: 100vh;
            border: 0;
            pointer-events: none;
            opacity: 0.25;
            position: absolute;
            top: 0;
            left: 0;
            z-index: 1;
        }
        
        /* Ensure letterhead container is visible even if PDF doesn't load */
        .letterhead-background {
            background-color: #f9f9f9; /* Light gray fallback if PDF doesn't load */
        }

        body {
            position: relative;
            z-index: 0; /* Lower than letterhead */
            background: transparent !important; /* Ensure body doesn't cover letterhead */
        }

        .content-wrapper {
            position: relative;
            z-index: 10;
            background: transparent;
            padding-top: 0;
        }
CSS;

            // Give a little padding when rendering PDF background so content clears toolbar space if any
            if ($isPdf) {
                $css .= <<<CSS
        .content-wrapper {
            padding-top: 12px;
        }
CSS;
            }
        }

        return $css;
    }

    /**
     * Build letterhead HTML element (for browser preview)
     *
     * @param Letterhead|null $letterhead
     * @return string
     */
    private function buildLetterheadHtml(?Letterhead $letterhead): string
    {
        if (!$letterhead) {
            if (config('app.debug')) {
                \Log::debug('buildLetterheadHtml: No letterhead provided');
            }
            return '';
        }
        
        if (!$letterhead->file_path) {
            if (config('app.debug')) {
                \Log::debug('buildLetterheadHtml: Letterhead has no file_path', ['letterhead_id' => $letterhead->id]);
            }
            // Return visible placeholder so user knows letterhead should be there
            return <<<HTML
        <div class="letterhead-background" style="min-height: 100vh; background-color: #f0f0f0; border: 2px dashed #ccc; display: flex; align-items: center; justify-content: center; position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 1;">
            <p style="color: #999; font-size: 12px;">Letterhead file path not set</p>
        </div>
HTML;
        }
        
        if (!Storage::exists($letterhead->file_path)) {
            \Log::warning('buildLetterheadHtml: Letterhead file does not exist', [
                'letterhead_id' => $letterhead->id,
                'file_path' => $letterhead->file_path,
            ]);
            // Return visible placeholder instead of empty string so user knows letterhead should be there
            return <<<HTML
        <div class="letterhead-background" style="min-height: 100vh; background-color: #f0f0f0; border: 2px dashed #ccc; display: flex; align-items: center; justify-content: center; position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 1;">
            <p style="color: #999; font-size: 12px;">Letterhead file not found: {$letterhead->file_path}</p>
        </div>
HTML;
        }

        $mimeType = Storage::mimeType($letterhead->file_path);
        $isPdf = $mimeType === 'application/pdf';
        $dataUrl = '';

        // FIXED: Base64 encode ALL letterhead types (images AND PDFs) for browser preview
        // This fixes the iframe authentication issue - iframe cannot make authenticated requests
        try {
            $fileContents = Storage::get($letterhead->file_path);
            $base64 = base64_encode($fileContents);
            $dataUrl = "data:{$mimeType};base64,{$base64}";
        } catch (\Exception $e) {
            // CRITICAL: Never use URL fallback for browser preview - it will fail in iframe
            // Log error and return empty string instead
            \Log::error("Failed to base64 encode letterhead {$letterhead->id} for browser preview: {$e->getMessage()}", [
                'letterhead_id' => $letterhead->id,
                'file_path' => $letterhead->file_path,
                'exception' => $e,
            ]);
            // Return empty string - better to show no letterhead than break authentication
            return '';
        }
        
        // Check if it's a background type (full page) or header type (top only)
        $letterheadType = $letterhead->letterhead_type ?? 'background';
        $isBackground = $letterheadType === 'background';
        
        $class = $isBackground ? 'letterhead-background' : 'letterhead-header';
        $style = $isBackground ? 'style="min-height: 100vh;"' : '';

        // For PDF letterheads in browser preview, show placeholder
        // PDFs cannot be displayed in sandboxed iframes (browser security restriction)
        // The PDF letterhead will work correctly in the generated PDF document
        if ($isPdf && $isBackground) {
            // Show a subtle placeholder that indicates letterhead area
            // The actual PDF will be used when generating the final PDF
            // Add inline styles to ensure visibility - make it more visible
            return <<<HTML
        <div class="{$class}" style="position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; width: 100% !important; height: 100% !important; z-index: 1 !important; pointer-events: none !important; overflow: hidden !important; background: linear-gradient(135deg, #e8e8e8 0%, #d0d0d0 100%) !important; border: 3px dashed #999 !important; display: flex !important; align-items: center !important; justify-content: center !important; color: #666 !important; font-size: 14px !important; text-align: center !important; padding: 20px !important; box-sizing: border-box !important; opacity: 1 !important; visibility: visible !important;">
            <div style="opacity: 1 !important; background: rgba(255, 255, 255, 0.9) !important; padding: 20px !important; border-radius: 8px !important; box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;">
                <p style="margin: 0 0 8px 0; font-weight: 600; font-size: 16px;">📄 PDF Letterhead</p>
                <p style="margin: 0; font-size: 12px; color: #555;">Preview not available in browser</p>
                <p style="margin: 4px 0 0 0; font-size: 11px; color: #777;">Will appear correctly in generated PDF</p>
            </div>
        </div>
HTML;
        }

        // For image letterheads, use img tag with base64 data URL
        // Add inline styles to ensure visibility
        return <<<HTML
        <div class="{$class}" {$style} style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; width: 100%; height: 100%; z-index: 1; pointer-events: none; overflow: hidden; background-color: #f9f9f9;">
            <img src="{$dataUrl}" alt="Letterhead" style="width: 100%; height: 100%; object-fit: cover; display: block; min-height: 100vh;" onerror="console.error('Letterhead image failed to load'); this.style.display='none';" />
        </div>
HTML;
    }

    /**
     * Build watermark HTML
     *
     * @param Letterhead|null $watermark
     * @param bool $forBrowser Whether this is for browser preview (true) or PDF generation (false)
     * @return string
     */
    private function buildWatermarkHtml(?Letterhead $watermark, bool $forBrowser = false): string
    {
        if (!$watermark || !$watermark->file_path || !Storage::exists($watermark->file_path)) {
            return '';
        }

        // For browser preview, embed image as base64 to avoid authentication issues in iframe
        if ($forBrowser) {
            try {
                $fileContents = Storage::get($watermark->file_path);
                $mimeType = Storage::mimeType($watermark->file_path);
                $base64 = base64_encode($fileContents);
                $fileUrl = "data:{$mimeType};base64,{$base64}";
            } catch (\Exception $e) {
                // CRITICAL: Never use URL fallback for browser preview - it will fail in iframe
                // Log error and return empty string instead
                \Log::error("Failed to base64 encode watermark {$watermark->id} for browser preview: {$e->getMessage()}", [
                    'watermark_id' => $watermark->id,
                    'file_path' => $watermark->file_path,
                    'exception' => $e,
                ]);
                // Return empty string - better to show no watermark than break authentication
                return '';
            }
        } else {
            // For PDF generation, use absolute file path
            $fileUrl = 'file://' . Storage::path($watermark->file_path);
        }

        return <<<HTML
        <div class="watermark">
            <img src="{$fileUrl}" alt="Watermark" />
        </div>
HTML;
    }

    /**
     * Format body text with proper paragraph structure
     *
     * @param string $bodyText
     * @return string
     */
    private function formatBodyText(string $bodyText): string
    {
        // Convert line breaks to paragraphs
        $lines = explode("\n", $bodyText);
        $paragraphs = [];

        foreach ($lines as $line) {
            $line = trim($line);
            if (!empty($line)) {
                $paragraphs[] = '<p>' . nl2br(e($line)) . '</p>';
            }
        }

        return implode("\n", $paragraphs);
    }

    /**
     * Format body text with absolute positioning support
     * If field_positions exist, render text blocks at specified positions
     * Otherwise, use default formatting
     *
     * @param string $bodyText
     * @param array $fieldPositions Format: { "block-1": { "x": 50, "y": 30, "fontSize": 14, "fontFamily": "Arial" }, ... }
     * @return string
     */
    private function formatBodyTextWithPositions(string $bodyText, array $fieldPositions): string
    {
        // If no positions defined, use default formatting
        if (empty($fieldPositions)) {
            return $this->formatBodyText($bodyText);
        }

        // Parse body_text into blocks (separated by double newlines or block markers)
        // For now, we'll split by double newlines or use the entire text as one block
        $blocks = preg_split('/\n\s*\n/', $bodyText);
        if (count($blocks) === 1 && !empty($bodyText)) {
            // Single block - use entire text
            $blocks = [$bodyText];
        }

        $positionedBlocks = [];
        $blockIndex = 0;

        foreach ($blocks as $blockText) {
            $blockText = trim($blockText);
            if (empty($blockText)) {
                continue;
            }

            $blockId = 'block-' . ($blockIndex + 1);
            $position = $fieldPositions[$blockId] ?? null;

            if ($position && isset($position['x']) && isset($position['y'])) {
                // Render with absolute positioning
                $x = (float) $position['x']; // Percentage (0-100)
                $y = (float) $position['y']; // Percentage (0-100)
                $fontSize = isset($position['fontSize']) ? (int) $position['fontSize'] : 14;
                $fontFamily = isset($position['fontFamily']) ? e($position['fontFamily']) : 'Arial';
                $textAlign = isset($position['textAlign']) ? e($position['textAlign']) : 'right';
                $color = isset($position['color']) ? e($position['color']) : '#000000';
                $width = isset($position['width']) ? (float) $position['width'] : 40;
                $height = isset($position['height']) ? (float) $position['height'] : null;
                $maxWidth = isset($position['maxWidth']) ? (float) $position['maxWidth'] : 80;

                // Build style string with width/height
                $widthStyle = sprintf('width: %.2f%%;', $width);
                $heightStyle = $height ? sprintf('height: %.2f%%;', $height) : 'height: auto;';
                $maxWidthStyle = sprintf('max-width: %.2f%%;', $maxWidth);

                // Convert percentage to absolute positioning
                // Position is relative to body (which has position: relative)
                // Use left/top for absolute positioning with transform for centering
                $style = sprintf(
                    'position: absolute; left: %.2f%%; top: %.2f%%; transform: translate(-50%%, -50%%); font-size: %dpx; font-family: %s; text-align: %s; color: %s; z-index: 10; %s %s %s min-height: 30px; padding: 8px 12px; box-sizing: border-box; overflow: hidden; background-color: rgba(255, 255, 255, 0.9);',
                    $x,
                    $y,
                    $fontSize,
                    $fontFamily,
                    $textAlign,
                    $color,
                    $widthStyle,
                    $heightStyle,
                    $maxWidthStyle
                );

                // Format text with line breaks
                $formattedText = nl2br(e($blockText));
                $positionedBlocks[] = sprintf(
                    '<div class="positioned-text-block" style="%s">%s</div>',
                    $style,
                    $formattedText
                );
            } else {
                // No position defined - use default formatting
                $positionedBlocks[] = '<p>' . nl2br(e($blockText)) . '</p>';
            }

            $blockIndex++;
        }

        // If no positioned blocks were created, fall back to default
        if (empty($positionedBlocks)) {
            return $this->formatBodyText($bodyText);
        }

        return implode("\n", $positionedBlocks);
    }

    /**
     * Render table payload as HTML table
     *
     * @param array $payload
     * @return string
     */
    private function renderTablePayload(array $payload): string
    {
        if (empty($payload['headers']) || empty($payload['rows'])) {
            return '';
        }

        $headers = array_map(fn($h) => sprintf('<th>%s</th>', e($h)), $payload['headers']);
        $headerRow = '<tr>' . implode('', $headers) . '</tr>';

        $rows = collect($payload['rows'])->map(function ($row) {
            $cells = array_map(fn($cell) => sprintf('<td>%s</td>', e((string)$cell)), $row);
            return '<tr>' . implode('', $cells) . '</tr>';
        })->implode('');

        return <<<HTML
        <div class="table-wrapper no-break">
            <table>
                <thead>{$headerRow}</thead>
                <tbody>{$rows}</tbody>
            </table>
        </div>
HTML;
    }

    /**
     * Get page size for CSS
     *
     * @param string $layout
     * @return string
     */
    private function getPageSize(string $layout): string
    {
        return match ($layout) {
            'A4_landscape' => 'A4 landscape',
            'A4_portrait' => 'A4 portrait',
            'Letter_landscape' => 'Letter landscape',
            'Letter_portrait' => 'Letter portrait',
            default => 'A4 portrait',
        };
    }

    /**
     * Process letterhead file and convert to HTML (legacy support)
     *
     * @param Letterhead $letterhead
     * @return string
     */
    public function processLetterheadFile(Letterhead $letterhead): string
    {
        if (!$letterhead->file_path || !Storage::exists($letterhead->file_path)) {
            return '';
        }

        $fileType = $letterhead->file_type ?? 'image';
        $letterheadType = $letterhead->letterhead_type ?? 'background';
        $filePath = Storage::path($letterhead->file_path);

        if ($letterheadType === 'watermark') {
            return sprintf(
                '<div class="letterhead-watermark" style="position: fixed; top: 50%%; left: 50%%; transform: translate(-50%%, -50%%); opacity: 0.08; z-index: 1;"><img src="file://%s" alt="%s" style="max-width: 500px; height: auto;" /></div>',
                e($filePath),
                e($letterhead->name)
            );
        }

        // Background type - return empty as it's handled via CSS
        return '';
    }

    /**
     * Replace template variables in text content
     *
     * @param string $text
     * @param array $variables
     * @return string
     */
    public function replaceTemplateVariables(string $text, array $variables): string
    {
        foreach ($variables as $key => $value) {
            // Replace {{variable}} patterns (with various spacing)
            $text = str_replace("{{$key}}", $value, $text);
            $text = str_replace("{{ {$key} }}", $value, $text);
            $text = str_replace("{{ {$key}}}", $value, $text);
            $text = str_replace("{{{$key} }}", $value, $text);
        }

        return $text;
    }

    /**
     * Render document with letterhead (legacy method for backward compatibility)
     *
     * @param string $bodyHtml
     * @param Letterhead|null $letterhead
     * @param array $options
     * @return string
     */
    public function renderWithLetterhead(string $bodyHtml, ?Letterhead $letterhead = null, array $options = []): string
    {
        $letterheadHtml = '';

        if ($letterhead) {
            $letterheadHtml = $this->processLetterheadFile($letterhead);
        }

        // Replace variables if provided
        if (isset($options['variables']) && is_array($options['variables'])) {
            $bodyHtml = $this->replaceTemplateVariables($bodyHtml, $options['variables']);
        }

        return $this->renderLegacy($bodyHtml, array_merge($options, [
            'letterhead_html' => $letterheadHtml,
        ]));
    }

    /**
     * Legacy render method for backward compatibility
     *
     * @param string $bodyHtml
     * @param array $options
     * @return string
     */
    private function renderLegacy(string $bodyHtml, array $options = []): string
    {
        $letterheadHtml = $options['letterhead_html'] ?? '';
        $tablePayload = $options['table_payload'] ?? null;
        $pageLayout = $options['page_layout'] ?? 'A4_portrait';

        $tableHtml = $tablePayload ? $this->renderTablePayload($tablePayload) : '';
        $content = $letterheadHtml . $bodyHtml . $tableHtml;

        $pageSize = $this->getPageSize($pageLayout);

        return <<<HTML
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <style>
        @page {
            size: {$pageSize};
            margin: 20mm;
        }
        body {
            font-family: 'DejaVu Sans', 'Arial', sans-serif;
            line-height: 1.6;
            direction: rtl;
        }
        .rtl { direction: rtl; text-align: right; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        thead { display: table-header-group; }
        tfoot { display: table-row-group; }
        tr { page-break-inside: avoid; }
        th, td { border: 1px solid #333; padding: 8px; font-size: 12px; }
        th { background-color: #f0f0f0; }
        .page-break { page-break-after: always; }
    </style>
</head>
<body>
{$content}
</body>
</html>
HTML;
    }
}
