<?php

namespace App\Http\Controllers;

use App\Models\Exam;
use App\Models\ExamClass;
use App\Models\StudentAdmission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ExamReportController extends Controller
{
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
            if (!$user->hasPermissionTo('exams.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.read: " . $e->getMessage());
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
}
