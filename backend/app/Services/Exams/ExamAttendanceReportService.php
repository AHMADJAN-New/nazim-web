<?php

namespace App\Services\Exams;

use App\Models\Exam;
use App\Models\ExamAttendance;
use App\Models\ExamStudent;
use App\Models\ExamSubject;
use App\Services\BrowsershotConfigurator;
use App\Services\Storage\FileStorageService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Spatie\Browsershot\Browsershot;

/**
 * Exam attendance report packs: one PDF/Excel file per class–subject inside a ZIP.
 */
class ExamAttendanceReportService
{
    public function __construct(
        private FileStorageService $fileStorageService
    ) {}

    public static function isAttendanceZipReportKey(string $reportKey): bool
    {
        return in_array($reportKey, ['exam_attendance_pdf_zip', 'exam_attendance_excel_zip'], true);
    }

    public static function isAttendanceSessionReportKey(string $reportKey): bool
    {
        return in_array($reportKey, ['exam_attendance_session_pdf', 'exam_attendance_session_excel'], true);
    }

    public static function isAttendanceReportKey(string $reportKey): bool
    {
        return self::isAttendanceZipReportKey($reportKey) || self::isAttendanceSessionReportKey($reportKey);
    }

    /**
     * @return array{path: string, filename: string, size: int, row_count: int}
     */
    public function generateStoredZip(
        string $reportKey,
        string $organizationId,
        string $schoolId,
        array $parameters,
        ?callable $progressCallback = null
    ): array {
        $examId = $parameters['exam_id'] ?? null;
        if (! is_string($examId) || $examId === '') {
            throw new \InvalidArgumentException('exam_id is required');
        }

        $format = $reportKey === 'exam_attendance_excel_zip' ? 'excel' : 'pdf';
        $this->extendTimeLimit(0);
        $this->reportProgress($progressCallback, 5, 'Loading attendance report data');

        $exam = Exam::where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->where('id', $examId)
            ->whereNull('deleted_at')
            ->first();

        if (! $exam) {
            throw new \InvalidArgumentException('Exam not found');
        }

        $schoolName = (string) (DB::table('school_branding')
            ->where('id', $schoolId)
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->value('school_name') ?? 'School');

        $units = $this->filterUnits(
            $this->buildClassSubjectUnits($organizationId, $schoolId, $examId, $exam->academic_year_id),
            $parameters
        );
        if ($units === []) {
            throw new \RuntimeException('No class–subject attendance units to export');
        }

        $examFolder = $this->sanitizeZipSegment($exam->name);
        $zipEntries = [];
        $totalRows = 0;
        $done = 0;
        $totalUnits = count($units);

        // Summary file first
        $summaryRows = array_map(static function (array $unit): array {
            return [
                'class' => $unit['class_label'],
                'subject' => $unit['subject_name'],
                'enrolled' => $unit['counts']['total'],
                'present' => $unit['counts']['present'],
                'absent' => $unit['counts']['absent'],
                'late' => $unit['counts']['late'],
                'excused' => $unit['counts']['excused'],
                'unmarked' => $unit['counts']['unmarked'],
            ];
        }, $units);

        if ($format === 'excel') {
            $zipEntries["{$examFolder}/_summary.xlsx"] = $this->buildExcelBinary(
                '_summary',
                'Attendance Summary — '.$exam->name,
                [
                    ['key' => 'class', 'label' => 'Class'],
                    ['key' => 'subject', 'label' => 'Subject'],
                    ['key' => 'enrolled', 'label' => 'Enrolled'],
                    ['key' => 'present', 'label' => 'Present'],
                    ['key' => 'absent', 'label' => 'Absent'],
                    ['key' => 'late', 'label' => 'Late'],
                    ['key' => 'excused', 'label' => 'Excused'],
                    ['key' => 'unmarked', 'label' => 'Unmarked'],
                ],
                $summaryRows
            );
        } else {
            $zipEntries["{$examFolder}/_summary.pdf"] = $this->htmlToPdfContent(
                view('reports.exam-attendance-summary', [
                    'title' => 'Exam Attendance Summary',
                    'schoolName' => $schoolName,
                    'examName' => $exam->name,
                    'rows' => $summaryRows,
                    'rtl' => true,
                ])->render()
            );
        }

        foreach ($units as $unit) {
            $rows = $unit['rows'];
            $totalRows += count($rows);
            $classSeg = $this->sanitizeZipSegment((string) ($unit['class_name'] ?? $unit['class_label'] ?? 'Unknown'));
            $sectionRaw = is_string($unit['section_name'] ?? null) ? trim($unit['section_name']) : '';
            $sectionSeg = $this->sanitizeZipSegment($sectionRaw !== '' ? $sectionRaw : '_');
            $subjectSeg = $this->sanitizeZipSegment((string) ($unit['subject_name'] ?? 'Unknown'));
            $entryDir = "{$examFolder}/attendance/{$classSeg}/{$sectionSeg}/{$subjectSeg}";
            $title = $exam->name.' — '.$unit['class_label'].' — '.$unit['subject_name'];

            if ($format === 'excel') {
                $zipEntries["{$entryDir}/attendance.xlsx"] = $this->buildExcelBinary(
                    'attendance',
                    $title,
                    [
                        ['key' => 'row_number', 'label' => '#'],
                        ['key' => 'student_name', 'label' => 'Student'],
                        ['key' => 'father_name', 'label' => 'Father'],
                        ['key' => 'roll_number', 'label' => 'Roll'],
                        ['key' => 'admission_no', 'label' => 'Admission'],
                        ['key' => 'status', 'label' => 'Status'],
                        ['key' => 'seat_number', 'label' => 'Seat'],
                        ['key' => 'notes', 'label' => 'Notes'],
                    ],
                    array_map(static function (array $row, int $i): array {
                        return [
                            'row_number' => $i + 1,
                            'student_name' => $row['student_name'],
                            'father_name' => $row['father_name'],
                            'roll_number' => $row['roll_number'],
                            'admission_no' => $row['admission_no'],
                            'status' => $row['status'],
                            'seat_number' => $row['seat_number'],
                            'notes' => $row['notes'],
                        ];
                    }, $rows, array_keys($rows))
                );
            } else {
                $zipEntries["{$entryDir}/attendance.pdf"] = $this->htmlToPdfContent(
                    view('reports.exam-attendance-class-subject', [
                        'title' => 'Exam Attendance',
                        'schoolName' => $schoolName,
                        'examName' => $exam->name,
                        'classLabel' => $unit['class_label'],
                        'subjectName' => $unit['subject_name'],
                        'sessionLabel' => $unit['session_label'],
                        'counts' => $unit['counts'],
                        'rows' => $rows,
                        'rtl' => true,
                    ])->render()
                );
            }

            $done++;
            $this->reportProgress(
                $progressCallback,
                10 + (75 * ($done / max(1, $totalUnits))),
                "Generated {$done}/{$totalUnits} class–subject files"
            );
        }

        $filename = 'exam-attendance-'.$format.'-'.Str::slug($exam->name).'-'.now()->format('Ymd-His').'.zip';

        return $this->storeZipArchive(
            $zipEntries,
            $filename,
            $organizationId,
            $schoolId,
            'exam_attendance_'.$format.'_zip',
            $totalRows,
            $progressCallback
        );
    }

    /**
     * One combined PDF/Excel for all classes in a Hall session (date + start time).
     *
     * @return array{path: string, filename: string, size: int, row_count: int}
     */
    public function generateStoredSessionReport(
        string $reportKey,
        string $organizationId,
        string $schoolId,
        array $parameters,
        ?callable $progressCallback = null
    ): array {
        $examId = $parameters['exam_id'] ?? null;
        $sessionDate = $parameters['session_date'] ?? null;
        $sessionStart = $parameters['session_start_time'] ?? null;

        if (! is_string($examId) || $examId === '') {
            throw new \InvalidArgumentException('exam_id is required');
        }
        if (! is_string($sessionDate) || $sessionDate === '') {
            throw new \InvalidArgumentException('session_date is required');
        }
        if (! is_string($sessionStart) || $sessionStart === '') {
            throw new \InvalidArgumentException('session_start_time is required');
        }

        $format = $reportKey === 'exam_attendance_session_excel' ? 'excel' : 'pdf';
        $this->extendTimeLimit(0);
        $this->reportProgress($progressCallback, 10, 'Loading session attendance');

        $exam = Exam::where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->where('id', $examId)
            ->whereNull('deleted_at')
            ->first();

        if (! $exam) {
            throw new \InvalidArgumentException('Exam not found');
        }

        $schoolName = (string) (DB::table('school_branding')
            ->where('id', $schoolId)
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->value('school_name') ?? 'School');

        $units = $this->filterUnits(
            $this->buildClassSubjectUnits($organizationId, $schoolId, $examId, $exam->academic_year_id),
            [
                'session_date' => $sessionDate,
                'session_start_time' => $sessionStart,
            ]
        );

        if ($units === []) {
            throw new \RuntimeException('No attendance units found for this session');
        }

        $this->reportProgress($progressCallback, 40, 'Building combined session report');

        $sessionLabel = trim(
            $this->normalizeDate($sessionDate).' '.$this->normalizeTime($sessionStart)
        );

        $totalRows = 0;
        $totals = [
            'present' => 0,
            'absent' => 0,
            'late' => 0,
            'excused' => 0,
            'unmarked' => 0,
            'total' => 0,
        ];
        foreach ($units as $unit) {
            $totalRows += count($unit['rows']);
            foreach ($totals as $key => $_) {
                $totals[$key] += (int) ($unit['counts'][$key] ?? 0);
            }
        }

        if ($format === 'excel') {
            $flatRows = [];
            foreach ($units as $unit) {
                foreach ($unit['rows'] as $i => $row) {
                    $flatRows[] = [
                        'class' => $unit['class_label'],
                        'subject' => $unit['subject_name'],
                        'row_number' => $i + 1,
                        'student_name' => $row['student_name'],
                        'father_name' => $row['father_name'],
                        'roll_number' => $row['roll_number'],
                        'admission_no' => $row['admission_no'],
                        'status' => $row['status'],
                        'seat_number' => $row['seat_number'],
                        'notes' => $row['notes'],
                    ];
                }
            }

            $content = $this->buildExcelBinary(
                'Session',
                'Hall Session Attendance — '.$exam->name.' — '.$sessionLabel,
                [
                    ['key' => 'class', 'label' => 'Class'],
                    ['key' => 'subject', 'label' => 'Subject'],
                    ['key' => 'row_number', 'label' => '#'],
                    ['key' => 'student_name', 'label' => 'Student'],
                    ['key' => 'father_name', 'label' => 'Father'],
                    ['key' => 'roll_number', 'label' => 'Roll'],
                    ['key' => 'admission_no', 'label' => 'Admission'],
                    ['key' => 'status', 'label' => 'Status'],
                    ['key' => 'seat_number', 'label' => 'Seat'],
                    ['key' => 'notes', 'label' => 'Notes'],
                ],
                $flatRows
            );
            $extension = 'xlsx';
        } else {
            $content = $this->htmlToPdfContent(
                view('reports.exam-attendance-session', [
                    'title' => 'Hall Session Attendance',
                    'schoolName' => $schoolName,
                    'examName' => $exam->name,
                    'sessionLabel' => $sessionLabel,
                    'totals' => $totals,
                    'units' => $units,
                    'rtl' => true,
                ])->render()
            );
            $extension = 'pdf';
        }

        $this->reportProgress($progressCallback, 90, 'Storing session report');

        $filename = 'exam-attendance-session-'.$format.'-'.Str::slug($exam->name).'-'.now()->format('Ymd-His').'.'.$extension;
        $path = $this->fileStorageService->storeReport(
            $content,
            $filename,
            $organizationId,
            $schoolId,
            'exam_attendance_session_'.$format
        );

        return [
            'path' => $path,
            'filename' => $filename,
            'size' => strlen($content),
            'row_count' => $totalRows,
        ];
    }

    /**
     * Matrix of every exam class × subject with counts (includes unmarked).
     *
     * @return list<array<string, mixed>>
     */
    public function buildClassSubjectMatrix(
        string $organizationId,
        string $schoolId,
        string $examId,
        ?string $academicYearId
    ): array {
        $units = $this->buildClassSubjectUnits($organizationId, $schoolId, $examId, $academicYearId, false);

        return array_map(static function (array $unit): array {
            return [
                'exam_class_id' => $unit['exam_class_id'],
                'exam_subject_id' => $unit['exam_subject_id'],
                'class_name' => $unit['class_name'],
                'section_name' => $unit['section_name'],
                'class_label' => $unit['class_label'],
                'subject_name' => $unit['subject_name'],
                'date' => $unit['date'],
                'start_time' => $unit['start_time'],
                'end_time' => $unit['end_time'],
                'enrolled' => $unit['counts']['total'],
                'present' => $unit['counts']['present'],
                'absent' => $unit['counts']['absent'],
                'late' => $unit['counts']['late'],
                'excused' => $unit['counts']['excused'],
                'unmarked' => $unit['counts']['unmarked'],
            ];
        }, $units);
    }

    /**
     * @return array{exam_class_id: string, exam_subject_id: string, class_label: string, subject_name: string, session_label: string|null, counts: array<string, int>, rows: list<array<string, mixed>>}|null
     */
    public function buildClassSubjectDetail(
        string $organizationId,
        string $schoolId,
        string $examId,
        string $examClassId,
        string $examSubjectId,
        ?string $academicYearId
    ): ?array {
        $units = $this->buildClassSubjectUnits($organizationId, $schoolId, $examId, $academicYearId, true);
        foreach ($units as $unit) {
            if ($unit['exam_class_id'] === $examClassId && $unit['exam_subject_id'] === $examSubjectId) {
                return $unit;
            }
        }

        return null;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function buildClassSubjectUnits(
        string $organizationId,
        string $schoolId,
        string $examId,
        ?string $academicYearId,
        bool $includeRows = true
    ): array {
        $subjects = ExamSubject::query()
            ->where('exam_id', $examId)
            ->where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->whereNull('deleted_at')
            ->with([
                'subject',
                'examClass.classAcademicYear.class',
                'examTimes' => fn ($q) => $q->whereNull('deleted_at')->orderBy('date')->orderBy('start_time'),
            ])
            ->get();

        $units = [];

        foreach ($subjects as $examSubject) {
            $examClass = $examSubject->examClass;
            if (! $examClass || $examClass->deleted_at) {
                continue;
            }

            $className = $examClass->classAcademicYear?->class?->name ?? 'Unknown';
            $sectionName = $examClass->classAcademicYear?->section_name ?? '';
            $classLabel = trim($className.($sectionName !== '' ? ' '.$sectionName : ''));
            $subjectName = $examSubject->subject?->name ?? 'Unknown';

            $examStudents = ExamStudent::with(['studentAdmission.student'])
                ->where('exam_id', $examId)
                ->where('exam_class_id', $examClass->id)
                ->where('organization_id', $organizationId)
                ->where('school_id', $schoolId)
                ->whereNull('deleted_at')
                ->withLiveActiveAdmission(is_string($academicYearId) ? $academicYearId : null)
                ->get();

            if ($examStudents->isEmpty()) {
                continue;
            }

            $attendanceByStudent = ExamAttendance::query()
                ->where('exam_id', $examId)
                ->where('exam_class_id', $examClass->id)
                ->where('exam_subject_id', $examSubject->id)
                ->where('organization_id', $organizationId)
                ->where('school_id', $schoolId)
                ->whereNull('deleted_at')
                ->get()
                ->keyBy('student_id');

            $counts = [
                'present' => 0,
                'absent' => 0,
                'late' => 0,
                'excused' => 0,
                'unmarked' => 0,
                'total' => $examStudents->count(),
            ];

            $rows = [];
            foreach ($examStudents as $examStudent) {
                $student = $examStudent->studentAdmission->student ?? null;
                if (! $student) {
                    continue;
                }

                $attendance = $attendanceByStudent->get($student->id);
                $statusKey = $attendance?->status;
                if ($statusKey && isset($counts[$statusKey])) {
                    $counts[$statusKey]++;
                } else {
                    $counts['unmarked']++;
                    $statusKey = 'unmarked';
                }

                if ($includeRows) {
                    $rows[] = [
                        'student_id' => $student->id,
                        'student_name' => $student->full_name ?? '-',
                        'father_name' => $student->father_name ?? '-',
                        'roll_number' => $examStudent->exam_roll_number ?? '-',
                        'admission_no' => $student->admission_no ?? '-',
                        'status' => $this->statusLabel($statusKey),
                        'status_key' => $statusKey,
                        'seat_number' => $attendance?->seat_number ?? '-',
                        'notes' => $attendance?->notes ?? '-',
                    ];
                }
            }

            // Recompute total from actual student rows loaded
            if ($includeRows) {
                $counts['total'] = count($rows);
            }

            usort($rows, static function (array $a, array $b): int {
                return strnatcasecmp((string) $a['roll_number'], (string) $b['roll_number'])
                    ?: strcasecmp((string) $a['student_name'], (string) $b['student_name']);
            });

            $firstTime = $examSubject->examTimes->first();
            $date = $firstTime?->date ? $this->normalizeDate((string) $firstTime->date) : null;
            $startTime = $firstTime?->start_time ? $this->normalizeTime((string) $firstTime->start_time) : null;
            $endTime = $firstTime?->end_time ? $this->normalizeTime((string) $firstTime->end_time) : null;
            $sessionLabel = null;
            if ($date || $startTime) {
                $sessionLabel = trim(
                    ($date ?? '').
                    ($startTime ? ' '.$startTime : '').
                    ($endTime ? ' – '.$endTime : '')
                );
            }

            $units[] = [
                'exam_class_id' => $examClass->id,
                'exam_subject_id' => $examSubject->id,
                'class_name' => $className,
                'section_name' => $sectionName !== '' ? $sectionName : null,
                'class_label' => $classLabel !== '' ? $classLabel : 'Unknown',
                'subject_name' => $subjectName,
                'date' => $date,
                'start_time' => $startTime,
                'end_time' => $endTime,
                'session_label' => $sessionLabel !== '' ? $sessionLabel : null,
                'counts' => $counts,
                'rows' => $rows,
            ];
        }

        usort($units, static function (array $a, array $b): int {
            return strcasecmp($a['class_label'], $b['class_label'])
                ?: strcasecmp($a['subject_name'], $b['subject_name']);
        });

        return $units;
    }

    /**
     * @param  list<array<string, mixed>>  $units
     * @return list<array<string, mixed>>
     */
    private function filterUnits(array $units, array $parameters): array
    {
        $examClassId = is_string($parameters['exam_class_id'] ?? null) ? $parameters['exam_class_id'] : null;
        $examSubjectId = is_string($parameters['exam_subject_id'] ?? null) ? $parameters['exam_subject_id'] : null;
        $sessionDate = is_string($parameters['session_date'] ?? null)
            ? $this->normalizeDate($parameters['session_date'])
            : null;
        $sessionStart = is_string($parameters['session_start_time'] ?? null)
            ? $this->normalizeTime($parameters['session_start_time'])
            : null;

        if ($examClassId === '' || $examClassId === 'all') {
            $examClassId = null;
        }
        if ($examSubjectId === '' || $examSubjectId === 'all') {
            $examSubjectId = null;
        }
        if ($sessionDate === '') {
            $sessionDate = null;
        }
        if ($sessionStart === '') {
            $sessionStart = null;
        }

        return array_values(array_filter($units, static function (array $unit) use ($examClassId, $examSubjectId, $sessionDate, $sessionStart): bool {
            if ($examClassId !== null && ($unit['exam_class_id'] ?? null) !== $examClassId) {
                return false;
            }
            if ($examSubjectId !== null && ($unit['exam_subject_id'] ?? null) !== $examSubjectId) {
                return false;
            }
            if ($sessionDate !== null && ($unit['date'] ?? null) !== $sessionDate) {
                return false;
            }
            if ($sessionStart !== null && ($unit['start_time'] ?? null) !== $sessionStart) {
                return false;
            }

            return true;
        }));
    }

    private function normalizeDate(string $value): string
    {
        $value = trim($value);
        if ($value === '') {
            return '';
        }

        return substr($value, 0, 10);
    }

    private function normalizeTime(string $value): string
    {
        $value = trim($value);
        if ($value === '') {
            return '';
        }
        // HH:MM or HH:MM:SS → HH:MM
        if (preg_match('/^(\d{1,2}:\d{2})/', $value, $matches) === 1) {
            $parts = explode(':', $matches[1]);

            return sprintf('%02d:%02d', (int) $parts[0], (int) $parts[1]);
        }

        return $value;
    }

    private function statusLabel(string $statusKey): string
    {
        return match ($statusKey) {
            'present' => 'Present',
            'absent' => 'Absent',
            'late' => 'Late',
            'excused' => 'Excused',
            default => 'Not marked',
        };
    }

    /**
     * @param  list<array{key: string, label: string}>  $columns
     * @param  list<array<string, mixed>>  $rows
     */
    private function buildExcelBinary(string $sheetTitle, string $title, array $columns, array $rows): string
    {
        $spreadsheet = new Spreadsheet;
        $spreadsheet->getDefaultStyle()->getFont()->setName('Bahij Nassim');
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle($this->sanitizeSheetTitle($sheetTitle));
        $sheet->setRightToLeft(true);

        $sheet->setCellValue('A1', $title);
        $sheet->mergeCells('A1:'.chr(64 + max(1, count($columns))).'1');

        $colIndex = 1;
        foreach ($columns as $column) {
            $sheet->setCellValue(Coordinate::stringFromColumnIndex($colIndex).'2', $column['label']);
            $colIndex++;
        }

        $rowIndex = 3;
        foreach ($rows as $row) {
            $colIndex = 1;
            foreach ($columns as $column) {
                $sheet->setCellValue(
                    Coordinate::stringFromColumnIndex($colIndex).$rowIndex,
                    $row[$column['key']] ?? ''
                );
                $colIndex++;
            }
            $rowIndex++;
        }

        $tempDir = storage_path('app/temp/exam-attendance-xlsx');
        if (! is_dir($tempDir) && ! mkdir($tempDir, 0775, true) && ! is_dir($tempDir)) {
            throw new \RuntimeException("Failed to create temp directory: {$tempDir}");
        }
        $tempPath = $tempDir.DIRECTORY_SEPARATOR.Str::uuid()->toString().'.xlsx';
        (new Xlsx($spreadsheet))->save($tempPath);
        $content = file_get_contents($tempPath);
        @unlink($tempPath);
        $spreadsheet->disconnectWorksheets();

        if ($content === false || $content === '') {
            throw new \RuntimeException('Generated Excel file was empty');
        }

        return $content;
    }

    private function htmlToPdfContent(string $html): string
    {
        $tempDir = storage_path('app/temp/exam-attendance-pdfs');
        if (! is_dir($tempDir) && ! mkdir($tempDir, 0775, true) && ! is_dir($tempDir)) {
            throw new \RuntimeException("Failed to create temp directory: {$tempDir}");
        }

        $tempPath = $tempDir.DIRECTORY_SEPARATOR.Str::uuid()->toString().'.pdf';

        try {
            try {
                if (! class_exists(Browsershot::class)) {
                    throw new \RuntimeException('Browsershot is not available');
                }
                $browsershot = Browsershot::html($html)
                    ->showBackground()
                    ->margins(10, 10, 10, 10)
                    ->emulateMedia('print')
                    ->format('A4')
                    ->setDelay(300)
                    ->timeout(120);
                BrowsershotConfigurator::apply($browsershot, [
                    'disable-web-security',
                    'disable-features=FontLoading',
                ]);
                $browsershot->save($tempPath);
            } catch (\Throwable $e) {
                Log::warning('Exam attendance PDF Browsershot failed; falling back to DomPDF', [
                    'message' => $e->getMessage(),
                ]);
                Pdf::setOptions([
                    'isRemoteEnabled' => true,
                    'isHtml5ParserEnabled' => true,
                    'defaultFont' => 'DejaVu Sans',
                ])->loadHTML($html)->setPaper('A4', 'portrait')->save($tempPath);
            }
        } catch (\Throwable $e) {
            @unlink($tempPath);
            throw $e;
        }

        $content = file_exists($tempPath) ? file_get_contents($tempPath) : false;
        @unlink($tempPath);

        if ($content === false || $content === '') {
            throw new \RuntimeException('Generated exam attendance PDF was empty');
        }

        return $content;
    }

    /**
     * @param  array<string, string>  $zipEntries
     * @return array{path: string, filename: string, size: int, row_count: int}
     */
    private function storeZipArchive(
        array $zipEntries,
        string $filename,
        string $organizationId,
        string $schoolId,
        string $reportType,
        int $rowCount,
        ?callable $progressCallback
    ): array {
        $this->reportProgress($progressCallback, 90, 'Packaging ZIP');

        $tempDir = storage_path('app/temp/exam-attendance-zips');
        if (! is_dir($tempDir) && ! mkdir($tempDir, 0775, true) && ! is_dir($tempDir)) {
            throw new \RuntimeException("Failed to create temp directory: {$tempDir}");
        }

        $tempZipPath = $tempDir.DIRECTORY_SEPARATOR.Str::uuid()->toString().'.zip';
        $zip = new \ZipArchive;
        if ($zip->open($tempZipPath, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) !== true) {
            throw new \RuntimeException('Unable to create ZIP archive');
        }

        foreach ($zipEntries as $entryPath => $content) {
            $zip->addFromString($entryPath, $content);
        }
        $zip->close();

        $zipContent = file_get_contents($tempZipPath);
        @unlink($tempZipPath);

        if ($zipContent === false || $zipContent === '') {
            throw new \RuntimeException('Generated ZIP was empty');
        }

        $this->reportProgress($progressCallback, 95, 'Storing ZIP');

        $path = $this->fileStorageService->storeReport(
            $zipContent,
            $filename,
            $organizationId,
            $schoolId,
            $reportType
        );

        return [
            'path' => $path,
            'filename' => $filename,
            'size' => strlen($zipContent),
            'row_count' => $rowCount,
        ];
    }

    private function sanitizeZipSegment(string $value): string
    {
        $value = trim($value);
        if ($value === '') {
            return '_';
        }
        $value = str_replace(['/', '\\', ':', '*', '?', '"', '<', '>', '|'], '-', $value);
        $value = preg_replace('/[\x00-\x1F\x7F]+/u', '', $value) ?? $value;
        $value = preg_replace('/\s+/u', ' ', $value) ?? $value;
        $value = trim($value, " .\t\n\r\0\x0B");

        return $value !== '' ? $value : '_';
    }

    private function sanitizeSheetTitle(string $value): string
    {
        $value = $this->sanitizeZipSegment($value);
        if (mb_strlen($value) > 31) {
            $value = mb_substr($value, 0, 31);
        }

        return $value !== '' ? $value : 'Sheet';
    }

    private function reportProgress(?callable $progressCallback, float $progress, string $message): void
    {
        if ($progressCallback) {
            $progressCallback($progress, $message);
        }
    }

    private function extendTimeLimit(int $seconds): void
    {
        if (function_exists('set_time_limit')) {
            @ini_set('max_execution_time', (string) $seconds);
            @set_time_limit($seconds);
        }
    }
}
