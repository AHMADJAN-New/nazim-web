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
    private function isLikelyHtml(string $text): bool
    {
        return (bool) preg_match('/<\s*\/?\s*[a-zA-Z][^>]*>/', $text);
    }

    private function sanitizeRichHtml(string $html): string
    {
        $clean = $html;

        // Remove script/style blocks entirely
        $clean = preg_replace('/<\s*(script|style)[^>]*>.*?<\s*\/\s*\\1\s*>/is', '', $clean) ?? '';

        // Strip event handler attributes (on*)
        $clean = preg_replace('/\son\w+\s*=\s*(\"[^\"]*\"|\'[^\']*\'|[^\s>]+)/i', '', $clean) ?? '';

        // Remove javascript: URLs
        $clean = preg_replace('/javascript\s*:/i', '', $clean) ?? '';

        // Allow only safe formatting tags
        $allowed = '<p><br><div><span><strong><b><em><i><u><ol><ul><li><h1><h2><h3><h4><h5><h6>';
        $clean = strip_tags($clean, $allowed);

        return $clean;
    }
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

        // Debug: Log watermark info (only in development)
        if (config('app.debug')) {
            \Log::debug('Document rendering watermark check', [
                'template_id' => $template->id,
                'watermark_id' => $template->watermark_id,
                'has_watermark' => $watermark !== null,
                'watermark_type' => $watermark ? get_class($watermark) : null,
                'watermark_file_path' => $watermark instanceof \App\Models\Letterhead ? $watermark->file_path : null,
                'watermark_wm_type' => $watermark instanceof \App\Models\BrandingWatermark ? $watermark->wm_type : null,
                'for_browser' => $forBrowser,
            ]);
        }

        // Build CSS styles
        $styles = $this->buildStyles($pageLayout, $forBrowser);

        // Build letterhead background CSS
        $letterheadStyles = $this->buildLetterheadStyles($letterhead, $repeatLetterhead, $forBrowser);

        // Build letterhead HTML element (for both browser preview and PDF generation)
        // PDF generation with Browsershot needs the HTML element for proper rendering
        $letterheadHtml = $this->buildLetterheadHtml($letterhead, $forBrowser);

        // Build watermark HTML
        $watermarkHtml = $this->buildWatermarkHtml($watermark, $forBrowser);
        
        // Debug: Log watermark HTML generation (only in development)
        if (config('app.debug')) {
            \Log::debug('Watermark HTML generated', [
                'template_id' => $template->id,
                'watermark_html_length' => strlen($watermarkHtml),
                'watermark_html_contains_img' => str_contains($watermarkHtml, '<img'),
                'watermark_html_contains_data_url' => str_contains($watermarkHtml, 'data:image') || str_contains($watermarkHtml, 'data:application'),
            ]);
        }

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

        $safeLayoutClass = preg_replace('/[^a-zA-Z0-9_-]/', '', $pageLayout) ?: 'A4_portrait';
        return $this->buildHtmlDocument($styles, $letterheadStyles, $letterheadHtml, $watermarkHtml, $contentHtml, $cspMeta, $wrapperClass, $forBrowser, $safeLayoutClass);
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
        string $wrapperClass = 'content-wrapper',
        bool $forBrowser = false,
        string $pageLayout = 'A4_portrait'
    ): string {
        $bodyInner = $forBrowser
            ? <<<HTML
    <div class="browser-preview">
        <div class="page page-layout-{$pageLayout}">
            {$letterheadHtml}
            {$watermarkHtml}
            <div class="{$wrapperClass}">
                {$contentHtml}
            </div>
        </div>
    </div>
HTML
            : <<<HTML
    {$letterheadHtml}
    {$watermarkHtml}
    <div class="{$wrapperClass}">
        {$contentHtml}
    </div>
HTML;

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
{$bodyInner}
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
    private function buildStyles(string $pageLayout, bool $forBrowser = false): string
    {
        $pageSize = $this->getPageSize($pageLayout);

        $browserPreviewCss = '';
        if ($forBrowser) {
            $browserPreviewCss = <<<CSS
        .browser-preview {
            background: #f3f4f6;
            padding: 16px;
        }

        .page {
            width: 100%;
            max-width: 920px;
            margin: 0 auto;
            background: #ffffff;
            position: relative;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
        }

        .page-layout-A4_portrait { aspect-ratio: 210 / 297; }
        .page-layout-A4_landscape { aspect-ratio: 297 / 210; }
        .page-layout-Letter_portrait { aspect-ratio: 8.5 / 11; }
        .page-layout-Letter_landscape { aspect-ratio: 11 / 8.5; }

        .page .content-wrapper {
            position: relative;
            width: 100%;
            height: 100%;
            min-height: 100%;
            background: transparent !important;
            z-index: 10 !important; /* Ensure content is above letterhead - use !important */
            padding: 20px;
            isolation: isolate; /* Create new stacking context */
        }

        .page .content-wrapper.positioned-content {
            padding: 0;
        }
        
        /* Ensure text is visible and on top */
        .page .content-wrapper p,
        .page .content-wrapper div:not(.letterhead-background):not(.letterhead-header):not(.watermark),
        .page .content-wrapper span,
        .page .content-wrapper .rich-text,
        .page .content-wrapper .positioned-text-block {
            color: #000000 !important;
            position: relative;
            z-index: 11 !important;
        }

        .page .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            opacity: 0.08;
            z-index: 2;
            pointer-events: none;
        }

        /* For browser preview, don't force viewport-based heights */
        body { min-height: auto; }
        .content-wrapper { min-height: 100%; }
CSS;
        }

        return <<<CSS
        @page {
            size: {$pageSize};
            margin: 0; /* Remove margins - letterhead should cover full page */
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
        }

        body {
            font-family: 'Arial', 'Helvetica', 'DejaVu Sans', 'Liberation Sans', sans-serif;
            font-size: 14px;
            line-height: 1.8;
            color: #000;
            direction: rtl;
            text-align: right;
            position: relative; /* Required for absolute positioning of text blocks and letterhead */
            min-height: 100vh;
            width: 100%;
        }

        .content-wrapper {
            position: relative;
            z-index: 10 !important; /* Above letterhead - use !important */
            min-height: 100vh;
            background: transparent !important; /* Don't cover letterhead - force transparent */
            padding: 25mm 20mm 20mm 20mm; /* Add page margins to content area */
            isolation: isolate; /* Create new stacking context */
        }
        
        /* Ensure content text is visible and on top */
        .content-wrapper p,
        .content-wrapper div:not(.letterhead-background):not(.letterhead-header):not(.watermark),
        .content-wrapper span,
        .content-wrapper .rich-text {
            color: #000000 !important;
            position: relative;
            z-index: 11 !important; /* Above letterhead */
        }
        
        /* Ensure positioned text blocks don't have solid backgrounds that cover letterhead */
        .positioned-text-block {
            background-color: transparent !important;
            border: none !important;
        }

        /* Positioned text blocks - positioned relative to body */
        .positioned-text-block {
            position: absolute;
            word-wrap: break-word;
            white-space: pre-wrap;
            z-index: 10;
            box-sizing: border-box;
            overflow: hidden;
            background-color: transparent;
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

        /* Letterhead positioning for PDF generation */
        /* Letterhead should cover the entire page area - positioned relative to body */
        .letterhead-background,
        .letterhead-header {
            position: absolute; /* Absolute positioning relative to body */
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100%;
            height: 100%;
            min-height: 100vh;
            z-index: 1 !important; /* Behind content - use !important to ensure it stays behind */
            pointer-events: none;
            overflow: hidden;
        }

        .letterhead-background img,
        .letterhead-header img,
        .letterhead-background object,
        .letterhead-header object {
            width: 100%;
            height: 100%;
            min-height: 100vh;
            display: block;
            object-fit: cover;
        }

        .letterhead-header {
            min-height: auto;
            height: auto;
            bottom: auto; /* Header only at top */
        }

        .letterhead-header img,
        .letterhead-header object {
            min-height: auto;
            height: auto;
            object-fit: contain;
        }

        {$browserPreviewCss}
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
        if (!$letterhead) {
            return '';
        }

        $renderPath = $this->resolveLetterheadRenderPath($letterhead);
        if (!$renderPath) {
            return '';
        }

        $mimeType = Storage::mimeType($renderPath);
        $isPdf = $mimeType === 'application/pdf';

        $backgroundRepeat = $repeatOnPages ? 'repeat' : 'no-repeat';

        $css = '';
        
        // CRITICAL: Browsershot doesn't allow file:// URLs in CSS either
        // Use base64 data URLs for both browser preview and PDF generation
        // Since letterheads are rendered via HTML elements (buildLetterheadHtml), 
        // we only need minimal CSS for browser preview
        if ($forBrowser) {
            // For browser preview, use a different approach with letterhead container
            $css .= <<<CSS
        html, body {
            margin: 0;
            padding: 0;
            min-height: 100%;
            position: relative;
            background: transparent; /* Ensure body doesn't cover letterhead */
        }

        .letterhead-background,
        .letterhead-header {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            z-index: 1 !important; /* Behind content but visible - use !important to ensure it stays behind */
            pointer-events: none;
            overflow: hidden;
        }
        
        /* Ensure letterhead children also stay behind */
        .letterhead-background *,
        .letterhead-header * {
            z-index: 1 !important;
            pointer-events: none;
        }

        .letterhead-background {
            min-height: 100%;
        }

        .letterhead-background img,
        .letterhead-header img {
            width: 100%;
            height: 100%;
            display: block;
            object-fit: cover; /* Ensure image covers entire area */
        }

        .letterhead-background img {
            min-height: 100%;
        }

        .letterhead-background embed.letterhead-pdf,
        .letterhead-background iframe.letterhead-pdf,
        .letterhead-background object.letterhead-pdf {
            width: 100%;
            height: 100%;
            border: 0;
            pointer-events: none;
            opacity: 1;
            position: absolute;
            top: 0;
            left: 0;
            z-index: 1;
            background: transparent;
        }
        
        /* Ensure letterhead container is visible even if PDF doesn't load */
        .letterhead-background {
            background-color: #ffffff; /* White fallback if PDF doesn't load */
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
    private function buildLetterheadHtml(?Letterhead $letterhead, bool $forBrowser = true): string
    {
        if (!$letterhead) {
            if (config('app.debug')) {
                \Log::debug('buildLetterheadHtml: No letterhead provided');
            }
            return '';
        }
        
        if (!$letterhead->file_path && !$letterhead->image_path) {
            if (config('app.debug')) {
                \Log::debug('buildLetterheadHtml: Letterhead has no file_path', ['letterhead_id' => $letterhead->id]);
            }
            // Return visible placeholder so user knows letterhead should be there
            return <<<HTML
        <div class="letterhead-background" style="min-height: 100%; background-color: #f0f0f0; border: 2px dashed #ccc; display: flex; align-items: center; justify-content: center; position: absolute; inset: 0; z-index: 1;">
            <p style="color: #999; font-size: 12px;">Letterhead file path not set</p>
        </div>
HTML;
        }

        $renderPath = $this->resolveLetterheadRenderPath($letterhead);
        if (!$renderPath) {
            \Log::warning('buildLetterheadHtml: Letterhead render file does not exist', [
                'letterhead_id' => $letterhead->id,
                'file_path' => $letterhead->file_path,
                'image_path' => $letterhead->image_path,
            ]);
            // Return visible placeholder instead of empty string so user knows letterhead should be there
            return <<<HTML
        <div class="letterhead-background" style="min-height: 100%; background-color: #f0f0f0; border: 2px dashed #ccc; display: flex; align-items: center; justify-content: center; position: absolute; inset: 0; z-index: 1;">
            <p style="color: #999; font-size: 12px;">Letterhead image not found. Please re-upload the letterhead.</p>
        </div>
HTML;
        }

        $mimeType = Storage::mimeType($renderPath);
        $isPdf = $mimeType === 'application/pdf';
        
        // Fallback MIME type detection based on file extension if Storage::mimeType() fails
        if (!$mimeType || $mimeType === 'application/octet-stream') {
            $extension = strtolower(pathinfo($renderPath, PATHINFO_EXTENSION));
            $mimeTypeMap = [
                'jpg' => 'image/jpeg',
                'jpeg' => 'image/jpeg',
                'png' => 'image/png',
                'gif' => 'image/gif',
                'webp' => 'image/webp',
                'svg' => 'image/svg+xml',
                'pdf' => 'application/pdf',
            ];
            $mimeType = $mimeTypeMap[$extension] ?? 'image/jpeg'; // Default to JPEG if unknown
            $isPdf = $extension === 'pdf' || $mimeType === 'application/pdf';
        }

        if ($isPdf) {
            \Log::warning('PDF letterhead render requested without image conversion', [
                'letterhead_id' => $letterhead->id,
                'file_path' => $letterhead->file_path,
                'image_path' => $letterhead->image_path,
            ]);
            return <<<HTML
        <div class="letterhead-background" style="min-height: 100%; background-color: #f0f0f0; border: 2px dashed #ccc; display: flex; align-items: center; justify-content: center; position: absolute; inset: 0; z-index: 1;">
            <p style="color: #999; font-size: 12px;">PDF letterhead requires image conversion. Please re-upload the letterhead.</p>
        </div>
HTML;
        }
        
        // CRITICAL: Browsershot doesn't allow file:// URLs in HTML for security reasons
        // Always use base64 data URLs for both browser preview and PDF generation
        $dataUrl = '';
        try {
            $fileContents = Storage::get($renderPath);
            if (empty($fileContents)) {
                \Log::warning("Letterhead file is empty", [
                    'letterhead_id' => $letterhead->id,
                    'file_path' => $renderPath,
                ]);
                return '';
            }
            $base64 = base64_encode($fileContents);
            $dataUrl = "data:{$mimeType};base64,{$base64}";
        } catch (\Exception $e) {
            \Log::error("Failed to base64 encode letterhead {$letterhead->id}: {$e->getMessage()}", [
                'letterhead_id' => $letterhead->id,
                'file_path' => $renderPath,
                'mime_type' => $mimeType,
                'for_browser' => $forBrowser,
                'exception' => $e,
            ]);
            // Return empty string - better to show no letterhead than break PDF generation
            return '';
        }
        
        // Check if it's a background type (full page) or header type (top only)
        $letterheadType = $letterhead->letterhead_type ?? 'background';
        $isBackground = $letterheadType === 'background';
        
        $class = $isBackground ? 'letterhead-background' : 'letterhead-header';
        $extraStyle = $isBackground ? 'min-height: 100%;' : '';

        // For PDF letterheads, try to convert to image using Imagick (works for both browser and PDF generation)
        // This provides better rendering quality and avoids Browsershot's file:// URL restrictions
        // Convert ALL PDF letterheads to images for better compatibility
        if ($isPdf) {
            try {
                $pdfPath = Storage::path($letterhead->file_path);
                $imageData = null;
                
                // Use Imagick to convert PDF first page to PNG image
                if (extension_loaded('imagick')) {
                    try {
                        $imagick = new \Imagick();
                        $imagick->setResolution(300, 300); // 300 DPI for high quality PDF generation
                        $imagick->readImage($pdfPath . '[0]'); // Read first page only [0]
                        $imagick->setImageFormat('png');
                        $imagick->setImageCompressionQuality(95); // Higher quality
                        
                        // For PDF generation, use white background and remove alpha
                        // For browser preview, preserve transparency
                        if (!$forBrowser) {
                            $imagick->setImageAlphaChannel(\Imagick::ALPHACHANNEL_REMOVE); // Remove alpha for PDFs
                            $imagick->setImageBackgroundColor(new \ImagickPixel('white')); // White background for PDFs
                            $imagick->setImageCompose(\Imagick::COMPOSITE_OVER);
                            $imagick->setImageMatte(false);
                        } else {
                            $imagick->setImageAlphaChannel(\Imagick::ALPHACHANNEL_ACTIVATE); // Preserve alpha for browser
                        }
                        
                        $imageData = $imagick->getImageBlob();
                        $imagick->clear();
                        $imagick->destroy();
                        
                        if ($imageData) {
                            $base64Image = base64_encode($imageData);
                            $imageDataUrl = "data:image/png;base64,{$base64Image}";
                            
                            // Log success for debugging
                            if (config('app.debug')) {
                                \Log::debug("Successfully converted PDF letterhead to image", [
                                    'letterhead_id' => $letterhead->id,
                                    'image_size' => strlen($imageData),
                                    'for_browser' => $forBrowser,
                                ]);
                            }
                            
                            // Return image instead of placeholder
                            $objectFit = $isBackground ? 'cover' : 'contain';
                            return <<<HTML
        <div class="{$class}" style="position: absolute; inset: 0; width: 100%; height: 100%; z-index: 1 !important; pointer-events: none; overflow: hidden; background-color: #ffffff; {$extraStyle}">
            <img src="{$imageDataUrl}" alt="Letterhead" style="width: 100%; height: 100%; object-fit: {$objectFit}; display: block; min-height: 100vh; position: absolute; top: 0; left: 0;" />
        </div>
HTML;
                        }
                    } catch (\Exception $e) {
                        \Log::warning("Imagick PDF conversion failed for letterhead {$letterhead->id}: {$e->getMessage()}", [
                            'letterhead_id' => $letterhead->id,
                            'file_path' => $letterhead->file_path,
                            'exception' => $e,
                        ]);
                    }
                } else {
                    \Log::warning("Imagick extension not available for PDF letterhead preview", [
                        'letterhead_id' => $letterhead->id,
                    ]);
                }
            } catch (\Exception $e) {
                \Log::warning("Failed to convert PDF letterhead to image: {$e->getMessage()}", [
                    'letterhead_id' => $letterhead->id,
                    'file_path' => $letterhead->file_path,
                    'for_browser' => $forBrowser,
                    'exception' => $e,
                ]);
            }
            
            // Fallback for PDF letterheads:
            // - For browser preview: Use object tag (works in iframes)
            // - For PDF generation: Log error and return empty (Browsershot can't render PDF objects in generated PDFs)
            if ($forBrowser) {
                // Browser preview: Use object tag to embed PDF
                return <<<HTML
        <div class="{$class}" style="position: absolute; inset: 0; width: 100%; height: 100%; z-index: 1; pointer-events: none; overflow: hidden; background-color: #ffffff; {$extraStyle}">
            <object data="{$dataUrl}" type="application/pdf" style="width: 100%; height: 100%; display: block; opacity: 0.95;">
                <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; padding: 16px; box-sizing: border-box; background: #f8f8f8; color: #555; font-size: 12px; text-align: center; border: 1px dashed #ccc;">
                    <div>
                        <p style="margin: 0 0 8px 0; font-weight: 500;">PDF Letterhead</p>
                        <p style="margin: 0; font-size: 11px; opacity: 0.8;">PDF preview not supported in this browser. The letterhead will appear correctly in the generated PDF document.</p>
                    </div>
                </div>
            </object>
        </div>
HTML;
            } else {
                // PDF generation: Without Imagick, try to convert PDF to image using Ghostscript
                // If Ghostscript is not available, use object tag (Browsershot might render it)
                $objectFit = $isBackground ? 'cover' : 'contain';
                
                // Try Ghostscript conversion first (if available)
                $gsAvailable = false;
                $imageDataUrl = null;
                
                try {
                    // Check if Ghostscript is available
                    // Try multiple methods to detect Ghostscript
                    $gsCheck = @shell_exec('gs --version 2>&1');
                    $gsPath = trim(@shell_exec('which gs') ?: @shell_exec('where gs') ?: '');
                    
                    // Check if gs command exists and returns a version (any version string means it's installed)
                    $hasGs = false;
                    if (!empty($gsCheck) && !str_contains($gsCheck, 'not found') && !str_contains($gsCheck, 'command not found')) {
                        $hasGs = true;
                    } elseif (!empty($gsPath) && file_exists($gsPath)) {
                        $hasGs = true;
                    }
                    
                    if ($hasGs) {
                        $gsAvailable = true;
                        
                        // Convert PDF first page to PNG using Ghostscript
                        $pdfPath = Storage::path($letterhead->file_path);
                        $tempPngPath = sys_get_temp_dir() . '/' . Str::uuid()->toString() . '.png';
                        
                        // Use Ghostscript to convert PDF to PNG at 300 DPI
                        $command = sprintf(
                            'gs -dNOPAUSE -dBATCH -sDEVICE=png16m -r300 -dFirstPage=1 -dLastPage=1 -sOutputFile="%s" "%s" 2>&1',
                            escapeshellarg($tempPngPath),
                            escapeshellarg($pdfPath)
                        );
                        
                        $output = [];
                        $returnVar = 0;
                        @exec($command, $output, $returnVar);
                        
                        if ($returnVar === 0 && file_exists($tempPngPath) && filesize($tempPngPath) > 0) {
                            $imageData = file_get_contents($tempPngPath);
                            if ($imageData && strlen($imageData) > 0) {
                                $base64Image = base64_encode($imageData);
                                $imageDataUrl = "data:image/png;base64,{$base64Image}";
                                
                                // Clean up temp file
                                @unlink($tempPngPath);
                                
                                \Log::info("Successfully converted PDF letterhead to image using Ghostscript", [
                                    'letterhead_id' => $letterhead->id,
                                    'image_size' => strlen($imageData),
                                    'pdf_path' => $pdfPath,
                                ]);
                            } else {
                                \Log::warning("Ghostscript conversion produced empty image", [
                                    'letterhead_id' => $letterhead->id,
                                    'temp_path' => $tempPngPath,
                                    'command_output' => implode("\n", $output),
                                ]);
                                @unlink($tempPngPath);
                            }
                        } else {
                            \Log::warning("Ghostscript conversion failed", [
                                'letterhead_id' => $letterhead->id,
                                'return_code' => $returnVar,
                                'command_output' => implode("\n", $output),
                                'temp_path_exists' => file_exists($tempPngPath),
                            ]);
                            if (file_exists($tempPngPath)) {
                                @unlink($tempPngPath);
                            }
                        }
                    }
                } catch (\Exception $e) {
                    \Log::warning("Ghostscript conversion failed for letterhead {$letterhead->id}: {$e->getMessage()}", [
                        'letterhead_id' => $letterhead->id,
                    ]);
                }
                
                // If Ghostscript conversion succeeded, use the image
                if ($imageDataUrl) {
                    return <<<HTML
        <div class="{$class}" style="position: absolute; inset: 0; width: 100%; height: 100%; z-index: 1 !important; pointer-events: none; overflow: hidden; background-color: #ffffff; {$extraStyle}">
            <img src="{$imageDataUrl}" alt="Letterhead" style="width: 100%; height: 100%; object-fit: {$objectFit}; display: block; min-height: 100vh; position: absolute; top: 0; left: 0;" />
        </div>
HTML;
                }
                
                // Fallback: Use embed tag with PDF data URL
                // Note: Browsershot may not render PDF embeds properly without Imagick/Ghostscript
                // This is a last resort - the letterhead may not appear
                \Log::error("Imagick and Ghostscript not available for PDF letterhead conversion - letterhead may not render", [
                    'letterhead_id' => $letterhead->id,
                    'file_path' => $letterhead->file_path,
                    'recommendation' => 'Install Imagick PHP extension (php-imagick) or Ghostscript (gs) for PDF letterhead support',
                ]);
                
                // Use embed tag as last resort - Browsershot might render it, but likely won't work
                // Show a visible placeholder so user knows letterhead should be there
                $objectFit = $isBackground ? 'cover' : 'contain';
                return <<<HTML
        <div class="{$class}" style="position: absolute; inset: 0; width: 100%; height: 100%; z-index: 1 !important; pointer-events: none; overflow: hidden; background-color: #ffffff; {$extraStyle}">
            <embed src="{$dataUrl}" type="application/pdf" style="width: 100%; height: 100%; min-height: 100vh; position: absolute; top: 0; left: 0; border: none; pointer-events: none;" />
            <!-- Fallback: Show warning if PDF doesn't load -->
            <div style="position: absolute; inset: 0; background: rgba(255, 255, 255, 0.95); display: flex; align-items: center; justify-content: center; color: #999; font-size: 11px; text-align: center; padding: 20px; z-index: 2;">
                <div>
                    <p style="margin: 0 0 8px 0; font-weight: 500;">⚠️ PDF Letterhead</p>
                    <p style="margin: 0; font-size: 10px; opacity: 0.8;">Imagick or Ghostscript required for PDF letterhead rendering. Letterhead may not appear in generated PDF.</p>
                </div>
            </div>
        </div>
HTML;
            }
        }
        
        // For image letterheads, use CSS background-image with base64 data URL
        // This works for both browser preview and PDF generation
        $backgroundSize = $isBackground ? 'cover' : 'contain';
        $backgroundPosition = $isBackground ? 'center center' : 'center top';
        
        // Log for debugging
        if (config('app.debug')) {
            \Log::debug("Rendering image letterhead", [
                'letterhead_id' => $letterhead->id,
                'is_background' => $isBackground,
                'for_browser' => $forBrowser,
                'data_url_length' => strlen($dataUrl),
            ]);
        }
        
        return <<<HTML
        <div 
            class="{$class}" 
            style="position: absolute; inset: 0; width: 100%; height: 100%; min-height: 100vh; z-index: 1 !important; pointer-events: none; overflow: hidden; background-color: #ffffff; background-image: url('{$dataUrl}'); background-size: {$backgroundSize}; background-position: {$backgroundPosition}; background-repeat: no-repeat; {$extraStyle}"
        ></div>
HTML;
    }

    /**
     * Build watermark HTML
     * Supports both Letterhead (old DMS system) and BrandingWatermark (new reporting system)
     *
     * @param Letterhead|BrandingWatermark|null $watermark
     * @param bool $forBrowser Whether this is for browser preview (true) or PDF generation (false)
     * @return string
     */
    private function buildWatermarkHtml($watermark, bool $forBrowser = false): string
    {
        if (!$watermark) {
            return '';
        }

        $fileUrl = null;
        $opacity = 0.08;
        $rotation = 0;
        $scale = 1.0;
        $position = 'center';
        $posX = 50.0;
        $posY = 50.0;

        // Check if it's a BrandingWatermark (new reporting system)
        if ($watermark instanceof \App\Models\BrandingWatermark) {
            // Only process image watermarks (text watermarks are handled differently)
            if ($watermark->wm_type !== 'image' || !$watermark->isImage()) {
                return '';
            }

            // Get image data URI from BrandingWatermark
            $fileUrl = $watermark->getImageDataUri();
            if (!$fileUrl) {
                return '';
            }

            // Get styling properties from BrandingWatermark
            $opacity = $watermark->opacity ?? 0.08;
            $rotation = $watermark->rotation_deg ?? 0;
            $scale = $watermark->scale ?? 1.0;
            $position = $watermark->position ?? 'center';
            $posX = $watermark->pos_x ?? 50.0;
            $posY = $watermark->pos_y ?? 50.0;
        }
        // Check if it's a Letterhead (old DMS system)
        elseif ($watermark instanceof \App\Models\Letterhead) {
            $renderPath = $this->resolveLetterheadRenderPath($watermark);
            if (!$renderPath) {
                return '';
            }

            // CRITICAL: Browsershot doesn't allow file:// URLs
            // Always use base64 data URLs for both browser preview and PDF generation
            try {
                $fileContents = Storage::get($renderPath);
                $mimeType = Storage::mimeType($renderPath);
                $base64 = base64_encode($fileContents);
                $fileUrl = "data:{$mimeType};base64,{$base64}";
            } catch (\Exception $e) {
                \Log::error("Failed to base64 encode watermark {$watermark->id}: {$e->getMessage()}", [
                    'watermark_id' => $watermark->id,
                    'file_path' => $renderPath,
                    'for_browser' => $forBrowser,
                    'exception' => $e,
                ]);
                // Return empty string - better to show no watermark than break PDF generation
                return '';
            }
        } else {
            // Unknown watermark type
            return '';
        }

        if (!$fileUrl) {
            return '';
        }

        // Build CSS transform for rotation and scale
        $transforms = [];
        if ($rotation != 0) {
            $transforms[] = "rotate({$rotation}deg)";
        }
        if ($scale != 1.0) {
            $transforms[] = "scale({$scale})";
        }
        $transform = !empty($transforms) ? implode(' ', $transforms) : 'none';

        // Build CSS position based on position setting
        $positionStyles = [];
        switch ($position) {
            case 'center':
                $positionStyles[] = 'top: 50%';
                $positionStyles[] = 'left: 50%';
                $positionStyles[] = 'transform: translate(-50%, -50%) ' . ($transform !== 'none' ? $transform : '');
                break;
            case 'top-left':
                $positionStyles[] = "top: {$posY}%";
                $positionStyles[] = "left: {$posX}%";
                $positionStyles[] = 'transform: ' . ($transform !== 'none' ? $transform : 'translate(-50%, -50%)');
                break;
            case 'top-right':
                $positionStyles[] = "top: {$posY}%";
                $positionStyles[] = "right: " . (100 - $posX) . "%";
                $positionStyles[] = 'transform: ' . ($transform !== 'none' ? $transform : 'translate(50%, -50%)');
                break;
            case 'bottom-left':
                $positionStyles[] = "bottom: " . (100 - $posY) . "%";
                $positionStyles[] = "left: {$posX}%";
                $positionStyles[] = 'transform: ' . ($transform !== 'none' ? $transform : 'translate(-50%, 50%)');
                break;
            case 'bottom-right':
                $positionStyles[] = "bottom: " . (100 - $posY) . "%";
                $positionStyles[] = "right: " . (100 - $posX) . "%";
                $positionStyles[] = 'transform: ' . ($transform !== 'none' ? $transform : 'translate(50%, 50%)');
                break;
            default:
                $positionStyles[] = 'top: 50%';
                $positionStyles[] = 'left: 50%';
                $positionStyles[] = 'transform: translate(-50%, -50%) ' . ($transform !== 'none' ? $transform : '');
        }

        $positionStyle = implode('; ', $positionStyles);

        return <<<HTML
        <div class="watermark" style="position: fixed; {$positionStyle}; opacity: {$opacity}; z-index: 1; width: 60%; height: auto; pointer-events: none;">
            <img src="{$fileUrl}" alt="Watermark" style="width: 100%; height: auto; max-width: 500px;" />
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
        $bodyText = trim($bodyText);
        if ($bodyText === '') {
            return '';
        }

        // Rich text (HTML) support
        if ($this->isLikelyHtml($bodyText)) {
            return '<div class="rich-text">' . $this->sanitizeRichHtml($bodyText) . '</div>';
        }

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
                    'position: absolute; left: %.2f%%; top: %.2f%%; transform: translate(-50%%, -50%%); font-size: %dpx; font-family: %s; text-align: %s; color: %s; z-index: 10; %s %s %s box-sizing: border-box; overflow: hidden; background-color: transparent; padding: 0;',
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

                $formattedText = $this->isLikelyHtml($blockText)
                    ? $this->sanitizeRichHtml($blockText)
                    : nl2br(e($blockText));
                $positionedBlocks[] = sprintf(
                    '<div class="positioned-text-block" style="%s">%s</div>',
                    $style,
                    $formattedText
                );
            } else {
                // No position defined - use default formatting
                if ($this->isLikelyHtml($blockText)) {
                    $positionedBlocks[] = '<div class="rich-text">' . $this->sanitizeRichHtml($blockText) . '</div>';
                } else {
                    $positionedBlocks[] = '<p>' . nl2br(e($blockText)) . '</p>';
                }
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

    private function resolveLetterheadRenderPath(Letterhead $letterhead): ?string
    {
        if (!empty($letterhead->image_path) && Storage::exists($letterhead->image_path)) {
            return $letterhead->image_path;
        }
        if (!empty($letterhead->file_path) && Storage::exists($letterhead->file_path)) {
            return $letterhead->file_path;
        }
        return null;
    }

    /**
     * Process letterhead file and convert to HTML (legacy support)
     *
     * @param Letterhead $letterhead
     * @return string
     */
    public function processLetterheadFile(Letterhead $letterhead): string
    {
        $renderPath = $this->resolveLetterheadRenderPath($letterhead);
        if (!$renderPath) {
            return '';
        }

        $fileType = $letterhead->file_type ?? 'image';
        $letterheadType = $letterhead->letterhead_type ?? 'background';

        if ($letterheadType === 'watermark') {
            // CRITICAL: Browsershot doesn't allow file:// URLs
            // Use base64 data URL for legacy method as well
            try {
                $fileContents = Storage::get($renderPath);
                $mimeType = Storage::mimeType($renderPath);
                $base64 = base64_encode($fileContents);
                $dataUrl = "data:{$mimeType};base64,{$base64}";
                
                return sprintf(
                    '<div class="letterhead-watermark" style="position: fixed; top: 50%%; left: 50%%; transform: translate(-50%%, -50%%); opacity: 0.08; z-index: 1;"><img src="%s" alt="%s" style="max-width: 500px; height: auto;" /></div>',
                    e($dataUrl),
                    e($letterhead->name)
                );
            } catch (\Exception $e) {
                \Log::error("Failed to base64 encode letterhead for legacy watermark: {$e->getMessage()}", [
                    'letterhead_id' => $letterhead->id,
                    'file_path' => $renderPath,
                    'exception' => $e,
                ]);
                return '';
            }
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
        // Convert all values to strings and handle null/empty values
        $normalizedVariables = [];
        foreach ($variables as $key => $value) {
            // Convert to string, handle null/empty
            $normalizedValue = $value !== null && $value !== '' ? (string) $value : '';
            $normalizedVariables[$key] = $normalizedValue;
        }

        // Replace known variables
        foreach ($normalizedVariables as $key => $value) {
            // Replace {{variable}} patterns (with various spacing)
            $text = str_replace("{{$key}}", $value, $text);
            $text = str_replace("{{ {$key} }}", $value, $text);
            $text = str_replace("{{ {$key}}}", $value, $text);
            $text = str_replace("{{{$key} }}", $value, $text);
        }

        // Replace any remaining {{variable}} patterns with empty string to prevent garbled text
        // This regex matches {{variable}} with optional spaces
        $text = preg_replace('/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/', '', $text);

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
