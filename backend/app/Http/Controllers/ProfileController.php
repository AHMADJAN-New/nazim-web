<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProfileController extends Controller
{
    /**
     * Display a listing of profiles
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        $query = DB::table('profiles')
            ->whereNull('deleted_at')
            ->orderBy('created_at', 'desc');

        // Filter by organization
        // Super admin with null org_id sees all, others see only their org
        if ($profile->role !== 'super_admin' && $profile->organization_id !== null) {
            $query->where('organization_id', $profile->organization_id);
        }

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
        $profile = DB::table('profiles')
            ->where('id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (!$profile) {
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
            'role' => 'sometimes|string|in:super_admin,admin,teacher,staff,student,parent',
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
        $isAdmin = in_array($currentProfile->role, ['admin', 'super_admin']);
        $isSuperAdmin = $currentProfile->role === 'super_admin';

        // Users can update their own profile (limited fields)
        // Admins can update profiles in their organization
        // Super admins can update any profile
        if (!$isOwnProfile && !$isAdmin) {
            return response()->json(['error' => 'Insufficient permissions to update this profile'], 403);
        }

        // If updating another user's profile, check organization access
        if (!$isOwnProfile && !$isSuperAdmin) {
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
            
            // Only super admin can change organization_id
            if ($request->has('organization_id') && $isSuperAdmin) {
                $updateData['organization_id'] = $request->organization_id;
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
        DB::table('profiles')
            ->where('id', $id)
            ->update(['deleted_at' => now()]);

        return response()->json(['message' => 'Profile deleted successfully']);
    }
}
