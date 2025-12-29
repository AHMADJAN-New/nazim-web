<?php

namespace App\Services\Imports;

use App\Models\Student;
use App\Models\StudentAdmission;
use App\Models\ClassAcademicYear;
use App\Services\CodeGenerator;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;

class StudentImportService
{
    private const REQUIRED_STUDENT_FIELDS = ['full_name', 'father_name'];

    private const STUDENT_STATUS = ['applied', 'admitted', 'active', 'withdrawn'];
    private const ADMISSION_FEE_STATUS = ['paid', 'pending', 'waived', 'partial'];

    private const ENROLLMENT_STATUS = ['pending', 'admitted', 'active', 'inactive', 'suspended', 'withdrawn', 'graduated'];

    /**
     * Parse the XLSX into meta + sheets.
     *
     * @return array{
     *   meta: array,
     *   sheets: array<int, array{sheet_name:string, rows: array<int, array<string, mixed>>}>
     * }
     */
    public function parse(UploadedFile $file): array
    {
        $reader = IOFactory::createReader('Xlsx');
        $reader->setReadDataOnly(true);
        $spreadsheet = $reader->load($file->getRealPath());

        $metaSheet = $spreadsheet->getSheetByName(StudentImportXlsxService::META_SHEET_NAME);
        if (!$metaSheet) {
            throw new \InvalidArgumentException('Invalid template: missing _meta sheet');
        }

        $metaRaw = $metaSheet->getCell('A2')->getValue();
        if (!is_string($metaRaw) || trim($metaRaw) === '') {
            throw new \InvalidArgumentException('Invalid template: missing metadata');
        }

        $meta = json_decode($metaRaw, true);
        if (!is_array($meta) || ($meta['template'] ?? null) !== 'student_import') {
            throw new \InvalidArgumentException('Invalid template: bad metadata');
        }

        $fieldOrder = [];
        if (isset($meta['field_order']) && is_array($meta['field_order'])) {
            $fieldOrder = array_values(array_filter($meta['field_order'], fn ($v) => is_string($v) && trim($v) !== ''));
        }
        if (count($fieldOrder) === 0) {
            $studentFields = isset($meta['student_fields']) && is_array($meta['student_fields']) ? $meta['student_fields'] : [];
            $admissionFields = isset($meta['admission_fields']) && is_array($meta['admission_fields']) ? $meta['admission_fields'] : [];
            $fieldOrder = array_values(array_merge(
                array_values(array_filter($studentFields, fn ($v) => is_string($v) && trim($v) !== '')),
                array_values(array_filter($admissionFields, fn ($v) => is_string($v) && trim($v) !== ''))
            ));
        }
        $expectedColCount = count($fieldOrder);
        if ($expectedColCount === 0) {
            throw new \InvalidArgumentException('Invalid template: missing field mapping');
        }

        $sheets = [];
        foreach ($spreadsheet->getAllSheets() as $sheet) {
            $sheetName = $sheet->getTitle();
            // Skip meta sheet and instructions sheet (they're not data sheets)
            if ($sheetName === StudentImportXlsxService::META_SHEET_NAME || $sheetName === 'Instructions') {
                continue;
            }

            $highestRow = (int) $sheet->getHighestRow();

            $rows = [];
            for ($r = 2; $r <= $highestRow; $r++) {
                $row = [];
                $allEmpty = true;

                for ($c = 1; $c <= $expectedColCount; $c++) {
                    $key = $fieldOrder[$c - 1];
                    $cellRef = Coordinate::stringFromColumnIndex($c) . $r;
                    $cell = $sheet->getCell($cellRef);
                    $value = $cell->getValue();
                    $value = $this->normalizeCellValue($value, $key, $cell->getFormattedValue());
                    if (!($value === null || $value === '')) {
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
     * Validate parsed template rows for the given org/school scope.
     *
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
    public function validateImport(array $parsed, string $organizationId): array
    {
        $meta = $parsed['meta'] ?? [];
        $sheetsMeta = is_array($meta['sheets'] ?? null) ? $meta['sheets'] : [];

        // Validate sheet meta class_academic_year_id values (if present)
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
                // Org scoping: if org_id present, must match
                if ($inst->organization_id !== null && $inst->organization_id !== $organizationId) {
                    continue;
                }
                $classYearMap[$inst->id] = [
                    'class_id' => $inst->class_id,
                    'academic_year_id' => $inst->academic_year_id,
                ];
            }
        }

        $admissionNos = [];
        foreach (($parsed['sheets'] ?? []) as $sheet) {
            foreach (($sheet['rows'] ?? []) as $row) {
                $admissionNo = $row['admission_no'] ?? null;
                if (is_string($admissionNo) && trim($admissionNo) !== '') {
                    $admissionNos[] = trim($admissionNo);
                }
            }
        }

        // Duplicates within file
        $dupInFile = [];
        $seen = [];
        foreach ($admissionNos as $no) {
            if (isset($seen[$no])) {
                $dupInFile[$no] = true;
            }
            $seen[$no] = true;
        }

        // Existing admission numbers in DB (within org)
        $existingAdmissionNos = [];
        if (count($admissionNos) > 0) {
            $existingAdmissionNos = DB::table('students')
                ->whereIn('admission_no', array_values(array_unique($admissionNos)))
                ->where('organization_id', $organizationId)
                ->whereNull('deleted_at')
                ->pluck('admission_no')
                ->toArray();
            $existingAdmissionNos = array_fill_keys(array_map('strval', $existingAdmissionNos), true);
        }

        $totalRows = 0;
        $validRows = 0;
        $invalidRows = 0;
        $sheetResults = [];

        foreach (($parsed['sheets'] ?? []) as $sheet) {
            $sheetName = (string) ($sheet['sheet_name'] ?? 'Sheet');
            $rows = is_array($sheet['rows'] ?? null) ? $sheet['rows'] : [];

            $sheetTotal = count($rows);
            $sheetValid = 0;
            $sheetInvalid = 0;
            $errors = [];

            // Resolve sheet-level class meta (if present)
            $sheetMeta = $this->findSheetMeta($sheetsMeta, $sheetName);
            $metaAcademicYearId = $sheetMeta['academic_year_id'] ?? null;
            $metaClassAcademicYearId = $sheetMeta['class_academic_year_id'] ?? null;
            $metaClassId = $sheetMeta['class_id'] ?? null;
            $sheetDefaults = $this->getSheetDefaults($sheetMeta);

            // Sheet meta consistency checks (applies even if there are zero rows)
            if (is_string($metaClassAcademicYearId) && trim($metaClassAcademicYearId) !== '') {
                $metaCay = trim($metaClassAcademicYearId);
                if (!isset($classYearMap[$metaCay])) {
                    $errors[] = ['row' => 0, 'field' => 'class_academic_year_id', 'message' => 'Invalid or unauthorized class_academic_year_id in template metadata'];
                } else {
                    $expectedClassId = $classYearMap[$metaCay]['class_id'];
                    $expectedAcademicYearId = $classYearMap[$metaCay]['academic_year_id'];
                    if (is_string($metaClassId) && trim($metaClassId) !== '' && trim($metaClassId) !== $expectedClassId) {
                        $errors[] = ['row' => 0, 'field' => 'class_id', 'message' => 'Template metadata class_id does not match class_academic_year_id'];
                    }
                    if (is_string($metaAcademicYearId) && trim($metaAcademicYearId) !== '' && trim($metaAcademicYearId) !== $expectedAcademicYearId) {
                        $errors[] = ['row' => 0, 'field' => 'academic_year_id', 'message' => 'Template metadata academic_year_id does not match class_academic_year_id'];
                    }
                }
            }

            $validRowNumbers = [];
            foreach ($rows as $row) {
                $totalRows++;
                $rowNumber = (int) ($row['__row'] ?? 0);

                $rowErrors = $this->validateStudentRow($row, $organizationId, $dupInFile, $existingAdmissionNos);

                // If admissions context exists, validate admissions fields lightly
                $resolvedAcademicYearId = $metaAcademicYearId ?? ($row['academic_year_id'] ?? null);
                $resolvedClassAcademicYearId = $metaClassAcademicYearId ?? ($row['class_academic_year_id'] ?? null);
                $resolvedClassId = $metaClassId ?? ($row['class_id'] ?? null);

                $hasAdmissionContext = ($resolvedAcademicYearId || $resolvedClassAcademicYearId || $resolvedClassId);

                if ($hasAdmissionContext) {
                    if (!$resolvedAcademicYearId || !is_string($resolvedAcademicYearId) || trim($resolvedAcademicYearId) === '') {
                        $rowErrors[] = ['row' => $rowNumber, 'field' => 'academic_year_id', 'message' => 'academic_year_id is required for admissions'];
                    }
                    if ($resolvedClassAcademicYearId && (!$resolvedClassId || !is_string($resolvedClassId))) {
                        // We can derive class_id from class_academic_year_id later on commit, but require it for clarity now.
                        // We'll attempt to derive if possible.
                        $derived = $this->deriveClassIdFromClassAcademicYear((string) $resolvedClassAcademicYearId, $organizationId);
                        if (!$derived) {
                            $rowErrors[] = ['row' => $rowNumber, 'field' => 'class_id', 'message' => 'class_id is required (or class_academic_year_id must be valid)'];
                        }
                    }
                    if ($resolvedClassAcademicYearId && is_string($resolvedClassAcademicYearId) && trim($resolvedClassAcademicYearId) !== '') {
                        $cay = trim($resolvedClassAcademicYearId);
                        if (!isset($classYearMap[$cay])) {
                            $rowErrors[] = ['row' => $rowNumber, 'field' => 'class_academic_year_id', 'message' => 'Invalid or unauthorized class_academic_year_id'];
                        } else {
                            if ($resolvedClassId && is_string($resolvedClassId) && trim($resolvedClassId) !== '' && trim($resolvedClassId) !== $classYearMap[$cay]['class_id']) {
                                $rowErrors[] = ['row' => $rowNumber, 'field' => 'class_id', 'message' => 'class_id does not match class_academic_year_id'];
                            }
                            if ($resolvedAcademicYearId && is_string($resolvedAcademicYearId) && trim($resolvedAcademicYearId) !== '' && trim($resolvedAcademicYearId) !== $classYearMap[$cay]['academic_year_id']) {
                                $rowErrors[] = ['row' => $rowNumber, 'field' => 'academic_year_id', 'message' => 'academic_year_id does not match class_academic_year_id'];
                            }
                        }
                    }
                    // Defaults sanity (avoid user guessing IDs)
                    if (isset($sheetDefaults['room_id']) && is_string($sheetDefaults['room_id']) && trim($sheetDefaults['room_id']) !== '') {
                        // Existence is enforced at template generation time; we still validate UUID format lightly
                        if (!preg_match('/^[0-9a-fA-F-]{36}$/', $sheetDefaults['room_id'])) {
                            $rowErrors[] = ['row' => $rowNumber, 'field' => 'room_id', 'message' => 'Invalid default room_id in template'];
                        }
                    }
                    if (isset($sheetDefaults['residency_type_id']) && is_string($sheetDefaults['residency_type_id']) && trim($sheetDefaults['residency_type_id']) !== '') {
                        if (!preg_match('/^[0-9a-fA-F-]{36}$/', $sheetDefaults['residency_type_id'])) {
                            $rowErrors[] = ['row' => $rowNumber, 'field' => 'residency_type_id', 'message' => 'Invalid default residency_type_id in template'];
                        }
                    }
                    $rowErrors = array_merge($rowErrors, $this->validateAdmissionFields($row, $rowNumber));
                }

                if (count($rowErrors) > 0) {
                    $sheetInvalid++;
                    $invalidRows++;
                    $errors = array_merge($errors, $rowErrors);
                } else {
                    $sheetValid++;
                    $validRows++;
                    $validRowNumbers[] = $rowNumber;
                }
            }

            $sheetResults[] = [
                'sheet_name' => $sheetName,
                'total_rows' => $sheetTotal,
                'valid_rows' => $sheetValid,
                'invalid_rows' => $sheetInvalid,
                'valid_row_numbers' => $validRowNumbers,
                'errors' => $errors,
            ];
        }

        return [
            'is_valid' => $invalidRows === 0,
            'total_rows' => $totalRows,
            'valid_rows' => $validRows,
            'invalid_rows' => $invalidRows,
            'sheets' => $sheetResults,
        ];
    }

    private function validateStudentRow(array $row, string $organizationId, array $dupInFile, array $existingAdmissionNos): array
    {
        $rowNumber = (int) ($row['__row'] ?? 0);
        $errors = [];

        // Required fields - check if value exists and is not empty (handle all types)
        foreach (self::REQUIRED_STUDENT_FIELDS as $field) {
            $val = $row[$field] ?? null;
            $isEmpty = false;
            
            if ($val === null) {
                $isEmpty = true;
            } elseif (is_string($val)) {
                $isEmpty = trim($val) === '';
            } elseif (is_numeric($val)) {
                // Numeric values are considered non-empty (e.g., dates as Excel serial numbers)
                $isEmpty = false;
            } elseif (is_bool($val)) {
                // Booleans are considered non-empty
                $isEmpty = false;
            } else {
                // For other types, convert to string and check
                $strVal = (string) $val;
                $isEmpty = trim($strVal) === '';
            }
            
            if ($isEmpty) {
                $errors[] = ['row' => $rowNumber, 'field' => $field, 'message' => "{$field} is required"];
            }
        }

        // Gender normalization - handle all types
        $gender = $row['gender'] ?? null;
        if ($gender !== null) {
            // Check if value is not empty (handle all types)
            $isGenderEmpty = false;
            if (is_string($gender)) {
                $isGenderEmpty = trim($gender) === '';
            } elseif (is_numeric($gender)) {
                // Numeric values are considered non-empty
                $isGenderEmpty = false;
            } elseif (is_bool($gender)) {
                // Booleans are considered non-empty
                $isGenderEmpty = false;
            } else {
                // For other types, convert to string and check
                $genderStr = (string) $gender;
                $isGenderEmpty = trim($genderStr) === '';
            }
            
            if (!$isGenderEmpty) {
                // Convert to string for processing
                $genderStr = is_string($gender) ? $gender : (string) $gender;
                $g = $this->normalizeGender(trim($genderStr));
                if ($g === null) {
                    $errors[] = ['row' => $rowNumber, 'field' => 'gender', 'message' => 'gender must be male or female (accepts: Male, male, MALE, M, Female, female, FEMALE, F, etc.)'];
                }
            }
        }

        // admission_no: optional for import (auto-generated if empty). If provided, must be unique.
        $admissionNo = $row['admission_no'] ?? null;
        if (is_string($admissionNo) && trim($admissionNo) !== '') {
            $no = trim($admissionNo);
            if (isset($dupInFile[$no])) {
                $errors[] = ['row' => $rowNumber, 'field' => 'admission_no', 'message' => 'Duplicate admission_no in file'];
            }
            if (isset($existingAdmissionNos[$no])) {
                $errors[] = ['row' => $rowNumber, 'field' => 'admission_no', 'message' => 'admission_no already exists'];
            }
            if (mb_strlen($no, 'UTF-8') > 100) {
                $errors[] = ['row' => $rowNumber, 'field' => 'admission_no', 'message' => 'admission_no is too long'];
            }
        }

        // student_code: optional; if provided, uniqueness is enforced by StoreStudentRequest, but we validate lightly here.
        $studentCode = $row['student_code'] ?? null;
        if (is_string($studentCode) && mb_strlen(trim($studentCode), 'UTF-8') > 32) {
            $errors[] = ['row' => $rowNumber, 'field' => 'student_code', 'message' => 'student_code is too long'];
        }

        // Enums
        $feeStatus = $row['admission_fee_status'] ?? null;
        if (is_string($feeStatus) && trim($feeStatus) !== '' && !in_array(strtolower(trim($feeStatus)), self::ADMISSION_FEE_STATUS, true)) {
            $errors[] = ['row' => $rowNumber, 'field' => 'admission_fee_status', 'message' => 'Invalid admission_fee_status'];
        }
        $studentStatus = $row['student_status'] ?? null;
        if (is_string($studentStatus) && trim($studentStatus) !== '' && !in_array(strtolower(trim($studentStatus)), self::STUDENT_STATUS, true)) {
            $errors[] = ['row' => $rowNumber, 'field' => 'student_status', 'message' => 'Invalid student_status'];
        }

        // Booleans
        foreach (['is_orphan'] as $bField) {
            if (array_key_exists($bField, $row) && $row[$bField] !== null && $row[$bField] !== '') {
                $parsed = $this->parseBoolean($row[$bField]);
                if ($parsed === null) {
                    $errors[] = ['row' => $rowNumber, 'field' => $bField, 'message' => 'Invalid boolean value'];
                }
            }
        }

        // Dates
        foreach (['birth_date'] as $dField) {
            if (array_key_exists($dField, $row) && $row[$dField] !== null && $row[$dField] !== '') {
                $parsed = $this->parseDateYmd($row[$dField]);
                if ($parsed === null) {
                    $errors[] = ['row' => $rowNumber, 'field' => $dField, 'message' => 'Invalid date (expected YYYY-MM-DD)'];
                }
            }
        }

        // Age
        if (array_key_exists('age', $row) && $row['age'] !== null && $row['age'] !== '') {
            $age = $row['age'];
            if (is_numeric($age)) {
                $n = (int) $age;
                if ($n < 1 || $n > 100) {
                    $errors[] = ['row' => $rowNumber, 'field' => 'age', 'message' => 'Age must be between 1 and 100'];
                }
            } else {
                $errors[] = ['row' => $rowNumber, 'field' => 'age', 'message' => 'Age must be a number'];
            }
        }

        return $errors;
    }

    private function validateAdmissionFields(array $row, int $rowNumber): array
    {
        $errors = [];

        $enrollmentStatus = $row['enrollment_status'] ?? null;
        if (is_string($enrollmentStatus) && trim($enrollmentStatus) !== '' && !in_array(strtolower(trim($enrollmentStatus)), self::ENROLLMENT_STATUS, true)) {
            $errors[] = ['row' => $rowNumber, 'field' => 'enrollment_status', 'message' => 'Invalid enrollment_status'];
        }

        if (array_key_exists('is_boarder', $row) && $row['is_boarder'] !== null && $row['is_boarder'] !== '') {
            $parsed = $this->parseBoolean($row['is_boarder']);
            if ($parsed === null) {
                $errors[] = ['row' => $rowNumber, 'field' => 'is_boarder', 'message' => 'Invalid boolean value'];
            }
        }

        if (array_key_exists('admission_date', $row) && $row['admission_date'] !== null && $row['admission_date'] !== '') {
            $parsed = $this->parseDateYmd($row['admission_date']);
            if ($parsed === null) {
                $errors[] = ['row' => $rowNumber, 'field' => 'admission_date', 'message' => 'Invalid date (expected YYYY-MM-DD)'];
            }
        }

        return $errors;
    }

    private function findSheetMeta(array $sheetsMeta, string $sheetName): array
    {
        foreach ($sheetsMeta as $sm) {
            if (is_array($sm) && ($sm['sheet_name'] ?? null) === $sheetName) {
                return $sm;
            }
        }
        return [];
    }

    private function getSheetDefaults(array $sheetMeta): array
    {
        $defaults = $sheetMeta['defaults'] ?? null;
        return is_array($defaults) ? $defaults : [];
    }

    private function deriveClassIdFromClassAcademicYear(string $classAcademicYearId, string $organizationId): ?string
    {
        $inst = ClassAcademicYear::query()
            ->where('id', $classAcademicYearId)
            ->whereNull('deleted_at')
            ->first();
        if (!$inst) return null;

        // Org scoping: class_academic_years can be org-scoped; if present, must match.
        if ($inst->organization_id !== null && $inst->organization_id !== $organizationId) {
            return null;
        }

        return $inst->class_id;
    }

    /**
     * Normalize gender value to 'male' or 'female'.
     * Accepts: Male, male, MALE, M, m, Female, female, FEMALE, F, f, etc.
     *
     * @param string $value
     * @return string|null Returns 'male', 'female', or null if invalid
     */
    private function normalizeGender(string $value): ?string
    {
        $normalized = strtolower(trim($value));
        
        // Handle single letter abbreviations
        if ($normalized === 'm') return 'male';
        if ($normalized === 'f') return 'female';
        
        // Handle full words (case-insensitive)
        if ($normalized === 'male') return 'male';
        if ($normalized === 'female') return 'female';
        
        // Handle common misspellings or partial matches
        // Male variations
        if (str_starts_with($normalized, 'mal')) return 'male';
        // Female variations
        if (str_starts_with($normalized, 'fem')) return 'female';
        
        return null;
    }

    private function parseBoolean(mixed $value): ?bool
    {
        if (is_bool($value)) return $value;
        if (is_int($value)) return $value === 1 ? true : ($value === 0 ? false : null);
        if (is_float($value)) return ((int) $value) === 1 ? true : (((int) $value) === 0 ? false : null);
        if (is_string($value)) {
            $v = strtolower(trim($value));
            if (in_array($v, ['1', 'true', 'yes', 'y'], true)) return true;
            if (in_array($v, ['0', 'false', 'no', 'n'], true)) return false;
        }
        return null;
    }

    private function parseDateYmd(mixed $value): ?string
    {
        if ($value instanceof \DateTimeInterface) {
            return $value->format('Y-m-d');
        }
        if (is_string($value)) {
            $v = trim($value);
            if ($v === '') return null;
            $dt = \DateTime::createFromFormat('Y-m-d', $v);
            if ($dt && $dt->format('Y-m-d') === $v) {
                return $v;
            }
            // Try common alternative: d/m/Y
            $dt2 = \DateTime::createFromFormat('d/m/Y', $v);
            if ($dt2) {
                return $dt2->format('Y-m-d');
            }
            return null;
        }
        if (is_numeric($value)) {
            try {
                $dt = ExcelDate::excelToDateTimeObject((float) $value);
                return $dt->format('Y-m-d');
            } catch (\Exception $e) {
                return null;
            }
        }
        return null;
    }

    private function normalizeCellValue(mixed $raw, string $key, ?string $formatted): mixed
    {
        // Prefer formatted for strings, but keep raw for numeric/date conversions
        if ($raw === null) return null;

        // Normalize Excel formulas results etc.
        if (is_string($raw)) {
            $trim = trim($raw);
            return $trim === '' ? null : $trim;
        }

        // For date-ish fields, try to convert Excel serial numbers to dates
        if (in_array($key, ['birth_date', 'admission_date'], true)) {
            if (is_numeric($raw)) {
                try {
                    $dt = ExcelDate::excelToDateTimeObject((float) $raw);
                    return $dt->format('Y-m-d');
                } catch (\Exception $e) {
                    // If conversion fails, keep as numeric for parseDateYmd to handle
                    return $raw;
                }
            }
            if (is_string($formatted) && trim($formatted) !== '') {
                return trim($formatted);
            }
        }

        // For other numeric values, convert to string for consistency
        if (is_numeric($raw)) {
            // Keep as-is for now, but ensure it's not treated as empty
            return $raw;
        }

        // For boolean values, keep as-is
        if (is_bool($raw)) {
            return $raw;
        }

        // For other types, convert to string
        return $raw;
    }

    /**
     * Commit import (create-only) after validating.
     *
     * @return array{created_students:int, created_admissions:int}
     */
    public function commit(array $parsed, string $organizationId, string $schoolId): array
    {
        $validation = $this->validateImport($parsed, $organizationId);
        if (!($validation['is_valid'] ?? false)) {
            throw new \RuntimeException('Import validation failed');
        }

        $meta = $parsed['meta'] ?? [];
        $sheetsMeta = is_array($meta['sheets'] ?? null) ? $meta['sheets'] : [];

        // Get valid row numbers from validation result to only process valid rows
        $validRowNumbersBySheet = [];
        foreach ($validation['sheets'] ?? [] as $sheetResult) {
            $validRowNumbersBySheet[$sheetResult['sheet_name']] = $sheetResult['valid_row_numbers'] ?? [];
        }

        $createdStudents = 0;
        $createdAdmissions = 0;

        DB::transaction(function () use ($parsed, $sheetsMeta, $organizationId, $schoolId, $validRowNumbersBySheet, &$createdStudents, &$createdAdmissions) {
            foreach (($parsed['sheets'] ?? []) as $sheet) {
                $sheetName = (string) ($sheet['sheet_name'] ?? 'Sheet');
                $rows = is_array($sheet['rows'] ?? null) ? $sheet['rows'] : [];
                
                // Get valid row numbers for this sheet
                $validRowNumbers = $validRowNumbersBySheet[$sheetName] ?? [];

                $sheetMeta = $this->findSheetMeta($sheetsMeta, $sheetName);
                $metaAcademicYearId = $sheetMeta['academic_year_id'] ?? null;
                $metaClassAcademicYearId = $sheetMeta['class_academic_year_id'] ?? null;
                $metaClassId = $sheetMeta['class_id'] ?? null;
                $sheetDefaults = $this->getSheetDefaults($sheetMeta);

                foreach ($rows as $row) {
                    $rowNumber = (int) ($row['__row'] ?? 0);
                    
                    // Only process rows that are in the valid row numbers list
                    if (!in_array($rowNumber, $validRowNumbers, true)) {
                        continue;
                    }
                    
                    $studentData = $this->buildStudentInsert($row, $organizationId, $schoolId);
                    $student = Student::create($studentData);
                    $createdStudents++;

                    $resolvedAcademicYearId = $metaAcademicYearId ?? ($row['academic_year_id'] ?? null);
                    $resolvedClassAcademicYearId = $metaClassAcademicYearId ?? ($row['class_academic_year_id'] ?? null);
                    $resolvedClassId = $metaClassId ?? ($row['class_id'] ?? null);

                    $hasAdmissionContext = ($resolvedAcademicYearId || $resolvedClassAcademicYearId || $resolvedClassId);
                    if ($hasAdmissionContext && is_string($resolvedAcademicYearId) && trim($resolvedAcademicYearId) !== '') {
                        if ($resolvedClassAcademicYearId && !$resolvedClassId) {
                            $resolvedClassId = $this->deriveClassIdFromClassAcademicYear((string) $resolvedClassAcademicYearId, $organizationId);
                        }

                        $admissionData = $this->buildAdmissionInsert(
                            $row,
                            $student->id,
                            $organizationId,
                            $schoolId,
                            (string) $resolvedAcademicYearId,
                            $resolvedClassId ? (string) $resolvedClassId : null,
                            $resolvedClassAcademicYearId ? (string) $resolvedClassAcademicYearId : null,
                            $sheetDefaults,
                        );

                        StudentAdmission::create($admissionData);
                        $createdAdmissions++;
                    }
                }
            }
        });

        return [
            'created_students' => $createdStudents,
            'created_admissions' => $createdAdmissions,
        ];
    }

    private function buildStudentInsert(array $row, string $organizationId, string $schoolId): array
    {
        $fullName = is_string($row['full_name'] ?? null) ? trim((string) $row['full_name']) : '';
        $fatherName = is_string($row['father_name'] ?? null) ? trim((string) $row['father_name']) : '';
        $genderRaw = is_string($row['gender'] ?? null) ? trim((string) $row['gender']) : '';
        // Normalize gender using the same method as validation
        $genderNormalized = $genderRaw !== '' ? $this->normalizeGender($genderRaw) : null;

        $admissionNo = is_string($row['admission_no'] ?? null) ? trim((string) $row['admission_no']) : '';
        $studentCode = is_string($row['student_code'] ?? null) ? trim((string) $row['student_code']) : '';

        // If admission_no is blank, generate a student_code and set admission_no = student_code
        if ($admissionNo === '') {
            if ($studentCode === '') {
                $studentCode = CodeGenerator::generateStudentCode($organizationId);
            }
            $admissionNo = $studentCode;
        }

        $data = [
            'organization_id' => $organizationId,
            'school_id' => $schoolId,
            'admission_no' => $admissionNo,
            'student_code' => $studentCode !== '' ? $studentCode : null,
            'full_name' => $fullName,
            'father_name' => $fatherName,
            'gender' => $genderNormalized ?? 'male', // Default to 'male' if not provided or invalid
        ];

        // Optional fields: pass through known keys if present
        $optional = [
            'card_number', 'grandfather_name', 'mother_name', 'birth_year', 'birth_date', 'age', 'admission_year',
            'orig_province', 'orig_district', 'orig_village', 'curr_province', 'curr_district', 'curr_village',
            'nationality', 'preferred_language', 'previous_school', 'guardian_name', 'guardian_relation', 'guardian_phone',
            'guardian_tazkira', 'home_address', 'zamin_name', 'zamin_phone', 'zamin_tazkira', 'zamin_address',
            'applying_grade', 'is_orphan', 'admission_fee_status', 'student_status', 'disability_status',
            'emergency_contact_name', 'emergency_contact_phone', 'family_income',
        ];

        foreach ($optional as $key) {
            if (!array_key_exists($key, $row)) continue;
            $val = $row[$key];

            if (in_array($key, ['birth_date'], true)) {
                $parsed = $this->parseDateYmd($val);
                $data[$key] = $parsed;
                continue;
            }

            if (in_array($key, ['is_orphan'], true)) {
                $parsed = $this->parseBoolean($val);
                $data[$key] = $parsed ?? false;
                continue;
            }

            if (in_array($key, ['age'], true)) {
                $data[$key] = is_numeric($val) ? (int) $val : null;
                continue;
            }

            if (is_string($val)) {
                $trim = trim($val);
                $data[$key] = $trim === '' ? null : $trim;
            } else {
                $data[$key] = $val;
            }
        }

        // Normalize enums to lowercase
        if (isset($data['admission_fee_status']) && is_string($data['admission_fee_status'])) {
            $data['admission_fee_status'] = strtolower(trim($data['admission_fee_status']));
        }
        if (isset($data['student_status']) && is_string($data['student_status'])) {
            $data['student_status'] = strtolower(trim($data['student_status']));
        }

        return $data;
    }

    private function buildAdmissionInsert(
        array $row,
        string $studentId,
        string $organizationId,
        string $schoolId,
        string $academicYearId,
        ?string $classId,
        ?string $classAcademicYearId,
        array $sheetDefaults = []
    ): array {
        $data = [
            'organization_id' => $organizationId,
            'school_id' => $schoolId,
            'student_id' => $studentId,
            'academic_year_id' => $academicYearId,
            'class_id' => $classId,
            'class_academic_year_id' => $classAcademicYearId,
            'admission_date' => now()->toDateString(),
            'enrollment_status' => 'admitted',
            'is_boarder' => false,
        ];

        // Apply sheet-level defaults (so user doesn't have to guess IDs)
        if (isset($sheetDefaults['room_id']) && is_string($sheetDefaults['room_id']) && trim($sheetDefaults['room_id']) !== '') {
            $data['room_id'] = trim($sheetDefaults['room_id']);
        }
        if (isset($sheetDefaults['residency_type_id']) && is_string($sheetDefaults['residency_type_id']) && trim($sheetDefaults['residency_type_id']) !== '') {
            $data['residency_type_id'] = trim($sheetDefaults['residency_type_id']);
        }
        if (isset($sheetDefaults['shift']) && is_string($sheetDefaults['shift']) && trim($sheetDefaults['shift']) !== '') {
            $data['shift'] = trim($sheetDefaults['shift']);
        }
        if (isset($sheetDefaults['enrollment_status']) && is_string($sheetDefaults['enrollment_status']) && trim($sheetDefaults['enrollment_status']) !== '') {
            $data['enrollment_status'] = strtolower(trim($sheetDefaults['enrollment_status']));
        }
        if (array_key_exists('is_boarder', $sheetDefaults) && $sheetDefaults['is_boarder'] !== null) {
            $parsed = $this->parseBoolean($sheetDefaults['is_boarder']);
            if ($parsed !== null) {
                $data['is_boarder'] = $parsed;
            }
        }

        $optional = [
            'residency_type_id', 'room_id', 'admission_year', 'admission_date', 'enrollment_status',
            'enrollment_type', 'shift', 'is_boarder', 'fee_status', 'placement_notes',
        ];

        foreach ($optional as $key) {
            if (!array_key_exists($key, $row)) continue;
            $val = $row[$key];

            if ($key === 'admission_date') {
                $parsed = $this->parseDateYmd($val);
                if ($parsed) $data['admission_date'] = $parsed;
                continue;
            }

            if ($key === 'is_boarder') {
                $parsed = $this->parseBoolean($val);
                if ($parsed !== null) $data['is_boarder'] = $parsed;
                continue;
            }

            if ($key === 'enrollment_status' && is_string($val)) {
                $data['enrollment_status'] = strtolower(trim($val));
                continue;
            }

            if (is_string($val)) {
                $trim = trim($val);
                $data[$key] = $trim === '' ? null : $trim;
            } else {
                $data[$key] = $val;
            }
        }

        return $data;
    }
}


