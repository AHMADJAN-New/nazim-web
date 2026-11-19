<?php

namespace App\Services\Exams;

use App\Helpers\GradeCalculator;
use App\Models\Exam;
use App\Models\ExamClass;
use App\Models\ExamResult;
use App\Models\ExamStudent;
use App\Models\ExamSubject;
use App\Models\Organization;
use App\Services\Reports\DateConversionService;
use App\Services\Reports\StudentExamReportCardLabels;
use App\Services\Storage\FileStorageService;
use Illuminate\Support\Collection;

/**
 * Builds combined result cards from two exams that share an organization,
 * school, academic year, and class academic year. Subjects stay on
 * class_subjects (matched by class_subject_id). Students match by admission.
 */
class CombinedExamResultCardService
{
    public function __construct(
        private CombinedExamResultCalculator $calculator,
        private AbsenceMarkPenaltyCalculator $absenceMarkPenaltyCalculator,
        private DateConversionService $dateConversionService,
        private FileStorageService $fileStorageService,
    ) {}

    /**
     * @param  Collection<int, ExamStudent>  $examStudentsA
     * @return list<array<string, mixed>>
     */
    public function buildCards(
        Exam $examA,
        Exam $examB,
        Collection $examStudentsA,
        string $organizationId,
        string $schoolId,
        string $language = 'en',
        string $calendarPreference = 'jalali',
        bool $embedPicture = false,
    ): array {
        $this->assertExamScope($examA, $examB, $organizationId, $schoolId);

        if ($examStudentsA->isEmpty()) {
            return [];
        }

        $classIds = $examStudentsA->pluck('exam_class_id')->filter()->unique()->values();
        if ($classIds->count() !== 1) {
            throw new CombinedExamResultException('combined_exam.mixed_classes');
        }

        /** @var ExamClass|null $classA */
        $classA = $examStudentsA->first()?->examClass;
        if ($classA === null || empty($classA->class_academic_year_id)) {
            throw new CombinedExamResultException('combined_exam.class_not_shared');
        }

        $classB = $this->matchingClass($examB, (string) $classA->class_academic_year_id, $organizationId, $schoolId);

        $subjectsA = $this->subjectsForClass($examA, $classA, $organizationId, $schoolId);
        $subjectsB = $this->subjectsForClass($examB, $classB, $organizationId, $schoolId);
        $indexedA = $this->indexSubjects($subjectsA);
        $indexedB = $this->indexSubjects($subjectsB);
        $keys = array_values(array_unique(array_merge(array_keys($indexedA), array_keys($indexedB))));
        usort($keys, function (string $left, string $right) use ($indexedA, $indexedB) {
            return strcasecmp($this->subjectName($indexedA[$left] ?? $indexedB[$left] ?? null), $this->subjectName($indexedA[$right] ?? $indexedB[$right] ?? null));
        });

        $admissionIds = $examStudentsA->pluck('student_admission_id')->filter()->unique()->values();
        $studentsB = ExamStudent::query()
            ->where('exam_id', $examB->id)
            ->where('exam_class_id', $classB->id)
            ->where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->whereIn('student_admission_id', $admissionIds)
            ->whereNull('deleted_at')
            ->get()
            ->keyBy('student_admission_id');

        $resultsA = $this->resultsFor($examA, $examStudentsA->pluck('id'), $organizationId, $schoolId);
        $resultsB = $this->resultsFor($examB, $studentsB->pluck('id'), $organizationId, $schoolId);

        $organizationName = Organization::query()->whereKey($organizationId)->value('name');
        $examPayloadA = $this->examPayload($examA, $language, $calendarPreference);
        $examPayloadB = $this->examPayload($examB, $language, $calendarPreference);
        $admissionIdList = $admissionIds->all();
        $penaltyContextA = $this->absenceMarkPenaltyCalculator->loadContext(
            $organizationId,
            $schoolId,
            (string) $examA->id,
            (string) $classA->id,
            $admissionIdList,
        );
        $penaltyContextB = $this->absenceMarkPenaltyCalculator->loadContext(
            $organizationId,
            $schoolId,
            (string) $examB->id,
            (string) $classB->id,
            $admissionIdList,
        );
        $gradeCache = [];

        $cards = [];
        foreach ($examStudentsA as $examStudentA) {
            $examStudentB = $studentsB->get($examStudentA->student_admission_id);
            $enrolledInB = $examStudentB !== null;

            $subjectRows = [];
            foreach ($keys as $key) {
                $subjectA = $indexedA[$key] ?? null;
                $subjectB = $indexedB[$key] ?? null;
                $resultA = $subjectA ? ($resultsA[$examStudentA->id][$subjectA->id] ?? null) : null;
                $resultB = ($subjectB && $examStudentB) ? ($resultsB[$examStudentB->id][$subjectB->id] ?? null) : null;

                $combined = $this->calculator->combineSubject(
                    $this->sideForExam($examA, $this->side($subjectA, $resultA, studentEnrolled: true)),
                    $this->sideForExam($examB, $this->side($subjectB, $resultB, studentEnrolled: $enrolledInB)),
                );

                $source = $subjectA ?? $subjectB;
                $subjectRows[] = array_merge($combined, [
                    'class_subject_id' => $source?->class_subject_id,
                    'subject_id' => $source?->subject_id,
                    'subject_name' => $this->subjectName($source),
                    'subject_code' => $source?->subject?->code,
                    'grade_name' => $this->cachedGradeName(
                        isset($combined['percentage']) && is_numeric($combined['percentage'])
                            ? (float) $combined['percentage']
                            : null,
                        $organizationId,
                        $language,
                        $gradeCache,
                    ),
                ]);
            }

            [$rawA, $maxA] = $this->examSideTotals($subjectRows, 'exam_a');
            [$rawB, $maxB] = $this->examSideTotals($subjectRows, 'exam_b');
            $admissionId = $examStudentA->student_admission_id
                ? (string) $examStudentA->student_admission_id
                : null;
            $penaltyA = $this->absenceMarkPenaltyCalculator->applyForAdmission(
                organizationId: $organizationId,
                schoolId: $schoolId,
                examId: (string) $examA->id,
                examClassId: (string) $classA->id,
                studentAdmissionId: $admissionId,
                rawTotal: $rawA,
                totalMaximum: $maxA,
                context: $penaltyContextA,
            );
            $penaltyB = [
                'enabled' => false,
                'absence_count' => 0,
                'marks_cut' => 0.0,
            ];
            if ($enrolledInB) {
                $penaltyB = $this->absenceMarkPenaltyCalculator->applyForAdmission(
                    organizationId: $organizationId,
                    schoolId: $schoolId,
                    examId: (string) $examB->id,
                    examClassId: (string) $classB->id,
                    studentAdmissionId: $admissionId,
                    rawTotal: $rawB,
                    totalMaximum: $maxB,
                    context: $penaltyContextB,
                );
            }
            $penaltyEnabled = ($penaltyA['enabled'] ?? false) || ($penaltyB['enabled'] ?? false);
            $marksCut = ($penaltyA['enabled'] ? (float) $penaltyA['marks_cut'] : 0.0)
                + ($penaltyB['enabled'] ? (float) $penaltyB['marks_cut'] : 0.0);
            $absenceCount = ($penaltyA['enabled'] ? (int) $penaltyA['absence_count'] : 0)
                + ($penaltyB['enabled'] ? (int) $penaltyB['absence_count'] : 0);
            $summary = $this->calculator->applyAbsenceAdjustment(
                $this->calculator->summarize($subjectRows),
                $marksCut,
                $absenceCount,
                $penaltyEnabled,
            );
            $summary['overall_grade'] = ! empty($summary['is_complete'])
                ? $this->cachedGradeName(
                    isset($summary['overall_percentage']) && is_numeric($summary['overall_percentage'])
                        ? (float) $summary['overall_percentage']
                        : null,
                    $organizationId,
                    $language,
                    $gradeCache,
                )
                : null;

            $studentModel = $examStudentA->studentAdmission?->student;
            $picturePath = $studentModel?->picture_path;
            $birthDate = $studentModel?->birth_date;

            $cards[] = [
                'formula' => CombinedExamResultCalculator::FORMULA,
                'organization_name' => $organizationName,
                'enrolled_in_second_exam' => $enrolledInB,
                'exam_a' => $examPayloadA,
                'exam_b' => $examPayloadB,
                'academic_year' => $examA->academicYear?->name,
                'student' => [
                    'exam_student_id' => $examStudentA->id,
                    'id' => $studentModel?->id,
                    'full_name' => $studentModel?->full_name ?? 'Unknown',
                    'admission_no' => $studentModel?->admission_no,
                    'roll_number' => $examStudentA->exam_roll_number
                        ?? $examStudentA->studentAdmission?->roll_number,
                    'class' => $classA->classAcademicYear?->class?->name,
                    'section' => $classA->classAcademicYear?->section_name,
                    'father_name' => $studentModel?->father_name,
                    'birth_date_formatted' => $birthDate
                        ? $this->formatDate($birthDate, $calendarPreference, $language)
                        : null,
                    'picture_path' => $picturePath,
                    'picture_data_url' => ($embedPicture && is_string($picturePath) && $picturePath !== '')
                        ? $this->embedStudentPicture($picturePath)
                        : null,
                ],
                'subjects' => $subjectRows,
                'summary' => $summary,
            ];
        }

        return $cards;
    }

    /**
     * @param  Collection<int, ExamStudent>|array<int, ExamStudent>  $examStudentsA
     * @return array{cards: list<array<string, mixed>>, labels: array<string, string>, generatedAt: string, rtl: bool, formula: string}
     */
    public function buildPdfPayload(
        Exam $examA,
        Exam $examB,
        iterable $examStudentsA,
        string $organizationId,
        string $schoolId,
        string $language = 'en',
        string $calendarPreference = 'jalali',
    ): array {
        $students = $examStudentsA instanceof Collection ? $examStudentsA : collect($examStudentsA);

        return [
            'cards' => $this->buildCards(
                $examA,
                $examB,
                $students,
                $organizationId,
                $schoolId,
                $language,
                $calendarPreference,
                embedPicture: true,
            ),
            'labels' => StudentExamReportCardLabels::forLanguage($language),
            'generatedAt' => now()->toISOString(),
            'rtl' => StudentExamReportCardLabels::isRtl($language),
            'formula' => CombinedExamResultCalculator::FORMULA,
        ];
    }

    private function assertExamScope(Exam $examA, Exam $examB, string $organizationId, string $schoolId): void
    {
        foreach ([$examA, $examB] as $exam) {
            if ((string) $exam->organization_id !== $organizationId || (string) $exam->school_id !== $schoolId) {
                throw new CombinedExamResultException('combined_exam.out_of_scope');
            }
        }

        if ((string) $examA->id === (string) $examB->id) {
            throw new CombinedExamResultException('combined_exam.same_exam');
        }

        if ((string) $examA->academic_year_id === '' || (string) $examA->academic_year_id !== (string) $examB->academic_year_id) {
            throw new CombinedExamResultException('combined_exam.academic_year_mismatch');
        }
    }

    private function matchingClass(Exam $examB, string $classAcademicYearId, string $organizationId, string $schoolId): ExamClass
    {
        $classB = ExamClass::query()
            ->with('classAcademicYear.class')
            ->where('exam_id', $examB->id)
            ->where('class_academic_year_id', $classAcademicYearId)
            ->where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->whereNull('deleted_at')
            ->first();

        if ($classB === null) {
            throw new CombinedExamResultException('combined_exam.class_not_shared');
        }

        return $classB;
    }

    /**
     * @return Collection<int, ExamSubject>
     */
    private function subjectsForClass(Exam $exam, ExamClass $examClass, string $organizationId, string $schoolId): Collection
    {
        return ExamSubject::query()
            ->with(['subject', 'classSubject.subject'])
            ->where('exam_id', $exam->id)
            ->where('exam_class_id', $examClass->id)
            ->where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->whereNull('deleted_at')
            ->get();
    }

    /**
     * @param  Collection<int, ExamSubject>  $subjects
     * @return array<string, ExamSubject>
     */
    private function indexSubjects(Collection $subjects): array
    {
        $indexed = [];
        foreach ($subjects as $subject) {
            $key = $this->subjectKey($subject);
            if (! isset($indexed[$key])) {
                $indexed[$key] = $subject;
            }
        }

        return $indexed;
    }

    private function subjectKey(ExamSubject $subject): string
    {
        if (! empty($subject->class_subject_id)) {
            return 'cs:'.$subject->class_subject_id;
        }

        if (! empty($subject->subject_id)) {
            return 's:'.$subject->subject_id;
        }

        return 'es:'.$subject->id;
    }

    /**
     * @param  list<array<string, mixed>>  $subjectRows
     * @return array{0: float, 1: float}
     */
    private function examSideTotals(array $subjectRows, string $side): array
    {
        $raw = 0.0;
        $maximum = 0.0;

        foreach ($subjectRows as $row) {
            $cell = $row[$side] ?? [];
            if (empty($cell['enrolled'])) {
                continue;
            }
            if (empty($cell['is_absent']) && ($cell['marks_obtained'] ?? null) !== null) {
                $raw += (float) $cell['marks_obtained'];
            }
            if (($cell['total_marks'] ?? null) !== null) {
                $maximum += (float) $cell['total_marks'];
            }
        }

        return [round($raw, 2), round($maximum, 2)];
    }

    /**
     * @param  array<string, string|null>  $cache
     */
    private function cachedGradeName(?float $percentage, string $organizationId, string $language, array &$cache): ?string
    {
        if ($percentage === null) {
            return null;
        }

        $key = number_format($percentage, 2, '.', '');
        if (! array_key_exists($key, $cache)) {
            $cache[$key] = GradeCalculator::getGradeName($percentage, $organizationId, $language);
        }

        return $cache[$key];
    }

    private function subjectName(?ExamSubject $subject): string
    {
        if ($subject === null) {
            return '';
        }

        return $subject->subject?->name
            ?? $subject->classSubject?->subject?->name
            ?? 'Unknown';
    }

    /**
     * @param  Collection<int, mixed>  $examStudentIds
     * @return array<string, array<string, ExamResult>>
     */
    private function resultsFor(Exam $exam, Collection $examStudentIds, string $organizationId, string $schoolId): array
    {
        if ($examStudentIds->isEmpty()) {
            return [];
        }

        $grouped = [];
        $results = ExamResult::query()
            ->where('exam_id', $exam->id)
            ->where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->whereIn('exam_student_id', $examStudentIds->all())
            ->whereNull('deleted_at')
            ->get();

        foreach ($results as $result) {
            $grouped[$result->exam_student_id][$result->exam_subject_id] = $result;
        }

        return $grouped;
    }

    /**
     * @return array<string, mixed>
     */
    /**
     * @param  array<string, mixed>  $side
     * @return array<string, mixed>
     */
    private function sideForExam(Exam $exam, array $side): array
    {
        if (! in_array($exam->status, [Exam::STATUS_COMPLETED, Exam::STATUS_ARCHIVED], true)) {
            return $side;
        }

        return $this->calculator->countMissingAsZero($side);
    }

    private function side(?ExamSubject $examSubject, ?ExamResult $result, bool $studentEnrolled): array
    {
        if ($examSubject === null || ! $studentEnrolled) {
            return [
                'enrolled' => false,
                'is_absent' => false,
                'marks_obtained' => null,
                'total_marks' => $examSubject?->total_marks,
                'passing_marks' => $examSubject?->passing_marks,
            ];
        }

        return [
            'enrolled' => true,
            'is_absent' => (bool) ($result?->is_absent),
            'marks_obtained' => $result?->marks_obtained,
            'total_marks' => $examSubject->total_marks,
            'passing_marks' => $examSubject->passing_marks,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function examPayload(Exam $exam, string $language, string $calendarPreference): array
    {
        return [
            'id' => $exam->id,
            'name' => $exam->name,
            'academic_year' => $exam->academicYear?->name,
            'start_date' => $exam->start_date,
            'end_date' => $exam->end_date,
            'start_date_formatted' => $exam->start_date
                ? $this->formatDate($exam->start_date, $calendarPreference, $language)
                : null,
            'end_date_formatted' => $exam->end_date
                ? $this->formatDate($exam->end_date, $calendarPreference, $language)
                : null,
        ];
    }

    private function formatDate(mixed $date, string $calendarPreference, string $language): ?string
    {
        try {
            return $this->dateConversionService->formatDate($date, $calendarPreference, 'full', $language);
        } catch (\Throwable) {
            return null;
        }
    }

    private function embedStudentPicture(string $path): ?string
    {
        try {
            $disk = 'local';

            if (! $this->fileStorageService->fileExists($path, $disk)) {
                if ($this->fileStorageService->fileExists($path, 'public')) {
                    $disk = 'public';
                } else {
                    return null;
                }
            }

            $contents = $this->fileStorageService->getFile($path, $disk);
            if ($contents === null || $contents === '') {
                return null;
            }

            $mime = $this->fileStorageService->getMimeType($path, $disk) ?: 'image/jpeg';

            return 'data:'.$mime.';base64,'.base64_encode($contents);
        } catch (\Throwable) {
            return null;
        }
    }
}
