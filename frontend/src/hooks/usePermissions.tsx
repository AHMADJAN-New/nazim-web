import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { permissionsApi, rolesApi } from '@/lib/api/client';
import { useAuth } from './useAuth';
import { showToast } from '@/lib/toast';
import { useAccessibleOrganizations } from './useAccessibleOrganizations';
import type * as PermissionApi from '@/types/api/permission';
import type { Permission, RolePermission } from '@/types/domain/permission';
import { mapPermissionApiToDomain, mapRolePermissionApiToDomain } from '@/mappers/permissionMapper';

// Re-export domain types for convenience
export type { Permission, RolePermission } from '@/types/domain/permission';

export const usePermissions = () => {
  const { profile } = useAuth();

  return useQuery<Permission[]>({
    queryKey: ['permissions', profile?.organization_id],
    queryFn: async () => {
      // Laravel API automatically filters permissions by user's organization
      // Returns: global permissions (organization_id = NULL) + user's org permissions
      const apiPermissions = await permissionsApi.list();
      // Laravel API returns permissions sorted, but ensure they're sorted by resource and action
      const sorted = (apiPermissions as PermissionApi.Permission[]).sort((a, b) => {
        if (a.resource !== b.resource) {
          return a.resource.localeCompare(b.resource);
        }
        return a.action.localeCompare(b.action);
      });
      // Map API → Domain
      return sorted.map(mapPermissionApiToDomain);
    },
    enabled: !!profile?.organization_id, // Only fetch if user has organization
    staleTime: 30 * 60 * 1000, // 30 minutes - permissions don't change often
    gcTime: 60 * 60 * 1000, // 1 hour
  });
};

export const useRolePermissions = (role: string) => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['role-permissions', role, profile?.organization_id],
    queryFn: async () => {
      if (!role || !profile?.organization_id) return { role, permissions: [] };

      const response = await permissionsApi.rolePermissions(role);
      return response as { role: string; permissions: string[] };
    },
    enabled: !!role && !!profile?.organization_id,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
};

export interface Role {
  id: string;
  name: string;
  description: string | null;
  organization_id: string | null;
  guard_name?: string;
  created_at?: string;
  updated_at?: string;
}

export const useRoles = () => {
  const { profile } = useAuth();

  return useQuery<Role[]>({
    queryKey: ['roles', profile?.organization_id],
    queryFn: async () => {
      const roles = await rolesApi.list();
      return (roles as Role[]);
    },
    enabled: !!profile && !!profile.organization_id,
    staleTime: 30 * 60 * 1000, // 30 minutes - roles don't change often
    gcTime: 60 * 60 * 1000, // 1 hour
  });
};

export const useCreateRole = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const canCreateRoles = useHasPermission('roles.create');

  return useMutation({
    mutationFn: async (roleData: {
      name: string;
      description?: string | null;
      guard_name?: string;
    }) => {
      if (!profile) {
        throw new Error('User not authenticated');
      }

      if (!canCreateRoles) {
        throw new Error('You do not have permission to create roles');
      }

      if (!profile.organization_id) {
        throw new Error('User must be assigned to an organization');
      }

      return await rolesApi.create({
        name: roleData.name,
        description: roleData.description || null,
        guard_name: roleData.guard_name || 'web',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      showToast.success('toast.roleCreated');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.roleCreateFailed');
    },
  });
};

export const useUpdateRole = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const canUpdateRoles = useHasPermission('roles.update');

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      name?: string;
      description?: string | null;
    }) => {
      if (!profile) {
        throw new Error('User not authenticated');
      }

      if (!canUpdateRoles) {
        throw new Error('You do not have permission to update roles');
      }

      if (!profile.organization_id) {
        throw new Error('User must be assigned to an organization');
      }

      return await rolesApi.update(id, {
        name: updates.name,
        description: updates.description,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      showToast.success('toast.roleUpdated');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.roleUpdateFailed');
    },
  });
};

export const useDeleteRole = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const canDeleteRoles = useHasPermission('roles.delete');

  return useMutation({
    mutationFn: async (roleId: string) => {
      if (!profile) {
        throw new Error('User not authenticated');
      }

      if (!canDeleteRoles) {
        throw new Error('You do not have permission to delete roles');
      }

      if (!profile.organization_id) {
        throw new Error('User must be assigned to an organization');
      }

      // Delete role via Laravel API (soft delete)
      // Backend handles all validation: permission check, organization access, and "in use" check
      await rolesApi.delete(roleId);
    },
    onSuccess: async () => {
      // CRITICAL: Use both invalidateQueries AND refetchQueries for immediate UI updates
      await queryClient.invalidateQueries({ queryKey: ['roles'] });
      await queryClient.refetchQueries({ queryKey: ['roles'] });
      showToast.success('toast.roleDeleted');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.roleDeleteFailed');
    },
  });
};

export const useUserPermissions = () => {
  const { profile, user } = useAuth();
  const { orgIds, isLoading: orgsLoading } = useAccessibleOrganizations();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['user-permissions', profile?.organization_id, user?.id, orgIds.join(',')],
    queryFn: async () => {
      // Require organization_id - backend enforces this
      if (!profile?.organization_id || !user?.id) return [];

      // Check if we have bootstrap data cached (from useAuth) - this is the primary source
      const bootstrapData = queryClient.getQueryData(['app', 'bootstrap']) as any;
      if (bootstrapData?.permissions && Array.isArray(bootstrapData.permissions)) {
        // Cache it with the full query key for future use
        queryClient.setQueryData(['user-permissions', profile.organization_id, user.id, orgIds.join(',')], bootstrapData.permissions);
        return bootstrapData.permissions.sort();
      }

      // Check if permissions are already cached (from bootstrap or previous API call)
      const cachedPermissions = queryClient.getQueryData(['user-permissions', profile.organization_id, user.id, orgIds.join(',')]);
      if (cachedPermissions && Array.isArray(cachedPermissions)) {
        return cachedPermissions;
      }
      
      // Also check without orgIds (bootstrap might have cached it this way)
      const cachedWithoutOrgIds = queryClient.getQueryData(['user-permissions', profile.organization_id, user.id, '']);
      if (cachedWithoutOrgIds && Array.isArray(cachedWithoutOrgIds)) {
        return cachedWithoutOrgIds;
      }

      if (orgsLoading) return [];

      // Fallback to API call if bootstrap data not available
      const response = await permissionsApi.userPermissions();
      const permissions = (response as { permissions?: string[] })?.permissions || [];
      return permissions.sort();
    },
    enabled: !!profile?.organization_id && !!user && !orgsLoading,
    staleTime: 60 * 60 * 1000, // 1 hour - permissions don't change often
    gcTime: 24 * 60 * 60 * 1000, // 24 hours - keep in cache longer
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch if we have bootstrap data
    refetchOnReconnect: false, // Don't refetch on reconnect
    refetchInterval: false, // Never auto-refetch
    placeholderData: [],
  });
};

export const useHasPermission = (permissionName: string): boolean | undefined => {
  const { profile } = useAuth();
  const { data: permissions, isLoading } = useUserPermissions();

  // Check permissions for all users
  // Use cached permissions even during background refetch
  // Only return undefined if we truly have no cached data AND we're loading
  if (permissions && permissions.length > 0) {
    // We have cached permissions, use them even if refetching in background
    return permissions.includes(permissionName);
  }

  // If loading and no cached data, return undefined (PermissionGuard will show loading)
  // This only happens on initial load, not on tab switches (cache should be available)
  if (isLoading && !permissions) {
    return undefined; // Indicates loading state
  }

  // No permissions found (not loading, but no permissions)
  return false;
};

export const useAssignPermissionToRole = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const canUpdatePermissions = useHasPermission('permissions.update');

  return useMutation({
    mutationFn: async ({ role, permissionId }: { role: string; permissionId: string }) => {
      if (!profile) {
        throw new Error('User not authenticated');
      }

      if (!canUpdatePermissions) {
        throw new Error('You do not have permission to assign permissions');
      }

      if (!profile.organization_id) {
        throw new Error('User must be assigned to an organization');
      }

      return await permissionsApi.assignPermissionToRole({
        role,
        permission_id: permissionId,
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions', variables.role] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      showToast.success(`Permission assigned to ${variables.role} role`);
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.permissionAssignFailed');
    },
  });
};

export const useRemovePermissionFromRole = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const canUpdatePermissions = useHasPermission('permissions.update');

  return useMutation({
    mutationFn: async ({ role, permissionId }: { role: string; permissionId: string }) => {
      if (!profile) {
        throw new Error('User not authenticated');
      }

      if (!canUpdatePermissions) {
        throw new Error('You do not have permission to remove permissions');
      }

      if (!profile.organization_id) {
        throw new Error('User must be assigned to an organization');
      }

      return await permissionsApi.removePermissionFromRole({
        role,
        permission_id: permissionId,
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions', variables.role] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      showToast.success(`Permission removed from ${variables.role} role`);
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.permissionRemoveFailed');
    },
  });
};

export const useCreatePermission = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const canCreatePermissions = useHasPermission('permissions.create');

  return useMutation({
    mutationFn: async (permissionData: {
      name: string;
      resource: string;
      action: string;
      description?: string | null;
    }) => {
      if (!profile) {
        throw new Error('User not authenticated');
      }

      if (!canCreatePermissions) {
        throw new Error('You do not have permission to create permissions');
      }

      if (!profile.organization_id) {
        throw new Error('User must be assigned to an organization');
      }

      return await permissionsApi.create({
        name: permissionData.name,
        resource: permissionData.resource,
        action: permissionData.action,
        description: permissionData.description || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      showToast.success('toast.permissionCreated');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.permissionCreateFailed');
    },
  });
};

export const useUpdatePermission = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const canUpdatePermissions = useHasPermission('permissions.update');

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      name?: string;
      resource?: string;
      action?: string;
      description?: string | null;
    }) => {
      if (!profile) {
        throw new Error('User not authenticated');
      }

      if (!canUpdatePermissions) {
        throw new Error('You do not have permission to update permissions');
      }

      if (!profile.organization_id) {
        throw new Error('User must be assigned to an organization');
      }

      return await permissionsApi.update(id, {
        name: updates.name,
        resource: updates.resource,
        action: updates.action,
        description: updates.description,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      showToast.success('toast.permissionUpdated');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.permissionUpdateFailed');
    },
  });
};

export const useDeletePermission = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const canUpdatePermissions = useHasPermission('permissions.update');

  return useMutation({
    mutationFn: async (permissionId: string) => {
      if (!profile) {
        throw new Error('User not authenticated');
      }

      if (!canUpdatePermissions) {
        throw new Error('You do not have permission to delete permissions');
      }

      if (!profile.organization_id) {
        throw new Error('User must be assigned to an organization');
      }

      return await permissionsApi.delete(permissionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      showToast.success('toast.permissionDeleted');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.permissionDeleteFailed');
    },
  });
};

// ============================================================================
// User Permissions Hooks (for managing per-user permissions)
// ============================================================================

export const useUserPermissionsForUser = (userId: string) => {
  const { profile } = useAuth();
  const { data: allPermissions } = usePermissions();

  return useQuery({
    queryKey: ['user-permissions-for-user', userId, profile?.organization_id],
    queryFn: async () => {
      if (!userId) {
        return { userPermissions: [], rolePermissions: [], allPermissions: [] };
      }

      if (!profile?.organization_id) {
        return { userPermissions: [], rolePermissions: [], allPermissions: [] };
      }

      const response = await permissionsApi.userPermissionsForUser(userId);
      const data = response as {
        user_id: string;
        all_permissions: string[];
        direct_permissions: Array<{ id: string; name: string }>;
        role_permissions: Array<{ id: string; name: string }>;
      };

      // Map permission objects from backend response to component format
      const directPerms = (data.direct_permissions || []).map(permData => {
        const perm = allPermissions?.find(p => p.id === permData.id || p.name === permData.name);
        return {
          permission_id: permData.id, // Use ID directly from backend
          permission: perm || null,
        };
      });

      const rolePerms = (data.role_permissions || []).map(permData => {
        const perm = allPermissions?.find(p => p.id === permData.id || p.name === permData.name);
        return {
          permission_id: permData.id, // Use ID directly from backend
          permission: perm || null,
        };
      });

      return {
        userPermissions: directPerms,
        rolePermissions: rolePerms,
        allPermissions: data.all_permissions || [],
      };
    },
    enabled: !!userId && !!profile && !!allPermissions,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useAssignPermissionToUser = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const canUpdatePermissions = useHasPermission('permissions.update');

  return useMutation({
    mutationFn: async ({ userId, permissionId }: { userId: string; permissionId: string }) => {
      if (!profile) {
        throw new Error('User not authenticated');
      }

      if (!canUpdatePermissions) {
        throw new Error('You do not have permission to assign user permissions');
      }

      if (!profile.organization_id) {
        throw new Error('User must be assigned to an organization');
      }

      // Validate permission ID is valid (permissions use integer IDs, not UUIDs)
      if (!permissionId || (typeof permissionId !== 'number' && typeof permissionId !== 'string')) {
        throw new Error('Invalid permission ID. Please refresh the page and try again.');
      }

      return await permissionsApi.assignPermissionToUser({
        user_id: userId,
        permission_id: permissionId,
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions-for-user', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      showToast.success('toast.permissionAssignedToUser');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.permissionAssignFailed');
    },
  });
};

export const useRemovePermissionFromUser = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const canUpdatePermissions = useHasPermission('permissions.update');

  return useMutation({
    mutationFn: async ({ userId, permissionId }: { userId: string; permissionId: string }) => {
      if (!profile) {
        throw new Error('User not authenticated');
      }

      if (!canUpdatePermissions) {
        throw new Error('You do not have permission to remove user permissions');
      }

      if (!profile.organization_id) {
        throw new Error('User must be assigned to an organization');
      }

      // Validate permission ID is valid (permissions use integer IDs, not UUIDs)
      if (!permissionId || (typeof permissionId !== 'number' && typeof permissionId !== 'string')) {
        throw new Error('Invalid permission ID. Please refresh the page and try again.');
      }

      return await permissionsApi.removePermissionFromUser({
        user_id: userId,
        permission_id: permissionId,
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions-for-user', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      showToast.success('toast.permissionRemovedFromUser');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.permissionRemoveFailed');
    },
  });
};

// ============================================================================
// User Role Management Hooks
// ============================================================================

export const useAssignRoleToUser = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const canUpdatePermissions = useHasPermission('permissions.update');

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      if (!profile) {
        throw new Error('User not authenticated');
      }

      if (!canUpdatePermissions) {
        throw new Error('You do not have permission to assign roles');
      }

      if (!profile.organization_id) {
        throw new Error('User must be assigned to an organization');
      }

      return await permissionsApi.assignRoleToUser({
        user_id: userId,
        role,
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions-for-user', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['user-roles', variables.userId] });
      showToast.success(`Role ${variables.role} assigned to user`);
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.roleAssignFailed');
    },
  });
};

export const useRemoveRoleFromUser = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const canUpdatePermissions = useHasPermission('permissions.update');

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      if (!profile) {
        throw new Error('User not authenticated');
      }

      if (!canUpdatePermissions) {
        throw new Error('You do not have permission to remove roles');
      }

      if (!profile.organization_id) {
        throw new Error('User must be assigned to an organization');
      }

      return await permissionsApi.removeRoleFromUser({
        user_id: userId,
        role,
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions-for-user', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['user-roles', variables.userId] });
      showToast.success(`Role ${variables.role} removed from user`);
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.roleRemoveFailed');
    },
  });
};

export const useUserRoles = (userId: string) => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['user-roles', userId, profile?.organization_id],
    queryFn: async () => {
      if (!userId || !profile?.organization_id) {
        return { user_id: userId, roles: [] };
      }

      const response = await permissionsApi.userRoles(userId);
      return response as { user_id: string; roles: string[] };
    },
    enabled: !!userId && !!profile?.organization_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
