<?php

namespace App\Http\Controllers\Website;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\Exam;
use App\Models\ExamResult;
use App\Models\ExamStudent;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PublicExamResultController extends Controller
{
    public function options(Request $request)
    {
        $schoolId = $request->attributes->get('school_id');

        // Get academic years that have at least one completed exam
        $academicYears = AcademicYear::where('school_id', $schoolId)
            ->whereHas('exams', function ($query) {
                $query->where('status', Exam::STATUS_COMPLETED)
                    ->whereNull('deleted_at');
            })
            ->orderBy('start_date', 'desc')
            ->get(['id', 'name']);

        // Get all completed exams for this school
        $exams = Exam::where('school_id', $schoolId)
            ->where('status', Exam::STATUS_COMPLETED)
            ->whereNull('deleted_at')
            ->orderBy('start_date', 'desc')
            ->get(['id', 'name', 'academic_year_id']);

        return response()->json([
            'academic_years' => $academicYears,
            'exams' => $exams,
        ]);
    }

    public function search(Request $request)
    {
        $schoolId = $request->attributes->get('school_id');

        $request->validate([
            'exam_id' => 'required|uuid',
            'search_term' => 'required|string|min:3',
        ]);

        $examId = $request->exam_id;
        $searchTerm = strtolower(trim($request->search_term));

        // 1. Find the student in this school matching the search term
        // We search by name, code, admission number
        $students = Student::where('school_id', $schoolId)
            ->whereNull('deleted_at')
            ->where(function ($query) use ($searchTerm) {
                $query->where(DB::raw('lower(full_name)'), 'like', "%{$searchTerm}%")
                    ->orWhere(DB::raw('lower(student_code)'), '=', $searchTerm)
                    ->orWhere(DB::raw('lower(admission_no)'), '=', $searchTerm)
                    // Optional: Father name search if needed
                    ->orWhere(DB::raw('lower(father_name)'), 'like', "%{$searchTerm}%");
            })
            ->limit(5) // Limit matches to prevent leaking too much info if generic search
            ->get();

        if ($students->isEmpty()) {
            return response()->json(['results' => []]);
        }

        $results = [];

        foreach ($students as $student) {
            // 2. Check if student is enrolled in this exam
            $examStudent = ExamStudent::where('exam_id', $examId)
                ->where('student_id', $student->id)
                ->whereNull('deleted_at')
                ->first();

            if (!$examStudent) {
                continue;
            }

            // 3. Get Results using DB query builder for better control
            $examResultsData = DB::table('exam_results')
                ->where('exam_results.exam_student_id', $examStudent->id)
                ->where('exam_results.school_id', $schoolId)
                ->whereNull('exam_results.deleted_at')
                ->join('exam_subjects', function ($join) {
                    $join->on('exam_results.exam_subject_id', '=', 'exam_subjects.id')
                        ->whereNull('exam_subjects.deleted_at');
                })
                ->join('subjects', function ($join) {
                    $join->on('exam_subjects.subject_id', '=', 'subjects.id')
                        ->whereNull('subjects.deleted_at');
                })
                ->select(
                    'exam_results.id',
                    'exam_results.exam_id',
                    'exam_results.exam_subject_id',
                    'exam_results.exam_student_id',
                    'exam_results.marks_obtained',
                    'exam_results.is_absent',
                    'exam_results.remarks',
                    'exam_subjects.total_marks as max_marks',
                    'exam_subjects.passing_marks as pass_marks',
                    'subjects.name as subject_name',
                    'subjects.code as subject_code'
                )
                ->orderBy('subjects.name')
                ->get();
            
            // Convert to collection of objects for consistency
            $examResults = collect($examResultsData)->map(function ($item) {
                return (object) [
                    'id' => $item->id,
                    'exam_id' => $item->exam_id,
                    'exam_subject_id' => $item->exam_subject_id,
                    'exam_student_id' => $item->exam_student_id,
                    'marks_obtained' => $item->marks_obtained,
                    'is_absent' => $item->is_absent,
                    'remarks' => $item->remarks,
                    'max_marks' => $item->max_marks,
                    'pass_marks' => $item->pass_marks,
                    'subject_name' => $item->subject_name,
                    'subject_code' => $item->subject_code,
                ];
            });

            if ($examResults->isEmpty()) {
                continue;
            }

            // Calculate totals
            $totalMaxMarks = $examResults->sum(function ($result) {
                return $result->max_marks ?? 0;
            });
            $totalObtained = $examResults->sum(function ($result) {
                return $result->is_absent ? 0 : ($result->marks_obtained ?? 0);
            });
            $percentage = $totalMaxMarks > 0 ? ($totalObtained / $totalMaxMarks) * 100 : 0;
            
            // Determine global pass/fail if logic exists, for now simple aggregation
            $isPass = $examResults->every(function ($result) {
                if ($result->is_absent) {
                    return false;
                }
                $passMarks = $result->pass_marks ?? 0;
                $obtained = $result->marks_obtained ?? 0;
                return $obtained >= $passMarks;
            });

            // If we have a position/rank stored in ExamStudent, use it
            // Assuming rank might be stored in ExamStudent table or calculated dynamically
            // For now, we'll leave rank out unless requested to calculate it on the fly (expensive)

            $results[] = [
                'student' => [
                    'id' => $student->id,
                    'name' => $student->full_name,
                    'father_name' => $student->father_name,
                    'student_code' => $student->student_code,
                    'photo_path' => $student->picture_path,
                ],
                'results' => $examResults,
                'summary' => [
                    'total_max' => $totalMaxMarks,
                    'total_obtained' => $totalObtained,
                    'percentage' => round($percentage, 2),
                    'result_status' => $isPass ? 'PASS' : 'FAIL', // This is simplistic, might need more complex logic
                ]
            ];
        }

        return response()->json(['results' => $results]);
    }
}
