<?php

namespace App\Services;

use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\View;
use Illuminate\Support\Str;
use Spatie\Browsershot\Browsershot;

class SalesInvoicePdfService
{
    public function generate(array $payload, string $baseFilename = 'nazim-sales-invoice'): string
    {
        $html = View::make('platform.sales-invoice-pdf', $payload)->render();

        $tempDir = storage_path('app/temp/sales-invoices');
        if (! is_dir($tempDir) && ! mkdir($tempDir, 0775, true) && ! is_dir($tempDir)) {
            throw new \RuntimeException("Failed to create sales invoice temp directory: {$tempDir}");
        }

        $filename = Str::slug($baseFilename) ?: 'nazim-sales-invoice';
        $filename .= '-'.Str::uuid()->toString().'.pdf';
        $tempPath = $tempDir.DIRECTORY_SEPARATOR.$filename;

        try {
            $this->generateWithBrowsershot($html, $tempPath);
        } catch (\Throwable $e) {
            Log::warning('Sales invoice PDF generation with Browsershot failed; falling back to DomPDF', [
                'message' => $e->getMessage(),
            ]);
            $this->generateWithDompdf($html, $tempPath);
        }

        if (! file_exists($tempPath)) {
            throw new \RuntimeException("Sales invoice PDF was not created at: {$tempPath}");
        }

        return $tempPath;
    }

    private function generateWithBrowsershot(string $html, string $tempPath): void
    {
        if (! class_exists(Browsershot::class)) {
            throw new \RuntimeException('Browsershot is not available');
        }

        $browsershot = Browsershot::html($html)
            ->format('A4')
            ->showBackground()
            ->margins(10, 12, 10, 12, 'mm')
            ->waitUntilNetworkIdle()
            ->setDelay(2000)
            ->timeout(120);

        BrowsershotConfigurator::apply($browsershot, [
            'disable-web-security',
            'disable-features=FontLoading',
        ]);

        $browsershot->save($tempPath);
    }

    private function generateWithDompdf(string $html, string $tempPath): void
    {
        // Dompdf writes font metrics cache under storage/fonts by default.
        // Ensure the directory exists to avoid 500s on first render.
        $fontCacheDir = storage_path('fonts');
        if (! is_dir($fontCacheDir) && ! mkdir($fontCacheDir, 0775, true) && ! is_dir($fontCacheDir)) {
            throw new \RuntimeException("Failed to create Dompdf font cache directory: {$fontCacheDir}");
        }

        $pdf = Pdf::loadHTML($html);
        $pdf->setPaper('A4', 'portrait');
        $pdf->save($tempPath);
    }
}
