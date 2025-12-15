<?php

namespace App\Services;

use App\Models\Letterhead;
use App\Models\LetterTemplate;
use App\Models\OutgoingDocument;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;

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

        // Combine content
        $contentHtml = $this->formatBodyText($bodyText) . $tableHtml;

        return $this->buildHtmlDocument($styles, $letterheadStyles, $letterheadHtml, $watermarkHtml, $contentHtml);
    }

    /**
     * Generate PDF from template and data
     *
     * @param LetterTemplate $template
     * @param string $bodyText
     * @param array $options
     * @return \Barryvdh\DomPDF\PDF
     */
    public function generatePdf(LetterTemplate $template, string $bodyText, array $options = []): \Barryvdh\DomPDF\PDF
    {
        $html = $this->render($template, $bodyText, $options);

        $pdf = Pdf::loadHTML($html);

        // Set paper size
        $pageLayout = $template->page_layout ?? 'A4_portrait';
        $orientation = str_contains($pageLayout, 'landscape') ? 'landscape' : 'portrait';
        $pdf->setPaper('A4', $orientation);

        return $pdf;
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
        string $contentHtml
    ): string {
        return <<<HTML
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Document</title>
    <style>
        {$styles}
        {$letterheadStyles}
    </style>
</head>
<body>
    {$letterheadHtml}
    {$watermarkHtml}
    <div class="content-wrapper">
        {$contentHtml}
    </div>
</body>
</html>
HTML;
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
            font-family: 'DejaVu Sans', 'Arial', sans-serif;
            font-size: 14px;
            line-height: 1.8;
            color: #000;
            direction: rtl;
            text-align: right;
        }

        .content-wrapper {
            position: relative;
            z-index: 10;
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

        // For browser preview, use HTTP URL to serve endpoint; for PDF generation, use file:// path
        if ($forBrowser) {
            // Use the serve endpoint to get the file with proper authorization
            $fileUrl = url("/api/dms/letterheads/{$letterhead->id}/serve");
        } else {
            // For PDF generation, use absolute file path
            $fileUrl = 'file://' . Storage::path($letterhead->file_path);
        }

        $backgroundRepeat = $repeatOnPages ? 'repeat' : 'no-repeat';

        $css = '';
        
        // @page rule only works for PDF, not for browser
        if (!$forBrowser) {
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
        }

        .letterhead-background,
        .letterhead-header {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            width: 100%;
            z-index: 0;
            pointer-events: none;
            overflow: hidden;
        }

        .letterhead-background {
            min-height: 100vh;
        }

        .letterhead-background img,
        .letterhead-header img {
            width: 100%;
            height: auto;
            display: block;
            max-width: 100%;
        }

        .letterhead-background img {
            min-height: 100vh;
            object-fit: cover;
        }

        body {
            position: relative;
            z-index: 1;
            background: transparent;
        }

        .content-wrapper {
            position: relative;
            z-index: 10;
            background: transparent;
            padding-top: 0;
        }
CSS;
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
        if (!$letterhead || !$letterhead->file_path || !Storage::exists($letterhead->file_path)) {
            return '';
        }

        // For browser preview, embed image as base64 to avoid authentication issues in iframe
        try {
            $fileContents = Storage::get($letterhead->file_path);
            $mimeType = Storage::mimeType($letterhead->file_path);
            $base64 = base64_encode($fileContents);
            $dataUrl = "data:{$mimeType};base64,{$base64}";
        } catch (\Exception $e) {
            // Fallback to URL if base64 encoding fails
            $dataUrl = url("/api/dms/letterheads/{$letterhead->id}/serve");
        }
        
        // Check if it's a background type (full page) or header type (top only)
        $letterheadType = $letterhead->letterhead_type ?? 'background';
        $isBackground = $letterheadType === 'background';
        
        $class = $isBackground ? 'letterhead-background' : 'letterhead-header';
        $style = $isBackground ? 'style="min-height: 100vh;"' : '';

        return <<<HTML
        <div class="{$class}" {$style}>
            <img src="{$dataUrl}" alt="Letterhead" />
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
                // Fallback to URL if base64 encoding fails
                $fileUrl = url("/api/dms/letterheads/{$watermark->id}/serve");
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
