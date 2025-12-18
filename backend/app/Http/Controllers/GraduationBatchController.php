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

        $schoolId = $profile->default_school_id;
        if (!$schoolId) {
            return response()->json(['error' => 'No default school assigned to user'], 403);
        }

        $query = GraduationBatch::query()
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->with(['academicYear:id,name', 'class:id,name', 'exam:id,name', 'school:id,school_name'])
            ->withCount(['students']);

        if ($request->filled('academic_year_id')) {
            $query->where('academic_year_id', $request->input('academic_year_id'));
        }

        if ($request->filled('class_id')) {
            $query->where('class_id', $request->input('class_id'));
        }

        if ($request->filled('exam_id')) {
            $query->where('exam_id', $request->input('exam_id'));
        }

        return response()->json($query->orderByDesc('created_at')->get());
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
            'exam_id' => 'required|uuid|exists:exams,id',
            'graduation_date' => 'required|date',
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

        $schoolId = $profile->default_school_id;
        if (!$schoolId) {
            return response()->json(['error' => 'No default school assigned to user'], 403);
        }

        $batch = GraduationBatch::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->with([
                'students.student',
                'academicYear:id,name',
                'class:id,name',
                'exam:id,name',
                'school:id,school_name'
            ])
            ->find($id);

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

        $schoolId = $profile->default_school_id;
        if (!$schoolId) {
            return response()->json(['error' => 'No default school assigned to user'], 403);
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

        $schoolId = $profile->default_school_id;
        if (!$schoolId) {
            return response()->json(['error' => 'No default school assigned to user'], 403);
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

        $schoolId = $profile->default_school_id;
        if (!$schoolId) {
            return response()->json(['error' => 'No default school assigned to user'], 403);
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
}
