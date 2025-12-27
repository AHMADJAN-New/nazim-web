<?php

namespace App\Services\Reports;

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
     * @param ReportConfig $config Report configuration
     * @param array $context Template context
     * @param callable|null $progressCallback Progress callback
     * @param string|null $organizationId Organization ID for file storage
     * @param string|null $schoolId School ID for file storage
     * @return array Result with path, filename, and size
     */
    public function generate(
        ReportConfig $config,
        array $context,
        ?callable $progressCallback = null,
        ?string $organizationId = null,
        ?string $schoolId = null
    ): array {
        $this->reportProgress($progressCallback, 0, 'Starting PDF generation');

        // Render HTML
        $html = $this->renderHtml($context);
        $this->reportProgress($progressCallback, 30, 'HTML rendered');

        // Generate PDF file
        $result = $this->generatePdf($html, $context, $config, $organizationId, $schoolId);
        $this->reportProgress($progressCallback, 100, 'PDF generated');

        return $result;
    }

    /**
     * Render HTML from template
     */
    private function renderHtml(array $context): string
    {
        $templateName = $context['template_name'] ?? 'table_a4_portrait';
        $viewName = "reports.{$templateName}";

        // Check if view exists
        if (!View::exists($viewName)) {
            $viewName = 'reports.table_a4_portrait';
        }

        // Log font settings being passed to template
        \Log::debug("PdfReportService: Rendering HTML with font settings", [
            'font_family' => $context['FONT_FAMILY'] ?? 'N/A',
            'font_size' => $context['FONT_SIZE'] ?? 'N/A',
            'template_name' => $viewName,
        ]);

        $html = View::make($viewName, $context)->render();
        
        // Log a snippet of the rendered HTML to verify fonts are included
        if (config('app.debug')) {
            $fontFaceSnippet = substr($html, strpos($html, '@font-face') ?: 0, 500);
            \Log::debug("PdfReportService: Font-face snippet from rendered HTML", [
                'has_font_face' => strpos($html, '@font-face') !== false,
                'font_face_snippet' => $fontFaceSnippet ?: 'NOT FOUND',
                'html_length' => strlen($html),
            ]);
        }
        
        return $html;
    }

    /**
     * Generate PDF from HTML using Browsershot
     */
    private function generatePdf(string $html, array $context, ReportConfig $config, ?string $organizationId = null, ?string $schoolId = null): array
    {
        // Generate unique filename
        $filename = $this->generateFilename($config);
        
        // Create temporary file for Browsershot (it needs a file path)
        $tempDir = sys_get_temp_dir();
        $tempPath = $tempDir . '/' . $filename;

        // Get page settings
        $pageSize = $context['page_size'] ?? 'A4';
        $orientation = $context['orientation'] ?? 'portrait';
        $margins = $this->parseMargins($context['margins'] ?? '15mm 12mm 18mm 12mm');

        // Configure Browsershot
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
            ->waitUntilNetworkIdle()
            ->timeout(120)
            ->addChromiumArguments([
                'no-sandbox',
                'disable-setuid-sandbox',
                'disable-web-security', // Allow loading fonts from data URLs
            ]); // Required for Linux environments without proper sandbox support (no -- prefix, Browsershot adds it)

        // Set orientation
        if ($orientation === 'landscape') {
            $browsershot->landscape();
        }

        // Add header and footer if configured
        if (!empty($context['show_page_numbers']) || !empty($context['show_generation_date'])) {
            $footerHtml = $this->buildFooterHtml($context);
            $browsershot->footerHtml($footerHtml);
            $browsershot->showBrowserHeaderAndFooter();
        }

        // Generate PDF to temp file
        try {
            $browsershot->save($tempPath);
        } catch (\Exception $e) {
            // Browsershot throws exceptions on failure - re-throw with context
            throw new \RuntimeException(
                "PDF generation failed: {$e->getMessage()}",
                0,
                $e
            );
        }

        // Verify file was created
        if (!file_exists($tempPath)) {
            throw new \RuntimeException("PDF file was not created at: {$tempPath}");
        }

        // Read PDF content
        $pdfContent = file_get_contents($tempPath);
        $fileSize = filesize($tempPath);

        // Store using FileStorageService if organization and school IDs are provided
        if ($organizationId && $schoolId) {
            $storagePath = $this->fileStorageService->storeReport(
                $pdfContent,
                $filename,
                $organizationId,
                $schoolId,
                $config->reportKey ?? 'general'
            );
        } else {
            // Fallback to old storage method for backward compatibility
            $storageDir = storage_path('app/reports');
            if (!is_dir($storageDir)) {
                mkdir($storageDir, 0755, true);
            }
            $storagePath = "reports/{$filename}";
            Storage::disk('local')->put($storagePath, $pdfContent);
        }

        // Clean up temp file
        @unlink($tempPath);

        return [
            'path' => $storagePath,
            'filename' => $filename,
            'size' => $fileSize,
        ];
    }

    /**
     * Generate filename for the PDF
     */
    private function generateFilename(ReportConfig $config): string
    {
        $baseName = $config->title ?: $config->reportKey;
        $safeName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $baseName);
        $timestamp = now()->format('Y-m-d_His');
        $uuid = Str::uuid()->toString();

        return "{$safeName}_{$timestamp}_{$uuid}.pdf";
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
