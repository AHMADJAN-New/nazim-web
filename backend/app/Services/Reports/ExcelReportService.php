<?php

namespace App\Services\Reports;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Color;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;

/**
 * Excel report generation service using PhpSpreadsheet
 */
class ExcelReportService
{
    /**
     * Generate Excel report
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
        $this->reportProgress($progressCallback, 0, 'Starting Excel generation');

        // Create spreadsheet
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Set sheet title
        $sheetTitle = substr($config->title ?: 'Report', 0, 31); // Excel limit is 31 chars
        $sheet->setTitle($sheetTitle);

        $this->reportProgress($progressCallback, 10, 'Spreadsheet created');

        // Set RTL if needed
        if ($context['rtl'] ?? true) {
            $sheet->setRightToLeft(true);
        }

        $currentRow = 1;

        // Add header section with logos
        $currentRow = $this->addHeaderSection($sheet, $context, $currentRow);
        $this->reportProgress($progressCallback, 30, 'Header section added');

        // Add title
        $currentRow = $this->addTitleSection($sheet, $context, $currentRow);
        $this->reportProgress($progressCallback, 40, 'Title section added');

        // Add notes header
        $currentRow = $this->addNotesSection($sheet, $context['NOTES_HEADER'] ?? [], $currentRow);

        // Add table
        $currentRow = $this->addTableSection($sheet, $context, $currentRow);
        $this->reportProgress($progressCallback, 70, 'Table section added');

        // Add notes body
        $currentRow = $this->addNotesSection($sheet, $context['NOTES_BODY'] ?? [], $currentRow);

        // Add footer section
        $currentRow = $this->addFooterSection($sheet, $context, $currentRow);
        $this->reportProgress($progressCallback, 80, 'Footer section added');

        // Add notes footer
        $this->addNotesSection($sheet, $context['NOTES_FOOTER'] ?? [], $currentRow);

        // Apply page settings
        $this->applyPageSettings($sheet, $context);
        $this->reportProgress($progressCallback, 90, 'Page settings applied');

        // Save to file
        $result = $this->saveToFile($spreadsheet, $config);
        $this->reportProgress($progressCallback, 100, 'Excel file saved');

        return $result;
    }

    /**
     * Add header section with logos and school name
     */
    private function addHeaderSection($sheet, array $context, int $startRow): int
    {
        $columns = $context['COLUMNS'] ?? [];
        $colCount = count($columns) + 1; // +1 for row number column
        $lastCol = $this->getColumnLetter($colCount);

        // Merge cells for header
        $sheet->mergeCells("A{$startRow}:{$lastCol}{$startRow}");

        // Add school name
        $schoolName = $context['SCHOOL_NAME_PASHTO'] ?: $context['SCHOOL_NAME'] ?? '';
        $cell = $sheet->getCell("A{$startRow}");
        $cell->setValue($schoolName);

        // Style school name
        $primaryColor = $this->colorToArgb($context['PRIMARY_COLOR'] ?? '#0b0b56');
        $sheet->getStyle("A{$startRow}")->applyFromArray([
            'font' => [
                'bold' => true,
                'size' => 16,
                'color' => ['argb' => $primaryColor],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
        ]);

        // Set row height for header
        $sheet->getRowDimension($startRow)->setRowHeight(40);

        // Add logos if available
        $this->addLogo($sheet, $context, 'PRIMARY_LOGO_URI', 'A', $startRow, 'show_primary_logo');
        $this->addLogo($sheet, $context, 'SECONDARY_LOGO_URI', $lastCol, $startRow, 'show_secondary_logo');

        return $startRow + 2; // Return next row after gap
    }

    /**
     * Add logo to sheet
     */
    private function addLogo($sheet, array $context, string $uriKey, string $col, int $row, string $showKey): void
    {
        if (empty($context[$showKey]) || empty($context[$uriKey])) {
            return;
        }

        $dataUri = $context[$uriKey];

        // Parse data URI
        if (!preg_match('/^data:([^;]+);base64,(.+)$/', $dataUri, $matches)) {
            return;
        }

        $mimeType = $matches[1];
        $base64Data = $matches[2];
        $imageData = base64_decode($base64Data);

        // Create temporary file
        $extension = match ($mimeType) {
            'image/png' => 'png',
            'image/jpeg', 'image/jpg' => 'jpg',
            'image/gif' => 'gif',
            default => 'png',
        };

        $tempPath = tempnam(sys_get_temp_dir(), 'logo_') . ".{$extension}";
        file_put_contents($tempPath, $imageData);

        try {
            $drawing = new Drawing();
            $drawing->setName('Logo');
            $drawing->setPath($tempPath);
            $drawing->setCoordinates("{$col}{$row}");
            $drawing->setHeight(50);
            $drawing->setWorksheet($sheet);
        } catch (\Exception $e) {
            \Log::warning("Failed to add logo: " . $e->getMessage());
        } finally {
            // Clean up temp file
            if (file_exists($tempPath)) {
                unlink($tempPath);
            }
        }
    }

    /**
     * Add title section
     */
    private function addTitleSection($sheet, array $context, int $startRow): int
    {
        $columns = $context['COLUMNS'] ?? [];
        $colCount = count($columns) + 1;
        $lastCol = $this->getColumnLetter($colCount);

        // Merge cells for title
        $sheet->mergeCells("A{$startRow}:{$lastCol}{$startRow}");

        // Add title
        $title = $context['TABLE_TITLE'] ?? '';
        $cell = $sheet->getCell("A{$startRow}");
        $cell->setValue($title);

        // Style title
        $secondaryColor = $this->colorToArgb($context['SECONDARY_COLOR'] ?? '#0056b3');
        $sheet->getStyle("A{$startRow}")->applyFromArray([
            'font' => [
                'bold' => true,
                'size' => 14,
                'color' => ['argb' => $secondaryColor],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
        ]);

        $sheet->getRowDimension($startRow)->setRowHeight(25);

        return $startRow + 2; // Return next row after gap
    }

    /**
     * Add notes section
     */
    private function addNotesSection($sheet, array $notes, int $startRow): int
    {
        if (empty($notes)) {
            return $startRow;
        }

        foreach ($notes as $note) {
            $noteText = $note['note_text'] ?? '';
            if (empty($noteText)) {
                continue;
            }

            $sheet->getCell("A{$startRow}")->setValue($noteText);
            $sheet->getStyle("A{$startRow}")->applyFromArray([
                'font' => [
                    'italic' => true,
                    'size' => 10,
                    'color' => ['argb' => 'FF666666'],
                ],
            ]);

            $startRow++;
        }

        return $startRow + 1; // Gap after notes
    }

    /**
     * Add table section with headers and data
     */
    private function addTableSection($sheet, array $context, int $startRow): int
    {
        $columns = $context['COLUMNS'] ?? [];
        $rows = $context['ROWS'] ?? [];
        $primaryColor = $this->colorToArgb($context['PRIMARY_COLOR'] ?? '#0b0b56');
        $secondaryColor = $this->colorToArgb($context['SECONDARY_COLOR'] ?? '#0056b3');
        $useAlternating = $context['table_alternating_colors'] ?? true;

        // Add row number header
        $headerRow = $startRow;
        $sheet->getCell("A{$headerRow}")->setValue('#');

        // Add column headers
        $colIndex = 2; // Start from B (A is for row numbers)
        foreach ($columns as $column) {
            $colLetter = $this->getColumnLetter($colIndex);
            $headerText = is_array($column) ? ($column['label'] ?? $column['key'] ?? '') : $column;
            $sheet->getCell("{$colLetter}{$headerRow}")->setValue($headerText);
            $colIndex++;
        }

        // Style header row
        $lastCol = $this->getColumnLetter($colIndex - 1);
        $sheet->getStyle("A{$headerRow}:{$lastCol}{$headerRow}")->applyFromArray([
            'font' => [
                'bold' => true,
                'color' => ['argb' => 'FFFFFFFF'],
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['argb' => $secondaryColor],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['argb' => 'FF333333'],
                ],
            ],
        ]);

        $sheet->getRowDimension($headerRow)->setRowHeight(25);

        // Add data rows
        $currentRow = $headerRow + 1;
        $rowNumber = 1;

        foreach ($rows as $row) {
            // Row number
            $sheet->getCell("A{$currentRow}")->setValue($rowNumber);

            // Data cells
            $colIndex = 2;
            foreach ($columns as $column) {
                $colLetter = $this->getColumnLetter($colIndex);
                $key = is_array($column) ? ($column['key'] ?? $colIndex - 2) : $colIndex - 2;

                $value = '';
                if (is_array($row)) {
                    $value = $row[$key] ?? (isset($row[$colIndex - 2]) ? $row[$colIndex - 2] : '');
                }

                $sheet->getCell("{$colLetter}{$currentRow}")->setValue($value);
                $colIndex++;
            }

            // Style data row
            $rowStyle = [
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_CENTER,
                    'vertical' => Alignment::VERTICAL_CENTER,
                ],
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => Border::BORDER_THIN,
                        'color' => ['argb' => 'FF666666'],
                    ],
                ],
            ];

            // Alternating row colors
            if ($useAlternating && $rowNumber % 2 === 0) {
                $rowStyle['fill'] = [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['argb' => 'FFF4F4F4'],
                ];
            }

            $sheet->getStyle("A{$currentRow}:{$lastCol}{$currentRow}")->applyFromArray($rowStyle);

            $currentRow++;
            $rowNumber++;
        }

        // Auto-size columns
        for ($i = 1; $i <= $colIndex - 1; $i++) {
            $colLetter = $this->getColumnLetter($i);
            $sheet->getColumnDimension($colLetter)->setAutoSize(true);
        }

        return $currentRow + 1; // Return next row after gap
    }

    /**
     * Add footer section
     */
    private function addFooterSection($sheet, array $context, int $startRow): int
    {
        $columns = $context['COLUMNS'] ?? [];
        $colCount = count($columns) + 1;
        $lastCol = $this->getColumnLetter($colCount);

        // System note
        $sheet->mergeCells("A{$startRow}:{$lastCol}{$startRow}");
        $sheet->getCell("A{$startRow}")->setValue('دا راپور د ناظم سیستم په مټ جوړ شوی دی.');
        $sheet->getStyle("A{$startRow}")->applyFromArray([
            'font' => [
                'size' => 9,
                'color' => ['argb' => 'FF666666'],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
            ],
        ]);

        $startRow++;

        // Contact info
        $contactParts = [];
        if (!empty($context['SCHOOL_PHONE'])) {
            $contactParts[] = $context['SCHOOL_PHONE'];
        }
        if (!empty($context['SCHOOL_EMAIL'])) {
            $contactParts[] = $context['SCHOOL_EMAIL'];
        }
        if (!empty($context['SCHOOL_WEBSITE'])) {
            $contactParts[] = $context['SCHOOL_WEBSITE'];
        }

        if (!empty($contactParts)) {
            $sheet->mergeCells("A{$startRow}:{$lastCol}{$startRow}");
            $sheet->getCell("A{$startRow}")->setValue(implode(' | ', $contactParts));
            $sheet->getStyle("A{$startRow}")->applyFromArray([
                'font' => [
                    'size' => 9,
                    'color' => ['argb' => 'FF666666'],
                ],
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_CENTER,
                ],
            ]);
            $startRow++;
        }

        // Generation date
        if ($context['show_generation_date'] ?? true) {
            $sheet->mergeCells("A{$startRow}:{$lastCol}{$startRow}");
            $sheet->getCell("A{$startRow}")->setValue($context['CURRENT_DATETIME'] ?? now()->format('Y-m-d H:i'));
            $sheet->getStyle("A{$startRow}")->applyFromArray([
                'font' => [
                    'size' => 9,
                    'color' => ['argb' => 'FF999999'],
                ],
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_CENTER,
                ],
            ]);
            $startRow++;
        }

        return $startRow;
    }

    /**
     * Apply page settings
     */
    private function applyPageSettings($sheet, array $context): void
    {
        $pageSetup = $sheet->getPageSetup();

        // Page size
        $pageSize = strtoupper($context['page_size'] ?? 'A4');
        $pageSetup->setPaperSize(match ($pageSize) {
            'A3' => PageSetup::PAPERSIZE_A3,
            'LETTER' => PageSetup::PAPERSIZE_LETTER,
            default => PageSetup::PAPERSIZE_A4,
        });

        // Orientation
        $orientation = strtolower($context['orientation'] ?? 'portrait');
        $pageSetup->setOrientation(match ($orientation) {
            'landscape' => PageSetup::ORIENTATION_LANDSCAPE,
            default => PageSetup::ORIENTATION_PORTRAIT,
        });

        // Margins (in inches)
        $sheet->getPageMargins()
            ->setTop(0.5)
            ->setRight(0.5)
            ->setBottom(0.5)
            ->setLeft(0.5)
            ->setHeader(0.3)
            ->setFooter(0.3);

        // Fit to page
        $pageSetup->setFitToPage(true);
        $pageSetup->setFitToWidth(1);
        $pageSetup->setFitToHeight(0);
    }

    /**
     * Save spreadsheet to file
     */
    private function saveToFile(Spreadsheet $spreadsheet, ReportConfig $config): array
    {
        // Create directory if needed
        $tempDir = storage_path('app/reports');
        if (!is_dir($tempDir)) {
            mkdir($tempDir, 0755, true);
        }

        // Generate unique filename
        $filename = $this->generateFilename($config);
        $relativePath = "reports/{$filename}";
        $absolutePath = storage_path("app/{$relativePath}");

        // Save file
        $writer = new Xlsx($spreadsheet);
        $writer->save($absolutePath);

        // Get file size
        $fileSize = filesize($absolutePath);

        return [
            'path' => $relativePath,
            'filename' => $filename,
            'size' => $fileSize,
        ];
    }

    /**
     * Generate filename for the Excel file
     */
    private function generateFilename(ReportConfig $config): string
    {
        $baseName = $config->title ?: $config->reportKey;
        $safeName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $baseName);
        $timestamp = now()->format('Y-m-d_His');
        $uuid = Str::uuid()->toString();

        return "{$safeName}_{$timestamp}_{$uuid}.xlsx";
    }

    /**
     * Get column letter from index (1-based)
     */
    private function getColumnLetter(int $index): string
    {
        $letter = '';
        while ($index > 0) {
            $index--;
            $letter = chr(65 + ($index % 26)) . $letter;
            $index = (int) ($index / 26);
        }
        return $letter;
    }

    /**
     * Convert hex color to ARGB
     */
    private function colorToArgb(string $hex): string
    {
        $hex = ltrim($hex, '#');
        return 'FF' . strtoupper($hex);
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
