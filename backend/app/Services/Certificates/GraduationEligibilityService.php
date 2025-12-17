<?php

namespace App\Services\Certificates;

use App\Helpers\GradeCalculator;
use App\Models\Exam;
use App\Models\ExamClass;
use App\Models\ExamResult;
use App\Models\ExamStudent;
use App\Models\ExamSubject;
use Illuminate\Support\Collection;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;

class GraduationEligibilityService
{
    /**
     * Evaluate graduation eligibility for students in a class/exam scope.
     *
     * @return array{students: Collection}
     */
    public function evaluate(
        string $organizationId,
        string $schoolId,
        string $academicYearId,
        string $classId,
        string $examId
    ): array {
        $exam = Exam::where('organization_id', $organizationId)
            ->where('id', $examId)
            ->first();

        if (!$exam) {
            throw new UnprocessableEntityHttpException('Exam not found for organization.');
        }

        if ($exam->status !== Exam::STATUS_COMPLETED) {
            throw new UnprocessableEntityHttpException('Exam results must be finalized before generating graduation eligibility.');
        }

        $examClassIds = ExamClass::query()
            ->where('exam_id', $examId)
            ->whereHas('classAcademicYear', function ($query) use ($academicYearId, $classId) {
                $query->where('academic_year_id', $academicYearId)
                    ->where('class_id', $classId);
            })
            ->pluck('id');

        if ($examClassIds->isEmpty()) {
            return ['students' => collect()];
        }

        $subjects = ExamSubject::whereIn('exam_class_id', $examClassIds)->get();
        $subjectTotals = $subjects->keyBy('id')->map(function (ExamSubject $subject) {
            return [
                'total_marks' => $subject->total_marks ?? 0,
                'passing_marks' => $subject->passing_marks,
                'subject_id' => $subject->subject_id,
                'exam_subject_id' => $subject->id,
            ];
        });

        $examStudents = ExamStudent::with([
            'examResults' => function ($query) {
                $query->whereNull('deleted_at');
            },
            'studentAdmission.student',
        ])
            ->whereIn('exam_class_id', $examClassIds)
            ->where('organization_id', $organizationId)
            ->get();

        $results = $examStudents->map(function (ExamStudent $examStudent) use ($subjectTotals, $organizationId, $schoolId) {
            $student = $examStudent->studentAdmission?->student;
            $resultBySubject = $examStudent->examResults->keyBy('exam_subject_id');

            $issues = [];
            $totalObtained = 0;
            $totalPossible = 0;

            foreach ($subjectTotals as $subjectId => $subjectMeta) {
                /** @var ExamResult|null $result */
                $result = $resultBySubject->get($subjectId);
                if (!$result) {
                    $issues[] = [
                        'type' => 'missing_result',
                        'exam_subject_id' => $subjectId,
                    ];
                    continue;
                }

                if ($result->is_absent) {
                    $issues[] = [
                        'type' => 'absent',
                        'exam_subject_id' => $subjectId,
                    ];
                }

                if ($subjectMeta['total_marks']) {
                    $totalPossible += (float) $subjectMeta['total_marks'];
                    $totalObtained += (float) ($result->marks_obtained ?? 0);
                }

                if ($subjectMeta['passing_marks'] !== null && $result->marks_obtained !== null) {
                    if ($result->marks_obtained < $subjectMeta['passing_marks']) {
                        $issues[] = [
                            'type' => 'below_passing',
                            'exam_subject_id' => $subjectId,
                            'passing_marks' => $subjectMeta['passing_marks'],
                            'marks_obtained' => $result->marks_obtained,
                        ];
                    }
                }
            }

            $percentage = $totalPossible > 0 ? round(($totalObtained / $totalPossible) * 100, 2) : null;
            $gradePass = $percentage !== null ? GradeCalculator::isPass($percentage, $organizationId) : null;
            $isPass = empty($issues) && ($gradePass === null ? true : $gradePass === true);

            return [
                'student_id' => $student?->id,
                'student_name' => $student?->full_name,
                'school_id' => $schoolId,
                'exam_student_id' => $examStudent->id,
                'final_result_status' => $isPass ? 'pass' : 'fail',
                'eligibility_json' => [
                    'issues' => $issues,
                    'percentage' => $percentage,
                    'grade_pass' => $gradePass,
                    'total_obtained' => $totalObtained,
                    'total_possible' => $totalPossible,
                ],
            ];
        })->filter(fn ($item) => $item['student_id'] !== null);

        return ['students' => $results];
    }
}
