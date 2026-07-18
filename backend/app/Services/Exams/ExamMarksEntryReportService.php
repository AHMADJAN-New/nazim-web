<?php

namespace App\Services\Exams;

use App\Models\Exam;
use App\Models\ExamStudent;
use App\Models\ExamSubject;
use App\Services\Reports\ReportConfig;
use App\Services\Reports\ReportService;
use App\Services\Storage\FileStorageService;
use Illuminate\Support\Str;

/**
 * Blank marks-entry paper templates: one branded PDF/Excel per class–subject inside a ZIP.
 * Each sheet uses the standard ReportService branding pipeline (school header, logos, RTL fonts).
 */
class ExamMarksEntryReportService
{
    public const MODE_ROLL = 'roll';

    public const MODE_SECRET = 'secret';

    public const MODE_BOTH = 'both';

    public function __construct(
        private FileStorageService $fileStorageService
    ) {}

    public static function isMarksEntryZipReportKey(string $reportKey): bool
    {
        return in_array($reportKey, ['exam_marks_entry_pdf_zip', 'exam_marks_entry_excel_zip'], true);
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

        $mode = $this->normalizeStudentIdMode($parameters['student_id_mode'] ?? self::MODE_ROLL);
        $format = $reportKey === 'exam_marks_entry_excel_zip' ? 'excel' : 'pdf';
        $ext = $format === 'excel' ? 'xlsx' : 'pdf';
        // App UI default is Pashto; never fall back to Dari when language is omitted.
        $language = $this->normalizeLanguage($parameters['language'] ?? 'ps');
        $calendar = $this->normalizeCalendar($parameters['calendar_preference'] ?? 'jalali');
        $brandingId = is_string($parameters['branding_id'] ?? null) && $parameters['branding_id'] !== ''
            ? $parameters['branding_id']
            : $schoolId;

        $this->extendTimeLimit(0);
        $this->reportProgress($progressCallback, 5, 'Loading marks entry template data');

        $exam = Exam::where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->where('id', $examId)
            ->whereNull('deleted_at')
            ->first();

        if (! $exam) {
            throw new \InvalidArgumentException('Exam not found');
        }

        $units = $this->filterUnits(
            $this->buildClassSubjectUnits($organizationId, $schoolId, $examId, $exam->academic_year_id, $mode),
            $parameters
        );

        if ($units === []) {
            throw new \RuntimeException('No class–subject units to export for marks entry templates');
        }

        $labels = $this->labelsForLanguage($language);
        $columns = $this->columnsForMode($mode, $labels);
        $examFolder = $this->sanitizeZipSegment($exam->name);
        $zipEntries = [];
        $totalRows = 0;
        $done = 0;
        $totalUnits = count($units);

        // Lazy resolve to avoid circular DI (ReportService injects this service)
        /** @var ReportService $reportService */
        $reportService = app(ReportService::class);

        $summaryRows = array_map(static function (array $unit): array {
            return [
                'class' => $unit['class_label'],
                'subject' => $unit['subject_name'],
                'students' => $unit['student_count'],
                'total_marks' => $unit['total_marks'] ?? '',
                'passing_marks' => $unit['passing_marks'] ?? '',
            ];
        }, $units);

        $summaryTitle = $labels['summary_title'].' — '.$exam->name;
        $zipEntries["{$examFolder}/_summary.{$ext}"] = $this->renderBrandedSheet(
            $reportService,
            $format,
            $brandingId,
            $organizationId,
            $summaryTitle,
            $language,
            $calendar,
            [
                ['key' => 'class', 'label' => $labels['class']],
                ['key' => 'subject', 'label' => $labels['subject']],
                ['key' => 'students', 'label' => $labels['students']],
                ['key' => 'total_marks', 'label' => $labels['total_marks']],
                ['key' => 'passing_marks', 'label' => $labels['passing_marks']],
            ],
            $summaryRows,
            [
                'labels' => $labels,
                'is_summary' => true,
                'student_count' => array_sum(array_column($summaryRows, 'students')),
            ]
        );

        foreach ($units as $unit) {
            $rows = $unit['rows'];
            $totalRows += count($rows);
            $classSeg = $this->sanitizeZipSegment((string) ($unit['class_name'] ?? $unit['class_label'] ?? 'Unknown'));
            $sectionRaw = is_string($unit['section_name'] ?? null) ? trim($unit['section_name']) : '';
            $sectionSeg = $this->sanitizeZipSegment($sectionRaw !== '' ? $sectionRaw : '_');
            $subjectSeg = $this->sanitizeZipSegment((string) ($unit['subject_name'] ?? 'Unknown'));
            $entryDir = "{$examFolder}/marks-entry/{$classSeg}/{$sectionSeg}/{$subjectSeg}";
            $title = $exam->name.' — '.$unit['class_label'].' — '.$unit['subject_name'];

            $zipEntries["{$entryDir}/marks-entry.{$ext}"] = $this->renderBrandedSheet(
                $reportService,
                $format,
                $brandingId,
                $organizationId,
                $title,
                $language,
                $calendar,
                $columns,
                $rows,
                [
                    'labels' => $labels,
                    'is_summary' => false,
                    'student_count' => (int) ($unit['student_count'] ?? count($rows)),
                    'total_marks' => $unit['total_marks'] ?? null,
                    'passing_marks' => $unit['passing_marks'] ?? null,
                ]
            );

            $done++;
            $this->reportProgress(
                $progressCallback,
                10 + (75 * ($done / max(1, $totalUnits))),
                "Generated {$done}/{$totalUnits} class–subject templates"
            );
        }

        $filename = 'exam-marks-entry-'.$format.'-'.Str::slug($exam->name).'-'.now()->format('Ymd-His').'.zip';

        return $this->storeZipArchive(
            $zipEntries,
            $filename,
            $organizationId,
            $schoolId,
            'exam_marks_entry_'.$format.'_zip',
            $totalRows,
            $progressCallback
        );
    }

    /**
     * @param  list<array{key: string, label: string}>  $columns
     * @param  list<array<string, mixed>>  $rows
     * @param  array{
     *     labels?: array<string, string>,
     *     is_summary?: bool,
     *     student_count?: int,
     *     total_marks?: mixed,
     *     passing_marks?: mixed
     * }  $sheetMeta
     */
    private function renderBrandedSheet(
        ReportService $reportService,
        string $format,
        string $brandingId,
        string $organizationId,
        string $title,
        string $language,
        string $calendar,
        array $columns,
        array $rows,
        array $sheetMeta = []
    ): string {
        $labels = $sheetMeta['labels'] ?? $this->labelsForLanguage($language);
        $isSummary = (bool) ($sheetMeta['is_summary'] ?? false);
        $studentCount = (int) ($sheetMeta['student_count'] ?? count($rows));

        $headerNotes = $this->buildHeaderNotes($labels, $isSummary, $studentCount, $sheetMeta);

        $config = ReportConfig::fromArray([
            'report_key' => 'exam_marks_entry_sheet',
            'report_type' => $format,
            'branding_id' => $brandingId,
            'title' => $title,
            'notes_mode' => 'none',
            'calendar_preference' => $calendar,
            'language' => $language,
            'column_config' => [
                'marks' => ['width' => 16],
                'absent' => ['width' => 12],
            ],
            'parameters' => [
                'school_id' => $brandingId,
                'empty_cell_placeholder' => '',
                'notes_header' => $headerNotes,
                'footer_html' => $isSummary ? null : $this->signatureBlockHtml($labels),
                'extra_css' => $this->marksEntryExtraCss(),
            ],
        ]);

        $result = $reportService->generateContentBinary(
            $config,
            [
                'columns' => $columns,
                'rows' => $rows,
            ],
            $organizationId
        );

        return $result['content'];
    }

    /**
     * @param  array<string, string>  $labels
     * @param  array<string, mixed>  $sheetMeta
     * @return list<string>
     */
    private function buildHeaderNotes(array $labels, bool $isSummary, int $studentCount, array $sheetMeta): array
    {
        if ($isSummary) {
            return [
                $labels['summary_note'],
                str_replace('{count}', (string) $studentCount, $labels['students_total_all']),
            ];
        }

        $summaryLine = str_replace('{count}', (string) $studentCount, $labels['students_total']);
        $totalMarks = $sheetMeta['total_marks'] ?? null;
        $passingMarks = $sheetMeta['passing_marks'] ?? null;
        if ($totalMarks !== null && $totalMarks !== '') {
            $summaryLine .= ' · '.str_replace('{n}', (string) $totalMarks, $labels['total_marks_line']);
        }
        if ($passingMarks !== null && $passingMarks !== '') {
            $summaryLine .= ' · '.str_replace('{n}', (string) $passingMarks, $labels['passing_marks_line']);
        }

        return [
            $labels['marks_entry_note'],
            $summaryLine,
            $labels['marks_entry_hint'],
        ];
    }

    /**
     * @param  array<string, string>  $labels
     */
    private function signatureBlockHtml(array $labels): string
    {
        $teacher = e($labels['teacher_signature']);
        $date = e($labels['date_signature']);

        return <<<HTML
<div class="marks-entry-signature" style="margin-top: 32px; width: 100%; page-break-inside: avoid;">
  <table style="width: 100%; border-collapse: collapse; border: none;">
    <tr>
      <td style="border: none; width: 50%; padding: 8px 16px 8px 0; vertical-align: top;">
        <div style="font-weight: 700; margin-bottom: 36px;">{$teacher}</div>
        <div style="border-bottom: 1.5px solid #222; width: 85%; height: 1px;"></div>
      </td>
      <td style="border: none; width: 50%; padding: 8px 0 8px 16px; vertical-align: top;">
        <div style="font-weight: 700; margin-bottom: 36px;">{$date}</div>
        <div style="border-bottom: 1.5px solid #222; width: 70%; height: 1px;"></div>
      </td>
    </tr>
  </table>
</div>
HTML;
    }

    private function marksEntryExtraCss(): string
    {
        return <<<'CSS'
.row-number {
    width: 48px !important;
    min-width: 48px !important;
    font-size: 13px !important;
    font-weight: 700 !important;
    text-align: center !important;
}
th.row-number {
    width: 48px !important;
}
.data-table tbody td {
    padding: 10px 6px !important;
    min-height: 30px;
    height: 32px;
}
.header-notes {
    margin: 8px 0 12px;
    padding: 8px 10px;
    border: 1px solid #d0d7e2;
    border-radius: 4px;
    background: #f7f9fc;
}
.header-notes .note-item {
    font-size: 12px;
    line-height: 1.55;
    margin-bottom: 3px;
}
.header-notes .note-item:first-child {
    font-weight: 700;
    color: #0b0b56;
}
.marks-entry-signature {
    margin-top: 28px;
}
CSS;
    }

    /**
     * Engine templates already add a # column — do not duplicate row_number here.
     *
     * @return list<array{key: string, label: string}>
     */
    private function columnsForMode(string $mode, ?array $labels = null): array
    {
        $labels = $labels ?? $this->labelsForLanguage('en');
        $columns = [];

        if ($mode === self::MODE_ROLL || $mode === self::MODE_BOTH) {
            $columns[] = ['key' => 'roll_number', 'label' => $labels['roll_number']];
        }
        if ($mode === self::MODE_SECRET || $mode === self::MODE_BOTH) {
            $columns[] = ['key' => 'secret_number', 'label' => $labels['secret_number']];
        }
        if ($mode === self::MODE_ROLL || $mode === self::MODE_BOTH) {
            $columns[] = ['key' => 'student_name', 'label' => $labels['student_name']];
            $columns[] = ['key' => 'father_name', 'label' => $labels['father_name']];
        }

        $columns[] = ['key' => 'marks', 'label' => $labels['marks']];
        $columns[] = ['key' => 'absent', 'label' => $labels['absent']];

        return $columns;
    }

    /**
     * @return array<string, string>
     */
    private function labelsForLanguage(string $language): array
    {
        $maps = [
            'en' => [
                'roll_number' => 'Roll Number',
                'secret_number' => 'Secret Number',
                'student_name' => 'Student Name',
                'father_name' => 'Father Name',
                'marks' => 'Marks',
                'absent' => 'Absent',
                'class' => 'Class',
                'subject' => 'Subject',
                'students' => 'Students',
                'total_marks' => 'Total Marks',
                'passing_marks' => 'Passing Marks',
                'summary_title' => 'Marks Entry Templates Summary',
                'marks_entry_note' => 'Marks entry sheet — fill Marks and Absent by pen. Do not use this page for seating or attendance.',
                'marks_entry_hint' => 'Leave Marks blank if the student is absent; mark Absent clearly (✓).',
                'students_total' => 'Total students on this sheet: {count}',
                'students_total_all' => 'Total students across selected sheets: {count}',
                'total_marks_line' => 'Total marks: {n}',
                'passing_marks_line' => 'Passing marks: {n}',
                'summary_note' => 'Index of marks-entry templates in this package.',
                'teacher_signature' => 'Teacher signature',
                'date_signature' => 'Date',
            ],
            'ps' => [
                'roll_number' => 'رول نمبر',
                'secret_number' => 'پټ نمبر',
                'student_name' => 'د زده‌کوونکي نوم',
                'father_name' => 'د پلار نوم',
                'marks' => 'نمرې',
                'absent' => 'غیرحاضر',
                'class' => 'ټولګی',
                'subject' => 'مضمون',
                'students' => 'زده‌کوونکي',
                'total_marks' => 'ټولې نمرې',
                'passing_marks' => 'د پاس نمرې',
                'summary_title' => 'د نمرو داخلولو پاڼو لنډیز',
                'marks_entry_note' => 'د نمرو داخلولو پاڼه — نمرې او غیرحاضرۍ په قلم ولیکئ. دا پاڼه د ناستې یا حاضرۍ لپاره نه ده.',
                'marks_entry_hint' => 'که زده‌کوونکی غیرحاضر وي نمرې خالي پرېږدئ؛ غیرحاضر په روښانه ډول علامت کړئ (✓).',
                'students_total' => 'په دې پاڼه کې ټول زده‌کوونکي: {count}',
                'students_total_all' => 'په ټولو پاڼو کې ټول زده‌کوونکي: {count}',
                'total_marks_line' => 'ټولې نمرې: {n}',
                'passing_marks_line' => 'د پاس نمرې: {n}',
                'summary_note' => 'په دې بسته کې د نمرو داخلولو پاڼو لړلیک.',
                'teacher_signature' => 'د ښوونکي لاسلیک',
                'date_signature' => 'نیټه',
            ],
            'fa' => [
                'roll_number' => 'شماره رول',
                'secret_number' => 'شماره سری',
                'student_name' => 'نام شاگرد',
                'father_name' => 'نام پدر',
                'marks' => 'نمرې',
                'absent' => 'غیرحاضر',
                'class' => 'صنف',
                'subject' => 'مضمون',
                'students' => 'شاگردان',
                'total_marks' => 'نمرې کل',
                'passing_marks' => 'نمرې پاس',
                'summary_title' => 'خلاصه قالب‌های ورود نمرې',
                'marks_entry_note' => 'برگه ورود نمرې — نمرې و غیرحاضری را با قلم بنویسید. این برگه برای نشستن یا حاضری نیست.',
                'marks_entry_hint' => 'اگر شاگرد غیرحاضر است نمرې را خالی بگذارید؛ غیرحاضر را واضح علامت بزنید (✓).',
                'students_total' => 'تعداد شاگردان در این برگه: {count}',
                'students_total_all' => 'مجموع شاگردان در برگه‌های انتخاب‌شده: {count}',
                'total_marks_line' => 'نمرې کل: {n}',
                'passing_marks_line' => 'نمرې پاس: {n}',
                'summary_note' => 'فهرست قالب‌های ورود نمرې در این بسته.',
                'teacher_signature' => 'امضای معلم',
                'date_signature' => 'تاریخ',
            ],
            'ar' => [
                'roll_number' => 'رقم الجلوس',
                'secret_number' => 'الرقم السري',
                'student_name' => 'اسم الطالب',
                'father_name' => 'اسم الأب',
                'marks' => 'الدرجات',
                'absent' => 'غائب',
                'class' => 'الصف',
                'subject' => 'المادة',
                'students' => 'الطلاب',
                'total_marks' => 'الدرجة الكاملة',
                'passing_marks' => 'درجة النجاح',
                'summary_title' => 'ملخص قوالب إدخال الدرجات',
                'marks_entry_note' => 'ورقة إدخال الدرجات — اكتب الدرجات والغياب بالقلم. هذه الورقة ليست للجلوس أو الحضور.',
                'marks_entry_hint' => 'اترك الدرجات فارغة إذا كان الطالب غائباً؛ علّم الغياب بوضوح (✓).',
                'students_total' => 'إجمالي الطلاب في هذه الورقة: {count}',
                'students_total_all' => 'إجمالي الطلاب عبر الأوراق المحددة: {count}',
                'total_marks_line' => 'الدرجة الكاملة: {n}',
                'passing_marks_line' => 'درجة النجاح: {n}',
                'summary_note' => 'فهرس قوالب إدخال الدرجات في هذه الحزمة.',
                'teacher_signature' => 'توقيع المعلم',
                'date_signature' => 'التاريخ',
            ],
        ];

        return $maps[$language] ?? $maps['ps'];
    }

    private function normalizeLanguage(mixed $language): string
    {
        $language = is_string($language) ? strtolower(trim($language)) : 'ps';

        // Accept common aliases from clients / Accept-Language
        $language = match ($language) {
            'pashto', 'pushto' => 'ps',
            'dari', 'farsi', 'persian' => 'fa',
            'arabic' => 'ar',
            'english' => 'en',
            default => $language,
        };

        return in_array($language, ['en', 'ps', 'fa', 'ar'], true) ? $language : 'ps';
    }

    private function normalizeCalendar(mixed $calendar): string
    {
        $calendar = is_string($calendar) ? strtolower(trim($calendar)) : 'jalali';

        return match ($calendar) {
            'gregorian' => 'gregorian',
            'qamari', 'hijri_qamari' => 'qamari',
            'jalali', 'shamsi', 'hijri_shamsi' => 'jalali',
            default => 'jalali',
        };
    }

    private function normalizeStudentIdMode(mixed $mode): string
    {
        $mode = is_string($mode) ? strtolower(trim($mode)) : self::MODE_ROLL;

        return in_array($mode, [self::MODE_ROLL, self::MODE_SECRET, self::MODE_BOTH], true)
            ? $mode
            : self::MODE_ROLL;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function buildClassSubjectUnits(
        string $organizationId,
        string $schoolId,
        string $examId,
        ?string $academicYearId,
        string $mode
    ): array {
        $subjects = ExamSubject::query()
            ->where('exam_id', $examId)
            ->where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->whereNull('deleted_at')
            ->with([
                'subject',
                'examClass.classAcademicYear.class',
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

            $rows = [];
            foreach ($examStudents as $examStudent) {
                $student = $examStudent->studentAdmission->student ?? null;
                if (! $student) {
                    continue;
                }

                $rows[] = [
                    'roll_number' => $examStudent->exam_roll_number ?? '',
                    'secret_number' => $examStudent->exam_secret_number ?? '',
                    'student_name' => $student->full_name ?? '',
                    'father_name' => $student->father_name ?? '',
                    'marks' => '',
                    'absent' => '',
                ];
            }

            if ($rows === []) {
                continue;
            }

            usort($rows, static function (array $a, array $b) use ($mode): int {
                if ($mode === self::MODE_SECRET) {
                    return strnatcasecmp((string) $a['secret_number'], (string) $b['secret_number'])
                        ?: strcasecmp((string) $a['student_name'], (string) $b['student_name']);
                }

                return strnatcasecmp((string) $a['roll_number'], (string) $b['roll_number'])
                    ?: strcasecmp((string) $a['student_name'], (string) $b['student_name']);
            });

            $rows = array_map(static function (array $row, int $index): array {
                $row['row_number'] = $index + 1;

                return $row;
            }, $rows, array_keys($rows));

            $units[] = [
                'exam_class_id' => $examClass->id,
                'exam_subject_id' => $examSubject->id,
                'class_name' => $className,
                'section_name' => $sectionName !== '' ? $sectionName : null,
                'class_label' => $classLabel !== '' ? $classLabel : 'Unknown',
                'subject_name' => $subjectName,
                'total_marks' => $examSubject->total_marks,
                'passing_marks' => $examSubject->passing_marks,
                'student_count' => count($rows),
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
        $classIds = $this->normalizeIdList($parameters['exam_class_ids'] ?? null);
        $subjectIds = $this->normalizeIdList($parameters['exam_subject_ids'] ?? null);

        $singleClass = is_string($parameters['exam_class_id'] ?? null) ? $parameters['exam_class_id'] : null;
        $singleSubject = is_string($parameters['exam_subject_id'] ?? null) ? $parameters['exam_subject_id'] : null;

        if ($singleClass !== null && $singleClass !== '' && $singleClass !== 'all') {
            $classIds[] = $singleClass;
        }
        if ($singleSubject !== null && $singleSubject !== '' && $singleSubject !== 'all') {
            $subjectIds[] = $singleSubject;
        }

        $classIds = array_values(array_unique(array_filter($classIds)));
        $subjectIds = array_values(array_unique(array_filter($subjectIds)));

        return array_values(array_filter($units, static function (array $unit) use ($classIds, $subjectIds): bool {
            if ($classIds !== [] && ! in_array($unit['exam_class_id'] ?? null, $classIds, true)) {
                return false;
            }
            if ($subjectIds !== [] && ! in_array($unit['exam_subject_id'] ?? null, $subjectIds, true)) {
                return false;
            }

            return true;
        }));
    }

    /**
     * @return list<string>
     */
    private function normalizeIdList(mixed $value): array
    {
        if (! is_array($value)) {
            return [];
        }

        $ids = [];
        foreach ($value as $item) {
            if (is_string($item) && $item !== '' && $item !== 'all') {
                $ids[] = $item;
            }
        }

        return $ids;
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

        $tempDir = storage_path('app/temp/exam-marks-entry-zips');
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
