<?php

namespace App\Services\Imports;

use App\Models\ClassAcademicYear;
use App\Models\Room;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class SubjectImportXlsxService
{
    public const TEMPLATE_VERSION = 1;

    public const META_SHEET_NAME = '_meta';

    /** @var string[] */
    private const REQUIRED_FIELDS = ['name', 'code'];

    /** @var array<string, array{label:string, required?:bool}> */
    private const FIELD_DEFS = [
        'name' => ['label' => 'Subject Name', 'required' => true],
        'code' => ['label' => 'Subject Code', 'required' => true],
        'description' => ['label' => 'Description'],
        'is_active' => ['label' => 'Is Active (true/false)'],
        'is_required' => ['label' => 'Is Required (true/false)'],
        'credits' => ['label' => 'Credits'],
        'hours_per_week' => ['label' => 'Hours Per Week (0-40)'],
        'notes' => ['label' => 'Notes'],
    ];

    public function getAvailableFields(): array
    {
        return array_keys(self::FIELD_DEFS);
    }

    /**
     * @param array{
     *   subject_fields?: string[],
     *   academic_year_id: string,
     *   class_academic_year_ids: string[],
     *   class_defaults?: array<int, array{
     *     class_academic_year_id: string,
     *     room_id?: string|null,
     *     is_required?: bool|null,
     *     hours_per_week?: int|null,
     *     credits?: int|null
     *   }>
     * } $spec
     * @return array{filename:string, content:string, mime:string}
     */
    public function generateTemplate(array $spec, string $organizationId, string $schoolId): array
    {
        $subjectFields = $this->normalizeFields(
            $spec['subject_fields'] ?? array_keys(self::FIELD_DEFS),
            $this->getAvailableFields(),
            self::REQUIRED_FIELDS
        );

        $academicYearId = $spec['academic_year_id'] ?? null;
        $classAcademicYearIds = $spec['class_academic_year_ids'] ?? [];
        if (! is_array($classAcademicYearIds) || count($classAcademicYearIds) === 0) {
            throw new \InvalidArgumentException('At least one class academic year is required for subject import templates.');
        }
        if (! is_string($academicYearId) || trim($academicYearId) === '') {
            throw new \InvalidArgumentException('Academic year is required for subject import templates.');
        }

        $classDefaults = is_array($spec['class_defaults'] ?? null) ? $spec['class_defaults'] : [];
        $classDefaultsByCay = [];
        foreach ($classDefaults as $d) {
            if (is_array($d) && isset($d['class_academic_year_id']) && is_string($d['class_academic_year_id'])) {
                $classDefaultsByCay[$d['class_academic_year_id']] = [
                    'room_id' => $d['room_id'] ?? null,
                    'is_required' => $d['is_required'] ?? null,
                    'hours_per_week' => $d['hours_per_week'] ?? null,
                    'credits' => $d['credits'] ?? null,
                ];
            }
        }

        $spreadsheet = new Spreadsheet;
        $spreadsheet->removeSheetByIndex(0);

        $fieldOrder = array_values($subjectFields);
        $fieldLabels = $this->getFieldLabels($fieldOrder);
        $sheetsMeta = [];

        /** @var \Illuminate\Database\Eloquent\Collection<int, ClassAcademicYear> $instances */
        $instances = ClassAcademicYear::query()
            ->with(['class', 'academicYear'])
            ->whereIn('id', $classAcademicYearIds)
            ->where('academic_year_id', $academicYearId)
            ->where(function ($q) use ($organizationId) {
                $q->whereNull('organization_id')->orWhere('organization_id', $organizationId);
            })
            ->whereNull('deleted_at')
            ->get();

        if ($instances->isEmpty()) {
            throw new \InvalidArgumentException('No valid class academic years found for the selected academic year.');
        }

        $usedTitles = [];
        foreach ($instances as $instance) {
            $className = $instance->class?->name ?? 'Class';
            $section = $instance->section_name ? ('-'.$instance->section_name) : '';
            $sheetTitle = $this->uniqueSheetTitle($this->sanitizeSheetTitle($className.$section), $usedTitles);
            $usedTitles[$sheetTitle] = true;

            $sheet = new Worksheet($spreadsheet, $sheetTitle);
            $spreadsheet->addSheet($sheet);
            $this->buildDataSheet($sheet, $fieldOrder, $fieldLabels);

            $sheetsMeta[] = [
                'sheet_name' => $sheetTitle,
                'class_academic_year_id' => $instance->id,
                'class_id' => $instance->class_id,
                'academic_year_id' => $academicYearId,
                'class_name' => $instance->class?->name,
                'section_name' => $instance->section_name,
                'academic_year_name' => $instance->academicYear?->name,
                'defaults' => $classDefaultsByCay[$instance->id] ?? null,
            ];
        }

        $instructions = new Worksheet($spreadsheet, 'Instructions');
        $spreadsheet->addSheet($instructions);
        $this->buildInstructionsSheet($instructions, $sheetsMeta, $schoolId);

        $metaSheet = new Worksheet($spreadsheet, self::META_SHEET_NAME);
        $spreadsheet->addSheet($metaSheet, 0);
        $metaSheet->setSheetState(Worksheet::SHEETSTATE_HIDDEN);

        $meta = [
            'template' => 'subject_import',
            'version' => self::TEMPLATE_VERSION,
            'organization_id' => $organizationId,
            'school_id' => $schoolId,
            'subject_fields' => $subjectFields,
            'field_order' => $fieldOrder,
            'field_labels' => $fieldLabels,
            'academic_year_id' => $academicYearId,
            'sheets' => $sheetsMeta,
            'generated_at' => now()->toIso8601String(),
        ];

        $metaSheet->setCellValue('A1', 'subject_import_template');
        $metaSheet->setCellValue('A2', json_encode($meta, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        $content = $this->writeToString($spreadsheet);
        $suffix = now()->format('Ymd_His');

        return [
            'filename' => "subjects_import_template_{$suffix}.xlsx",
            'content' => $content,
            'mime' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ];
    }

    /**
     * @param  string[]  $requested
     * @param  string[]  $allowed
     * @param  string[]  $required
     * @return string[]
     */
    private function normalizeFields(array $requested, array $allowed, array $required): array
    {
        $requested = array_values(array_filter(array_map(function ($v) {
            return is_string($v) ? trim($v) : null;
        }, $requested)));

        $allowedSet = array_fill_keys($allowed, true);
        $out = [];
        foreach ($requested as $f) {
            if (isset($allowedSet[$f])) {
                $out[] = $f;
            }
        }

        foreach ($required as $req) {
            if (! in_array($req, $out, true)) {
                $out[] = $req;
            }
        }

        return array_values(array_unique($out));
    }

    /**
     * @param  string[]  $fieldOrder
     * @param  array<string, string>  $fieldLabels
     */
    private function buildDataSheet(Worksheet $sheet, array $fieldOrder, array $fieldLabels): void
    {
        foreach ($fieldOrder as $idx => $field) {
            $col = Coordinate::stringFromColumnIndex($idx + 1);
            $sheet->setCellValue("{$col}1", $fieldLabels[$field] ?? $field);
        }

        $lastCol = Coordinate::stringFromColumnIndex(max(count($fieldOrder), 1));
        $headerRange = "A1:{$lastCol}1";
        $sheet->getStyle($headerRange)->getFont()->setBold(true);
        $sheet->getStyle($headerRange)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle($headerRange)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFEFEFEF');
        $sheet->freezePane('A2');

        for ($i = 1; $i <= count($fieldOrder); $i++) {
            $col = Coordinate::stringFromColumnIndex($i);
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }
    }

    private function sanitizeSheetTitle(string $name): string
    {
        $clean = preg_replace('/[:\\\\\\/\\?\\*\\[\\]]/u', ' ', $name) ?? 'Sheet';
        $clean = trim($clean);
        if ($clean === '') {
            $clean = 'Sheet';
        }

        return mb_substr($clean, 0, 31, 'UTF-8');
    }

    /**
     * @param  array<string, true>  $usedTitles
     */
    private function uniqueSheetTitle(string $base, array $usedTitles): string
    {
        if (! isset($usedTitles[$base])) {
            return $base;
        }

        for ($i = 2; $i < 100; $i++) {
            $suffix = (string) $i;
            $candidate = mb_substr($base, 0, 31 - mb_strlen($suffix, 'UTF-8'), 'UTF-8').$suffix;
            if (! isset($usedTitles[$candidate])) {
                return $candidate;
            }
        }

        return mb_substr($base.'_'.substr(md5($base.microtime()), 0, 4), 0, 31, 'UTF-8');
    }

    /**
     * @param  string[]  $fieldOrder
     * @return array<string, string>
     */
    private function getFieldLabels(array $fieldOrder): array
    {
        $labels = [];
        foreach ($fieldOrder as $key) {
            $labels[$key] = self::FIELD_DEFS[$key]['label'] ?? ucwords(str_replace('_', ' ', $key));
        }

        return $labels;
    }

    /**
     * @param  array<int, array<string, mixed>>  $sheetsMeta
     */
    private function buildInstructionsSheet(Worksheet $sheet, array $sheetsMeta, string $schoolId): void
    {
        $sheet->setCellValue('A1', 'Subject Import Template');
        $sheet->setCellValue('A2', 'Instructions:');
        $sheet->setCellValue('A3', '1) Fill subject rows in each class sheet (Name and Code are required).');
        $sheet->setCellValue('A4', '2) Class / Academic Year / Room defaults are embedded automatically (IDs are hidden).');
        $sheet->setCellValue('A5', '3) Existing subject codes are reused; existing class/year assignments are skipped.');
        $sheet->setCellValue('A6', '4) Upload this same file to validate, then import.');

        $row = 8;
        $sheet->setCellValue("A{$row}", 'Sheet');
        $sheet->setCellValue("B{$row}", 'Academic Year');
        $sheet->setCellValue("C{$row}", 'Class');
        $sheet->setCellValue("D{$row}", 'Section');
        $sheet->setCellValue("E{$row}", 'Default Room');
        $sheet->setCellValue("F{$row}", 'Default Hours/Week');
        $sheet->setCellValue("G{$row}", 'Default Required');
        $sheet->getStyle("A{$row}:G{$row}")->getFont()->setBold(true);
        $sheet->getStyle("A{$row}:G{$row}")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFEFEFEF');
        $row++;

        $roomIds = [];
        foreach ($sheetsMeta as $sm) {
            $defaults = is_array($sm['defaults'] ?? null) ? $sm['defaults'] : [];
            if (isset($defaults['room_id']) && is_string($defaults['room_id']) && $defaults['room_id'] !== '') {
                $roomIds[] = $defaults['room_id'];
            }
        }
        $roomIds = array_values(array_unique($roomIds));
        $roomMap = [];
        if (count($roomIds) > 0) {
            $rooms = Room::query()
                ->whereIn('id', $roomIds)
                ->whereNull('deleted_at')
                ->get(['id', 'room_number', 'school_id']);
            foreach ($rooms as $r) {
                if ($r->school_id !== null && $r->school_id !== $schoolId) {
                    continue;
                }
                $roomMap[$r->id] = $r->room_number ?? $r->id;
            }
        }

        foreach ($sheetsMeta as $sm) {
            $defaults = is_array($sm['defaults'] ?? null) ? $sm['defaults'] : [];
            $sheet->setCellValue("A{$row}", (string) ($sm['sheet_name'] ?? ''));
            $sheet->setCellValue("B{$row}", (string) ($sm['academic_year_name'] ?? ''));
            $sheet->setCellValue("C{$row}", (string) ($sm['class_name'] ?? ''));
            $sheet->setCellValue("D{$row}", (string) ($sm['section_name'] ?? ''));
            $roomName = '';
            if (isset($defaults['room_id']) && is_string($defaults['room_id'])) {
                $roomName = (string) ($roomMap[$defaults['room_id']] ?? '');
            }
            $sheet->setCellValue("E{$row}", $roomName);
            $sheet->setCellValue("F{$row}", isset($defaults['hours_per_week']) ? (string) $defaults['hours_per_week'] : '');
            $required = $defaults['is_required'] ?? null;
            $sheet->setCellValue("G{$row}", is_bool($required) ? ($required ? 'true' : 'false') : '');
            $row++;
        }

        foreach (['A', 'B', 'C', 'D', 'E', 'F', 'G'] as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }
    }

    private function writeToString(Spreadsheet $spreadsheet): string
    {
        $tmp = tempnam(sys_get_temp_dir(), 'subject-import-template-');
        if ($tmp === false) {
            throw new \RuntimeException('Failed to create temp file for XLSX generation');
        }

        try {
            $writer = new Xlsx($spreadsheet);
            $writer->save($tmp);
            $content = file_get_contents($tmp);
            if ($content === false) {
                throw new \RuntimeException('Failed to read generated XLSX');
            }

            return $content;
        } finally {
            @unlink($tmp);
        }
    }
}
