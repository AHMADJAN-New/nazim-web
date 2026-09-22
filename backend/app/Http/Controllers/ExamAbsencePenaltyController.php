<?php

namespace App\Http\Controllers;

use App\Models\Exam;
use App\Models\ExamAbsencePenaltyBand;
use App\Models\ExamAbsencePenaltyExamClass;
use App\Models\ExamAbsencePenaltySetting;
use App\Models\ExamClass;
use App\Models\ExamStudent;
use App\Models\ExamStudentAbsence;
use App\Services\Exams\ExamAbsenceImportXlsxService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ExamAbsencePenaltyController extends Controller
{
    public function __construct(
        private ExamAbsenceImportXlsxService $absenceImportXlsxService
    ) {}

    public function showSettings(Request $request)
    {
        $context = $this->authorizeContext($request, 'exams.read');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [$profile, $currentSchoolId] = $context;

        $validated = $request->validate([
            'exam_id' => ['required', 'uuid'],
        ]);

        $exam = $this->findExamOrFail($validated['exam_id'], $profile->organization_id, $currentSchoolId);
        if ($exam instanceof \Illuminate\Http\JsonResponse) {
            return $exam;
        }

        $setting = ExamAbsencePenaltySetting::query()
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('exam_id', $exam->id)
            ->first();

        $bands = ExamAbsencePenaltyBand::query()
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('exam_id', $exam->id)
            ->orderBy('sort_order')
            ->orderBy('min_absences')
            ->get();

        $examClassIds = ExamAbsencePenaltyExamClass::query()
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('exam_id', $exam->id)
            ->pluck('exam_class_id')
            ->values()
            ->all();

        return response()->json([
            'id' => $setting?->id,
            'organization_id' => $profile->organization_id,
            'school_id' => $currentSchoolId,
            'exam_id' => $exam->id,
            'is_enabled' => (bool) ($setting?->is_enabled ?? false),
            'bands' => $bands->map(fn (ExamAbsencePenaltyBand $band) => [
                'id' => $band->id,
                'min_absences' => (int) $band->min_absences,
                'max_absences' => $band->max_absences === null ? null : (int) $band->max_absences,
                'marks_per_absence' => (float) $band->marks_per_absence,
                'sort_order' => (int) $band->sort_order,
            ])->values(),
            'exam_class_ids' => $examClassIds,
        ]);
    }

    public function updateSettings(Request $request)
    {
        $context = $this->authorizeContext($request, 'exams.update');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [$profile, $currentSchoolId] = $context;

        $validated = $request->validate([
            'exam_id' => ['required', 'uuid'],
            'is_enabled' => ['required', 'boolean'],
            'bands' => ['nullable', 'array'],
            'bands.*.min_absences' => ['required', 'integer', 'min:0'],
            'bands.*.max_absences' => ['nullable', 'integer', 'min:0'],
            'bands.*.marks_per_absence' => ['required', 'numeric', 'min:0'],
            'exam_class_ids' => ['nullable', 'array'],
            'exam_class_ids.*' => ['uuid'],
        ]);

        $exam = $this->findExamOrFail($validated['exam_id'], $profile->organization_id, $currentSchoolId);
        if ($exam instanceof \Illuminate\Http\JsonResponse) {
            return $exam;
        }

        $bands = $validated['bands'] ?? [];
        $this->assertBandsValid($bands);

        $examClassIds = array_values(array_unique($validated['exam_class_ids'] ?? []));
        $this->assertExamClassesBelongToExam($examClassIds, $exam->id, $profile->organization_id, $currentSchoolId);

        return DB::transaction(function () use ($profile, $currentSchoolId, $validated, $bands, $examClassIds, $exam) {
            $setting = ExamAbsencePenaltySetting::updateOrCreate(
                [
                    'exam_id' => $exam->id,
                ],
                [
                    'organization_id' => $profile->organization_id,
                    'school_id' => $currentSchoolId,
                    'is_enabled' => (bool) $validated['is_enabled'],
                ]
            );

            ExamAbsencePenaltyBand::query()
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->where('exam_id', $exam->id)
                ->delete();

            ExamAbsencePenaltyExamClass::query()
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->where('exam_id', $exam->id)
                ->delete();

            $created = [];
            usort($bands, fn ($a, $b) => ((int) $a['min_absences']) <=> ((int) $b['min_absences']));

            foreach (array_values($bands) as $index => $band) {
                $created[] = ExamAbsencePenaltyBand::create([
                    'id' => (string) Str::uuid(),
                    'organization_id' => $profile->organization_id,
                    'school_id' => $currentSchoolId,
                    'exam_id' => $exam->id,
                    'min_absences' => (int) $band['min_absences'],
                    'max_absences' => array_key_exists('max_absences', $band) && $band['max_absences'] !== null
                        ? (int) $band['max_absences']
                        : null,
                    'marks_per_absence' => (float) $band['marks_per_absence'],
                    'sort_order' => $index,
                ]);
            }

            foreach ($examClassIds as $examClassId) {
                ExamAbsencePenaltyExamClass::create([
                    'id' => (string) Str::uuid(),
                    'organization_id' => $profile->organization_id,
                    'school_id' => $currentSchoolId,
                    'exam_id' => $exam->id,
                    'exam_class_id' => $examClassId,
                ]);
            }

            return response()->json([
                'id' => $setting->id,
                'organization_id' => $setting->organization_id,
                'school_id' => $setting->school_id,
                'exam_id' => $exam->id,
                'is_enabled' => (bool) $setting->is_enabled,
                'bands' => collect($created)->map(fn (ExamAbsencePenaltyBand $band) => [
                    'id' => $band->id,
                    'min_absences' => (int) $band->min_absences,
                    'max_absences' => $band->max_absences === null ? null : (int) $band->max_absences,
                    'marks_per_absence' => (float) $band->marks_per_absence,
                    'sort_order' => (int) $band->sort_order,
                ])->values(),
                'exam_class_ids' => $examClassIds,
            ]);
        });
    }

    public function listAbsences(Request $request)
    {
        $context = $this->authorizeContext($request, 'exams.read');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [$profile, $currentSchoolId] = $context;

        $validated = $request->validate([
            'exam_id' => ['required', 'uuid'],
            'exam_class_id' => ['nullable', 'uuid'],
        ]);

        $exam = $this->findExamOrFail($validated['exam_id'], $profile->organization_id, $currentSchoolId);
        if ($exam instanceof \Illuminate\Http\JsonResponse) {
            return $exam;
        }

        if (! empty($validated['exam_class_id'])) {
            $this->assertExamClassesBelongToExam(
                [$validated['exam_class_id']],
                $exam->id,
                $profile->organization_id,
                $currentSchoolId
            );
        }

        $examStudentsQuery = ExamStudent::query()
            ->with(['studentAdmission.student:id,full_name,father_name,admission_no'])
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('exam_id', $exam->id)
            ->whereNull('deleted_at')
            ->withLiveActiveAdmission();

        if (! empty($validated['exam_class_id'])) {
            $examStudentsQuery->where('exam_class_id', $validated['exam_class_id']);
        }

        $examStudents = $examStudentsQuery->get()
            ->sortBy(fn (ExamStudent $es) => $es->studentAdmission?->student?->full_name ?? '');

        $admissionIds = $examStudents->pluck('student_admission_id')->filter()->unique()->values();

        $absenceMap = ExamStudentAbsence::query()
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('exam_id', $exam->id)
            ->whereIn('student_admission_id', $admissionIds)
            ->pluck('absence_count', 'student_admission_id');

        $rows = $examStudents->map(function (ExamStudent $examStudent) use ($absenceMap) {
            $admission = $examStudent->studentAdmission;

            return [
                'student_admission_id' => $examStudent->student_admission_id,
                'exam_student_id' => $examStudent->id,
                'exam_class_id' => $examStudent->exam_class_id,
                'student_id' => $admission?->student_id,
                'student_name' => $admission?->student?->full_name,
                'father_name' => $admission?->student?->father_name,
                'admission_no' => $admission?->student?->admission_no,
                'absence_count' => (int) ($absenceMap[$examStudent->student_admission_id] ?? 0),
            ];
        })->values();

        return response()->json([
            'exam_id' => $exam->id,
            'exam_class_id' => $validated['exam_class_id'] ?? null,
            'rows' => $rows,
        ]);
    }

    public function upsertAbsences(Request $request)
    {
        $context = $this->authorizeContext($request, 'exams.update');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [$profile, $currentSchoolId] = $context;

        $validated = $request->validate([
            'exam_id' => ['required', 'uuid'],
            'rows' => ['required', 'array', 'min:1'],
            'rows.*.student_admission_id' => ['required', 'uuid'],
            'rows.*.absence_count' => ['required', 'integer', 'min:0'],
        ]);

        $exam = $this->findExamOrFail($validated['exam_id'], $profile->organization_id, $currentSchoolId);
        if ($exam instanceof \Illuminate\Http\JsonResponse) {
            return $exam;
        }

        $admissionIds = collect($validated['rows'])->pluck('student_admission_id')->unique()->values();

        $validAdmissions = ExamStudent::query()
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('exam_id', $exam->id)
            ->whereNull('deleted_at')
            ->whereIn('student_admission_id', $admissionIds)
            ->pluck('student_admission_id')
            ->unique()
            ->all();

        $validSet = array_flip($validAdmissions);

        return DB::transaction(function () use ($profile, $currentSchoolId, $validated, $validSet, $exam) {
            $saved = [];

            foreach ($validated['rows'] as $row) {
                $admissionId = $row['student_admission_id'];
                if (! isset($validSet[$admissionId])) {
                    throw ValidationException::withMessages([
                        'rows' => ["Student admission {$admissionId} is not enrolled in this exam."],
                    ]);
                }

                $record = ExamStudentAbsence::updateOrCreate(
                    [
                        'exam_id' => $exam->id,
                        'student_admission_id' => $admissionId,
                    ],
                    [
                        'organization_id' => $profile->organization_id,
                        'school_id' => $currentSchoolId,
                        'absence_count' => (int) $row['absence_count'],
                    ]
                );

                $saved[] = [
                    'student_admission_id' => $record->student_admission_id,
                    'absence_count' => (int) $record->absence_count,
                ];
            }

            return response()->json([
                'exam_id' => $exam->id,
                'rows' => $saved,
            ]);
        });
    }

    public function downloadAbsencesTemplate(Request $request)
    {
        $context = $this->authorizeContext($request, 'exams.read');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [$profile, $currentSchoolId] = $context;

        $validated = $request->validate([
            'exam_id' => ['required', 'uuid'],
            'exam_class_id' => ['nullable', 'uuid'],
        ]);

        $exam = $this->findExamOrFail($validated['exam_id'], $profile->organization_id, $currentSchoolId);
        if ($exam instanceof \Illuminate\Http\JsonResponse) {
            return $exam;
        }

        if (! empty($validated['exam_class_id'])) {
            $this->assertExamClassesBelongToExam(
                [$validated['exam_class_id']],
                $exam->id,
                $profile->organization_id,
                $currentSchoolId
            );
        }

        $xlsx = $this->absenceImportXlsxService->generateTemplate(
            $profile->organization_id,
            $currentSchoolId,
            $exam->id,
            $validated['exam_class_id'] ?? null,
            (string) ($exam->name ?? 'exam'),
        );

        return response($xlsx['content'], 200, [
            'Content-Type' => $xlsx['mime'],
            'Content-Disposition' => 'attachment; filename="'.$xlsx['filename'].'"',
        ]);
    }

    public function importAbsences(Request $request)
    {
        $context = $this->authorizeContext($request, 'exams.update');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [$profile, $currentSchoolId] = $context;

        $validated = $request->validate([
            'exam_id' => ['required', 'uuid'],
            'file' => ['required', 'file', 'mimes:xlsx,xls', 'max:10240'],
        ]);

        $exam = $this->findExamOrFail($validated['exam_id'], $profile->organization_id, $currentSchoolId);
        if ($exam instanceof \Illuminate\Http\JsonResponse) {
            return $exam;
        }

        $path = $request->file('file')?->getRealPath();
        if (! is_string($path) || $path === '') {
            throw ValidationException::withMessages([
                'file' => ['Unable to read the uploaded Excel file.'],
            ]);
        }

        $rows = $this->absenceImportXlsxService->parseImportRows(
            $path,
            $profile->organization_id,
            $currentSchoolId,
            $exam->id,
        );

        return DB::transaction(function () use ($profile, $currentSchoolId, $exam, $rows) {
            $saved = [];

            foreach ($rows as $row) {
                $record = ExamStudentAbsence::updateOrCreate(
                    [
                        'exam_id' => $exam->id,
                        'student_admission_id' => $row['student_admission_id'],
                    ],
                    [
                        'organization_id' => $profile->organization_id,
                        'school_id' => $currentSchoolId,
                        'absence_count' => (int) $row['absence_count'],
                    ]
                );

                $saved[] = [
                    'student_admission_id' => $record->student_admission_id,
                    'absence_count' => (int) $record->absence_count,
                ];
            }

            return response()->json([
                'exam_id' => $exam->id,
                'updated' => count($saved),
                'rows' => $saved,
            ]);
        });
    }

    public function copyFromExam(Request $request)
    {
        $context = $this->authorizeContext($request, 'exams.update');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [$profile, $currentSchoolId] = $context;

        $validated = $request->validate([
            'source_exam_id' => ['required', 'uuid'],
            'target_exam_id' => ['required', 'uuid', 'different:source_exam_id'],
            'copy_exam_classes' => ['nullable', 'boolean'],
        ]);

        $sourceExam = $this->findExamOrFail($validated['source_exam_id'], $profile->organization_id, $currentSchoolId);
        if ($sourceExam instanceof \Illuminate\Http\JsonResponse) {
            return $sourceExam;
        }

        $targetExam = $this->findExamOrFail($validated['target_exam_id'], $profile->organization_id, $currentSchoolId);
        if ($targetExam instanceof \Illuminate\Http\JsonResponse) {
            return $targetExam;
        }

        $copyExamClasses = (bool) ($validated['copy_exam_classes'] ?? false);

        return DB::transaction(function () use ($profile, $currentSchoolId, $sourceExam, $targetExam, $copyExamClasses) {
            $sourceSetting = ExamAbsencePenaltySetting::query()
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->where('exam_id', $sourceExam->id)
                ->first();

            $sourceBands = ExamAbsencePenaltyBand::query()
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->where('exam_id', $sourceExam->id)
                ->orderBy('sort_order')
                ->orderBy('min_absences')
                ->get();

            $setting = ExamAbsencePenaltySetting::updateOrCreate(
                ['exam_id' => $targetExam->id],
                [
                    'organization_id' => $profile->organization_id,
                    'school_id' => $currentSchoolId,
                    'is_enabled' => (bool) ($sourceSetting?->is_enabled ?? false),
                ]
            );

            ExamAbsencePenaltyBand::query()
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->where('exam_id', $targetExam->id)
                ->delete();

            $createdBands = [];
            foreach ($sourceBands as $index => $band) {
                $createdBands[] = ExamAbsencePenaltyBand::create([
                    'id' => (string) Str::uuid(),
                    'organization_id' => $profile->organization_id,
                    'school_id' => $currentSchoolId,
                    'exam_id' => $targetExam->id,
                    'min_absences' => (int) $band->min_absences,
                    'max_absences' => $band->max_absences === null ? null : (int) $band->max_absences,
                    'marks_per_absence' => (float) $band->marks_per_absence,
                    'sort_order' => $index,
                ]);
            }

            $mappedExamClassIds = [];

            ExamAbsencePenaltyExamClass::query()
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->where('exam_id', $targetExam->id)
                ->delete();

            if ($copyExamClasses) {
                $sourceSelections = ExamAbsencePenaltyExamClass::query()
                    ->where('organization_id', $profile->organization_id)
                    ->where('school_id', $currentSchoolId)
                    ->where('exam_id', $sourceExam->id)
                    ->pluck('exam_class_id');

                $sourceClasses = ExamClass::query()
                    ->with(['classAcademicYear.class'])
                    ->where('exam_id', $sourceExam->id)
                    ->where('organization_id', $profile->organization_id)
                    ->where('school_id', $currentSchoolId)
                    ->whereIn('id', $sourceSelections)
                    ->whereNull('deleted_at')
                    ->get();

                $targetClasses = ExamClass::query()
                    ->with(['classAcademicYear.class'])
                    ->where('exam_id', $targetExam->id)
                    ->where('organization_id', $profile->organization_id)
                    ->where('school_id', $currentSchoolId)
                    ->whereNull('deleted_at')
                    ->get();

                $targetByKey = [];
                foreach ($targetClasses as $targetClass) {
                    $key = $this->classMatchKey($targetClass);
                    if ($key !== null) {
                        $targetByKey[$key] = $targetClass;
                    }
                }

                foreach ($sourceClasses as $sourceClass) {
                    $key = $this->classMatchKey($sourceClass);
                    if ($key === null || ! isset($targetByKey[$key])) {
                        continue;
                    }

                    $mappedId = $targetByKey[$key]->id;
                    if (in_array($mappedId, $mappedExamClassIds, true)) {
                        continue;
                    }

                    ExamAbsencePenaltyExamClass::create([
                        'id' => (string) Str::uuid(),
                        'organization_id' => $profile->organization_id,
                        'school_id' => $currentSchoolId,
                        'exam_id' => $targetExam->id,
                        'exam_class_id' => $mappedId,
                    ]);
                    $mappedExamClassIds[] = $mappedId;
                }
            }

            return response()->json([
                'id' => $setting->id,
                'organization_id' => $setting->organization_id,
                'school_id' => $setting->school_id,
                'exam_id' => $targetExam->id,
                'is_enabled' => (bool) $setting->is_enabled,
                'bands' => collect($createdBands)->map(fn (ExamAbsencePenaltyBand $band) => [
                    'id' => $band->id,
                    'min_absences' => (int) $band->min_absences,
                    'max_absences' => $band->max_absences === null ? null : (int) $band->max_absences,
                    'marks_per_absence' => (float) $band->marks_per_absence,
                    'sort_order' => (int) $band->sort_order,
                ])->values(),
                'exam_class_ids' => $mappedExamClassIds,
                'source_exam_id' => $sourceExam->id,
                'copied_exam_classes' => $copyExamClasses,
            ]);
        });
    }

    private function classMatchKey(ExamClass $examClass): ?string
    {
        $className = $examClass->classAcademicYear?->class?->name;
        if ($className === null || $className === '') {
            return null;
        }

        $section = (string) ($examClass->classAcademicYear?->section_name ?? '');

        return mb_strtolower(trim($className)).'|'.mb_strtolower(trim($section));
    }

    /**
     * @return Exam|\Illuminate\Http\JsonResponse
     */
    private function findExamOrFail(string $examId, string $organizationId, string $schoolId)
    {
        $exam = Exam::query()
            ->where('id', $examId)
            ->where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->whereNull('deleted_at')
            ->first();

        if (! $exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        return $exam;
    }

    /**
     * @param  list<string>  $examClassIds
     */
    private function assertExamClassesBelongToExam(
        array $examClassIds,
        string $examId,
        string $organizationId,
        string $schoolId,
    ): void {
        if ($examClassIds === []) {
            return;
        }

        $validCount = ExamClass::query()
            ->where('exam_id', $examId)
            ->where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->whereNull('deleted_at')
            ->whereIn('id', $examClassIds)
            ->count();

        if ($validCount !== count($examClassIds)) {
            throw ValidationException::withMessages([
                'exam_class_ids' => ['One or more exam classes do not belong to this exam and school.'],
            ]);
        }
    }

    /**
     * @param  array<int, array{min_absences:int|string, max_absences?:int|string|null, marks_per_absence:float|int|string}>  $bands
     */
    private function assertBandsValid(array $bands): void
    {
        if ($bands === []) {
            return;
        }

        $normalized = array_map(fn (array $band) => [
            'min' => (int) $band['min_absences'],
            'max' => array_key_exists('max_absences', $band) && $band['max_absences'] !== null
                ? (int) $band['max_absences']
                : null,
        ], $bands);

        usort($normalized, fn ($a, $b) => $a['min'] <=> $b['min']);

        $openEndedSeen = false;
        $previousMax = null;

        foreach ($normalized as $index => $band) {
            if ($band['max'] !== null && $band['max'] < $band['min']) {
                throw ValidationException::withMessages([
                    'bands' => ['Each band max_absences must be greater than or equal to min_absences.'],
                ]);
            }

            if ($openEndedSeen) {
                throw ValidationException::withMessages([
                    'bands' => ['Only the last band may have an open-ended max_absences.'],
                ]);
            }

            if ($band['max'] === null) {
                $openEndedSeen = true;
            }

            if ($index > 0 && $previousMax !== null && $band['min'] <= $previousMax) {
                throw ValidationException::withMessages([
                    'bands' => ['Absence bands must not overlap.'],
                ]);
            }

            $previousMax = $band['max'];
        }
    }

    /**
     * @return array{0: object, 1: string}|\Illuminate\Http\JsonResponse
     */
    private function authorizeContext(Request $request, string $permission)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (! $profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (! $user->hasPermissionTo($permission)) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for {$permission}: ".$e->getMessage());

            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        return [$profile, $currentSchoolId];
    }
}
