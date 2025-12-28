<?php

namespace App\Services\Imports;

use App\Models\ClassAcademicYear;
use App\Models\ResidencyType;
use App\Models\Room;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class StudentImportXlsxService
{
    public const TEMPLATE_VERSION = 1;
    public const META_SHEET_NAME = '_meta';

    /** @var string[] */
    private const REQUIRED_STUDENT_FIELDS = ['full_name', 'father_name'];

    /** @var array<string, array{label:string, required?:bool}> */
    private const STUDENT_FIELD_DEFS = [
        // Identifiers
        'admission_no' => ['label' => 'Admission No'],
        'student_code' => ['label' => 'Student Code (auto)'],

        // Required core
        'full_name' => ['label' => 'Full Name', 'required' => true],
        'father_name' => ['label' => 'Father Name', 'required' => true],
        'gender' => ['label' => 'Gender (Male/Female or M/F)', 'required' => false],

        // Optional
        'school_id' => ['label' => 'School ID (ignored - auto)'],
        'card_number' => ['label' => 'Card Number'],
        'grandfather_name' => ['label' => 'Grandfather Name'],
        'mother_name' => ['label' => 'Mother Name'],
        'birth_year' => ['label' => 'Birth Year'],
        'birth_date' => ['label' => 'Birth Date (YYYY-MM-DD)'],
        'age' => ['label' => 'Age'],
        'admission_year' => ['label' => 'Admission Year'],
        'orig_province' => ['label' => 'Origin Province'],
        'orig_district' => ['label' => 'Origin District'],
        'orig_village' => ['label' => 'Origin Village'],
        'curr_province' => ['label' => 'Current Province'],
        'curr_district' => ['label' => 'Current District'],
        'curr_village' => ['label' => 'Current Village'],
        'nationality' => ['label' => 'Nationality'],
        'preferred_language' => ['label' => 'Preferred Language'],
        'previous_school' => ['label' => 'Previous School'],
        'guardian_name' => ['label' => 'Guardian Name'],
        'guardian_relation' => ['label' => 'Guardian Relation'],
        'guardian_phone' => ['label' => 'Guardian Phone'],
        'guardian_tazkira' => ['label' => 'Guardian Tazkira'],
        'home_address' => ['label' => 'Home Address'],
        'zamin_name' => ['label' => 'Zamin Name'],
        'zamin_phone' => ['label' => 'Zamin Phone'],
        'zamin_tazkira' => ['label' => 'Zamin Tazkira'],
        'zamin_address' => ['label' => 'Zamin Address'],
        'applying_grade' => ['label' => 'Applying Grade'],
        'is_orphan' => ['label' => 'Is Orphan (true/false)'],
        'admission_fee_status' => ['label' => 'Admission Fee Status (paid/pending/waived/partial)'],
        'student_status' => ['label' => 'Student Status (applied/admitted/active/withdrawn)'],
        'disability_status' => ['label' => 'Disability Status'],
        'emergency_contact_name' => ['label' => 'Emergency Contact Name'],
        'emergency_contact_phone' => ['label' => 'Emergency Contact Phone'],
        'family_income' => ['label' => 'Family Income'],
    ];

    /** @var array<string, array{label:string}> */
    private const ADMISSION_FIELD_DEFS = [
        // Scope fields (may be omitted when template is class-scoped via sheet meta)
        'academic_year_id' => ['label' => 'Academic Year ID'],
        'class_id' => ['label' => 'Class ID'],
        'class_academic_year_id' => ['label' => 'Class Academic Year ID'],

        // Optional admission details
        'residency_type_id' => ['label' => 'Residency Type ID'],
        'room_id' => ['label' => 'Room ID'],
        'admission_year' => ['label' => 'Admission Year'],
        'admission_date' => ['label' => 'Admission Date (YYYY-MM-DD)'],
        'enrollment_status' => ['label' => 'Enrollment Status'],
        'enrollment_type' => ['label' => 'Enrollment Type'],
        'shift' => ['label' => 'Shift'],
        'is_boarder' => ['label' => 'Is Boarder (true/false)'],
        'fee_status' => ['label' => 'Fee Status'],
        'placement_notes' => ['label' => 'Placement Notes'],
    ];

    public function getAvailableStudentFields(): array
    {
        return array_keys(self::STUDENT_FIELD_DEFS);
    }

    public function getAvailableAdmissionFields(): array
    {
        return array_keys(self::ADMISSION_FIELD_DEFS);
    }

    /**
     * Build an XLSX template as a binary string.
     *
     * @param array{
     *   student_fields: string[],
     *   admission_fields?: string[],
     *   academic_year_id?: string|null,
     *   class_academic_year_ids?: string[],
     *   class_defaults?: array<int, array{
     *     class_academic_year_id: string,
     *     room_id?: string|null,
     *     residency_type_id?: string|null,
     *     shift?: string|null,
     *     enrollment_status?: string|null,
     *     is_boarder?: bool|null
     *   }>
     * } $spec
     *
     * @param string $organizationId
     * @param string $schoolId
     *
     * @return array{filename:string, content:string, mime:string}
     */
    public function generateTemplate(array $spec, string $organizationId, string $schoolId): array
    {
        $studentFields = $this->normalizeFields($spec['student_fields'] ?? [], $this->getAvailableStudentFields(), self::REQUIRED_STUDENT_FIELDS);
        $admissionFields = $this->normalizeFields($spec['admission_fields'] ?? [], $this->getAvailableAdmissionFields(), []);

        $academicYearId = $spec['academic_year_id'] ?? null;
        $classAcademicYearIds = $spec['class_academic_year_ids'] ?? [];
        $classDefaults = is_array($spec['class_defaults'] ?? null) ? $spec['class_defaults'] : [];
        $classDefaultsByCay = [];
        foreach ($classDefaults as $d) {
            if (is_array($d) && isset($d['class_academic_year_id']) && is_string($d['class_academic_year_id'])) {
                $classDefaultsByCay[$d['class_academic_year_id']] = [
                    'room_id' => $d['room_id'] ?? null,
                    'residency_type_id' => $d['residency_type_id'] ?? null,
                    'shift' => $d['shift'] ?? null,
                    'enrollment_status' => $d['enrollment_status'] ?? null,
                    'is_boarder' => $d['is_boarder'] ?? null,
                ];
            }
        }

        $spreadsheet = new Spreadsheet();
        $spreadsheet->removeSheetByIndex(0);

        $sheetsMeta = [];
        $fieldOrder = array_values(array_merge($studentFields, $admissionFields));
        // Never show ID columns to end users. Scope/default IDs live in hidden metadata.
        $fieldOrder = array_values(array_filter($fieldOrder, function ($k) {
            return !in_array($k, [
                'organization_id',
                'school_id',
                'academic_year_id',
                'class_id',
                'class_academic_year_id',
                'room_id',
                'residency_type_id',
                'student_id',
            ], true);
        }));
        $fieldLabels = $this->getFieldLabels($fieldOrder);

        // Multi-sheet: one sheet per class academic year instance
        if (is_array($classAcademicYearIds) && count($classAcademicYearIds) > 0) {
            /** @var \Illuminate\Database\Eloquent\Collection<int, ClassAcademicYear> $instances */
            $instances = ClassAcademicYear::query()
                ->with(['class', 'academicYear'])
                ->whereIn('id', $classAcademicYearIds)
                ->when($academicYearId, function ($q) use ($academicYearId) {
                    $q->where('academic_year_id', $academicYearId);
                })
                ->where(function ($q) use ($organizationId) {
                    // class_academic_years can be global (NULL) or org-scoped
                    $q->whereNull('organization_id')->orWhere('organization_id', $organizationId);
                })
                ->whereNull('deleted_at')
                ->get();

            foreach ($instances as $instance) {
                $className = $instance->class?->name ?? 'Class';
                $section = $instance->section_name ? ('-' . $instance->section_name) : '';
                $sheetTitle = $this->sanitizeSheetTitle($className . $section);

                $sheet = new Worksheet($spreadsheet, $sheetTitle);
                $spreadsheet->addSheet($sheet);
                $this->buildDataSheet($sheet, $fieldOrder, $fieldLabels);

                $sheetsMeta[] = [
                    'sheet_name' => $sheetTitle,
                    'class_academic_year_id' => $instance->id,
                    'class_id' => $instance->class_id,
                    'academic_year_id' => $academicYearId ?? $instance->academic_year_id,
                    'class_name' => $instance->class?->name,
                    'section_name' => $instance->section_name,
                    'academic_year_name' => $instance->academicYear?->name,
                    'defaults' => $classDefaultsByCay[$instance->id] ?? null,
                ];
            }
        } else {
            // Single student-only sheet
            $sheet = new Worksheet($spreadsheet, 'Students');
            $spreadsheet->addSheet($sheet);
            $this->buildDataSheet($sheet, $fieldOrder, $fieldLabels);
            $sheetsMeta[] = [
                'sheet_name' => 'Students',
                'class_academic_year_id' => null,
                'class_id' => null,
                'academic_year_id' => $academicYearId,
                'class_name' => null,
                'section_name' => null,
                'academic_year_name' => null,
                'defaults' => null,
            ];
        }

        // Visible instructions sheet so users understand what is auto-applied
        $instructions = new Worksheet($spreadsheet, 'Instructions');
        $spreadsheet->addSheet($instructions);
        $this->buildInstructionsSheet($instructions, $sheetsMeta, $organizationId, $schoolId);

        // Hidden meta sheet
        $metaSheet = new Worksheet($spreadsheet, self::META_SHEET_NAME);
        $spreadsheet->addSheet($metaSheet, 0);
        $metaSheet->setSheetState(Worksheet::SHEETSTATE_HIDDEN);

        $meta = [
            'template' => 'student_import',
            'version' => self::TEMPLATE_VERSION,
            'organization_id' => $organizationId,
            'school_id' => $schoolId,
            'student_fields' => $studentFields,
            'admission_fields' => $admissionFields,
            'field_order' => $fieldOrder,
            'field_labels' => $fieldLabels,
            'academic_year_id' => $academicYearId,
            'sheets' => $sheetsMeta,
            'generated_at' => now()->toIso8601String(),
        ];

        $metaSheet->setCellValue('A1', 'student_import_template');
        $metaSheet->setCellValue('A2', json_encode($meta, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        $content = $this->writeToString($spreadsheet);

        $suffix = now()->format('Ymd_His');
        $filename = "students_import_template_{$suffix}.xlsx";

        return [
            'filename' => $filename,
            'content' => $content,
            'mime' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ];
    }

    /**
     * @param string[] $requested
     * @param string[] $allowed
     * @param string[] $required
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
            if (!in_array($req, $out, true)) {
                $out[] = $req;
            }
        }

        // Keep stable, but unique
        $out = array_values(array_unique($out));

        return $out;
    }

    /**
     * @param string[] $fieldOrder
     * @param array<string, string> $fieldLabels
     */
    private function buildDataSheet(Worksheet $sheet, array $fieldOrder, array $fieldLabels): void
    {
        // Header row (row 1)
        foreach ($fieldOrder as $idx => $field) {
            $col = Coordinate::stringFromColumnIndex($idx + 1);
            $label = $fieldLabels[$field] ?? $field;
            $sheet->setCellValue("{$col}1", $label);
        }

        // Style header
        $lastCol = Coordinate::stringFromColumnIndex(max(count($fieldOrder), 1));
        $headerRange = "A1:{$lastCol}1";
        $sheet->getStyle($headerRange)->getFont()->setBold(true);
        $sheet->getStyle($headerRange)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle($headerRange)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFEFEFEF');
        $sheet->freezePane('A2');

        // Autosize columns (reasonable for template)
        for ($i = 1; $i <= count($fieldOrder); $i++) {
            $col = Coordinate::stringFromColumnIndex($i);
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        // Put data validation hints via comments? (skip for now to keep import clean)
    }

    private function sanitizeSheetTitle(string $name): string
    {
        // Excel sheet name rules: no : \ / ? * [ ] and max length 31
        $clean = preg_replace('/[:\\\\\\/\\?\\*\\[\\]]/u', ' ', $name) ?? 'Sheet';
        $clean = trim($clean);
        if ($clean === '') {
            $clean = 'Sheet';
        }

        $clean = mb_substr($clean, 0, 31, 'UTF-8');

        // Avoid duplicates by suffixing a short hash if needed
        if (mb_strlen($clean, 'UTF-8') > 31) {
            $clean = mb_substr($clean, 0, 31, 'UTF-8');
        }

        return $clean;
    }

    /**
     * @param string[] $fieldOrder
     * @return array<string, string>
     */
    private function getFieldLabels(array $fieldOrder): array
    {
        $labels = [];
        foreach ($fieldOrder as $key) {
            if (isset(self::STUDENT_FIELD_DEFS[$key]['label'])) {
                $labels[$key] = self::STUDENT_FIELD_DEFS[$key]['label'];
                continue;
            }
            if (isset(self::ADMISSION_FIELD_DEFS[$key]['label'])) {
                $labels[$key] = self::ADMISSION_FIELD_DEFS[$key]['label'];
                continue;
            }
            $labels[$key] = $this->humanizeKey($key);
        }
        return $labels;
    }

    private function humanizeKey(string $key): string
    {
        $s = str_replace('_', ' ', $key);
        return ucwords($s);
    }

    /**
     * @param array<int, array<string, mixed>> $sheetsMeta
     */
    private function buildInstructionsSheet(Worksheet $sheet, array $sheetsMeta, string $organizationId, string $schoolId): void
    {
        $sheet->setCellValue('A1', 'Student Import Template');
        $sheet->setCellValue('A2', 'Instructions:');
        $sheet->setCellValue('A3', '1) Fill ONLY the student data columns in each class sheet.');
        $sheet->setCellValue('A4', '2) IDs are NOT shown. Class/Academic Year/Room/Residency defaults are embedded automatically.');
        $sheet->setCellValue('A5', '3) If Admission No is blank, the system generates Student Code and uses it as Admission No.');
        $sheet->setCellValue('A6', '4) Upload this same file back to validate, then import.');

        $row = 8;
        $sheet->setCellValue("A{$row}", 'Sheet');
        $sheet->setCellValue("B{$row}", 'Academic Year');
        $sheet->setCellValue("C{$row}", 'Class');
        $sheet->setCellValue("D{$row}", 'Section');
        $sheet->setCellValue("E{$row}", 'Default Residency Type');
        $sheet->setCellValue("F{$row}", 'Default Room');
        $sheet->getStyle("A{$row}:F{$row}")->getFont()->setBold(true);
        $sheet->getStyle("A{$row}:F{$row}")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFEFEFEF');
        $row++;

        $residencyIds = [];
        $roomIds = [];
        foreach ($sheetsMeta as $sm) {
            $defaults = is_array($sm['defaults'] ?? null) ? $sm['defaults'] : [];
            if (isset($defaults['residency_type_id']) && is_string($defaults['residency_type_id']) && $defaults['residency_type_id'] !== '') {
                $residencyIds[] = $defaults['residency_type_id'];
            }
            if (isset($defaults['room_id']) && is_string($defaults['room_id']) && $defaults['room_id'] !== '') {
                $roomIds[] = $defaults['room_id'];
            }
        }
        $residencyIds = array_values(array_unique($residencyIds));
        $roomIds = array_values(array_unique($roomIds));

        $residencyMap = [];
        if (count($residencyIds) > 0) {
            $types = ResidencyType::query()
                ->whereIn('id', $residencyIds)
                ->whereNull('deleted_at')
                ->get(['id', 'name', 'organization_id']);
            foreach ($types as $t) {
                if ($t->organization_id !== null && $t->organization_id !== $organizationId) {
                    continue;
                }
                $residencyMap[$t->id] = $t->name;
            }
        }

        $roomMap = [];
        if (count($roomIds) > 0) {
            // Rooms are school-scoped in this app (no rooms.organization_id column).
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
            $sheetName = (string) ($sm['sheet_name'] ?? '');
            if ($sheetName === '' || $sheetName === 'Students') {
                continue;
            }
            $defaults = is_array($sm['defaults'] ?? null) ? $sm['defaults'] : [];
            $sheet->setCellValue("A{$row}", $sheetName);
            $sheet->setCellValue("B{$row}", (string) ($sm['academic_year_name'] ?? ''));
            $sheet->setCellValue("C{$row}", (string) ($sm['class_name'] ?? ''));
            $sheet->setCellValue("D{$row}", (string) ($sm['section_name'] ?? ''));

            $rtName = '';
            if (isset($defaults['residency_type_id']) && is_string($defaults['residency_type_id'])) {
                $rtName = (string) ($residencyMap[$defaults['residency_type_id']] ?? '');
            }
            $roomName = '';
            if (isset($defaults['room_id']) && is_string($defaults['room_id'])) {
                $roomName = (string) ($roomMap[$defaults['room_id']] ?? '');
            }
            $sheet->setCellValue("E{$row}", $rtName);
            $sheet->setCellValue("F{$row}", $roomName);
            $row++;
        }

        foreach (['A','B','C','D','E','F'] as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }
    }

    private function toStr(mixed $v): string
    {
        if ($v === null) return '';
        if (is_bool($v)) return $v ? 'true' : 'false';
        if (is_scalar($v)) return (string) $v;
        return '';
    }

    private function writeToString(Spreadsheet $spreadsheet): string
    {
        $tmp = tempnam(sys_get_temp_dir(), 'student-import-template-');
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


