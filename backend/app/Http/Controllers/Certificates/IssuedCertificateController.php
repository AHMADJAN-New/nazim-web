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

        $schoolId = $request->get('current_school_id');
        if (!$schoolId) {
            return response()->json(['error' => 'School context is required'], 403);
        }

        $query = IssuedCertificate::with(['template', 'student'])
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId);

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

        $schoolId = $request->get('current_school_id');
        if (!$schoolId) {
            return response()->json(['error' => 'School context is required'], 403);
        }

        $certificate = IssuedCertificate::with(['template', 'student'])
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->find($id);

        if (!$certificate) {
            return response()->json(['error' => 'Certificate not found'], 404);
        }

        return response()->json($certificate);
    }

    public function getCertificateData(Request $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        if (!$user->hasPermissionTo('issued_certificates.read')) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // First, try to find the certificate to get its school_id
        $certificate = IssuedCertificate::with(['template', 'student', 'batch'])
            ->where('organization_id', $profile->organization_id)
            ->find($id);

        if (!$certificate) {
            return response()->json(['error' => 'Certificate not found'], 404);
        }

        $schoolId = $request->get('current_school_id');
        if (!$schoolId) {
            return response()->json(['error' => 'School context is required'], 403);
        }

        // Strict school scoping: certificate must belong to current school
        if ($certificate->school_id !== $schoolId) {
            return response()->json(['error' => 'Certificate not found'], 404);
        }

        // Verify the certificate belongs to the determined school (if school_id was provided in request)
        // If using certificate's own school_id, skip this check
        if ($request->has('school_id') && $certificate->school_id !== $schoolId) {
            return response()->json(['error' => 'Certificate does not belong to the specified school'], 403);
        }

        // Load related data
        $student = $certificate->student;
        $batch = $certificate->batch;
        $school = \App\Models\SchoolBranding::find($certificate->school_id);
        $class = $batch ? \App\Models\ClassModel::find($batch->class_id) : null;
        $academicYear = $batch ? \App\Models\AcademicYear::find($batch->academic_year_id) : null;
        $graduationStudent = $batch ? \App\Models\GraduationStudent::where('batch_id', $batch->id)
            ->where('student_id', $certificate->student_id)
            ->first() : null;

        // Get background image URL
        $backgroundUrl = null;
        if ($certificate->template && $certificate->template->background_image_path) {
            $backgroundUrl = url('/api/certificates/templates/' . $certificate->template->id . '/background');
        }

        // Format graduation date
        $graduationDate = null;
        if ($batch && $batch->graduation_date) {
            $graduationDate = \Illuminate\Support\Carbon::parse($batch->graduation_date)->format('Y-m-d');
        }

        // Format position
        $position = null;
        if ($graduationStudent && $graduationStudent->position) {
            $pos = $graduationStudent->position;
            $suffix = match ($pos % 10) {
                1 => 'st',
                2 => 'nd',
                3 => 'rd',
                default => 'th',
            };
            if ($pos % 100 >= 11 && $pos % 100 <= 13) {
                $suffix = 'th';
            }
            $position = $pos . $suffix;
        }

        // Generate QR code
        $qrBase64 = null;
        $verificationUrl = url('/verify/certificate/' . $certificate->verification_hash);
        try {
            $qr = \SimpleSoftwareIO\QrCode\Facades\QrCode::format('png')->size(240)->generate($certificate->qr_payload ?: $verificationUrl);
            $qrBase64 = 'data:image/png;base64,' . base64_encode($qr);
        } catch (\Exception $e) {
            // QR code generation failed, leave as null
        }

        return response()->json([
            'certificate' => [
                'id' => $certificate->id,
                'certificate_no' => $certificate->certificate_no,
                'issued_at' => $certificate->issued_at,
                'verification_hash' => $certificate->verification_hash,
                'qr_payload' => $certificate->qr_payload,
            ],
            'student' => $student ? [
                'id' => $student->id,
                'full_name' => $student->full_name,
                'father_name' => $student->father_name,
                'grandfather_name' => $student->grandfather_name,
                'mother_name' => $student->mother_name,
                'guardian_name' => $student->guardian_name,
                'curr_province' => $student->curr_province,
                'curr_district' => $student->curr_district,
                'curr_village' => $student->curr_village,
                'nationality' => $student->nationality,
                'picture_path' => $student->picture_path,
            ] : null,
            'batch' => $batch ? [
                'id' => $batch->id,
                'graduation_date' => $graduationDate,
            ] : null,
            'class' => $class ? [
                'id' => $class->id,
                'name' => $class->name,
            ] : null,
            'academicYear' => $academicYear ? [
                'id' => $academicYear->id,
                'name' => $academicYear->name,
            ] : null,
            'school' => $school ? [
                'id' => $school->id,
                'school_name' => $school->school_name,
            ] : null,
            'position' => $position,
            'background_url' => $backgroundUrl,
            'qr_code' => $qrBase64,
            'verification_url' => $verificationUrl,
            'template' => $certificate->template ? [
                'id' => $certificate->template->id,
                'layout_config' => $certificate->template->layout_config,
            ] : null,
        ]);
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

        // First, try to find the certificate to get its school_id
        $certificate = IssuedCertificate::where('organization_id', $profile->organization_id)
            ->find($id);

        if (!$certificate) {
            return response()->json(['error' => 'Certificate not found'], 404);
        }

        $schoolId = $request->get('current_school_id');
        if (!$schoolId) {
            return response()->json(['error' => 'School context is required'], 403);
        }
        if ($certificate->school_id !== $schoolId) {
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

        // First, try to find the certificate to get its school_id
        $certificate = IssuedCertificate::with('template')
            ->where('organization_id', $profile->organization_id)
            ->find($id);

        if (!$certificate) {
            return response()->json(['error' => 'Certificate not found'], 404);
        }

        $schoolId = $request->get('current_school_id');
        if (!$schoolId) {
            return response()->json(['error' => 'School context is required'], 403);
        }
        if ($certificate->school_id !== $schoolId) {
            return response()->json(['error' => 'Certificate not found'], 404);
        }

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

        $schoolId = $request->get('current_school_id');
        if (!$schoolId) {
            return response()->json(['error' => 'School context is required'], 403);
        }

        $certificates = IssuedCertificate::with('template')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->where('batch_id', $batchId)
            ->get();

        if ($certificates->isEmpty()) {
            return response()->json(['error' => 'No certificates found for batch'], 404);
        }

        $zipPath = storage_path('app/tmp/certificates_' . $batchId . '_' . time() . '.zip');

        try {
            // Generate missing PDFs
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

            // Create temp directory if it doesn't exist
            $tmpDir = dirname($zipPath);
            if (!is_dir($tmpDir)) {
                try {
                    if (!mkdir($tmpDir, 0775, true)) {
                        throw new \RuntimeException("Failed to create tmp directory: {$tmpDir}");
                    }
                    // Ensure www-data owns the directory (important for Docker)
                    if (function_exists('chown') && function_exists('posix_geteuid') && posix_geteuid() === 0) {
                        @chown($tmpDir, 'www-data');
                        @chgrp($tmpDir, 'www-data');
                    }
                } catch (\Exception $e) {
                    \Log::error('Failed to create tmp directory: ' . $e->getMessage());
                    throw new \RuntimeException('Failed to create tmp directory. Please ensure storage/app/tmp is writable.');
                }
            }

            // Create ZIP archive
            $zip = new \ZipArchive();
            if ($zip->open($zipPath, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) !== true) {
                throw new \RuntimeException('Unable to create ZIP archive');
            }

            // Add PDFs to ZIP
            foreach ($certificates as $certificate) {
                if ($certificate->pdf_path && Storage::exists($certificate->pdf_path)) {
                    $zip->addFile(Storage::path($certificate->pdf_path), $certificate->certificate_no . '.pdf');
                }
            }

            $zip->close();

            return response()->download($zipPath)->deleteFileAfterSend(true);
        } catch (\Throwable $e) {
            // Clean up zip file on error
            if (isset($zipPath) && file_exists($zipPath)) {
                @unlink($zipPath);
            }
            report($e);
            return response()->json(['error' => 'Failed to generate batch ZIP: ' . $e->getMessage()], 500);
        }
    }
}
