<?php

namespace App\Services\Certificates;

use App\Helpers\GradeCalculator;
use App\Models\AcademicYear;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
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

    /**
     * Evaluate graduation eligibility for students across multiple exams with weights.
     *
     * @param array $examIds Array of exam IDs
     * @param array $weights Array of weights keyed by exam_id (optional, will distribute evenly if not provided)
     * @param float|null $minAttendance Minimum attendance percentage required
     * @param bool $excludeLeaves Whether to exclude approved leaves from attendance calculation
     * @return array{students: Collection}
     */
    public function evaluateMultiExam(
        string $organizationId,
        string $schoolId,
        string $academicYearId,
        string $classId,
        array $examIds,
        array $weights = [],
        ?float $minAttendance = null,
        bool $excludeLeaves = true
    ): array {
        // Validate all exams exist and are completed
        $exams = Exam::where('organization_id', $organizationId)
            ->whereIn('id', $examIds)
            ->get();

        if ($exams->count() !== count($examIds)) {
            throw new UnprocessableEntityHttpException('One or more exams not found for organization.');
        }

        foreach ($exams as $exam) {
            if ($exam->status !== Exam::STATUS_COMPLETED) {
                throw new UnprocessableEntityHttpException('All exam results must be finalized before generating graduation eligibility.');
            }
        }

        // Calculate weights if not provided (distribute evenly)
        if (empty($weights)) {
            $equalWeight = 100 / count($examIds);
            $weights = array_fill_keys($examIds, $equalWeight);
        }

        // Normalize weights to sum to 100
        $totalWeight = array_sum($weights);
        if ($totalWeight > 0) {
            $weights = array_map(fn($w) => ($w / $totalWeight) * 100, $weights);
        }

        // Get all exam class IDs for all exams
        $allExamClassIds = ExamClass::query()
            ->whereIn('exam_id', $examIds)
            ->whereHas('classAcademicYear', function ($query) use ($academicYearId, $classId) {
                $query->where('academic_year_id', $academicYearId)
                    ->where('class_id', $classId);
            })
            ->pluck('id');

        if ($allExamClassIds->isEmpty()) {
            return ['students' => collect()];
        }

        // Get all subjects across all exams
        $allSubjects = ExamSubject::whereIn('exam_class_id', $allExamClassIds)
            ->with('examClass')
            ->get();

        // Group subjects by subject_id (same subject across different exams)
        $subjectsBySubjectId = $allSubjects->groupBy('subject_id');

        // Get all exam students
        $allExamStudents = ExamStudent::with([
            'examResults' => function ($query) {
                $query->whereNull('deleted_at');
            },
            'studentAdmission.student',
            'examClass',
        ])
            ->whereIn('exam_class_id', $allExamClassIds)
            ->where('organization_id', $organizationId)
            ->get();

        // Group students by student_id
        $studentsByStudentId = $allExamStudents->groupBy(function ($examStudent) {
            return $examStudent->studentAdmission?->student?->id;
        })->filter(fn($group, $studentId) => $studentId !== null);

        // Calculate attendance if required
        $attendanceData = [];
        if ($minAttendance !== null) {
            $attendanceData = $this->calculateAttendanceForStudents(
                $studentsByStudentId->keys()->toArray(),
                $organizationId,
                $academicYearId,
                $classId,
                $excludeLeaves
            );
        }

        // Process each student
        $results = $studentsByStudentId->map(function ($examStudents, $studentId) use (
            $subjectsBySubjectId,
            $weights,
            $organizationId,
            $schoolId,
            $minAttendance,
            $attendanceData
        ) {
            $student = $examStudents->first()->studentAdmission?->student;

            // Aggregate marks per subject across all exams
            $subjectAggregates = [];
            $issues = [];

            foreach ($subjectsBySubjectId as $subjectId => $subjects) {
                $weightedTotal = 0;
                $totalWeight = 0;
                $subjectIssues = [];

                foreach ($subjects as $subject) {
                    $examId = $subject->examClass->exam_id;
                    $weight = $weights[$examId] ?? 0;

                    // Find exam student for this exam
                    $examStudent = $examStudents->firstWhere('examClass.exam_id', $examId);
                    if (!$examStudent) {
                        $subjectIssues[] = [
                            'type' => 'not_enrolled',
                            'exam_id' => $examId,
                            'subject_id' => $subjectId,
                        ];
                        continue;
                    }

                    // Find result for this subject
                    $result = $examStudent->examResults->firstWhere('exam_subject_id', $subject->id);
                    if (!$result) {
                        $subjectIssues[] = [
                            'type' => 'missing_result',
                            'exam_id' => $examId,
                            'exam_subject_id' => $subject->id,
                        ];
                        continue;
                    }

                    if ($result->is_absent) {
                        $subjectIssues[] = [
                            'type' => 'absent',
                            'exam_id' => $examId,
                            'exam_subject_id' => $subject->id,
                        ];
                    }

                    $marksObtained = (float) ($result->marks_obtained ?? 0);
                    $totalMarks = (float) ($subject->total_marks ?? 0);

                    if ($totalMarks > 0) {
                        $percentage = ($marksObtained / $totalMarks) * 100;
                        $weightedTotal += $percentage * ($weight / 100);
                        $totalWeight += $weight;
                    }

                    // Check passing marks
                    if ($subject->passing_marks !== null && $marksObtained < $subject->passing_marks) {
                        $subjectIssues[] = [
                            'type' => 'below_passing',
                            'exam_id' => $examId,
                            'exam_subject_id' => $subject->id,
                            'passing_marks' => $subject->passing_marks,
                            'marks_obtained' => $marksObtained,
                        ];
                    }
                }

                $finalPercentage = $totalWeight > 0 ? $weightedTotal / ($totalWeight / 100) : null;
                $subjectAggregates[$subjectId] = [
                    'final_percentage' => $finalPercentage,
                    'issues' => $subjectIssues,
                ];

                if (!empty($subjectIssues)) {
                    $issues = array_merge($issues, $subjectIssues);
                }
            }

            // Calculate overall percentage
            $overallPercentage = null;
            $validSubjects = collect($subjectAggregates)->filter(fn($s) => $s['final_percentage'] !== null);
            if ($validSubjects->isNotEmpty()) {
                $overallPercentage = $validSubjects->avg('final_percentage');
            }

            $gradePass = $overallPercentage !== null ? GradeCalculator::isPass($overallPercentage, $organizationId) : null;

            // Check attendance
            $attendanceIssue = null;
            if ($minAttendance !== null && isset($attendanceData[$studentId])) {
                $attendance = $attendanceData[$studentId];
                if ($attendance['percentage'] < $minAttendance) {
                    $attendanceIssue = [
                        'type' => 'insufficient_attendance',
                        'percentage' => $attendance['percentage'],
                        'required' => $minAttendance,
                        'total_days' => $attendance['total_days'],
                        'present_days' => $attendance['present_days'],
                        'absent_days' => $attendance['absent_days'],
                        'leave_days' => $attendance['leave_days'],
                    ];
                    $issues[] = $attendanceIssue;
                }
            }

            $isPass = empty($issues) && ($gradePass === null ? true : $gradePass === true);

            return [
                'student_id' => $studentId,
                'student_name' => $student?->full_name,
                'school_id' => $schoolId,
                'final_result_status' => $isPass ? 'pass' : 'fail',
                'eligibility_json' => [
                    'overall_percentage' => $overallPercentage,
                    'attendance' => $attendanceData[$studentId] ?? null,
                    'attendance_issue' => $attendanceIssue,
                    'subject_aggregates' => $subjectAggregates,
                    'issues' => $issues,
                    'exams' => array_keys($weights),
                    'weights' => $weights,
                ],
            ];
        })->values();

        return ['students' => $results];
    }

    /**
     * Calculate attendance percentage for multiple students.
     */
    private function calculateAttendanceForStudents(
        array $studentIds,
        string $organizationId,
        string $academicYearId,
        string $classId,
        bool $excludeLeaves = true
    ): array {
        $academicYear = AcademicYear::find($academicYearId);
        if (!$academicYear || !$academicYear->start_date || !$academicYear->end_date) {
            return [];
        }

        // Get all attendance sessions for this class in academic year
        $sessions = AttendanceSession::where('organization_id', $organizationId)
            ->where('class_id', $classId)
            ->whereBetween('session_date', [$academicYear->start_date, $academicYear->end_date])
            ->get();

        $totalDays = $sessions->count();
        if ($totalDays === 0) {
            return [];
        }

        // Get all attendance records for these students
        $records = AttendanceRecord::whereIn('student_id', $studentIds)
            ->whereIn('attendance_session_id', $sessions->pluck('id'))
            ->get()
            ->groupBy('student_id');

        $attendanceData = [];

        foreach ($studentIds as $studentId) {
            $studentRecords = $records->get($studentId, collect());

            $presentDays = $studentRecords->where('status', 'present')->count();
            $absentDays = $studentRecords->where('status', 'absent')->count();
            $leaveDays = $studentRecords->where('status', 'leave')->count();
            $excusedDays = $studentRecords->where('status', 'excused')->count();

            $effectiveTotal = $excludeLeaves ? $totalDays - $leaveDays : $totalDays;
            $effectivePresent = $presentDays + ($excludeLeaves ? $leaveDays : 0) + $excusedDays;

            $percentage = $effectiveTotal > 0
                ? round(($effectivePresent / $effectiveTotal) * 100, 2)
                : 0;

            $attendanceData[$studentId] = [
                'percentage' => $percentage,
                'total_days' => $totalDays,
                'present_days' => $presentDays,
                'absent_days' => $absentDays,
                'leave_days' => $leaveDays,
                'excused_days' => $excusedDays,
                'effective_total' => $effectiveTotal,
                'effective_present' => $effectivePresent,
            ];
        }

        return $attendanceData;
    }
}
