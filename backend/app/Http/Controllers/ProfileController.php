<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ProfileController extends Controller
{
    /**
     * Display a listing of profiles
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('profiles.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for profiles.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $query = DB::table('profiles')
            ->whereNull('deleted_at')
            ->orderBy('created_at', 'desc');

        // Filter by organization (all users see only their org)
        $query->where('organization_id', $profile->organization_id);

        if ($request->has('organization_id')) {
            $query->where('organization_id', $request->organization_id);
        }

        $profiles = $query->get();

        return response()->json($profiles);
    }

    /**
     * Display the specified profile
     */
    public function show(string $id)
    {
        $user = request()->user();
        $currentProfile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$currentProfile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Require organization_id for all users
        if (!$currentProfile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('profiles.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for profiles.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $profile = DB::table('profiles')
            ->where('id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // All users can only view profiles in their organization
        if ($profile->organization_id !== $currentProfile->organization_id) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        return response()->json($profile);
    }

    /**
     * Get current user's profile
     */
    public function me(Request $request)
    {
        $profile = DB::table('profiles')
            ->where('id', $request->user()->id)
            ->first();

        return response()->json($profile);
    }

    /**
     * Update the specified profile
     */
    public function update(Request $request, string $id)
    {
        $request->validate([
            'full_name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|max:255',
            'phone' => 'nullable|string|max:20',
            'avatar_url' => 'nullable|url',
            'role' => 'sometimes|string|in:admin,teacher,staff,student,parent',
            'is_active' => 'sometimes|boolean',
            'organization_id' => 'nullable|uuid|exists:organizations,id',
            'default_school_id' => 'nullable|uuid|exists:schools,id',
        ]);

        $user = $request->user();
        $currentProfile = DB::table('profiles')->where('id', $user->id)->first();
        $targetProfile = DB::table('profiles')->where('id', $id)->first();

        if (!$targetProfile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Authorization checks
        $isOwnProfile = $id === $user->id;

        // Require organization_id for all users
        if (!$currentProfile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Users can update their own profile (limited fields)
        // Users with profiles.update permission can update profiles in their organization
        if (!$isOwnProfile) {
            try {
                if (!$user->hasPermissionTo('profiles.read')) {
                    return response()->json(['error' => 'Insufficient permissions to update this profile'], 403);
                }
            } catch (\Exception $e) {
                Log::warning("Permission check failed for profiles.update - denying access: " . $e->getMessage());
                return response()->json(['error' => 'Insufficient permissions to update this profile'], 403);
            }
        }

        // All users can only update profiles in their organization
        if (!$isOwnProfile) {
            if ($targetProfile->organization_id !== $currentProfile->organization_id) {
                return response()->json(['error' => 'Cannot update profile from different organization'], 403);
            }
        }

        // Build update data based on permissions
        $updateData = [];

        if ($isOwnProfile) {
            // Users can only update: full_name, phone, avatar_url
            if ($request->has('full_name')) $updateData['full_name'] = $request->full_name;
            if ($request->has('phone')) $updateData['phone'] = $request->phone;
            if ($request->has('avatar_url')) $updateData['avatar_url'] = $request->avatar_url;
        } else {
            // Admins can update: full_name, email, phone, avatar_url, role, is_active, organization_id
            if ($request->has('full_name')) $updateData['full_name'] = $request->full_name;
            if ($request->has('email')) $updateData['email'] = $request->email;
            if ($request->has('phone')) $updateData['phone'] = $request->phone;
            if ($request->has('avatar_url')) $updateData['avatar_url'] = $request->avatar_url;
            if ($request->has('role')) $updateData['role'] = $request->role;
            if ($request->has('is_active')) $updateData['is_active'] = $request->is_active;

            // Only users with profiles.update permission can change organization_id
            // (and only within their organization)
            if ($request->has('organization_id')) {
                try {
                    if ($user->hasPermissionTo('profiles.read')) {
                        // Validate organization_id is in user's organization
                        if ($request->organization_id !== $currentProfile->organization_id) {
                            return response()->json(['error' => 'Cannot assign profile to different organization'], 403);
                        }
                        $updateData['organization_id'] = $request->organization_id;
                    }
                } catch (\Exception $e) {
                    Log::warning("Permission check failed for profiles.update - denying organization_id change: " . $e->getMessage());
                }
            }
        }

        if ($request->has('default_school_id')) {
            $updateData['default_school_id'] = $request->default_school_id;
        }

        $updateData['updated_at'] = now();

        DB::table('profiles')
            ->where('id', $id)
            ->update($updateData);

        $updatedProfile = DB::table('profiles')->where('id', $id)->first();

        return response()->json($updatedProfile);
    }

    /**
     * Remove the specified profile (soft delete)
     */
    public function destroy(string $id)
    {
        $user = request()->user();
        $currentProfile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$currentProfile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Require organization_id for all users
        if (!$currentProfile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('profiles.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for profiles.delete: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $targetProfile = DB::table('profiles')
            ->where('id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (!$targetProfile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // All users can only delete profiles in their organization
        if ($targetProfile->organization_id !== $currentProfile->organization_id) {
            return response()->json(['error' => 'Cannot delete profile from different organization'], 403);
        }

        DB::table('profiles')
            ->where('id', $id)
            ->update(['deleted_at' => now()]);

        return response()->json(['message' => 'Profile deleted successfully']);
    }
}


