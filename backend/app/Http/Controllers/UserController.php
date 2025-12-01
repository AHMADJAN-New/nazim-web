<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\SchoolBranding;
use App\Helpers\OrganizationHelper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class UserController extends Controller
{
    /**
     * Display a listing of users
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Check permissions
        $isAdmin = in_array($profile->role, ['admin', 'super_admin']);
        if (!$isAdmin) {
            return response()->json(['error' => 'Insufficient permissions to view users'], 403);
        }

        // Get accessible organization IDs
        // Super admin with null org_id can see all organizations
        // Others see only their organization
        $orgIds = [];
        if ($profile->role === 'super_admin' && $profile->organization_id === null) {
            // Super admin can see all organizations
            $orgIds = DB::table('organizations')
                ->whereNull('deleted_at')
                ->pluck('id')
                ->toArray();
        } else {
            // Regular admin sees only their organization
            if ($profile->organization_id) {
                $orgIds = [$profile->organization_id];
            }
        }

        if (empty($orgIds)) {
            return response()->json([]);
        }

        $query = DB::table('profiles')
            ->select(
                'id',
                'full_name',
                'email',
                'role',
                'organization_id',
                'default_school_id',
                'phone',
                'avatar_url',
                'is_active',
                'created_at',
                'updated_at'
            )
            ->whereNull('deleted_at')
            ->whereIn('organization_id', $orgIds);

        // Apply filters
        if ($request->has('role') && $request->role) {
            $query->where('role', $request->role);
        }

        if ($request->has('organization_id') && $request->organization_id) {
            if (in_array($request->organization_id, $orgIds)) {
                $query->where('organization_id', $request->organization_id);
            } else {
                return response()->json([]);
            }
        }

        if ($request->has('is_active') && $request->is_active !== null) {
            $query->where('is_active', $request->is_active);
        }

        $profiles = $query->orderBy('created_at', 'desc')->get();

        // Transform to UserProfile format
        $users = $profiles->map(function ($p) {
            return [
                'id' => $p->id,
                'name' => $p->full_name || $p->email || '',
                'email' => $p->email || '',
                'role' => (string)($p->role ?? ''),
                'organization_id' => $p->organization_id,
                'default_school_id' => $p->default_school_id ?? null,
                'phone' => $p->phone,
                'avatar' => $p->avatar_url ?? null,
                'is_active' => $p->is_active ?? true,
                'created_at' => $p->created_at,
                'updated_at' => $p->updated_at,
            ];
        });

        // Apply search filter client-side
        if ($request->has('search') && $request->search) {
            $searchLower = strtolower($request->search);
            $users = $users->filter(function ($u) use ($searchLower) {
                return str_contains(strtolower($u['name']), $searchLower) ||
                       str_contains(strtolower($u['email']), $searchLower) ||
                       str_contains(strtolower($u['role']), $searchLower);
            })->values();
        }

        return response()->json($users->values());
    }

    /**
     * Store a newly created user
     */
    public function store(Request $request)
    {
        $request->validate([
            'email' => 'required|email|unique:users,email|max:255',
            'password' => 'required|string|min:8',
            'full_name' => 'required|string|max:255',
            'role' => 'required|string|in:super_admin,admin,teacher,staff,student,parent',
            'organization_id' => 'nullable|uuid|exists:organizations,id',
            'default_school_id' => 'nullable|uuid',
            'phone' => 'nullable|string|max:20',
        ]);

        $user = $request->user();
        $currentProfile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$currentProfile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $isSuperAdmin = $currentProfile->role === 'super_admin';
        $isAdmin = $currentProfile->role === 'admin';

        if (!$isSuperAdmin && !$isAdmin) {
            return response()->json(['error' => 'Insufficient permissions to create users'], 403);
        }

        // Get accessible organization IDs
        // Super admin with null org_id can see all organizations
        // Others see only their organization
        $orgIds = [];
        if ($isSuperAdmin && $currentProfile->organization_id === null) {
            $orgIds = DB::table('organizations')
                ->whereNull('deleted_at')
                ->pluck('id')
                ->toArray();
        } else {
            if ($currentProfile->organization_id) {
                $orgIds = [$currentProfile->organization_id];
            }
        }

        // Determine organization_id
        $organizationId = $request->organization_id ?? $currentProfile->organization_id ?? null;
        
        // If no organization_id provided, get default "ناظم" organization (cached)
        if (!$organizationId) {
            $organizationId = OrganizationHelper::getDefaultOrganizationId();
            
            if (!$organizationId && !empty($orgIds)) {
                $organizationId = $orgIds[0];
            }
        }
        
        if ($organizationId && !in_array($organizationId, $orgIds) && !$isSuperAdmin) {
            return response()->json(['error' => 'Cannot create user for a non-accessible organization'], 403);
        }

        // Determine default_school_id
        $defaultSchoolId = $request->default_school_id ?? null;
        if (!$defaultSchoolId && $organizationId) {
            $school = SchoolBranding::where('organization_id', $organizationId)
                ->whereNull('deleted_at')
                ->orderBy('created_at', 'asc')
                ->first();
            if ($school) {
                $defaultSchoolId = $school->id;
            }
        }

        // Create user in auth.users table
        $userId = (string) Str::uuid();
        $encryptedPassword = Hash::make($request->password);

        DB::table('users')->insert([
            'id' => $userId,
            'email' => $request->email,
            'encrypted_password' => $encryptedPassword,
            'email_confirmed_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Create profile
        DB::table('profiles')->insert([
            'id' => $userId,
            'email' => $request->email,
            'full_name' => $request->full_name,
            'role' => $request->role,
            'organization_id' => $organizationId,
            'default_school_id' => $defaultSchoolId,
            'phone' => $request->phone ?? null,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $createdProfile = DB::table('profiles')->where('id', $userId)->first();

        // Return in UserProfile format
        return response()->json([
            'id' => $userId,
            'name' => $createdProfile->full_name || $createdProfile->email || '',
            'email' => $createdProfile->email || '',
            'role' => (string)($createdProfile->role ?? ''),
            'organization_id' => $createdProfile->organization_id,
            'default_school_id' => $createdProfile->default_school_id ?? null,
            'phone' => $createdProfile->phone,
            'avatar' => $createdProfile->avatar_url ?? null,
            'is_active' => $createdProfile->is_active ?? true,
            'created_at' => $createdProfile->created_at,
            'updated_at' => $createdProfile->updated_at,
        ], 201);
    }

    /**
     * Update the specified user
     */
    public function update(Request $request, string $id)
    {
        $request->validate([
            'full_name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|max:255',
            'role' => 'sometimes|string|in:super_admin,admin,teacher,staff,student,parent',
            'organization_id' => 'nullable|uuid|exists:organizations,id',
            'default_school_id' => 'nullable|uuid',
            'phone' => 'nullable|string|max:20',
            'is_active' => 'sometimes|boolean',
        ]);

        $user = $request->user();
        $currentProfile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$currentProfile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $isSuperAdmin = $currentProfile->role === 'super_admin';
        $isAdmin = $currentProfile->role === 'admin';

        if (!$isSuperAdmin && !$isAdmin) {
            return response()->json(['error' => 'Insufficient permissions to update users'], 403);
        }

        // Get target user's profile
        $targetProfile = DB::table('profiles')->where('id', $id)->first();

        if (!$targetProfile) {
            return response()->json(['error' => 'User not found'], 404);
        }

        // Get accessible organization IDs
        // Super admin with null org_id can see all organizations
        // Others see only their organization
        $orgIds = [];
        if ($isSuperAdmin && $currentProfile->organization_id === null) {
            $orgIds = DB::table('organizations')
                ->whereNull('deleted_at')
                ->pluck('id')
                ->toArray();
        } else {
            if ($currentProfile->organization_id) {
                $orgIds = [$currentProfile->organization_id];
            }
        }

        // Check organization access for admins
        if (!in_array($targetProfile->organization_id, $orgIds)) {
            return response()->json(['error' => 'Cannot update user from different organization'], 403);
        }

        // Build update data
        $updateData = [];
        if ($request->has('full_name')) $updateData['full_name'] = $request->full_name;
        if ($request->has('phone')) $updateData['phone'] = $request->phone;
        if ($request->has('role')) $updateData['role'] = $request->role;
        if ($request->has('is_active')) $updateData['is_active'] = $request->is_active;
        if ($request->has('default_school_id')) $updateData['default_school_id'] = $request->default_school_id;

        // Only super admin can change organization_id
        if ($request->has('organization_id') && $isSuperAdmin) {
            if ($request->organization_id && !in_array($request->organization_id, $orgIds)) {
                return response()->json(['error' => 'Cannot assign user to a non-accessible organization'], 403);
            }
            $updateData['organization_id'] = $request->organization_id;
        }

        // Update email in both users and profiles tables
        if ($request->has('email')) {
            // Check if email is already taken by another user
            $existingUser = DB::table('users')
                ->where('email', $request->email)
                ->where('id', '!=', $id)
                ->first();

            if ($existingUser) {
                return response()->json(['error' => 'Email already taken'], 422);
            }

            DB::table('users')
                ->where('id', $id)
                ->update(['email' => $request->email, 'updated_at' => now()]);

            $updateData['email'] = $request->email;
        }

        $updateData['updated_at'] = now();

        DB::table('profiles')
            ->where('id', $id)
            ->update($updateData);

        $updatedProfile = DB::table('profiles')->where('id', $id)->first();

        return response()->json([
            'id' => $id,
            'profile' => $updatedProfile,
        ]);
    }

    /**
     * Remove the specified user
     */
    public function destroy(string $id)
    {
        $user = request()->user();
        $currentProfile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$currentProfile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $isSuperAdmin = $currentProfile->role === 'super_admin';
        $isAdmin = $currentProfile->role === 'admin';

        if (!$isSuperAdmin && !$isAdmin) {
            return response()->json(['error' => 'Insufficient permissions to delete users'], 403);
        }

        // Get target user's profile
        $targetProfile = DB::table('profiles')->where('id', $id)->first();

        if (!$targetProfile) {
            return response()->json(['error' => 'User not found'], 404);
        }

        // Prevent deleting super admin
        if ($targetProfile->role === 'super_admin') {
            return response()->json(['error' => 'Cannot delete super admin user'], 403);
        }

        // Check organization access for admins
        if ($isAdmin && !$isSuperAdmin) {
            if ($targetProfile->organization_id !== $currentProfile->organization_id) {
                return response()->json(['error' => 'Cannot delete user from different organization'], 403);
            }
        }

        // Delete user (cascade will delete profile)
        DB::table('users')->where('id', $id)->delete();
        DB::table('profiles')->where('id', $id)->delete();

        return response()->json(['message' => 'User deleted successfully']);
    }

    /**
     * Reset user password
     */
    public function resetPassword(Request $request, string $id)
    {
        $request->validate([
            'password' => 'required|string|min:8',
        ]);

        $user = $request->user();
        $currentProfile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$currentProfile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $isSuperAdmin = $currentProfile->role === 'super_admin';
        $isAdmin = $currentProfile->role === 'admin';

        if (!$isSuperAdmin && !$isAdmin) {
            return response()->json(['error' => 'Insufficient permissions to reset passwords'], 403);
        }

        // Check if user exists
        $targetUser = DB::table('users')->where('id', $id)->first();
        if (!$targetUser) {
            return response()->json(['error' => 'User not found'], 404);
        }

        // Update password
        $encryptedPassword = Hash::make($request->password);
        DB::table('users')
            ->where('id', $id)
            ->update([
                'encrypted_password' => $encryptedPassword,
                'updated_at' => now(),
            ]);

        return response()->json(['message' => 'Password reset successfully']);
    }
}

