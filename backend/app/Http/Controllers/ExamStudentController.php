<?php

namespace App\Http\Controllers;

use App\Models\Exam;
use App\Models\ExamStudent;
use App\Models\ExamClass;
use App\Models\StudentAdmission;
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
            if (!$user->hasPermissionTo('exams.enroll_students')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.enroll_students: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validate([
            'exam_id' => 'required|uuid|exists:exams,id',
            'exam_class_id' => 'required|uuid|exists:exam_classes,id',
            'student_admission_id' => 'required|uuid|exists:student_admissions,id',
        ]);

        // Verify exam belongs to organization
        $exam = Exam::where('organization_id', $profile->organization_id)
            ->where('id', $validated['exam_id'])
            ->whereNull('deleted_at')
            ->first();

        if (!$exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        // Check if exam allows enrollment modifications
        if ($exam->isConfigurationLocked()) {
            return response()->json([
                'error' => 'Cannot enroll students in a completed or archived exam',
                'status' => $exam->status
            ], 422);
        }

        // Verify exam class belongs to exam
        $examClass = ExamClass::where('id', $validated['exam_class_id'])
            ->where('exam_id', $validated['exam_id'])
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$examClass) {
            return response()->json(['error' => 'Exam class does not belong to this exam'], 400);
        }

        // Verify student admission belongs to organization
        $studentAdmission = StudentAdmission::where('id', $validated['student_admission_id'])
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$studentAdmission) {
            return response()->json(['error' => 'Student admission does not belong to your organization'], 403);
        }

        // CRITICAL: Verify student belongs to the correct class academic year
        if ($studentAdmission->class_academic_year_id !== $examClass->class_academic_year_id) {
            return response()->json([
                'error' => 'Student does not belong to the class being enrolled for this exam',
                'student_class_academic_year_id' => $studentAdmission->class_academic_year_id,
                'exam_class_academic_year_id' => $examClass->class_academic_year_id,
            ], 422);
        }

        // Check if student is already enrolled in this exam
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
            if (!$user->hasPermissionTo('exams.enroll_students')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.enroll_students: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validate([
            'exam_id' => 'required|uuid|exists:exams,id',
            'exam_class_id' => 'required|uuid|exists:exam_classes,id',
        ]);

        // Verify exam belongs to organization
        $exam = Exam::where('organization_id', $profile->organization_id)
            ->where('id', $validated['exam_id'])
            ->whereNull('deleted_at')
            ->first();

        if (!$exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        // Check if exam allows enrollment modifications
        if ($exam->isConfigurationLocked()) {
            return response()->json([
                'error' => 'Cannot enroll students in a completed or archived exam',
                'status' => $exam->status
            ], 422);
        }

        // Verify exam class belongs to exam
        $examClass = ExamClass::with('classAcademicYear')
            ->where('id', $validated['exam_class_id'])
            ->where('exam_id', $validated['exam_id'])
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$examClass) {
            return response()->json(['error' => 'Exam class does not belong to this exam'], 400);
        }

        // Get all active student admissions for this class academic year
        $studentAdmissions = StudentAdmission::where('class_academic_year_id', $examClass->class_academic_year_id)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->where('status', 'active') // Only enroll active students
            ->get();

        if ($studentAdmissions->isEmpty()) {
            return response()->json([
                'error' => 'No active students found for this class',
                'class_academic_year_id' => $examClass->class_academic_year_id
            ], 404);
        }

        $enrolled = [];
        $skipped = [];
        $errors = [];

        DB::beginTransaction();
        try {
            foreach ($studentAdmissions as $admission) {
                // Check if student is already enrolled
                $existing = ExamStudent::where('exam_id', $validated['exam_id'])
                    ->where('student_admission_id', $admission->id)
                    ->whereNull('deleted_at')
                    ->first();

                if ($existing) {
                    $skipped[] = [
                        'student_admission_id' => $admission->id,
                        'reason' => 'already_enrolled'
                    ];
                    continue;
                }

                try {
                    $examStudent = ExamStudent::create([
                        'exam_id' => $validated['exam_id'],
                        'exam_class_id' => $validated['exam_class_id'],
                        'student_admission_id' => $admission->id,
                        'organization_id' => $profile->organization_id,
                    ]);

                    $enrolled[] = $examStudent->id;
                } catch (\Exception $e) {
                    $errors[] = [
                        'student_admission_id' => $admission->id,
                        'error' => $e->getMessage()
                    ];
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Bulk enrollment completed',
                'enrolled_count' => count($enrolled),
                'skipped_count' => count($skipped),
                'error_count' => count($errors),
                'enrolled' => $enrolled,
                'skipped' => $skipped,
                'errors' => $errors,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Bulk enrollment failed: " . $e->getMessage());
            return response()->json(['error' => 'Bulk enrollment failed', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Enroll all students from all exam classes
     * POST /api/exams/{exam}/enroll-all
     */
    public function enrollAll(Request $request, string $examId)
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
            if (!$user->hasPermissionTo('exams.enroll_students')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.enroll_students: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Verify exam belongs to organization
        $exam = Exam::where('organization_id', $profile->organization_id)
            ->where('id', $examId)
            ->whereNull('deleted_at')
            ->first();

        if (!$exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        // Check if exam allows enrollment modifications
        if ($exam->isConfigurationLocked()) {
            return response()->json([
                'error' => 'Cannot enroll students in a completed or archived exam',
                'status' => $exam->status
            ], 422);
        }

        // Get all exam classes for this exam
        $examClasses = ExamClass::where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->get();

        if ($examClasses->isEmpty()) {
            return response()->json([
                'error' => 'No classes assigned to this exam'
            ], 404);
        }

        $totalEnrolled = 0;
        $totalSkipped = 0;
        $totalErrors = 0;
        $classResults = [];

        DB::beginTransaction();
        try {
            foreach ($examClasses as $examClass) {
                // Get all active student admissions for this class academic year
                $studentAdmissions = StudentAdmission::where('class_academic_year_id', $examClass->class_academic_year_id)
                    ->where('organization_id', $profile->organization_id)
                    ->whereNull('deleted_at')
                    ->where('status', 'active')
                    ->get();

                $enrolled = 0;
                $skipped = 0;
                $errors = 0;

                foreach ($studentAdmissions as $admission) {
                    // Check if student is already enrolled
                    $existing = ExamStudent::where('exam_id', $examId)
                        ->where('student_admission_id', $admission->id)
                        ->whereNull('deleted_at')
                        ->first();

                    if ($existing) {
                        $skipped++;
                        continue;
                    }

                    try {
                        ExamStudent::create([
                            'exam_id' => $examId,
                            'exam_class_id' => $examClass->id,
                            'student_admission_id' => $admission->id,
                            'organization_id' => $profile->organization_id,
                        ]);
                        $enrolled++;
                    } catch (\Exception $e) {
                        $errors++;
                    }
                }

                $classResults[] = [
                    'exam_class_id' => $examClass->id,
                    'class_academic_year_id' => $examClass->class_academic_year_id,
                    'enrolled' => $enrolled,
                    'skipped' => $skipped,
                    'errors' => $errors,
                ];

                $totalEnrolled += $enrolled;
                $totalSkipped += $skipped;
                $totalErrors += $errors;
            }

            DB::commit();

            return response()->json([
                'message' => 'Enrollment completed for all classes',
                'summary' => [
                    'total_enrolled' => $totalEnrolled,
                    'total_skipped' => $totalSkipped,
                    'total_errors' => $totalErrors,
                ],
                'class_results' => $classResults,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Enroll all failed: " . $e->getMessage());
            return response()->json(['error' => 'Enrollment failed', 'message' => $e->getMessage()], 500);
        }
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
            if (!$user->hasPermissionTo('exams.enroll_students')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.enroll_students: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $examStudent = ExamStudent::where('organization_id', $profile->organization_id)
            ->where('id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (!$examStudent) {
            return response()->json(['error' => 'Exam student enrollment not found'], 404);
        }

        // Verify exam allows modifications
        $exam = Exam::find($examStudent->exam_id);
        if ($exam && $exam->isConfigurationLocked()) {
            return response()->json([
                'error' => 'Cannot remove students from a completed or archived exam',
                'status' => $exam->status
            ], 422);
        }

        // Check if student has any results entered
        $hasResults = DB::table('exam_results')
            ->where('exam_student_id', $id)
            ->whereNull('deleted_at')
            ->exists();

        if ($hasResults) {
            return response()->json([
                'error' => 'Cannot remove student who has exam results. Delete the results first.',
                'has_results' => true
            ], 422);
        }

        $examStudent->delete();

        return response()->noContent();
    }

    /**
     * Get enrollment statistics for an exam
     */
    public function stats(Request $request, string $examId)
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

        $exam = Exam::where('organization_id', $profile->organization_id)
            ->where('id', $examId)
            ->whereNull('deleted_at')
            ->first();

        if (!$exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        // Get exam classes with counts
        $examClasses = ExamClass::where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->with('classAcademicYear.class')
            ->get();

        $classStats = [];
        $totalEnrolled = 0;
        $totalAvailable = 0;

        foreach ($examClasses as $examClass) {
            // Count enrolled students
            $enrolledCount = ExamStudent::where('exam_class_id', $examClass->id)
                ->whereNull('deleted_at')
                ->count();

            // Count available students in this class
            $availableCount = StudentAdmission::where('class_academic_year_id', $examClass->class_academic_year_id)
                ->where('organization_id', $profile->organization_id)
                ->whereNull('deleted_at')
                ->where('enrollment_status', 'active')
                ->count();

            $classStats[] = [
                'exam_class_id' => $examClass->id,
                'class_name' => $examClass->classAcademicYear?->class?->name ?? 'Unknown',
                'section_name' => $examClass->classAcademicYear?->section_name,
                'enrolled_count' => $enrolledCount,
                'available_count' => $availableCount,
                'enrollment_percentage' => $availableCount > 0 
                    ? round(($enrolledCount / $availableCount) * 100, 1) 
                    : 0,
            ];

            $totalEnrolled += $enrolledCount;
            $totalAvailable += $availableCount;
        }

        return response()->json([
            'exam_id' => $examId,
            'total_enrolled' => $totalEnrolled,
            'total_available' => $totalAvailable,
            'overall_percentage' => $totalAvailable > 0 
                ? round(($totalEnrolled / $totalAvailable) * 100, 1) 
                : 0,
            'class_stats' => $classStats,
        ]);
    }
}
