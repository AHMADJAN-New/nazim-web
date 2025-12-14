<?php

namespace App\Services;

use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Spatie\Browsershot\Browsershot;

class DocumentPdfService
{
    public function generate(string $html, string $pageLayout = 'A4_portrait', string $directory = 'dms/generated'): string
    {
        $filename = Str::uuid()->toString() . '.pdf';
        $path = $directory . '/' . $filename;

        $fullPath = Storage::path($path);
        if (!is_dir(dirname($fullPath))) {
            mkdir(dirname($fullPath), 0755, true);
        }

        if (class_exists(Browsershot::class)) {
            $browsershot = Browsershot::html($html)
                ->format('A4')
                ->showBackground()
                ->margins(10, 10, 10, 10);

            if ($pageLayout === 'A4_landscape') {
                $browsershot->landscape();
            }

            $browsershot->save($fullPath);
        } else {
            $pdf = Pdf::loadHTML($html);
            if ($pageLayout === 'A4_landscape') {
                $pdf->setPaper('A4', 'landscape');
            }
            $pdf->save($fullPath);
        }

        return $path;
    }
}
