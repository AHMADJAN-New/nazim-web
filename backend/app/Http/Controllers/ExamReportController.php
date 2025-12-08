<?php

namespace App\Http\Controllers;

use App\Models\Exam;
use App\Models\ExamClass;
use App\Models\ExamSubject;
use App\Models\ExamStudent;
use App\Models\ExamResult;
use App\Models\StudentAdmission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ExamReportController extends Controller
{
    /**
     * Get exam overview report (existing show method)
     */
    public function show(Request $request, string $examId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('exams.view_reports')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.view_reports: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $exam = Exam::with('academicYear')
            ->where('organization_id', $profile->organization_id)
            ->where('id', $examId)
            ->whereNull('deleted_at')
            ->first();

        if (!$exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        $examClasses = ExamClass::with([
            'classAcademicYear.class',
            'classAcademicYear.academicYear',
            'examSubjects.classSubject.subject',
        ])
            ->where('organization_id', $profile->organization_id)
            ->where('exam_id', $examId)
            ->whereNull('deleted_at')
            ->get();

        $classIds = $examClasses->pluck('class_academic_year_id')->filter()->unique()->values();

        $studentCounts = StudentAdmission::select('class_academic_year_id', DB::raw('count(*) as count'))
            ->where('organization_id', $profile->organization_id)
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
                    return [
                        'id' => $examSubject->id,
                        'subject_id' => $examSubject->subject_id ?? $examSubject->classSubject->subject_id ?? null,
                        'subject' => $examSubject->subject ?? $examSubject->classSubject->subject ?? null,
                        'class_subject_id' => $examSubject->class_subject_id,
                        'total_marks' => $examSubject->total_marks,
                        'passing_marks' => $examSubject->passing_marks,
                        'scheduled_at' => $examSubject->scheduled_at,
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
            'subjects' => $classes->sum(fn($c) => count($c['subjects'])),
            'students' => $classes->sum(fn($c) => $c['student_count'] ?? 0),
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
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('exams.view_reports')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.view_reports: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $exam = Exam::with('academicYear')
            ->where('organization_id', $profile->organization_id)
            ->where('id', $examId)
            ->whereNull('deleted_at')
            ->first();

        if (!$exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        // Get class count
        $classCount = ExamClass::where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->count();

        // Get subject count
        $subjectCount = ExamSubject::where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->count();

        // Get enrolled student count
        $enrolledStudents = ExamStudent::where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->count();

        // Get results statistics
        $resultStats = ExamResult::where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->selectRaw('
                COUNT(*) as total_results,
                COUNT(CASE WHEN is_absent = true THEN 1 END) as absent_count,
                COUNT(CASE WHEN is_absent = false AND marks_obtained IS NOT NULL THEN 1 END) as marks_entered_count
            ')
            ->first();

        // Calculate pass/fail by comparing marks_obtained with passing_marks
        $passFailStats = DB::table('exam_results as er')
            ->join('exam_subjects as es', 'er.exam_subject_id', '=', 'es.id')
            ->where('er.exam_id', $examId)
            ->where('er.organization_id', $profile->organization_id)
            ->whereNull('er.deleted_at')
            ->whereNull('es.deleted_at')
            ->where('er.is_absent', false)
            ->whereNotNull('er.marks_obtained')
            ->whereNotNull('es.passing_marks')
            ->selectRaw('
                COUNT(CASE WHEN er.marks_obtained >= es.passing_marks THEN 1 END) as pass_count,
                COUNT(CASE WHEN er.marks_obtained < es.passing_marks THEN 1 END) as fail_count
            ')
            ->first();

        // Get average marks
        $avgMarks = ExamResult::where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->where('is_absent', false)
            ->whereNotNull('marks_obtained')
            ->avg('marks_obtained');

        // Get marks distribution
        $marksDistribution = ExamResult::where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->where('is_absent', false)
            ->whereNotNull('marks_obtained')
            ->selectRaw("
                CASE 
                    WHEN marks_obtained >= 90 THEN '90-100'
                    WHEN marks_obtained >= 80 THEN '80-89'
                    WHEN marks_obtained >= 70 THEN '70-79'
                    WHEN marks_obtained >= 60 THEN '60-69'
                    WHEN marks_obtained >= 50 THEN '50-59'
                    WHEN marks_obtained >= 40 THEN '40-49'
                    ELSE 'Below 40'
                END as grade_range,
                COUNT(*) as count
            ")
            ->groupBy('grade_range')
            ->orderByRaw("
                CASE grade_range
                    WHEN '90-100' THEN 1
                    WHEN '80-89' THEN 2
                    WHEN '70-79' THEN 3
                    WHEN '60-69' THEN 4
                    WHEN '50-59' THEN 5
                    WHEN '40-49' THEN 6
                    ELSE 7
                END
            ")
            ->get();

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
                'classes' => $classCount,
                'subjects' => $subjectCount,
                'enrolled_students' => $enrolledStudents,
                'results_entered' => $resultStats->total_results ?? 0,
                'marks_entered' => $resultStats->marks_entered_count ?? 0,
                'absent' => $resultStats->absent_count ?? 0,
            ],
            'pass_fail' => [
                'pass_count' => $passFailStats->pass_count ?? 0,
                'fail_count' => $passFailStats->fail_count ?? 0,
                'pass_percentage' => ($passFailStats->pass_count + $passFailStats->fail_count) > 0
                    ? round(($passFailStats->pass_count / ($passFailStats->pass_count + $passFailStats->fail_count)) * 100, 1)
                    : 0,
            ],
            'marks_statistics' => [
                'average' => $avgMarks ? round($avgMarks, 2) : null,
                'distribution' => $marksDistribution,
            ],
        ]);
    }

    /**
     * Get class mark sheet
     * GET /api/exams/{exam}/reports/classes/{classId}
     */
    public function classReport(Request $request, string $examId, string $classId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('exams.view_reports')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.view_reports: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $exam = Exam::where('organization_id', $profile->organization_id)
            ->where('id', $examId)
            ->whereNull('deleted_at')
            ->first();

        if (!$exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        $examClass = ExamClass::with('classAcademicYear.class')
            ->where('id', $classId)
            ->where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$examClass) {
            return response()->json(['error' => 'Exam class not found'], 404);
        }

        // Get subjects for this class
        $examSubjects = ExamSubject::with('subject')
            ->where('exam_class_id', $classId)
            ->where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->get();

        // Get enrolled students
        $examStudents = ExamStudent::with('studentAdmission.student')
            ->where('exam_class_id', $classId)
            ->where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->get();

        // Get all results for this class
        $results = ExamResult::where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->whereIn('exam_student_id', $examStudents->pluck('id'))
            ->whereNull('deleted_at')
            ->get()
            ->groupBy('exam_student_id');

        // Build mark sheet
        $markSheet = $examStudents->map(function ($examStudent) use ($examSubjects, $results) {
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
                    'is_pass' => !$isAbsent && $marks !== null && $examSubject->passing_marks !== null 
                        ? $marks >= $examSubject->passing_marks 
                        : null,
                ];

                if (!$isAbsent && $marks !== null) {
                    $totalObtained += $marks;
                }
                if ($examSubject->total_marks) {
                    $totalMax += $examSubject->total_marks;
                }
                if ($isAbsent) {
                    $isAbsentInAny = true;
                }
            }

            $percentage = $totalMax > 0 ? round(($totalObtained / $totalMax) * 100, 2) : 0;

            return [
                'exam_student_id' => $examStudent->id,
                'student' => [
                    'id' => $examStudent->studentAdmission?->student?->id,
                    'full_name' => $examStudent->studentAdmission?->student?->full_name ?? 'Unknown',
                    'admission_no' => $examStudent->studentAdmission?->admission_no,
                    'roll_number' => $examStudent->studentAdmission?->roll_number,
                ],
                'subjects' => $subjectMarks,
                'totals' => [
                    'obtained' => $totalObtained,
                    'maximum' => $totalMax,
                    'percentage' => $percentage,
                ],
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
            'subjects' => $examSubjects->map(fn($s) => [
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

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('exams.view_reports')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.view_reports: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $exam = Exam::with('academicYear')
            ->where('organization_id', $profile->organization_id)
            ->where('id', $examId)
            ->whereNull('deleted_at')
            ->first();

        if (!$exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        // Find exam student enrollment
        $examStudent = ExamStudent::with([
            'studentAdmission.student',
            'examClass.classAcademicYear.class'
        ])
            ->where('id', $studentId)
            ->where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$examStudent) {
            return response()->json(['error' => 'Student not enrolled in this exam'], 404);
        }

        // Get all results for this student in this exam
        $results = ExamResult::with('examSubject.subject')
            ->where('exam_student_id', $studentId)
            ->where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->get();

        // Get all subjects for this student's class
        $examSubjects = ExamSubject::with('subject')
            ->where('exam_class_id', $examStudent->exam_class_id)
            ->where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->get();

        // Build subject results
        $subjectResults = $examSubjects->map(function ($examSubject) use ($results) {
            $result = $results->firstWhere('exam_subject_id', $examSubject->id);
            
            $marks = $result ? $result->marks_obtained : null;
            $isAbsent = $result ? $result->is_absent : false;
            $remarks = $result ? $result->remarks : null;

            $isPass = null;
            if (!$isAbsent && $marks !== null && $examSubject->passing_marks !== null) {
                $isPass = $marks >= $examSubject->passing_marks;
            }

            $percentage = null;
            if (!$isAbsent && $marks !== null && $examSubject->total_marks) {
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
            } else if ($result['marks']['obtained'] !== null) {
                $totalObtained += $result['marks']['obtained'];
                if ($result['marks']['total']) {
                    $totalMax += $result['marks']['total'];
                }
                if ($result['is_pass'] === true) {
                    $passedSubjects++;
                } else if ($result['is_pass'] === false) {
                    $failedSubjects++;
                }
            }
        }

        $overallPercentage = $totalMax > 0 ? round(($totalObtained / $totalMax) * 100, 2) : 0;
        $overallResult = $failedSubjects === 0 && $absentSubjects === 0 && $passedSubjects > 0 ? 'Pass' : 'Fail';

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
                'admission_no' => $examStudent->studentAdmission?->admission_no,
                'roll_number' => $examStudent->studentAdmission?->roll_number,
                'class' => $examStudent->examClass?->classAcademicYear?->class?->name,
                'section' => $examStudent->examClass?->classAcademicYear?->section_name,
            ],
            'subjects' => $subjectResults,
            'summary' => [
                'total_subjects' => $examSubjects->count(),
                'passed_subjects' => $passedSubjects,
                'failed_subjects' => $failedSubjects,
                'absent_subjects' => $absentSubjects,
                'total_marks_obtained' => $totalObtained,
                'total_maximum_marks' => $totalMax,
                'overall_percentage' => $overallPercentage,
                'overall_result' => $overallResult,
            ],
        ]);
    }
}
