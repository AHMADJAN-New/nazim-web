<?php

namespace App\Http\Controllers;

use App\Models\Exam;
use App\Models\ExamResult;
use App\Models\ExamSubject;
use App\Models\ExamStudent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ExamResultController extends Controller
{
    /**
     * Get all results for an exam or specific subject
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

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('exams.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $query = ExamResult::with([
            'exam',
            'examSubject.subject',
            'examStudent.studentAdmission.student',
        ])->whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id);
        $query->where('school_id', $currentSchoolId);

        // Strict school scoping via parent exam
        $query->whereHas('exam', function ($q) use ($currentSchoolId) {
            $q->where('school_id', $currentSchoolId)->whereNull('deleted_at');
        });

        if ($request->filled('exam_id')) {
            // Verify exam is in current school
            $exam = Exam::where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->where('id', $request->exam_id)
                ->whereNull('deleted_at')
                ->first();
            if (!$exam) {
                return response()->json(['error' => 'Exam not found'], 404);
            }
            $query->where('exam_id', $request->exam_id);
        }

        if ($request->filled('exam_subject_id')) {
            $query->where('exam_subject_id', $request->exam_subject_id);
        }

        if ($request->filled('exam_student_id')) {
            $query->where('exam_student_id', $request->exam_student_id);
        }

        $results = $query->orderBy('created_at', 'desc')->get();

        return response()->json($results);
    }

    /**
     * Store or update a student's exam result
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

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('exams.enter_marks')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.enter_marks: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validate([
            'exam_id' => 'required|uuid|exists:exams,id',
            'exam_subject_id' => 'required|uuid|exists:exam_subjects,id',
            'exam_student_id' => 'required|uuid|exists:exam_students,id',
            'marks_obtained' => 'nullable|numeric|min:0',
            'is_absent' => 'boolean',
            'remarks' => 'nullable|string|max:500',
        ]);

        // Verify exam belongs to organization and check status
        $exam = Exam::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('id', $validated['exam_id'])
            ->whereNull('deleted_at')
            ->first();

        if (!$exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        // Check if marks entry is allowed based on status
        if ($exam->isConfigurationLocked()) {
            return response()->json([
                'error' => 'Cannot enter marks for a completed or archived exam',
                'status' => $exam->status
            ], 422);
        }

        // For strict enforcement, marks can only be entered when exam is in_progress
        // But we allow it for draft/scheduled for flexibility during setup
        // Uncomment below for strict enforcement:
        // if (!$exam->canEnterMarks()) {
        //     return response()->json([
        //         'error' => 'Marks can only be entered when exam is in progress',
        //         'status' => $exam->status
        //     ], 422);
        // }

        // Verify exam subject belongs to exam
        $examSubject = ExamSubject::where('id', $validated['exam_subject_id'])
            ->where('exam_id', $validated['exam_id'])
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->first();

        if (!$examSubject) {
            return response()->json(['error' => 'Exam subject does not belong to this exam'], 400);
        }

        // Verify exam student belongs to exam
        $examStudent = ExamStudent::with('studentAdmission')
            ->where('id', $validated['exam_student_id'])
            ->where('exam_id', $validated['exam_id'])
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->first();

        if (!$examStudent) {
            return response()->json(['error' => 'Student is not enrolled in this exam'], 400);
        }

        // Validate marks against total marks if provided
        if (isset($validated['marks_obtained']) && $validated['marks_obtained'] !== null) {
            if ($examSubject->total_marks !== null && $validated['marks_obtained'] > $examSubject->total_marks) {
                return response()->json([
                    'error' => 'Marks obtained cannot exceed total marks',
                    'marks_obtained' => $validated['marks_obtained'],
                    'total_marks' => $examSubject->total_marks
                ], 422);
            }
        }

        // If student is marked absent, set marks to null
        if (isset($validated['is_absent']) && $validated['is_absent']) {
            $validated['marks_obtained'] = null;
        }

        // Check if result already exists
        $existingResult = ExamResult::where('exam_subject_id', $validated['exam_subject_id'])
            ->where('exam_student_id', $validated['exam_student_id'])
            ->where('exam_id', $validated['exam_id'])
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->first();

        if ($existingResult) {
            // Update existing result
            $existingResult->update([
                'marks_obtained' => $validated['marks_obtained'],
                'is_absent' => $validated['is_absent'] ?? false,
                'remarks' => $validated['remarks'] ?? null,
            ]);

            $existingResult->load([
                'exam',
                'examSubject.subject',
                'examStudent.studentAdmission.student',
            ]);

            return response()->json($existingResult);
        }

        // Create new result
        $result = ExamResult::create([
            'exam_id' => $validated['exam_id'],
            'exam_subject_id' => $validated['exam_subject_id'],
            'exam_student_id' => $validated['exam_student_id'],
            'student_admission_id' => $examStudent->student_admission_id,
            'marks_obtained' => $validated['marks_obtained'],
            'is_absent' => $validated['is_absent'] ?? false,
            'remarks' => $validated['remarks'] ?? null,
            'organization_id' => $profile->organization_id,
            'school_id' => $currentSchoolId,
        ]);

        $result->load([
            'exam',
            'examSubject.subject',
            'examStudent.studentAdmission.student',
        ]);

        return response()->json($result, 201);
    }

    /**
     * Bulk update results for multiple students
     */
    public function bulkStore(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('exams.enter_marks')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.enter_marks: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validate([
            'exam_id' => 'required|uuid|exists:exams,id',
            'exam_subject_id' => 'required|uuid|exists:exam_subjects,id',
            'results' => 'required|array',
            'results.*.exam_student_id' => 'required|uuid|exists:exam_students,id',
            'results.*.marks_obtained' => 'nullable|numeric|min:0',
            'results.*.is_absent' => 'boolean',
            'results.*.remarks' => 'nullable|string|max:500',
        ]);

        // Verify exam and check status
        $exam = Exam::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('id', $validated['exam_id'])
            ->whereNull('deleted_at')
            ->first();

        if (!$exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        if ($exam->isConfigurationLocked()) {
            return response()->json([
                'error' => 'Cannot enter marks for a completed or archived exam',
                'status' => $exam->status
            ], 422);
        }

        // Verify exam subject
        $examSubject = ExamSubject::where('id', $validated['exam_subject_id'])
            ->where('exam_id', $validated['exam_id'])
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->first();

        if (!$examSubject) {
            return response()->json(['error' => 'Exam subject does not belong to this exam'], 400);
        }

        $created = [];
        $updated = [];
        $errors = [];

        DB::beginTransaction();
        try {
            foreach ($validated['results'] as $resultData) {
                // Verify exam student
                $examStudent = ExamStudent::with('studentAdmission')
                    ->where('id', $resultData['exam_student_id'])
                    ->where('exam_id', $validated['exam_id'])
                    ->where('organization_id', $profile->organization_id)
                    ->where('school_id', $currentSchoolId)
                    ->whereNull('deleted_at')
                    ->first();

                if (!$examStudent) {
                    $errors[] = [
                        'exam_student_id' => $resultData['exam_student_id'],
                        'error' => 'Student is not enrolled in this exam'
                    ];
                    continue;
                }

                // Validate marks against total marks
                $marksObtained = $resultData['marks_obtained'] ?? null;
                $isAbsent = $resultData['is_absent'] ?? false;

                if (!$isAbsent && $marksObtained !== null && $examSubject->total_marks !== null) {
                    if ($marksObtained > $examSubject->total_marks) {
                        $errors[] = [
                            'exam_student_id' => $resultData['exam_student_id'],
                            'error' => "Marks obtained ({$marksObtained}) cannot exceed total marks ({$examSubject->total_marks})"
                        ];
                        continue;
                    }
                }

                // If student is marked absent, set marks to null
                if ($isAbsent) {
                    $marksObtained = null;
                }

                // Check if result already exists
                $existingResult = ExamResult::where('exam_subject_id', $validated['exam_subject_id'])
                    ->where('exam_student_id', $resultData['exam_student_id'])
                    ->where('exam_id', $validated['exam_id'])
                    ->where('organization_id', $profile->organization_id)
                    ->where('school_id', $currentSchoolId)
                    ->whereNull('deleted_at')
                    ->first();

                if ($existingResult) {
                    $existingResult->update([
                        'marks_obtained' => $marksObtained,
                        'is_absent' => $isAbsent,
                        'remarks' => $resultData['remarks'] ?? null,
                    ]);
                    $updated[] = $existingResult->id;
                } else {
                    $result = ExamResult::create([
                        'exam_id' => $validated['exam_id'],
                        'exam_subject_id' => $validated['exam_subject_id'],
                        'exam_student_id' => $resultData['exam_student_id'],
                        'student_admission_id' => $examStudent->student_admission_id,
                        'marks_obtained' => $marksObtained,
                        'is_absent' => $isAbsent,
                        'remarks' => $resultData['remarks'] ?? null,
                        'organization_id' => $profile->organization_id,
                        'school_id' => $currentSchoolId,
                    ]);
                    $created[] = $result->id;
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Results saved successfully',
                'created_count' => count($created),
                'updated_count' => count($updated),
                'errors_count' => count($errors),
                'created' => $created,
                'updated' => $updated,
                'errors' => $errors,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Bulk result save failed: " . $e->getMessage());
            return response()->json(['error' => 'Failed to save results', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Update an existing exam result
     */
    public function update(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('exams.enter_marks')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.enter_marks: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $result = ExamResult::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (!$result) {
            return response()->json(['error' => 'Exam result not found'], 404);
        }

        // Check exam status
        $exam = Exam::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('id', $result->exam_id)
            ->whereNull('deleted_at')
            ->first();
        if ($exam && $exam->isConfigurationLocked()) {
            return response()->json([
                'error' => 'Cannot modify marks for a completed or archived exam',
                'status' => $exam->status
            ], 422);
        }

        $validated = $request->validate([
            'marks_obtained' => 'nullable|numeric|min:0',
            'is_absent' => 'boolean',
            'remarks' => 'nullable|string|max:500',
        ]);

        // Validate marks against total marks
        $examSubject = ExamSubject::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('exam_id', $result->exam_id)
            ->where('id', $result->exam_subject_id)
            ->whereNull('deleted_at')
            ->first();
        $isAbsent = $validated['is_absent'] ?? $result->is_absent;
        $marksObtained = $validated['marks_obtained'] ?? null;

        if (!$isAbsent && $marksObtained !== null && $examSubject && $examSubject->total_marks !== null) {
            if ($marksObtained > $examSubject->total_marks) {
                return response()->json([
                    'error' => 'Marks obtained cannot exceed total marks',
                    'marks_obtained' => $marksObtained,
                    'total_marks' => $examSubject->total_marks
                ], 422);
            }
        }

        // If student is marked absent, set marks to null
        if ($isAbsent) {
            $validated['marks_obtained'] = null;
        }

        $result->update($validated);

        $result->load([
            'exam',
            'examSubject.subject',
            'examStudent.studentAdmission.student',
        ]);

        return response()->json($result);
    }

    /**
     * Delete an exam result
     */
    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('exams.enter_marks')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.enter_marks: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $result = ExamResult::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (!$result) {
            return response()->json(['error' => 'Exam result not found'], 404);
        }

        // Check exam status
        $exam = Exam::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('id', $result->exam_id)
            ->whereNull('deleted_at')
            ->first();
        if ($exam && $exam->isConfigurationLocked()) {
            return response()->json([
                'error' => 'Cannot delete marks for a completed or archived exam',
                'status' => $exam->status
            ], 422);
        }

        $result->delete();

        return response()->noContent();
    }

    /**
     * Get marks entry progress for an exam
     */
    public function progress(Request $request, string $examId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('exams.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $exam = Exam::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('id', $examId)
            ->whereNull('deleted_at')
            ->first();

        if (!$exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        // Get all exam subjects with their class info
        $examSubjects = ExamSubject::with(['subject', 'examClass.classAcademicYear.class'])
            ->where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->get();

        $subjectProgress = [];
        $totalExpected = 0;
        $totalEntered = 0;

        foreach ($examSubjects as $examSubject) {
            // Count enrolled students for this exam class
            $enrolledCount = ExamStudent::where('exam_class_id', $examSubject->exam_class_id)
                ->where('organization_id', $profile->organization_id)
                ->where('exam_id', $examId)
                ->whereNull('deleted_at')
                ->count();

            // Count results entered for this subject
            $resultsCount = ExamResult::where('exam_subject_id', $examSubject->id)
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->whereNull('deleted_at')
                ->count();

            $subjectProgress[] = [
                'exam_subject_id' => $examSubject->id,
                'subject_name' => $examSubject->subject?->name ?? 'Unknown',
                'class_name' => $examSubject->examClass?->classAcademicYear?->class?->name ?? 'Unknown',
                'enrolled_count' => $enrolledCount,
                'results_count' => $resultsCount,
                'percentage' => $enrolledCount > 0 
                    ? round(($resultsCount / $enrolledCount) * 100, 1) 
                    : 0,
                'is_complete' => $enrolledCount > 0 && $resultsCount >= $enrolledCount,
            ];

            $totalExpected += $enrolledCount;
            $totalEntered += $resultsCount;
        }

        return response()->json([
            'exam_id' => $examId,
            'exam_name' => $exam->name,
            'exam_status' => $exam->status,
            'total_expected' => $totalExpected,
            'total_entered' => $totalEntered,
            'overall_percentage' => $totalExpected > 0 
                ? round(($totalEntered / $totalExpected) * 100, 1) 
                : 0,
            'subject_progress' => $subjectProgress,
        ]);
    }
}
