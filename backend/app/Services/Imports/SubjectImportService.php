<?php

namespace App\Services\Imports;

use App\Models\ClassAcademicYear;
use App\Models\Room;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\IOFactory;

class SubjectImportService
{
    private const REQUIRED_FIELDS = ['name', 'code'];

    /**
     * @return array{
     *   meta: array,
     *   sheets: array<int, array{sheet_name:string, rows: array<int, array<string, mixed>>}>
     * }
     */
    public function parse(UploadedFile|string $file): array
    {
        $reader = IOFactory::createReader('Xlsx');
        $reader->setReadDataOnly(true);
        $filePath = is_string($file) ? $file : $file->getRealPath();
        if (! is_string($filePath) || trim($filePath) === '') {
            throw new \InvalidArgumentException('Invalid import file');
        }
        $spreadsheet = $reader->load($filePath);

        $metaSheet = $spreadsheet->getSheetByName(SubjectImportXlsxService::META_SHEET_NAME);
        if (! $metaSheet) {
            throw new \InvalidArgumentException('Invalid template: missing _meta sheet');
        }

        $metaRaw = $metaSheet->getCell('A2')->getValue();
        if (! is_string($metaRaw) || trim($metaRaw) === '') {
            throw new \InvalidArgumentException('Invalid template: missing metadata');
        }

        $meta = json_decode($metaRaw, true);
        if (! is_array($meta) || ($meta['template'] ?? null) !== 'subject_import') {
            throw new \InvalidArgumentException('Invalid template: bad metadata');
        }

        $fieldOrder = [];
        if (isset($meta['field_order']) && is_array($meta['field_order'])) {
            $fieldOrder = array_values(array_filter($meta['field_order'], fn ($v) => is_string($v) && trim($v) !== ''));
        }
        if (count($fieldOrder) === 0 && isset($meta['subject_fields']) && is_array($meta['subject_fields'])) {
            $fieldOrder = array_values(array_filter($meta['subject_fields'], fn ($v) => is_string($v) && trim($v) !== ''));
        }
        if (count($fieldOrder) === 0) {
            throw new \InvalidArgumentException('Invalid template: missing field mapping');
        }

        $expectedColCount = count($fieldOrder);
        $sheets = [];
        foreach ($spreadsheet->getAllSheets() as $sheet) {
            $sheetName = $sheet->getTitle();
            if ($sheetName === SubjectImportXlsxService::META_SHEET_NAME || $sheetName === 'Instructions') {
                continue;
            }

            $highestRow = (int) $sheet->getHighestRow();
            $rows = [];
            for ($r = 2; $r <= $highestRow; $r++) {
                $row = [];
                $allEmpty = true;

                for ($c = 1; $c <= $expectedColCount; $c++) {
                    $key = $fieldOrder[$c - 1];
                    $cellRef = Coordinate::stringFromColumnIndex($c).$r;
                    $cell = $sheet->getCell($cellRef);
                    $value = $this->normalizeCellValue($cell->getValue());
                    if (! ($value === null || $value === '')) {
                        $allEmpty = false;
                    }
                    $row[$key] = $value;
                }

                if ($allEmpty) {
                    continue;
                }

                $rows[] = ['__row' => $r] + $row;
            }

            $sheets[] = [
                'sheet_name' => $sheetName,
                'rows' => $rows,
            ];
        }

        return [
            'meta' => $meta,
            'sheets' => $sheets,
        ];
    }

    /**
     * @return array{
     *   is_valid: bool,
     *   total_rows: int,
     *   valid_rows: int,
     *   invalid_rows: int,
     *   sheets: array<int, array{
     *     sheet_name: string,
     *     total_rows: int,
     *     valid_rows: int,
     *     invalid_rows: int,
     *     valid_row_numbers: array<int>,
     *     errors: array<int, array{row:int, field:string, message:string}>
     *   }>
     * }
     */
    public function validateImport(array $parsed, string $organizationId, string $schoolId): array
    {
        $meta = $parsed['meta'] ?? [];
        $sheetsMeta = is_array($meta['sheets'] ?? null) ? $meta['sheets'] : [];
        $academicYearId = is_string($meta['academic_year_id'] ?? null) ? $meta['academic_year_id'] : null;

        $metaClassAcademicYearIds = [];
        foreach ($sheetsMeta as $sm) {
            if (is_array($sm) && isset($sm['class_academic_year_id']) && is_string($sm['class_academic_year_id']) && trim($sm['class_academic_year_id']) !== '') {
                $metaClassAcademicYearIds[] = $sm['class_academic_year_id'];
            }
        }
        $metaClassAcademicYearIds = array_values(array_unique($metaClassAcademicYearIds));

        $classYearMap = [];
        if (count($metaClassAcademicYearIds) > 0) {
            $instances = ClassAcademicYear::query()
                ->whereIn('id', $metaClassAcademicYearIds)
                ->whereNull('deleted_at')
                ->get();
            foreach ($instances as $inst) {
                if ($inst->organization_id !== null && $inst->organization_id !== $organizationId) {
                    continue;
                }
                if ($inst->school_id !== null && $inst->school_id !== $schoolId) {
                    continue;
                }
                if ($academicYearId && $inst->academic_year_id !== $academicYearId) {
                    continue;
                }
                $classYearMap[$inst->id] = [
                    'class_id' => $inst->class_id,
                    'academic_year_id' => $inst->academic_year_id,
                ];
            }
        }

        $roomIds = [];
        foreach ($sheetsMeta as $sm) {
            $defaults = is_array($sm['defaults'] ?? null) ? $sm['defaults'] : [];
            if (isset($defaults['room_id']) && is_string($defaults['room_id']) && $defaults['room_id'] !== '') {
                $roomIds[] = $defaults['room_id'];
            }
        }
        $validRoomIds = [];
        if (count($roomIds) > 0) {
            $rooms = Room::query()
                ->whereIn('id', array_values(array_unique($roomIds)))
                ->whereNull('deleted_at')
                ->get(['id', 'school_id']);
            foreach ($rooms as $room) {
                if ($room->school_id !== null && $room->school_id !== $schoolId) {
                    continue;
                }
                $validRoomIds[$room->id] = true;
            }
        }

        $sheetResults = [];
        $totalRows = 0;
        $validRows = 0;
        $invalidRows = 0;

        foreach (($parsed['sheets'] ?? []) as $sheet) {
            $sheetName = (string) ($sheet['sheet_name'] ?? 'Sheet');
            $rows = is_array($sheet['rows'] ?? null) ? $sheet['rows'] : [];
            $sheetMeta = $this->findSheetMeta($sheetsMeta, $sheetName);
            $errors = [];
            $validRowNumbers = [];
            $codesInSheet = [];

            $cayId = is_string($sheetMeta['class_academic_year_id'] ?? null) ? $sheetMeta['class_academic_year_id'] : null;
            if (! $cayId || ! isset($classYearMap[$cayId])) {
                $errors[] = [
                    'row' => 0,
                    'field' => 'class_academic_year_id',
                    'message' => 'Invalid or unauthorized class academic year for sheet',
                ];
            }

            $defaults = is_array($sheetMeta['defaults'] ?? null) ? $sheetMeta['defaults'] : [];
            $defaultRoomId = is_string($defaults['room_id'] ?? null) ? $defaults['room_id'] : null;
            if ($defaultRoomId && ! isset($validRoomIds[$defaultRoomId])) {
                $errors[] = [
                    'row' => 0,
                    'field' => 'room_id',
                    'message' => 'Invalid default room for sheet',
                ];
            }

            foreach ($rows as $row) {
                $rowNumber = (int) ($row['__row'] ?? 0);
                $rowErrors = [];

                $name = is_string($row['name'] ?? null) ? trim((string) $row['name']) : '';
                $code = is_string($row['code'] ?? null) ? trim((string) $row['code']) : '';

                if ($name === '') {
                    $rowErrors[] = ['row' => $rowNumber, 'field' => 'name', 'message' => 'name is required'];
                } elseif (mb_strlen($name) > 100) {
                    $rowErrors[] = ['row' => $rowNumber, 'field' => 'name', 'message' => 'name must be at most 100 characters'];
                }

                if ($code === '') {
                    $rowErrors[] = ['row' => $rowNumber, 'field' => 'code', 'message' => 'code is required'];
                } elseif (mb_strlen($code) > 50) {
                    $rowErrors[] = ['row' => $rowNumber, 'field' => 'code', 'message' => 'code must be at most 50 characters'];
                } else {
                    $codeKey = mb_strtolower($code);
                    if (isset($codesInSheet[$codeKey])) {
                        $rowErrors[] = ['row' => $rowNumber, 'field' => 'code', 'message' => 'Duplicate code in the same sheet'];
                    }
                    $codesInSheet[$codeKey] = true;
                }

                if (array_key_exists('description', $row) && $row['description'] !== null && $row['description'] !== '') {
                    $description = is_string($row['description']) ? $row['description'] : (string) $row['description'];
                    if (mb_strlen($description) > 5000) {
                        $rowErrors[] = ['row' => $rowNumber, 'field' => 'description', 'message' => 'description is too long'];
                    }
                }

                if (array_key_exists('is_active', $row) && $row['is_active'] !== null && $row['is_active'] !== '') {
                    if ($this->parseBoolean($row['is_active']) === null) {
                        $rowErrors[] = ['row' => $rowNumber, 'field' => 'is_active', 'message' => 'is_active must be true/false'];
                    }
                }

                if (array_key_exists('is_required', $row) && $row['is_required'] !== null && $row['is_required'] !== '') {
                    if ($this->parseBoolean($row['is_required']) === null) {
                        $rowErrors[] = ['row' => $rowNumber, 'field' => 'is_required', 'message' => 'is_required must be true/false'];
                    }
                }

                if (array_key_exists('hours_per_week', $row) && $row['hours_per_week'] !== null && $row['hours_per_week'] !== '') {
                    $hours = $this->parseInt($row['hours_per_week']);
                    if ($hours === null || $hours < 0 || $hours > 40) {
                        $rowErrors[] = ['row' => $rowNumber, 'field' => 'hours_per_week', 'message' => 'hours_per_week must be an integer between 0 and 40'];
                    }
                }

                if (array_key_exists('credits', $row) && $row['credits'] !== null && $row['credits'] !== '') {
                    $credits = $this->parseInt($row['credits']);
                    if ($credits === null || $credits < 0) {
                        $rowErrors[] = ['row' => $rowNumber, 'field' => 'credits', 'message' => 'credits must be a non-negative integer'];
                    }
                }

                $totalRows++;
                if (count($rowErrors) > 0 || ! $cayId || ! isset($classYearMap[$cayId])) {
                    $invalidRows++;
                    $errors = array_merge($errors, $rowErrors);
                } else {
                    $validRows++;
                    $validRowNumbers[] = $rowNumber;
                }
            }

            $sheetResults[] = [
                'sheet_name' => $sheetName,
                'total_rows' => count($rows),
                'valid_rows' => count($validRowNumbers),
                'invalid_rows' => count($rows) - count($validRowNumbers) + (count(array_filter($errors, fn ($e) => ($e['row'] ?? 0) === 0)) > 0 && count($rows) === 0 ? 1 : 0),
                'valid_row_numbers' => $validRowNumbers,
                'errors' => $errors,
            ];
        }

        $hasSheetLevelErrors = false;
        foreach ($sheetResults as $sr) {
            foreach ($sr['errors'] as $err) {
                if (($err['row'] ?? 0) === 0) {
                    $hasSheetLevelErrors = true;
                    break 2;
                }
            }
        }

        return [
            'is_valid' => $invalidRows === 0 && ! $hasSheetLevelErrors && $totalRows > 0,
            'total_rows' => $totalRows,
            'valid_rows' => $validRows,
            'invalid_rows' => $invalidRows,
            'sheets' => $sheetResults,
        ];
    }

    /**
     * @param array{
     *   is_valid: bool,
     *   sheets?: array<int, array{sheet_name:string, valid_row_numbers?: array<int>}>
     * }|null $precomputedValidation
     * @return array{
     *   created_subjects:int,
     *   skipped_subjects:int,
     *   created_templates:int,
     *   skipped_templates:int,
     *   created_class_subjects:int,
     *   skipped_class_subjects:int
     * }
     */
    public function commit(array $parsed, string $organizationId, string $schoolId, ?array $precomputedValidation = null): array
    {
        $validation = $precomputedValidation ?? $this->validateImport($parsed, $organizationId, $schoolId);
        if (! ($validation['is_valid'] ?? false)) {
            throw new \RuntimeException('Import validation failed');
        }

        $meta = $parsed['meta'] ?? [];
        $sheetsMeta = is_array($meta['sheets'] ?? null) ? $meta['sheets'] : [];

        $validRowNumbersBySheet = [];
        foreach ($validation['sheets'] ?? [] as $sheetResult) {
            $validRowNumbersBySheet[$sheetResult['sheet_name']] = $sheetResult['valid_row_numbers'] ?? [];
        }

        $createdSubjects = 0;
        $skippedSubjects = 0;
        $createdTemplates = 0;
        $skippedTemplates = 0;
        $createdClassSubjects = 0;
        $skippedClassSubjects = 0;

        DB::transaction(function () use (
            $parsed,
            $sheetsMeta,
            $organizationId,
            $schoolId,
            $validRowNumbersBySheet,
            &$createdSubjects,
            &$skippedSubjects,
            &$createdTemplates,
            &$skippedTemplates,
            &$createdClassSubjects,
            &$skippedClassSubjects
        ) {
            $now = now();
            $subjectIdByCode = [];
            $preExistingCodes = [];
            $countedSkippedCodes = [];

            $existingSubjects = DB::table('subjects')
                ->where('organization_id', $organizationId)
                ->where('school_id', $schoolId)
                ->whereNull('deleted_at')
                ->get(['id', 'code']);
            foreach ($existingSubjects as $subject) {
                $codeKey = mb_strtolower((string) $subject->code);
                $subjectIdByCode[$codeKey] = (string) $subject->id;
                $preExistingCodes[$codeKey] = true;
            }

            foreach (($parsed['sheets'] ?? []) as $sheet) {
                $sheetName = (string) ($sheet['sheet_name'] ?? 'Sheet');
                $rows = is_array($sheet['rows'] ?? null) ? $sheet['rows'] : [];
                $validRowLookup = array_fill_keys(array_map('intval', $validRowNumbersBySheet[$sheetName] ?? []), true);
                $sheetMeta = $this->findSheetMeta($sheetsMeta, $sheetName);

                $classId = is_string($sheetMeta['class_id'] ?? null) ? $sheetMeta['class_id'] : null;
                $cayId = is_string($sheetMeta['class_academic_year_id'] ?? null) ? $sheetMeta['class_academic_year_id'] : null;
                $defaults = is_array($sheetMeta['defaults'] ?? null) ? $sheetMeta['defaults'] : [];

                if (! $classId || ! $cayId) {
                    continue;
                }

                foreach ($rows as $row) {
                    $rowNumber = (int) ($row['__row'] ?? 0);
                    if (! isset($validRowLookup[$rowNumber])) {
                        continue;
                    }

                    $name = trim((string) ($row['name'] ?? ''));
                    $code = trim((string) ($row['code'] ?? ''));
                    $codeKey = mb_strtolower($code);

                    if (isset($subjectIdByCode[$codeKey])) {
                        $subjectId = $subjectIdByCode[$codeKey];
                        if (isset($preExistingCodes[$codeKey]) && ! isset($countedSkippedCodes[$codeKey])) {
                            $skippedSubjects++;
                            $countedSkippedCodes[$codeKey] = true;
                        }
                    } else {
                        $subjectId = (string) Str::uuid();
                        $isActive = $this->parseBoolean($row['is_active'] ?? null);
                        DB::table('subjects')->insert([
                            'id' => $subjectId,
                            'organization_id' => $organizationId,
                            'school_id' => $schoolId,
                            'name' => $name,
                            'code' => $code,
                            'description' => $this->nullableString($row['description'] ?? null),
                            'is_active' => $isActive ?? true,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ]);
                        $subjectIdByCode[$codeKey] = $subjectId;
                        $createdSubjects++;
                    }

                    $isRequired = $this->parseBoolean($row['is_required'] ?? null);
                    if ($isRequired === null && array_key_exists('is_required', $defaults)) {
                        $isRequired = $this->parseBoolean($defaults['is_required']);
                    }
                    $isRequired = $isRequired ?? true;

                    $hours = $this->parseInt($row['hours_per_week'] ?? null);
                    if ($hours === null && isset($defaults['hours_per_week'])) {
                        $hours = $this->parseInt($defaults['hours_per_week']);
                    }

                    $credits = $this->parseInt($row['credits'] ?? null);
                    if ($credits === null && isset($defaults['credits'])) {
                        $credits = $this->parseInt($defaults['credits']);
                    }

                    $existingTemplate = DB::table('class_subject_templates')
                        ->where('class_id', $classId)
                        ->where('subject_id', $subjectId)
                        ->whereNull('deleted_at')
                        ->first(['id']);

                    if ($existingTemplate) {
                        $templateId = (string) $existingTemplate->id;
                        $skippedTemplates++;
                    } else {
                        $templateId = (string) Str::uuid();
                        DB::table('class_subject_templates')->insert([
                            'id' => $templateId,
                            'class_id' => $classId,
                            'subject_id' => $subjectId,
                            'organization_id' => $organizationId,
                            'school_id' => $schoolId,
                            'is_required' => $isRequired,
                            'credits' => $credits,
                            'hours_per_week' => $hours,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ]);
                        $createdTemplates++;
                    }

                    $existingClassSubject = DB::table('class_subjects')
                        ->where('class_academic_year_id', $cayId)
                        ->where('subject_id', $subjectId)
                        ->whereNull('deleted_at')
                        ->exists();

                    if ($existingClassSubject) {
                        $skippedClassSubjects++;
                        continue;
                    }

                    $roomId = is_string($defaults['room_id'] ?? null) && $defaults['room_id'] !== ''
                        ? $defaults['room_id']
                        : null;

                    DB::table('class_subjects')->insert([
                        'id' => (string) Str::uuid(),
                        'class_subject_template_id' => $templateId,
                        'class_academic_year_id' => $cayId,
                        'subject_id' => $subjectId,
                        'organization_id' => $organizationId,
                        'school_id' => $schoolId,
                        'teacher_id' => null,
                        'room_id' => $roomId,
                        'credits' => $credits,
                        'hours_per_week' => $hours,
                        'is_required' => $isRequired,
                        'notes' => $this->nullableString($row['notes'] ?? null),
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                    $createdClassSubjects++;
                }
            }
        });

        return [
            'created_subjects' => $createdSubjects,
            'skipped_subjects' => $skippedSubjects,
            'created_templates' => $createdTemplates,
            'skipped_templates' => $skippedTemplates,
            'created_class_subjects' => $createdClassSubjects,
            'skipped_class_subjects' => $skippedClassSubjects,
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $sheetsMeta
     * @return array<string, mixed>
     */
    private function findSheetMeta(array $sheetsMeta, string $sheetName): array
    {
        foreach ($sheetsMeta as $sm) {
            if (is_array($sm) && ($sm['sheet_name'] ?? null) === $sheetName) {
                return $sm;
            }
        }

        return [];
    }

    private function normalizeCellValue(mixed $raw): mixed
    {
        if ($raw === null) {
            return null;
        }
        if (is_string($raw)) {
            $trim = trim($raw);

            return $trim === '' ? null : $trim;
        }
        if (is_bool($raw) || is_numeric($raw)) {
            return $raw;
        }

        return $raw;
    }

    private function parseBoolean(mixed $value): ?bool
    {
        if (is_bool($value)) {
            return $value;
        }
        if (is_int($value)) {
            return $value === 1 ? true : ($value === 0 ? false : null);
        }
        if (is_float($value)) {
            return ((int) $value) === 1 ? true : (((int) $value) === 0 ? false : null);
        }
        if (is_string($value)) {
            $v = strtolower(trim($value));
            if (in_array($v, ['1', 'true', 'yes', 'y'], true)) {
                return true;
            }
            if (in_array($v, ['0', 'false', 'no', 'n'], true)) {
                return false;
            }
        }

        return null;
    }

    private function parseInt(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (is_int($value)) {
            return $value;
        }
        if (is_float($value) && floor($value) === $value) {
            return (int) $value;
        }
        if (is_string($value) && preg_match('/^-?\d+$/', trim($value))) {
            return (int) trim($value);
        }

        return null;
    }

    private function nullableString(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (is_string($value)) {
            $trim = trim($value);

            return $trim === '' ? null : $trim;
        }
        if (is_scalar($value)) {
            return (string) $value;
        }

        return null;
    }
}
