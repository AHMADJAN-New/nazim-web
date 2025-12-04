<?php

namespace App\Http\Controllers;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

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

        // Get direct user permissions from model_has_permissions table
        $tableNames = config('permission.table_names');
        $columnNames = config('permission.column_names');
        $modelHasPermissionsTable = $tableNames['model_has_permissions'] ?? 'model_has_permissions';
        $modelMorphKey = $columnNames['model_morph_key'] ?? 'model_id';

        $directPermissions = DB::table($modelHasPermissionsTable)
            ->join('permissions', $modelHasPermissionsTable . '.permission_id', '=', 'permissions.id')
            ->where($modelHasPermissionsTable . '.' . $modelMorphKey, $user->id)
            ->where($modelHasPermissionsTable . '.model_type', 'App\\Models\\User')
            ->where($modelHasPermissionsTable . '.organization_id', $organizationId)
            ->where(function ($query) use ($organizationId) {
                $query->whereNull('permissions.organization_id')
                      ->orWhere('permissions.organization_id', $organizationId);
            })
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

        // Validate permission belongs to user's organization or is global
        if ($permission->organization_id !== null && $permission->organization_id !== $profile->organization_id) {
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

        // Validate permission belongs to user's organization or is global
        if ($permission->organization_id !== null && $permission->organization_id !== $profile->organization_id) {
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

        // Validate permission belongs to user's organization or is global
        if ($permission->organization_id !== null && $permission->organization_id !== $profile->organization_id) {
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
}
