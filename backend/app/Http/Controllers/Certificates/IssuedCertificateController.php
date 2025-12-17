<?php

namespace App\Http\Controllers\Certificates;

use App\Http\Controllers\Controller;
use App\Models\IssuedCertificate;
use App\Services\Certificates\CertificateAuditService;
use App\Services\Certificates\CertificateRenderService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

class IssuedCertificateController extends Controller
{
    public function __construct(
        private readonly CertificateRenderService $renderService,
        private readonly CertificateAuditService $auditService
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

        if (!$user->hasPermissionTo('issued_certificates.read')) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $query = IssuedCertificate::with(['template', 'student'])
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $request->get('school_id', $profile->default_school_id));

        if ($request->filled('student_id')) {
            $query->where('student_id', $request->input('student_id'));
        }

        if ($request->filled('batch_id')) {
            $query->where('batch_id', $request->input('batch_id'));
        }

        if ($request->filled('type')) {
            $query->whereHas('template', function ($q) use ($request) {
                $q->where('type', $request->input('type'));
            });
        }

        return response()->json($query->orderByDesc('issued_at')->get());
    }

    public function show(Request $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        if (!$user->hasPermissionTo('issued_certificates.read')) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $certificate = IssuedCertificate::with(['template', 'student'])
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $request->get('school_id', $profile->default_school_id))
            ->find($id);

        if (!$certificate) {
            return response()->json(['error' => 'Certificate not found'], 404);
        }

        return response()->json($certificate);
    }

    public function revoke(Request $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        if (!$user->hasPermissionTo('certificates.revoke')) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validate([
            'reason' => 'required|string|max:1000',
        ]);

        $certificate = IssuedCertificate::where('organization_id', $profile->organization_id)
            ->where('school_id', $request->get('school_id', $profile->default_school_id))
            ->find($id);

        if (!$certificate) {
            return response()->json(['error' => 'Certificate not found'], 404);
        }

        if ($certificate->revoked_at) {
            throw new BadRequestHttpException('Certificate already revoked.');
        }

        $certificate->revoked_at = now();
        $certificate->revoked_by = (string) $user->id;
        $certificate->revoke_reason = $validated['reason'];
        $certificate->save();

        $this->auditService->log(
            $certificate->organization_id,
            $certificate->school_id,
            'issued_certificate',
            $certificate->id,
            'revoke',
            ['reason' => $validated['reason'], 'user_id' => (string) $user->id],
            (string) $user->id
        );

        return response()->json($certificate);
    }

    public function downloadPdf(Request $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        if (!$user->hasPermissionTo('certificates.print')) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $certificate = IssuedCertificate::with('template')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $request->get('school_id', $profile->default_school_id))
            ->find($id);

        if (!$certificate) {
            return response()->json(['error' => 'Certificate not found'], 404);
        }

        $pdfPath = $certificate->pdf_path;
        if (!$pdfPath || !Storage::exists($pdfPath)) {
            $pdfPath = $this->renderService->renderSingle($certificate->template, $certificate, [
                'verification_url' => url('/verify/certificate/' . $certificate->verification_hash),
            ]);
            if ($pdfPath) {
                $certificate->pdf_path = $pdfPath;
                $certificate->save();
            }
        }

        if (!$pdfPath || !Storage::exists($pdfPath)) {
            return response()->json(['error' => 'Failed to generate certificate PDF'], 500);
        }

        $this->auditService->log(
            $certificate->organization_id,
            $certificate->school_id,
            'issued_certificate',
            $certificate->id,
            'print',
            ['user_id' => (string) $user->id],
            (string) $user->id
        );

        return Storage::download($pdfPath, $certificate->certificate_no . '.pdf');
    }

    public function downloadBatchZip(Request $request, string $batchId)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        if (!$user->hasPermissionTo('certificates.print')) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $certificates = IssuedCertificate::with('template')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $request->get('school_id', $profile->default_school_id))
            ->where('batch_id', $batchId)
            ->get();

        if ($certificates->isEmpty()) {
            return response()->json(['error' => 'No certificates found for batch'], 404);
        }

        foreach ($certificates as $certificate) {
            if (!$certificate->pdf_path || !Storage::exists($certificate->pdf_path)) {
                $pdfPath = $this->renderService->renderSingle($certificate->template, $certificate, [
                    'verification_url' => url('/verify/certificate/' . $certificate->verification_hash),
                ]);
                if ($pdfPath) {
                    $certificate->pdf_path = $pdfPath;
                    $certificate->save();
                }
            }
        }

        $zip = new \ZipArchive();
        $zipPath = storage_path('app/tmp/certificates_' . $batchId . '.zip');
        if (!is_dir(dirname($zipPath))) {
            mkdir(dirname($zipPath), 0755, true);
        }

        if ($zip->open($zipPath, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) !== true) {
            return response()->json(['error' => 'Unable to create ZIP archive'], 500);
        }

        foreach ($certificates as $certificate) {
            if ($certificate->pdf_path && Storage::exists($certificate->pdf_path)) {
                $zip->addFile(Storage::path($certificate->pdf_path), $certificate->certificate_no . '.pdf');
            }
        }

        $zip->close();

        return response()->download($zipPath)->deleteFileAfterSend(true);
    }
}
