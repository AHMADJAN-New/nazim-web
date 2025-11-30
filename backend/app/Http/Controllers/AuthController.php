<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Register a new user
     */
    public function register(Request $request)
    {
        $request->validate([
            'email' => 'required|email|unique:auth.users,email',
            'password' => 'required|min:8|confirmed',
            'full_name' => 'required|string|max:255',
            'organization_id' => 'nullable|uuid|exists:organizations,id',
        ]);

        try {
            DB::beginTransaction();

            // Create auth user (using Supabase auth.users table structure)
            $userId = DB::connection('pgsql')
                ->table('auth.users')
                ->insertGetId([
                    'email' => $request->email,
                    'encrypted_password' => Hash::make($request->password),
                    'email_confirmed_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

            // Create profile
            DB::table('profiles')->insert([
                'id' => $userId,
                'email' => $request->email,
                'full_name' => $request->full_name,
                'role' => 'staff',
                'organization_id' => $request->organization_id,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::commit();

            // Login the user
            $user = User::find($userId);
            $token = $user->createToken('auth-token')->plainTextToken;

            $profile = DB::table('profiles')->where('id', $userId)->first();

            return response()->json([
                'user' => [
                    'id' => $user->id,
                    'email' => $user->email,
                ],
                'profile' => $profile,
                'token' => $token,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }
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

        // Find user in auth.users table (Supabase auth schema)
        try {
            $authUser = DB::connection('pgsql')
                ->table('auth.users')
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
            // If auth.users doesn't exist, try public.users or handle error
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

        // Create token using the User model
        // Note: User model uses auth.users table with UUID primary key
        try {
            // Try to find user using the User model
            // Use where() instead of find() to ensure proper schema resolution
            $user = User::where('id', $authUser->id)->first();
            
            if (!$user) {
                // If User model can't find it, create a new instance with the data
                $user = new User();
                $user->id = $authUser->id;
                $user->email = $authUser->email;
                // Set exists to true so Eloquent treats it as an existing record
                $user->exists = true;
                // Set the connection explicitly
                $user->setConnection('pgsql');
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
            'default_school_id' => 'nullable|uuid|exists:schools,id',
        ]);

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
}
