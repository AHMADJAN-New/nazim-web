<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Helpers\OrganizationHelper;
use App\Services\Notifications\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(
        private NotificationService $notificationService
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
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        // Find user in users table (public schema)
        try {
            $authUser = DB::table('users')
                ->where('email', $request->email)
                ->first();

            if (!$authUser) {
                throw ValidationException::withMessages([
                    'email' => ['The provided credentials are incorrect.'],
                ]);
            }

            // Check password
            if (!Hash::check($request->password, $authUser->encrypted_password)) {
                throw ValidationException::withMessages([
                    'email' => ['The provided credentials are incorrect.'],
                ]);
            }
        } catch (\Exception $e) {
            \Log::error('Auth login error: ' . $e->getMessage());
            throw ValidationException::withMessages([
                'email' => ['Authentication failed. Please contact administrator.'],
            ]);
        }

        // Get profile
        $profile = DB::table('profiles')
            ->where('id', $authUser->id)
            ->first();

        if (!$profile || !$profile->is_active) {
            throw ValidationException::withMessages([
                'email' => ['Your account is inactive.'],
            ]);
        }

        // Check if user is a platform admin (has subscription.admin permission)
        // Platform admins should NOT have organization_id auto-assigned
        $isPlatformAdmin = false;
        if (!$profile->organization_id) {
            try {
                $user = User::where('id', $authUser->id)->first();
                if ($user) {
                    // Check for global subscription.admin permission (organization_id = NULL)
                    setPermissionsTeamId(null); // Clear team context to check global permissions
                    $isPlatformAdmin = $user->hasPermissionTo('subscription.admin');
                }
            } catch (\Exception $e) {
                // If permission check fails, continue with normal flow
                \Log::debug('Could not check platform admin permission during login: ' . $e->getMessage());
            }
        }

        // Auto-assign organization if user doesn't have one AND is not a platform admin
        // Only check if organization_id is missing (optimization: skip DB query if already assigned)
        if (!$profile->organization_id && !$isPlatformAdmin) {
            $defaultOrgId = OrganizationHelper::getDefaultOrganizationId();
            
            if ($defaultOrgId) {
                DB::table('profiles')
                    ->where('id', $authUser->id)
                    ->update([
                        'organization_id' => $defaultOrgId,
                        'updated_at' => now(),
                    ]);
                
                // Refresh profile to return updated data
                $profile = DB::table('profiles')
                    ->where('id', $authUser->id)
                    ->first();
            } else {
                // If default org doesn't exist, create it
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
                    ->update([
                        'organization_id' => $orgId,
                        'updated_at' => now(),
                    ]);
                
                // Refresh profile
                $profile = DB::table('profiles')
                    ->where('id', $authUser->id)
                    ->first();
            }
        }

        // Create token using the User model
        try {
            // Load user using User model
            $user = User::where('id', $authUser->id)->first();
            
            if (!$user) {
                throw new \Exception('User model could not find user');
            }
            
            // Create Sanctum token
            $token = $user->createToken('auth-token')->plainTextToken;
        } catch (\Exception $e) {
            \Log::error('Token creation error: ' . $e->getMessage(), [
                'user_id' => $authUser->id ?? null,
                'email' => $authUser->email ?? null,
                'trace' => $e->getTraceAsString()
            ]);
            throw ValidationException::withMessages([
                'email' => ['Failed to create authentication token. Please try again.'],
            ]);
        }

        // Check for new device login
        try {
            $this->checkAndNotifyNewDevice($user, $request);
        } catch (\Exception $e) {
            Log::warning('Failed to check new device login', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
        }

        return response()->json([
            'user' => [
                'id' => $authUser->id,
                'email' => $authUser->email,
            ],
            'profile' => $profile,
            'token' => $token,
        ]);
    }

    /**
     * Logout user
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

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
            if (!$profile || !$profile->organization_id) {
                return response()->json(['error' => 'User must be assigned to an organization'], 403);
            }

            $belongs = DB::table('school_branding')
                ->where('id', $request->default_school_id)
                ->where('organization_id', $profile->organization_id)
                ->whereNull('deleted_at')
                ->exists();

            if (!$belongs) {
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

        if (!$dbUser) {
            return response()->json(['error' => 'User not found'], 404);
        }

        // Verify current password
        if (!Hash::check($request->current_password, $dbUser->encrypted_password)) {
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

        if (!$user) {
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
            \Log::debug('Platform admin check failed: ' . $e->getMessage());
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
        $deviceFingerprint = hash('sha256', $userAgent . '|' . $ipAddress);
        
        // Check if this device has been seen before for this user
        $knownDevices = DB::table('user_devices')
            ->where('user_id', $user->id)
            ->where('device_fingerprint', $deviceFingerprint)
            ->exists();
        
        if (!$knownDevices) {
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
                Log::debug('User devices table might not exist: ' . $e->getMessage());
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
                Log::debug('User devices table might not exist: ' . $e->getMessage());
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
