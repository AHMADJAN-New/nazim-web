<?php

namespace App\Http\Controllers;

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

        if ($request->filled('exam_id')) {
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

        try {
            if (!$user->hasPermissionTo('exams.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.update: " . $e->getMessage());
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

        // Verify exam subject belongs to exam
        $examSubject = ExamSubject::find($validated['exam_subject_id']);
        if (!$examSubject || $examSubject->exam_id !== $validated['exam_id']) {
            return response()->json(['error' => 'Exam subject does not belong to this exam'], 400);
        }

        // Verify exam student belongs to exam
        $examStudent = ExamStudent::with('studentAdmission')->find($validated['exam_student_id']);
        if (!$examStudent || $examStudent->exam_id !== $validated['exam_id']) {
            return response()->json(['error' => 'Student is not enrolled in this exam'], 400);
        }

        // Validate marks against total marks if provided
        if (isset($validated['marks_obtained']) && $examSubject->total_marks !== null) {
            if ($validated['marks_obtained'] > $examSubject->total_marks) {
                return response()->json([
                    'error' => 'Marks obtained cannot exceed total marks',
                    'total_marks' => $examSubject->total_marks
                ], 400);
            }
        }

        // If student is marked absent, set marks to null
        if (isset($validated['is_absent']) && $validated['is_absent']) {
            $validated['marks_obtained'] = null;
        }

        // Check if result already exists
        $existingResult = ExamResult::where('exam_subject_id', $validated['exam_subject_id'])
            ->where('exam_student_id', $validated['exam_student_id'])
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

        try {
            if (!$user->hasPermissionTo('exams.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.update: " . $e->getMessage());
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

        // Verify exam subject
        $examSubject = ExamSubject::find($validated['exam_subject_id']);
        if (!$examSubject || $examSubject->exam_id !== $validated['exam_id']) {
            return response()->json(['error' => 'Exam subject does not belong to this exam'], 400);
        }

        $created = [];
        $updated = [];
        $errors = [];

        DB::beginTransaction();
        try {
            foreach ($validated['results'] as $resultData) {
                // Verify exam student
                $examStudent = ExamStudent::with('studentAdmission')->find($resultData['exam_student_id']);
                if (!$examStudent || $examStudent->exam_id !== $validated['exam_id']) {
                    $errors[] = [
                        'exam_student_id' => $resultData['exam_student_id'],
                        'error' => 'Student is not enrolled in this exam'
                    ];
                    continue;
                }

                // Validate marks against total marks
                if (isset($resultData['marks_obtained']) && $examSubject->total_marks !== null) {
                    if ($resultData['marks_obtained'] > $examSubject->total_marks) {
                        $errors[] = [
                            'exam_student_id' => $resultData['exam_student_id'],
                            'error' => 'Marks obtained cannot exceed total marks'
                        ];
                        continue;
                    }
                }

                // If student is marked absent, set marks to null
                if (isset($resultData['is_absent']) && $resultData['is_absent']) {
                    $resultData['marks_obtained'] = null;
                }

                // Check if result already exists
                $existingResult = ExamResult::where('exam_subject_id', $validated['exam_subject_id'])
                    ->where('exam_student_id', $resultData['exam_student_id'])
                    ->whereNull('deleted_at')
                    ->first();

                if ($existingResult) {
                    $existingResult->update([
                        'marks_obtained' => $resultData['marks_obtained'] ?? null,
                        'is_absent' => $resultData['is_absent'] ?? false,
                        'remarks' => $resultData['remarks'] ?? null,
                    ]);
                    $updated[] = $existingResult->id;
                } else {
                    $result = ExamResult::create([
                        'exam_id' => $validated['exam_id'],
                        'exam_subject_id' => $validated['exam_subject_id'],
                        'exam_student_id' => $resultData['exam_student_id'],
                        'student_admission_id' => $examStudent->student_admission_id,
                        'marks_obtained' => $resultData['marks_obtained'] ?? null,
                        'is_absent' => $resultData['is_absent'] ?? false,
                        'remarks' => $resultData['remarks'] ?? null,
                        'organization_id' => $profile->organization_id,
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

        try {
            if (!$user->hasPermissionTo('exams.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $result = ExamResult::where('organization_id', $profile->organization_id)
            ->where('id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (!$result) {
            return response()->json(['error' => 'Exam result not found'], 404);
        }

        $validated = $request->validate([
            'marks_obtained' => 'nullable|numeric|min:0',
            'is_absent' => 'boolean',
            'remarks' => 'nullable|string|max:500',
        ]);

        // Validate marks against total marks
        $examSubject = ExamSubject::find($result->exam_subject_id);
        if (isset($validated['marks_obtained']) && $examSubject && $examSubject->total_marks !== null) {
            if ($validated['marks_obtained'] > $examSubject->total_marks) {
                return response()->json([
                    'error' => 'Marks obtained cannot exceed total marks',
                    'total_marks' => $examSubject->total_marks
                ], 400);
            }
        }

        // If student is marked absent, set marks to null
        if (isset($validated['is_absent']) && $validated['is_absent']) {
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
            if (!$user->hasPermissionTo('exams.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.delete: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $result = ExamResult::where('organization_id', $profile->organization_id)
            ->where('id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (!$result) {
            return response()->json(['error' => 'Exam result not found'], 404);
        }

        $result->delete();

        return response()->json(['message' => 'Exam result deleted']);
    }
}
