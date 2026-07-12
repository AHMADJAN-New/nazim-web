<?php

namespace App\Http\Controllers;

use App\Http\Requests\ExamSeating\SolveExamSeatingMapRequest;
use App\Http\Requests\ExamSeating\StoreExamSeatingMapRequest;
use App\Http\Requests\ExamSeating\SyncExamSeatingAssignmentsRequest;
use App\Http\Requests\ExamSeating\SyncExamSeatingClassColorsRequest;
use App\Http\Requests\ExamSeating\UpdateExamSeatingMapRequest;
use App\Jobs\RunExamSeatingSolverJob;
use App\Models\Exam;
use App\Models\ExamSeatingMap;
use App\Models\ExamSeatingRun;
use App\Services\ExamSeating\ExamSeatingMapService;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class ExamSeatingMapController extends Controller
{
    public function __construct(
        private ExamSeatingMapService $mapService
    ) {}

    public function index(Request $request, string $examId): JsonResponse
    {
        [$user, $profile, $currentSchoolId] = $this->resolveContext($request);

        if (! $this->checkPermission($user, 'exam_seating_maps.read')) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $exam = $this->findExam($examId, $profile->organization_id, $currentSchoolId);
        if (! $exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        $maps = ExamSeatingMap::query()
            ->with(['assignments', 'classColors', 'room'])
            ->where('exam_id', $exam->id)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->orderBy('created_at')
            ->get()
            ->map(fn (ExamSeatingMap $map) => $this->mapService->serializeMap($map))
            ->values();

        return response()->json($maps);
    }

    public function store(StoreExamSeatingMapRequest $request, string $examId): JsonResponse
    {
        [$user, $profile, $currentSchoolId] = $this->resolveContext($request);

        if (! $this->checkPermission($user, 'exam_seating_maps.create')) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $exam = $this->findExam($examId, $profile->organization_id, $currentSchoolId);
        if (! $exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        try {
            $map = $this->mapService->createMap(
                $exam,
                $profile->organization_id,
                $currentSchoolId,
                $request->validated()
            );

            return response()->json($this->mapService->serializeMap($map), 201);
        } catch (RuntimeException $exception) {
            return $this->runtimeErrorResponse($exception);
        }
    }

    public function show(Request $request, string $examId, string $mapId): JsonResponse
    {
        [$user, $profile, $currentSchoolId] = $this->resolveContext($request);

        if (! $this->checkPermission($user, 'exam_seating_maps.read')) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $exam = $this->findExam($examId, $profile->organization_id, $currentSchoolId);
        if (! $exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        $map = $this->findMap($mapId, $exam, $profile->organization_id, $currentSchoolId);
        if (! $map) {
            return response()->json(['error' => 'Seating map not found'], 404);
        }

        return response()->json($this->mapService->serializeMap($map));
    }

    public function update(UpdateExamSeatingMapRequest $request, string $examId, string $mapId): JsonResponse
    {
        [$user, $profile, $currentSchoolId] = $this->resolveContext($request);

        if (! $this->checkPermission($user, 'exam_seating_maps.update')) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $exam = $this->findExam($examId, $profile->organization_id, $currentSchoolId);
        if (! $exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        $map = $this->findMap($mapId, $exam, $profile->organization_id, $currentSchoolId);
        if (! $map) {
            return response()->json(['error' => 'Seating map not found'], 404);
        }

        try {
            $updated = $this->mapService->updateMap($map, $exam, $request->validated());

            return response()->json($this->mapService->serializeMap($updated));
        } catch (RuntimeException $exception) {
            return $this->runtimeErrorResponse($exception);
        }
    }

    public function destroy(Request $request, string $examId, string $mapId): JsonResponse
    {
        [$user, $profile, $currentSchoolId] = $this->resolveContext($request);

        if (! $this->checkPermission($user, 'exam_seating_maps.delete')) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $exam = $this->findExam($examId, $profile->organization_id, $currentSchoolId);
        if (! $exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        $map = $this->findMap($mapId, $exam, $profile->organization_id, $currentSchoolId);
        if (! $map) {
            return response()->json(['error' => 'Seating map not found'], 404);
        }

        try {
            $this->mapService->deleteMap($map, $exam);

            return response()->noContent();
        } catch (RuntimeException $exception) {
            return $this->runtimeErrorResponse($exception);
        }
    }

    public function syncAssignments(
        SyncExamSeatingAssignmentsRequest $request,
        string $examId,
        string $mapId
    ): JsonResponse {
        [$user, $profile, $currentSchoolId] = $this->resolveContext($request);

        if (! $this->checkPermission($user, 'exam_seating_maps.assign')) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $exam = $this->findExam($examId, $profile->organization_id, $currentSchoolId);
        if (! $exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        $map = $this->findMap($mapId, $exam, $profile->organization_id, $currentSchoolId);
        if (! $map) {
            return response()->json(['error' => 'Seating map not found'], 404);
        }

        try {
            $updated = $this->mapService->syncAssignments(
                $map,
                $exam,
                $request->validated('assignments'),
                $user->id
            );

            return response()->json($this->mapService->serializeMap($updated));
        } catch (RuntimeException $exception) {
            return $this->runtimeErrorResponse($exception);
        }
    }

    public function syncClassColors(
        SyncExamSeatingClassColorsRequest $request,
        string $examId,
        string $mapId
    ): JsonResponse {
        [$user, $profile, $currentSchoolId] = $this->resolveContext($request);

        if (! $this->checkPermission($user, 'exam_seating_maps.update')) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $exam = $this->findExam($examId, $profile->organization_id, $currentSchoolId);
        if (! $exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        $map = $this->findMap($mapId, $exam, $profile->organization_id, $currentSchoolId);
        if (! $map) {
            return response()->json(['error' => 'Seating map not found'], 404);
        }

        try {
            $updated = $this->mapService->syncClassColors(
                $map,
                $exam,
                $request->validated('class_colors', [])
            );

            return response()->json($this->mapService->serializeMap($updated));
        } catch (RuntimeException $exception) {
            return $this->runtimeErrorResponse($exception);
        }
    }

    public function solve(SolveExamSeatingMapRequest $request, string $examId, string $mapId): JsonResponse
    {
        [$user, $profile, $currentSchoolId] = $this->resolveContext($request);

        if (! $this->checkPermission($user, 'exam_seating_maps.assign')) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $exam = $this->findExam($examId, $profile->organization_id, $currentSchoolId);
        if (! $exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        $map = $this->findMap($mapId, $exam, $profile->organization_id, $currentSchoolId);
        if (! $map) {
            return response()->json(['error' => 'Seating map not found'], 404);
        }

        try {
            $this->mapService->assertExamMutable($exam);
            $this->mapService->assertEditable($map);

            $validated = $request->validated();
            $this->mapService->validateRevisionChecksum(
                $map,
                (int) $validated['revision'],
                $validated['input_checksum']
            );

            $idempotencyKey = sprintf(
                'map:%s:revision:%d:checksum:%s',
                $map->id,
                $validated['revision'],
                $validated['input_checksum']
            );

            $map->solver_status = ExamSeatingMap::SOLVER_PENDING;
            $map->solver_diagnostics = null;
            $map->save();

            RunExamSeatingSolverJob::dispatch(
                $map->id,
                (int) $validated['revision'],
                $validated['input_checksum'],
                (bool) ($validated['strict_mode'] ?? true),
                $validated['seed'] ?? null,
                $user->id,
                $idempotencyKey
            );

            return response()->json([
                'message' => 'Seating solver started',
                'map_id' => $map->id,
                'solver_status' => $map->solver_status,
                'idempotency_key' => $idempotencyKey,
            ], 202);
        } catch (RuntimeException $exception) {
            return $this->runtimeErrorResponse($exception);
        }
    }

    public function solveStatus(Request $request, string $examId, string $mapId): JsonResponse
    {
        [$user, $profile, $currentSchoolId] = $this->resolveContext($request);

        if (! $this->checkPermission($user, 'exam_seating_maps.read')) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $exam = $this->findExam($examId, $profile->organization_id, $currentSchoolId);
        if (! $exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        $map = $this->findMap($mapId, $exam, $profile->organization_id, $currentSchoolId);
        if (! $map) {
            return response()->json(['error' => 'Seating map not found'], 404);
        }

        $latestRun = ExamSeatingRun::query()
            ->where('exam_seating_map_id', $map->id)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->orderByDesc('created_at')
            ->first();

        return response()->json([
            'map_id' => $map->id,
            'revision' => $map->revision,
            'input_checksum' => $map->input_checksum ? trim($map->input_checksum) : null,
            'solver_status' => $map->solver_status,
            'solver_diagnostics' => $map->solver_diagnostics,
            'status' => $map->status,
            'latest_run' => $latestRun ? [
                'id' => $latestRun->id,
                'status' => $latestRun->status,
                'revision' => $latestRun->revision,
                'input_checksum' => $latestRun->input_checksum ? trim($latestRun->input_checksum) : null,
                'conflict_count' => $latestRun->conflict_count,
                'diagnostics' => $latestRun->diagnostics,
                'error_message' => $latestRun->error_message,
                'started_at' => $latestRun->started_at?->toIso8601String(),
                'completed_at' => $latestRun->completed_at?->toIso8601String(),
                'failed_at' => $latestRun->failed_at?->toIso8601String(),
            ] : null,
        ]);
    }

    public function finalize(Request $request, string $examId, string $mapId): JsonResponse
    {
        [$user, $profile, $currentSchoolId] = $this->resolveContext($request);

        if (! $this->checkPermission($user, 'exam_seating_maps.update')) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $exam = $this->findExam($examId, $profile->organization_id, $currentSchoolId);
        if (! $exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        $map = $this->findMap($mapId, $exam, $profile->organization_id, $currentSchoolId);
        if (! $map) {
            return response()->json(['error' => 'Seating map not found'], 404);
        }

        try {
            $finalized = $this->mapService->finalizeMap($map, $exam, $user->id);

            return response()->json($this->mapService->serializeMap($finalized));
        } catch (RuntimeException $exception) {
            return $this->runtimeErrorResponse($exception);
        }
    }

    public function duplicate(Request $request, string $examId, string $mapId): JsonResponse
    {
        [$user, $profile, $currentSchoolId] = $this->resolveContext($request);

        if (! $this->checkPermission($user, 'exam_seating_maps.create')) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $exam = $this->findExam($examId, $profile->organization_id, $currentSchoolId);
        if (! $exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        $map = $this->findMap($mapId, $exam, $profile->organization_id, $currentSchoolId);
        if (! $map) {
            return response()->json(['error' => 'Seating map not found'], 404);
        }

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
        ]);

        try {
            $duplicate = $this->mapService->duplicateMap(
                $map,
                $exam,
                $validated['name'] ?? null
            );

            return response()->json($this->mapService->serializeMap($duplicate), 201);
        } catch (RuntimeException $exception) {
            return $this->runtimeErrorResponse($exception);
        }
    }

    public function reportData(Request $request, string $examId, string $mapId): JsonResponse
    {
        [$user, $profile, $currentSchoolId] = $this->resolveContext($request);

        if (! $this->checkPermission($user, 'exam_seating_maps.print')) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $exam = $this->findExam($examId, $profile->organization_id, $currentSchoolId);
        if (! $exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        $map = $this->findMap($mapId, $exam, $profile->organization_id, $currentSchoolId);
        if (! $map) {
            return response()->json(['error' => 'Seating map not found'], 404);
        }

        return response()->json($this->mapService->buildReportData($map));
    }

    /**
     * @return array{0: \App\Models\User, 1: object, 2: string}
     */
    private function resolveContext(Request $request): array
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (! $profile) {
            throw new HttpResponseException(response()->json(['error' => 'Profile not found'], 404));
        }

        if (! $profile->organization_id) {
            throw new HttpResponseException(response()->json(['error' => 'User must be assigned to an organization'], 403));
        }

        return [$user, $profile, $this->getCurrentSchoolId($request)];
    }

    private function checkPermission($user, string $permission): bool
    {
        try {
            return $user->hasPermissionTo($permission);
        } catch (\Exception $exception) {
            Log::warning("Permission check failed for {$permission}: ".$exception->getMessage());

            return false;
        }
    }

    private function findExam(string $examId, string $organizationId, string $schoolId): ?Exam
    {
        return Exam::query()
            ->where('id', $examId)
            ->where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->whereNull('deleted_at')
            ->first();
    }

    private function findMap(
        string $mapId,
        Exam $exam,
        string $organizationId,
        string $schoolId
    ): ?ExamSeatingMap {
        return ExamSeatingMap::query()
            ->with(['assignments', 'classColors', 'room'])
            ->where('id', $mapId)
            ->where('exam_id', $exam->id)
            ->where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->whereNull('deleted_at')
            ->first();
    }

    private function runtimeErrorResponse(RuntimeException $exception): JsonResponse
    {
        $message = $exception->getMessage();
        $status = str_contains(strtolower($message), 'completed or archived') ? 422 : 409;

        return response()->json(['error' => $message], $status);
    }
}
