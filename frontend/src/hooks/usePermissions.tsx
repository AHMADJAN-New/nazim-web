import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { permissionsApi } from '@/lib/api/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
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
  return useQuery({
    queryKey: ['role-permissions', role],
    queryFn: async () => {
      // TODO: Implement Laravel API endpoint for role permissions
      // For now, return empty array - this functionality needs to be migrated to Laravel API
      throw new Error('Role permissions endpoint not yet implemented in Laravel API. Please use user permissions instead.');
    },
    enabled: false, // Disabled until Laravel API endpoint is available
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
};

export interface Role {
  name: string;
  description: string | null;
  organization_id: string | null;
}

export const useRoles = () => {
  const { profile } = useAuth();

  return useQuery<Role[]>({
    queryKey: ['roles', profile?.organization_id],
    queryFn: async () => {
      const response = await permissionsApi.roles();
      return (response as { roles: Role[] }).roles;
    },
    enabled: !!profile && !!profile.organization_id,
    staleTime: 30 * 60 * 1000, // 30 minutes - roles don't change often
    gcTime: 60 * 60 * 1000, // 1 hour
  });
};

export const useUserPermissions = () => {
  const { profile } = useAuth();
  const { orgIds, isLoading: orgsLoading } = useAccessibleOrganizations();

  return useQuery({
    queryKey: ['user-permissions', profile?.organization_id, profile?.id, orgIds.join(',')],
    queryFn: async () => {
      // Require organization_id - backend enforces this
      if (!profile?.organization_id) return [];

      if (orgsLoading) return [];
      if (orgIds.length === 0 && profile.organization_id === null) {
        // Super admin with no orgs might still have permissions
        // Allow the API call to proceed
      }

      // Use Laravel API - it handles all permission logic on backend
      const response = await permissionsApi.userPermissions();

      // Laravel returns { permissions: string[] }
      const permissions = (response as { permissions?: string[] })?.permissions || [];

      return permissions.sort();
    },
    // FIXED: Check organization_id instead of role (role column is deprecated)
    enabled: !!profile?.organization_id && !orgsLoading,
    staleTime: 60 * 60 * 1000, // 1 hour - permissions don't change often
    gcTime: 24 * 60 * 60 * 1000, // 24 hours - keep in cache longer
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: true, // FIXED: Must refetch on mount to get permissions!
    refetchOnReconnect: false, // Don't refetch on reconnect
    refetchInterval: false, // Never auto-refetch
    // Use placeholderData instead of initialData to allow fetching
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

      // TODO: Implement Laravel API endpoint for assigning permissions to roles
      throw new Error('Assign permission to role endpoint not yet implemented in Laravel API. Please use user permissions management instead.');
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions', variables.role] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      toast.success(`Permission assigned to ${variables.role} role`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to assign permission');
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

      // TODO: Implement Laravel API endpoint for removing permissions from roles
      throw new Error('Remove permission from role endpoint not yet implemented in Laravel API. Please use user permissions management instead.');
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions', variables.role] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      toast.success(`Permission removed from ${variables.role} role`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove permission');
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

      // TODO: Implement Laravel API endpoint for creating permissions
      throw new Error('Create permission endpoint not yet implemented in Laravel API.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      toast.success('Permission created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create permission');
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

      // TODO: Implement Laravel API endpoint for updating permissions
      throw new Error('Update permission endpoint not yet implemented in Laravel API.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      toast.success('Permission updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update permission');
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

      // TODO: Implement Laravel API endpoint for deleting permissions
      throw new Error('Delete permission endpoint not yet implemented in Laravel API.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      toast.success('Permission deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete permission');
    },
  });
};

// ============================================================================
// User Permissions Hooks (for managing per-user permissions)
// ============================================================================

export const useUserPermissionsForUser = (userId: string) => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['user-permissions-for-user', userId],
    queryFn: async () => {
      if (!userId) {
        return { userPermissions: [], rolePermissions: [] };
      }

      // TODO: Implement Laravel API endpoint for getting user permissions for a specific user
      // This should return both user-specific and role-based permissions
      throw new Error('Get user permissions for user endpoint not yet implemented in Laravel API.');
    },
    enabled: !!userId && !!profile,
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

      // TODO: Implement Laravel API endpoint for assigning permissions to users
      throw new Error('Assign permission to user endpoint not yet implemented in Laravel API.');
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions-for-user', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      toast.success('Permission assigned to user');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to assign permission to user');
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

      // TODO: Implement Laravel API endpoint for removing permissions from users
      throw new Error('Remove permission from user endpoint not yet implemented in Laravel API.');
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions-for-user', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      toast.success('Permission removed from user');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove permission from user');
    },
  });
};
