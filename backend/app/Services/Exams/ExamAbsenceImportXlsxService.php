<?php

namespace App\Services\Exams;

use App\Models\ExamStudent;
use App\Models\ExamStudentAbsence;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class ExamAbsenceImportXlsxService
{
    public const TEMPLATE_VERSION = 1;

    public const META_SHEET_NAME = '_meta';

    public const DATA_SHEET_NAME = 'Absences';

    public const TEMPLATE_KEY = 'exam_absence_import';

    /** @var list<string> */
    public const FIELD_ORDER = [
        'student_admission_id',
        'admission_no',
        'student_name',
        'father_name',
        'class_name',
        'absence_count',
    ];

    /** @var array<string, string> */
    private const FIELD_LABELS = [
        'student_admission_id' => 'Student Admission ID (do not change)',
        'admission_no' => 'Admission No',
        'student_name' => 'Student Name',
        'father_name' => 'Father Name',
        'class_name' => 'Class Name',
        'absence_count' => 'Absences',
    ];

    /**
     * @return array{content: string, mime: string, filename: string}
     */
    public function generateTemplate(
        string $organizationId,
        string $schoolId,
        string $examId,
        ?string $examClassId = null,
        string $examName = 'exam',
    ): array {
        $rows = $this->loadAbsenceRows($organizationId, $schoolId, $examId, $examClassId);

        $spreadsheet = new Spreadsheet;
        $meta = $spreadsheet->getActiveSheet();
        $meta->setTitle(self::META_SHEET_NAME);
        $meta->setCellValue('A1', 'meta');
        $meta->setCellValue('A2', json_encode([
            'template' => self::TEMPLATE_KEY,
            'version' => self::TEMPLATE_VERSION,
            'exam_id' => $examId,
            'exam_class_id' => $examClassId,
            'field_order' => self::FIELD_ORDER,
            'organization_id' => $organizationId,
            'school_id' => $schoolId,
        ], JSON_THROW_ON_ERROR));
        $meta->setSheetState(Worksheet::SHEETSTATE_HIDDEN);

        $sheet = $spreadsheet->createSheet();
        $sheet->setTitle(self::DATA_SHEET_NAME);

        foreach (self::FIELD_ORDER as $index => $field) {
            $col = Coordinate::stringFromColumnIndex($index + 1);
            $sheet->setCellValue("{$col}1", self::FIELD_LABELS[$field]);
        }

        $headerRange = 'A1:'.Coordinate::stringFromColumnIndex(count(self::FIELD_ORDER)).'1';
        $sheet->getStyle($headerRange)->getFont()->setBold(true);
        $sheet->getStyle($headerRange)->getFill()
            ->setFillType(Fill::FILL_SOLID)
            ->getStartColor()->setRGB('E2E8F0');
        $sheet->getStyle($headerRange)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        foreach ($rows as $rowIndex => $row) {
            $excelRow = $rowIndex + 2;
            foreach (self::FIELD_ORDER as $colIndex => $field) {
                $col = Coordinate::stringFromColumnIndex($colIndex + 1);
                $value = match ($field) {
                    'student_admission_id' => $row['student_admission_id'],
                    'admission_no' => $row['admission_no'] ?? '',
                    'student_name' => $row['student_name'] ?? '',
                    'father_name' => $row['father_name'] ?? '',
                    'class_name' => $row['class_name'] ?? '',
                    'absence_count' => (int) ($row['absence_count'] ?? 0),
                    default => '',
                };
                $sheet->setCellValue("{$col}{$excelRow}", $value);
            }
        }

        foreach (range(1, count(self::FIELD_ORDER)) as $colIndex) {
            $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($colIndex))->setAutoSize(true);
        }

        $spreadsheet->setActiveSheetIndexByName(self::DATA_SHEET_NAME);

        $safeName = preg_replace('/[^A-Za-z0-9_-]+/', '-', $examName) ?: 'exam';
        $filename = 'exam-absences-'.$safeName.'.xlsx';

        return [
            'content' => $this->writeToString($spreadsheet),
            'mime' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'filename' => $filename,
        ];
    }

    /**
     * @return list<array{student_admission_id: string, absence_count: int}>
     */
    public function parseImportRows(
        string $filePath,
        string $organizationId,
        string $schoolId,
        string $examId,
    ): array {
        $spreadsheet = IOFactory::load($filePath);
        $parsed = $this->extractRowsFromSpreadsheet($spreadsheet);

        $enrolled = ExamStudent::query()
            ->with(['studentAdmission.student:id,admission_no'])
            ->where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->where('exam_id', $examId)
            ->whereNull('deleted_at')
            ->withLiveActiveAdmission()
            ->get();

        $byAdmissionId = [];
        $byAdmissionNo = [];
        foreach ($enrolled as $examStudent) {
            $admissionId = (string) $examStudent->student_admission_id;
            $byAdmissionId[$admissionId] = $admissionId;
            $admissionNo = strtolower(trim((string) ($examStudent->studentAdmission?->student?->admission_no ?? '')));
            if ($admissionNo !== '') {
                $byAdmissionNo[$admissionNo] = $admissionId;
            }
        }

        $result = [];
        $errors = [];

        foreach ($parsed as $index => $row) {
            $excelRow = $index + 2;
            $admissionId = trim((string) ($row['student_admission_id'] ?? ''));
            $admissionNo = strtolower(trim((string) ($row['admission_no'] ?? '')));
            $absenceRaw = $row['absence_count'] ?? null;

            if ($admissionId === '' && $admissionNo === '' && ($absenceRaw === null || $absenceRaw === '')) {
                continue;
            }

            if ($absenceRaw === null || $absenceRaw === '') {
                $errors[] = "Row {$excelRow}: Absences value is required.";

                continue;
            }

            if (! is_numeric($absenceRaw) || (int) $absenceRaw < 0 || (string) (int) $absenceRaw !== (string) (int) round((float) $absenceRaw)) {
                $errors[] = "Row {$excelRow}: Absences must be a whole number >= 0.";

                continue;
            }

            $absenceCount = (int) $absenceRaw;
            $matchedId = null;

            if ($admissionId !== '' && isset($byAdmissionId[$admissionId])) {
                $matchedId = $admissionId;
            } elseif ($admissionNo !== '' && isset($byAdmissionNo[$admissionNo])) {
                $matchedId = $byAdmissionNo[$admissionNo];
            }

            if ($matchedId === null) {
                $hint = $admissionNo !== '' ? $admissionNo : ($admissionId !== '' ? $admissionId : 'unknown');
                $errors[] = "Row {$excelRow}: No enrolled student matched [{$hint}].";

                continue;
            }

            $result[$matchedId] = [
                'student_admission_id' => $matchedId,
                'absence_count' => $absenceCount,
            ];
        }

        if ($errors !== []) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'file' => $errors,
            ]);
        }

        if ($result === []) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'file' => ['No absence rows found in the Excel file.'],
            ]);
        }

        return array_values($result);
    }

    /**
     * @return list<array{
     *     student_admission_id: string,
     *     admission_no: string|null,
     *     student_name: string|null,
     *     father_name: string|null,
     *     absence_count: int
     * }>
     */
    private function loadAbsenceRows(
        string $organizationId,
        string $schoolId,
        string $examId,
        ?string $examClassId,
    ): array {
        $examStudentsQuery = ExamStudent::query()
            ->with([
                'studentAdmission.student:id,full_name,father_name,admission_no',
                'examClass.classAcademicYear.class:id,name',
            ])
            ->where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->where('exam_id', $examId)
            ->whereNull('deleted_at')
            ->withLiveActiveAdmission();

        if ($examClassId) {
            $examStudentsQuery->where('exam_class_id', $examClassId);
        }

        $examStudents = $examStudentsQuery->get()
            ->sortBy(fn (ExamStudent $es) => $es->studentAdmission?->student?->full_name ?? '');

        $admissionIds = $examStudents->pluck('student_admission_id')->filter()->unique()->values();

        $absenceMap = ExamStudentAbsence::query()
            ->where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->where('exam_id', $examId)
            ->whereIn('student_admission_id', $admissionIds)
            ->pluck('absence_count', 'student_admission_id');

        return $examStudents->map(function (ExamStudent $examStudent) use ($absenceMap) {
            $admission = $examStudent->studentAdmission;

            return [
                'student_admission_id' => (string) $examStudent->student_admission_id,
                'admission_no' => $admission?->student?->admission_no,
                'student_name' => $admission?->student?->full_name,
                'father_name' => $admission?->student?->father_name,
                'class_name' => $this->formatExamClassLabel($examStudent),
                'absence_count' => (int) ($absenceMap[$examStudent->student_admission_id] ?? 0),
            ];
        })->values()->all();
    }

    private function formatExamClassLabel(ExamStudent $examStudent): string
    {
        $cay = $examStudent->examClass?->classAcademicYear;
        $className = $cay?->class?->name ?: $cay?->section_name;
        if (! $className) {
            return '';
        }

        $sectionName = $cay?->section_name;
        if ($sectionName && ! str_contains((string) $className, (string) $sectionName)) {
            return "{$className} — {$sectionName}";
        }

        return (string) $className;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function extractRowsFromSpreadsheet(Spreadsheet $spreadsheet): array
    {
        $metaSheet = $spreadsheet->getSheetByName(self::META_SHEET_NAME);
        if ($metaSheet instanceof Worksheet) {
            $raw = (string) $metaSheet->getCell('A2')->getValue();
            $meta = json_decode($raw, true);
            if (is_array($meta)
                && ($meta['template'] ?? null) === self::TEMPLATE_KEY
                && is_array($meta['field_order'] ?? null)
            ) {
                $dataSheet = $spreadsheet->getSheetByName(self::DATA_SHEET_NAME)
                    ?? $spreadsheet->getSheet(1)
                    ?? $spreadsheet->getActiveSheet();

                return $this->rowsFromFieldOrder($dataSheet, $meta['field_order']);
            }
        }

        $sheet = $spreadsheet->getSheetByName(self::DATA_SHEET_NAME)
            ?? $spreadsheet->getActiveSheet();

        return $this->rowsFromHeaders($sheet);
    }

    /**
     * @param  list<string>  $fieldOrder
     * @return list<array<string, mixed>>
     */
    private function rowsFromFieldOrder(Worksheet $sheet, array $fieldOrder): array
    {
        $highestRow = (int) $sheet->getHighestDataRow();
        $rows = [];

        for ($r = 2; $r <= $highestRow; $r++) {
            $row = [];
            $empty = true;
            foreach ($fieldOrder as $c => $field) {
                $col = Coordinate::stringFromColumnIndex($c + 1);
                $value = $this->normalizeCellValue($sheet->getCell("{$col}{$r}")->getCalculatedValue());
                $row[$field] = $value;
                if ($value !== null && $value !== '') {
                    $empty = false;
                }
            }
            if (! $empty) {
                $rows[] = $row;
            }
        }

        return $rows;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function rowsFromHeaders(Worksheet $sheet): array
    {
        $highestColumn = Coordinate::columnIndexFromString($sheet->getHighestDataColumn());
        $headerMap = [];

        for ($c = 1; $c <= $highestColumn; $c++) {
            $col = Coordinate::stringFromColumnIndex($c);
            $label = strtolower(trim((string) $sheet->getCell("{$col}1")->getValue()));
            $field = $this->mapHeaderToField($label);
            if ($field !== null) {
                $headerMap[$c] = $field;
            }
        }

        if (! in_array('admission_no', $headerMap, true) && ! in_array('student_admission_id', $headerMap, true)) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'file' => ['Excel must include an Admission No column (or use the downloaded template).'],
            ]);
        }

        if (! in_array('absence_count', $headerMap, true)) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'file' => ['Excel must include an Absences column.'],
            ]);
        }

        $highestRow = (int) $sheet->getHighestDataRow();
        $rows = [];

        for ($r = 2; $r <= $highestRow; $r++) {
            $row = [];
            $empty = true;
            foreach ($headerMap as $c => $field) {
                $col = Coordinate::stringFromColumnIndex($c);
                $value = $this->normalizeCellValue($sheet->getCell("{$col}{$r}")->getCalculatedValue());
                $row[$field] = $value;
                if ($value !== null && $value !== '') {
                    $empty = false;
                }
            }
            if (! $empty) {
                $rows[] = $row;
            }
        }

        return $rows;
    }

    private function mapHeaderToField(string $label): ?string
    {
        $normalized = preg_replace('/[^a-z0-9]+/', ' ', $label) ?? $label;
        $normalized = trim($normalized);

        return match (true) {
            str_contains($normalized, 'student admission id'),
            $normalized === 'student admission id' => 'student_admission_id',
            in_array($normalized, ['admission no', 'admission number', 'admission', 'adm no'], true),
            str_contains($normalized, 'admission') => 'admission_no',
            in_array($normalized, ['student name', 'name', 'full name'], true) => 'student_name',
            in_array($normalized, ['father name', 'father', 'fathers name'], true) => 'father_name',
            in_array($normalized, ['class name', 'class', 'exam class'], true),
            str_contains($normalized, 'class') => 'class_name',
            in_array($normalized, ['absences', 'absence', 'absence count', 'total absences'], true) => 'absence_count',
            default => null,
        };
    }

    private function normalizeCellValue(mixed $value): mixed
    {
        if ($value === null) {
            return null;
        }
        if (is_string($value)) {
            return trim($value);
        }
        if (is_numeric($value)) {
            return $value;
        }

        return trim((string) $value);
    }

    private function writeToString(Spreadsheet $spreadsheet): string
    {
        $writer = new Xlsx($spreadsheet);
        $temp = tempnam(sys_get_temp_dir(), 'exam-absence-xlsx-');
        if ($temp === false) {
            throw new \RuntimeException('Unable to create temporary Excel file.');
        }

        try {
            $writer->save($temp);
            $content = file_get_contents($temp);
            if ($content === false) {
                throw new \RuntimeException('Unable to read generated Excel file.');
            }

            return $content;
        } finally {
            @unlink($temp);
        }
    }
}
