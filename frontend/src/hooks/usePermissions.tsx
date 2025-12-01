import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { permissionsApi } from '@/lib/api/client';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { useAccessibleOrganizations } from './useAccessibleOrganizations';

// Permission type matching Laravel API response
export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string | null;
  organization_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type PermissionInsert = Omit<Permission, 'id' | 'created_at' | 'updated_at'>;
export type PermissionUpdate = Partial<PermissionInsert>;

// Role permission type
export interface RolePermission {
  id: string;
  role: string;
  permission_id: string;
  organization_id?: string | null;
  created_at?: string;
  updated_at?: string;
  permission?: Permission;
}

export type RolePermissionInsert = Omit<RolePermission, 'id' | 'created_at' | 'updated_at' | 'permission'>;
export type RolePermissionUpdate = Partial<RolePermissionInsert>;

export const usePermissions = () => {
  return useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const permissions = await permissionsApi.list();
      // Laravel API returns permissions sorted, but ensure they're sorted by resource and action
      return (permissions as Permission[]).sort((a, b) => {
        if (a.resource !== b.resource) {
          return a.resource.localeCompare(b.resource);
        }
        return a.action.localeCompare(b.action);
      });
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - permissions don't change often
    gcTime: 60 * 60 * 1000, // 1 hour
  });
};

export const useRolePermissions = (role: string) => {
  return useQuery({
    queryKey: ['role-permissions', role],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_permissions')
        .select(`
          *,
          permission:permissions(*)
        `)
        .eq('role', role);

      if (error) {
        throw new Error(error.message);
      }

      return data as (RolePermission & { permission: Permission })[];
    },
    enabled: !!role,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
};

export const useUserPermissions = () => {
  const { profile } = useAuth();
  const { orgIds, isLoading: orgsLoading } = useAccessibleOrganizations();

  return useQuery({
    queryKey: ['user-permissions', profile?.role, profile?.id, orgIds.join(',')],
    queryFn: async () => {
      if (!profile?.role) return [];

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
    enabled: !!profile?.role && !orgsLoading,
    staleTime: 60 * 60 * 1000, // 1 hour - permissions don't change often
    gcTime: 24 * 60 * 60 * 1000, // 24 hours - keep in cache longer
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch on mount if data is fresh
    refetchOnReconnect: false, // Don't refetch on reconnect
    refetchInterval: false, // Never auto-refetch
    // CRITICAL: Always return an initial value to prevent undefined state
    placeholderData: (previousData) => previousData ?? [],
    // Ensure we always have a value, even if query is disabled
    initialData: [],
  });
};

export const useHasPermission = (permissionName: string): boolean | undefined => {
  const { profile } = useAuth();
  const { data: permissions, isLoading } = useUserPermissions();

  // Super admin always has all permissions (handled by backend)
  // Optimistically allow super admin during load since backend will enforce
  if (profile?.role === 'super_admin' && profile.organization_id === null) {
    // If permissions are loaded, check them
    if (permissions && permissions.length > 0) {
      return permissions.includes(permissionName);
    }
    // During loading or if no permissions yet, optimistically allow
    // Backend will enforce the actual permissions
    return true;
  }

  // For regular users: use cached permissions even during background refetch
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

      // Get the permission to validate organization scope
      const { data: permission, error: permError } = await (supabase as any)
        .from('permissions')
        .select('id, organization_id')
        .eq('id', permissionId)
        .single();

      if (permError || !permission) {
        throw new Error('Permission not found');
      }

      const perm = permission as { id: string; organization_id: string | null };

      // Determine organization scope
      const organizationId = perm.organization_id ?? profile.organization_id;

      const { data, error } = await supabase
        .from('role_permissions')
        .insert({
          role,
          permission_id: permissionId,
          organization_id: organizationId,
        })
        .select()
        .single();

      if (error) {
        // If it's a unique constraint violation, the permission is already assigned
        if (error.code === '23505') {
          return { role, permission_id: permissionId, organization_id: organizationId }; // Return existing assignment
        }
        throw new Error(error.message);
      }

      return data;
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

      // Build delete query with organization filter
      let deleteQuery: any = (supabase as any)
        .from('role_permissions')
        .delete()
        .eq('role', role)
        .eq('permission_id', permissionId);

      const { error } = await deleteQuery;

      if (error) {
        throw new Error(error.message);
      }

      return { role, permission_id: permissionId };
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

      const { data, error } = await (supabase as any)
        .from('permissions')
        .insert({
          ...permissionData,
          organization_id: profile.organization_id ?? null,
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as Permission;
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

      // Get current permission to validate organization scope
      const { data: currentPermission, error: fetchError } = await (supabase as any)
        .from('permissions')
        .select('id, organization_id')
        .eq('id', id)
        .single();

      if (fetchError || !currentPermission) {
        throw new Error('Permission not found');
      }

      const currentPerm = currentPermission as { id: string; organization_id: string | null };

      const { data, error } = await (supabase as any)
        .from('permissions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
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

      // Get current permission to validate organization scope
      const { data: currentPermission, error: fetchError } = await (supabase as any)
        .from('permissions')
        .select('id, organization_id')
        .eq('id', permissionId)
        .single();

      if (fetchError || !currentPermission) {
        throw new Error('Permission not found');
      }

      const currentPerm = currentPermission as { id: string; organization_id: string | null };

      const { error } = await (supabase as any)
        .from('permissions')
        .delete()
        .eq('id', permissionId);

      if (error) {
        throw new Error(error.message);
      }

      return { id: permissionId };
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

export interface UserPermission {
  id: string;
  user_id: string;
  permission_id: string;
  organization_id: string | null;
  created_at: string;
  deleted_at: string | null;
}

export const useUserPermissionsForUser = (userId: string) => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['user-permissions-for-user', userId],
    queryFn: async () => {
      if (!userId) {
        return { userPermissions: [], rolePermissions: [] };
      }

      // Get user's profile to determine their role
      const { data: userProfile, error: profileError } = await (supabase as any)
        .from('profiles')
        .select('role, organization_id')
        .eq('id', userId)
        .single();

      if (profileError || !userProfile) {
        throw new Error('User not found');
      }

      const userRole = userProfile.role;
      const userOrgId = userProfile.organization_id;

      // Get user-specific permissions
      const { data: userPermsData, error: userPermsError } = await (supabase as any)
        .from('user_permissions')
        .select(`
          id,
          permission_id,
          organization_id,
          permission:permissions(id, name, resource, action, description, organization_id)
        `)
        .eq('user_id', userId)
        .is('deleted_at', null);

      if (userPermsError) {
        throw new Error(userPermsError.message);
      }

      // Get role-based permissions
      let rolePermsData = null;
      if (userRole && userOrgId) {
        const { data, error: rolePermsError } = await (supabase as any)
          .from('role_permissions')
          .select(`
            permission:permissions(id, name, resource, action, description, organization_id)
          `)
          .eq('role', userRole)
          .or(`organization_id.is.null,organization_id.eq.${userOrgId}`);

        if (rolePermsError) {
          throw new Error(rolePermsError.message);
        }
        rolePermsData = data;
      }

      return {
        userPermissions: (userPermsData || []).map((up: any) => ({
          id: up.id,
          permission_id: up.permission_id,
          organization_id: up.organization_id,
          permission: up.permission,
        })),
        rolePermissions: (rolePermsData || []).map((rp: any) => ({
          permission: rp.permission,
        })),
      };
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

      // Get the permission to validate organization scope
      const { data: permission, error: permError } = await (supabase as any)
        .from('permissions')
        .select('id, organization_id')
        .eq('id', permissionId)
        .single();

      if (permError || !permission) {
        throw new Error('Permission not found');
      }

      const perm = permission as { id: string; organization_id: string | null };

      // Get target user's profile
      const { data: userProfile, error: userError } = await (supabase as any)
        .from('profiles')
        .select('organization_id')
        .eq('id', userId)
        .single();

      if (userError || !userProfile) {
        throw new Error('User not found');
      }

      const organizationId = perm.organization_id ?? profile.organization_id;

      const { data, error } = await (supabase as any)
        .from('user_permissions')
        .insert({
          user_id: userId,
          permission_id: permissionId,
          organization_id: organizationId,
        })
        .select()
        .single();

      if (error) {
        // If it's a unique constraint violation, the permission is already assigned
        if (error.code === '23505') {
          return { user_id: userId, permission_id: permissionId, organization_id: organizationId };
        }
        throw new Error(error.message);
      }

      return data;
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

      // Build delete query with organization filter
      let deleteQuery: any = (supabase as any)
        .from('user_permissions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('permission_id', permissionId)
        .is('deleted_at', null);

      const { error } = await deleteQuery;

      if (error) {
        throw new Error(error.message);
      }

      return { user_id: userId, permission_id: permissionId };
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
