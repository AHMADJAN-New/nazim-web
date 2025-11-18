import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description: string | null;
  organization_id: string | null;
  created_at: string;
}

export interface RolePermission {
  id: string;
  role: string;
  permission_id: string;
  organization_id: string | null;
  created_at: string;
}

export const usePermissions = () => {
  return useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('permissions')
        .select('*')
        .order('resource', { ascending: true })
        .order('action', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      return (data ?? []) as Permission[];
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

  return useQuery({
    queryKey: ['user-permissions', profile?.role, profile?.id, profile?.organization_id],
    queryFn: async () => {
      if (!profile?.role) {
        return [];
      }

      // Super admin has all global permissions (organization_id IS NULL)
      if (profile.role === 'super_admin') {
        const { data: allPermissions, error } = await (supabase as any)
          .from('permissions')
          .select('name')
          .is('organization_id', null) // Only global permissions
          .order('name', { ascending: true });

        if (error) {
          throw new Error(error.message);
        }

        const permNames = (allPermissions ?? []).map((p: { name: string }) => p.name);
        return permNames;
      }

      // Regular users: Get global permissions (organization_id IS NULL) + their organization's permissions
      if (!profile.organization_id) {
        return [];
      }

      // Query role_permissions filtered by:
      // 1. User's role
      // 2. User's organization_id OR organization_id IS NULL (global permissions)
      const { data, error } = await (supabase as any)
        .from('role_permissions')
        .select(`
          permission:permissions(name, organization_id)
        `)
        .eq('role', profile.role)
        .or(`organization_id.is.null,organization_id.eq.${profile.organization_id}`);

      if (error) {
        throw new Error(error.message);
      }

      // Extract permission names, ensuring we only get global permissions or org-specific permissions
      const permNames = (data ?? [])
        .map((rp: { permission: { name: string; organization_id: string | null } | null }) => {
          const perm = rp.permission;
          if (!perm) return null;
          // Only include if it's a global permission (organization_id IS NULL) 
          // OR it's for the user's organization
          if (perm.organization_id === null || perm.organization_id === profile.organization_id) {
            return perm.name;
          }
          return null;
        })
        .filter(Boolean) as string[];

      // Remove duplicates (in case same permission exists as both global and org-specific)
      const uniquePermNames = Array.from(new Set(permNames));

      return uniquePermNames;
    },
    enabled: !!profile?.role,
    staleTime: 30 * 60 * 1000, // 30 minutes - permissions don't change often
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch on mount if data is fresh
    refetchOnReconnect: false, // Don't refetch on reconnect
  });
};

export const useHasPermission = (permissionName: string) => {
  const { profile } = useAuth();
  const { data: permissions, isLoading } = useUserPermissions();

  // Super admin always has all permissions (immediate return, no query needed)
  if (profile?.role === 'super_admin') {
    return true;
  }

  // Only return false on initial load when we have no cached data
  // Use cached data if available during background refetch to prevent UI flicker
  if (isLoading && !permissions) {
    // Initial load - no cached data yet
    return false;
  }

  // If we have permissions (cached or fresh), use them
  // This ensures sidebar doesn't disappear during background refetches
  if (permissions && permissions.length > 0) {
    return permissions.includes(permissionName);
  }

  // No permissions found
  return false;
};

export const useAssignPermissionToRole = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ role, permissionId }: { role: string; permissionId: string }) => {
      if (!profile) {
        throw new Error('User not authenticated');
      }

      // Check if user has permission to assign permissions
      const hasPermission = profile.role === 'super_admin' ||
        (profile.role === 'admin' && profile.organization_id);

      if (!hasPermission) {
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

      // Validate organization scope (unless super admin)
      if (profile.role !== 'super_admin') {
        // Regular admin can only assign permissions for their organization
        // Permission must be global (organization_id IS NULL) or belong to user's org
        if (perm.organization_id !== null && perm.organization_id !== profile.organization_id) {
          throw new Error('Cannot assign permission from different organization');
        }
      }

      // Determine organization_id for role_permissions
      // Super admin can assign global (NULL) or org-specific
      // Regular admin assigns to their organization
      const organizationId = profile.role === 'super_admin'
        ? perm.organization_id // Use permission's organization_id (can be NULL for global)
        : profile.organization_id; // Regular admin always uses their org

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

  return useMutation({
    mutationFn: async ({ role, permissionId }: { role: string; permissionId: string }) => {
      if (!profile) {
        throw new Error('User not authenticated');
      }

      // Check if user has permission to remove permissions
      const hasPermission = profile.role === 'super_admin' ||
        (profile.role === 'admin' && profile.organization_id);

      if (!hasPermission) {
        throw new Error('You do not have permission to remove permissions');
      }

      // Build delete query with organization filter
      let deleteQuery: any = (supabase as any)
        .from('role_permissions')
        .delete()
        .eq('role', role)
        .eq('permission_id', permissionId);

      // Regular admin can only remove permissions for their organization
      if (profile.role !== 'super_admin' && profile.organization_id) {
        deleteQuery = deleteQuery.eq('organization_id', profile.organization_id);
      }

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

      // Check if user has permission to create permissions
      const hasPermission = profile.role === 'super_admin' ||
        (profile.role === 'admin' && profile.organization_id);

      if (!hasPermission) {
        throw new Error('You do not have permission to create permissions');
      }

      // Regular admin can only create permissions for their organization
      // Super admin can create global permissions (organization_id = NULL) or org-specific
      const organizationId = profile.role === 'super_admin'
        ? null // Super admin can create global permissions
        : profile.organization_id; // Regular admin creates for their org

      if (!organizationId && profile.role !== 'super_admin') {
        throw new Error('User must be assigned to an organization');
      }

      const { data, error } = await (supabase as any)
        .from('permissions')
        .insert({
          ...permissionData,
          organization_id: organizationId,
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

      // Check if user has permission to update permissions
      const hasPermission = profile.role === 'super_admin' ||
        (profile.role === 'admin' && profile.organization_id);

      if (!hasPermission) {
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

      // Validate organization scope (unless super admin)
      if (profile.role !== 'super_admin') {
        if (currentPerm.organization_id !== profile.organization_id) {
          throw new Error('Cannot update permission from different organization');
        }
        // Regular admin cannot change organization_id
        const updatesWithOrg = updates as { organization_id?: string | null };
        if (updatesWithOrg.organization_id !== undefined) {
          throw new Error('Cannot change organization_id');
        }
      }

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

  return useMutation({
    mutationFn: async (permissionId: string) => {
      if (!profile) {
        throw new Error('User not authenticated');
      }

      // Check if user has permission to delete permissions
      const hasPermission = profile.role === 'super_admin' ||
        (profile.role === 'admin' && profile.organization_id);

      if (!hasPermission) {
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

      // Validate organization scope (unless super admin)
      if (profile.role !== 'super_admin') {
        if (currentPerm.organization_id !== profile.organization_id) {
          throw new Error('Cannot delete permission from different organization');
        }
      }

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
