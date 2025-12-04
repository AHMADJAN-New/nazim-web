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
     * Get user permissions via roles
     * Returns permissions scoped to the user's organization:
     * - Permissions from roles assigned to the user in their organization
     *
     * This method queries directly via roles instead of using model_has_permissions
     * Flow: user -> model_has_roles -> role_has_permissions -> permissions
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

        $organizationId = $profile->organization_id;

        // Get permissions via roles (bypasses model_has_permissions)
        // Flow: model_has_roles -> role_has_permissions -> permissions
        $permissions = DB::table('permissions')
            ->join('role_has_permissions', 'permissions.id', '=', 'role_has_permissions.permission_id')
            ->join('model_has_roles', function ($join) use ($user) {
                $join->on('role_has_permissions.role_id', '=', 'model_has_roles.role_id')
                     ->where('model_has_roles.model_id', '=', $user->id)
                     ->where('model_has_roles.model_type', '=', 'App\\Models\\User');
            })
            ->where(function ($query) use ($organizationId) {
                // Match organization context in role assignments
                $query->where('model_has_roles.organization_id', $organizationId);
            })
            ->where(function ($query) use ($organizationId) {
                // Match organization context in role-permission assignments
                $query->where('role_has_permissions.organization_id', $organizationId)
                      ->orWhereNull('role_has_permissions.organization_id');
            })
            ->where(function ($query) use ($organizationId) {
                // Get global permissions OR organization-specific permissions
                $query->whereNull('permissions.organization_id')
                      ->orWhere('permissions.organization_id', $organizationId);
            })
            ->distinct()
            ->pluck('permissions.name')
            ->toArray();

        // Sort permissions alphabetically
        sort($permissions);

        return response()->json([
            'permissions' => $permissions
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
