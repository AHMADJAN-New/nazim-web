<?php

namespace App\Http\Controllers;

use App\Models\Permission;
use App\Models\PermissionGroup;
use App\Models\PermissionGroupItem;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PermissionController extends Controller
{
    /**
     * Display a listing of permissions
     * CRITICAL: Returns ONLY organization-specific permissions for the user's organization
     * Global permissions are NOT visible to organization users
     * Each organization has its own isolated set of permissions
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'User profile not found'], 404);
        }

        // CRITICAL: Only show organization-specific permissions
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $query = Permission::query();

        // ONLY show permissions for user's organization (no global permissions)
        $query->where('organization_id', $profile->organization_id);

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
        // CRITICAL: Only use organization-specific permissions (no global permissions)
        // Flow: model_has_roles -> role_has_permissions -> permissions
        $rolePermissions = DB::table('permissions')
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
                // CRITICAL: Only organization permissions in role-permission assignments
                $query->where('role_has_permissions.organization_id', $organizationId);
            })
            ->where(function ($query) use ($organizationId) {
                // CRITICAL: Only organization-specific permissions (no global)
                $query->where('permissions.organization_id', $organizationId);
            })
            ->distinct()
            ->pluck('permissions.name')
            ->toArray();

        // Get direct user permissions from model_has_permissions table
        // CRITICAL: Only organization-specific permissions
        $tableNames = config('permission.table_names');
        $columnNames = config('permission.column_names');
        $modelHasPermissionsTable = $tableNames['model_has_permissions'] ?? 'model_has_permissions';
        $modelMorphKey = $columnNames['model_morph_key'] ?? 'model_id';

        $directPermissions = DB::table($modelHasPermissionsTable)
            ->join('permissions', $modelHasPermissionsTable . '.permission_id', '=', 'permissions.id')
            ->where($modelHasPermissionsTable . '.' . $modelMorphKey, $user->id)
            ->where($modelHasPermissionsTable . '.model_type', 'App\\Models\\User')
            ->where($modelHasPermissionsTable . '.organization_id', $organizationId)
            ->where('permissions.organization_id', $organizationId) // CRITICAL: Only org permissions
            ->distinct()
            ->pluck('permissions.name')
            ->toArray();

        // Combine role and direct permissions (direct permissions override role permissions)
        $permissions = array_unique(array_merge($rolePermissions, $directPermissions));

        // Sort permissions alphabetically
        sort($permissions);

        return response()->json([
            'permissions' => $permissions
        ]);
    }

    /**
     * Get platform admin permissions (GLOBAL, not organization-scoped)
     * 
     * CRITICAL: This endpoint is for platform admins who are NOT tied to organizations.
     * It returns global permissions (organization_id = NULL), specifically subscription.admin
     * 
     * This endpoint does NOT require organization_id - platform admins can access it
     */
    public function platformAdminPermissions(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        // CRITICAL: Use platform org UUID as team context for global permissions
        // Global permissions are stored with platform org UUID (00000000-0000-0000-0000-000000000000)
        // in model_has_permissions, but the permission itself has organization_id = NULL
        $platformOrgId = '00000000-0000-0000-0000-000000000000';
        setPermissionsTeamId($platformOrgId);

        // Check if user has subscription.admin permission (GLOBAL)
        try {
            if (!$user->hasPermissionTo('subscription.admin')) {
                return response()->json([
                    'error' => 'Access Denied',
                    'message' => 'This endpoint is only accessible to platform administrators.',
                ], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Platform admin permission check failed: " . $e->getMessage());
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'This endpoint is only accessible to platform administrators.',
            ], 403);
        }

        // Get global permissions (organization_id = NULL) assigned to this user
        $tableNames = config('permission.table_names');
        $columnNames = config('permission.column_names');
        $modelHasPermissionsTable = $tableNames['model_has_permissions'] ?? 'model_has_permissions';
        $modelMorphKey = $columnNames['model_morph_key'] ?? 'model_id';

        // Get direct global permissions
        // CRITICAL: Global permissions are stored with platform org UUID (00000000-0000-0000-0000-000000000000)
        // in model_has_permissions, but the permission itself has organization_id = NULL
        $globalPermissions = DB::table($modelHasPermissionsTable)
            ->join('permissions', $modelHasPermissionsTable . '.permission_id', '=', 'permissions.id')
            ->where($modelHasPermissionsTable . '.' . $modelMorphKey, $user->id)
            ->where($modelHasPermissionsTable . '.model_type', 'App\\Models\\User')
            ->where(function ($query) use ($modelHasPermissionsTable, $platformOrgId) {
                // Check for platform org UUID OR NULL (covers both cases)
                $query->where($modelHasPermissionsTable . '.organization_id', $platformOrgId)
                      ->orWhereNull($modelHasPermissionsTable . '.organization_id');
            })
            ->whereNull('permissions.organization_id') // CRITICAL: Only global permissions (permission itself is NULL)
            ->distinct()
            ->pluck('permissions.name')
            ->toArray();

        // Ensure subscription.admin is included (user already verified to have it above)
        $permissions = array_unique(array_merge($globalPermissions, ['subscription.admin']));

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

    /**
     * Store a newly created permission
     */
    public function store(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('permissions.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for permissions.create: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'resource' => 'required|string|max:255',
            'action' => 'required|string|max:255',
            'description' => 'nullable|string|max:500',
        ]);

        // Check if permission already exists for this organization
        $exists = Permission::where('name', $request->name)
            ->where('guard_name', 'web')
            ->where('organization_id', $profile->organization_id)
            ->exists();

        if ($exists) {
            return response()->json(['error' => 'Permission already exists for this organization'], 422);
        }

        $permission = Permission::create([
            'name' => $request->name,
            'guard_name' => 'web',
            'organization_id' => $profile->organization_id,
            'resource' => $request->resource,
            'action' => $request->action,
            'description' => $request->description,
        ]);

        return response()->json($permission, 201);
    }

    /**
     * Update the specified permission
     */
    public function update(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('permissions.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for permissions.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $permission = Permission::find($id);

        if (!$permission) {
            return response()->json(['error' => 'Permission not found'], 404);
        }

        // Users can only update their organization's permissions
        if ($permission->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'Cannot update permission from different organization'], 403);
        }

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'resource' => 'sometimes|string|max:255',
            'action' => 'sometimes|string|max:255',
            'description' => 'nullable|string|max:500',
        ]);

        $permission->update($request->only(['name', 'resource', 'action', 'description']));

        return response()->json($permission);
    }

    /**
     * Remove the specified permission
     */
    public function destroy(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('permissions.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for permissions.delete: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $permission = Permission::find($id);

        if (!$permission) {
            return response()->json(['error' => 'Permission not found'], 404);
        }

        // Users can only delete their organization's permissions
        if ($permission->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'Cannot delete permission from different organization'], 403);
        }

        // Don't allow deleting global permissions
        if ($permission->organization_id === null) {
            return response()->json(['error' => 'Cannot delete global permissions'], 403);
        }

        $permission->delete();

        return response()->json(['message' => 'Permission deleted successfully']);
    }

    /**
     * Get permissions for a specific role
     */
    public function rolePermissions(Request $request, string $roleName)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('permissions.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for permissions.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $role = Role::where('name', $roleName)
            ->where('organization_id', $profile->organization_id)
            ->where('guard_name', 'web')
            ->first();

        if (!$role) {
            return response()->json(['error' => 'Role not found'], 404);
        }

        setPermissionsTeamId($profile->organization_id);
        $permissions = $role->permissions;

        return response()->json([
            'role' => $roleName,
            'permissions' => $permissions->pluck('name')->toArray()
        ]);
    }

    /**
     * Assign permission to role
     */
    public function assignPermissionToRole(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('permissions.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for permissions.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $request->validate([
            'role' => 'required|string',
            'permission_id' => 'required|integer|exists:permissions,id',
        ]);

        $role = Role::where('name', $request->role)
            ->where('organization_id', $profile->organization_id)
            ->where('guard_name', 'web')
            ->first();

        if (!$role) {
            return response()->json(['error' => 'Role not found'], 404);
        }

        $permission = Permission::find($request->permission_id);

        if (!$permission) {
            return response()->json(['error' => 'Permission not found'], 404);
        }

        // CRITICAL: Only allow assigning organization-specific permissions (no global permissions)
        if ($permission->organization_id === null) {
            return response()->json(['error' => 'Cannot assign global permissions. Only organization-specific permissions can be assigned.'], 403);
        }

        // CRITICAL: Permission must belong to user's organization
        if ($permission->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'Cannot assign permission from different organization'], 403);
        }

        // CRITICAL: Manually insert into role_has_permissions with organization_id
        // Spatie's givePermissionTo() doesn't set organization_id, so we need to do it manually
        $tableNames = config('permission.table_names');
        $roleHasPermissionsTable = $tableNames['role_has_permissions'] ?? 'role_has_permissions';

        // Check if permission is already assigned
        $exists = DB::table($roleHasPermissionsTable)
            ->where('role_id', $role->id)
            ->where('permission_id', $permission->id)
            ->where('organization_id', $profile->organization_id)
            ->exists();

        if (!$exists) {
            DB::table($roleHasPermissionsTable)->insert([
                'role_id' => $role->id,
                'permission_id' => $permission->id,
                'organization_id' => $profile->organization_id,
            ]);
        }

        return response()->json(['message' => 'Permission assigned to role successfully']);
    }

    /**
     * Remove permission from role
     */
    public function removePermissionFromRole(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('permissions.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for permissions.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $request->validate([
            'role' => 'required|string',
            'permission_id' => 'required|integer|exists:permissions,id',
        ]);

        $role = Role::where('name', $request->role)
            ->where('organization_id', $profile->organization_id)
            ->where('guard_name', 'web')
            ->first();

        if (!$role) {
            return response()->json(['error' => 'Role not found'], 404);
        }

        $permission = Permission::find($request->permission_id);

        if (!$permission) {
            return response()->json(['error' => 'Permission not found'], 404);
        }

        // CRITICAL: Manually delete from role_has_permissions with organization_id
        // Spatie's revokePermissionTo() doesn't filter by organization_id, so we need to do it manually
        $tableNames = config('permission.table_names');
        $roleHasPermissionsTable = $tableNames['role_has_permissions'] ?? 'role_has_permissions';

        DB::table($roleHasPermissionsTable)
            ->where('role_id', $role->id)
            ->where('permission_id', $permission->id)
            ->where('organization_id', $profile->organization_id)
            ->delete();

        return response()->json(['message' => 'Permission removed from role successfully']);
    }

    /**
     * Get permissions for a specific user
     */
    public function userPermissionsForUser(Request $request, string $userId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('permissions.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for permissions.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $targetUser = User::find($userId);
        if (!$targetUser) {
            return response()->json(['error' => 'User not found'], 404);
        }

        $targetProfile = DB::table('profiles')->where('id', $userId)->first();
        if (!$targetProfile || $targetProfile->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'Cannot access user from different organization'], 403);
        }

        setPermissionsTeamId($profile->organization_id);

        // Get role-based permissions (via model_has_roles -> role_has_permissions)
        $rolePermissions = DB::table('permissions')
            ->join('role_has_permissions', 'permissions.id', '=', 'role_has_permissions.permission_id')
            ->join('model_has_roles', function ($join) use ($targetUser, $profile) {
                $join->on('role_has_permissions.role_id', '=', 'model_has_roles.role_id')
                     ->where('model_has_roles.model_id', '=', $targetUser->id)
                     ->where('model_has_roles.model_type', '=', 'App\\Models\\User')
                     ->where('model_has_roles.organization_id', '=', $profile->organization_id);
            })
            ->where(function ($query) use ($profile) {
                $query->where('role_has_permissions.organization_id', $profile->organization_id)
                      ->orWhereNull('role_has_permissions.organization_id');
            })
            ->where(function ($query) use ($profile) {
                $query->whereNull('permissions.organization_id')
                      ->orWhere('permissions.organization_id', $profile->organization_id);
            })
            ->select('permissions.id', 'permissions.name', 'permissions.resource', 'permissions.action')
            ->distinct()
            ->get();

        // Get direct user permissions (from model_has_permissions table)
        $tableNames = config('permission.table_names');
        $columnNames = config('permission.column_names');
        $modelHasPermissionsTable = $tableNames['model_has_permissions'] ?? 'model_has_permissions';
        $modelMorphKey = $columnNames['model_morph_key'] ?? 'model_id';

        $directPermissions = DB::table($modelHasPermissionsTable)
            ->join('permissions', $modelHasPermissionsTable . '.permission_id', '=', 'permissions.id')
            ->where($modelHasPermissionsTable . '.' . $modelMorphKey, $targetUser->id)
            ->where($modelHasPermissionsTable . '.model_type', 'App\\Models\\User')
            ->where($modelHasPermissionsTable . '.organization_id', $profile->organization_id)
            ->where(function ($query) use ($profile) {
                $query->whereNull('permissions.organization_id')
                      ->orWhere('permissions.organization_id', $profile->organization_id);
            })
            ->select('permissions.id', 'permissions.name', 'permissions.resource', 'permissions.action')
            ->distinct()
            ->get();

        // Combine role and direct permissions for all permissions
        $allPermissionsIds = $rolePermissions->pluck('id')->merge($directPermissions->pluck('id'))->unique();
        $allPermissions = $rolePermissions->merge($directPermissions)->unique('id');

        return response()->json([
            'user_id' => $userId,
            'all_permissions' => $allPermissions->pluck('name')->toArray(),
            'direct_permissions' => $directPermissions->map(function ($perm) {
                return [
                    'id' => $perm->id,
                    'name' => $perm->name,
                ];
            })->toArray(),
            'role_permissions' => $rolePermissions->map(function ($perm) {
                return [
                    'id' => $perm->id,
                    'name' => $perm->name,
                ];
            })->toArray(),
        ]);
    }

    /**
     * Assign role to user
     */
    public function assignRoleToUser(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('permissions.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for permissions.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $request->validate([
            'user_id' => 'required|uuid|exists:users,id',
            'role' => 'required|string',
        ]);

        $targetUser = User::find($request->user_id);
        if (!$targetUser) {
            return response()->json(['error' => 'User not found'], 404);
        }

        $targetProfile = DB::table('profiles')->where('id', $request->user_id)->first();
        if (!$targetProfile || $targetProfile->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'Cannot assign role to user from different organization'], 403);
        }

        $role = Role::where('name', $request->role)
            ->where('organization_id', $profile->organization_id)
            ->where('guard_name', 'web')
            ->first();

        if (!$role) {
            return response()->json(['error' => 'Role not found'], 404);
        }

        setPermissionsTeamId($profile->organization_id);
        $targetUser->assignRole($role);

        // Clear permission cache so user's permissions are refreshed immediately
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        return response()->json(['message' => 'Role assigned to user successfully']);
    }

    /**
     * Remove role from user
     */
    public function removeRoleFromUser(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('permissions.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for permissions.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $request->validate([
            'user_id' => 'required|uuid|exists:users,id',
            'role' => 'required|string',
        ]);

        $targetUser = User::find($request->user_id);
        if (!$targetUser) {
            return response()->json(['error' => 'User not found'], 404);
        }

        $targetProfile = DB::table('profiles')->where('id', $request->user_id)->first();
        if (!$targetProfile || $targetProfile->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'Cannot remove role from user in different organization'], 403);
        }

        $role = Role::where('name', $request->role)
            ->where('organization_id', $profile->organization_id)
            ->where('guard_name', 'web')
            ->first();

        if (!$role) {
            return response()->json(['error' => 'Role not found'], 404);
        }

        setPermissionsTeamId($profile->organization_id);
        $targetUser->removeRole($role);

        // Clear permission cache so user's permissions are refreshed immediately
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        return response()->json(['message' => 'Role removed from user successfully']);
    }

    /**
     * Assign direct permission to user
     */
    public function assignPermissionToUser(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('permissions.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for permissions.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $request->validate([
            'user_id' => 'required|uuid|exists:users,id',
            'permission_id' => 'required|integer|exists:permissions,id',
        ]);

        $targetUser = User::find($request->user_id);
        if (!$targetUser) {
            return response()->json(['error' => 'User not found'], 404);
        }

        $targetProfile = DB::table('profiles')->where('id', $request->user_id)->first();
        if (!$targetProfile || $targetProfile->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'Cannot assign permission to user in different organization'], 403);
        }

        $permission = Permission::find($request->permission_id);
        if (!$permission) {
            return response()->json(['error' => 'Permission not found'], 404);
        }

        // CRITICAL: Only allow assigning organization-specific permissions (no global permissions)
        if ($permission->organization_id === null) {
            return response()->json(['error' => 'Cannot assign global permissions. Only organization-specific permissions can be assigned.'], 403);
        }

        // CRITICAL: Permission must belong to user's organization
        if ($permission->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'Cannot assign permission from different organization'], 403);
        }

        // Use direct database insert for team-scoped permissions
        // Spatie's givePermissionTo() has issues with teams feature, so we insert directly
        $tableNames = config('permission.table_names');
        $columnNames = config('permission.column_names');

        $modelHasPermissionsTable = $tableNames['model_has_permissions'] ?? 'model_has_permissions';
        $modelMorphKey = $columnNames['model_morph_key'] ?? 'model_id';

        // Check if permission already exists (avoid duplicates)
        $exists = DB::table($modelHasPermissionsTable)
            ->where('permission_id', $permission->id)
            ->where($modelMorphKey, $targetUser->id)
            ->where('model_type', get_class($targetUser))
            ->where('organization_id', $profile->organization_id)
            ->exists();

        if (!$exists) {
            DB::table($modelHasPermissionsTable)->insert([
                'permission_id' => $permission->id,
                $modelMorphKey => $targetUser->id,
                'model_type' => get_class($targetUser),
                'organization_id' => $profile->organization_id,
            ]);
        }

        return response()->json(['message' => 'Permission assigned to user successfully']);
    }

    /**
     * Remove direct permission from user (soft delete)
     */
    public function removePermissionFromUser(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('permissions.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for permissions.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $request->validate([
            'user_id' => 'required|uuid|exists:users,id',
            'permission_id' => 'required|integer|exists:permissions,id',
        ]);

        $targetUser = User::find($request->user_id);
        if (!$targetUser) {
            return response()->json(['error' => 'User not found'], 404);
        }

        $targetProfile = DB::table('profiles')->where('id', $request->user_id)->first();
        if (!$targetProfile || $targetProfile->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'Cannot remove permission from user in different organization'], 403);
        }

        $permission = Permission::find($request->permission_id);
        if (!$permission) {
            return response()->json(['error' => 'Permission not found'], 404);
        }

        // CRITICAL: Only allow removing organization-specific permissions
        if ($permission->organization_id === null) {
            return response()->json(['error' => 'Cannot remove global permissions. Only organization-specific permissions can be removed.'], 403);
        }

        // CRITICAL: Permission must belong to user's organization
        if ($permission->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'Cannot remove permission from different organization'], 403);
        }

        // Use direct database delete (team-scoped permissions)
        // Spatie's revokePermissionTo() has issues with teams feature, so we delete directly
        // Note: model_has_permissions table doesn't have deleted_at, so we use hard delete
        $tableNames = config('permission.table_names');
        $columnNames = config('permission.column_names');

        $modelHasPermissionsTable = $tableNames['model_has_permissions'] ?? 'model_has_permissions';
        $modelMorphKey = $columnNames['model_morph_key'] ?? 'model_id';

        // Hard delete the permission assignment
        DB::table($modelHasPermissionsTable)
            ->where('permission_id', $permission->id)
            ->where($modelMorphKey, $targetUser->id)
            ->where('model_type', get_class($targetUser))
            ->where('organization_id', $profile->organization_id)
            ->delete();

        return response()->json(['message' => 'Permission removed from user successfully']);
    }

    /**
     * Get roles assigned to a specific user
     */
    public function userRoles(Request $request, string $userId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('permissions.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for permissions.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $targetUser = User::find($userId);
        if (!$targetUser) {
            return response()->json(['error' => 'User not found'], 404);
        }

        $targetProfile = DB::table('profiles')->where('id', $userId)->first();
        if (!$targetProfile || $targetProfile->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'Cannot access user from different organization'], 403);
        }

        setPermissionsTeamId($profile->organization_id);
        $userRoles = $targetUser->getRoleNames();

        return response()->json([
            'user_id' => $userId,
            'roles' => $userRoles->toArray(),
        ]);
    }

    /**
     * Get all permissions from all organizations (Platform Admin)
     * Used for creating global permission groups
     */
    public function platformAdminAllPermissions(Request $request)
    {
        $this->enforcePlatformAdmin($request);

        // Platform admins can see ALL permissions (both global and organization-scoped)
        $permissions = Permission::orderBy('organization_id')
            ->orderBy('resource')
            ->orderBy('action')
            ->get();

        return response()->json($permissions);
    }

    /**
     * Get permissions for an organization (Platform Admin)
     * Platform admins can view permissions for any organization
     */
    public function platformAdminOrganizationPermissions(Request $request, string $organizationId)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        // Check subscription.admin permission (GLOBAL)
        try {
            // CRITICAL: Use platform org UUID as team context for global permissions
            $platformOrgId = '00000000-0000-0000-0000-000000000000';
            setPermissionsTeamId($platformOrgId);
            if (!$user->hasPermissionTo('subscription.admin')) {
                return response()->json([
                    'error' => 'Access Denied',
                    'message' => 'This endpoint is only accessible to platform administrators.',
                ], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subscription.admin in platformAdminOrganizationPermissions: " . $e->getMessage());
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'This endpoint is only accessible to platform administrators.',
            ], 403);
        }

        // Verify organization exists
        $organization = DB::table('organizations')
            ->where('id', $organizationId)
            ->whereNull('deleted_at')
            ->first();

        if (!$organization) {
            return response()->json(['error' => 'Organization not found'], 404);
        }

        // Get organization-specific permissions
        $permissions = Permission::where('organization_id', $organizationId)
            ->orderBy('resource')
            ->orderBy('action')
            ->get();

        // Get roles and their permissions for this organization (same format as regular endpoint)
        $roles = DB::table('roles')
            ->where('organization_id', $organizationId)
            ->where('guard_name', 'web')
            ->get();

        $rolesWithPermissions = [];
        foreach ($roles as $role) {
            $rolePerms = DB::table('role_has_permissions')
                ->join('permissions', 'role_has_permissions.permission_id', '=', 'permissions.id')
                ->where('role_has_permissions.role_id', $role->id)
                ->where('role_has_permissions.organization_id', $organizationId)
                ->pluck('permissions.name')
                ->toArray();

            $rolesWithPermissions[] = [
                'id' => $role->id,
                'name' => $role->name,
                'description' => $role->description ?? null,
                'permissions' => $rolePerms,
                'permissions_count' => count($rolePerms),
            ];
        }

        // Return same format as regular permissions endpoint for consistency
        return response()->json([
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'permissions' => $permissions,
            'roles' => $rolesWithPermissions,
            'total_permissions' => $permissions->count(),
        ]);
    }

    /**
     * Get permissions for a specific user (Platform Admin)
     * Platform admins can view permissions for users in any organization
     */
    public function platformAdminUserPermissions(Request $request, string $userId)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        // Check subscription.admin permission (GLOBAL)
        try {
            // CRITICAL: Use platform org UUID as team context for global permissions
            $platformOrgId = '00000000-0000-0000-0000-000000000000';
            setPermissionsTeamId($platformOrgId);
            if (!$user->hasPermissionTo('subscription.admin')) {
                return response()->json([
                    'error' => 'Access Denied',
                    'message' => 'This endpoint is only accessible to platform administrators.',
                ], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subscription.admin in platformAdminUserPermissions: " . $e->getMessage());
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'This endpoint is only accessible to platform administrators.',
            ], 403);
        }

        $targetUser = User::find($userId);
        if (!$targetUser) {
            return response()->json(['error' => 'User not found'], 404);
        }

        $targetProfile = DB::table('profiles')->where('id', $userId)->first();
        if (!$targetProfile || !$targetProfile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 404);
        }

        // Set team context to target user's organization
        setPermissionsTeamId($targetProfile->organization_id);

        // Get role-based permissions (via model_has_roles -> role_has_permissions)
        // CRITICAL: Use pgsql connection explicitly for UUID handling
        $rolePermissions = DB::connection('pgsql')
            ->table('permissions')
            ->join('role_has_permissions', 'permissions.id', '=', 'role_has_permissions.permission_id')
            ->join('model_has_roles', function ($join) use ($targetUser, $targetProfile) {
                $join->on('role_has_permissions.role_id', '=', 'model_has_roles.role_id')
                     ->where('model_has_roles.model_id', '=', $targetUser->id)
                     ->where('model_has_roles.model_type', '=', 'App\\Models\\User')
                     ->where('model_has_roles.organization_id', '=', $targetProfile->organization_id);
            })
            ->where('role_has_permissions.organization_id', $targetProfile->organization_id)
            ->where('permissions.organization_id', $targetProfile->organization_id)
            ->select('permissions.id', 'permissions.name', 'permissions.resource', 'permissions.action')
            ->distinct()
            ->get();

        // Get direct user permissions (from model_has_permissions table)
        $tableNames = config('permission.table_names');
        $columnNames = config('permission.column_names');
        $modelHasPermissionsTable = $tableNames['model_has_permissions'] ?? 'model_has_permissions';
        $modelMorphKey = $columnNames['model_morph_key'] ?? 'model_id';

        // CRITICAL: Use pgsql connection explicitly for UUID handling
        // NOTE: model_has_permissions table does NOT have deleted_at column (no soft deletes)
        $directPermissions = DB::connection('pgsql')
            ->table($modelHasPermissionsTable)
            ->join('permissions', $modelHasPermissionsTable . '.permission_id', '=', 'permissions.id')
            ->where($modelHasPermissionsTable . '.' . $modelMorphKey, $targetUser->id)
            ->where($modelHasPermissionsTable . '.model_type', 'App\\Models\\User')
            ->where($modelHasPermissionsTable . '.organization_id', $targetProfile->organization_id)
            ->where('permissions.organization_id', $targetProfile->organization_id)
            ->select('permissions.id', 'permissions.name', 'permissions.resource', 'permissions.action')
            ->distinct()
            ->get();

        // Combine role and direct permissions
        $allPermissions = $rolePermissions->merge($directPermissions)->unique('id');

        return response()->json([
            'user_id' => $userId,
            'organization_id' => $targetProfile->organization_id,
            'all_permissions' => $allPermissions->pluck('name')->toArray(),
            'direct_permissions' => $directPermissions->map(function ($perm) {
                return [
                    'id' => $perm->id,
                    'name' => $perm->name,
                ];
            })->toArray(),
            'role_permissions' => $rolePermissions->map(function ($perm) {
                return [
                    'id' => $perm->id,
                    'name' => $perm->name,
                ];
            })->toArray(),
        ]);
    }

    /**
     * Assign permission to user (Platform Admin)
     * Platform admins can assign permissions to users in any organization
     */
    public function platformAdminAssignPermissionToUser(Request $request, string $userId)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        // Check subscription.admin permission (GLOBAL)
        try {
            // CRITICAL: Use platform org UUID as team context for global permissions
            $platformOrgId = '00000000-0000-0000-0000-000000000000';
            setPermissionsTeamId($platformOrgId);
            if (!$user->hasPermissionTo('subscription.admin')) {
                return response()->json([
                    'error' => 'Access Denied',
                    'message' => 'This endpoint is only accessible to platform administrators.',
                ], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subscription.admin in platformAdminAssignPermissionToUser: " . $e->getMessage());
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'This endpoint is only accessible to platform administrators.',
            ], 403);
        }

        $request->validate([
            'permission_id' => 'required|integer|exists:permissions,id',
        ]);

        $targetUser = User::find($userId);
        if (!$targetUser) {
            return response()->json(['error' => 'User not found'], 404);
        }

        $targetProfile = DB::table('profiles')->where('id', $userId)->first();
        if (!$targetProfile || !$targetProfile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 404);
        }

        $permission = Permission::find($request->permission_id);
        if (!$permission) {
            return response()->json(['error' => 'Permission not found'], 404);
        }

        // CRITICAL: Permission must belong to target user's organization
        if ($permission->organization_id !== $targetProfile->organization_id) {
            return response()->json(['error' => 'Cannot assign permission from different organization'], 403);
        }

        // Set team context to target user's organization
        setPermissionsTeamId($targetProfile->organization_id);

        // Check if permission is already assigned (and not soft-deleted)
        $tableNames = config('permission.table_names');
        $columnNames = config('permission.column_names');
        $modelHasPermissionsTable = $tableNames['model_has_permissions'] ?? 'model_has_permissions';
        $modelMorphKey = $columnNames['model_morph_key'] ?? 'model_id';

        // CRITICAL: Use pgsql connection explicitly for UUID handling
        // NOTE: model_has_permissions table does NOT have deleted_at column (no soft deletes)
        $existing = DB::connection('pgsql')
            ->table($modelHasPermissionsTable)
            ->where($modelMorphKey, $targetUser->id)
            ->where('permission_id', $permission->id)
            ->where('model_type', 'App\\Models\\User')
            ->where('organization_id', $targetProfile->organization_id)
            ->first();

        if ($existing) {
            return response()->json(['message' => 'Permission already assigned to user']);
        }

        // CRITICAL: model_has_permissions table does NOT have deleted_at column
        // If permission already exists, just return success
        // Otherwise, assign it using Spatie and update organization_id
        if (!$existing) {
            // Assign permission using Spatie
            $targetUser->givePermissionTo($permission);

            // CRITICAL: Manually update organization_id in model_has_permissions
            // Use pgsql connection for UUID handling
            DB::connection('pgsql')
                ->table($modelHasPermissionsTable)
                ->where($modelMorphKey, $targetUser->id)
                ->where('permission_id', $permission->id)
                ->where('model_type', 'App\\Models\\User')
                ->update(['organization_id' => $targetProfile->organization_id]);
        }

        // Clear permission cache
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        return response()->json(['message' => 'Permission assigned to user successfully']);
    }

    /**
     * Remove permission from user (Platform Admin)
     * Platform admins can remove permissions from users in any organization
     */
    public function platformAdminRemovePermissionFromUser(Request $request, string $userId)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        // Check subscription.admin permission (GLOBAL)
        try {
            // CRITICAL: Use platform org UUID as team context for global permissions
            $platformOrgId = '00000000-0000-0000-0000-000000000000';
            setPermissionsTeamId($platformOrgId);
            if (!$user->hasPermissionTo('subscription.admin')) {
                return response()->json([
                    'error' => 'Access Denied',
                    'message' => 'This endpoint is only accessible to platform administrators.',
                ], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subscription.admin in platformAdminRemovePermissionFromUser: " . $e->getMessage());
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'This endpoint is only accessible to platform administrators.',
            ], 403);
        }

        $request->validate([
            'permission_id' => 'required|integer|exists:permissions,id',
        ]);

        $targetUser = User::find($userId);
        if (!$targetUser) {
            return response()->json(['error' => 'User not found'], 404);
        }

        $targetProfile = DB::table('profiles')->where('id', $userId)->first();
        if (!$targetProfile || !$targetProfile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 404);
        }

        $permission = Permission::find($request->permission_id);
        if (!$permission) {
            return response()->json(['error' => 'Permission not found'], 404);
        }

        // CRITICAL: Permission must belong to target user's organization
        if ($permission->organization_id !== $targetProfile->organization_id) {
            return response()->json(['error' => 'Cannot remove permission from different organization'], 403);
        }

        // Set team context to target user's organization
        setPermissionsTeamId($targetProfile->organization_id);

        // CRITICAL: model_has_permissions table does NOT have deleted_at column
        // We need to use hard delete (DELETE) instead of soft delete
        $tableNames = config('permission.table_names');
        $columnNames = config('permission.column_names');
        $modelHasPermissionsTable = $tableNames['model_has_permissions'] ?? 'model_has_permissions';
        $modelMorphKey = $columnNames['model_morph_key'] ?? 'model_id';

        // CRITICAL: Use pgsql connection explicitly for UUID handling
        // Hard delete the permission assignment
        DB::connection('pgsql')
            ->table($modelHasPermissionsTable)
            ->where($modelMorphKey, $targetUser->id)
            ->where('permission_id', $permission->id)
            ->where('model_type', 'App\\Models\\User')
            ->where('organization_id', $targetProfile->organization_id)
            ->delete();

        // Clear permission cache
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        return response()->json(['message' => 'Permission removed from user successfully']);
    }

    /**
     * ============================================
     * PERMISSION GROUPS (Platform Admin)
     * ============================================
     */

    /**
     * List all permission groups (Platform Admin)
     * Groups are global and can be assigned to any organization
     */
    public function platformAdminListPermissionGroups(Request $request)
    {
        $this->enforcePlatformAdmin($request);

        $groups = PermissionGroup::whereNull('deleted_at')
            ->whereNull('organization_id') // Only global groups
            ->with('permissions')
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $groups]);
    }

    /**
     * Create permission group (Platform Admin)
     * Groups are global and can be assigned to any organization
     * Permission IDs can be from any organization (we store permission names, not IDs)
     */
    public function platformAdminCreatePermissionGroup(Request $request)
    {
        $this->enforcePlatformAdmin($request);

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:permission_groups,name',
            'description' => 'nullable|string|max:1000',
            'permission_ids' => 'required|array',
            'permission_ids.*' => 'required|integer|exists:permissions,id',
        ]);

        DB::beginTransaction();
        try {
            // Create global group (organization_id = NULL)
            $group = PermissionGroup::create([
                'organization_id' => null, // Global group
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
            ]);

            // Attach permissions (can be from any organization)
            // We store permission IDs, but when assigning to users, we'll find by name within their organization
            foreach ($validated['permission_ids'] as $permissionId) {
                PermissionGroupItem::create([
                    'permission_group_id' => $group->id,
                    'permission_id' => $permissionId,
                ]);
            }

            DB::commit();

            $group->load('permissions');

            return response()->json([
                'data' => $group,
                'message' => 'Permission group created successfully',
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to create permission group: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to create permission group: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Update permission group (Platform Admin)
     * Groups are global
     */
    public function platformAdminUpdatePermissionGroup(Request $request, string $groupId)
    {
        $this->enforcePlatformAdmin($request);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'permission_ids' => 'sometimes|required|array',
            'permission_ids.*' => 'required|integer|exists:permissions,id',
        ]);

        $group = PermissionGroup::where('id', $groupId)
            ->whereNull('organization_id') // Only global groups
            ->whereNull('deleted_at')
            ->first();

        if (!$group) {
            return response()->json(['error' => 'Permission group not found'], 404);
        }

        DB::beginTransaction();
        try {
            if (isset($validated['name'])) {
                // Check unique name (excluding current group)
                $existing = PermissionGroup::where('name', $validated['name'])
                    ->where('id', '!=', $groupId)
                    ->whereNull('deleted_at')
                    ->first();
                
                if ($existing) {
                    DB::rollBack();
                    return response()->json(['error' => 'A permission group with this name already exists'], 400);
                }
                
                $group->name = $validated['name'];
            }
            if (isset($validated['description'])) {
                $group->description = $validated['description'];
            }
            $group->save();

            // Update permissions if provided
            if (isset($validated['permission_ids'])) {
                // Remove existing permissions
                PermissionGroupItem::where('permission_group_id', $group->id)->delete();

                // Add new permissions (can be from any organization)
                foreach ($validated['permission_ids'] as $permissionId) {
                    PermissionGroupItem::create([
                        'permission_group_id' => $group->id,
                        'permission_id' => $permissionId,
                    ]);
                }
            }

            DB::commit();

            $group->load('permissions');

            return response()->json([
                'data' => $group,
                'message' => 'Permission group updated successfully',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to update permission group: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to update permission group: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Delete permission group (Platform Admin)
     * Groups are global
     */
    public function platformAdminDeletePermissionGroup(Request $request, string $groupId)
    {
        $this->enforcePlatformAdmin($request);

        $group = PermissionGroup::where('id', $groupId)
            ->whereNull('organization_id') // Only global groups
            ->whereNull('deleted_at')
            ->first();

        if (!$group) {
            return response()->json(['error' => 'Permission group not found'], 404);
        }

        $group->delete();

        return response()->noContent();
    }

    /**
     * Assign permission group to user (Platform Admin)
     * Assigns all permissions in the group to the user at once
     */
    public function platformAdminAssignPermissionGroupToUser(Request $request, string $userId)
    {
        $this->enforcePlatformAdmin($request);

        $validated = $request->validate([
            'permission_group_id' => 'required|uuid|exists:permission_groups,id',
        ]);

        $targetUser = User::find($userId);
        if (!$targetUser) {
            return response()->json(['error' => 'User not found'], 404);
        }

        $targetProfile = DB::table('profiles')->where('id', $userId)->first();
        if (!$targetProfile || !$targetProfile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 400);
        }

        // Get global group (organization_id = NULL)
        $group = PermissionGroup::where('id', $validated['permission_group_id'])
            ->whereNull('organization_id') // Global group
            ->whereNull('deleted_at')
            ->with('permissions')
            ->first();

        if (!$group) {
            return response()->json(['error' => 'Permission group not found'], 404);
        }

        // Get permission names from the global group
        $permissionNames = $group->permissions->pluck('name')->toArray();

        // Find these permissions within the user's organization
        $orgPermissions = Permission::whereIn('name', $permissionNames)
            ->where('organization_id', $targetProfile->organization_id)
            ->get();

        if ($orgPermissions->isEmpty()) {
            return response()->json(['error' => 'No matching permissions found in user\'s organization'], 404);
        }

        // Set team context to target user's organization
        setPermissionsTeamId($targetProfile->organization_id);

        $tableNames = config('permission.table_names');
        $columnNames = config('permission.column_names');
        $modelHasPermissionsTable = $tableNames['model_has_permissions'] ?? 'model_has_permissions';
        $modelMorphKey = $columnNames['model_morph_key'] ?? 'model_id';

        DB::beginTransaction();
        try {
            $assignedCount = 0;
            $skippedCount = 0;
            $notFoundCount = 0;

            foreach ($orgPermissions as $permission) {
                // Check if permission already assigned
                $existing = DB::connection('pgsql')
                    ->table($modelHasPermissionsTable)
                    ->where($modelMorphKey, $targetUser->id)
                    ->where('permission_id', $permission->id)
                    ->where('model_type', 'App\\Models\\User')
                    ->where('organization_id', $targetProfile->organization_id)
                    ->first();

                if (!$existing) {
                    // Assign permission using Spatie
                    $targetUser->givePermissionTo($permission);

                    // Manually update organization_id in model_has_permissions
                    DB::connection('pgsql')
                        ->table($modelHasPermissionsTable)
                        ->where($modelMorphKey, $targetUser->id)
                        ->where('permission_id', $permission->id)
                        ->where('model_type', 'App\\Models\\User')
                        ->update(['organization_id' => $targetProfile->organization_id]);

                    $assignedCount++;
                } else {
                    $skippedCount++;
                }
            }

            // Count permissions in group that weren't found in user's organization
            $notFoundCount = count($permissionNames) - $orgPermissions->count();

            DB::commit();

            // Clear permission cache
            app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

            return response()->json([
                'message' => 'Permission group assigned successfully',
                'assigned' => $assignedCount,
                'skipped' => $skippedCount,
                'not_found' => $notFoundCount,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to assign permission group to user: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to assign permission group'], 500);
        }
    }

    /**
     * Remove permission group from user (Platform Admin)
     * Removes all permissions in the group from the user
     */
    public function platformAdminRemovePermissionGroupFromUser(Request $request, string $userId)
    {
        $this->enforcePlatformAdmin($request);

        $validated = $request->validate([
            'permission_group_id' => 'required|uuid|exists:permission_groups,id',
        ]);

        $targetUser = User::find($userId);
        if (!$targetUser) {
            return response()->json(['error' => 'User not found'], 404);
        }

        $targetProfile = DB::table('profiles')->where('id', $userId)->first();
        if (!$targetProfile || !$targetProfile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 400);
        }

        // Get global group (organization_id = NULL)
        $group = PermissionGroup::where('id', $validated['permission_group_id'])
            ->whereNull('organization_id') // Global group
            ->whereNull('deleted_at')
            ->with('permissions')
            ->first();

        if (!$group) {
            return response()->json(['error' => 'Permission group not found'], 404);
        }

        // Get permission names from the global group
        $permissionNames = $group->permissions->pluck('name')->toArray();

        // Find these permissions within the user's organization
        $orgPermissions = Permission::whereIn('name', $permissionNames)
            ->where('organization_id', $targetProfile->organization_id)
            ->get();

        if ($orgPermissions->isEmpty()) {
            return response()->json(['error' => 'No matching permissions found in user\'s organization'], 404);
        }

        // Set team context to target user's organization
        setPermissionsTeamId($targetProfile->organization_id);

        $tableNames = config('permission.table_names');
        $columnNames = config('permission.column_names');
        $modelHasPermissionsTable = $tableNames['model_has_permissions'] ?? 'model_has_permissions';
        $modelMorphKey = $columnNames['model_morph_key'] ?? 'model_id';

        DB::beginTransaction();
        try {
            $removedCount = 0;

            foreach ($orgPermissions as $permission) {
                // Remove permission (hard delete from model_has_permissions)
                $deleted = DB::connection('pgsql')
                    ->table($modelHasPermissionsTable)
                    ->where($modelMorphKey, $targetUser->id)
                    ->where('permission_id', $permission->id)
                    ->where('model_type', 'App\\Models\\User')
                    ->where('organization_id', $targetProfile->organization_id)
                    ->delete();

                if ($deleted) {
                    $removedCount++;
                }
            }

            DB::commit();

            // Clear permission cache
            app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

            return response()->json([
                'message' => 'Permission group removed successfully',
                'removed' => $removedCount,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to remove permission group from user: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to remove permission group'], 500);
        }
    }

    /**
     * Helper method to enforce platform admin access
     */
    private function enforcePlatformAdmin(Request $request): void
    {
        $user = $request->user();

        if (!$user) {
            abort(401, 'Unauthenticated');
        }

        // CRITICAL: Use platform org UUID as team context for global permissions
        // Global permissions are stored with platform org UUID (00000000-0000-0000-0000-000000000000)
        // in model_has_permissions, but the permission itself has organization_id = NULL
        $platformOrgId = '00000000-0000-0000-0000-000000000000';
        setPermissionsTeamId($platformOrgId);

        try {
            if (!$user->hasPermissionTo('subscription.admin')) {
                abort(403, 'This action is only available to platform administrators');
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subscription.admin: " . $e->getMessage());
            abort(403, 'This action is only available to platform administrators');
        }
    }
}
