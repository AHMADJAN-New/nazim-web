<?php

namespace App\Services;

use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Spatie\Browsershot\Browsershot;

class DocumentPdfService
{
    public function generate(string $html, string $pageLayout = 'A4_portrait', string $directory = 'dms/generated'): string
    {
        $filename = Str::uuid()->toString() . '.pdf';
        $path = $directory . '/' . $filename;

        try {
            $fullPath = Storage::path($path);
            $directoryPath = dirname($fullPath);
            
            if (!is_dir($directoryPath)) {
                if (!mkdir($directoryPath, 0755, true)) {
                    throw new \RuntimeException("Failed to create directory: {$directoryPath}");
                }
            }

            // Try Browsershot first (better quality, supports CSS better)
            if (class_exists(Browsershot::class)) {
                try {
                    $browsershot = Browsershot::html($html)
                        ->format('A4')
                        ->showBackground() // Critical for letterheads and backgrounds
                        ->waitUntilNetworkIdle() // Wait for all resources (including base64 images) to load
                        ->timeout(120) // 2 minute timeout for complex documents with letterheads
                        ->margins(5, 5, 5, 5)
                        ->setDelay(3000); // Add 3 second delay to ensure PDF letterheads converted to images are fully loaded

                    if ($pageLayout === 'A4_landscape') {
                        $browsershot->landscape();
                    }

                    $browsershot->save($fullPath);
                    
                    // Verify file was created
                    if (!file_exists($fullPath)) {
                        throw new \RuntimeException("Browsershot generated PDF but file not found at: {$fullPath}");
                    }
                    
                    // Success - return the path
                    return $path;
                } catch (\Exception $e) {
                    // Check if error is due to missing Puppeteer
                    $isPuppeteerError = str_contains($e->getMessage(), 'puppeteer') || 
                                       str_contains($e->getMessage(), 'MODULE_NOT_FOUND');
                    
                    Log::warning('Browsershot PDF generation failed, falling back to DomPDF', [
                        'error' => $e->getMessage(),
                        'is_puppeteer_error' => $isPuppeteerError,
                        'path' => $fullPath,
                    ]);
                    
                    // If it's a Puppeteer error, fall back to DomPDF
                    // Otherwise, re-throw the error
                    if (!$isPuppeteerError) {
                        throw new \RuntimeException("Browsershot PDF generation failed: " . $e->getMessage(), 0, $e);
                    }
                    // Continue to DomPDF fallback below
                }
            }
            
            // Fallback to DomPDF (works without Puppeteer, but has CSS limitations)
            try {
                $pdf = Pdf::loadHTML($html);
                if ($pageLayout === 'A4_landscape') {
                    $pdf->setPaper('A4', 'landscape');
                } else {
                    $pdf->setPaper('A4', 'portrait');
                }
                $pdf->save($fullPath);
                
                // Verify file was created
                if (!file_exists($fullPath)) {
                    throw new \RuntimeException("DomPDF generated PDF but file not found at: {$fullPath}");
                }
            } catch (\Exception $e) {
                Log::error('DomPDF generation failed', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                    'path' => $fullPath,
                ]);
                throw new \RuntimeException("PDF generation failed (both Browsershot and DomPDF): " . $e->getMessage(), 0, $e);
            }

            return $path;
        } catch (\Exception $e) {
            Log::error('PDF generation failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'directory' => $directory,
                'pageLayout' => $pageLayout,
            ]);
            throw $e;
        }
    }
}
