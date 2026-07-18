<?php

namespace App\Services\Reports;

use App\Services\BrowsershotConfigurator;
use App\Services\Storage\FileStorageService;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\View;
use Illuminate\Support\Str;
use Spatie\Browsershot\Browsershot;

/**
 * PDF report generation service using Browsershot
 */
class PdfReportService
{
    public function __construct(
        private FileStorageService $fileStorageService
    ) {}

    /**
     * Generate PDF report
     *
     * @param  ReportConfig  $config  Report configuration
     * @param  array  $context  Template context
     * @param  callable|null  $progressCallback  Progress callback
     * @param  string  $organizationId  Organization ID for file storage (REQUIRED)
     * @param  string  $schoolId  School ID for file storage (REQUIRED)
     * @return array Result with path, filename, and size
     */
    public function generate(
        ReportConfig $config,
        array $context,
        ?callable $progressCallback,
        string $organizationId,
        string $schoolId
    ): array {
        $this->reportProgress($progressCallback, 0, 'Starting PDF generation');

        $binary = $this->generateContent($config, $context, $progressCallback, leanChrome: false);
        $this->reportProgress($progressCallback, 90, 'Storing PDF');

        $storagePath = $this->fileStorageService->storeReport(
            $binary['content'],
            $binary['filename'],
            $organizationId,
            $schoolId,
            $config->reportKey ?? 'general'
        );

        $this->reportProgress($progressCallback, 100, 'PDF generated');

        return [
            'path' => $storagePath,
            'filename' => $binary['filename'],
            'size' => $binary['size'],
        ];
    }

    /**
     * Generate PDF binary without storing (for ZIP packs).
     *
     * @return array{content: string, filename: string, size: int}
     */
    public function generateContent(
        ReportConfig $config,
        array $context,
        ?callable $progressCallback = null,
        bool $leanChrome = true
    ): array {
        $this->reportProgress($progressCallback, 0, 'Starting PDF generation');

        $html = $this->renderHtml($context, $config);
        $this->reportProgress($progressCallback, 30, 'HTML rendered');

        $result = $this->generatePdfBinary($html, $context, $config, $leanChrome);
        $this->reportProgress($progressCallback, 100, 'PDF generated');

        return $result;
    }

    /**
     * Render HTML from template
     */
    private function renderHtml(array $context, ?ReportConfig $config = null): string
    {
        // Get template name from context first, then from config, then default
        $templateName = $context['template_name'] ?? $config?->templateName ?? 'table_a4_portrait';
        $viewName = "reports.{$templateName}";
        $templatePath = resource_path("views/reports/{$templateName}.blade.php");

        // Check if view exists
        $viewExists = View::exists($viewName);
        if (! $viewExists) {
            \Log::warning("Template not found: {$viewName}, falling back to table_a4_portrait", [
                'requested_template' => $templateName,
                'view_name' => $viewName,
            ]);
            $viewName = 'reports.table_a4_portrait';
        } else {
            \Log::debug("Using template: {$viewName}", [
                'requested_template' => $templateName,
            ]);
        }

        // Log font settings being passed to template
        \Log::debug('PdfReportService: Rendering HTML with font settings', [
            'font_family' => $context['FONT_FAMILY'] ?? 'N/A',
            'font_size' => $context['FONT_SIZE'] ?? 'N/A',
            'template_name' => $viewName,
            'template_found' => $viewExists,
            'template_path' => $templatePath,
            'template_mtime' => (file_exists($templatePath) ? date('c', filemtime($templatePath)) : null),
        ]);

        $html = View::make($viewName, $context)->render();

        // Log a snippet of the rendered HTML to verify fonts are included and student-history sections are present
        if (config('app.debug')) {
            $fontFaceSnippet = substr($html, strpos($html, '@font-face') ?: 0, 500);
            $hasStudentInfoMarker = strpos($html, 'NAZIM_STUDENT_HISTORY_DETAILS_MARKER') !== false;
            $hasPersonalInfoHeading = (strpos($html, 'Personal Information') !== false) || (strpos($html, 'personalInfo') !== false);
            \Log::debug('PdfReportService: Font-face snippet from rendered HTML', [
                'has_font_face' => strpos($html, '@font-face') !== false,
                'font_face_snippet' => $fontFaceSnippet ?: 'NOT FOUND',
                'html_length' => strlen($html),
                'has_student_history_marker' => $hasStudentInfoMarker,
                'has_personal_info_heading' => $hasPersonalInfoHeading,
            ]);
        }

        return $html;
    }

    /**
     * Generate PDF binary from HTML using Browsershot (required for correct RTL shaping).
     *
     * @return array{content: string, filename: string, size: int}
     */
    private function generatePdfBinary(string $html, array $context, ReportConfig $config, bool $leanChrome = false): array
    {
        $filename = $this->generateFilename($config);
        $tempDir = sys_get_temp_dir();
        $tempPath = $tempDir.'/'.$filename;

        $pageSize = $context['page_size'] ?? 'A4';
        $orientation = $context['orientation'] ?? 'portrait';
        $margins = $this->parseMargins($context['margins'] ?? '15mm 12mm 18mm 12mm');

        $browsershot = Browsershot::html($html)
            ->format($pageSize)
            ->showBackground()
            ->margins(
                $margins['top'],
                $margins['right'],
                $margins['bottom'],
                $margins['left'],
                'mm'
            )
            ->timeout(120);

        if ($leanChrome) {
            // Faster for ZIP packs (many PDFs); fonts are embedded as base64 data URLs
            $browsershot->setDelay(400);
        } else {
            $browsershot->waitUntilNetworkIdle()->setDelay(2000);
        }

        BrowsershotConfigurator::apply($browsershot, [
            'disable-web-security',
            'disable-features=FontLoading',
        ]);

        if ($orientation === 'landscape') {
            $browsershot->landscape();
        }

        if (! empty($context['show_page_numbers']) || ! empty($context['show_generation_date'])) {
            $footerHtml = $this->buildFooterHtml($context);
            $browsershot->footerHtml($footerHtml);
            $browsershot->showBrowserHeaderAndFooter();
        }

        try {
            $browsershot->save($tempPath);
        } catch (\Exception $e) {
            throw new \RuntimeException(
                "PDF generation failed: {$e->getMessage()}",
                0,
                $e
            );
        }

        if (! file_exists($tempPath)) {
            throw new \RuntimeException("PDF file was not created at: {$tempPath}");
        }

        $pdfContent = file_get_contents($tempPath);
        $fileSize = filesize($tempPath);
        @unlink($tempPath);

        if ($pdfContent === false || $pdfContent === '') {
            throw new \RuntimeException('Generated PDF was empty');
        }

        return [
            'content' => $pdfContent,
            'filename' => $filename,
            'size' => $fileSize,
        ];
    }

    /**
     * Generate filename for the PDF
     */
    private function generateFilename(ReportConfig $config): string
    {
        $safeName = $this->sanitizeDownloadBasename($config->title ?: $config->reportKey, $config->reportKey);
        $timestamp = now()->format('Y-m-d_His');
        $uuid = Str::uuid()->toString();

        return "{$safeName}_{$timestamp}_{$uuid}.pdf";
    }

    /**
     * ASCII-safe basename for downloads. Avoids leading "-" which makes browsers
     * ignore the HTML download attribute (common with non-Latin report titles).
     */
    private function sanitizeDownloadBasename(string $baseName, ?string $fallback = null): string
    {
        $safeName = trim((string) preg_replace('/[^a-zA-Z0-9_-]+/', '_', $baseName), '_-');
        $alnum = preg_replace('/[^a-zA-Z0-9]+/', '', $safeName) ?? '';

        if ($safeName === '' || $alnum === '') {
            $fallbackName = $fallback ?: 'report';
            $safeName = trim((string) preg_replace('/[^a-zA-Z0-9_-]+/', '_', $fallbackName), '_-');
        }

        if ($safeName === '' || ! preg_match('/[a-zA-Z0-9]/', $safeName)) {
            $safeName = 'report';
        }

        return $safeName;
    }

    /**
     * Parse margin string into array
     */
    private function parseMargins(string $margins): array
    {
        $parts = preg_split('/\s+/', trim($margins));

        // Remove 'mm' suffix and convert to float
        $values = array_map(function ($part) {
            return (float) str_replace('mm', '', $part);
        }, $parts);

        return [
            'top' => $values[0] ?? 15,
            'right' => $values[1] ?? 12,
            'bottom' => $values[2] ?? 18,
            'left' => $values[3] ?? 12,
        ];
    }

    /**
     * Build footer HTML for page numbers and date
     */
    private function buildFooterHtml(array $context): string
    {
        $showPageNumbers = $context['show_page_numbers'] ?? true;
        $showDate = $context['show_generation_date'] ?? true;
        $primaryColor = $context['PRIMARY_COLOR'] ?? '#0b0b56';
        $fontFamily = $context['FONT_FAMILY'] ?? 'Bahij Nassim';

        $leftContent = '';
        $rightContent = '';

        if ($showDate) {
            $leftContent = $context['CURRENT_DATETIME'] ?? now()->format('Y-m-d H:i');
        }

        if ($showPageNumbers) {
            $rightContent = '<span class="pageNumber"></span> / <span class="totalPages"></span>';
        }

        return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: '{$fontFamily}', Arial, sans-serif;
            font-size: 9px;
            color: #666;
            margin: 0;
            padding: 0 20mm;
        }
        .footer-container {
            display: flex;
            justify-content: space-between;
            width: 100%;
        }
        .left { text-align: left; }
        .right { text-align: right; }
    </style>
</head>
<body>
    <div class="footer-container">
        <div class="left">{$leftContent}</div>
        <div class="right">{$rightContent}</div>
    </div>
</body>
</html>
HTML;
    }

    /**
     * Report progress via callback
     */
    private function reportProgress(?callable $callback, int $progress, string $message): void
    {
        if ($callback) {
            $callback($progress, $message);
        }
    }
}
