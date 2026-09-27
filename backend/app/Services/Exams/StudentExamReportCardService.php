<?php

namespace App\Services\Exams;

use App\Helpers\GradeCalculator;
use App\Models\Exam;
use App\Models\ExamResult;
use App\Models\ExamStudent;
use App\Models\ExamSubject;
use App\Services\Reports\DateConversionService;
use App\Services\Reports\StudentExamReportCardLabels;
use App\Services\Storage\FileStorageService;
use Illuminate\Support\Collection;

class StudentExamReportCardService
{
    public function __construct(
        private AbsenceMarkPenaltyCalculator $absenceMarkPenaltyCalculator,
        private FileStorageService $fileStorageService,
        private DateConversionService $dateConversionService,
    ) {}

    /**
     * Build a single student report card payload (API + PDF shared shape).
     *
     * @return array<string, mixed>|null
     */
    public function buildCard(
        Exam $exam,
        ExamStudent $examStudent,
        string $organizationId,
        string $schoolId,
        string $language = 'en',
        string $calendarPreference = 'jalali',
        bool $embedPicture = false,
    ): ?array {
        $examStudent->loadMissing([
            'studentAdmission.student',
            'examClass.classAcademicYear.class',
        ]);
        $exam->loadMissing('academicYear');

        $results = ExamResult::with('examSubject.subject')
            ->where('exam_student_id', $examStudent->id)
            ->where('exam_id', $exam->id)
            ->where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->whereNull('deleted_at')
            ->get();

        $examSubjects = ExamSubject::with('subject')
            ->where('exam_class_id', $examStudent->exam_class_id)
            ->where('exam_id', $exam->id)
            ->where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->whereNull('deleted_at')
            ->get();

        $subjectResults = $examSubjects->map(function ($examSubject) use ($results) {
            $result = $results->firstWhere('exam_subject_id', $examSubject->id);

            $marks = $result ? $result->marks_obtained : null;
            $isAbsent = $result ? (bool) $result->is_absent : false;
            $remarks = $result ? $result->remarks : null;

            $isPass = null;
            if (! $isAbsent && $marks !== null && $examSubject->passing_marks !== null) {
                $isPass = $marks >= $examSubject->passing_marks;
            }

            $percentage = null;
            if (! $isAbsent && $marks !== null && $examSubject->total_marks) {
                $percentage = round(($marks / $examSubject->total_marks) * 100, 2);
            }

            return [
                'exam_subject_id' => $examSubject->id,
                'subject' => [
                    'id' => $examSubject->subject?->id,
                    'name' => $examSubject->subject?->name ?? 'Unknown',
                    'code' => $examSubject->subject?->code,
                ],
                'marks' => [
                    'obtained' => $marks,
                    'total' => $examSubject->total_marks,
                    'passing' => $examSubject->passing_marks,
                    'percentage' => $percentage,
                ],
                'is_absent' => $isAbsent,
                'is_pass' => $isPass,
                'remarks' => $remarks,
            ];
        });

        $totalObtained = 0;
        $totalMax = 0;
        $passedSubjects = 0;
        $failedSubjects = 0;
        $absentSubjects = 0;
        $hasIncompleteMarks = false;

        foreach ($subjectResults as $result) {
            if ($result['is_absent']) {
                $absentSubjects++;
                $hasIncompleteMarks = true;
            } elseif ($result['marks']['obtained'] !== null) {
                $totalObtained += $result['marks']['obtained'];
                if ($result['is_pass'] === true) {
                    $passedSubjects++;
                } elseif ($result['is_pass'] === false) {
                    $failedSubjects++;
                }
            } else {
                $hasIncompleteMarks = true;
            }

            if ($result['marks']['total']) {
                $totalMax += $result['marks']['total'];
            }
        }

        $penalty = $this->absenceMarkPenaltyCalculator->applyForAdmission(
            organizationId: $organizationId,
            schoolId: $schoolId,
            examId: (string) $exam->id,
            examClassId: $examStudent->exam_class_id ? (string) $examStudent->exam_class_id : null,
            studentAdmissionId: $examStudent->student_admission_id,
            rawTotal: (float) $totalObtained,
            totalMaximum: (float) $totalMax,
        );

        $summary = [
            'total_subjects' => $examSubjects->count(),
            'passed_subjects' => $passedSubjects,
            'failed_subjects' => $failedSubjects,
            'absent_subjects' => $absentSubjects,
            'total_marks_obtained' => $penalty['total_adjusted'],
            'total_maximum_marks' => $totalMax,
            'overall_percentage' => $penalty['percentage_adjusted'],
        ];

        if ($penalty['enabled']) {
            $summary['total_marks_obtained_raw'] = $penalty['total_raw'];
            $summary['marks_cut'] = $penalty['marks_cut'];
            $summary['absence_count'] = $penalty['absence_count'];
        }

        $studentModel = $examStudent->studentAdmission?->student;
        $picturePath = $studentModel?->picture_path;
        $pictureDataUrl = null;
        if ($embedPicture && is_string($picturePath) && $picturePath !== '') {
            $pictureDataUrl = $this->embedStudentPicture($picturePath);
        }

        $birthDate = $studentModel?->birth_date;
        $birthDateFormatted = null;
        if ($birthDate) {
            $birthDateFormatted = $this->dateConversionService->formatDate(
                $birthDate,
                $calendarPreference,
                'full',
                $language
            );
        }

        $gradeDetails = GradeCalculator::getGradeDetails(
            isset($summary['overall_percentage']) ? (float) $summary['overall_percentage'] : null,
            $organizationId,
            $language
        );
        $overallResult = GradeCalculator::determineOverallResult($hasIncompleteMarks, $gradeDetails);
        $summary['overall_result'] = $overallResult;
        $overallGradeName = $gradeDetails['name'] ?? null;

        $subjectsForPdf = $subjectResults->map(function (array $row) use ($organizationId, $language) {
            $pct = $row['marks']['percentage'] ?? null;
            $gradeName = $row['is_absent']
                ? null
                : GradeCalculator::getGradeName(
                    $pct !== null ? (float) $pct : null,
                    $organizationId,
                    $language
                );

            return array_merge($row, [
                'grade_name' => $gradeName,
            ]);
        })->values()->all();

        return [
            'exam' => [
                'id' => $exam->id,
                'name' => $exam->name,
                'status' => $exam->status,
                'start_date' => $exam->start_date,
                'end_date' => $exam->end_date,
                'academic_year' => $exam->academicYear?->name,
            ],
            'student' => [
                'id' => $studentModel?->id,
                'full_name' => $studentModel?->full_name ?? 'Unknown',
                'admission_no' => $studentModel?->admission_no,
                'roll_number' => $examStudent->exam_roll_number
                    ?? $examStudent->studentAdmission?->roll_number,
                'class' => $examStudent->examClass?->classAcademicYear?->class?->name,
                'section' => $examStudent->examClass?->classAcademicYear?->section_name,
                'father_name' => $studentModel?->father_name,
                'birth_date' => $birthDate ? (string) $birthDate : null,
                'birth_date_formatted' => $birthDateFormatted,
                'picture_path' => $picturePath,
                'picture_data_url' => $pictureDataUrl,
            ],
            'subjects' => $embedPicture ? $subjectsForPdf : $subjectResults->values()->all(),
            'summary' => array_merge($summary, [
                'overall_grade' => $overallGradeName,
            ]),
        ];
    }

    /**
     * @param  Collection<int, ExamStudent>|array<int, ExamStudent>  $examStudents
     * @return array{cards: list<array<string, mixed>>, labels: array<string, string>, generatedAt: string}
     */
    public function buildPdfPayload(
        Exam $exam,
        iterable $examStudents,
        string $organizationId,
        string $schoolId,
        string $language = 'en',
        string $calendarPreference = 'jalali',
    ): array {
        $labels = StudentExamReportCardLabels::forLanguage($language);
        $cards = [];

        foreach ($examStudents as $examStudent) {
            $card = $this->buildCard(
                $exam,
                $examStudent,
                $organizationId,
                $schoolId,
                $language,
                $calendarPreference,
                embedPicture: true,
            );
            if ($card !== null) {
                $cards[] = $card;
            }
        }

        return [
            'cards' => $cards,
            'labels' => $labels,
            'generatedAt' => now()->toISOString(),
            'rtl' => StudentExamReportCardLabels::isRtl($language),
        ];
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
        } catch (\Throwable $e) {
            return null;
        }
    }
}
