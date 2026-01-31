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

        // Check if sodium extension is available before proceeding
        if (!$this->signingService->isSodiumAvailable()) {
            return response()->json([
                'error' => 'PHP sodium extension is not available',
                'message' => 'The PHP sodium extension is required for Ed25519 key generation. Please enable it in your php.ini file.',
                'php_version' => PHP_VERSION,
                'help' => 'For PHP 7.2+, sodium is a core extension. Enable it by uncommenting or adding "extension=sodium" in php.ini (or "extension=php_sodium.dll" on Windows) and restarting your web server.',
            ], 500);
        }

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
        } catch (\RuntimeException $e) {
            // Re-throw sodium errors with better message
            if (str_contains($e->getMessage(), 'sodium extension')) {
                Log::error('Sodium extension not available for key generation');
                return response()->json([
                    'error' => 'PHP sodium extension is not available',
                    'message' => 'The PHP sodium extension is required for Ed25519 key generation. Please enable it in your php.ini file.',
                    'php_version' => PHP_VERSION,
                    'help' => 'For PHP 7.2+, sodium is a core extension. Enable it by uncommenting or adding "extension=sodium" in php.ini (or "extension=php_sodium.dll" on Windows) and restarting your web server.',
                ], 500);
            }
            Log::error('Failed to generate key pair: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to generate key pair: ' . $e->getMessage()], 500);
        } catch (\Exception $e) {
            Log::error('Failed to generate key pair: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to generate key pair: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Get public key by kid (public endpoint for desktop app license verification)
     * This endpoint is public because public keys are meant to be public for verification
     */
    public function getPublicKeyByKid(Request $request, string $kid)
    {
        try {
            $key = LicenseKey::whereNull('deleted_at')
                ->where('kid', $kid)
                ->first();

            if (!$key) {
                return response()->json([
                    'error' => 'Key not found',
                    'message' => "No license key found with identifier: {$kid}",
                    'kid' => $kid,
                ], 404);
            }

            return response()->json([
                'data' => [
                    'kid' => $key->kid,
                    'public_key_b64' => $key->public_key_b64,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to get public key by kid: ' . $e->getMessage(), [
                'kid' => $kid,
            ]);
            return response()->json([
                'error' => 'Failed to retrieve public key',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Check sodium extension availability (health check)
     */
    public function checkSodium(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        // Check subscription.admin permission (GLOBAL, not organization-scoped)
        try {
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

        $isAvailable = $this->signingService->isSodiumAvailable();
        
        return response()->json([
            'data' => [
                'sodium_available' => $isAvailable,
                'php_version' => PHP_VERSION,
                'message' => $isAvailable 
                    ? 'Sodium extension is available and ready for Ed25519 operations'
                    : 'Sodium extension is not available. Please enable it in php.ini',
                'help' => $isAvailable ? null : [
                    'For PHP 7.2+, sodium is a core extension.',
                    'Enable it by uncommenting or adding "extension=sodium" in php.ini',
                    'On Windows, use "extension=php_sodium.dll"',
                    'After enabling, restart your web server (Apache/Nginx/PHP-FPM)',
                ],
            ],
        ]);
    }

    /**
     * Import keys from JSON file
     */
    public function importKeys(Request $request)
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
            'keys' => 'required|array|min:1',
            'keys.*.kid' => 'required|string|max:255',
            'keys.*.public_key_b64' => 'required|string',
            'keys.*.private_key' => 'nullable|string',
            'keys.*.notes' => 'nullable|string',
        ]);

        $imported = 0;
        $updated = 0;
        $skipped = 0;
        $errors = [];

        foreach ($validated['keys'] as $index => $keyData) {
            try {
                // Validate public key format (base64)
                $publicKeyB64 = $keyData['public_key_b64'];
                if (!base64_decode($publicKeyB64, true)) {
                    $errors[] = [
                        'index' => $index,
                        'kid' => $keyData['kid'],
                        'error' => 'Invalid public key format (must be base64 encoded)',
                    ];
                    $skipped++;
                    continue;
                }

                // Check if key with this kid already exists (including soft-deleted)
                // Use withTrashed() to check all keys, then restore if soft-deleted
                $existingKey = LicenseKey::withTrashed()
                    ->where('kid', $keyData['kid'])
                    ->first();

                // Decode base64 public key
                $decodedPublicKey = base64_decode($publicKeyB64, true);
                if ($decodedPublicKey === false) {
                    throw new \InvalidArgumentException('Invalid base64 public key');
                }

                // Validate and decode private key if provided
                $privateKeyBinary = null;
                if (!empty($keyData['private_key'])) {
                    // Private key might be:
                    // 1. Base64-encoded 64-byte secret key (from Sodium export)
                    // 2. Base64-encoded 32-byte seed (from Ed25519 export)
                    // 3. Already binary (64 bytes or 32 bytes)
                    
                    $decodedPrivateKey = base64_decode($keyData['private_key'], true);
                    
                    if ($decodedPrivateKey !== false) {
                        // Successfully decoded from base64
                        $keyLength = strlen($decodedPrivateKey);
                        
                        if ($keyLength === SODIUM_CRYPTO_SIGN_SECRETKEYBYTES) {
                            // 64-byte secret key (ready to use)
                            $privateKeyBinary = $decodedPrivateKey;
                        } elseif ($keyLength === SODIUM_CRYPTO_SIGN_SEEDBYTES) {
                            // 32-byte seed - need to convert to 64-byte secret key
                            if (!$this->signingService->isSodiumAvailable()) {
                                throw new \RuntimeException('PHP sodium extension is required to convert seed to secret key');
                            }
                            $privateKeyBinary = $this->signingService->seedToSecretKey($decodedPrivateKey, $decodedPublicKey);
                        } else {
                            throw new \InvalidArgumentException("Invalid private key length: {$keyLength} bytes. Expected 32 bytes (seed) or 64 bytes (secret key).");
                        }
                    } elseif (strlen($keyData['private_key']) === SODIUM_CRYPTO_SIGN_SECRETKEYBYTES) {
                        // Already binary 64-byte secret key
                        $privateKeyBinary = $keyData['private_key'];
                    } elseif (strlen($keyData['private_key']) === SODIUM_CRYPTO_SIGN_SEEDBYTES) {
                        // Already binary 32-byte seed - convert to secret key
                        if (!$this->signingService->isSodiumAvailable()) {
                            throw new \RuntimeException('PHP sodium extension is required to convert seed to secret key');
                        }
                        $privateKeyBinary = $this->signingService->seedToSecretKey($keyData['private_key'], $decodedPublicKey);
                    } else {
                        throw new \InvalidArgumentException('Invalid private key format. Must be 32 bytes (seed) or 64 bytes (secret key), either binary or base64-encoded.');
                    }
                }

                if ($existingKey) {
                    // Update existing key (or restore if soft-deleted)
                    if ($existingKey->trashed()) {
                        // Restore soft-deleted key
                        $existingKey->restore();
                    }
                    
                    $existingKey->public_key_b64 = $publicKeyB64;
                    if ($privateKeyBinary !== null) {
                        $existingKey->setPrivateKey($privateKeyBinary);
                    }
                    if (isset($keyData['notes'])) {
                        $existingKey->notes = $keyData['notes'] ?? null;
                    }
                    $existingKey->save();
                    $updated++;
                } else {
                    // Create new key - use firstOrNew to avoid race conditions
                    $licenseKey = LicenseKey::firstOrNew(
                        ['kid' => $keyData['kid']],
                        [
                            'id' => (string) \Illuminate\Support\Str::uuid(),
                        ]
                    );
                    
                    // If key was just created, set all fields
                    if (!$licenseKey->exists) {
                        $licenseKey->setPublicKey($decodedPublicKey);
                        
                        if ($privateKeyBinary !== null) {
                            $licenseKey->setPrivateKey($privateKeyBinary);
                        } else {
                            // If no private key provided, store null (read-only key for verification only)
                            $licenseKey->private_key_encrypted = null;
                        }
                        
                        $licenseKey->notes = $keyData['notes'] ?? null;
                        $licenseKey->save();
                        $imported++;
                    } else {
                        // Key was found (race condition - another process created it)
                        // Update it instead
                        $licenseKey->public_key_b64 = $publicKeyB64;
                        if ($privateKeyBinary !== null) {
                            $licenseKey->setPrivateKey($privateKeyBinary);
                        }
                        if (isset($keyData['notes'])) {
                            $licenseKey->notes = $keyData['notes'] ?? null;
                        }
                        $licenseKey->save();
                        $updated++;
                    }
                }
            } catch (\Exception $e) {
                Log::error("Failed to import key at index {$index} (kid: {$keyData['kid']}): " . $e->getMessage());
                $errors[] = [
                    'index' => $index,
                    'kid' => $keyData['kid'],
                    'error' => $e->getMessage(),
                ];
                $skipped++;
            }
        }

        return response()->json([
            'data' => [
                'imported' => $imported,
                'updated' => $updated,
                'skipped' => $skipped,
                'total' => count($validated['keys']),
                'errors' => $errors,
            ],
        ], 200);
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
            'kid' => 'nullable|string|unique:license_keys,kid,' . $id,
        ]);

        // Update kid if provided (useful for fixing imported keys)
        if (!empty($validated['kid']) && $validated['kid'] !== $key->kid) {
            // Check if new kid is already used by another key
            $existingKeyWithKid = LicenseKey::whereNull('deleted_at')
                ->where('kid', $validated['kid'])
                ->where('id', '!=', $id)
                ->first();
            
            if ($existingKeyWithKid) {
                return response()->json(['error' => 'Key identifier already exists'], 400);
            }
            
            $key->kid = $validated['kid'];
        }
        
        // Update notes if provided
        if (array_key_exists('notes', $validated)) {
            $key->notes = $validated['notes'] ?? null;
        }
        
        $key->save();
        
        // Refresh the model to ensure we have the latest data
        $key->refresh();

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
            // Check if sodium extension is available before proceeding
            if (!$this->signingService->isSodiumAvailable()) {
                return response()->json([
                    'error' => 'PHP sodium extension is not available',
                    'message' => 'The PHP sodium extension is required for Ed25519 license signing. Please enable it in your php.ini file by adding: extension=sodium (or extension=php_sodium.dll on Windows).',
                    'php_version' => PHP_VERSION,
                    'help' => 'For PHP 7.2+, sodium is a core extension. Enable it by uncommenting or adding "extension=sodium" in php.ini and restarting your web server.',
                ], 500);
            }

            // Get license key
            $licenseKey = LicenseKey::whereNull('deleted_at')
                ->where('kid', $validated['kid'])
                ->firstOrFail();

            // Get private key
            $privateKey = $licenseKey->getPrivateKey();
            
            // Validate private key length (Ed25519 requires 64 bytes)
            if (empty($privateKey)) {
                return response()->json(['error' => 'Private key is not available for this license key'], 400);
            }
            
            // Auto-fix: If key is 32 bytes (seed), convert it to 64 bytes (secret key)
            if (strlen($privateKey) === SODIUM_CRYPTO_SIGN_SEEDBYTES) {
                Log::warning('Auto-fixing 32-byte seed to 64-byte secret key', [
                    'kid' => $validated['kid'],
                    'key_id' => $licenseKey->id,
                ]);
                
                try {
                    // Get public key
                    $publicKey = $licenseKey->getPublicKey();
                    
                    // Convert seed to secret key
                    $secretKey = $this->signingService->seedToSecretKey($privateKey, $publicKey);
                    
                    // Update the key in database
                    $licenseKey->setPrivateKey($secretKey);
                    $licenseKey->save();
                    
                    // Use the converted key
                    $privateKey = $secretKey;
                    
                    Log::info('Successfully converted seed to secret key', [
                        'kid' => $validated['kid'],
                        'key_id' => $licenseKey->id,
                    ]);
                } catch (\Exception $e) {
                    Log::error('Failed to auto-fix private key', [
                        'kid' => $validated['kid'],
                        'key_id' => $licenseKey->id,
                        'error' => $e->getMessage(),
                    ]);
                    
                    return response()->json([
                        'error' => 'Invalid private key format',
                        'message' => 'The private key is a 32-byte seed but could not be converted to a 64-byte secret key.',
                        'details' => [
                            'expected_length' => SODIUM_CRYPTO_SIGN_SECRETKEYBYTES . ' bytes (secret key)',
                            'actual_length' => SODIUM_CRYPTO_SIGN_SEEDBYTES . ' bytes (seed)',
                            'conversion_error' => $e->getMessage(),
                        ],
                        'solution' => 'Please delete this key and re-import it with the correct format, or generate a new key pair.',
                    ], 400);
                }
            } elseif (strlen($privateKey) !== SODIUM_CRYPTO_SIGN_SECRETKEYBYTES) {
                Log::error('Invalid private key length', [
                    'kid' => $validated['kid'],
                    'expected_bytes' => SODIUM_CRYPTO_SIGN_SECRETKEYBYTES,
                    'actual_bytes' => strlen($privateKey),
                    'key_id' => $licenseKey->id,
                ]);
                
                return response()->json([
                    'error' => 'Invalid private key format',
                    'message' => 'The private key for this license key is not in the correct format. It may have been imported incorrectly.',
                    'details' => [
                        'expected_length' => SODIUM_CRYPTO_SIGN_SECRETKEYBYTES . ' bytes (binary secret key)',
                        'actual_length' => strlen($privateKey) . ' bytes',
                    ],
                    'solution' => 'Please delete this key and re-import it, or generate a new key pair. When importing, the system will automatically handle 32-byte seeds or 64-byte secret keys.',
                ], 400);
            }

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
        } catch (\RuntimeException $e) {
            // Re-throw sodium errors with better message
            if (str_contains($e->getMessage(), 'sodium extension')) {
                Log::error('Sodium extension not available for license signing');
                return response()->json([
                    'error' => 'PHP sodium extension is not available',
                    'message' => 'The PHP sodium extension is required for Ed25519 license signing. Please enable it in your php.ini file.',
                    'php_version' => PHP_VERSION,
                    'help' => 'For PHP 7.2+, sodium is a core extension. Enable it by uncommenting or adding "extension=sodium" in php.ini (or "extension=php_sodium.dll" on Windows) and restarting your web server.',
                ], 500);
            }
            Log::error('Failed to sign license: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to sign license: ' . $e->getMessage()], 500);
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

