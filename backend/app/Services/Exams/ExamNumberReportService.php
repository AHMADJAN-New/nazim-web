<?php

namespace App\Services\Exams;

use App\Models\Exam;
use App\Models\ExamClass;
use App\Models\ExamSeatAssignment;
use App\Models\ExamSeatingMap;
use App\Models\ExamStudent;
use App\Services\BrowsershotConfigurator;
use App\Services\Storage\FileStorageService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use SimpleSoftwareIO\QrCode\Facades\QrCode;
use Spatie\Browsershot\Browsershot;

/**
 * Builds exam roll-slip / secret-label HTML and PDFs for preview and queued reports.
 */
class ExamNumberReportService
{
    /** @var array<string, array{0: string|null, 1: string|null}> */
    private array $qrDataUriCache = [];

    public function __construct(
        private FileStorageService $fileStorageService
    ) {}

    /**
     * @return array{html: string, total_slips: int, is_preview: bool, preview_count: int, exam_name: string}
     */
    public function buildRollSlipsHtml(
        string $organizationId,
        string $schoolId,
        string $examId,
        ?string $examClassId = null,
        bool $isPreview = false
    ): array {
        if (! $isPreview) {
            set_time_limit(180);
        }

        $exam = Exam::where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->where('id', $examId)
            ->whereNull('deleted_at')
            ->with('academicYear')
            ->first();

        if (! $exam) {
            throw new \InvalidArgumentException('Exam not found');
        }

        $schoolBranding = DB::table('school_branding')
            ->where('organization_id', $organizationId)
            ->where('id', $schoolId)
            ->whereNull('deleted_at')
            ->first();

        $schoolName = $schoolBranding?->school_name ?? 'School Name';

        $query = ExamStudent::with([
            'examClass.classAcademicYear.class',
            'studentAdmission.student',
            'studentAdmission.room',
        ])
            ->where('exam_id', $examId)
            ->where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->whereNull('deleted_at')
            ->withLiveActiveAdmission($exam->academic_year_id)
            ->whereNotNull('exam_roll_number');

        if ($examClassId) {
            $query->where('exam_class_id', $examClassId);
        }

        $examStudents = $query->get()->sortBy('exam_roll_number')->values();

        $seatAssignments = ExamSeatAssignment::query()
            ->with(['seatingMap.room'])
            ->where('exam_id', $examId)
            ->where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->whereNull('deleted_at')
            ->whereNotNull('exam_student_id')
            ->where('is_disabled', false)
            ->get()
            ->groupBy('exam_student_id');

        $examClasses = ExamClass::where('exam_id', $examId)
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->with([
                'examSubjects.subject',
                'examSubjects.examTimes' => function ($query) {
                    $query->whereNull('deleted_at')->orderBy('date', 'asc');
                },
                'classAcademicYear.class',
            ])
            ->get()
            ->keyBy('id');

        $slips = [];
        foreach ($examStudents as $examStudent) {
            $student = $examStudent->studentAdmission?->student;
            $admission = $examStudent->studentAdmission;
            $classAcademicYear = $examStudent->examClass?->classAcademicYear;
            $examClass = $examClasses->get($examStudent->exam_class_id);

            $studentSeats = $seatAssignments->get($examStudent->id) ?? collect();
            $seatAssignment = $studentSeats->sortByDesc(function (ExamSeatAssignment $assignment): int {
                $status = $assignment->seatingMap?->status;

                return match ($status) {
                    ExamSeatingMap::STATUS_FINALIZED => 3,
                    ExamSeatingMap::STATUS_APPLIED => 2,
                    default => 1,
                };
            })->first();

            $subjects = [];
            if ($examClass && $examClass->examSubjects) {
                foreach ($examClass->examSubjects->whereNull('deleted_at') as $examSubject) {
                    $subjectName = $examSubject->subject?->name ?? 'Unknown';
                    $examTime = $examSubject->examTimes->whereNull('deleted_at')->first();
                    $examDate = null;
                    if ($examTime && $examTime->date) {
                        $examDate = $examTime->date->format('Y-m-d');
                    } elseif ($examSubject->scheduled_at) {
                        $examDate = $examSubject->scheduled_at->format('Y-m-d');
                    }

                    $subjects[] = [
                        'name' => $subjectName,
                        'date' => $examDate,
                    ];
                }
            }

            $province = $student?->orig_province ?? $student?->curr_province ?? '';
            $examHallRoom = $seatAssignment?->seatingMap?->room?->room_number
                ?? $seatAssignment?->seatingMap?->name
                ?? '';
            $roomNumber = $examHallRoom !== ''
                ? $examHallRoom
                : ($admission?->room?->room_number ?? '');

            $slips[] = [
                'exam_class_id' => $examStudent->exam_class_id,
                'exam_roll_number' => $examStudent->exam_roll_number,
                'seat_number' => $seatAssignment?->seat_number,
                'full_name' => $student?->full_name ?? 'Unknown',
                'father_name' => $student?->father_name ?? '',
                'admission_number' => $student?->admission_no ?? '',
                'class_name' => $classAcademicYear?->class?->name ?? 'Unknown',
                'section' => $classAcademicYear?->section_name ?? '',
                'province' => $province,
                'admission_year' => $admission?->created_at?->year ?? '',
                'room_number' => $roomNumber,
                'subjects' => $subjects,
            ];
        }

        $totalSlips = count($slips);
        $previewLimit = 4;
        $slipsForHtml = $isPreview ? array_slice($slips, 0, $previewLimit) : $slips;
        $html = $this->renderRollSlipsHtml(
            $schoolName,
            $exam->name,
            $exam->academicYear?->name ?? '',
            $slipsForHtml
        );

        return [
            'html' => $html,
            'total_slips' => $totalSlips,
            'is_preview' => $isPreview,
            'preview_count' => count($slipsForHtml),
            'exam_name' => $exam->name,
        ];
    }

    /**
     * @return array{html: string, total_labels: int, is_preview: bool, preview_count: int, layout: string, exam_name: string}
     */
    public function buildSecretLabelsHtml(
        string $organizationId,
        string $schoolId,
        string $examId,
        ?string $examClassId = null,
        ?string $subjectId = null,
        string $layout = 'single',
        bool $isPreview = false
    ): array {
        if (! $isPreview) {
            set_time_limit(180);
        }

        if (! in_array($layout, ['single', 'grid'], true)) {
            $layout = 'single';
        }

        $exam = Exam::where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->where('id', $examId)
            ->whereNull('deleted_at')
            ->first();

        if (! $exam) {
            throw new \InvalidArgumentException('Exam not found');
        }

        $query = ExamStudent::with([
            'examClass.classAcademicYear.class',
            'examClass.examSubjects.subject',
            'examClass.examSubjects.examTimes' => function ($query) {
                $query->whereNull('deleted_at')->orderBy('date', 'asc');
            },
        ])
            ->where('exam_id', $examId)
            ->where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->whereNull('deleted_at')
            ->withLiveActiveAdmission($exam->academic_year_id)
            ->whereNotNull('exam_secret_number');

        if ($examClassId) {
            $query->where('exam_class_id', $examClassId);
        }

        $examStudents = $query->get()->sortBy('exam_secret_number')->values();

        $subjectName = null;
        $subjectExamDate = null;
        $examSubjectId = null;

        if ($subjectId && preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $subjectId)) {
            $examSubject = DB::table('exam_subjects')
                ->where('id', $subjectId)
                ->where('exam_id', $examId)
                ->where('organization_id', $organizationId)
                ->where('school_id', $schoolId)
                ->whereNull('deleted_at')
                ->first();

            if ($examSubject) {
                $examSubjectId = $examSubject->id;
                $subject = DB::table('subjects')
                    ->where('id', $examSubject->subject_id)
                    ->where('organization_id', $organizationId)
                    ->where('school_id', $schoolId)
                    ->whereNull('deleted_at')
                    ->first();
                $subjectName = $subject?->name;

                $examTime = DB::table('exam_times')
                    ->where('exam_subject_id', $examSubjectId)
                    ->where('organization_id', $organizationId)
                    ->where('school_id', $schoolId)
                    ->whereNull('deleted_at')
                    ->orderBy('date', 'asc')
                    ->first();

                if ($examTime && $examTime->date) {
                    $subjectExamDate = date('Y-m-d', strtotime($examTime->date));
                } elseif ($examSubject->scheduled_at) {
                    $subjectExamDate = date('Y-m-d', strtotime($examSubject->scheduled_at));
                }
            } else {
                $subject = DB::table('subjects')
                    ->where('id', $subjectId)
                    ->where('organization_id', $organizationId)
                    ->where('school_id', $schoolId)
                    ->whereNull('deleted_at')
                    ->first();
                $subjectName = $subject?->name;
            }
        }

        $labels = [];
        foreach ($examStudents as $examStudent) {
            $classAcademicYear = $examStudent->examClass?->classAcademicYear;
            $examClass = $examStudent->examClass;
            $className = $classAcademicYear?->class?->name ?? 'Unknown';
            $section = $classAcademicYear?->section_name ?? '';

            if ($subjectName !== null || $examSubjectId !== null) {
                $labels[] = [
                    'exam_class_id' => $examStudent->exam_class_id,
                    'exam_secret_number' => $examStudent->exam_secret_number,
                    'class_name' => $className,
                    'section' => $section,
                    'subject_name' => $subjectName ?: 'Unknown',
                    'subject_exam_date' => $subjectExamDate,
                ];

                continue;
            }

            $examSubjects = $examClass?->examSubjects
                ? $examClass->examSubjects->filter(fn ($es) => $es->deleted_at === null)->values()
                : collect();

            if ($examSubjects->isEmpty()) {
                continue;
            }

            $sortedSubjects = $examSubjects->sortBy([
                fn ($a, $b) => $this->compareOptionalDateStrings(
                    $this->resolveExamSubjectDate($a),
                    $this->resolveExamSubjectDate($b)
                ),
                fn ($a, $b) => ($a->subject?->name ?? '') <=> ($b->subject?->name ?? ''),
            ])->values();

            foreach ($sortedSubjects as $examSubject) {
                $labels[] = [
                    'exam_class_id' => $examStudent->exam_class_id,
                    'exam_secret_number' => $examStudent->exam_secret_number,
                    'class_name' => $className,
                    'section' => $section,
                    'subject_name' => $examSubject->subject?->name ?? 'Unknown',
                    'subject_exam_date' => $this->resolveExamSubjectDate($examSubject),
                ];
            }
        }

        $totalLabels = count($labels);
        $previewLimit = $layout === 'single' ? 3 : 12;
        $labelsForHtml = $isPreview ? array_slice($labels, 0, $previewLimit) : $labels;
        $html = $this->renderSecretLabelsHtml($labelsForHtml, $exam->name, $layout);

        return [
            'html' => $html,
            'total_labels' => $totalLabels,
            'is_preview' => $isPreview,
            'preview_count' => count($labelsForHtml),
            'layout' => $layout,
            'exam_name' => $exam->name,
        ];
    }

    /**
     * Generate per class/section(/subject) PDFs packaged as a ZIP for queued/sync reports.
     *
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

        $examClassId = isset($parameters['exam_class_id']) && is_string($parameters['exam_class_id'])
            ? $parameters['exam_class_id']
            : null;

        set_time_limit(600);
        $this->reportProgress($progressCallback, 5, 'Loading exam numbers');

        if ($reportKey === 'exam_roll_slips') {
            return $this->generateRollSlipsZip(
                $organizationId,
                $schoolId,
                $examId,
                $examClassId,
                $progressCallback
            );
        }

        if ($reportKey === 'exam_secret_labels') {
            $layout = is_string($parameters['layout'] ?? null) ? $parameters['layout'] : 'single';
            $subjectId = isset($parameters['subject_id']) && is_string($parameters['subject_id'])
                ? $parameters['subject_id']
                : null;

            return $this->generateSecretLabelsZip(
                $organizationId,
                $schoolId,
                $examId,
                $examClassId,
                $subjectId,
                $layout,
                $progressCallback
            );
        }

        throw new \InvalidArgumentException("Unsupported exam number report key: {$reportKey}");
    }

    /**
     * @deprecated Use generateStoredZip — kept for callers; always produces a ZIP pack.
     *
     * @return array{path: string, filename: string, size: int, row_count: int}
     */
    public function generateStoredPdf(
        string $reportKey,
        string $organizationId,
        string $schoolId,
        array $parameters,
        ?callable $progressCallback = null
    ): array {
        return $this->generateStoredZip(
            $reportKey,
            $organizationId,
            $schoolId,
            $parameters,
            $progressCallback
        );
    }

    public static function isExamNumberReportKey(string $reportKey): bool
    {
        return in_array($reportKey, ['exam_roll_slips', 'exam_secret_labels'], true);
    }

    /**
     * @return array{path: string, filename: string, size: int, row_count: int}
     */
    private function generateRollSlipsZip(
        string $organizationId,
        string $schoolId,
        string $examId,
        ?string $examClassId,
        ?callable $progressCallback
    ): array {
        $exam = Exam::where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->where('id', $examId)
            ->whereNull('deleted_at')
            ->first();
        if (! $exam) {
            throw new \InvalidArgumentException('Exam not found');
        }

        $examFolder = $this->sanitizeZipSegment($exam->name);

        $examClassQuery = ExamClass::where('exam_id', $examId)
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->with(['classAcademicYear.class']);
        if ($examClassId) {
            $examClassQuery->where('id', $examClassId);
        }
        $examClasses = $examClassQuery->get();

        $groups = [];
        $totalSlips = 0;
        foreach ($examClasses as $examClass) {
            $classPayload = $this->buildRollSlipsHtml(
                $organizationId,
                $schoolId,
                $examId,
                $examClass->id,
                false
            );
            if (($classPayload['total_slips'] ?? 0) <= 0) {
                continue;
            }
            $groups[] = [
                'class_name' => $examClass->classAcademicYear?->class?->name ?? 'Unknown',
                'section' => $examClass->classAcademicYear?->section_name ?? '',
                'html' => $classPayload['html'],
            ];
            $totalSlips += $classPayload['total_slips'];
        }

        if ($groups === []) {
            throw new \RuntimeException('No roll slips to export');
        }

        $this->reportProgress($progressCallback, 15, 'Generating class PDFs');

        $zipEntries = [];
        $done = 0;
        $totalGroups = count($groups);
        foreach ($groups as $group) {
            $pdfContent = $this->htmlToPdfContent($group['html'], 'a4');
            $classSeg = $this->sanitizeZipSegment($group['class_name']);
            $sectionSeg = $this->sanitizeZipSegment($group['section'] !== '' ? $group['section'] : '_');
            $entryPath = "{$examFolder}/roll-slips/{$classSeg}/{$sectionSeg}/roll-slips.pdf";
            $zipEntries[$entryPath] = $pdfContent;
            $done++;
            $this->reportProgress(
                $progressCallback,
                15 + (70 * ($done / max(1, $totalGroups))),
                "Generated {$done}/{$totalGroups} roll slip PDFs"
            );
        }

        $filename = 'roll-slips-'.Str::slug($exam->name).'-'.now()->format('Ymd-His').'.zip';

        return $this->storeZipArchive(
            $zipEntries,
            $filename,
            $organizationId,
            $schoolId,
            'exam_roll_slips',
            $totalSlips,
            $progressCallback
        );
    }

    /**
     * @return array{path: string, filename: string, size: int, row_count: int}
     */
    private function generateSecretLabelsZip(
        string $organizationId,
        string $schoolId,
        string $examId,
        ?string $examClassId,
        ?string $subjectId,
        string $layout,
        ?callable $progressCallback
    ): array {
        if (! in_array($layout, ['single', 'grid'], true)) {
            $layout = 'single';
        }

        $exam = Exam::where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->where('id', $examId)
            ->whereNull('deleted_at')
            ->first();
        if (! $exam) {
            throw new \InvalidArgumentException('Exam not found');
        }

        $examName = $exam->name;
        $examFolder = $this->sanitizeZipSegment($examName);
        $paperMode = $layout === 'single' ? 'label_1x2' : 'a4';

        $examClassQuery = ExamClass::where('exam_id', $examId)
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->with([
                'classAcademicYear.class',
                'examSubjects.subject',
                'examSubjects.examTimes' => function ($query) {
                    $query->whereNull('deleted_at')->orderBy('date', 'asc');
                },
            ]);
        if ($examClassId) {
            $examClassQuery->where('id', $examClassId);
        }
        $examClasses = $examClassQuery->get();

        /** @var list<array{class_name: string, section: string, subject_name: string, subject_id: string|null, exam_class_id: string}> $workItems */
        $workItems = [];
        foreach ($examClasses as $examClass) {
            $className = $examClass->classAcademicYear?->class?->name ?? 'Unknown';
            $section = $examClass->classAcademicYear?->section_name ?? '';

            if ($subjectId) {
                $resolvedSubjectName = $this->resolveSubjectDisplayName(
                    $organizationId,
                    $schoolId,
                    $examId,
                    $subjectId
                );
                $workItems[] = [
                    'class_name' => $className,
                    'section' => $section,
                    'subject_name' => $resolvedSubjectName,
                    'subject_id' => $subjectId,
                    'exam_class_id' => $examClass->id,
                ];

                continue;
            }

            $examSubjects = $examClass->examSubjects
                ? $examClass->examSubjects->filter(fn ($es) => $es->deleted_at === null)->values()
                : collect();

            if ($examSubjects->isEmpty()) {
                continue;
            }

            $sortedSubjects = $examSubjects->sortBy([
                fn ($a, $b) => $this->compareOptionalDateStrings(
                    $this->resolveExamSubjectDate($a),
                    $this->resolveExamSubjectDate($b)
                ),
                fn ($a, $b) => ($a->subject?->name ?? '') <=> ($b->subject?->name ?? ''),
            ])->values();

            foreach ($sortedSubjects as $examSubject) {
                $workItems[] = [
                    'class_name' => $className,
                    'section' => $section,
                    'subject_name' => $examSubject->subject?->name ?? 'Unknown',
                    'subject_id' => $examSubject->id,
                    'exam_class_id' => $examClass->id,
                ];
            }
        }

        $this->reportProgress($progressCallback, 15, 'Generating subject PDFs');

        $zipEntries = [];
        $totalLabels = 0;
        $done = 0;
        $totalGroups = max(1, count($workItems));

        foreach ($workItems as $item) {
            $groupPayload = $this->buildSecretLabelsHtml(
                $organizationId,
                $schoolId,
                $examId,
                $item['exam_class_id'],
                $item['subject_id'],
                $layout,
                false
            );

            if (($groupPayload['total_labels'] ?? 0) <= 0) {
                $done++;

                continue;
            }

            $subjectName = $item['subject_name'] !== '' ? $item['subject_name'] : 'Unknown';

            $pdfContent = $this->htmlToPdfContent($groupPayload['html'], $paperMode);
            $classSeg = $this->sanitizeZipSegment($item['class_name']);
            $sectionSeg = $this->sanitizeZipSegment($item['section'] !== '' ? $item['section'] : '_');
            $subjectSeg = $this->sanitizeZipSegment($subjectName);
            $entryPath = "{$examFolder}/secret-labels/{$classSeg}/{$sectionSeg}/{$subjectSeg}/secret-labels.pdf";
            $zipEntries[$entryPath] = $pdfContent;
            $totalLabels += $groupPayload['total_labels'];
            $done++;
            $this->reportProgress(
                $progressCallback,
                15 + (70 * ($done / $totalGroups)),
                "Generated {$done}/{$totalGroups} secret label PDFs"
            );
        }

        if ($zipEntries === []) {
            throw new \RuntimeException('No secret labels to export');
        }

        $filename = 'secret-labels-'.Str::slug($examName).'-'.now()->format('Ymd-His').'.zip';

        return $this->storeZipArchive(
            $zipEntries,
            $filename,
            $organizationId,
            $schoolId,
            'exam_secret_labels',
            $totalLabels,
            $progressCallback
        );
    }

    private function resolveSubjectDisplayName(
        string $organizationId,
        string $schoolId,
        string $examId,
        string $subjectId
    ): string {
        $examSubject = DB::table('exam_subjects')
            ->where('id', $subjectId)
            ->where('exam_id', $examId)
            ->where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->whereNull('deleted_at')
            ->first();

        if ($examSubject) {
            $subject = DB::table('subjects')
                ->where('id', $examSubject->subject_id)
                ->whereNull('deleted_at')
                ->first();

            return $subject?->name ?? 'Unknown';
        }

        $subject = DB::table('subjects')
            ->where('id', $subjectId)
            ->where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->whereNull('deleted_at')
            ->first();

        return $subject?->name ?? 'Unknown';
    }

    /**
     * @param  array<string, string>  $zipEntries  path => binary content
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

        $tempDir = storage_path('app/temp/exam-number-zips');
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

        // Remove path separators and control characters
        $value = str_replace(['/', '\\', ':', '*', '?', '"', '<', '>', '|'], '-', $value);
        $value = preg_replace('/[\x00-\x1F\x7F]+/u', '', $value) ?? $value;
        $value = preg_replace('/\s+/u', ' ', $value) ?? $value;
        $value = trim($value, " .\t\n\r\0\x0B");

        return $value !== '' ? $value : '_';
    }

    /**
     * @param  array<int, array<string, mixed>>  $slips
     */
    private function renderRollSlipsHtml(string $schoolName, string $examName, string $academicYear, array $slips): string
    {
        foreach ($slips as &$slip) {
            if (! empty($slip['exam_roll_number'])) {
                [$slip['qr_code'], $slip['qr_code_format']] = $this->generateQrDataUri(
                    (string) $slip['exam_roll_number'],
                    200,
                    2
                );
            } else {
                $slip['qr_code'] = null;
                $slip['qr_code_format'] = null;
            }
        }
        unset($slip);

        return view('reports.roll-slips', [
            'schoolName' => $schoolName,
            'examName' => $examName,
            'academicYear' => $academicYear,
            'slips' => $slips,
        ])->render();
    }

    /**
     * @param  array<int, array<string, mixed>>  $labels
     */
    private function renderSecretLabelsHtml(array $labels, string $examName, string $layout = 'single'): string
    {
        foreach ($labels as &$label) {
            if (! empty($label['exam_secret_number'])) {
                [$label['barcode'], $label['barcode_format']] = $this->generateQrDataUri(
                    (string) $label['exam_secret_number'],
                    150,
                    1
                );
            } else {
                $label['barcode'] = null;
                $label['barcode_format'] = null;
            }
        }
        unset($label);

        return view('reports.secret-labels', [
            'examName' => $examName,
            'labels' => $labels,
            'layout' => $layout,
        ])->render();
    }

    /**
     * Convert HTML to PDF binary using the same Browsershot/Chromium stack as other reports
     * ({@see PdfReportService}). DomPDF is only an emergency fallback (broken RTL shaping).
     *
     * @param  'a4'|'label_1x2'  $paperMode
     */
    protected function htmlToPdfContent(string $html, string $paperMode = 'a4'): string
    {
        $tempDir = storage_path('app/temp/exam-number-pdfs');
        if (! is_dir($tempDir) && ! mkdir($tempDir, 0775, true) && ! is_dir($tempDir)) {
            throw new \RuntimeException("Failed to create temp directory: {$tempDir}");
        }

        $tempPath = $tempDir.DIRECTORY_SEPARATOR.Str::uuid()->toString().'.pdf';

        try {
            try {
                $this->generatePdfWithBrowsershot($html, $tempPath, $paperMode);
            } catch (\Throwable $e) {
                Log::warning('Exam number PDF Browsershot failed; falling back to DomPDF', [
                    'message' => $e->getMessage(),
                    'paper_mode' => $paperMode,
                ]);
                $this->generatePdfWithDompdf($html, $tempPath, $paperMode);
            }
        } catch (\Throwable $e) {
            @unlink($tempPath);
            throw $e;
        }

        if (! file_exists($tempPath)) {
            throw new \RuntimeException('Failed to generate exam number PDF');
        }

        $content = file_get_contents($tempPath);
        @unlink($tempPath);

        if ($content === false || $content === '') {
            throw new \RuntimeException('Generated exam number PDF was empty');
        }

        return $content;
    }

    /**
     * Same engine as branded reports: Browsershot + Bahij fonts (base64 in HTML).
     * Slightly leaner than PdfReportService so ZIP packs with many PDFs stay practical.
     *
     * @param  'a4'|'label_1x2'  $paperMode
     */
    private function generatePdfWithBrowsershot(string $html, string $tempPath, string $paperMode): void
    {
        if (! class_exists(Browsershot::class)) {
            throw new \RuntimeException('Browsershot is not available');
        }

        $browsershot = Browsershot::html($html)
            ->showBackground()
            ->margins(0, 0, 0, 0)
            ->emulateMedia('print')
            // Fonts are embedded as base64 — no network idle wait (that made ZIPs take many minutes).
            ->setDelay(400)
            ->timeout(120);

        if ($paperMode === 'label_1x2') {
            $browsershot->paperSize(25.4, 50.8, 'mm');
            $browsershot->setOption('preferCSSPageSize', true);
        } else {
            $browsershot->format('A4');
        }

        BrowsershotConfigurator::apply($browsershot, [
            'disable-web-security', // Allow loading fonts from data URLs (same as PdfReportService)
            'disable-features=FontLoading',
        ]);

        $browsershot->save($tempPath);
    }

    /**
     * @param  'a4'|'label_1x2'  $paperMode
     */
    private function generatePdfWithDompdf(string $html, string $tempPath, string $paperMode): void
    {
        $fontCacheDir = storage_path('fonts');
        if (! is_dir($fontCacheDir) && ! mkdir($fontCacheDir, 0775, true) && ! is_dir($fontCacheDir)) {
            throw new \RuntimeException("Failed to create Dompdf font cache directory: {$fontCacheDir}");
        }

        // Register Bahij fonts into DomPDF before HTML parse (queue workers cannot load /fonts URLs).
        $pdf = Pdf::setOptions([
            'isRemoteEnabled' => true,
            'isHtml5ParserEnabled' => true,
            'isFontSubsettingEnabled' => true,
            'defaultFont' => 'DejaVu Sans',
            'chroot' => realpath(base_path()) ?: base_path(),
            'fontDir' => $fontCacheDir,
            'fontCache' => $fontCacheDir,
        ]);

        $this->ensureBahijFontsRegistered($pdf->getDomPDF());

        $pdf->loadHTML($html);

        if ($paperMode === 'label_1x2') {
            $pdf->setPaper([0, 0, 72, 144], 'portrait');
        } else {
            $pdf->setPaper('A4', 'portrait');
        }

        $pdf->save($tempPath);
    }

    /**
     * Install Bahij TTF faces into DomPDF's font directory so CSS font-family: BahijNassim works.
     */
    private function ensureBahijFontsRegistered(\Dompdf\Dompdf $dompdf): void
    {
        $fontMetrics = $dompdf->getFontMetrics();

        $regularUri = $this->bahijFontFileUri('Bahij Nassim-Regular.ttf', 'BahijNassim-Regular.ttf');
        $boldUri = $this->bahijFontFileUri('Bahij Nassim-Bold.ttf', 'BahijNassim-Bold.ttf');
        $titrUri = $this->bahijFontFileUri('Bahij Titr-Bold.ttf', 'BahijTitr-Bold.ttf');

        if ($regularUri) {
            $ok = $fontMetrics->registerFont(
                ['family' => 'BahijNassim', 'style' => 'normal', 'weight' => 'normal'],
                $regularUri
            );
            if (! $ok) {
                Log::warning('Failed to register BahijNassim regular for DomPDF');
            }
        }

        if ($boldUri) {
            $ok = $fontMetrics->registerFont(
                ['family' => 'BahijNassim', 'style' => 'normal', 'weight' => 'bold'],
                $boldUri
            );
            if (! $ok) {
                Log::warning('Failed to register BahijNassim bold for DomPDF');
            }
        }

        if ($titrUri) {
            $ok = $fontMetrics->registerFont(
                ['family' => 'BahijTitr', 'style' => 'normal', 'weight' => 'bold'],
                $titrUri
            );
            if (! $ok) {
                Log::warning('Failed to register BahijTitr bold for DomPDF');
            }
        }
    }

    /**
     * Copy public Bahij TTF into storage/fonts without spaces, return a file:// URI for DomPDF.
     */
    private function bahijFontFileUri(string $publicFileName, string $cacheFileName): ?string
    {
        $source = public_path('fonts'.DIRECTORY_SEPARATOR.$publicFileName);
        if (! is_file($source)) {
            return null;
        }

        $dest = storage_path('fonts'.DIRECTORY_SEPARATOR.$cacheFileName);
        if (! is_file($dest) || filemtime($source) > filemtime($dest)) {
            if (! @copy($source, $dest)) {
                Log::warning('Failed to copy Bahij font for DomPDF', [
                    'source' => $source,
                    'dest' => $dest,
                ]);

                return null;
            }
        }

        // DomPDF on Windows accepts file://D:/path (two slashes). file:///D:/... fails chroot checks.
        $normalized = str_replace('\\', '/', $dest);

        return 'file://'.$normalized;
    }

    /**
     * @return array{0: string|null, 1: string|null}
     */
    private function generateQrDataUri(string $value, int $size = 200, int $margin = 2): array
    {
        $cacheKey = $value.'|'.$size.'|'.$margin;
        if (array_key_exists($cacheKey, $this->qrDataUriCache)) {
            return $this->qrDataUriCache[$cacheKey];
        }

        try {
            $qrCodeSvg = QrCode::format('svg')
                ->size($size)
                ->margin($margin)
                ->errorCorrection('M')
                ->generate($value);

            $result = ['data:image/svg+xml;base64,'.base64_encode($qrCodeSvg), 'svg'];
        } catch (\Exception $e) {
            try {
                $qrCodePng = QrCode::format('png')
                    ->size($size)
                    ->margin($margin)
                    ->errorCorrection('M')
                    ->generate($value);

                $result = ['data:image/png;base64,'.base64_encode($qrCodePng), 'png'];
            } catch (\Exception $e2) {
                Log::error('Failed to generate QR code (both SVG and PNG)', [
                    'value' => $value,
                    'svg_error' => $e->getMessage(),
                    'png_error' => $e2->getMessage(),
                ]);
                $result = [null, null];
            }
        }

        $this->qrDataUriCache[$cacheKey] = $result;

        return $result;
    }

    private function compareOptionalDateStrings(?string $a, ?string $b): int
    {
        $aEmpty = $a === null || $a === '';
        $bEmpty = $b === null || $b === '';

        if ($aEmpty && $bEmpty) {
            return 0;
        }
        if ($aEmpty) {
            return 1;
        }
        if ($bEmpty) {
            return -1;
        }

        return strcmp($a, $b);
    }

    private function resolveExamSubjectDate($examSubject): ?string
    {
        $examTime = $examSubject->examTimes
            ? $examSubject->examTimes->filter(fn ($t) => $t->deleted_at === null)->first()
            : null;

        if ($examTime && $examTime->date) {
            return $examTime->date instanceof \DateTimeInterface
                ? $examTime->date->format('Y-m-d')
                : date('Y-m-d', strtotime((string) $examTime->date));
        }

        if ($examSubject->scheduled_at) {
            return $examSubject->scheduled_at instanceof \DateTimeInterface
                ? $examSubject->scheduled_at->format('Y-m-d')
                : date('Y-m-d', strtotime((string) $examSubject->scheduled_at));
        }

        return null;
    }

    private function reportProgress(?callable $progressCallback, float $progress, string $message): void
    {
        if ($progressCallback) {
            $progressCallback($progress, $message);
        }
    }
}
