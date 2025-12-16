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

            if (class_exists(Browsershot::class)) {
                try {
                    $browsershot = Browsershot::html($html)
                        ->format('A4')
                        ->showBackground()
                        ->margins(5, 5, 5, 5);

                    if ($pageLayout === 'A4_landscape') {
                        $browsershot->landscape();
                    }

                    $browsershot->save($fullPath);
                    
                    // Verify file was created
                    if (!file_exists($fullPath)) {
                        throw new \RuntimeException("Browsershot generated PDF but file not found at: {$fullPath}");
                    }
                } catch (\Exception $e) {
                    Log::error('Browsershot PDF generation failed', [
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString(),
                        'path' => $fullPath,
                    ]);
                    throw new \RuntimeException("Browsershot PDF generation failed: " . $e->getMessage(), 0, $e);
                }
            } else {
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
                    throw new \RuntimeException("DomPDF generation failed: " . $e->getMessage(), 0, $e);
                }
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
