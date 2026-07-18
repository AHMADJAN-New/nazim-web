<?php

namespace App\Http\Controllers;

use App\Models\Exam;
use App\Models\ExamSeatingMap;
use App\Models\ExamStudent;
use App\Services\ActivityLogService;
use App\Services\Exams\ExamNumberReportService;
use App\Services\ExamSeating\ExamSeatingMapService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ExamNumberController extends Controller
{
    public function __construct(
        private ActivityLogService $activityLogService,
        private ExamSeatingMapService $mapService,
        private ExamNumberReportService $examNumberReportService
    ) {}

    /**
     * Get students with their numbers for an exam
     * GET /api/exams/{exam}/students-with-numbers
     */
    public function studentsWithNumbers(Request $request, string $examId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (! $profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (! $user->hasPermissionTo('exams.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for exams.read: '.$e->getMessage());

            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $exam = Exam::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('id', $examId)
            ->whereNull('deleted_at')
            ->first();

        if (! $exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        $query = ExamStudent::with([
            'examClass.classAcademicYear.class',
            'studentAdmission.student',
            'studentAdmission.classAcademicYear.class',
        ])
            ->where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->withLiveActiveAdmission($exam->academic_year_id);

        if ($request->filled('exam_class_id')) {
            $query->where('exam_class_id', $request->exam_class_id);
        }

        // Same continuous order as secret-number assignment (grade → class → section → roll → name)
        $examStudents = $this->sortExamStudentsForSecretAssignment($query->get());

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
                'card_number' => $student?->card_number,
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
                'with_roll_number' => $students->filter(fn ($s) => $s['exam_roll_number'] !== null)->count(),
                'with_secret_number' => $students->filter(fn ($s) => $s['exam_secret_number'] !== null)->count(),
                'missing_roll_number' => $students->filter(fn ($s) => $s['exam_roll_number'] === null)->count(),
                'missing_secret_number' => $students->filter(fn ($s) => $s['exam_secret_number'] === null)->count(),
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

        if (! $profile || ! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (! $user->hasPermissionTo('exams.read')) {
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

        if (! $exam) {
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

        if (! $profile || ! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (! $user->hasPermissionTo('exams.roll_numbers.assign')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for exams.roll_numbers.assign: '.$e->getMessage());

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

        if (! $exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        // Check lifecycle - allow in draft, scheduled, in_progress
        if ($exam->isConfigurationLocked()) {
            return response()->json([
                'error' => 'Cannot assign roll numbers to a completed or archived exam',
                'status' => $exam->status,
            ], 422);
        }

        $query = ExamStudent::with([
            'examClass.classAcademicYear.class',
            'studentAdmission.student',
        ])
            ->where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->withLiveActiveAdmission($exam->academic_year_id);

        // Filter by scope
        if ($validated['scope'] === 'class' && ! empty($validated['exam_class_id'])) {
            $query->where('exam_class_id', $validated['exam_class_id']);
        }

        // Sort deterministically
        $examStudents = $query->get()->sortBy([
            fn ($a, $b) => ($a->examClass?->classAcademicYear?->class?->name ?? '') <=> ($b->examClass?->classAcademicYear?->class?->name ?? ''),
            fn ($a, $b) => ($a->studentAdmission?->student?->full_name ?? '') <=> ($b->studentAdmission?->student?->full_name ?? ''),
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
            if ($hasExisting && ! $overrideExisting) {
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

        if (! $profile || ! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (! $user->hasPermissionTo('exams.roll_numbers.assign')) {
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

        if (! $exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        if ($exam->isConfigurationLocked()) {
            return response()->json([
                'error' => 'Cannot assign roll numbers to a completed or archived exam',
                'status' => $exam->status,
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

                if (! $examStudent) {
                    $errors[] = [
                        'exam_student_id' => $item['exam_student_id'],
                        'error' => 'Student not found in this exam',
                    ];

                    continue;
                }

                // Check uniqueness
                if (! ExamStudent::isRollNumberUnique($examId, $item['new_roll_number'], $item['exam_student_id'])) {
                    $errors[] = [
                        'exam_student_id' => $item['exam_student_id'],
                        'error' => "Roll number {$item['new_roll_number']} is already assigned",
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
            Log::error('Roll number assignment failed: '.$e->getMessage());

            return response()->json(['error' => 'Assignment failed', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Preview continuous roll numbers from seating map seat order
     * POST /api/exams/{exam}/seating-maps/{map}/roll-numbers/preview
     */
    public function previewMapRollNumbers(Request $request, string $examId, string $mapId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (! $profile || ! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (! $user->hasPermissionTo('exams.roll_numbers.assign')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for exams.roll_numbers.assign: '.$e->getMessage());

            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $exam = Exam::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('id', $examId)
            ->whereNull('deleted_at')
            ->first();

        if (! $exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        if ($exam->isConfigurationLocked()) {
            return response()->json([
                'error' => 'Cannot assign roll numbers to a completed or archived exam',
                'status' => $exam->status,
            ], 422);
        }

        $map = ExamSeatingMap::query()
            ->with([
                'assignments.examStudent.studentAdmission.student',
                'assignments.examStudent.examClass.classAcademicYear.class',
            ])
            ->where('id', $mapId)
            ->where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->first();

        if (! $map) {
            return response()->json(['error' => 'Seating map not found'], 404);
        }

        // Keep solver checksum in sync for Solve, but return seat-layout
        // checksum for roll confirm (stable when another map is applied).
        $this->mapService->refreshInputChecksum($map);
        $map->refresh();
        $map->unsetRelation('assignments');
        $map->load([
            'assignments.examStudent.studentAdmission.student',
            'assignments.examStudent.examClass.classAcademicYear.class',
        ]);

        $assignmentPlan = $this->mapService->buildContinuousRollAssignmentsFromMap(
            $map,
            $examId,
            $profile->organization_id,
            $currentSchoolId
        );

        return response()->json([
            'map_id' => $map->id,
            'revision' => $map->revision,
            'input_checksum' => $this->mapService->buildSeatAssignmentsChecksum($map),
            'total' => count($assignmentPlan['items']),
            'will_override_count' => $assignmentPlan['will_override_count'],
            'collision_count' => $assignmentPlan['collision_count'],
            'start_roll' => $assignmentPlan['start_roll'],
            'items' => $assignmentPlan['items'],
        ]);
    }

    /**
     * Confirm continuous roll numbers from seating map seat order
     * POST /api/exams/{exam}/seating-maps/{map}/roll-numbers/confirm
     */
    public function confirmMapRollNumbers(Request $request, string $examId, string $mapId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (! $profile || ! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (! $user->hasPermissionTo('exams.roll_numbers.assign')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validate([
            'revision' => 'required|integer|min:1',
            'input_checksum' => ['required', 'string', 'regex:/^[0-9a-f]{64}$/'],
        ]);

        $exam = Exam::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('id', $examId)
            ->whereNull('deleted_at')
            ->first();

        if (! $exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        if ($exam->isConfigurationLocked()) {
            return response()->json([
                'error' => 'Cannot assign roll numbers to a completed or archived exam',
                'status' => $exam->status,
            ], 422);
        }

        $map = ExamSeatingMap::query()
            ->with([
                'assignments.examStudent.studentAdmission.student',
                'assignments.examStudent.examClass.classAcademicYear.class',
            ])
            ->where('id', $mapId)
            ->where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->first();

        if (! $map) {
            return response()->json(['error' => 'Seating map not found'], 404);
        }

        try {
            // Seat-layout checksum: applying another map must not block this map.
            $this->mapService->validateRevisionSeatChecksum(
                $map,
                (int) $validated['revision'],
                $validated['input_checksum']
            );
        } catch (\RuntimeException $exception) {
            return response()->json(['error' => $exception->getMessage()], 409);
        }

        $assignmentPlan = $this->mapService->buildContinuousRollAssignmentsFromMap(
            $map,
            $examId,
            $profile->organization_id,
            $currentSchoolId
        );

        if ($assignmentPlan['collision_count'] > 0) {
            return response()->json([
                'error' => 'Cannot apply roll numbers because of collisions. Preview and resolve conflicts first.',
                'collision_count' => $assignmentPlan['collision_count'],
                'items' => $assignmentPlan['items'],
            ], 422);
        }

        $errors = [];
        $updated = 0;

        DB::beginTransaction();
        try {
            foreach ($assignmentPlan['items'] as $item) {
                $examStudent = ExamStudent::query()
                    ->where('id', $item['exam_student_id'])
                    ->where('exam_id', $examId)
                    ->where('organization_id', $profile->organization_id)
                    ->where('school_id', $currentSchoolId)
                    ->whereNull('deleted_at')
                    ->first();

                if (! $examStudent) {
                    $errors[] = [
                        'exam_student_id' => $item['exam_student_id'],
                        'error' => 'Student not found in this exam',
                    ];

                    continue;
                }

                $newNumber = (string) $item['new_roll_number'];

                if (! ExamStudent::isRollNumberUnique($examId, $newNumber, $examStudent->id)) {
                    $errors[] = [
                        'exam_student_id' => $examStudent->id,
                        'error' => "Roll number {$newNumber} is already assigned",
                    ];

                    continue;
                }

                $examStudent->exam_roll_number = $newNumber;
                $examStudent->save();
                $updated++;
            }

            $map->refresh();
            $map->status = ExamSeatingMap::STATUS_APPLIED;
            $map->applied_at = now();
            $map->applied_by = $user->id;
            $map->revision = $map->revision + 1;
            $map->save();
            $this->mapService->refreshInputChecksum($map);

            DB::commit();

            return response()->json([
                'updated' => $updated,
                'errors' => $errors,
                'map' => $this->mapService->serializeMap($map->fresh(['assignments', 'classColors', 'room'])),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Map roll number assignment failed: '.$e->getMessage());

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

        if (! $profile || ! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (! $user->hasPermissionTo('exams.roll_numbers.assign')) {
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

        if (! $exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        if ($exam->isConfigurationLocked()) {
            return response()->json([
                'error' => 'Cannot modify roll numbers for a completed or archived exam',
                'status' => $exam->status,
            ], 422);
        }

        $examStudent = ExamStudent::where('id', $examStudentId)
            ->where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->first();

        if (! $examStudent) {
            return response()->json(['error' => 'Exam student not found'], 404);
        }

        $oldRollNumber = $examStudent->exam_roll_number;
        $newRollNumber = $validated['exam_roll_number'];

        // Check uniqueness if setting a value
        if ($newRollNumber !== null && ! ExamStudent::isRollNumberUnique($examId, $newRollNumber, $examStudentId)) {
            return response()->json([
                'error' => "Roll number {$newRollNumber} is already assigned to another student",
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
            Log::warning('Failed to log roll number update: '.$e->getMessage());
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

        if (! $profile || ! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (! $user->hasPermissionTo('exams.read')) {
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

        if (! $exam) {
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

        if (! $profile || ! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (! $user->hasPermissionTo('exams.secret_numbers.assign')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for exams.secret_numbers.assign: '.$e->getMessage());

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

        if (! $exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        if ($exam->isConfigurationLocked()) {
            return response()->json([
                'error' => 'Cannot assign secret numbers to a completed or archived exam',
                'status' => $exam->status,
            ], 422);
        }

        $query = ExamStudent::with([
            'examClass.classAcademicYear.class',
            'studentAdmission.student',
        ])
            ->where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->withLiveActiveAdmission($exam->academic_year_id);

        if ($validated['scope'] === 'class' && ! empty($validated['exam_class_id'])) {
            $query->where('exam_class_id', $validated['exam_class_id']);
        }

        // Continuous by grade → class → section → roll → name
        $examStudents = $this->sortExamStudentsForSecretAssignment($query->get());

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

            if ($hasExisting && ! $overrideExisting) {
                continue;
            }

            $newNumber = (string) $currentNumber;
            $collision = isset($existingNumbers[$newNumber]) && $existingNumbers[$newNumber] !== $examStudent->id;

            if ($hasExisting) {
                $willOverrideCount++;
            }

            $className = $examStudent->examClass?->classAcademicYear?->class?->name ?? 'Unknown';
            $section = $examStudent->examClass?->classAcademicYear?->section_name ?? '';

            $items[] = [
                'exam_student_id' => $examStudent->id,
                'student_id' => $examStudent->studentAdmission?->student_id,
                'student_name' => $examStudent->studentAdmission?->student?->full_name ?? 'Unknown',
                'class_name' => $className,
                'section' => $section,
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
            'class_ranges' => $this->buildSecretNumberClassRanges($items),
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

        if (! $profile || ! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (! $user->hasPermissionTo('exams.secret_numbers.assign')) {
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

        if (! $exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        if ($exam->isConfigurationLocked()) {
            return response()->json([
                'error' => 'Cannot assign secret numbers to a completed or archived exam',
                'status' => $exam->status,
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

                if (! $examStudent) {
                    $errors[] = [
                        'exam_student_id' => $item['exam_student_id'],
                        'error' => 'Student not found in this exam',
                    ];

                    continue;
                }

                if (! ExamStudent::isSecretNumberUnique($examId, $item['new_secret_number'], $item['exam_student_id'])) {
                    $errors[] = [
                        'exam_student_id' => $item['exam_student_id'],
                        'error' => "Secret number {$item['new_secret_number']} is already assigned",
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
            Log::error('Secret number assignment failed: '.$e->getMessage());

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

        if (! $profile || ! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (! $user->hasPermissionTo('exams.secret_numbers.assign')) {
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

        if (! $exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        if ($exam->isConfigurationLocked()) {
            return response()->json([
                'error' => 'Cannot modify secret numbers for a completed or archived exam',
                'status' => $exam->status,
            ], 422);
        }

        $examStudent = ExamStudent::where('id', $examStudentId)
            ->where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->first();

        if (! $examStudent) {
            return response()->json(['error' => 'Exam student not found'], 404);
        }

        $oldSecretNumber = $examStudent->exam_secret_number;
        $newSecretNumber = $validated['exam_secret_number'];

        if ($newSecretNumber !== null && ! ExamStudent::isSecretNumberUnique($examId, $newSecretNumber, $examStudentId)) {
            return response()->json([
                'error' => "Secret number {$newSecretNumber} is already assigned to another student",
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
            Log::warning('Failed to log secret number update: '.$e->getMessage());
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

        if (! $profile || ! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (! $user->hasPermissionTo('exams.secret_numbers.read')) {
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

        if (! $exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        $examStudent = ExamStudent::with([
            'examClass.classAcademicYear.class',
            'studentAdmission.student',
        ])
            ->where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('exam_secret_number', $secretNumber)
            ->whereNull('deleted_at')
            ->first();

        if (! $examStudent) {
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

        if (! $profile || ! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (! $user->hasPermissionTo('exams.roll_numbers.read')) {
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

        if (! $exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        $query = ExamStudent::with([
            'examClass.classAcademicYear.class',
            'studentAdmission.student',
        ])
            ->where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->withLiveActiveAdmission($exam->academic_year_id)
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
                'card_number' => $student?->card_number,
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
     * Get roll slips HTML (sample when preview=true). Full PDF uses ReportService async jobs.
     * GET /api/exams/{exam}/reports/roll-slips
     */
    public function rollSlipsHtml(Request $request, string $examId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (! $profile || ! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (! $user->hasPermissionTo('exams.numbers.print')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        if ($request->input('format') === 'pdf') {
            return response()->json([
                'error' => 'PDF generation is asynchronous. Use POST /api/reports/generate with report_key=exam_roll_slips.',
            ], 400);
        }

        try {
            $payload = $this->examNumberReportService->buildRollSlipsHtml(
                $profile->organization_id,
                $currentSchoolId,
                $examId,
                $request->filled('exam_class_id') ? (string) $request->exam_class_id : null,
                $request->boolean('preview')
            );
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => $e->getMessage()], 404);
        }

        return response()->json([
            'html' => $payload['html'],
            'total_slips' => $payload['total_slips'],
            'is_preview' => $payload['is_preview'],
            'preview_count' => $payload['preview_count'],
        ]);
    }

    /**
     * Get secret labels HTML (sample when preview=true). Full PDF uses ReportService async jobs.
     * GET /api/exams/{exam}/reports/secret-labels
     */
    public function secretLabelsHtml(Request $request, string $examId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (! $profile || ! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (! $user->hasPermissionTo('exams.numbers.print')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        if ($request->input('format') === 'pdf') {
            return response()->json([
                'error' => 'PDF generation is asynchronous. Use POST /api/reports/generate with report_key=exam_secret_labels.',
            ], 400);
        }

        $layout = $request->input('layout', 'single');
        if (! in_array($layout, ['single', 'grid'], true)) {
            $layout = 'single';
        }

        try {
            $payload = $this->examNumberReportService->buildSecretLabelsHtml(
                $profile->organization_id,
                $currentSchoolId,
                $examId,
                $request->filled('exam_class_id') ? (string) $request->exam_class_id : null,
                $request->filled('subject_id') ? (string) $request->subject_id : null,
                $layout,
                $request->boolean('preview')
            );
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => $e->getMessage()], 404);
        }

        return response()->json([
            'html' => $payload['html'],
            'total_labels' => $payload['total_labels'],
            'is_preview' => $payload['is_preview'],
            'preview_count' => $payload['preview_count'],
            'layout' => $payload['layout'],
        ]);
    }

    /**
     * Sort exam students for continuous secret-number assignment:
     * grade_level (null last) → class name → section → roll number (empty last) → student name.
     *
     * @param  \Illuminate\Support\Collection<int, ExamStudent>  $examStudents
     * @return \Illuminate\Support\Collection<int, ExamStudent>
     */
    private function sortExamStudentsForSecretAssignment($examStudents)
    {
        return $examStudents->sortBy([
            fn ($a, $b) => $this->gradeLevelSortKey($a) <=> $this->gradeLevelSortKey($b),
            fn ($a, $b) => ($a->examClass?->classAcademicYear?->class?->name ?? '')
                <=> ($b->examClass?->classAcademicYear?->class?->name ?? ''),
            fn ($a, $b) => ($a->examClass?->classAcademicYear?->section_name ?? '')
                <=> ($b->examClass?->classAcademicYear?->section_name ?? ''),
            fn ($a, $b) => $this->compareOptionalNumericStrings(
                $a->exam_roll_number,
                $b->exam_roll_number
            ),
            fn ($a, $b) => ($a->studentAdmission?->student?->full_name ?? '')
                <=> ($b->studentAdmission?->student?->full_name ?? ''),
        ])->values();
    }

    private function gradeLevelSortKey(ExamStudent $examStudent): int
    {
        $gradeLevel = $examStudent->examClass?->classAcademicYear?->class?->grade_level;

        return $gradeLevel === null ? PHP_INT_MAX : (int) $gradeLevel;
    }

    private function compareOptionalNumericStrings(?string $a, ?string $b): int
    {
        $aEmpty = $a === null || $a === '';
        $bEmpty = $b === null || $b === '';

        if ($aEmpty && $bEmpty) {
            return 0;
        }
        if ($aEmpty) {
            return 1;
        }
        if ($bEmpty) {
            return -1;
        }

        if (is_numeric($a) && is_numeric($b)) {
            return (int) $a <=> (int) $b;
        }

        return strnatcasecmp($a, $b);
    }

    private function compareOptionalDateStrings(?string $a, ?string $b): int
    {
        $aEmpty = $a === null || $a === '';
        $bEmpty = $b === null || $b === '';

        if ($aEmpty && $bEmpty) {
            return 0;
        }
        if ($aEmpty) {
            return 1;
        }
        if ($bEmpty) {
            return -1;
        }

        return strcmp($a, $b);
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     * @return array<int, array{class_name: string, section: string, start: string, end: string, count: int}>
     */
    private function buildSecretNumberClassRanges(array $items): array
    {
        $ranges = [];

        foreach ($items as $item) {
            $className = (string) ($item['class_name'] ?? 'Unknown');
            $section = (string) ($item['section'] ?? '');
            $key = $className."\0".$section;
            $number = (string) ($item['new_secret_number'] ?? '');

            if ($number === '') {
                continue;
            }

            if (! isset($ranges[$key])) {
                $ranges[$key] = [
                    'class_name' => $className,
                    'section' => $section,
                    'start' => $number,
                    'end' => $number,
                    'count' => 0,
                ];
            }

            $ranges[$key]['end'] = $number;
            $ranges[$key]['count']++;
        }

        return array_values($ranges);
    }

    private function resolveExamSubjectDate($examSubject): ?string
    {
        $examTime = $examSubject->examTimes
            ? $examSubject->examTimes->filter(fn ($t) => $t->deleted_at === null)->first()
            : null;

        if ($examTime && $examTime->date) {
            return $examTime->date instanceof \DateTimeInterface
                ? $examTime->date->format('Y-m-d')
                : date('Y-m-d', strtotime((string) $examTime->date));
        }

        if ($examSubject->scheduled_at) {
            return $examSubject->scheduled_at instanceof \DateTimeInterface
                ? $examSubject->scheduled_at->format('Y-m-d')
                : date('Y-m-d', strtotime((string) $examSubject->scheduled_at));
        }

        return null;
    }
}
