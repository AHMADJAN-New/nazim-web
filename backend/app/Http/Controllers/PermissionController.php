<?php

namespace App\Http\Controllers;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PermissionController extends Controller
{
    /**
     * Display a listing of permissions
     * Returns permissions available to the user's organization:
     * - Global permissions (organization_id = NULL) - available to all organizations
     * - Organization-specific permissions (organization_id = user's organization_id)
     * 
     * This allows admins to see and manage permissions for their organization,
     * enabling future feature where organizations can have restricted permissions
     * based on their purchase plan.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'User profile not found'], 404);
        }

        $query = Permission::query();

        // All users see global + their org's permissions
        if ($profile->organization_id) {
            $query->where(function ($q) use ($profile) {
                $q->whereNull('organization_id')
                  ->orWhere('organization_id', $profile->organization_id);
            });
        } else {
            // If no organization_id, only show global permissions
            $query->whereNull('organization_id');
        }

        $permissions = $query->orderBy('resource')->orderBy('action')->get();

        return response()->json($permissions);
    }

    /**
     * Get user permissions using Spatie
     * Returns permissions scoped to the user's organization:
     * - Permissions from roles assigned to the user in their organization
     * - Direct permissions assigned to the user in their organization
     * - Global permissions (organization_id = NULL) available to all organizations
     */
    public function userPermissions(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['permissions' => []]);
        }

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // CRITICAL: Set the organization context for Spatie teams feature
        // This tells Spatie to only get permissions for this organization
        $user->setPermissionsTeamId($profile->organization_id);

        // Get all permissions for the user (via roles and direct permissions)
        // Spatie will now only return permissions scoped to this organization
        $permissions = $user->getAllPermissions();
        
        // Additional filter to ensure we only return global permissions + user's org permissions
        $permissions = $permissions->filter(function ($permission) use ($profile) {
            return $permission->organization_id === null || $permission->organization_id === $profile->organization_id;
        });

        return response()->json([
            'permissions' => $permissions->pluck('name')->toArray()
        ]);
    }

    /**
     * Get available roles for the user's organization
     */
    public function roles(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['roles' => []]);
        }

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Get roles for the user's organization (global + org-specific)
        $roles = Role::forOrganization($profile->organization_id)
            ->orderBy('name')
            ->get();

        return response()->json([
            'roles' => $roles->map(function ($role) {
                return [
                    'name' => $role->name,
                    'description' => $role->description,
                    'organization_id' => $role->organization_id,
                ];
            })
        ]);
    }
}
