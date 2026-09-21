<?php

namespace App\Http\Controllers;

use App\Models\ExamAbsencePenaltyBand;
use App\Models\ExamAbsencePenaltySetting;
use App\Models\StudentAcademicYearAbsence;
use App\Models\StudentAdmission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ExamAbsencePenaltyController extends Controller
{
    public function showSettings(Request $request)
    {
        $context = $this->authorizeContext($request, 'exams.read');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [$profile, $currentSchoolId] = $context;

        $setting = ExamAbsencePenaltySetting::firstOrCreate(
            [
                'organization_id' => $profile->organization_id,
                'school_id' => $currentSchoolId,
            ],
            ['is_enabled' => false]
        );

        $bands = ExamAbsencePenaltyBand::query()
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->orderBy('sort_order')
            ->orderBy('min_absences')
            ->get();

        return response()->json([
            'id' => $setting->id,
            'organization_id' => $setting->organization_id,
            'school_id' => $setting->school_id,
            'is_enabled' => (bool) $setting->is_enabled,
            'bands' => $bands->map(fn (ExamAbsencePenaltyBand $band) => [
                'id' => $band->id,
                'min_absences' => (int) $band->min_absences,
                'max_absences' => $band->max_absences === null ? null : (int) $band->max_absences,
                'marks_per_absence' => (float) $band->marks_per_absence,
                'sort_order' => (int) $band->sort_order,
            ])->values(),
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
            'is_enabled' => ['required', 'boolean'],
            'bands' => ['nullable', 'array'],
            'bands.*.min_absences' => ['required', 'integer', 'min:0'],
            'bands.*.max_absences' => ['nullable', 'integer', 'min:0'],
            'bands.*.marks_per_absence' => ['required', 'numeric', 'min:0'],
        ]);

        $bands = $validated['bands'] ?? [];
        $this->assertBandsValid($bands);

        return DB::transaction(function () use ($profile, $currentSchoolId, $validated, $bands) {
            $setting = ExamAbsencePenaltySetting::firstOrCreate(
                [
                    'organization_id' => $profile->organization_id,
                    'school_id' => $currentSchoolId,
                ],
                ['is_enabled' => false]
            );

            $setting->is_enabled = (bool) $validated['is_enabled'];
            $setting->save();

            ExamAbsencePenaltyBand::query()
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->delete();

            $created = [];
            usort($bands, fn ($a, $b) => ((int) $a['min_absences']) <=> ((int) $b['min_absences']));

            foreach (array_values($bands) as $index => $band) {
                $created[] = ExamAbsencePenaltyBand::create([
                    'id' => (string) Str::uuid(),
                    'organization_id' => $profile->organization_id,
                    'school_id' => $currentSchoolId,
                    'min_absences' => (int) $band['min_absences'],
                    'max_absences' => array_key_exists('max_absences', $band) && $band['max_absences'] !== null
                        ? (int) $band['max_absences']
                        : null,
                    'marks_per_absence' => (float) $band['marks_per_absence'],
                    'sort_order' => $index,
                ]);
            }

            return response()->json([
                'id' => $setting->id,
                'organization_id' => $setting->organization_id,
                'school_id' => $setting->school_id,
                'is_enabled' => (bool) $setting->is_enabled,
                'bands' => collect($created)->map(fn (ExamAbsencePenaltyBand $band) => [
                    'id' => $band->id,
                    'min_absences' => (int) $band->min_absences,
                    'max_absences' => $band->max_absences === null ? null : (int) $band->max_absences,
                    'marks_per_absence' => (float) $band->marks_per_absence,
                    'sort_order' => (int) $band->sort_order,
                ])->values(),
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
            'academic_year_id' => ['required', 'uuid'],
            'class_academic_year_id' => ['nullable', 'uuid'],
        ]);

        $admissionsQuery = StudentAdmission::query()
            ->with(['student:id,full_name,father_name,admission_no'])
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('academic_year_id', $validated['academic_year_id'])
            ->whereNull('deleted_at');

        if (! empty($validated['class_academic_year_id'])) {
            $admissionsQuery->where('class_academic_year_id', $validated['class_academic_year_id']);
        }

        $admissions = $admissionsQuery->get()->sortBy(fn (StudentAdmission $a) => $a->student?->full_name ?? '');

        $absenceMap = StudentAcademicYearAbsence::query()
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('academic_year_id', $validated['academic_year_id'])
            ->whereIn('student_admission_id', $admissions->pluck('id'))
            ->pluck('absence_count', 'student_admission_id');

        $rows = $admissions->map(function (StudentAdmission $admission) use ($absenceMap) {
            return [
                'student_admission_id' => $admission->id,
                'student_id' => $admission->student_id,
                'student_name' => $admission->student?->full_name,
                'father_name' => $admission->student?->father_name,
                'admission_no' => $admission->student?->admission_no,
                'class_academic_year_id' => $admission->class_academic_year_id,
                'absence_count' => (int) ($absenceMap[$admission->id] ?? 0),
            ];
        })->values();

        return response()->json([
            'academic_year_id' => $validated['academic_year_id'],
            'class_academic_year_id' => $validated['class_academic_year_id'] ?? null,
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
            'academic_year_id' => ['required', 'uuid'],
            'rows' => ['required', 'array', 'min:1'],
            'rows.*.student_admission_id' => ['required', 'uuid'],
            'rows.*.absence_count' => ['required', 'integer', 'min:0'],
        ]);

        $admissionIds = collect($validated['rows'])->pluck('student_admission_id')->unique()->values();

        $validAdmissions = StudentAdmission::query()
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('academic_year_id', $validated['academic_year_id'])
            ->whereNull('deleted_at')
            ->whereIn('id', $admissionIds)
            ->pluck('id')
            ->all();

        $validSet = array_flip($validAdmissions);

        return DB::transaction(function () use ($profile, $currentSchoolId, $validated, $validSet) {
            $saved = [];

            foreach ($validated['rows'] as $row) {
                $admissionId = $row['student_admission_id'];
                if (! isset($validSet[$admissionId])) {
                    throw ValidationException::withMessages([
                        'rows' => ["Student admission {$admissionId} is not valid for this school and academic year."],
                    ]);
                }

                $record = StudentAcademicYearAbsence::updateOrCreate(
                    [
                        'school_id' => $currentSchoolId,
                        'academic_year_id' => $validated['academic_year_id'],
                        'student_admission_id' => $admissionId,
                    ],
                    [
                        'organization_id' => $profile->organization_id,
                        'absence_count' => (int) $row['absence_count'],
                    ]
                );

                $saved[] = [
                    'student_admission_id' => $record->student_admission_id,
                    'absence_count' => (int) $record->absence_count,
                ];
            }

            return response()->json([
                'academic_year_id' => $validated['academic_year_id'],
                'rows' => $saved,
            ]);
        });
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
