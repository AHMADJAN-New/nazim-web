<?php

namespace App\Services\Reports;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\View;
use Illuminate\Support\Str;
use Spatie\Browsershot\Browsershot;

/**
 * PDF report generation service using Browsershot
 */
class PdfReportService
{
    /**
     * Generate PDF report
     *
     * @param ReportConfig $config Report configuration
     * @param array $context Template context
     * @param callable|null $progressCallback Progress callback
     * @return array Result with path, filename, and size
     */
    public function generate(
        ReportConfig $config,
        array $context,
        ?callable $progressCallback = null
    ): array {
        $this->reportProgress($progressCallback, 0, 'Starting PDF generation');

        // Render HTML
        $html = $this->renderHtml($context);
        $this->reportProgress($progressCallback, 30, 'HTML rendered');

        // Generate PDF file
        $result = $this->generatePdf($html, $context, $config);
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

        return View::make($viewName, $context)->render();
    }

    /**
     * Generate PDF from HTML using Browsershot
     */
    private function generatePdf(string $html, array $context, ReportConfig $config): array
    {
        // Create temporary directory if needed
        $tempDir = storage_path('app/reports');
        if (!is_dir($tempDir)) {
            mkdir($tempDir, 0755, true);
        }

        // Generate unique filename
        $filename = $this->generateFilename($config);
        $relativePath = "reports/{$filename}";
        $absolutePath = storage_path("app/{$relativePath}");

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
            ->timeout(120);

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

        // Generate PDF
        $browsershot->save($absolutePath);

        // Get file size
        $fileSize = filesize($absolutePath);

        return [
            'path' => $relativePath,
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
