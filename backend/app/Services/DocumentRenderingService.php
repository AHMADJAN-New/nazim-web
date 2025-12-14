<?php

namespace App\Services;

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
}
