<?php

namespace App\Http\Controllers;

use App\Models\IssuedCertificate;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CertificateVerifyController extends Controller
{
    /**
     * Verify a certificate by its verification hash
     * 
     * This is a public endpoint that allows anyone to verify certificate authenticity.
     * Rate limiting is applied via middleware (60 requests per minute).
     * 
     * @param Request $request
     * @param string $hash The verification hash from the certificate
     * @return \Illuminate\Http\JsonResponse
     */
    public function show(Request $request, string $hash)
    {
        // Validate hash format (should be 64 characters for SHA-256)
        if (strlen($hash) !== 64 || !ctype_xdigit($hash)) {
            return response()->json([
                'status' => 'invalid',
                'message' => 'Invalid verification hash format'
            ], 400);
        }

        // Find certificate by verification hash
        $certificate = IssuedCertificate::with(['student', 'batch', 'template', 'school'])
            ->where('verification_hash', $hash)
            ->first();

        if (!$certificate) {
            // Return 404 for security - don't reveal if hash exists or not
            return response()->json([
                'status' => 'invalid',
                'message' => 'Certificate not found. Please verify the link is correct.'
            ], 404);
        }

        $isRevoked = (bool) $certificate->revoked_at;

        // Return certificate information
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
        ], 200, [
            'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
            'Pragma' => 'no-cache',
            'Expires' => '0',
        ]);
    }

    /**
     * Search for a certificate by certificate number
     * 
     * This is a public endpoint that allows searching by certificate number.
     * Stricter rate limiting is applied (10 requests per minute).
     * Honeypot field is checked to prevent bot submissions.
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function search(Request $request)
    {
        // Honeypot check - if 'website' field is filled, it's likely a bot
        if ($request->filled('website')) {
            // Log potential bot attempt (optional, for monitoring)
            \Log::warning('Certificate verification: Potential bot detected (honeypot filled)', [
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);
            
            return response()->json([
                'status' => 'invalid',
                'message' => 'Invalid request'
            ], 400);
        }

        // Validate certificate number
        $request->validate([
            'certificate_no' => [
                'required',
                'string',
                'min:3',
                'max:100',
                'regex:/^[A-Za-z0-9\-_]+$/', // Alphanumeric, hyphens, and underscores only
            ],
        ], [
            'certificate_no.required' => 'Certificate number is required',
            'certificate_no.min' => 'Certificate number must be at least 3 characters',
            'certificate_no.max' => 'Certificate number must not exceed 100 characters',
            'certificate_no.regex' => 'Certificate number contains invalid characters',
        ]);

        $certificateNo = trim($request->input('certificate_no'));

        // Find certificate by certificate number
        // Use case-insensitive search for better UX
        $certificate = IssuedCertificate::with(['student', 'batch', 'template', 'school'])
            ->whereRaw('LOWER(certificate_no) = LOWER(?)', [$certificateNo])
            ->first();

        if (!$certificate) {
            // Return 404 for security - don't reveal if certificate exists or not
            return response()->json([
                'status' => 'invalid',
                'message' => 'Certificate not found. Please verify the certificate number is correct.'
            ], 404);
        }

        $isRevoked = (bool) $certificate->revoked_at;

        // Return certificate information (same structure as hash verification)
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
        ], 200, [
            'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
            'Pragma' => 'no-cache',
            'Expires' => '0',
        ]);
    }
}
