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
     * @param string $organizationId Organization ID for file storage (REQUIRED)
     * @param string $schoolId School ID for file storage (REQUIRED)
     * @return array Result with path, filename, and size
     */
    public function generate(
        ReportConfig $config,
        array $context,
        ?callable $progressCallback = null,
        string $organizationId,
        string $schoolId
    ): array {
        $this->reportProgress($progressCallback, 0, 'Starting PDF generation');

        // Render HTML
        $html = $this->renderHtml($context, $config);
        $this->reportProgress($progressCallback, 30, 'HTML rendered');

        // Generate PDF file
        $result = $this->generatePdf($html, $context, $config, $organizationId, $schoolId);
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
        if (!$viewExists) {
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
        \Log::debug("PdfReportService: Rendering HTML with font settings", [
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
            \Log::debug("PdfReportService: Font-face snippet from rendered HTML", [
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
     * Generate PDF from HTML using Browsershot
     * CRITICAL: Reports are school-scoped and MUST include both organizationId and schoolId
     */
    private function generatePdf(string $html, array $context, ReportConfig $config, string $organizationId, string $schoolId): array
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
            ->setDelay(2000) // Wait 2 seconds for fonts to load from base64 data URLs
            ->timeout(120)
            ->addChromiumArguments([
                'no-sandbox',
                'disable-setuid-sandbox',
                'disable-web-security', // Allow loading fonts from data URLs
                'disable-features=FontLoading', // Disable font loading restrictions
            ]); // Required for Linux environments without proper sandbox support (no -- prefix, Browsershot adds it)

        // Set Node.js path (required for Browsershot/Puppeteer)
        $nodePath = env('BROWSERSHOT_NODE_BINARY') ?: getenv('BROWSERSHOT_NODE_BINARY') ?: '/usr/bin/node';
        if (file_exists($nodePath) && is_executable($nodePath)) {
            \Log::info("Using Node.js path: {$nodePath}");
            $browsershot->setNodePath($nodePath);
        } else {
            \Log::warning("Node.js not found at {$nodePath}, Browsershot will try to find it automatically");
        }

        // Set npm path (required for Browsershot/Puppeteer)
        $npmPath = env('BROWSERSHOT_NPM_BINARY') ?: getenv('BROWSERSHOT_NPM_BINARY') ?: '/usr/bin/npm';
        if (file_exists($npmPath) && is_executable($npmPath)) {
            \Log::info("Using npm path: {$npmPath}");
            $browsershot->setNpmPath($npmPath);
        } else {
            \Log::warning("npm not found at {$npmPath}, Browsershot will try to find it automatically");
        }

        // Set Puppeteer cache directory (required for Browsershot)
        $defaultCacheDir = PHP_OS_FAMILY === 'Windows'
            ? (getenv('USERPROFILE') ?: getenv('HOMEDRIVE') . getenv('HOMEPATH')) . DIRECTORY_SEPARATOR . '.cache' . DIRECTORY_SEPARATOR . 'puppeteer'
            : '/var/www/.cache/puppeteer';
        $puppeteerCacheDir = env('PUPPETEER_CACHE_DIR') ?: getenv('PUPPETEER_CACHE_DIR') ?: $defaultCacheDir;
        if (is_dir($puppeteerCacheDir)) {
            \Log::info("Using Puppeteer cache directory: {$puppeteerCacheDir}");
            putenv("PUPPETEER_CACHE_DIR={$puppeteerCacheDir}");
        } else {
            \Log::warning("Puppeteer cache directory not found at {$puppeteerCacheDir}, creating it");
            @mkdir($puppeteerCacheDir, 0775, true);
            if (PHP_OS_FAMILY !== 'Windows') {
                @chown($puppeteerCacheDir, 'www-data');
                @chmod($puppeteerCacheDir, 0775);
            }
            putenv("PUPPETEER_CACHE_DIR={$puppeteerCacheDir}");
        }

        // Set Chrome/Chromium path if puppeteer is installed
        // Browsershot will use the Chrome from puppeteer if available
        $chromePath = $this->findChromePath();
        if ($chromePath) {
            \Log::info("Using Chrome path: {$chromePath}");
            $browsershot->setChromePath($chromePath);
        } else {
            \Log::warning("Chrome not found, Browsershot will try to find it automatically");
        }

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

        // Store using FileStorageService (school-scoped storage)
        $storagePath = $this->fileStorageService->storeReport(
            $pdfContent,
            $filename,
            $organizationId,
            $schoolId,
            $config->reportKey ?? 'general'
        );

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
     * Find Chrome/Chromium executable path
     * Checks puppeteer cache first, then system paths.
     * Supports Linux and Windows.
     *
     * Priority:
     * 1. Environment variable PUPPETEER_CHROME_PATH
     * 2. Puppeteer cache (e.g. ~/.cache/puppeteer or %USERPROFILE%\.cache\puppeteer)
     * 3. System-installed Chrome/Chromium
     */
    private function findChromePath(): ?string
    {
        $envChromePath = env('PUPPETEER_CHROME_PATH') ?: getenv('PUPPETEER_CHROME_PATH');
        if ($envChromePath && is_file($envChromePath)) {
            if (PHP_OS_FAMILY === 'Windows' || is_executable($envChromePath)) {
                \Log::info("Using Chrome from PUPPETEER_CHROME_PATH: {$envChromePath}");
                return $envChromePath;
            }
        }

        $sep = DIRECTORY_SEPARATOR;
        $possibleCacheDirs = [];

        if (PHP_OS_FAMILY === 'Windows') {
            $userProfile = getenv('USERPROFILE') ?: (getenv('HOMEDRIVE') . getenv('HOMEPATH'));
            if ($userProfile) {
                $possibleCacheDirs[] = $userProfile . $sep . '.cache' . $sep . 'puppeteer';
            }
            $possibleCacheDirs[] = getenv('PUPPETEER_CACHE_DIR') ?: null;
        } else {
            $possibleCacheDirs = [
                '/home/nazim/.cache/puppeteer',
                '/var/www/.cache/puppeteer',
                getenv('HOME') ? getenv('HOME') . '/.cache/puppeteer' : null,
                '/root/.cache/puppeteer',
            ];
        }

        $possibleCacheDirs = array_filter($possibleCacheDirs, fn ($dir) => $dir !== null && $dir !== '' && is_dir($dir));

        $chromePathPatterns = [];
        foreach ($possibleCacheDirs as $cache) {
            if (PHP_OS_FAMILY === 'Windows') {
                $chromePathPatterns[] = $cache . $sep . 'chrome-headless-shell' . $sep . 'win32-*' . $sep . 'chrome-headless-shell' . $sep . 'chrome-headless-shell.exe';
                $chromePathPatterns[] = $cache . $sep . 'chrome-headless-shell' . $sep . 'win64-*' . $sep . 'chrome-headless-shell' . $sep . 'chrome-headless-shell.exe';
                $chromePathPatterns[] = $cache . $sep . 'chrome' . $sep . 'win64-*' . $sep . 'chrome-win64' . $sep . 'chrome.exe';
                $chromePathPatterns[] = $cache . $sep . 'chrome' . $sep . 'win32-*' . $sep . 'chrome-win' . $sep . 'chrome.exe';
            } else {
                $chromePathPatterns[] = $cache . '/chrome-headless-shell/linux-*/chrome-headless-shell-linux64/chrome-headless-shell';
                $chromePathPatterns[] = $cache . '/chrome/linux-*/chrome-linux64/chrome';
            }
        }

        if (PHP_OS_FAMILY === 'Windows') {
            $localAppData = getenv('LOCALAPPDATA');
            $systemChromePaths = [
                'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            ];
            if ($localAppData) {
                $systemChromePaths[] = $localAppData . $sep . 'Google' . $sep . 'Chrome' . $sep . 'Application' . $sep . 'chrome.exe';
            }
            $chromePathPatterns = array_merge($chromePathPatterns, $systemChromePaths);
        } else {
            $chromePathPatterns = array_merge($chromePathPatterns, [
                '/usr/bin/google-chrome',
                '/usr/bin/chromium',
                '/usr/bin/chromium-browser',
                '/snap/bin/chromium',
                '/usr/bin/google-chrome-stable',
            ]);
        }

        foreach ($chromePathPatterns as $pattern) {
            if ($pattern === null || $pattern === '') {
                continue;
            }
            $matches = glob($pattern);
            if (! empty($matches)) {
                rsort($matches);
                foreach ($matches as $chromePath) {
                    if (is_file($chromePath) && (PHP_OS_FAMILY === 'Windows' || is_executable($chromePath))) {
                        \Log::info("Found Chrome at: {$chromePath}");
                        return $chromePath;
                    }
                }
            }
        }

        \Log::warning('Chrome not found in any of the checked paths', [
            'checked_paths' => $chromePathPatterns,
            'possible_cache_dirs' => array_values($possibleCacheDirs),
            'env_chrome_path' => $envChromePath,
        ]);

        return null;
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
