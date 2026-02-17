<?php

namespace App\Http\Controllers;

use App\Helpers\OrganizationHelper;
use App\Models\User;
use App\Services\ActivityLogService;
use App\Services\LoginAttemptService;
use App\Services\Notifications\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(
        private NotificationService $notificationService,
        private ActivityLogService $activityLogService,
        private LoginAttemptService $loginAttemptService
    ) {}

    /**
     * Handle GET requests to login endpoint (returns error message)
     * The login endpoint only accepts POST requests
     */
    public function loginGet(Request $request)
    {
        return response()->json([
            'error' => 'Method Not Allowed',
            'message' => 'The login endpoint only accepts POST requests. Please use the login form.',
            'supported_methods' => ['POST'],
        ], 405);
    }

    /**
     * Login user
     */
    public function login(Request $request)
    {
        try {
            $request->validate([
                'email' => 'required|email',
                'password' => 'required',
            ]);
        } catch (ValidationException $e) {
            // Log failed attempts even when validation fails (invalid email format, missing fields)
            $emailRaw = trim((string) $request->input('email', ''));
            $email = $emailRaw !== '' ? strtolower($emailRaw) : '(empty)';
            try {
                $this->loginAttemptService->recordAttempt($email, false, 'validation_failed', $request);
            } catch (\Throwable $logError) {
                Log::warning('Failed to log validation-failed login attempt', ['error' => $logError->getMessage()]);
            }
            throw $e;
        }

        $email = strtolower(trim($request->email));

        // 1. Lockout check (before credential validation)
        if ($this->loginAttemptService->isLocked($email)) {
            $this->loginAttemptService->recordAttempt($email, false, 'account_locked', $request);
            $lockedUntil = $this->loginAttemptService->getLockedUntil($email);

            return response()->json([
                'message' => 'Account locked. Try again in '.($lockedUntil ? $lockedUntil->diffInMinutes(now()) : 15).' minutes.',
                'locked_until' => $lockedUntil?->toIso8601String(),
            ], 422);
        }

        // 2. User lookup
        $authUser = DB::table('users')
            ->whereRaw('LOWER(email) = LOWER(?)', [$email])
            ->first();

        if (! $authUser) {
            $this->recordFailedAttemptAndMaybeLockout($email, 'user_not_found', $request);
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // 3. Password check
        if (! Hash::check($request->password, $authUser->encrypted_password)) {
            $profile = DB::table('profiles')->where('id', $authUser->id)->first();
            $this->recordFailedAttemptAndMaybeLockout($email, 'invalid_password', $request, $authUser, $profile);
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // 4. Profile/active check
        $profile = DB::table('profiles')
            ->where('id', $authUser->id)
            ->first();

        if (! $profile || ! $profile->is_active) {
            $this->recordFailedAttemptAndMaybeLockout($email, 'account_inactive', $request, $authUser, $profile);
            throw ValidationException::withMessages([
                'email' => ['Your account is inactive.'],
            ]);
        }

        // Check if user is a platform admin (has subscription.admin permission)
        $isPlatformAdmin = false;
        if (! $profile->organization_id) {
            try {
                $user = User::where('id', $authUser->id)->first();
                if ($user) {
                    setPermissionsTeamId(null);
                    $isPlatformAdmin = $user->hasPermissionTo('subscription.admin');
                }
            } catch (\Exception $e) {
                \Log::debug('Could not check platform admin permission during login: '.$e->getMessage());
            }
        }

        // Auto-assign organization if user doesn't have one AND is not a platform admin
        if (! $profile->organization_id && ! $isPlatformAdmin) {
            $defaultOrgId = OrganizationHelper::getDefaultOrganizationId();
            if ($defaultOrgId) {
                DB::table('profiles')
                    ->where('id', $authUser->id)
                    ->update(['organization_id' => $defaultOrgId, 'updated_at' => now()]);
                $profile = DB::table('profiles')->where('id', $authUser->id)->first();
            } else {
                $orgId = (string) \Illuminate\Support\Str::uuid();
                DB::table('organizations')->insert([
                    'id' => $orgId,
                    'name' => 'ناظم',
                    'slug' => 'nazim',
                    'settings' => json_encode([]),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                OrganizationHelper::clearCache();
                DB::table('profiles')
                    ->where('id', $authUser->id)
                    ->update(['organization_id' => $orgId, 'updated_at' => now()]);
                $profile = DB::table('profiles')->where('id', $authUser->id)->first();
            }
        }

        // 5. Token creation
        try {
            $user = User::where('id', $authUser->id)->first();
            if (! $user) {
                throw new \Exception('User model could not find user');
            }
            $token = $user->createToken('auth-token')->plainTextToken;
        } catch (\Exception $e) {
            \Log::error('Token creation error: '.$e->getMessage(), [
                'user_id' => $authUser->id,
                'email' => $authUser->email,
                'trace' => $e->getTraceAsString(),
            ]);
            $this->recordFailedAttemptAndMaybeLockout($email, 'token_creation_failed', $request, $authUser, $profile);
            throw ValidationException::withMessages([
                'email' => ['Failed to create authentication token. Please try again.'],
            ]);
        }

        // Success: record attempt and clear any lockout
        $this->loginAttemptService->recordAttempt($email, true, null, $request, $authUser, $profile);
        $this->loginAttemptService->clearLockout($email, 'login_success');

        try {
            $this->checkAndNotifyNewDevice($user, $request);
        } catch (\Exception $e) {
            Log::warning('Failed to check new device login', ['user_id' => $user->id, 'error' => $e->getMessage()]);
        }

        try {
            $this->activityLogService->logEvent(
                description: 'User logged in',
                logName: 'authentication',
                event: 'login',
                properties: [
                    'email' => $authUser->email,
                    'is_platform_admin' => $isPlatformAdmin,
                    'organization_id' => $profile->organization_id ?? null,
                ],
                request: $request
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log login activity: '.$e->getMessage());
        }

        return response()->json([
            'user' => ['id' => $authUser->id, 'email' => $authUser->email],
            'profile' => $profile,
            'token' => $token,
        ]);
    }

    /**
     * Record failed login attempt and trigger lockout if max attempts exceeded.
     */
    private function recordFailedAttemptAndMaybeLockout(
        string $email,
        string $failureReason,
        Request $request,
        ?object $user = null,
        ?object $profile = null
    ): void {
        $consecutiveFailures = $this->loginAttemptService->getConsecutiveFailures($email);
        $this->loginAttemptService->recordAttempt($email, false, $failureReason, $request, $user, $profile);

        $maxAttempts = config('login.max_attempts', 5);
        if (($consecutiveFailures + 1) >= $maxAttempts) {
            $this->loginAttemptService->recordLockout($email, $request->ip() ?? '0.0.0.0', $consecutiveFailures + 1);
        }
    }

    /**
     * Logout user
     */
    public function logout(Request $request)
    {
        $user = $request->user();
        $request->user()->currentAccessToken()->delete();

        // Log logout
        try {
            $this->activityLogService->logEvent(
                description: 'User logged out',
                logName: 'authentication',
                event: 'logout',
                request: $request
            );
        } catch (\Exception $e) {
            // Don't let logging errors break logout
            Log::warning('Failed to log logout activity: '.$e->getMessage());
        }

        return response()->json(['message' => 'Logged out successfully']);
    }

    /**
     * Get authenticated user
     */
    public function user(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')
            ->where('id', $user->id)
            ->first();

        return response()->json([
            'user' => $user,
            'profile' => $profile,
        ]);
    }

    /**
     * Get user profile
     */
    public function profile(Request $request)
    {
        $profile = DB::table('profiles')
            ->where('id', $request->user()->id)
            ->first();

        return response()->json($profile);
    }

    /**
     * Update user profile
     */
    public function updateProfile(Request $request)
    {
        $request->validate([
            'full_name' => 'sometimes|string|max:255',
            'phone' => 'nullable|string|max:20',
            'avatar_url' => 'nullable|url',
            'default_school_id' => 'nullable|uuid|exists:school_branding,id',
        ]);

        // Enforce school belongs to user's organization (school-scoped system)
        if ($request->filled('default_school_id')) {
            $profile = DB::table('profiles')->where('id', $request->user()->id)->first();
            if (! $profile || ! $profile->organization_id) {
                return response()->json(['error' => 'User must be assigned to an organization'], 403);
            }

            $belongs = DB::table('school_branding')
                ->where('id', $request->default_school_id)
                ->where('organization_id', $profile->organization_id)
                ->whereNull('deleted_at')
                ->exists();

            if (! $belongs) {
                return response()->json(['error' => 'Invalid default school for this organization'], 403);
            }
        }

        DB::table('profiles')
            ->where('id', $request->user()->id)
            ->update(array_merge(
                $request->only(['full_name', 'phone', 'avatar_url', 'default_school_id']),
                ['updated_at' => now()]
            ));

        $profile = DB::table('profiles')
            ->where('id', $request->user()->id)
            ->first();

        return response()->json($profile);
    }

    /**
     * Change user password
     */
    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();

        // Get user from database to check current password
        $dbUser = DB::table('users')
            ->where('id', $user->id)
            ->first();

        if (! $dbUser) {
            return response()->json(['error' => 'User not found'], 404);
        }

        // Verify current password
        if (! Hash::check($request->current_password, $dbUser->encrypted_password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The current password is incorrect.'],
            ]);
        }

        // Update password
        DB::table('users')
            ->where('id', $user->id)
            ->update([
                'encrypted_password' => Hash::make($request->new_password),
                'updated_at' => now(),
            ]);

        // Notify user about password change
        try {
            $userModel = User::find($user->id);
            if ($userModel) {
                $this->notificationService->notify(
                    'security.password_changed',
                    $userModel,
                    $userModel, // Actor is the user themselves
                    [
                        'title' => '🔒 Password Changed',
                        'body' => 'Your password was successfully changed. If you did not make this change, please contact support immediately.',
                        'url' => '/settings/security',
                        'level' => 'critical',
                        'exclude_actor' => false, // User should see their own security notifications
                    ]
                );
            }
        } catch (\Exception $e) {
            Log::warning('Failed to send password change notification', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
        }

        // Log password change
        try {
            $this->activityLogService->logEvent(
                description: 'User changed password',
                logName: 'authentication',
                event: 'password_changed',
                request: $request
            );
        } catch (\Exception $e) {
            // Don't let logging errors break password change
            Log::warning('Failed to log password change activity: '.$e->getMessage());
        }

        return response()->json(['message' => 'Password changed successfully']);
    }

    /**
     * Check if current user is a platform admin
     * This endpoint is accessible to all authenticated users
     * Returns a simple boolean - no 403 errors for regular users
     */
    public function isPlatformAdmin(Request $request)
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['is_platform_admin' => false]);
        }

        try {
            // CRITICAL: Use platform org UUID as team context for global permissions
            // Global permissions are stored with platform org UUID (00000000-0000-0000-0000-000000000000)
            // in model_has_permissions, but the permission itself has organization_id = NULL
            $platformOrgId = '00000000-0000-0000-0000-000000000000';
            setPermissionsTeamId($platformOrgId);

            // Check for subscription.admin permission (global)
            $isPlatformAdmin = $user->hasPermissionTo('subscription.admin');

            return response()->json(['is_platform_admin' => $isPlatformAdmin]);
        } catch (\Exception $e) {
            // If permission check fails, return false (not a platform admin)
            // Don't log this as an error - it's expected for regular users
            \Log::debug('Platform admin check failed: '.$e->getMessage());

            return response()->json(['is_platform_admin' => false]);
        }
    }

    /**
     * Check if login is from a new device and notify user
     */
    private function checkAndNotifyNewDevice(User $user, Request $request): void
    {
        // Get device fingerprint (user agent + IP)
        $userAgent = $request->userAgent() ?? 'Unknown';
        $ipAddress = $request->ip() ?? 'Unknown';

        // Create a simple device fingerprint
        $deviceFingerprint = hash('sha256', $userAgent.'|'.$ipAddress);

        // Check if this device has been seen before for this user
        $knownDevices = DB::table('user_devices')
            ->where('user_id', $user->id)
            ->where('device_fingerprint', $deviceFingerprint)
            ->exists();

        if (! $knownDevices) {
            // This is a new device - save it and notify
            try {
                DB::table('user_devices')->insert([
                    'id' => (string) \Illuminate\Support\Str::uuid(),
                    'user_id' => $user->id,
                    'device_fingerprint' => $deviceFingerprint,
                    'user_agent' => $userAgent,
                    'ip_address' => $ipAddress,
                    'last_seen_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } catch (\Exception $e) {
                // Table might not exist - create it if needed (for first-time setup)
                // For now, just log and continue
                Log::debug('User devices table might not exist: '.$e->getMessage());
            }

            // Parse user agent for better device info
            $deviceInfo = $this->parseUserAgent($userAgent);
            $deviceName = $deviceInfo['name'] ?? 'Unknown Device';
            $loginTime = now()->format('Y-m-d H:i:s');

            // Notify user about new device login
            $this->notificationService->notify(
                'security.new_device_login',
                $user,
                $user, // Actor is the user themselves
                [
                    'title' => '🆕 New Device Login Detected',
                    'body' => "Login from {$deviceName} ({$ipAddress}) at {$loginTime}. If this wasn't you, please secure your account immediately.",
                    'url' => '/settings/security',
                    'level' => 'critical',
                    'exclude_actor' => false, // User should see their own security notifications
                ]
            );
        } else {
            // Update last seen time for known device
            try {
                DB::table('user_devices')
                    ->where('user_id', $user->id)
                    ->where('device_fingerprint', $deviceFingerprint)
                    ->update([
                        'last_seen_at' => now(),
                        'ip_address' => $ipAddress,
                        'updated_at' => now(),
                    ]);
            } catch (\Exception $e) {
                // Table might not exist - ignore
                Log::debug('User devices table might not exist: '.$e->getMessage());
            }
        }
    }

    /**
     * Parse user agent to extract device information
     */
    private function parseUserAgent(string $userAgent): array
    {
        $info = [
            'name' => 'Unknown Device',
            'browser' => 'Unknown',
            'os' => 'Unknown',
        ];

        // Simple parsing - can be enhanced with a library like jenssegers/agent
        if (preg_match('/(Chrome|Firefox|Safari|Edge|Opera)\/([\d.]+)/i', $userAgent, $matches)) {
            $info['browser'] = $matches[1];
        }

        if (preg_match('/(Windows|Mac|Linux|Android|iOS|iPhone|iPad)/i', $userAgent, $matches)) {
            $info['os'] = $matches[1];
        }

        // Create device name
        if ($info['browser'] !== 'Unknown' && $info['os'] !== 'Unknown') {
            $info['name'] = "{$info['os']} - {$info['browser']}";
        } elseif ($info['browser'] !== 'Unknown') {
            $info['name'] = $info['browser'];
        } elseif ($info['os'] !== 'Unknown') {
            $info['name'] = $info['os'];
        }

        return $info;
    }
}
