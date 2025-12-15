<?php

namespace App\Services;

use App\Models\Letterhead;
use Illuminate\Support\Facades\Storage;

class DocumentRenderingService
{
    public function render(string $bodyHtml, array $options = []): string
    {
        $letterheadHtml = $options['letterhead_html'] ?? '';
        $tablePayload = $options['table_payload'] ?? null;
        $pageLayout = $options['page_layout'] ?? 'A4_portrait';

        $tableHtml = $tablePayload ? $this->renderTablePayload($tablePayload) : '';
        $content = $letterheadHtml . $bodyHtml . $tableHtml;

        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <style>
        @page {
            size: {$this->pageSize($pageLayout)};
            margin: 20mm;
        }
        body { font-family: 'Inter', 'Arial', sans-serif; line-height: 1.4; }
        .rtl { direction: rtl; }
        table { width: 100%; border-collapse: collapse; }
        thead { display: table-header-group; }
        tfoot { display: table-row-group; }
        tr { page-break-inside: avoid; }
        th, td { border: 1px solid #333; padding: 6px; font-size: 12px; }
        .page-break { page-break-after: always; }
    </style>
</head>
<body>
{$content}
</body>
</html>
HTML;
    }

    private function renderTablePayload(array $payload): string
    {
        if (empty($payload['headers']) || empty($payload['rows'])) {
            return '';
        }

        $headers = array_map(fn ($h) => sprintf('<th>%s</th>', e($h)), $payload['headers']);
        $rows = collect($payload['rows'])->map(function ($row) {
            $cells = array_map(fn ($cell) => sprintf('<td>%s</td>', e((string) $cell)), $row);
            return '<tr>' . implode('', $cells) . '</tr>';
        })->implode('');

        return '<table><thead><tr>' . implode('', $headers) . '</tr></thead><tbody>' . $rows . '</tbody></table>';
    }

    private function pageSize(string $layout): string
    {
        return $layout === 'A4_landscape' ? 'A4 landscape' : 'A4 portrait';
    }

    /**
     * Process letterhead file and convert to HTML.
     */
    public function processLetterheadFile(Letterhead $letterhead): string
    {
        if (!$letterhead->file_path || !Storage::exists($letterhead->file_path)) {
            return '';
        }

        $fileType = $letterhead->file_type ?? 'image';
        $position = $letterhead->position ?? 'header';
        $fileUrl = Storage::url($letterhead->file_path);

        if ($fileType === 'image') {
            // For images, use as header or background
            if ($position === 'background') {
                return sprintf(
                    '<div class="letterhead-background" style="position: absolute; top: 0; left: 0; width: 100%%; height: 100%%; background-image: url(%s); background-size: contain; background-repeat: no-repeat; background-position: top center; opacity: 0.1; z-index: -1;"></div>',
                    e($fileUrl)
                );
            } elseif ($position === 'watermark') {
                return sprintf(
                    '<div class="letterhead-watermark" style="position: fixed; top: 50%%; left: 50%%; transform: translate(-50%%, -50%%); opacity: 0.1; z-index: -1;"><img src="%s" alt="%s" style="max-width: 80%%; max-height: 80%%;" /></div>',
                    e($fileUrl),
                    e($letterhead->name)
                );
            } else {
                // Default: header
                return sprintf(
                    '<div class="letterhead-header" style="margin-bottom: 20px; text-align: center;"><img src="%s" alt="%s" style="max-width: 100%%; height: auto;" /></div>',
                    e($fileUrl),
                    e($letterhead->name)
                );
            }
        } elseif ($fileType === 'pdf') {
            // For PDFs, we can embed or use as background
            // Note: PDF embedding in HTML is limited, might need conversion to image
            if ($position === 'background') {
                return sprintf(
                    '<div class="letterhead-pdf-background" style="position: absolute; top: 0; left: 0; width: 100%%; height: 100%%; background: url(%s) no-repeat center top; background-size: contain; opacity: 0.1; z-index: -1;"></div>',
                    e($fileUrl)
                );
            } else {
                // For header, we'd ideally convert PDF first page to image
                // For now, provide a link or placeholder
                return sprintf(
                    '<div class="letterhead-pdf-header" style="margin-bottom: 20px; text-align: center;"><object data="%s" type="application/pdf" width="100%%" height="200px" style="border: none;"><p>Letterhead PDF: <a href="%s">%s</a></p></object></div>',
                    e($fileUrl),
                    e($fileUrl),
                    e($letterhead->name)
                );
            }
        }

        return '';
    }

    /**
     * Replace template variables in HTML content.
     */
    public function replaceTemplateVariables(string $html, array $variables): string
    {
        foreach ($variables as $key => $value) {
            // Replace {{variable}} and {{ variable }} patterns
            $html = str_replace("{{$key}}", $value, $html);
            $html = str_replace("{{ {$key} }}", $value, $html);
            $html = str_replace("{{ {$key}}}", $value, $html);
            $html = str_replace("{{{$key} }}", $value, $html);
        }

        return $html;
    }

    /**
     * Render document with letterhead.
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

        return $this->render($bodyHtml, array_merge($options, [
            'letterhead_html' => $letterheadHtml,
        ]));
    }
}
