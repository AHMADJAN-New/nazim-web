<?php

namespace App\Http\Controllers;

use App\Models\Exam;
use App\Models\ExamStudent;
use App\Models\ExamClass;
use App\Models\ExamSubject;
use App\Models\StudentAdmission;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class ExamNumberController extends Controller
{
    public function __construct(
        private ActivityLogService $activityLogService
    ) {
    }

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

        $query = ExamStudent::with([
            'examClass.classAcademicYear.class',
            'studentAdmission.student',
            'studentAdmission.classAcademicYear.class'
        ])
            ->where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
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

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('exams.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
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

        $currentSchoolId = $this->getCurrentSchoolId($request);

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
            ->where('school_id', $currentSchoolId)
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
            ->where('school_id', $currentSchoolId)
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

        $currentSchoolId = $this->getCurrentSchoolId($request);

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
            ->where('school_id', $currentSchoolId)
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
                    ->where('school_id', $currentSchoolId)
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

        $currentSchoolId = $this->getCurrentSchoolId($request);

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
            ->where('school_id', $currentSchoolId)
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
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->first();

        if (!$examStudent) {
            return response()->json(['error' => 'Exam student not found'], 404);
        }

        $oldRollNumber = $examStudent->exam_roll_number;
        $newRollNumber = $validated['exam_roll_number'];

        // Check uniqueness if setting a value
        if ($newRollNumber !== null && !ExamStudent::isRollNumberUnique($examId, $newRollNumber, $examStudentId)) {
            return response()->json([
                'error' => "Roll number {$newRollNumber} is already assigned to another student"
            ], 422);
        }

        $examStudent->exam_roll_number = $newRollNumber;
        $examStudent->save();

        // Load relationships for logging
        $examStudent->load(['student', 'exam']);

        // Log roll number update
        try {
            $studentName = $examStudent->student?->full_name ?? 'Unknown';
            $examName = $examStudent->exam?->name ?? 'Unknown';
            $this->activityLogService->logEvent(
                subject: $examStudent,
                event: 'exam_roll_number_updated',
                description: "Updated roll number for student {$studentName} in exam {$examName}",
                properties: [
                    'exam_student_id' => $examStudent->id,
                    'exam_id' => $examStudent->exam_id,
                    'old_roll_number' => $oldRollNumber,
                    'new_roll_number' => $newRollNumber,
                ],
                request: $request
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log roll number update: ' . $e->getMessage());
        }

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

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('exams.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
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

        $currentSchoolId = $this->getCurrentSchoolId($request);

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
            ->where('school_id', $currentSchoolId)
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
            ->where('school_id', $currentSchoolId)
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

        $currentSchoolId = $this->getCurrentSchoolId($request);

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
            ->where('school_id', $currentSchoolId)
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
                    ->where('school_id', $currentSchoolId)
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

        $currentSchoolId = $this->getCurrentSchoolId($request);

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
            ->where('school_id', $currentSchoolId)
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
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->first();

        if (!$examStudent) {
            return response()->json(['error' => 'Exam student not found'], 404);
        }

        $oldSecretNumber = $examStudent->exam_secret_number;
        $newSecretNumber = $validated['exam_secret_number'];

        if ($newSecretNumber !== null && !ExamStudent::isSecretNumberUnique($examId, $newSecretNumber, $examStudentId)) {
            return response()->json([
                'error' => "Secret number {$newSecretNumber} is already assigned to another student"
            ], 422);
        }

        $examStudent->exam_secret_number = $newSecretNumber;
        $examStudent->save();

        // Load relationships for logging
        $examStudent->load(['student', 'exam']);

        // Log secret number update
        try {
            $studentName = $examStudent->student?->full_name ?? 'Unknown';
            $examName = $examStudent->exam?->name ?? 'Unknown';
            $this->activityLogService->logEvent(
                subject: $examStudent,
                event: 'exam_secret_number_updated',
                description: "Updated secret number for student {$studentName} in exam {$examName}",
                properties: [
                    'exam_student_id' => $examStudent->id,
                    'exam_id' => $examStudent->exam_id,
                    'old_secret_number' => $oldSecretNumber,
                    'new_secret_number' => $newSecretNumber,
                ],
                request: $request
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log secret number update: ' . $e->getMessage());
        }

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

        $currentSchoolId = $this->getCurrentSchoolId($request);

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
            ->where('school_id', $currentSchoolId)
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
            ->where('school_id', $currentSchoolId)
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

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('exams.roll_numbers.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $exam = Exam::with('academicYear')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
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
            ->where('school_id', $currentSchoolId)
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
                'exam_student_id' => $examStudent->id,
                'exam_roll_number' => $examStudent->exam_roll_number,
                'exam_secret_number' => $examStudent->exam_secret_number,
                'student_code' => $student?->student_code ?? $admission?->admission_no,
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

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('exams.numbers.print')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $exam = Exam::with('academicYear')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('id', $examId)
            ->whereNull('deleted_at')
            ->first();

        if (!$exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        // Get school branding
        $schoolBranding = DB::table('school_branding')
            ->where('organization_id', $profile->organization_id)
            ->where('id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->first();

        $schoolName = $schoolBranding?->school_name ?? 'School Name';

        $query = ExamStudent::with([
            'examClass.classAcademicYear.class',
            'studentAdmission.student',
            'studentAdmission.room'
        ])
            ->where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->whereNotNull('exam_roll_number');

        if ($request->filled('exam_class_id')) {
            $query->where('exam_class_id', $request->exam_class_id);
        }

        $examStudents = $query->get()->sortBy('exam_roll_number')->values();

        // Get subjects for each class with exam times
        $examClasses = ExamClass::where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->with([
                'examSubjects.subject',
                'examSubjects.examTimes' => function($query) {
                    $query->whereNull('deleted_at')->orderBy('date', 'asc');
                },
                'classAcademicYear.class'
            ])
            ->get()
            ->keyBy('id');

        // Build slips HTML (4 slips per A4 page)
        $slips = [];
        foreach ($examStudents as $examStudent) {
            $student = $examStudent->studentAdmission?->student;
            $admission = $examStudent->studentAdmission;
            $classAcademicYear = $examStudent->examClass?->classAcademicYear;
            $examClass = $examClasses->get($examStudent->exam_class_id);

            // Get subjects with their exam dates
            $subjects = [];
            if ($examClass && $examClass->examSubjects) {
                foreach ($examClass->examSubjects->whereNull('deleted_at') as $examSubject) {
                    $subjectName = $examSubject->subject?->name ?? 'Unknown';
                    // Get the first exam time (date) for this subject, or use scheduled_at as fallback
                    $examTime = $examSubject->examTimes->whereNull('deleted_at')->first();
                    $examDate = null;
                    if ($examTime && $examTime->date) {
                        $examDate = $examTime->date->format('Y-m-d');
                    } elseif ($examSubject->scheduled_at) {
                        $examDate = $examSubject->scheduled_at->format('Y-m-d');
                    }

                    $subjects[] = [
                        'name' => $subjectName,
                        'date' => $examDate,
                    ];
                }
            }

            // Get original province from student (orig_province is the original province)
            $province = $student?->orig_province ?? $student?->curr_province ?? '';

            // Get room number from admission
            $roomNumber = $admission?->room?->room_number ?? '';

            $slips[] = [
                'exam_roll_number' => $examStudent->exam_roll_number,
                'full_name' => $student?->full_name ?? 'Unknown',
                'father_name' => $student?->father_name ?? '',
                'admission_number' => $student?->admission_no ?? '',
                'class_name' => $classAcademicYear?->class?->name ?? 'Unknown',
                'section' => $classAcademicYear?->section_name ?? '',
                'province' => $province,
                'admission_year' => $admission?->created_at?->year ?? '',
                'room_number' => $roomNumber,
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

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('exams.numbers.print')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
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

        $query = ExamStudent::with([
            'examClass.classAcademicYear.class',
            'examClass.examSubjects.subject',
            'examClass.examSubjects.examTimes' => function($query) {
                $query->whereNull('deleted_at')->orderBy('date', 'asc');
            }
        ])
            ->where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->whereNotNull('exam_secret_number');

        if ($request->filled('exam_class_id')) {
            $query->where('exam_class_id', $request->exam_class_id);
        }

        $examStudents = $query->get()->sortBy('exam_secret_number')->values();

        // Get subject name and exam date if filtering by subject
        $subjectName = null;
        $subjectExamDate = null;
        $examSubjectId = null;

        if ($request->filled('subject_id')) {
            $subjectId = $request->subject_id;

            // Validate that subject_id is a valid UUID format
            if (preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $subjectId)) {
                // First try to find it as exam_subject_id (UUID)
                $examSubject = DB::table('exam_subjects')
                    ->where('id', $subjectId)
                    ->where('exam_id', $examId)
                    ->where('organization_id', $profile->organization_id)
                    ->where('school_id', $currentSchoolId)
                    ->whereNull('deleted_at')
                    ->first();

                if ($examSubject) {
                    $examSubjectId = $examSubject->id;
                    // Get the actual subject name from the related subject
                    $subject = DB::table('subjects')
                        ->where('id', $examSubject->subject_id)
                        ->where('organization_id', $profile->organization_id)
                        ->where('school_id', $currentSchoolId)
                        ->whereNull('deleted_at')
                        ->first();
                    $subjectName = $subject?->name;

                    // Get exam date from exam_times
                    $examTime = DB::table('exam_times')
                        ->where('exam_subject_id', $examSubjectId)
                        ->where('organization_id', $profile->organization_id)
                        ->where('school_id', $currentSchoolId)
                        ->whereNull('deleted_at')
                        ->orderBy('date', 'asc')
                        ->first();

                    if ($examTime && $examTime->date) {
                        $subjectExamDate = date('Y-m-d', strtotime($examTime->date));
                    } elseif ($examSubject->scheduled_at) {
                        $subjectExamDate = date('Y-m-d', strtotime($examSubject->scheduled_at));
                    }
                } else {
                    // Try as direct subject UUID
                    $subject = DB::table('subjects')
                        ->where('id', $subjectId)
                        ->where('organization_id', $profile->organization_id)
                        ->where('school_id', $currentSchoolId)
                        ->whereNull('deleted_at')
                        ->first();
                    $subjectName = $subject?->name;
                }
            }
        }

        $labels = [];
        foreach ($examStudents as $examStudent) {
            $classAcademicYear = $examStudent->examClass?->classAcademicYear;
            $examClass = $examStudent->examClass;

            // If no subject filter, get all subjects for this class
            $finalSubjectName = $subjectName;
            $finalSubjectDate = $subjectExamDate;

            if (!$finalSubjectName && $examClass && $examClass->examSubjects) {
                // Get first subject if no filter
                $firstSubject = $examClass->examSubjects->whereNull('deleted_at')->first();
                if ($firstSubject) {
                    $finalSubjectName = $firstSubject->subject?->name ?? 'Unknown';
                    $examTime = $firstSubject->examTimes->whereNull('deleted_at')->first();
                    if ($examTime && $examTime->date) {
                        $finalSubjectDate = $examTime->date->format('Y-m-d');
                    } elseif ($firstSubject->scheduled_at) {
                        $finalSubjectDate = $firstSubject->scheduled_at->format('Y-m-d');
                    }
                }
            }

            $labels[] = [
                'exam_secret_number' => $examStudent->exam_secret_number,
                'class_name' => $classAcademicYear?->class?->name ?? 'Unknown',
                'section' => $classAcademicYear?->section_name ?? '',
                'subject_name' => $finalSubjectName,
                'subject_exam_date' => $finalSubjectDate,
            ];
        }

        // Get layout type: 'single' for one label per page, 'grid' for A4 grid layout
        $layout = $request->input('layout', 'grid'); // Default to grid

        $html = $this->buildSecretLabelsHtml($labels, $exam->name, $layout);

        return response()->json([
            'html' => $html,
            'total_labels' => count($labels),
            'layout' => $layout,
        ]);
    }

    /**
     * Build roll slips HTML (Pashto RTL design - 4 slips per A4 page)
     * Uses Blade template for easier editing
     */
    private function buildRollSlipsHtml(string $schoolName, string $examName, string $academicYear, array $slips): string
    {
        // Generate QR codes for each slip using simplesoftwareio/simple-qrcode
        foreach ($slips as &$slip) {
            try {
                // Only generate QR code if roll number exists
                if (!empty($slip['exam_roll_number'])) {
                    // Use SVG format first, then convert to PNG data URI
                    // SVG is more reliable and can be embedded directly
                    $qrCodeSvg = QrCode::format('svg')
                        ->size(200)
                        ->margin(2)
                        ->errorCorrection('H')
                        ->generate($slip['exam_roll_number']);

                    // For SVG, we can use it directly as data URI
                    $slip['qr_code'] = 'data:image/svg+xml;base64,' . base64_encode($qrCodeSvg);
                    $slip['qr_code_format'] = 'svg';
                } else {
                    $slip['qr_code'] = null;
                    $slip['qr_code_format'] = null;
                }
            } catch (\Exception $e) {
                // If SVG fails, try PNG
                try {
                    if (!empty($slip['exam_roll_number'])) {
                        $qrCodePng = QrCode::format('png')
                            ->size(200)
                            ->margin(2)
                            ->errorCorrection('H')
                            ->generate($slip['exam_roll_number']);

                        $slip['qr_code'] = 'data:image/png;base64,' . base64_encode($qrCodePng);
                        $slip['qr_code_format'] = 'png';
                    } else {
                        $slip['qr_code'] = null;
                        $slip['qr_code_format'] = null;
                    }
                } catch (\Exception $e2) {
                    // If both fail, leave it empty
                    $slip['qr_code'] = null;
                    $slip['qr_code_format'] = null;
                    Log::error('Failed to generate QR code (both SVG and PNG) for roll number: ' . ($slip['exam_roll_number'] ?? 'unknown'), [
                        'svg_error' => $e->getMessage(),
                        'png_error' => $e2->getMessage(),
                    ]);
                }
            }
        }
        unset($slip); // Break reference

        // Render using Blade template
        return view('reports.roll-slips', [
            'schoolName' => $schoolName,
            'examName' => $examName,
            'academicYear' => $academicYear,
            'slips' => $slips,
        ])->render();
    }

    /**
     * Build secret labels HTML (1x2 inch labels)
     * Uses Blade template for easier editing
     *
     * @param array $labels Array of label data
     * @param string $examName Exam name
     * @param string $layout Layout type: 'single' for one label per page, 'grid' for A4 grid
     * @return string HTML content
     */
    private function buildSecretLabelsHtml(array $labels, string $examName, string $layout = 'grid'): string
    {
        // Generate barcodes for each label using simplesoftwareio/simple-qrcode
        foreach ($labels as &$label) {
            try {
                // Only generate barcode if secret number exists
                if (!empty($label['exam_secret_number'])) {
                    // Use SVG format first, then convert to PNG data URI
                    $barcodeSvg = QrCode::format('svg')
                        ->size(150)
                        ->margin(1)
                        ->errorCorrection('H')
                        ->generate($label['exam_secret_number']);

                    // For SVG, we can use it directly as data URI
                    $label['barcode'] = 'data:image/svg+xml;base64,' . base64_encode($barcodeSvg);
                    $label['barcode_format'] = 'svg';
                } else {
                    $label['barcode'] = null;
                    $label['barcode_format'] = null;
                }
            } catch (\Exception $e) {
                // If SVG fails, try PNG
                try {
                    if (!empty($label['exam_secret_number'])) {
                        $barcodePng = QrCode::format('png')
                            ->size(150)
                            ->margin(1)
                            ->errorCorrection('H')
                            ->generate($label['exam_secret_number']);

                        $label['barcode'] = 'data:image/png;base64,' . base64_encode($barcodePng);
                        $label['barcode_format'] = 'png';
                    } else {
                        $label['barcode'] = null;
                        $label['barcode_format'] = null;
                    }
                } catch (\Exception $e2) {
                    // If both fail, leave it empty
                    $label['barcode'] = null;
                    $label['barcode_format'] = null;
                    Log::error('Failed to generate barcode (both SVG and PNG) for secret number: ' . ($label['exam_secret_number'] ?? 'unknown'), [
                        'svg_error' => $e->getMessage(),
                        'png_error' => $e2->getMessage(),
                    ]);
                }
            }
        }
        unset($label); // Break reference

        // Render using Blade template
        return view('reports.secret-labels', [
            'examName' => $examName,
            'labels' => $labels,
            'layout' => $layout,
        ])->render();
    }
}
