<?php

namespace App\Services;

use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\View;
use Illuminate\Support\Str;
use Spatie\Browsershot\Browsershot;

class OrganizationOrderFormPdfService
{
    public function generate(array $payload, string $baseFilename = 'nazim-order-form'): string
    {
        $html = View::make('platform.organization-order-form-pdf', $payload)->render();

        $tempDir = storage_path('app/temp/order-forms');
        if (!is_dir($tempDir) && !mkdir($tempDir, 0775, true) && !is_dir($tempDir)) {
            throw new \RuntimeException("Failed to create order form temp directory: {$tempDir}");
        }

        $filename = Str::slug($baseFilename) ?: 'nazim-order-form';
        $filename .= '-'.Str::uuid()->toString().'.pdf';
        $tempPath = $tempDir.DIRECTORY_SEPARATOR.$filename;

        try {
            $this->generateWithBrowsershot($html, $tempPath);
        } catch (\Throwable $e) {
            Log::warning('Organization order form PDF generation with Browsershot failed; falling back to DomPDF', [
                'message' => $e->getMessage(),
            ]);
            $this->generateWithDompdf($html, $tempPath);
        }

        if (!file_exists($tempPath)) {
            throw new \RuntimeException("Order form PDF was not created at: {$tempPath}");
        }

        return $tempPath;
    }

    private function generateWithBrowsershot(string $html, string $tempPath): void
    {
        if (!class_exists(Browsershot::class)) {
            throw new \RuntimeException('Browsershot is not available');
        }

        $browsershot = Browsershot::html($html)
            ->format('A4')
            ->showBackground()
            ->margins(10, 12, 10, 12, 'mm')
            ->waitUntilNetworkIdle()
            ->setDelay(2000)
            ->timeout(120)
            ->addChromiumArguments([
                'no-sandbox',
                'disable-setuid-sandbox',
                'disable-web-security',
                'disable-features=FontLoading',
            ]);

        $nodePath = env('BROWSERSHOT_NODE_BINARY') ?: getenv('BROWSERSHOT_NODE_BINARY');
        if ($nodePath && file_exists($nodePath)) {
            $browsershot->setNodePath($nodePath);
        }

        $npmPath = env('BROWSERSHOT_NPM_BINARY') ?: getenv('BROWSERSHOT_NPM_BINARY');
        if ($npmPath && file_exists($npmPath)) {
            $browsershot->setNpmPath($npmPath);
        }

        $chromePath = $this->findChromePath();
        if ($chromePath) {
            $browsershot->setChromePath($chromePath);
        }

        $browsershot->save($tempPath);
    }

    private function generateWithDompdf(string $html, string $tempPath): void
    {
        $pdf = Pdf::loadHTML($html);
        $pdf->setPaper('A4', 'portrait');
        $pdf->save($tempPath);
    }

    private function findChromePath(): ?string
    {
        $envChromePath = env('PUPPETEER_CHROME_PATH') ?: getenv('PUPPETEER_CHROME_PATH');
        if ($envChromePath && is_file($envChromePath)) {
            return $envChromePath;
        }

        $sep = DIRECTORY_SEPARATOR;
        $patterns = [];

        $userProfile = getenv('USERPROFILE') ?: null;
        $cacheDir = getenv('PUPPETEER_CACHE_DIR') ?: ($userProfile ? $userProfile.$sep.'.cache'.$sep.'puppeteer' : null);
        if ($cacheDir) {
            if (PHP_OS_FAMILY === 'Windows') {
                $patterns[] = $cacheDir.$sep.'chrome-headless-shell'.$sep.'win64-*'.$sep.'chrome-headless-shell'.$sep.'chrome-headless-shell.exe';
                $patterns[] = $cacheDir.$sep.'chrome'.$sep.'win64-*'.$sep.'chrome-win64'.$sep.'chrome.exe';
            } else {
                $patterns[] = $cacheDir.$sep.'chrome-headless-shell'.$sep.'linux-*'.$sep.'chrome-headless-shell-linux64'.$sep.'chrome-headless-shell';
                $patterns[] = $cacheDir.$sep.'chrome'.$sep.'linux-*'.$sep.'chrome-linux64'.$sep.'chrome';
            }
        }

        $patterns = array_merge($patterns, [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            '/usr/bin/google-chrome',
            '/usr/bin/google-chrome-stable',
            '/usr/bin/chromium',
            '/usr/bin/chromium-browser',
            '/snap/bin/chromium',
        ]);

        foreach ($patterns as $pattern) {
            if (str_contains($pattern, '*')) {
                foreach (glob($pattern) ?: [] as $match) {
                    if (is_file($match)) {
                        return $match;
                    }
                }
                continue;
            }

            if (is_file($pattern)) {
                return $pattern;
            }
        }

        return null;
    }
}
