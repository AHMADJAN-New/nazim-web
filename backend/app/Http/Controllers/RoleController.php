<?php

namespace App\Http\Controllers;

use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RoleController extends Controller
{
    /**
     * Display a listing of roles
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
            if (!$user->hasPermissionTo('roles.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for roles.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Get roles for the user's organization (global + org-specific)
        $roles = Role::forOrganization($profile->organization_id)
            ->orderBy('name')
            ->get();

        return response()->json(
            $roles->map(function ($role) {
                return [
                    'id' => $role->id,
                    'name' => $role->name,
                    'description' => $role->description,
                    'organization_id' => $role->organization_id,
                    'guard_name' => $role->guard_name,
                    'created_at' => $role->created_at,
                    'updated_at' => $role->updated_at,
                ];
            })
        );
    }

    /**
     * Store a newly created role
     */
    public function store(Request $request)
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
            if (!$user->hasPermissionTo('roles.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for roles.create: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'guard_name' => 'nullable|string|max:255',
        ]);

        // Check if role with same name already exists for this organization
        $existingRole = Role::where('name', $request->name)
            ->where('organization_id', $profile->organization_id)
            ->where('guard_name', $request->guard_name ?? 'web')
            ->first();

        if ($existingRole) {
            return response()->json(['error' => 'Role with this name already exists for your organization'], 422);
        }

        // Create role
        $role = Role::create([
            'name' => $request->name,
            'description' => $request->description,
            'organization_id' => $profile->organization_id,
            'guard_name' => $request->guard_name ?? 'web',
        ]);

        return response()->json([
            'id' => $role->id,
            'name' => $role->name,
            'description' => $role->description,
            'organization_id' => $role->organization_id,
            'guard_name' => $role->guard_name,
            'created_at' => $role->created_at,
            'updated_at' => $role->updated_at,
        ], 201);
    }

    /**
     * Display the specified role
     */
    public function show(string $id)
    {
        $user = request()->user();
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
            if (!$user->hasPermissionTo('roles.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for roles.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $role = Role::forOrganization($profile->organization_id)
            ->where('id', $id)
            ->first();

        if (!$role) {
            return response()->json(['error' => 'Role not found'], 404);
        }

        return response()->json([
            'id' => $role->id,
            'name' => $role->name,
            'description' => $role->description,
            'organization_id' => $role->organization_id,
            'guard_name' => $role->guard_name,
            'created_at' => $role->created_at,
            'updated_at' => $role->updated_at,
        ]);
    }

    /**
     * Update the specified role
     */
    public function update(Request $request, string $id)
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
            if (!$user->hasPermissionTo('roles.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for roles.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string|max:1000',
        ]);

        $role = Role::forOrganization($profile->organization_id)
            ->where('id', $id)
            ->first();

        if (!$role) {
            return response()->json(['error' => 'Role not found'], 404);
        }

        // Check if name change would conflict with existing role
        if ($request->has('name') && $request->name !== $role->name) {
            $existingRole = Role::where('name', $request->name)
                ->where('organization_id', $profile->organization_id)
                ->where('guard_name', $role->guard_name)
                ->where('id', '!=', $id)
                ->first();

            if ($existingRole) {
                return response()->json(['error' => 'Role with this name already exists for your organization'], 422);
            }
        }

        // Update role
        if ($request->has('name')) {
            $role->name = $request->name;
        }
        if ($request->has('description')) {
            $role->description = $request->description;
        }
        $role->save();

        return response()->json([
            'id' => $role->id,
            'name' => $role->name,
            'description' => $role->description,
            'organization_id' => $role->organization_id,
            'guard_name' => $role->guard_name,
            'created_at' => $role->created_at,
            'updated_at' => $role->updated_at,
        ]);
    }

    /**
     * Remove the specified role
     */
    public function destroy(string $id)
    {
        $user = request()->user();
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
            if (!$user->hasPermissionTo('roles.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for roles.delete: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $role = Role::forOrganization($profile->organization_id)
            ->where('id', $id)
            ->first();

        if (!$role) {
            return response()->json(['error' => 'Role not found'], 404);
        }

        // Check if role is in use (has users assigned)
        $usersWithRole = DB::table('model_has_roles')
            ->where('role_id', $role->id)
            ->where('organization_id', $profile->organization_id)
            ->exists();

        if ($usersWithRole) {
            return response()->json(['error' => 'This role is assigned to users and cannot be deleted'], 409);
        }

        // Delete role
        $role->delete();

        // CRITICAL: Return 204 No Content with NO body (not JSON)
        return response()->noContent();
    }
}

