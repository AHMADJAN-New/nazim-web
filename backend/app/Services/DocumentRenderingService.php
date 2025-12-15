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

        // Build CSS styles
        $styles = $this->buildStyles($pageLayout);

        // Build letterhead background CSS
        $letterheadStyles = $this->buildLetterheadStyles($letterhead, $repeatLetterhead);

        // Build watermark HTML
        $watermarkHtml = $this->buildWatermarkHtml($watermark);

        // Build table HTML if provided
        $tableHtml = $tablePayload ? $this->renderTablePayload($tablePayload) : '';

        // Combine content
        $contentHtml = $this->formatBodyText($bodyText) . $tableHtml;

        return $this->buildHtmlDocument($styles, $letterheadStyles, $watermarkHtml, $contentHtml);
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
     * @param string $watermarkHtml
     * @param string $contentHtml
     * @return string
     */
    private function buildHtmlDocument(
        string $styles,
        string $letterheadStyles,
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
     * @return string
     */
    private function buildLetterheadStyles(?Letterhead $letterhead, bool $repeatOnPages): string
    {
        if (!$letterhead || !$letterhead->file_path || !Storage::exists($letterhead->file_path)) {
            return '';
        }

        // Get absolute path to the letterhead file
        $filePath = Storage::path($letterhead->file_path);

        // For PDF generation, we need to convert images to base64 or use absolute paths
        // DomPDF works best with absolute paths

        $backgroundRepeat = $repeatOnPages ? 'repeat' : 'no-repeat';

        return <<<CSS
        @page {
            background: url('file://{$filePath}') no-repeat center top;
            background-size: 100% auto;
        }

        body {
            background: url('file://{$filePath}') {$backgroundRepeat} center top;
            background-size: 100% auto;
        }
CSS;
    }

    /**
     * Build watermark HTML
     *
     * @param Letterhead|null $watermark
     * @return string
     */
    private function buildWatermarkHtml(?Letterhead $watermark): string
    {
        if (!$watermark || !$watermark->file_path || !Storage::exists($watermark->file_path)) {
            return '';
        }

        $filePath = Storage::path($watermark->file_path);

        return <<<HTML
        <div class="watermark">
            <img src="file://{$filePath}" alt="Watermark" />
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
