<?php

namespace App\Services\Reports;

use App\Services\Storage\FileStorageService;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Color;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;
use PhpOffice\PhpSpreadsheet\Worksheet\HeaderFooter;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

/**
 * Excel report generation service using PhpSpreadsheet
 *
 * NOTE: Excel Limitations (compared to PDF):
 * - Custom HTML (header_html, footer_html): Not supported - Excel doesn't render HTML
 * - Watermark opacity/rotation: Limited - Excel doesn't support true overlays like PDF
 * - Watermark positioning: Limited - Uses Drawing objects which appear on top of content
 *
 * Features that match PDF:
 * - Logo positioning (left/right based on context settings)
 * - Header text (above/below school name)
 * - Footer structure (text, contact info, address, date, system note)
 * - Notes (header, body, footer)
 * - Branding colors and fonts
 * - Configurable margins
 * - Page settings (size, orientation)
 */
class ExcelReportService
{
    /**
     * Track temporary image files that need to be cleaned up after spreadsheet is saved
     *
     * @var array<string>
     */
    private array $tempImageFiles = [];

    /**
     * PhpSpreadsheet cannot bind arrays/objects to a cell; convert to a safe scalar.
     */
    private function normalizeSpreadsheetValue(mixed $value): string|int|float|bool
    {
        // Match PDF behavior for empty cells
        if ($value === null || $value === '') {
            return '—';
        }

        // Preserve numeric/bool types where possible (Excel treats them correctly)
        if (is_int($value) || is_float($value) || is_bool($value)) {
            return $value;
        }

        // Date objects -> string
        if ($value instanceof \DateTimeInterface) {
            return $value->format('Y-m-d H:i');
        }

        // Arrays/objects -> JSON string (RTL-safe, readable, no escaping noise)
        if (is_array($value) || is_object($value)) {
            return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '—';
        }

        // Fallback: stringify
        return (string) $value;
    }

    public function __construct(
        private FileStorageService $fileStorageService
    ) {}

    private function sanitizeSheetTitle(string $name): string
    {
        // Excel sheet name rules: no : \ / ? * [ ] and max length 31
        $clean = preg_replace('/[:\\\\\\/\\?\\*\\[\\]]/u', ' ', $name) ?? 'Sheet';
        $clean = trim($clean);
        if ($clean === '') {
            $clean = 'Sheet';
        }

        return mb_substr($clean, 0, 31, 'UTF-8');
    }

    /**
     * Generate Excel report
     *
     * @param  ReportConfig  $config  Report configuration
     * @param  array  $context  Template context
     * @param  callable|null  $progressCallback  Progress callback
     * @param  string  $organizationId  Organization ID for file storage (REQUIRED)
     * @param  string  $schoolId  School ID for file storage (REQUIRED)
     * @return array Result with path, filename, and size
     */
    public function generate(
        ReportConfig $config,
        array $context,
        ?callable $progressCallback,
        string $organizationId,
        string $schoolId
    ): array {
        // Reset temp image files tracking for this generation
        $this->tempImageFiles = [];

        $this->reportProgress($progressCallback, 0, 'Starting Excel generation');

        // Multi-sheet support via parameters.sheets
        // This enables exports like: "each class in a separate sheet" while still using the central reporting system.
        $sheets = $context['parameters']['sheets'] ?? null;
        if (is_array($sheets) && count($sheets) > 0) {
            $this->reportProgress($progressCallback, 5, 'Preparing multi-sheet workbook');

            $spreadsheet = new Spreadsheet;

            foreach (array_values($sheets) as $sheetIndex => $sheetSpec) {
                $sheet = $sheetIndex === 0 ? $spreadsheet->getActiveSheet() : $spreadsheet->createSheet();

                $sheetNameRaw = is_array($sheetSpec) ? ($sheetSpec['sheet_name'] ?? ($sheetSpec['title'] ?? 'Sheet '.($sheetIndex + 1))) : ('Sheet '.($sheetIndex + 1));
                $sheetTitle = $this->sanitizeSheetTitle((string) $sheetNameRaw);
                $sheet->setTitle($sheetTitle);

                // Sheet-specific context overrides
                $sheetContext = $context;
                if (is_array($sheetSpec)) {
                    if (isset($sheetSpec['columns']) && is_array($sheetSpec['columns'])) {
                        $sheetContext['COLUMNS'] = $sheetSpec['columns'];
                    }
                    if (isset($sheetSpec['rows']) && is_array($sheetSpec['rows'])) {
                        $sheetContext['ROWS'] = $sheetSpec['rows'];
                    }
                    if (isset($sheetSpec['title']) && is_string($sheetSpec['title'])) {
                        $sheetContext['TABLE_TITLE'] = $sheetSpec['title'];
                    }
                }

                // Set RTL if needed
                if ($sheetContext['rtl'] ?? true) {
                    $sheet->setRightToLeft(true);
                }

                $currentRow = 1;

                // Header / Title / Notes / Table / Footer per sheet
                $currentRow = $this->addHeaderSection($sheet, $sheetContext, $currentRow);
                $currentRow = $this->addTitleSection($sheet, $sheetContext, $currentRow);
                $currentRow = $this->addNotesSection($sheet, $sheetContext['NOTES_HEADER'] ?? [], $currentRow);
                $currentRow = $this->addTableSection($sheet, $sheetContext, $currentRow);
                $currentRow = $this->addNotesSection($sheet, $sheetContext['NOTES_BODY'] ?? [], $currentRow);
                $currentRow = $this->addFooterSection($sheet, $sheetContext, $currentRow);
                $this->addNotesSection($sheet, $sheetContext['NOTES_FOOTER'] ?? [], $currentRow);

                $this->applyPageSettings($sheet, $sheetContext);

                // Watermark (after content)
                $columns = $sheetContext['COLUMNS'] ?? [];
                $colCount = count($columns) + 1; // +1 for row number column
                $this->addWatermark($sheet, $sheetContext, $currentRow, $colCount);

                // Progress update per sheet
                $pct = 10 + (int) floor((($sheetIndex + 1) / max(1, count($sheets))) * 80);
                $this->reportProgress($progressCallback, min(90, $pct), 'Built sheet '.($sheetIndex + 1).' of '.count($sheets));
            }

            $result = $this->saveToFile($spreadsheet, $config, $organizationId, $schoolId);
            $this->reportProgress($progressCallback, 100, 'Excel file saved');

            return $result;
        }

        // Create spreadsheet
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();

        // Set sheet title
        $sheetTitle = $this->sanitizeSheetTitle($config->title ?: 'Report');
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

        // Add watermark after all content (so we know dimensions)
        // Note: In Excel, watermarks added later appear on top, but we position them to simulate background
        $columns = $context['COLUMNS'] ?? [];
        $colCount = count($columns) + 1; // +1 for row number column
        $this->addWatermark($sheet, $context, $currentRow, $colCount);
        $this->reportProgress($progressCallback, 95, 'Watermark added');

        // Save to file
        $result = $this->saveToFile($spreadsheet, $config, $organizationId, $schoolId);
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

        // Get logo positions from context (defaults: primary=left, secondary=right, ministry=right)
        $primaryLogoPos = $context['primary_logo_position'] ?? 'left';
        $secondaryLogoPos = $context['secondary_logo_position'] ?? 'right';
        $ministryLogoPos = $context['ministry_logo_position'] ?? 'right';

        // Add logos based on their position settings
        // Primary logo
        if (! empty($context['show_primary_logo']) && ! empty($context['PRIMARY_LOGO_URI'])) {
            $primaryCol = ($primaryLogoPos === 'right') ? $lastCol : 'A';
            $this->addLogo($sheet, $context, 'PRIMARY_LOGO_URI', $primaryCol, $startRow, 'show_primary_logo');
        }

        // Secondary logo
        if (! empty($context['show_secondary_logo']) && ! empty($context['SECONDARY_LOGO_URI'])) {
            $secondaryCol = ($secondaryLogoPos === 'left') ? 'A' : $lastCol;
            $this->addLogo($sheet, $context, 'SECONDARY_LOGO_URI', $secondaryCol, $startRow, 'show_secondary_logo');
        }

        // Ministry logo
        if (! empty($context['show_ministry_logo']) && ! empty($context['MINISTRY_LOGO_URI'])) {
            $ministryCol = ($ministryLogoPos === 'left') ? 'A' : $lastCol;
            $this->addLogo($sheet, $context, 'MINISTRY_LOGO_URI', $ministryCol, $startRow, 'show_ministry_logo');
        }

        // Add header text above school name if configured
        $headerText = $context['header_text'] ?? null;
        $headerTextPos = $context['header_text_position'] ?? 'below_school_name';

        if (! empty($headerText) && $headerTextPos === 'above_school_name') {
            $sheet->mergeCells("A{$startRow}:{$lastCol}{$startRow}");
            $sheet->getCell("A{$startRow}")->setValue($headerText);
            $sheet->getStyle("A{$startRow}")->applyFromArray([
                'font' => [
                    'size' => 12,
                    'color' => ['argb' => 'FF666666'],
                ],
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_CENTER,
                    'vertical' => Alignment::VERTICAL_CENTER,
                ],
            ]);
            $startRow++;
        }

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

        // Add header text below school name if configured
        if (! empty($headerText) && $headerTextPos === 'below_school_name') {
            $nextRow = $startRow + 1;
            $sheet->mergeCells("A{$nextRow}:{$lastCol}{$nextRow}");
            $sheet->getCell("A{$nextRow}")->setValue($headerText);
            $sheet->getStyle("A{$nextRow}")->applyFromArray([
                'font' => [
                    'size' => 12,
                    'color' => ['argb' => 'FF666666'],
                ],
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_CENTER,
                    'vertical' => Alignment::VERTICAL_CENTER,
                ],
            ]);
        }

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
        if (! preg_match('/^data:([^;]+);base64,(.+)$/', $dataUri, $matches)) {
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

        $tempPath = tempnam(sys_get_temp_dir(), 'logo_').".{$extension}";
        file_put_contents($tempPath, $imageData);

        // Track temp file for cleanup after spreadsheet is saved
        $this->tempImageFiles[] = $tempPath;

        try {
            $drawing = new Drawing;
            $drawing->setName('Logo');
            $drawing->setPath($tempPath);
            $drawing->setCoordinates("{$col}{$row}");
            $drawing->setHeight(50);
            $drawing->setWorksheet($sheet);
        } catch (\Exception $e) {
            \Log::warning('Failed to add logo: '.$e->getMessage());
            // Remove from tracking if failed to add
            $this->tempImageFiles = array_filter($this->tempImageFiles, fn ($path) => $path !== $tempPath);
            // Clean up immediately if failed
            if (file_exists($tempPath)) {
                @unlink($tempPath);
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
        $fontSize = $this->parseFontSize($context['FONT_SIZE'] ?? '12px');
        $sheet->getStyle("A{$headerRow}:{$lastCol}{$headerRow}")->applyFromArray([
            'font' => [
                'bold' => true,
                'size' => $fontSize,
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

        // Parse font size once (used for all rows)
        $fontSize = $this->parseFontSize($context['FONT_SIZE'] ?? '12px');

        // Handle empty table (matches PDF behavior)
        if (empty($rows)) {
            $currentRow = $headerRow + 1;
            $sheet->mergeCells("A{$currentRow}:{$lastCol}{$currentRow}");
            $sheet->getCell("A{$currentRow}")->setValue('هیڅ معلومات ونه موندل شول.');
            $sheet->getStyle("A{$currentRow}")->applyFromArray([
                'font' => [
                    'size' => $fontSize,
                    'color' => ['argb' => 'FF666666'],
                ],
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_CENTER,
                    'vertical' => Alignment::VERTICAL_CENTER,
                ],
            ]);
            $sheet->getRowDimension($currentRow)->setRowHeight(30);

            return $currentRow + 1;
        }

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

                // Normalize to spreadsheet-safe scalar; PhpSpreadsheet cannot bind arrays/objects.
                $value = $this->normalizeSpreadsheetValue($value);

                $sheet->getCell("{$colLetter}{$currentRow}")->setValue($value);
                $colIndex++;
            }

            // Style data row
            $rowStyle = [
                'font' => [
                    'size' => $fontSize,
                ],
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

        // Add totals row if applicable (for reports with numeric data)
        $parameters = $context['parameters'] ?? [];
        $showTotals = $parameters['show_totals'] ?? false;
        $totalCount = $parameters['total_count'] ?? count($rows);
        $totalsRowData = $parameters['totals_row'] ?? null; // Pre-calculated totals row data

        if ($showTotals && ! empty($rows)) {
            $totalsRow = $currentRow;

            // Row number column - show "Total" or count
            $language = $context['language'] ?? 'en';
            $totalLabel = match ($language) {
                'ps' => 'مجموعه',
                'fa' => 'مجموع',
                'ar' => 'المجموع',
                default => 'Total',
            };
            $sheet->getCell("A{$totalsRow}")->setValue($totalLabel);

            // Add totals for numeric columns
            $colIndex = 2;
            foreach ($columns as $column) {
                $colLetter = $this->getColumnLetter($colIndex);
                $key = is_array($column) ? ($column['key'] ?? $colIndex - 2) : $colIndex - 2;

                $value = '';

                // If pre-calculated totals row data is provided, use it
                if ($totalsRowData && is_array($totalsRowData) && isset($totalsRowData[$key])) {
                    $value = $totalsRowData[$key];
                } else {
                    // Otherwise, calculate automatically
                    // Check if this column should have totals (numeric columns)
                    $columnType = is_array($column) ? ($column['type'] ?? 'text') : 'text';

                    if ($columnType === 'numeric' || in_array($key, ['age', 'salary', 'count', 'total', 'present', 'absent', 'late', 'excused', 'sick', 'leave', 'total_records', 'total_sessions', 'attendance_rate'])) {
                        // Sum numeric values
                        $sum = 0;
                        foreach ($rows as $row) {
                            $cellValue = is_array($row) ? ($row[$key] ?? 0) : 0;
                            if (is_numeric($cellValue)) {
                                $sum += (float) $cellValue;
                            }
                        }
                        $value = $sum > 0 ? $sum : '';
                    } elseif ($colIndex === 2) {
                        // First data column - show total count
                        $value = $totalCount;
                    }
                }

                // Totals row can also contain arrays if caller passes computed structures
                $sheet->getCell("{$colLetter}{$totalsRow}")->setValue($this->normalizeSpreadsheetValue($value));
                $colIndex++;
            }

            // Style totals row
            $sheet->getStyle("A{$totalsRow}:{$lastCol}{$totalsRow}")->applyFromArray([
                'font' => [
                    'bold' => true,
                    'size' => $fontSize,
                    'color' => ['argb' => 'FFFFFFFF'],
                ],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['argb' => $primaryColor],
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

            $sheet->getRowDimension($totalsRow)->setRowHeight(25);
            $currentRow = $totalsRow + 1;
        }

        // Set column widths - use COL_WIDTHS from context if available, otherwise auto-size based on content
        $colWidths = $context['COL_WIDTHS'] ?? [];

        for ($i = 1; $i <= $colIndex - 1; $i++) {
            $colLetter = $this->getColumnLetter($i);

            // Use COL_WIDTHS if provided (widths are percentages, convert to Excel column width)
            if (isset($colWidths[$i - 1])) {
                // COL_WIDTHS are percentages, convert to approximate Excel column width
                // Excel column width is in character units (default is ~8.43 for standard font)
                // For percentage widths, we'll use a base width and scale
                $baseWidth = 12; // Base width in Excel units
                $percentage = $colWidths[$i - 1] / 100.0;
                $excelWidth = max(8, min(50, $baseWidth * $percentage * 2)); // Scale and limit
                $sheet->getColumnDimension($colLetter)->setWidth($excelWidth);
            } else {
                // Disable auto-size first (in case it was set)
                $sheet->getColumnDimension($colLetter)->setAutoSize(false);

                // Calculate width based on actual content
                $calculatedWidth = $this->calculateColumnWidth($sheet, $colLetter, $headerRow, $currentRow - 1);

                if ($calculatedWidth > 0) {
                    // Add padding (3 units) and set explicit width
                    // Minimum 8 units, maximum 50 units to prevent extreme sizes
                    $finalWidth = max(8, min(50, $calculatedWidth + 3));
                    $sheet->getColumnDimension($colLetter)->setWidth($finalWidth);

                    // Log for debugging (only in dev mode)
                    if (config('app.debug')) {
                        $endRow = $currentRow - 1;
                        \Log::debug('Excel column width set', [
                            'column' => $colLetter,
                            'calculated' => $calculatedWidth,
                            'final' => $finalWidth,
                            'rows' => "{$headerRow}-{$endRow}",
                        ]);
                    }
                } else {
                    // Fallback: set a reasonable default width
                    $sheet->getColumnDimension($colLetter)->setWidth(12);
                }
            }
        }

        return $currentRow + 1; // Return next row after gap
    }

    /**
     * Add footer section
     * Matches PDF footer structure: footer text, contact info, address, generation date, system note
     */
    private function addFooterSection($sheet, array $context, int $startRow): int
    {
        $columns = $context['COLUMNS'] ?? [];
        $colCount = count($columns) + 1;
        $lastCol = $this->getColumnLetter($colCount);

        // Footer text (from ReportTemplate)
        if (! empty($context['footer_text'])) {
            $sheet->mergeCells("A{$startRow}:{$lastCol}{$startRow}");
            $sheet->getCell("A{$startRow}")->setValue($context['footer_text']);
            $sheet->getStyle("A{$startRow}")->applyFromArray([
                'font' => [
                    'size' => 10,
                    'color' => ['argb' => 'FF666666'],
                ],
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_CENTER,
                ],
            ]);
            $startRow++;
        }

        // Contact info row (phone, email, website)
        $contactParts = [];
        if (! empty($context['SCHOOL_PHONE'])) {
            $contactParts[] = $context['SCHOOL_PHONE'];
        }
        if (! empty($context['SCHOOL_EMAIL'])) {
            $contactParts[] = $context['SCHOOL_EMAIL'];
        }
        if (! empty($context['SCHOOL_WEBSITE'])) {
            $contactParts[] = $context['SCHOOL_WEBSITE'];
        }

        if (! empty($contactParts)) {
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

        // School address (if available)
        if (! empty($context['SCHOOL_ADDRESS'])) {
            $sheet->mergeCells("A{$startRow}:{$lastCol}{$startRow}");
            $sheet->getCell("A{$startRow}")->setValue($context['SCHOOL_ADDRESS']);
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

        return $startRow;
    }

    /**
     * Add watermark to sheet
     *
     * LIMITATION: Excel doesn't support true overlays like PDF, so we add watermarks as:
     * - Image watermarks: Drawing objects positioned in the sheet (appear on top, not behind)
     * - Text watermarks: Header text (since Excel doesn't support rotated text overlays well)
     *
     * Note: Excel watermarks are limited compared to PDF:
     * - No true opacity support for images
     * - No rotation support for images (requires additional processing)
     * - Objects added later appear on top (users may need to manually send to back in Excel)
     * - Text watermarks use header/footer which doesn't support rotation or opacity
     */
    private function addWatermark($sheet, array $context, int $lastRow, int $colCount): void
    {
        $watermark = $context['WATERMARK'] ?? null;

        if (empty($watermark) || ! ($watermark['is_active'] ?? true)) {
            return;
        }

        // Calculate center position based on actual content
        $lastCol = $this->getColumnLetter($colCount);
        $centerColIndex = (int) ($colCount / 2) + 1;
        $centerCol = $this->getColumnLetter($centerColIndex);
        $centerRow = (int) ($lastRow / 2);

        if ($watermark['wm_type'] === 'image' && ! empty($watermark['image_data_uri'])) {
            // Add image watermark as Drawing object
            $this->addWatermarkImage($sheet, $watermark, $centerCol, $centerRow, $lastCol, $lastRow, $colCount);
        } elseif ($watermark['wm_type'] === 'text' && ! empty($watermark['text'])) {
            // Add text watermark to header (Excel doesn't support rotated text overlays well)
            $this->addWatermarkText($sheet, $watermark);
        }
    }

    /**
     * Add image watermark as Drawing object
     */
    private function addWatermarkImage($sheet, array $watermark, string $centerCol, int $centerRow, string $lastCol, int $lastRow, int $colCount): void
    {
        $dataUri = $watermark['image_data_uri'];

        // Parse data URI
        if (! preg_match('/^data:([^;]+);base64,(.+)$/', $dataUri, $matches)) {
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

        $tempPath = tempnam(sys_get_temp_dir(), 'watermark_').".{$extension}";
        file_put_contents($tempPath, $imageData);

        // Track temp file for cleanup after spreadsheet is saved
        $this->tempImageFiles[] = $tempPath;

        try {
            $drawing = new Drawing;
            $drawing->setName('Watermark');
            $drawing->setPath($tempPath);

            // Position based on watermark position setting
            $position = $watermark['position'] ?? 'center';
            $posX = $watermark['pos_x'] ?? 50.0;
            $posY = $watermark['pos_y'] ?? 50.0;
            $scale = $watermark['scale'] ?? 1.0;

            // Calculate target position
            $centerColIndex = $this->getColumnIndex($centerCol);
            $offsetX = ($posX - 50.0) / 100.0 * $colCount;
            $targetColIndex = max(1, min($colCount, (int) ($centerColIndex + $offsetX)));
            $targetCol = $this->getColumnLetter($targetColIndex);

            $offsetY = ($posY - 50.0) / 100.0 * $lastRow;
            $targetRow = max(1, min($lastRow, (int) ($centerRow + $offsetY)));

            $drawing->setCoordinates("{$targetCol}{$targetRow}");

            // Set size (scale) - adjust based on sheet size
            $baseHeight = min(300, (int) ($lastRow * 15)); // Scale with content, max 300px
            $drawing->setHeight((int) ($baseHeight * $scale));
            $drawing->setWidth((int) ($baseHeight * $scale));

            // Set offset to center the image on the cell
            $drawing->setOffsetX(10);
            $drawing->setOffsetY(10);

            // Note: Excel doesn't support opacity for images directly
            // Rotation is also limited in Excel for images (requires additional processing)
            // We'll apply what we can

            $drawing->setWorksheet($sheet);

            // Note: In Excel, objects added later appear on top
            // For true watermark effect, users may need to manually send to back in Excel
        } catch (\Exception $e) {
            \Log::warning('Failed to add watermark image: '.$e->getMessage());
            // Remove from tracking if failed to add
            $this->tempImageFiles = array_filter($this->tempImageFiles, fn ($path) => $path !== $tempPath);
            // Clean up immediately if failed
            if (file_exists($tempPath)) {
                @unlink($tempPath);
            }
        }
    }

    /**
     * Add text watermark to header
     */
    private function addWatermarkText($sheet, array $watermark): void
    {
        $headerFooter = $sheet->getHeaderFooter();

        $text = $watermark['text'] ?? '';
        $fontFamily = $watermark['font_family'] ?? 'Arial';
        $color = $watermark['color'] ?? '#000000';
        $position = $watermark['position'] ?? 'center';

        // Excel header format codes:
        // &L = Left, &C = Center, &R = Right
        // &"Font,Style" = Font specification
        // &Kcolor = Color (hex without #)
        // &size = Font size

        $colorHex = ltrim($color, '#');
        $headerAlign = match ($position) {
            'top-left', 'bottom-left' => '&L',
            'top-right', 'bottom-right' => '&R',
            default => '&C', // center
        };

        // Build header text
        // Note: Excel header doesn't support opacity or rotation directly
        // We'll use a lighter color to simulate opacity
        $headerText = $headerAlign.'&"'.$fontFamily.',Regular"&K'.$colorHex.
                     '&14'.htmlspecialchars($text, ENT_QUOTES);

        // Use setOddHeader() method from HeaderFooter class
        $headerFooter->setOddHeader($headerText);
    }

    /**
     * Parse margin string into array (same format as PDF)
     *
     * @param  string  $margins  Margin string like "15mm 12mm 18mm 12mm" (top right bottom left)
     * @return array Array with 'top', 'right', 'bottom', 'left' keys (values in mm)
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
     * Parse font size from string (e.g., "12px", "14pt") to numeric value
     *
     * @param  string  $fontSize  Font size string like "12px" or "14pt"
     * @return int Font size as integer
     */
    private function parseFontSize(string $fontSize): int
    {
        // Remove 'px', 'pt', or other units and convert to int
        $numeric = (int) preg_replace('/[^0-9]/', '', $fontSize);

        return max(8, min(72, $numeric)); // Limit between 8 and 72 (Excel limits)
    }

    /**
     * Get column index from letter (1-based)
     */
    private function getColumnIndex(string $letter): int
    {
        $index = 0;
        $letter = strtoupper($letter);
        for ($i = 0; $i < strlen($letter); $i++) {
            $index = $index * 26 + (ord($letter[$i]) - ord('A') + 1);
        }

        return $index;
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

        // Margins (in inches) - parse from context if available, otherwise use defaults
        $margins = $this->parseMargins($context['margins'] ?? '15mm 12mm 18mm 12mm');
        // Convert mm to inches (1 inch = 25.4 mm)
        $topInches = $margins['top'] / 25.4;
        $rightInches = $margins['right'] / 25.4;
        $bottomInches = $margins['bottom'] / 25.4;
        $leftInches = $margins['left'] / 25.4;

        $pageMargins = $sheet->getPageMargins();
        $pageMargins->setTop($topInches);
        $pageMargins->setRight($rightInches);
        $pageMargins->setBottom($bottomInches);
        $pageMargins->setLeft($leftInches);
        // Note: setHeader() and setFooter() don't exist on PageMargins
        // Header/Footer spacing is set via HeaderFooter object if needed

        // Fit to page
        $pageSetup->setFitToPage(true);
        $pageSetup->setFitToWidth(1);
        $pageSetup->setFitToHeight(0);
    }

    /**
     * Save spreadsheet to file
     * CRITICAL: Reports are school-scoped and MUST include both organizationId and schoolId
     */
    private function saveToFile(Spreadsheet $spreadsheet, ReportConfig $config, string $organizationId, string $schoolId): array
    {
        // Generate unique filename
        $filename = $this->generateFilename($config);

        // Create temp file for PhpSpreadsheet (it needs a file path)
        $tempDir = sys_get_temp_dir();
        $tempPath = $tempDir.'/'.$filename;

        try {
            // Save file to temp location
            // NOTE: PhpSpreadsheet needs access to image files during save, so temp image files
            // must still exist at this point (they're cleaned up after save)
            $writer = new Xlsx($spreadsheet);
            $writer->save($tempPath);

            // Get file size
            $fileSize = filesize($tempPath);

            // Read file content
            $fileContent = file_get_contents($tempPath);

            // Store using FileStorageService (school-scoped storage)
            $storagePath = $this->fileStorageService->storeReport(
                $fileContent,
                $filename,
                $organizationId,
                $schoolId,
                $config->reportKey ?? 'general'
            );

            return [
                'path' => $storagePath,
                'filename' => $filename,
                'size' => $fileSize,
            ];
        } finally {
            // Clean up temp Excel file
            if (file_exists($tempPath)) {
                @unlink($tempPath);
            }

            // Clean up all temporary image files (logos, watermarks) after spreadsheet is saved
            foreach ($this->tempImageFiles as $imagePath) {
                if (file_exists($imagePath)) {
                    @unlink($imagePath);
                }
            }
            $this->tempImageFiles = [];
        }
    }

    /**
     * Generate filename for the Excel file
     */
    private function generateFilename(ReportConfig $config): string
    {
        $baseName = $config->title ?: $config->reportKey;
        $safeName = trim(preg_replace('/[^a-zA-Z0-9_-]/', '_', $baseName), '_');
        if ($safeName === '') {
            $safeName = $config->reportKey ?: 'report';
        }
        $timestamp = now()->format('Y-m-d_His');
        $uuid = Str::uuid()->toString();

        return "{$safeName}_{$timestamp}_{$uuid}.xlsx";
    }

    /**
     * Calculate column width based on content
     *
     * @param  \PhpOffice\PhpSpreadsheet\Worksheet\Worksheet  $sheet
     * @param  string  $colLetter  Column letter (e.g., 'A', 'B')
     * @param  int  $startRow  Starting row number
     * @param  int  $endRow  Ending row number
     * @return float Calculated width in Excel units
     */
    private function calculateColumnWidth($sheet, string $colLetter, int $startRow, int $endRow): float
    {
        $maxWidth = 0;

        // Get default font size from header row
        $headerFontSize = $sheet->getStyle("{$colLetter}{$startRow}")->getFont()->getSize();
        $defaultFontSize = is_numeric($headerFontSize) ? (float) $headerFontSize : 11.0;

        // Check all cells in this column
        for ($row = $startRow; $row <= $endRow; $row++) {
            $cell = $sheet->getCell("{$colLetter}{$row}");
            $value = $cell->getValue();

            if ($value !== null && $value !== '') {
                // Convert value to string
                $text = (string) $value;

                // Get actual cell font size
                $cellFontSize = $sheet->getStyle("{$colLetter}{$row}")->getFont()->getSize();
                $fontSize = is_numeric($cellFontSize) ? (float) $cellFontSize : $defaultFontSize;

                // Calculate width based on character count and font size
                // Excel column width formula: width = (character_count * font_size_factor) + padding
                // For standard fonts: 1 character ≈ 1 unit at 11pt font
                $charCount = mb_strlen($text, 'UTF-8');

                // Base width calculation: Excel uses character units
                // Standard: 1 char = 1 unit at 11pt font
                $baseCharWidth = 1.0;

                // Adjust for font size (Excel scales proportionally)
                $fontSizeFactor = $fontSize / 11.0;

                // Check for RTL characters (Arabic/Persian/Pashto) - these are wider
                $hasRTL = preg_match('/[\x{0600}-\x{06FF}\x{0750}-\x{077F}\x{08A0}-\x{08FF}\x{FB50}-\x{FDFF}\x{FE70}-\x{FEFF}]/u', $text);
                $rtlFactor = $hasRTL ? 1.5 : 1.0; // RTL characters are ~50% wider

                // Calculate width: characters * font_size_factor * rtl_factor
                $width = $charCount * $baseCharWidth * $fontSizeFactor * $rtlFactor;

                $maxWidth = max($maxWidth, $width);
            }
        }

        return $maxWidth;
    }

    /**
     * Get column letter from index (1-based)
     */
    private function getColumnLetter(int $index): string
    {
        $letter = '';
        while ($index > 0) {
            $index--;
            $letter = chr(65 + ($index % 26)).$letter;
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

        return 'FF'.strtoupper($hex);
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
