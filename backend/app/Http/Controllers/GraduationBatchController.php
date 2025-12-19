<?php

namespace App\Http\Controllers;

use App\Models\CertificateAuditLog;
use App\Models\GraduationBatch;
use App\Services\Certificates\GraduationBatchService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

class GraduationBatchController extends Controller
{
    public function __construct(
        private readonly GraduationBatchService $batchService
    ) {
    }

    private function getProfile($user)
    {
        return DB::table('profiles')->where('id', (string) $user->id)->first();
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        if (!$user->hasPermissionTo('graduation_batches.read')) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Allow school_id from request, fallback to default_school_id
        $schoolId = $request->get('school_id') ?? $profile->default_school_id;
        if (!$schoolId) {
            return response()->json(['error' => 'No default school assigned to user and no school_id provided'], 403);
        }

        $query = GraduationBatch::query()
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->whereNull('deleted_at')
            ->with([
                'academicYear:id,name',
                'class:id,name',
                'exam:id,name',
                'school:id,school_name',
                'fromClass:id,name',
                'toClass:id,name',
                'exams' => function ($query) {
                    $query->whereNull('exams.deleted_at')
                        ->with('examType:id,name')
                        ->withPivot('weight_percentage', 'is_required', 'display_order');
                }
            ])
            ->withCount(['students']);

        if ($request->filled('academic_year_id')) {
            $query->where('academic_year_id', $request->input('academic_year_id'));
        }

        if ($request->filled('class_id')) {
            $query->where('class_id', $request->input('class_id'));
        }

        // Support both old exam_id and new exam_ids filter
        if ($request->filled('exam_id')) {
            $examId = $request->input('exam_id');
            $query->where(function ($q) use ($examId) {
                $q->whereHas('exams', function ($subQ) use ($examId) {
                    $subQ->where('exams.id', $examId)
                        ->whereNull('exams.deleted_at');
                })->orWhere('exam_id', $examId); // Backward compatibility
            });
        }

        try {
            $batches = $query->orderByDesc('created_at')->get();
            return response()->json($batches);
        } catch (\Throwable $e) {
            report($e);
            \Log::error('GraduationBatchController::index error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['error' => 'Failed to load graduation batches: ' . $e->getMessage()], 500);
        }
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        if (!$user->hasPermissionTo('graduation_batches.create')) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validate([
            'school_id' => 'required|uuid|exists:school_branding,id',
            'academic_year_id' => 'required|uuid|exists:academic_years,id',
            'class_id' => 'required|uuid|exists:classes,id',
            'exam_id' => 'nullable|uuid|exists:exams,id', // Keep for backward compatibility
            'exam_ids' => 'required_without:exam_id|array|min:1',
            'exam_ids.*' => 'uuid|exists:exams,id',
            'exam_weights' => 'nullable|array',
            'exam_weights.*' => 'nullable|numeric|min:0|max:100',
            'graduation_type' => 'nullable|in:final_year,promotion,transfer',
            'from_class_id' => 'nullable|uuid|exists:classes,id',
            'to_class_id' => 'nullable|uuid|exists:classes,id',
            'graduation_date' => 'required|date',
            'min_attendance_percentage' => 'nullable|numeric|min:0|max:100',
            'require_attendance' => 'nullable|boolean',
            'exclude_approved_leaves' => 'nullable|boolean',
        ]);

        try {
            $batch = $this->batchService->createBatch(array_merge($validated, [
                'organization_id' => $profile->organization_id,
            ]), (string) $user->id);

            return response()->json($batch, 201);
        } catch (\Throwable $e) {
            report($e);
            $status = $e instanceof HttpExceptionInterface ? $e->getStatusCode() : 500;
            return response()->json(['error' => $e->getMessage()], $status);
        }
    }

    public function show(Request $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        if (!$user->hasPermissionTo('graduation_batches.read')) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Allow school_id from request, fallback to default_school_id
        $schoolId = $request->get('school_id') ?? $profile->default_school_id;

        // First try to find batch with school_id filter if provided
        $query = GraduationBatch::where('organization_id', $profile->organization_id);
        
        if ($schoolId) {
            $query->where('school_id', $schoolId);
        }

        $batch = $query
            ->with([
                'students.student',
                'academicYear:id,name',
                'class:id,name',
                'exam:id,name',
                'school:id,school_name',
                'fromClass:id,name',
                'toClass:id,name',
                'exams' => function ($query) {
                    $query->with('examType:id,name');
                }
            ])
            ->find($id);

        // If not found with school_id filter, try without it (batch might be from different school in same org)
        if (!$batch && $schoolId) {
            $batch = GraduationBatch::where('organization_id', $profile->organization_id)
                ->where('id', $id)
                ->with([
                    'students.student',
                    'academicYear:id,name',
                    'class:id,name',
                    'exam:id,name',
                    'school:id,school_name',
                    'fromClass:id,name',
                    'toClass:id,name',
                    'exams' => function ($query) {
                        $query->with('examType:id,name');
                    }
                ])
                ->first();
        }

        if (!$batch) {
            return response()->json(['error' => 'Graduation batch not found'], 404);
        }

        $audits = CertificateAuditLog::where('entity_id', $batch->id)
            ->where('entity_type', 'graduation_batch')
            ->orderByDesc('performed_at')
            ->limit(20)
            ->get();

        return response()->json([
            'batch' => $batch,
            'audit_logs' => $audits,
        ]);
    }

    public function generateStudents(Request $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        if (!$user->hasPermissionTo('graduation_batches.generate_students')) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Allow school_id from request, fallback to default_school_id
        $schoolId = $request->get('school_id') ?? $profile->default_school_id;
        if (!$schoolId) {
            return response()->json(['error' => 'No default school assigned to user and no school_id provided'], 403);
        }

        try {
            $students = $this->batchService->generateStudents(
                $id,
                $profile->organization_id,
                $schoolId,
                (string) $user->id
            );

            return response()->json(['students' => $students]);
        } catch (\Throwable $e) {
            report($e);
            $status = $e instanceof HttpExceptionInterface ? $e->getStatusCode() : 422;
            return response()->json(['error' => $e->getMessage()], $status);
        }
    }

    public function approve(Request $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        if (!$user->hasPermissionTo('graduation_batches.approve')) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Allow school_id from request, fallback to default_school_id
        $schoolId = $request->get('school_id') ?? $profile->default_school_id;
        if (!$schoolId) {
            return response()->json(['error' => 'No default school assigned to user and no school_id provided'], 403);
        }

        try {
            $batch = $this->batchService->approveBatch(
                $id,
                $profile->organization_id,
                $schoolId,
                (string) $user->id
            );

            return response()->json($batch);
        } catch (\Throwable $e) {
            report($e);
            $status = $e instanceof HttpExceptionInterface ? $e->getStatusCode() : 422;
            return response()->json(['error' => $e->getMessage()], $status);
        }
    }

    public function issueCertificates(Request $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        if (!$user->hasPermissionTo('certificates.issue')) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Allow school_id from request, fallback to default_school_id
        $schoolId = $request->get('school_id') ?? $profile->default_school_id;
        if (!$schoolId) {
            return response()->json(['error' => 'No default school assigned to user and no school_id provided'], 403);
        }

        $validated = $request->validate([
            'template_id' => 'required|uuid|exists:certificate_templates,id',
        ]);

        try {
            $certificates = $this->batchService->issueCertificates(
                $id,
                $validated['template_id'],
                $profile->organization_id,
                $schoolId,
                (string) $user->id
            );

            return response()->json(['issued' => $certificates]);
        } catch (\Throwable $e) {
            report($e);
            $status = $e instanceof HttpExceptionInterface ? $e->getStatusCode() : 422;
            return response()->json(['error' => $e->getMessage()], $status);
        }
    }

    public function update(Request $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        if (!$user->hasPermissionTo('graduation_batches.update')) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Allow school_id from request, fallback to default_school_id
        $schoolId = $request->get('school_id') ?? $profile->default_school_id;
        if (!$schoolId) {
            return response()->json(['error' => 'No default school assigned to user and no school_id provided'], 403);
        }

        $batch = GraduationBatch::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->find($id);

        if (!$batch) {
            return response()->json(['error' => 'Graduation batch not found'], 404);
        }

        // Only allow editing draft batches
        if ($batch->status !== GraduationBatch::STATUS_DRAFT) {
            return response()->json(['error' => 'Cannot edit batch that has been approved or issued'], 422);
        }

        $validated = $request->validate([
            'academic_year_id' => 'sometimes|uuid|exists:academic_years,id',
            'class_id' => 'sometimes|uuid|exists:classes,id',
            'exam_id' => 'nullable|uuid|exists:exams,id',
            'exam_ids' => 'sometimes|array|min:1',
            'exam_ids.*' => 'uuid|exists:exams,id',
            'exam_weights' => 'nullable|array',
            'exam_weights.*' => 'nullable|numeric|min:0|max:100',
            'graduation_type' => 'nullable|in:final_year,promotion,transfer',
            'from_class_id' => 'nullable|uuid|exists:classes,id',
            'to_class_id' => 'nullable|uuid|exists:classes,id',
            'graduation_date' => 'sometimes|date',
            'min_attendance_percentage' => 'nullable|numeric|min:0|max:100',
            'require_attendance' => 'nullable|boolean',
            'exclude_approved_leaves' => 'nullable|boolean',
        ]);

        try {
            $batch = $this->batchService->updateBatch($id, $validated, $profile->organization_id, $schoolId, (string) $user->id);
            return response()->json($batch);
        } catch (\Throwable $e) {
            report($e);
            $status = $e instanceof HttpExceptionInterface ? $e->getStatusCode() : 500;
            return response()->json(['error' => $e->getMessage()], $status);
        }
    }

    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        if (!$user->hasPermissionTo('graduation_batches.delete')) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Allow school_id from request, fallback to default_school_id
        $schoolId = $request->get('school_id') ?? $profile->default_school_id;
        if (!$schoolId) {
            return response()->json(['error' => 'No default school assigned to user and no school_id provided'], 403);
        }

        $batch = GraduationBatch::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->find($id);

        if (!$batch) {
            return response()->json(['error' => 'Graduation batch not found'], 404);
        }

        // Only allow deleting draft batches
        if ($batch->status !== GraduationBatch::STATUS_DRAFT) {
            return response()->json(['error' => 'Cannot delete batch that has been approved or issued'], 422);
        }

        try {
            $batch->delete();
            return response()->noContent();
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
