<?php

namespace App\Http\Controllers;

use App\Models\LicenseKey;
use App\Models\DesktopLicense;
use App\Services\LicenseSigningService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

class DesktopLicenseController extends Controller
{
    public function __construct(
        private LicenseSigningService $signingService
    ) {}

    /**
     * List all license keys
     */
    public function listKeys(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        // Check subscription.admin permission (GLOBAL, not organization-scoped)
        try {
            // CRITICAL: Use platform org UUID as team context for global permissions
            // Global permissions are stored with platform org UUID (00000000-0000-0000-0000-000000000000)
            // in model_has_permissions, but the permission itself has organization_id = NULL
            $platformOrgId = '00000000-0000-0000-0000-000000000000';
            setPermissionsTeamId($platformOrgId);
            
            if (!$user->hasPermissionTo('subscription.admin')) {
                return response()->json([
                    'error' => 'Access Denied',
                    'message' => 'This endpoint is only accessible to platform administrators.',
                ], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subscription.admin: " . $e->getMessage());
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'This endpoint is only accessible to platform administrators.',
            ], 403);
        }

        $keys = LicenseKey::whereNull('deleted_at')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($key) {
                return [
                    'id' => $key->id,
                    'kid' => $key->kid,
                    'public_key_b64' => $key->public_key_b64,
                    'notes' => $key->notes,
                    'created_at' => $key->created_at,
                    'updated_at' => $key->updated_at,
                ];
            });

        return response()->json(['data' => $keys]);
    }

    /**
     * Generate new key pair
     */
    public function generateKeyPair(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        // Check subscription.admin permission (GLOBAL, not organization-scoped)
        try {
            // CRITICAL: Use platform org UUID as team context for global permissions
            $platformOrgId = '00000000-0000-0000-0000-000000000000';
            setPermissionsTeamId($platformOrgId);
            
            if (!$user->hasPermissionTo('subscription.admin')) {
                return response()->json([
                    'error' => 'Access Denied',
                    'message' => 'This endpoint is only accessible to platform administrators.',
                ], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subscription.admin: " . $e->getMessage());
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'This endpoint is only accessible to platform administrators.',
            ], 403);
        }

        $validated = $request->validate([
            'kid' => 'required|string|unique:license_keys,kid',
            'notes' => 'nullable|string',
        ]);

        try {
            // Generate key pair
            $keyPair = $this->signingService->generateKeyPair();

            // Create license key record
            $licenseKey = new LicenseKey();
            $licenseKey->kid = $validated['kid'];
            $licenseKey->setPrivateKey($keyPair['privateKey']);
            $licenseKey->setPublicKey($keyPair['publicKey']);
            $licenseKey->notes = $validated['notes'] ?? null;
            $licenseKey->save();

            return response()->json([
                'data' => [
                    'id' => $licenseKey->id,
                    'kid' => $licenseKey->kid,
                    'public_key_b64' => $licenseKey->public_key_b64,
                    'notes' => $licenseKey->notes,
                    'created_at' => $licenseKey->created_at,
                ],
            ], 201);
        } catch (\Exception $e) {
            Log::error('Failed to generate key pair: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to generate key pair: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Get key details
     */
    public function getKey(Request $request, string $id)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        // Check subscription.admin permission (GLOBAL, not organization-scoped)
        try {
            // CRITICAL: Use platform org UUID as team context for global permissions
            $platformOrgId = '00000000-0000-0000-0000-000000000000';
            setPermissionsTeamId($platformOrgId);
            
            if (!$user->hasPermissionTo('subscription.admin')) {
                return response()->json([
                    'error' => 'Access Denied',
                    'message' => 'This endpoint is only accessible to platform administrators.',
                ], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subscription.admin: " . $e->getMessage());
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'This endpoint is only accessible to platform administrators.',
            ], 403);
        }

        $key = LicenseKey::whereNull('deleted_at')->findOrFail($id);

        return response()->json([
            'data' => [
                'id' => $key->id,
                'kid' => $key->kid,
                'public_key_b64' => $key->public_key_b64,
                'notes' => $key->notes,
                'created_at' => $key->created_at,
                'updated_at' => $key->updated_at,
            ],
        ]);
    }

    /**
     * Update key notes
     */
    public function updateKey(Request $request, string $id)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        // Check subscription.admin permission (GLOBAL, not organization-scoped)
        try {
            // CRITICAL: Use platform org UUID as team context for global permissions
            $platformOrgId = '00000000-0000-0000-0000-000000000000';
            setPermissionsTeamId($platformOrgId);
            
            if (!$user->hasPermissionTo('subscription.admin')) {
                return response()->json([
                    'error' => 'Access Denied',
                    'message' => 'This endpoint is only accessible to platform administrators.',
                ], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subscription.admin: " . $e->getMessage());
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'This endpoint is only accessible to platform administrators.',
            ], 403);
        }

        $key = LicenseKey::whereNull('deleted_at')->findOrFail($id);

        $validated = $request->validate([
            'notes' => 'nullable|string',
        ]);

        $key->notes = $validated['notes'] ?? null;
        $key->save();

        return response()->json([
            'data' => [
                'id' => $key->id,
                'kid' => $key->kid,
                'public_key_b64' => $key->public_key_b64,
                'notes' => $key->notes,
                'updated_at' => $key->updated_at,
            ],
        ]);
    }

    /**
     * Delete key (soft delete)
     */
    public function deleteKey(Request $request, string $id)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        // Check subscription.admin permission (GLOBAL, not organization-scoped)
        try {
            // CRITICAL: Use platform org UUID as team context for global permissions
            $platformOrgId = '00000000-0000-0000-0000-000000000000';
            setPermissionsTeamId($platformOrgId);
            
            if (!$user->hasPermissionTo('subscription.admin')) {
                return response()->json([
                    'error' => 'Access Denied',
                    'message' => 'This endpoint is only accessible to platform administrators.',
                ], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subscription.admin: " . $e->getMessage());
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'This endpoint is only accessible to platform administrators.',
            ], 403);
        }

        $key = LicenseKey::whereNull('deleted_at')->findOrFail($id);

        // Check if key is used by any licenses
        $inUse = DesktopLicense::where('kid', $key->kid)
            ->whereNull('deleted_at')
            ->exists();

        if ($inUse) {
            return response()->json(['error' => 'This key is in use and cannot be deleted'], 409);
        }

        $key->delete();

        return response()->noContent();
    }

    /**
     * Sign a license
     */
    public function signLicense(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        // Check subscription.admin permission (GLOBAL, not organization-scoped)
        try {
            // CRITICAL: Use platform org UUID as team context for global permissions
            $platformOrgId = '00000000-0000-0000-0000-000000000000';
            setPermissionsTeamId($platformOrgId);
            
            if (!$user->hasPermissionTo('subscription.admin')) {
                return response()->json([
                    'error' => 'Access Denied',
                    'message' => 'This endpoint is only accessible to platform administrators.',
                ], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subscription.admin: " . $e->getMessage());
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'This endpoint is only accessible to platform administrators.',
            ], 403);
        }

        $validated = $request->validate([
            'kid' => 'required|string|exists:license_keys,kid',
            'customer' => 'required|string|max:255',
            'edition' => 'required|string|in:Standard,Pro,Enterprise,Basic',
            'validity_days' => 'required|integer|min:1|max:3650',
            'seats' => 'required|integer|min:1',
            'notes' => 'nullable|string',
            'fingerprint_id' => 'required|string|size:16',
        ]);

        // Validate fingerprint format
        if (!$this->signingService->validateFingerprint($validated['fingerprint_id'])) {
            return response()->json(['error' => 'Invalid fingerprint format. Must be 16 hexadecimal characters.'], 400);
        }

        try {
            // Get license key
            $licenseKey = LicenseKey::whereNull('deleted_at')
                ->where('kid', $validated['kid'])
                ->firstOrFail();

            // Get private key
            $privateKey = $licenseKey->getPrivateKey();

            // Calculate dates
            $issuedAt = Carbon::now();
            $expires = $issuedAt->copy()->addDays($validated['validity_days']);

            // Build payload
            $payload = [
                'kid' => $validated['kid'],
                'customer' => $validated['customer'],
                'edition' => $validated['edition'],
                'expires' => $expires->toIso8601String(),
                'issued_at' => $issuedAt->toIso8601String(),
                'seats' => $validated['seats'],
                'notes' => $validated['notes'] ?? null,
                'fingerprint' => [
                    'fingerprint_id' => $validated['fingerprint_id'],
                ],
            ];

            // Create canonical JSON
            $canonicalJson = $this->signingService->canonicalJson($payload);

            // Sign license
            $signature = $this->signingService->signLicense($canonicalJson, $privateKey);

            // Encode payload and signature as base64
            $payloadB64 = base64_encode($canonicalJson);
            $signatureB64 = base64_encode($signature);

            // Create desktop license record
            $desktopLicense = new DesktopLicense();
            $desktopLicense->kid = $validated['kid'];
            $desktopLicense->customer = $validated['customer'];
            $desktopLicense->edition = $validated['edition'];
            $desktopLicense->expires = $expires;
            $desktopLicense->issued_at = $issuedAt;
            $desktopLicense->validity_days = $validated['validity_days'];
            $desktopLicense->seats = $validated['seats'];
            $desktopLicense->notes = $validated['notes'] ?? null;
            $desktopLicense->fingerprint_id = $validated['fingerprint_id'];
            $desktopLicense->payload_b64 = $payloadB64;
            $desktopLicense->signature_b64 = $signatureB64;
            $desktopLicense->save();

            // Save license file
            $filePath = $desktopLicense->saveAsDatFile();

            // Get license JSON as string for frontend display
            $licenseJson = json_encode($desktopLicense->getLicenseJson(), JSON_PRETTY_PRINT);

            return response()->json([
                'data' => [
                    'id' => $desktopLicense->id,
                    'payload_b64' => $desktopLicense->payload_b64,
                    'signature_b64' => $desktopLicense->signature_b64,
                    'license_json' => $licenseJson,
                    'license_file_path' => $filePath,
                ],
            ], 201);
        } catch (\Exception $e) {
            Log::error('Failed to sign license: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to sign license: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Verify a license
     */
    public function verifyLicense(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        // Check subscription.admin permission (GLOBAL, not organization-scoped)
        try {
            // CRITICAL: Use platform org UUID as team context for global permissions
            $platformOrgId = '00000000-0000-0000-0000-000000000000';
            setPermissionsTeamId($platformOrgId);
            
            if (!$user->hasPermissionTo('subscription.admin')) {
                return response()->json([
                    'error' => 'Access Denied',
                    'message' => 'This endpoint is only accessible to platform administrators.',
                ], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subscription.admin: " . $e->getMessage());
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'This endpoint is only accessible to platform administrators.',
            ], 403);
        }

        $validated = $request->validate([
            'payload_b64' => 'required|string',
            'signature_b64' => 'required|string',
            'public_key_b64' => 'required|string',
        ]);

        try {
            $result = $this->signingService->verifyCompleteLicense(
                $validated['payload_b64'],
                $validated['signature_b64'],
                $validated['public_key_b64']
            );

            return response()->json([
                'data' => $result,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to verify license: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to verify license: ' . $e->getMessage()], 500);
        }
    }

    /**
     * List all licenses
     */
    public function listLicenses(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        // Check subscription.admin permission (GLOBAL, not organization-scoped)
        try {
            // CRITICAL: Use platform org UUID as team context for global permissions
            $platformOrgId = '00000000-0000-0000-0000-000000000000';
            setPermissionsTeamId($platformOrgId);
            
            if (!$user->hasPermissionTo('subscription.admin')) {
                return response()->json([
                    'error' => 'Access Denied',
                    'message' => 'This endpoint is only accessible to platform administrators.',
                ], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subscription.admin: " . $e->getMessage());
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'This endpoint is only accessible to platform administrators.',
            ], 403);
        }

        $licenses = DesktopLicense::whereNull('deleted_at')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($license) {
                return [
                    'id' => $license->id,
                    'kid' => $license->kid,
                    'customer' => $license->customer,
                    'edition' => $license->edition,
                    'expires' => $license->expires,
                    'issued_at' => $license->issued_at,
                    'validity_days' => $license->validity_days,
                    'seats' => $license->seats,
                    'notes' => $license->notes,
                    'fingerprint_id' => $license->fingerprint_id,
                    'payload_b64' => $license->payload_b64,
                    'signature_b64' => $license->signature_b64,
                    'license_file_path' => $license->license_file_path,
                    'created_at' => $license->created_at,
                    'updated_at' => $license->updated_at,
                ];
            });

        return response()->json(['data' => $licenses]);
    }

    /**
     * Get license details
     */
    public function getLicense(Request $request, string $id)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        // Check subscription.admin permission (GLOBAL, not organization-scoped)
        try {
            // CRITICAL: Use platform org UUID as team context for global permissions
            $platformOrgId = '00000000-0000-0000-0000-000000000000';
            setPermissionsTeamId($platformOrgId);
            
            if (!$user->hasPermissionTo('subscription.admin')) {
                return response()->json([
                    'error' => 'Access Denied',
                    'message' => 'This endpoint is only accessible to platform administrators.',
                ], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subscription.admin: " . $e->getMessage());
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'This endpoint is only accessible to platform administrators.',
            ], 403);
        }

        $license = DesktopLicense::whereNull('deleted_at')->findOrFail($id);

        return response()->json([
            'data' => [
                'id' => $license->id,
                'kid' => $license->kid,
                'customer' => $license->customer,
                'edition' => $license->edition,
                'expires' => $license->expires,
                'issued_at' => $license->issued_at,
                'validity_days' => $license->validity_days,
                'seats' => $license->seats,
                'notes' => $license->notes,
                'fingerprint_id' => $license->fingerprint_id,
                'license' => $license->getLicenseJson(),
                'payload' => $license->getDecodedPayload(),
                'license_file_path' => $license->license_file_path,
                'created_at' => $license->created_at,
                'updated_at' => $license->updated_at,
            ],
        ]);
    }

    /**
     * Download license as .dat file
     */
    public function downloadLicense(Request $request, string $id)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        // Check subscription.admin permission (GLOBAL, not organization-scoped)
        try {
            // CRITICAL: Use platform org UUID as team context for global permissions
            $platformOrgId = '00000000-0000-0000-0000-000000000000';
            setPermissionsTeamId($platformOrgId);
            
            if (!$user->hasPermissionTo('subscription.admin')) {
                return response()->json([
                    'error' => 'Access Denied',
                    'message' => 'This endpoint is only accessible to platform administrators.',
                ], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subscription.admin: " . $e->getMessage());
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'This endpoint is only accessible to platform administrators.',
            ], 403);
        }

        $license = DesktopLicense::whereNull('deleted_at')->findOrFail($id);

        return $license->downloadAsDat();
    }

    /**
     * Delete license (soft delete)
     */
    public function deleteLicense(Request $request, string $id)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        // Check subscription.admin permission (GLOBAL, not organization-scoped)
        try {
            // CRITICAL: Use platform org UUID as team context for global permissions
            $platformOrgId = '00000000-0000-0000-0000-000000000000';
            setPermissionsTeamId($platformOrgId);
            
            if (!$user->hasPermissionTo('subscription.admin')) {
                return response()->json([
                    'error' => 'Access Denied',
                    'message' => 'This endpoint is only accessible to platform administrators.',
                ], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subscription.admin: " . $e->getMessage());
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'This endpoint is only accessible to platform administrators.',
            ], 403);
        }

        $license = DesktopLicense::whereNull('deleted_at')->findOrFail($id);

        // Delete license file if exists
        if ($license->license_file_path && Storage::disk('private')->exists($license->license_file_path)) {
            Storage::disk('private')->delete($license->license_file_path);
        }

        $license->delete();

        return response()->noContent();
    }
}

