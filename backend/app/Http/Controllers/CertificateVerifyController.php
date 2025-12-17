<?php

namespace App\Http\Controllers;

use App\Models\IssuedCertificate;
use Illuminate\Http\Request;

class CertificateVerifyController extends Controller
{
    public function show(Request $request, string $hash)
    {
        $certificate = IssuedCertificate::with(['student', 'batch', 'template', 'school'])
            ->where('verification_hash', $hash)
            ->first();

        if (!$certificate) {
            return response()->json(['status' => 'invalid', 'message' => 'Certificate not found'], 404);
        }

        $isRevoked = (bool) $certificate->revoked_at;

        return response()->json([
            'status' => $isRevoked ? 'revoked' : 'valid',
            'student_name' => $certificate->student?->full_name,
            'school_name' => $certificate->school?->school_name,
            'class_id' => $certificate->batch?->class_id,
            'graduation_date' => optional($certificate->batch?->graduation_date)->format('Y-m-d'),
            'certificate_no' => $certificate->certificate_no,
            'issued_at' => optional($certificate->issued_at)->toIso8601String(),
            'revoked_at' => optional($certificate->revoked_at)->toIso8601String(),
            'revoke_reason' => $certificate->revoke_reason,
        ]);
    }
}
