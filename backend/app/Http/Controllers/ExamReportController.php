<?php

namespace App\Http\Controllers;

use App\Helpers\GradeCalculator;
use App\Models\Exam;
use App\Models\ExamClass;
use App\Models\ExamResult;
use App\Models\ExamStudent;
use App\Models\ExamSubject;
use App\Models\StudentAdmission;
use App\Services\Exams\AbsenceMarkPenaltyCalculator;
use App\Services\ExamSubjectScheduleService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ExamReportController extends Controller
{
    public function __construct(
        private ExamSubjectScheduleService $examSubjectScheduleService,
        private AbsenceMarkPenaltyCalculator $absenceMarkPenaltyCalculator
    ) {}

    /**
     * Get exam overview report (existing show method)
     */
    public function show(Request $request, string $examId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (! $profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (! $user->hasPermissionTo('exams.view_reports')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for exams.view_reports: '.$e->getMessage());

            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $exam = Exam::with('academicYear')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('id', $examId)
            ->whereNull('deleted_at')
            ->first();

        if (! $exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        $examClasses = ExamClass::with([
            'classAcademicYear.class',
            'classAcademicYear.academicYear',
            'examSubjects.classSubject.subject',
            'examSubjects.examTimes' => function ($query) {
                $query->whereNull('deleted_at')
                    ->orderBy('date')
                    ->orderBy('start_time');
            },
        ])
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('exam_id', $examId)
            ->whereNull('deleted_at')
            ->get();

        $classIds = $examClasses->pluck('class_academic_year_id')->filter()->unique()->values();

        $studentCounts = StudentAdmission::select('class_academic_year_id', DB::raw('count(*) as count'))
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->whereIn('class_academic_year_id', $classIds)
            ->groupBy('class_academic_year_id')
            ->pluck('count', 'class_academic_year_id');

        $classes = $examClasses->map(function ($examClass) use ($studentCounts) {
            $subjects = $examClass->examSubjects
                ->filter(function ($examSubject) {
                    return $examSubject->deleted_at === null;
                })
                ->map(function ($examSubject) {
                    $scheduledAt = $this->examSubjectScheduleService->resolveScheduledAt($examSubject);

                    return [
                        'id' => $examSubject->id,
                        'subject_id' => $examSubject->subject_id ?? $examSubject->classSubject->subject_id ?? null,
                        'subject' => $examSubject->subject ?? $examSubject->classSubject->subject ?? null,
                        'class_subject_id' => $examSubject->class_subject_id,
                        'total_marks' => $examSubject->total_marks,
                        'passing_marks' => $examSubject->passing_marks,
                        'scheduled_at' => $scheduledAt?->toIso8601String(),
                    ];
                })->values();

            $classAcademicYear = $examClass->classAcademicYear;
            $studentCount = $studentCounts[$examClass->class_academic_year_id] ?? 0;

            return [
                'id' => $examClass->id,
                'class_academic_year_id' => $examClass->class_academic_year_id,
                'class_academic_year' => $classAcademicYear,
                'class' => $classAcademicYear->class ?? null,
                'academic_year' => $classAcademicYear->academicYear ?? null,
                'student_count' => $studentCount,
                'subjects' => $subjects,
            ];
        });

        $totals = [
            'classes' => $classes->count(),
            'subjects' => $classes->sum(fn ($c) => count($c['subjects'])),
            'students' => $classes->sum(fn ($c) => $c['student_count'] ?? 0),
        ];

        return response()->json([
            'exam' => $exam,
            'classes' => $classes,
            'totals' => $totals,
        ]);
    }

    /**
     * Get exam summary report with pass/fail statistics
     * GET /api/exams/{exam}/reports/summary
     */
    public function summary(Request $request, string $examId)
    {
        try {
            $user = $request->user();
            $profile = DB::table('profiles')->where('id', $user->id)->first();

            if (! $profile) {
                return response()->json(['error' => 'Profile not found'], 404);
            }

            if (! $profile->organization_id) {
                return response()->json(['error' => 'User must be assigned to an organization'], 403);
            }

            $currentSchoolId = $this->getCurrentSchoolId($request);

            try {
                if (! $user->hasPermissionTo('exams.view_reports')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                Log::warning('Permission check failed for exams.view_reports: '.$e->getMessage());

                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $exam = Exam::with('academicYear')
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->where('id', $examId)
                ->whereNull('deleted_at')
                ->first();

            if (! $exam) {
                return response()->json(['error' => 'Exam not found'], 404);
            }
        } catch (\Exception $e) {
            Log::error('Error in summary method: '.$e->getMessage(), [
                'exam_id' => $examId,
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json(['error' => 'An error occurred while fetching the summary'], 500);
        }

        try {
            // Get class count
            $classCount = ExamClass::where('exam_id', $examId)
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->whereNull('deleted_at')
                ->count();

            // Get subject count
            $subjectCount = ExamSubject::where('exam_id', $examId)
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->whereNull('deleted_at')
                ->count();

            // Get enrolled student count
            $enrolledStudents = ExamStudent::where('exam_id', $examId)
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->whereNull('deleted_at')
                ->withLiveActiveAdmission($exam->academic_year_id)
                ->count();

            // Get results statistics
            $resultStats = ExamResult::where('exam_id', $examId)
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->whereNull('deleted_at')
                ->selectRaw('
                    COUNT(*) as total_results,
                    COUNT(CASE WHEN is_absent = true THEN 1 END) as absent_count,
                    COUNT(CASE WHEN is_absent = false AND marks_obtained IS NOT NULL THEN 1 END) as marks_entered_count
                ')
                ->first();

            // Ensure resultStats is not null
            if (! $resultStats) {
                $resultStats = (object) [
                    'total_results' => 0,
                    'absent_count' => 0,
                    'marks_entered_count' => 0,
                ];
            }
        } catch (\Exception $e) {
            Log::error('Error fetching basic stats in summary: '.$e->getMessage(), [
                'exam_id' => $examId,
                'trace' => $e->getTraceAsString(),
            ]);
            // Set default values
            $classCount = 0;
            $subjectCount = 0;
            $enrolledStudents = 0;
            $resultStats = (object) [
                'total_results' => 0,
                'absent_count' => 0,
                'marks_entered_count' => 0,
            ];
        }

        // Calculate pass/fail by student (not by individual subject results)
        // A student passes if they pass ALL their subjects, fails if they fail ANY subject
        $passCount = 0;
        $failCount = 0;

        try {
            $examStudents = ExamStudent::where('exam_id', $examId)
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->whereNull('deleted_at')
                ->withLiveActiveAdmission($exam->academic_year_id)
                ->get();

            // Get all exam subjects for this exam, grouped by class
            $allExamSubjects = ExamSubject::where('exam_id', $examId)
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->whereNull('deleted_at')
                ->get()
                ->groupBy('exam_class_id');

            foreach ($examStudents as $examStudent) {
                // Skip if exam_class_id is not set
                if (! $examStudent->exam_class_id) {
                    continue;
                }

                // Get subjects for this student's class
                $studentSubjects = $allExamSubjects->get($examStudent->exam_class_id, collect());
                if ($studentSubjects->isEmpty()) {
                    continue;
                }

                $studentPassedAll = true;
                $studentFailedAny = false;
                $hasAnyResult = false;

                foreach ($studentSubjects as $examSubject) {
                    $result = ExamResult::where('exam_student_id', $examStudent->id)
                        ->where('exam_subject_id', $examSubject->id)
                        ->where('organization_id', $profile->organization_id)
                        ->where('school_id', $currentSchoolId)
                        ->whereNull('deleted_at')
                        ->first();

                    if ($result) {
                        $hasAnyResult = true;
                        if ($result->is_absent) {
                            // Absent counts as fail
                            $studentPassedAll = false;
                            $studentFailedAny = true;
                        } elseif ($result->marks_obtained !== null && $examSubject->passing_marks !== null) {
                            // Check if passed or failed
                            if ($result->marks_obtained < $examSubject->passing_marks) {
                                $studentPassedAll = false;
                                $studentFailedAny = true;
                            }
                        }
                    }
                }

                // Only count if student has at least one result
                if ($hasAnyResult) {
                    if ($studentPassedAll && ! $studentFailedAny) {
                        $passCount++;
                    } else {
                        $failCount++;
                    }
                }
            }
        } catch (\Exception $e) {
            Log::error('Error calculating pass/fail stats: '.$e->getMessage(), [
                'exam_id' => $examId,
                'trace' => $e->getTraceAsString(),
            ]);
            // Continue with default values if calculation fails
        }

        $passFailStats = (object) [
            'pass_count' => $passCount,
            'fail_count' => $failCount,
        ];

        // Get average marks
        try {
            $avgMarks = ExamResult::where('exam_id', $examId)
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->whereNull('deleted_at')
                ->where('is_absent', false)
                ->whereNotNull('marks_obtained')
                ->avg('marks_obtained');
        } catch (\Exception $e) {
            Log::error('Error calculating average marks: '.$e->getMessage());
            $avgMarks = null;
        }

        // Get marks distribution
        try {
            $gradeRangeCase = "
                CASE
                    WHEN marks_obtained >= 90 THEN '90-100'
                    WHEN marks_obtained >= 80 THEN '80-89'
                    WHEN marks_obtained >= 70 THEN '70-79'
                    WHEN marks_obtained >= 60 THEN '60-69'
                    WHEN marks_obtained >= 50 THEN '50-59'
                    WHEN marks_obtained >= 40 THEN '40-49'
                    ELSE 'Below 40'
                END
            ";

            $marksDistribution = ExamResult::where('exam_id', $examId)
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->whereNull('deleted_at')
                ->where('is_absent', false)
                ->whereNotNull('marks_obtained')
                ->selectRaw("{$gradeRangeCase} as grade_range, COUNT(*) as count")
                ->groupByRaw($gradeRangeCase)
                ->orderByRaw('MIN(CASE
                    WHEN marks_obtained >= 90 THEN 1
                    WHEN marks_obtained >= 80 THEN 2
                    WHEN marks_obtained >= 70 THEN 3
                    WHEN marks_obtained >= 60 THEN 4
                    WHEN marks_obtained >= 50 THEN 5
                    WHEN marks_obtained >= 40 THEN 6
                    ELSE 7
                END)')
                ->get();
        } catch (\Exception $e) {
            Log::error('Error calculating marks distribution: '.$e->getMessage());
            $marksDistribution = collect([]);
        }

        try {
            return response()->json([
                'exam' => [
                    'id' => $exam->id,
                    'name' => $exam->name,
                    'status' => $exam->status,
                    'start_date' => $exam->start_date,
                    'end_date' => $exam->end_date,
                    'academic_year' => $exam->academicYear,
                ],
                'totals' => [
                    'classes' => $classCount ?? 0,
                    'subjects' => $subjectCount ?? 0,
                    'enrolled_students' => $enrolledStudents ?? 0,
                    'results_entered' => $resultStats->total_results ?? 0,
                    'marks_entered' => $resultStats->marks_entered_count ?? 0,
                    'absent' => $resultStats->absent_count ?? 0,
                ],
                'pass_fail' => [
                    'pass_count' => $passFailStats?->pass_count ?? 0,
                    'fail_count' => $passFailStats?->fail_count ?? 0,
                    'pass_percentage' => (($passFailStats?->pass_count ?? 0) + ($passFailStats?->fail_count ?? 0)) > 0
                        ? round((($passFailStats->pass_count ?? 0) / (($passFailStats->pass_count ?? 0) + ($passFailStats->fail_count ?? 0))) * 100, 1)
                        : 0,
                ],
                'marks_statistics' => [
                    'average' => $avgMarks ? round($avgMarks, 2) : null,
                    'distribution' => $marksDistribution ?? [],
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error in summary method response: '.$e->getMessage(), [
                'exam_id' => $examId,
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'error' => 'An error occurred while generating the summary report',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get class mark sheet
     * GET /api/exams/{exam}/reports/classes/{classId}
     */
    public function classReport(Request $request, string $examId, string $classId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (! $profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (! $user->hasPermissionTo('exams.view_reports')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for exams.view_reports: '.$e->getMessage());

            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $exam = Exam::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('id', $examId)
            ->whereNull('deleted_at')
            ->first();

        if (! $exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        $examClass = ExamClass::with('classAcademicYear.class')
            ->where('id', $classId)
            ->where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->first();

        if (! $examClass) {
            return response()->json(['error' => 'Exam class not found'], 404);
        }

        // Get subjects for this class
        $examSubjects = ExamSubject::with('subject')
            ->where('exam_class_id', $classId)
            ->where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->get();

        // Get enrolled students
        $examStudents = ExamStudent::with('studentAdmission.student')
            ->where('exam_class_id', $classId)
            ->where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->withLiveActiveAdmission()
            ->get();

        // Get all results for this class
        $results = ExamResult::where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereIn('exam_student_id', $examStudents->pluck('id'))
            ->whereNull('deleted_at')
            ->get()
            ->groupBy('exam_student_id');

        $penaltyContext = $this->absenceMarkPenaltyCalculator->loadContext(
            $profile->organization_id,
            $currentSchoolId,
            (string) $exam->id,
            (string) $classId,
            $examStudents->pluck('student_admission_id')->all()
        );

        $bandPayload = $penaltyContext['bands']->map(fn ($band) => [
            'min_absences' => (int) $band->min_absences,
            'max_absences' => $band->max_absences === null ? null : (int) $band->max_absences,
            'marks_per_absence' => (float) $band->marks_per_absence,
        ])->all();

        // Build mark sheet
        $markSheet = $examStudents->map(function ($examStudent) use ($examSubjects, $results, $penaltyContext, $bandPayload) {
            $studentResults = $results->get($examStudent->id, collect());
            $subjectMarks = [];
            $totalObtained = 0;
            $totalMax = 0;
            $isAbsentInAny = false;

            foreach ($examSubjects as $examSubject) {
                $result = $studentResults->firstWhere('exam_subject_id', $examSubject->id);
                $marks = $result ? $result->marks_obtained : null;
                $isAbsent = $result ? $result->is_absent : false;

                $subjectMarks[] = [
                    'exam_subject_id' => $examSubject->id,
                    'subject_name' => $examSubject->subject?->name ?? 'Unknown',
                    'total_marks' => $examSubject->total_marks,
                    'passing_marks' => $examSubject->passing_marks,
                    'marks_obtained' => $marks,
                    'is_absent' => $isAbsent,
                    'is_pass' => ! $isAbsent && $marks !== null && $examSubject->passing_marks !== null
                        ? $marks >= $examSubject->passing_marks
                        : null,
                ];

                if (! $isAbsent && $marks !== null) {
                    $totalObtained += $marks;
                }
                if ($examSubject->total_marks) {
                    $totalMax += $examSubject->total_marks;
                }
                if ($isAbsent) {
                    $isAbsentInAny = true;
                }
            }

            $admissionId = $examStudent->student_admission_id;
            $penalty = $this->absenceMarkPenaltyCalculator->calculate(
                enabled: $penaltyContext['enabled'],
                bands: $bandPayload,
                absenceCount: (int) ($penaltyContext['absences_by_admission'][$admissionId] ?? 0),
                rawTotal: (float) $totalObtained,
                totalMaximum: (float) $totalMax,
            );

            $totals = [
                'obtained' => $penalty['total_adjusted'],
                'maximum' => $totalMax,
                'percentage' => $penalty['percentage_adjusted'],
            ];

            if ($penalty['enabled']) {
                $totals['obtained_raw'] = $penalty['total_raw'];
                $totals['marks_cut'] = $penalty['marks_cut'];
                $totals['absence_count'] = $penalty['absence_count'];
            }

            return [
                'exam_student_id' => $examStudent->id,
                'student' => [
                    'id' => $examStudent->studentAdmission?->student?->id,
                    'full_name' => $examStudent->studentAdmission?->student?->full_name ?? 'Unknown',
                    'admission_no' => $examStudent->studentAdmission?->student?->admission_no,
                    'roll_number' => $examStudent->studentAdmission?->roll_number,
                ],
                'subjects' => $subjectMarks,
                'totals' => $totals,
                'is_absent_in_any' => $isAbsentInAny,
            ];
        })->sortBy('student.roll_number')->values();

        return response()->json([
            'exam' => [
                'id' => $exam->id,
                'name' => $exam->name,
                'status' => $exam->status,
            ],
            'class' => [
                'id' => $examClass->id,
                'name' => $examClass->classAcademicYear?->class?->name ?? 'Unknown',
                'section' => $examClass->classAcademicYear?->section_name,
            ],
            'subjects' => $examSubjects->map(fn ($s) => [
                'id' => $s->id,
                'name' => $s->subject?->name ?? 'Unknown',
                'total_marks' => $s->total_marks,
                'passing_marks' => $s->passing_marks,
            ]),
            'students' => $markSheet,
            'summary' => [
                'total_students' => $examStudents->count(),
                'subjects_count' => $examSubjects->count(),
            ],
        ]);
    }

    /**
     * Get student result report
     * GET /api/exams/{exam}/reports/students/{studentId}
     */
    public function studentReport(Request $request, string $examId, string $studentId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (! $profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (! $user->hasPermissionTo('exams.view_reports')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for exams.view_reports: '.$e->getMessage());

            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $exam = Exam::with('academicYear')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('id', $examId)
            ->whereNull('deleted_at')
            ->first();

        if (! $exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        // Find exam student enrollment
        $examStudent = ExamStudent::with([
            'studentAdmission.student',
            'examClass.classAcademicYear.class',
        ])
            ->where('id', $studentId)
            ->where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->first();

        if (! $examStudent) {
            return response()->json(['error' => 'Student not enrolled in this exam'], 404);
        }

        // Get all results for this student in this exam
        $results = ExamResult::with('examSubject.subject')
            ->where('exam_student_id', $studentId)
            ->where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->get();

        // Get all subjects for this student's class
        $examSubjects = ExamSubject::with('subject')
            ->where('exam_class_id', $examStudent->exam_class_id)
            ->where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->get();

        // Build subject results
        $subjectResults = $examSubjects->map(function ($examSubject) use ($results) {
            $result = $results->firstWhere('exam_subject_id', $examSubject->id);

            $marks = $result ? $result->marks_obtained : null;
            $isAbsent = $result ? $result->is_absent : false;
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

        // Calculate totals
        $totalObtained = 0;
        $totalMax = 0;
        $passedSubjects = 0;
        $failedSubjects = 0;
        $absentSubjects = 0;

        foreach ($subjectResults as $result) {
            if ($result['is_absent']) {
                $absentSubjects++;
            } elseif ($result['marks']['obtained'] !== null) {
                $totalObtained += $result['marks']['obtained'];
                if ($result['marks']['total']) {
                    $totalMax += $result['marks']['total'];
                }
                if ($result['is_pass'] === true) {
                    $passedSubjects++;
                } elseif ($result['is_pass'] === false) {
                    $failedSubjects++;
                }
            }
        }

        $overallPercentage = $totalMax > 0 ? round(($totalObtained / $totalMax) * 100, 2) : 0;
        $overallResult = $failedSubjects === 0 && $absentSubjects === 0 && $passedSubjects > 0 ? 'Pass' : 'Fail';

        $penalty = $this->absenceMarkPenaltyCalculator->applyForAdmission(
            organizationId: $profile->organization_id,
            schoolId: $currentSchoolId,
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
            'overall_result' => $overallResult,
        ];

        if ($penalty['enabled']) {
            $summary['total_marks_obtained_raw'] = $penalty['total_raw'];
            $summary['marks_cut'] = $penalty['marks_cut'];
            $summary['absence_count'] = $penalty['absence_count'];
        }

        return response()->json([
            'exam' => [
                'id' => $exam->id,
                'name' => $exam->name,
                'status' => $exam->status,
                'start_date' => $exam->start_date,
                'end_date' => $exam->end_date,
                'academic_year' => $exam->academicYear?->name,
            ],
            'student' => [
                'id' => $examStudent->studentAdmission?->student?->id,
                'full_name' => $examStudent->studentAdmission?->student?->full_name ?? 'Unknown',
                'admission_no' => $examStudent->studentAdmission?->student?->admission_no,
                'roll_number' => $examStudent->studentAdmission?->roll_number,
                'class' => $examStudent->examClass?->classAcademicYear?->class?->name,
                'section' => $examStudent->examClass?->classAcademicYear?->section_name,
            ],
            'subjects' => $subjectResults,
            'summary' => $summary,
        ]);
    }

    /**
     * Get consolidated class mark sheet (all subjects for one class)
     * GET /api/exams/{exam}/reports/classes/{classId}/consolidated
     */
    public function consolidatedClassReport(Request $request, string $examId, string $classId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (! $profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (! $user->hasPermissionTo('exams.view_reports')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for exams.view_reports: '.$e->getMessage());

            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $exam = Exam::with('academicYear')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('id', $examId)
            ->whereNull('deleted_at')
            ->first();

        if (! $exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        $examClass = ExamClass::with('classAcademicYear.class')
            ->where('id', $classId)
            ->where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->first();

        if (! $examClass) {
            return response()->json(['error' => 'Exam class not found'], 404);
        }

        // Get subjects for this class
        $examSubjects = ExamSubject::with('subject')
            ->where('exam_class_id', $classId)
            ->where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->get();

        // Get enrolled students with their admissions
        $examStudents = ExamStudent::with('studentAdmission.student')
            ->where('exam_class_id', $classId)
            ->where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->withLiveActiveAdmission()
            ->get();

        // Get all results for this class
        $results = ExamResult::where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereIn('exam_student_id', $examStudents->pluck('id'))
            ->whereNull('deleted_at')
            ->get()
            ->groupBy('exam_student_id');

        $penaltyContext = $this->absenceMarkPenaltyCalculator->loadContext(
            $profile->organization_id,
            $currentSchoolId,
            (string) $exam->id,
            (string) $classId,
            $examStudents->pluck('student_admission_id')->all()
        );

        $bandPayload = $penaltyContext['bands']->map(fn ($band) => [
            'min_absences' => (int) $band->min_absences,
            'max_absences' => $band->max_absences === null ? null : (int) $band->max_absences,
            'marks_per_absence' => (float) $band->marks_per_absence,
        ])->all();

        // Build consolidated mark sheet with grades
        $markSheet = $examStudents->map(function ($examStudent) use ($examSubjects, $results, $profile, $penaltyContext, $bandPayload) {
            $studentResults = $results->get($examStudent->id, collect());
            $subjects = [];
            $totalObtained = 0;
            $totalMax = 0;
            $hasIncompleteMarks = false;

            foreach ($examSubjects as $examSubject) {
                $result = $studentResults->firstWhere('exam_subject_id', $examSubject->id);
                $marks = $result ? $result->marks_obtained : null;
                $isAbsent = $result ? $result->is_absent : false;

                $isPass = null;
                if (! $isAbsent && $marks !== null && $examSubject->passing_marks !== null) {
                    $isPass = $marks >= $examSubject->passing_marks;
                } elseif ($isAbsent) {
                    $isPass = false;
                }

                $subjects[] = [
                    'subject_id' => $examSubject->subject_id,
                    'subject_name' => $examSubject->subject?->name ?? 'Unknown',
                    'marks_obtained' => $marks,
                    'total_marks' => $examSubject->total_marks,
                    'passing_marks' => $examSubject->passing_marks,
                    'is_absent' => $isAbsent,
                    'is_pass' => $isPass,
                ];

                if (! $isAbsent && $marks !== null) {
                    $totalObtained += $marks;
                } else {
                    $hasIncompleteMarks = true;
                }

                if ($examSubject->total_marks) {
                    $totalMax += $examSubject->total_marks;
                }

            }

            $admissionId = $examStudent->student_admission_id;
            $penalty = $this->absenceMarkPenaltyCalculator->calculate(
                enabled: $penaltyContext['enabled'],
                bands: $bandPayload,
                absenceCount: (int) ($penaltyContext['absences_by_admission'][$admissionId] ?? 0),
                rawTotal: (float) $totalObtained,
                totalMaximum: (float) $totalMax,
            );

            $percentage = $penalty['percentage_adjusted'];

            // Calculate grade using GradeCalculator
            $gradeDetails = GradeCalculator::getGradeDetails($percentage, $profile->organization_id);

            // Subject results use subject passing marks above. The combined
            // result follows the configured grade for the total percentage.
            $result = GradeCalculator::determineOverallResult($hasIncompleteMarks, $gradeDetails);

            $row = [
                'id' => $examStudent->studentAdmission?->student?->id,
                'student_admission_id' => $admissionId,
                'roll_number' => $examStudent->exam_roll_number
                    ?? $examStudent->studentAdmission?->roll_number,
                'student_name' => $examStudent->studentAdmission?->student?->full_name ?? 'Unknown',
                'father_name' => $examStudent->studentAdmission?->student?->father_name,
                'admission_no' => $examStudent->studentAdmission?->student?->admission_no,
                'picture_path' => $examStudent->studentAdmission?->student?->picture_path,
                'subjects' => $subjects,
                'total_obtained' => $penalty['total_adjusted'],
                'total_maximum' => $totalMax,
                'percentage' => $percentage,
                'grade' => $gradeDetails ? $gradeDetails['name'] : null,
                'grade_details' => $gradeDetails,
                'result' => $result,
                'has_incomplete_marks' => $hasIncompleteMarks,
            ];

            if ($penalty['enabled']) {
                $row['total_obtained_raw'] = $penalty['total_raw'];
                $row['marks_cut'] = $penalty['marks_cut'];
                $row['absence_count'] = $penalty['absence_count'];
            }

            return $row;
        })->sortBy('roll_number')->values();

        return response()->json([
            'exam' => [
                'id' => $exam->id,
                'name' => $exam->name,
                'status' => $exam->status,
                'start_date' => $exam->start_date,
                'end_date' => $exam->end_date,
                'academic_year' => $exam->academicYear,
            ],
            'class' => [
                'id' => $examClass->id,
                'name' => $examClass->classAcademicYear?->class?->name ?? 'Unknown',
                'section' => $examClass->classAcademicYear?->section_name,
            ],
            'subjects' => $examSubjects->map(fn ($s) => [
                'id' => $s->id,
                'subject_id' => $s->subject_id,
                'name' => $s->subject?->name ?? 'Unknown',
                'total_marks' => $s->total_marks,
                'passing_marks' => $s->passing_marks,
            ]),
            'students' => $markSheet,
            'absence_penalty_enabled' => (bool) $penaltyContext['enabled'],
            'summary' => [
                'total_students' => $examStudents->count(),
                'subjects_count' => $examSubjects->count(),
                'pass_count' => $markSheet->where('result', 'Pass')->count(),
                'fail_count' => $markSheet->where('result', 'Fail')->count(),
                'incomplete_count' => $markSheet->where('result', 'Incomplete')->count(),
            ],
        ]);
    }

    /**
     * Get class-wise mark sheet per subject
     * GET /api/exams/{exam}/reports/classes/{classId}/subjects/{subjectId}
     */
    public function classSubjectMarkSheet(Request $request, string $examId, string $classId, string $subjectId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (! $profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (! $user->hasPermissionTo('exams.view_reports')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for exams.view_reports: '.$e->getMessage());

            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Validate request parameters
        $validated = $request->validate([
            'sort_by' => 'nullable|in:roll,marks,father_name',
            'sort_order' => 'nullable|in:asc,desc',
            'show_secret_number' => 'nullable|boolean',
            'show_rank' => 'nullable|boolean',
        ]);

        $sortBy = $validated['sort_by'] ?? 'roll';
        $sortOrder = $validated['sort_order'] ?? 'asc';
        $showSecretNumber = $validated['show_secret_number'] ?? false;
        $showRank = $validated['show_rank'] ?? true;

        $exam = Exam::with('academicYear')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('id', $examId)
            ->whereNull('deleted_at')
            ->first();

        if (! $exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        $examClass = ExamClass::with('classAcademicYear.class')
            ->where('id', $classId)
            ->where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->first();

        if (! $examClass) {
            return response()->json(['error' => 'Exam class not found'], 404);
        }

        // Get the specific subject
        $examSubject = ExamSubject::with('subject')
            ->where('id', $subjectId)
            ->where('exam_class_id', $classId)
            ->where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->first();

        if (! $examSubject) {
            return response()->json(['error' => 'Exam subject not found'], 404);
        }

        // Get enrolled students
        $examStudents = ExamStudent::with('studentAdmission.student')
            ->where('exam_class_id', $classId)
            ->where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->withLiveActiveAdmission()
            ->get();

        // Get results for this subject
        $results = ExamResult::where('exam_id', $examId)
            ->where('exam_subject_id', $subjectId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereIn('exam_student_id', $examStudents->pluck('id'))
            ->whereNull('deleted_at')
            ->get()
            ->keyBy('exam_student_id');

        // Build mark sheet
        $markSheet = $examStudents->map(function ($examStudent) use ($examSubject, $results) {
            $result = $results->get($examStudent->id);
            $marks = $result ? $result->marks_obtained : null;
            $isAbsent = $result ? $result->is_absent : false;

            $percentage = null;
            if (! $isAbsent && $marks !== null && $examSubject->total_marks) {
                $percentage = round(($marks / $examSubject->total_marks) * 100, 2);
            }

            $isPass = null;
            if (! $isAbsent && $marks !== null && $examSubject->passing_marks !== null) {
                $isPass = $marks >= $examSubject->passing_marks;
            }

            return [
                'id' => $examStudent->studentAdmission?->student?->id,
                'roll_number' => $examStudent->roll_number,
                'student_name' => $examStudent->studentAdmission?->student?->full_name ?? 'Unknown',
                'father_name' => $examStudent->studentAdmission?->student?->father_name,
                'admission_no' => $examStudent->studentAdmission?->student?->admission_no,
                'picture_path' => $examStudent->studentAdmission?->student?->picture_path,
                'marks_obtained' => $marks,
                'total_marks' => $examSubject->total_marks,
                'passing_marks' => $examSubject->passing_marks,
                'percentage' => $percentage,
                'is_absent' => $isAbsent,
                'is_pass' => $isPass,
                'secret_number' => $examStudent->secret_number,
            ];
        });

        // Apply sorting
        if ($sortBy === 'marks') {
            $markSheet = $sortOrder === 'desc'
                ? $markSheet->sortByDesc('marks_obtained')
                : $markSheet->sortBy('marks_obtained');
        } elseif ($sortBy === 'father_name') {
            $markSheet = $sortOrder === 'desc'
                ? $markSheet->sortByDesc('father_name')
                : $markSheet->sortBy('father_name');
        } else {
            // Default: sort by roll number
            $markSheet = $sortOrder === 'desc'
                ? $markSheet->sortByDesc('roll_number')
                : $markSheet->sortBy('roll_number');
        }

        $markSheet = $markSheet->values();

        // Calculate ranks if requested
        if ($showRank) {
            // Create a sorted list by marks (descending) for ranking
            $sortedByMarks = $markSheet->filter(fn ($s) => ! $s['is_absent'] && $s['marks_obtained'] !== null)
                ->sortByDesc('marks_obtained')
                ->values();

            $ranks = [];
            $currentRank = 1;
            $previousMarks = null;
            $studentsWithSameRank = 0;

            foreach ($sortedByMarks as $index => $student) {
                if ($previousMarks === null || $student['marks_obtained'] < $previousMarks) {
                    $currentRank += $studentsWithSameRank;
                    $studentsWithSameRank = 1;
                } else {
                    $studentsWithSameRank++;
                }

                $ranks[$student['admission_no']] = $currentRank;
                $previousMarks = $student['marks_obtained'];
            }

            // Add ranks to mark sheet
            $markSheet = $markSheet->map(function ($student) use ($ranks) {
                $student['rank'] = $ranks[$student['admission_no']] ?? null;

                return $student;
            });
        }

        return response()->json([
            'exam' => [
                'id' => $exam->id,
                'name' => $exam->name,
                'status' => $exam->status,
                'start_date' => $exam->start_date,
                'end_date' => $exam->end_date,
                'academic_year' => $exam->academicYear,
            ],
            'class' => [
                'id' => $examClass->id,
                'name' => $examClass->classAcademicYear?->class?->name ?? 'Unknown',
                'section' => $examClass->classAcademicYear?->section_name,
            ],
            'subject' => [
                'id' => $examSubject->id,
                'subject_id' => $examSubject->subject_id,
                'name' => $examSubject->subject?->name ?? 'Unknown',
                'code' => $examSubject->subject?->code,
                'total_marks' => $examSubject->total_marks,
                'passing_marks' => $examSubject->passing_marks,
            ],
            'students' => $markSheet,
            'summary' => [
                'total_students' => $examStudents->count(),
                'present_students' => $markSheet->where('is_absent', false)->count(),
                'absent_students' => $markSheet->where('is_absent', true)->count(),
                'pass_count' => $markSheet->where('is_pass', true)->count(),
                'fail_count' => $markSheet->where('is_pass', false)->count(),
                'average_marks' => $markSheet->where('is_absent', false)
                    ->whereNotNull('marks_obtained')
                    ->avg('marks_obtained'),
                'highest_marks' => $markSheet->where('is_absent', false)
                    ->whereNotNull('marks_obtained')
                    ->max('marks_obtained'),
                'lowest_marks' => $markSheet->where('is_absent', false)
                    ->whereNotNull('marks_obtained')
                    ->min('marks_obtained'),
            ],
            'options' => [
                'sort_by' => $sortBy,
                'sort_order' => $sortOrder,
                'show_secret_number' => $showSecretNumber,
                'show_rank' => $showRank,
            ],
        ]);
    }
}
