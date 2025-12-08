<?php

namespace App\Http\Controllers;

use App\Models\ExamStudent;
use App\Models\StudentAdmission;
use App\Models\ExamClass;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ExamStudentController extends Controller
{
    /**
     * Get all students enrolled in an exam
     */
    public function index(Request $request)
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

        $query = ExamStudent::with([
            'exam',
            'examClass.classAcademicYear.class',
            'studentAdmission.student'
        ])->whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id);

        if ($request->filled('exam_id')) {
            $query->where('exam_id', $request->exam_id);
        }

        if ($request->filled('exam_class_id')) {
            $query->where('exam_class_id', $request->exam_class_id);
        }

        $examStudents = $query->orderBy('created_at', 'desc')->get();

        return response()->json($examStudents);
    }

    /**
     * Enroll a student in an exam
     */
    public function store(Request $request)
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
            if (!$user->hasPermissionTo('exams.assign')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.assign: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validate([
            'exam_id' => 'required|uuid|exists:exams,id',
            'exam_class_id' => 'required|uuid|exists:exam_classes,id',
            'student_admission_id' => 'required|uuid|exists:student_admissions,id',
        ]);

        // Verify exam class belongs to exam
        $examClass = ExamClass::find($validated['exam_class_id']);
        if (!$examClass || $examClass->exam_id !== $validated['exam_id']) {
            return response()->json(['error' => 'Exam class does not belong to this exam'], 400);
        }

        // Verify student admission belongs to organization
        $studentAdmission = StudentAdmission::find($validated['student_admission_id']);
        if (!$studentAdmission || $studentAdmission->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'Student admission does not belong to your organization'], 403);
        }

        // Check if student is already enrolled
        $existing = ExamStudent::where('exam_id', $validated['exam_id'])
            ->where('student_admission_id', $validated['student_admission_id'])
            ->whereNull('deleted_at')
            ->first();

        if ($existing) {
            return response()->json(['error' => 'Student is already enrolled in this exam'], 400);
        }

        $examStudent = ExamStudent::create([
            'exam_id' => $validated['exam_id'],
            'exam_class_id' => $validated['exam_class_id'],
            'student_admission_id' => $validated['student_admission_id'],
            'organization_id' => $profile->organization_id,
        ]);

        $examStudent->load([
            'exam',
            'examClass.classAcademicYear.class',
            'studentAdmission.student'
        ]);

        return response()->json($examStudent, 201);
    }

    /**
     * Enroll all students from a class into an exam
     */
    public function bulkEnroll(Request $request)
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
            if (!$user->hasPermissionTo('exams.assign')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.assign: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validate([
            'exam_id' => 'required|uuid|exists:exams,id',
            'exam_class_id' => 'required|uuid|exists:exam_classes,id',
        ]);

        // Verify exam class belongs to exam
        $examClass = ExamClass::with('classAcademicYear')->find($validated['exam_class_id']);
        if (!$examClass || $examClass->exam_id !== $validated['exam_id']) {
            return response()->json(['error' => 'Exam class does not belong to this exam'], 400);
        }

        // Get all student admissions for this class academic year
        $studentAdmissions = StudentAdmission::where('class_academic_year_id', $examClass->class_academic_year_id)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->get();

        if ($studentAdmissions->isEmpty()) {
            return response()->json(['error' => 'No students found for this class'], 404);
        }

        $enrolled = [];
        $skipped = [];

        foreach ($studentAdmissions as $admission) {
            // Check if student is already enrolled
            $existing = ExamStudent::where('exam_id', $validated['exam_id'])
                ->where('student_admission_id', $admission->id)
                ->whereNull('deleted_at')
                ->first();

            if ($existing) {
                $skipped[] = $admission->id;
                continue;
            }

            $examStudent = ExamStudent::create([
                'exam_id' => $validated['exam_id'],
                'exam_class_id' => $validated['exam_class_id'],
                'student_admission_id' => $admission->id,
                'organization_id' => $profile->organization_id,
            ]);

            $enrolled[] = $examStudent->id;
        }

        return response()->json([
            'message' => 'Students enrolled successfully',
            'enrolled_count' => count($enrolled),
            'skipped_count' => count($skipped),
            'enrolled' => $enrolled,
            'skipped' => $skipped,
        ], 201);
    }

    /**
     * Remove a student from an exam
     */
    public function destroy(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('exams.assign')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.assign: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $examStudent = ExamStudent::where('organization_id', $profile->organization_id)
            ->where('id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (!$examStudent) {
            return response()->json(['error' => 'Exam student enrollment not found'], 404);
        }

        $examStudent->delete();

        return response()->json(['message' => 'Student removed from exam']);
    }
}
