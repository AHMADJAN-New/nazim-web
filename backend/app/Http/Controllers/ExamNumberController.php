<?php

namespace App\Http\Controllers;

use App\Models\Exam;
use App\Models\ExamStudent;
use App\Models\ExamClass;
use App\Models\ExamSubject;
use App\Models\StudentAdmission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ExamNumberController extends Controller
{
    /**
     * Get students with their numbers for an exam
     * GET /api/exams/{exam}/students-with-numbers
     */
    public function studentsWithNumbers(Request $request, string $examId)
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

        $query = ExamStudent::with([
            'examClass.classAcademicYear.class',
            'studentAdmission.student',
            'studentAdmission.classAcademicYear.class'
        ])
            ->where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at');

        if ($request->filled('exam_class_id')) {
            $query->where('exam_class_id', $request->exam_class_id);
        }

        // Sort by class name, then student name
        $examStudents = $query->get()->sortBy([
            fn($a, $b) => ($a->examClass?->classAcademicYear?->class?->name ?? '') <=> ($b->examClass?->classAcademicYear?->class?->name ?? ''),
            fn($a, $b) => ($a->studentAdmission?->student?->full_name ?? '') <=> ($b->studentAdmission?->student?->full_name ?? ''),
        ])->values();

        $students = $examStudents->map(function ($examStudent) {
            $student = $examStudent->studentAdmission?->student;
            $admission = $examStudent->studentAdmission;
            $examClass = $examStudent->examClass;
            $classAcademicYear = $examClass?->classAcademicYear;

            return [
                'exam_student_id' => $examStudent->id,
                'student_id' => $admission?->student_id,
                'student_admission_id' => $admission?->id,
                'student_code' => $admission?->admission_no,
                'full_name' => $student?->full_name ?? 'Unknown',
                'father_name' => $student?->father_name,
                'class_name' => $classAcademicYear?->class?->name ?? 'Unknown',
                'section' => $classAcademicYear?->section_name,
                'exam_class_id' => $examClass?->id,
                'exam_roll_number' => $examStudent->exam_roll_number,
                'exam_secret_number' => $examStudent->exam_secret_number,
                'province' => $admission?->district ?? $admission?->state,
                'admission_year' => $admission?->created_at?->year,
            ];
        });

        return response()->json([
            'exam' => [
                'id' => $exam->id,
                'name' => $exam->name,
                'status' => $exam->status,
            ],
            'students' => $students,
            'summary' => [
                'total' => $students->count(),
                'with_roll_number' => $students->filter(fn($s) => $s['exam_roll_number'] !== null)->count(),
                'with_secret_number' => $students->filter(fn($s) => $s['exam_secret_number'] !== null)->count(),
                'missing_roll_number' => $students->filter(fn($s) => $s['exam_roll_number'] === null)->count(),
                'missing_secret_number' => $students->filter(fn($s) => $s['exam_secret_number'] === null)->count(),
            ],
        ]);
    }

    /**
     * Get suggested starting roll number
     * GET /api/exams/{exam}/roll-numbers/start-from
     */
    public function rollNumberStartFrom(Request $request, string $examId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('exams.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $exam = Exam::where('organization_id', $profile->organization_id)
            ->where('id', $examId)
            ->whereNull('deleted_at')
            ->first();

        if (!$exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        $suggestedStart = ExamStudent::getNextRollNumber($examId, 1001);

        return response()->json([
            'suggested_start_from' => $suggestedStart,
        ]);
    }

    /**
     * Preview auto-assignment of roll numbers
     * POST /api/exams/{exam}/roll-numbers/preview-auto-assign
     */
    public function previewRollNumberAssignment(Request $request, string $examId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('exams.roll_numbers.assign')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.roll_numbers.assign: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validate([
            'exam_class_id' => 'nullable|uuid',
            'start_from' => 'required|string|max:50',
            'scope' => 'required|in:exam,class',
            'override_existing' => 'boolean',
        ]);

        $exam = Exam::where('organization_id', $profile->organization_id)
            ->where('id', $examId)
            ->whereNull('deleted_at')
            ->first();

        if (!$exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        // Check lifecycle - allow in draft, scheduled, in_progress
        if ($exam->isConfigurationLocked()) {
            return response()->json([
                'error' => 'Cannot assign roll numbers to a completed or archived exam',
                'status' => $exam->status
            ], 422);
        }

        $query = ExamStudent::with([
            'examClass.classAcademicYear.class',
            'studentAdmission.student'
        ])
            ->where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at');

        // Filter by scope
        if ($validated['scope'] === 'class' && !empty($validated['exam_class_id'])) {
            $query->where('exam_class_id', $validated['exam_class_id']);
        }

        // Sort deterministically
        $examStudents = $query->get()->sortBy([
            fn($a, $b) => ($a->examClass?->classAcademicYear?->class?->name ?? '') <=> ($b->examClass?->classAcademicYear?->class?->name ?? ''),
            fn($a, $b) => ($a->studentAdmission?->student?->full_name ?? '') <=> ($b->studentAdmission?->student?->full_name ?? ''),
        ])->values();

        $overrideExisting = $validated['override_existing'] ?? false;
        $startFrom = $validated['start_from'];
        $currentNumber = is_numeric($startFrom) ? intval($startFrom) : 1;
        
        $items = [];
        $willOverrideCount = 0;
        $existingNumbers = [];

        // Collect existing roll numbers to check for collisions
        foreach ($examStudents as $student) {
            if ($student->exam_roll_number !== null) {
                $existingNumbers[$student->exam_roll_number] = $student->id;
            }
        }

        foreach ($examStudents as $examStudent) {
            $hasExisting = $examStudent->exam_roll_number !== null;
            
            // Skip if has number and not overriding
            if ($hasExisting && !$overrideExisting) {
                continue;
            }

            $newNumber = (string) $currentNumber;
            
            // Check for collision with existing numbers (excluding current student)
            $collision = isset($existingNumbers[$newNumber]) && $existingNumbers[$newNumber] !== $examStudent->id;

            if ($hasExisting) {
                $willOverrideCount++;
            }

            $items[] = [
                'exam_student_id' => $examStudent->id,
                'student_id' => $examStudent->studentAdmission?->student_id,
                'student_name' => $examStudent->studentAdmission?->student?->full_name ?? 'Unknown',
                'class_name' => $examStudent->examClass?->classAcademicYear?->class?->name ?? 'Unknown',
                'current_roll_number' => $examStudent->exam_roll_number,
                'new_roll_number' => $newNumber,
                'will_override' => $hasExisting,
                'has_collision' => $collision,
            ];

            $currentNumber++;
        }

        return response()->json([
            'total' => count($items),
            'will_override_count' => $willOverrideCount,
            'items' => $items,
        ]);
    }

    /**
     * Confirm auto-assignment of roll numbers
     * POST /api/exams/{exam}/roll-numbers/confirm-auto-assign
     */
    public function confirmRollNumberAssignment(Request $request, string $examId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('exams.roll_numbers.assign')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.exam_student_id' => 'required|uuid',
            'items.*.new_roll_number' => 'required|string|max:50',
        ]);

        $exam = Exam::where('organization_id', $profile->organization_id)
            ->where('id', $examId)
            ->whereNull('deleted_at')
            ->first();

        if (!$exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        if ($exam->isConfigurationLocked()) {
            return response()->json([
                'error' => 'Cannot assign roll numbers to a completed or archived exam',
                'status' => $exam->status
            ], 422);
        }

        $errors = [];
        $updated = 0;

        DB::beginTransaction();
        try {
            foreach ($validated['items'] as $item) {
                $examStudent = ExamStudent::where('id', $item['exam_student_id'])
                    ->where('exam_id', $examId)
                    ->where('organization_id', $profile->organization_id)
                    ->whereNull('deleted_at')
                    ->first();

                if (!$examStudent) {
                    $errors[] = [
                        'exam_student_id' => $item['exam_student_id'],
                        'error' => 'Student not found in this exam'
                    ];
                    continue;
                }

                // Check uniqueness
                if (!ExamStudent::isRollNumberUnique($examId, $item['new_roll_number'], $item['exam_student_id'])) {
                    $errors[] = [
                        'exam_student_id' => $item['exam_student_id'],
                        'error' => "Roll number {$item['new_roll_number']} is already assigned"
                    ];
                    continue;
                }

                $examStudent->exam_roll_number = $item['new_roll_number'];
                $examStudent->save();
                $updated++;
            }

            DB::commit();

            return response()->json([
                'updated' => $updated,
                'errors' => $errors,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Roll number assignment failed: " . $e->getMessage());
            return response()->json(['error' => 'Assignment failed', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Update single roll number
     * PATCH /api/exams/{exam}/students/{examStudent}/roll-number
     */
    public function updateRollNumber(Request $request, string $examId, string $examStudentId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('exams.roll_numbers.assign')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validate([
            'exam_roll_number' => 'nullable|string|max:50',
        ]);

        $exam = Exam::where('organization_id', $profile->organization_id)
            ->where('id', $examId)
            ->whereNull('deleted_at')
            ->first();

        if (!$exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        if ($exam->isConfigurationLocked()) {
            return response()->json([
                'error' => 'Cannot modify roll numbers for a completed or archived exam',
                'status' => $exam->status
            ], 422);
        }

        $examStudent = ExamStudent::where('id', $examStudentId)
            ->where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$examStudent) {
            return response()->json(['error' => 'Exam student not found'], 404);
        }

        $newRollNumber = $validated['exam_roll_number'];

        // Check uniqueness if setting a value
        if ($newRollNumber !== null && !ExamStudent::isRollNumberUnique($examId, $newRollNumber, $examStudentId)) {
            return response()->json([
                'error' => "Roll number {$newRollNumber} is already assigned to another student"
            ], 422);
        }

        $examStudent->exam_roll_number = $newRollNumber;
        $examStudent->save();

        return response()->json([
            'message' => 'Roll number updated successfully',
            'exam_student_id' => $examStudent->id,
            'exam_roll_number' => $examStudent->exam_roll_number,
        ]);
    }

    /**
     * Get suggested starting secret number
     * GET /api/exams/{exam}/secret-numbers/start-from
     */
    public function secretNumberStartFrom(Request $request, string $examId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('exams.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $exam = Exam::where('organization_id', $profile->organization_id)
            ->where('id', $examId)
            ->whereNull('deleted_at')
            ->first();

        if (!$exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        $suggestedStart = ExamStudent::getNextSecretNumber($examId, 1);

        return response()->json([
            'suggested_start_from' => $suggestedStart,
        ]);
    }

    /**
     * Preview auto-assignment of secret numbers
     * POST /api/exams/{exam}/secret-numbers/preview-auto-assign
     */
    public function previewSecretNumberAssignment(Request $request, string $examId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('exams.secret_numbers.assign')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.secret_numbers.assign: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validate([
            'exam_class_id' => 'nullable|uuid',
            'start_from' => 'required|string|max:50',
            'scope' => 'required|in:exam,class',
            'override_existing' => 'boolean',
        ]);

        $exam = Exam::where('organization_id', $profile->organization_id)
            ->where('id', $examId)
            ->whereNull('deleted_at')
            ->first();

        if (!$exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        if ($exam->isConfigurationLocked()) {
            return response()->json([
                'error' => 'Cannot assign secret numbers to a completed or archived exam',
                'status' => $exam->status
            ], 422);
        }

        $query = ExamStudent::with([
            'examClass.classAcademicYear.class',
            'studentAdmission.student'
        ])
            ->where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at');

        if ($validated['scope'] === 'class' && !empty($validated['exam_class_id'])) {
            $query->where('exam_class_id', $validated['exam_class_id']);
        }

        // Sort deterministically (same as roll numbers for consistency)
        $examStudents = $query->get()->sortBy([
            fn($a, $b) => ($a->examClass?->classAcademicYear?->class?->name ?? '') <=> ($b->examClass?->classAcademicYear?->class?->name ?? ''),
            fn($a, $b) => ($a->studentAdmission?->student?->full_name ?? '') <=> ($b->studentAdmission?->student?->full_name ?? ''),
        ])->values();

        $overrideExisting = $validated['override_existing'] ?? false;
        $startFrom = $validated['start_from'];
        $currentNumber = is_numeric($startFrom) ? intval($startFrom) : 1;
        
        $items = [];
        $willOverrideCount = 0;
        $existingNumbers = [];

        foreach ($examStudents as $student) {
            if ($student->exam_secret_number !== null) {
                $existingNumbers[$student->exam_secret_number] = $student->id;
            }
        }

        foreach ($examStudents as $examStudent) {
            $hasExisting = $examStudent->exam_secret_number !== null;
            
            if ($hasExisting && !$overrideExisting) {
                continue;
            }

            $newNumber = (string) $currentNumber;
            $collision = isset($existingNumbers[$newNumber]) && $existingNumbers[$newNumber] !== $examStudent->id;

            if ($hasExisting) {
                $willOverrideCount++;
            }

            $items[] = [
                'exam_student_id' => $examStudent->id,
                'student_id' => $examStudent->studentAdmission?->student_id,
                'student_name' => $examStudent->studentAdmission?->student?->full_name ?? 'Unknown',
                'class_name' => $examStudent->examClass?->classAcademicYear?->class?->name ?? 'Unknown',
                'current_secret_number' => $examStudent->exam_secret_number,
                'new_secret_number' => $newNumber,
                'will_override' => $hasExisting,
                'has_collision' => $collision,
            ];

            $currentNumber++;
        }

        return response()->json([
            'total' => count($items),
            'will_override_count' => $willOverrideCount,
            'items' => $items,
        ]);
    }

    /**
     * Confirm auto-assignment of secret numbers
     * POST /api/exams/{exam}/secret-numbers/confirm-auto-assign
     */
    public function confirmSecretNumberAssignment(Request $request, string $examId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('exams.secret_numbers.assign')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.exam_student_id' => 'required|uuid',
            'items.*.new_secret_number' => 'required|string|max:50',
        ]);

        $exam = Exam::where('organization_id', $profile->organization_id)
            ->where('id', $examId)
            ->whereNull('deleted_at')
            ->first();

        if (!$exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        if ($exam->isConfigurationLocked()) {
            return response()->json([
                'error' => 'Cannot assign secret numbers to a completed or archived exam',
                'status' => $exam->status
            ], 422);
        }

        $errors = [];
        $updated = 0;

        DB::beginTransaction();
        try {
            foreach ($validated['items'] as $item) {
                $examStudent = ExamStudent::where('id', $item['exam_student_id'])
                    ->where('exam_id', $examId)
                    ->where('organization_id', $profile->organization_id)
                    ->whereNull('deleted_at')
                    ->first();

                if (!$examStudent) {
                    $errors[] = [
                        'exam_student_id' => $item['exam_student_id'],
                        'error' => 'Student not found in this exam'
                    ];
                    continue;
                }

                if (!ExamStudent::isSecretNumberUnique($examId, $item['new_secret_number'], $item['exam_student_id'])) {
                    $errors[] = [
                        'exam_student_id' => $item['exam_student_id'],
                        'error' => "Secret number {$item['new_secret_number']} is already assigned"
                    ];
                    continue;
                }

                $examStudent->exam_secret_number = $item['new_secret_number'];
                $examStudent->save();
                $updated++;
            }

            DB::commit();

            return response()->json([
                'updated' => $updated,
                'errors' => $errors,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Secret number assignment failed: " . $e->getMessage());
            return response()->json(['error' => 'Assignment failed', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Update single secret number
     * PATCH /api/exams/{exam}/students/{examStudent}/secret-number
     */
    public function updateSecretNumber(Request $request, string $examId, string $examStudentId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('exams.secret_numbers.assign')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validate([
            'exam_secret_number' => 'nullable|string|max:50',
        ]);

        $exam = Exam::where('organization_id', $profile->organization_id)
            ->where('id', $examId)
            ->whereNull('deleted_at')
            ->first();

        if (!$exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        if ($exam->isConfigurationLocked()) {
            return response()->json([
                'error' => 'Cannot modify secret numbers for a completed or archived exam',
                'status' => $exam->status
            ], 422);
        }

        $examStudent = ExamStudent::where('id', $examStudentId)
            ->where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$examStudent) {
            return response()->json(['error' => 'Exam student not found'], 404);
        }

        $newSecretNumber = $validated['exam_secret_number'];

        if ($newSecretNumber !== null && !ExamStudent::isSecretNumberUnique($examId, $newSecretNumber, $examStudentId)) {
            return response()->json([
                'error' => "Secret number {$newSecretNumber} is already assigned to another student"
            ], 422);
        }

        $examStudent->exam_secret_number = $newSecretNumber;
        $examStudent->save();

        return response()->json([
            'message' => 'Secret number updated successfully',
            'exam_student_id' => $examStudent->id,
            'exam_secret_number' => $examStudent->exam_secret_number,
        ]);
    }

    /**
     * Lookup student by secret number
     * GET /api/exams/{exam}/secret-numbers/lookup
     */
    public function lookupBySecretNumber(Request $request, string $examId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('exams.secret_numbers.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $secretNumber = $request->query('secret_number');
        if (empty($secretNumber)) {
            return response()->json(['error' => 'Secret number is required'], 400);
        }

        $exam = Exam::where('organization_id', $profile->organization_id)
            ->where('id', $examId)
            ->whereNull('deleted_at')
            ->first();

        if (!$exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        $examStudent = ExamStudent::with([
            'examClass.classAcademicYear.class',
            'studentAdmission.student'
        ])
            ->where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->where('exam_secret_number', $secretNumber)
            ->whereNull('deleted_at')
            ->first();

        if (!$examStudent) {
            return response()->json(['error' => 'Student not found with this secret number'], 404);
        }

        $student = $examStudent->studentAdmission?->student;
        $admission = $examStudent->studentAdmission;
        $classAcademicYear = $examStudent->examClass?->classAcademicYear;

        return response()->json([
            'exam_student_id' => $examStudent->id,
            'student_id' => $admission?->student_id,
            'student_code' => $admission?->admission_no,
            'full_name' => $student?->full_name ?? 'Unknown',
            'father_name' => $student?->father_name,
            'class_name' => $classAcademicYear?->class?->name ?? 'Unknown',
            'section' => $classAcademicYear?->section_name,
            'exam_roll_number' => $examStudent->exam_roll_number,
            'exam_secret_number' => $examStudent->exam_secret_number,
            'exam' => [
                'id' => $exam->id,
                'name' => $exam->name,
            ],
        ]);
    }

    /**
     * Get roll number list report
     * GET /api/exams/{exam}/reports/roll-numbers
     */
    public function rollNumberReport(Request $request, string $examId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('exams.roll_numbers.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
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

        $query = ExamStudent::with([
            'examClass.classAcademicYear.class',
            'studentAdmission.student'
        ])
            ->where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->whereNotNull('exam_roll_number');

        if ($request->filled('exam_class_id')) {
            $query->where('exam_class_id', $request->exam_class_id);
        }

        $examStudents = $query->get()->sortBy('exam_roll_number')->values();

        $students = $examStudents->map(function ($examStudent) {
            $student = $examStudent->studentAdmission?->student;
            $admission = $examStudent->studentAdmission;
            $classAcademicYear = $examStudent->examClass?->classAcademicYear;

            return [
                'exam_roll_number' => $examStudent->exam_roll_number,
                'student_code' => $admission?->admission_no,
                'full_name' => $student?->full_name ?? 'Unknown',
                'father_name' => $student?->father_name,
                'class_name' => $classAcademicYear?->class?->name ?? 'Unknown',
                'section' => $classAcademicYear?->section_name,
                'province' => $admission?->district ?? $admission?->state,
                'admission_year' => $admission?->created_at?->year,
            ];
        });

        return response()->json([
            'exam' => [
                'id' => $exam->id,
                'name' => $exam->name,
                'academic_year' => $exam->academicYear?->name,
            ],
            'students' => $students,
            'total' => $students->count(),
        ]);
    }

    /**
     * Get roll slips HTML
     * GET /api/exams/{exam}/reports/roll-slips
     */
    public function rollSlipsHtml(Request $request, string $examId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('exams.numbers.print')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
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

        // Get school branding
        $schoolBranding = DB::table('school_branding')
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->first();

        $schoolName = $schoolBranding?->school_name ?? 'School Name';

        $query = ExamStudent::with([
            'examClass.classAcademicYear.class',
            'studentAdmission.student'
        ])
            ->where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->whereNotNull('exam_roll_number');

        if ($request->filled('exam_class_id')) {
            $query->where('exam_class_id', $request->exam_class_id);
        }

        $examStudents = $query->get()->sortBy('exam_roll_number')->values();

        // Get subjects for each class
        $examClasses = ExamClass::where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->with(['examSubjects.subject', 'classAcademicYear.class'])
            ->get()
            ->keyBy('id');

        // Build slips HTML (4 slips per A4 page)
        $slips = [];
        foreach ($examStudents as $examStudent) {
            $student = $examStudent->studentAdmission?->student;
            $admission = $examStudent->studentAdmission;
            $classAcademicYear = $examStudent->examClass?->classAcademicYear;
            $examClass = $examClasses->get($examStudent->exam_class_id);
            
            $subjects = [];
            if ($examClass && $examClass->examSubjects) {
                $subjects = $examClass->examSubjects
                    ->whereNull('deleted_at')
                    ->map(fn($es) => $es->subject?->name ?? 'Unknown')
                    ->filter()
                    ->values()
                    ->toArray();
            }

            $slips[] = [
                'exam_roll_number' => $examStudent->exam_roll_number,
                'full_name' => $student?->full_name ?? 'Unknown',
                'father_name' => $student?->father_name ?? '',
                'class_name' => $classAcademicYear?->class?->name ?? 'Unknown',
                'section' => $classAcademicYear?->section_name ?? '',
                'province' => $admission?->district ?? $admission?->state ?? '',
                'admission_year' => $admission?->created_at?->year ?? '',
                'subjects' => $subjects,
            ];
        }

        $html = $this->buildRollSlipsHtml($schoolName, $exam->name, $exam->academicYear?->name ?? '', $slips);

        return response()->json([
            'html' => $html,
            'total_slips' => count($slips),
        ]);
    }

    /**
     * Get secret labels HTML
     * GET /api/exams/{exam}/reports/secret-labels
     */
    public function secretLabelsHtml(Request $request, string $examId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('exams.numbers.print')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $exam = Exam::where('organization_id', $profile->organization_id)
            ->where('id', $examId)
            ->whereNull('deleted_at')
            ->first();

        if (!$exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        $query = ExamStudent::with([
            'examClass.classAcademicYear.class'
        ])
            ->where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->whereNotNull('exam_secret_number');

        if ($request->filled('exam_class_id')) {
            $query->where('exam_class_id', $request->exam_class_id);
        }

        $examStudents = $query->get()->sortBy('exam_secret_number')->values();

        // Get subject name if filtering by subject
        // Note: subject_id could be either a subject UUID or exam_subject_id
        $subjectName = null;
        if ($request->filled('subject_id')) {
            $subjectId = $request->subject_id;
            
            // Validate that subject_id is a valid UUID format
            if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $subjectId)) {
                // Invalid UUID format - skip subject filtering
                $subjectName = null;
            } else {
                // First try to find it as exam_subject_id (UUID)
                $examSubject = DB::table('exam_subjects')
                    ->where('id', $subjectId)
                    ->where('exam_id', $examId)
                    ->where('organization_id', $profile->organization_id)
                    ->whereNull('deleted_at')
                    ->first();
                
                if ($examSubject) {
                    // Get the actual subject name from the related subject
                    $subject = DB::table('subjects')
                        ->where('id', $examSubject->subject_id)
                        ->whereNull('deleted_at')
                        ->first();
                    $subjectName = $subject?->name;
                } else {
                    // Try as direct subject UUID
                    $subject = DB::table('subjects')
                        ->where('id', $subjectId)
                        ->whereNull('deleted_at')
                        ->first();
                    $subjectName = $subject?->name;
                }
            }
        }

        $labels = [];
        foreach ($examStudents as $examStudent) {
            $classAcademicYear = $examStudent->examClass?->classAcademicYear;

            $labels[] = [
                'exam_secret_number' => $examStudent->exam_secret_number,
                'class_name' => $classAcademicYear?->class?->name ?? 'Unknown',
                'section' => $classAcademicYear?->section_name ?? '',
                'subject_name' => $subjectName,
            ];
        }

        $html = $this->buildSecretLabelsHtml($labels, $exam->name);

        return response()->json([
            'html' => $html,
            'total_labels' => count($labels),
        ]);
    }

    /**
     * Build roll slips HTML
     */
    private function buildRollSlipsHtml(string $schoolName, string $examName, string $academicYear, array $slips): string
    {
        $html = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Roll Number Slips - ' . htmlspecialchars($examName) . '</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { size: A4; margin: 10mm; }
        body { font-family: Arial, sans-serif; font-size: 11px; }
        .page { width: 210mm; min-height: 297mm; padding: 5mm; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 5mm; page-break-after: always; }
        .page:last-child { page-break-after: avoid; }
        .slip { border: 1px solid #333; padding: 8px; height: calc(148mm - 15mm); display: flex; flex-direction: column; }
        .slip-header { text-align: center; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin-bottom: 6px; }
        .school-name { font-size: 14px; font-weight: bold; margin-bottom: 2px; }
        .exam-name { font-size: 12px; color: #333; }
        .academic-year { font-size: 10px; color: #666; }
        .roll-number { text-align: center; font-size: 24px; font-weight: bold; margin: 8px 0; padding: 8px; background: #f0f0f0; border-radius: 4px; }
        .student-info { flex: 1; }
        .info-row { display: flex; margin-bottom: 4px; }
        .info-label { font-weight: bold; width: 80px; }
        .info-value { flex: 1; }
        .subjects { margin-top: 6px; padding-top: 6px; border-top: 1px dashed #ddd; }
        .subjects-title { font-weight: bold; margin-bottom: 4px; }
        .subjects-list { display: flex; flex-wrap: wrap; gap: 4px; }
        .subject-item { background: #f5f5f5; padding: 2px 6px; border-radius: 2px; font-size: 10px; }
        @media print {
            .page { page-break-after: always; }
            .page:last-child { page-break-after: avoid; }
        }
    </style>
</head>
<body>';

        $slipsPerPage = 4;
        $chunks = array_chunk($slips, $slipsPerPage);

        foreach ($chunks as $pageSlips) {
            $html .= '<div class="page">';
            
            foreach ($pageSlips as $slip) {
                $html .= '
                <div class="slip">
                    <div class="slip-header">
                        <div class="school-name">' . htmlspecialchars($schoolName) . '</div>
                        <div class="exam-name">' . htmlspecialchars($examName) . '</div>
                        <div class="academic-year">' . htmlspecialchars($academicYear) . '</div>
                    </div>
                    <div class="roll-number">' . htmlspecialchars($slip['exam_roll_number']) . '</div>
                    <div class="student-info">
                        <div class="info-row">
                            <span class="info-label">Name:</span>
                            <span class="info-value">' . htmlspecialchars($slip['full_name']) . '</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Father:</span>
                            <span class="info-value">' . htmlspecialchars($slip['father_name']) . '</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Class:</span>
                            <span class="info-value">' . htmlspecialchars($slip['class_name']) . ($slip['section'] ? ' - ' . htmlspecialchars($slip['section']) : '') . '</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Province:</span>
                            <span class="info-value">' . htmlspecialchars($slip['province']) . '</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Year:</span>
                            <span class="info-value">' . htmlspecialchars($slip['admission_year']) . '</span>
                        </div>
                    </div>';
                
                if (!empty($slip['subjects'])) {
                    $html .= '
                    <div class="subjects">
                        <div class="subjects-title">Subjects:</div>
                        <div class="subjects-list">';
                    foreach ($slip['subjects'] as $subject) {
                        $html .= '<span class="subject-item">' . htmlspecialchars($subject) . '</span>';
                    }
                    $html .= '</div></div>';
                }
                
                $html .= '</div>';
            }
            
            // Fill remaining slots with empty divs
            for ($i = count($pageSlips); $i < $slipsPerPage; $i++) {
                $html .= '<div class="slip" style="visibility: hidden;"></div>';
            }
            
            $html .= '</div>';
        }

        $html .= '</body></html>';
        return $html;
    }

    /**
     * Build secret labels HTML (1x2 inch labels)
     */
    private function buildSecretLabelsHtml(array $labels, string $examName): string
    {
        $html = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Secret Number Labels - ' . htmlspecialchars($examName) . '</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { size: A4; margin: 5mm; }
        body { font-family: Arial, sans-serif; font-size: 9px; }
        .labels-container { display: flex; flex-wrap: wrap; gap: 2mm; }
        .label { 
            width: 2in; 
            height: 1in; 
            border: 1px solid #333; 
            padding: 3mm;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            page-break-inside: avoid;
        }
        .secret-number { 
            font-size: 18px; 
            font-weight: bold; 
            margin-bottom: 3px;
            letter-spacing: 2px;
        }
        .class-info { font-size: 9px; color: #333; }
        .subject-info { font-size: 8px; color: #666; margin-top: 2px; }
        .barcode-area {
            width: 90%;
            height: 12px;
            margin-top: 4px;
            background: linear-gradient(90deg, #000 2px, transparent 2px), 
                        linear-gradient(90deg, #000 1px, transparent 1px);
            background-size: 4px 100%, 8px 100%;
            background-position: 0 0;
        }
        @media print {
            .label { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
<div class="labels-container">';

        foreach ($labels as $label) {
            $html .= '
            <div class="label" data-secret-number="' . htmlspecialchars($label['exam_secret_number']) . '">
                <div class="secret-number">' . htmlspecialchars($label['exam_secret_number']) . '</div>
                <div class="class-info">' . htmlspecialchars($label['class_name']) . ($label['section'] ? ' - ' . htmlspecialchars($label['section']) : '') . '</div>';
            
            if ($label['subject_name']) {
                $html .= '<div class="subject-info">' . htmlspecialchars($label['subject_name']) . '</div>';
            }
            
            $html .= '
                <div class="barcode-area" title="Barcode placeholder for: ' . htmlspecialchars($label['exam_secret_number']) . '"></div>
            </div>';
        }

        $html .= '</div></body></html>';
        return $html;
    }
}
