<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Helpers\OrganizationHelper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
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

        // Auto-assign organization if user doesn't have one
        // Only check if organization_id is missing (optimization: skip DB query if already assigned)
        if (!$profile->organization_id) {
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

        return response()->json(['message' => 'Password changed successfully']);
    }
}
