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

        // Get academic years that have at least one published/completed exam
        $academicYears = AcademicYear::where('school_id', $schoolId)
            ->whereHas('exams', function ($query) {
                $query->where('status', 'published'); // Assuming 'published' is the status for visible exams
            })
            ->orderBy('start_date', 'desc')
            ->get(['id', 'name', 'code']);

        // Get all published exams for this school
        $exams = Exam::where('school_id', $schoolId)
            ->where('status', 'published')
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
                ->first();

            if (!$examStudent) {
                continue;
            }

            // 3. Get Results
            $examResults = ExamResult::where('exam_student_id', $examStudent->id)
                ->where('school_id', $schoolId) // Safety check
                ->join('exam_subjects', 'exam_results.exam_subject_id', '=', 'exam_subjects.id')
                ->join('subjects', 'exam_subjects.subject_id', '=', 'subjects.id')
                ->select(
                    'exam_results.*',
                    'exam_subjects.max_marks',
                    'exam_subjects.pass_marks',
                    'subjects.name as subject_name',
                    'subjects.code as subject_code'
                )
                ->orderBy('subjects.name')
                ->get();

            if ($examResults->isEmpty()) {
                continue;
            }

            // Calculate totals
            $totalMaxMarks = $examResults->sum('max_marks');
            $totalObtained = $examResults->sum(function ($result) {
                return $result->is_absent ? 0 : $result->marks_obtained;
            });
            $percentage = $totalMaxMarks > 0 ? ($totalObtained / $totalMaxMarks) * 100 : 0;
            
            // Determine global pass/fail if logic exists, for now simple aggregation
            $isPass = $examResults->every(function ($result) {
                return $result->is_absent ? false : ($result->marks_obtained >= $result->pass_marks);
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
