import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from './useProfiles';
import { toast } from 'sonner';

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description: string | null;
  created_at: string;
}

export interface RolePermission {
  id: string;
  role: string;
  permission_id: string;
  created_at: string;
}

export const usePermissions = () => {
  return useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('resource', { ascending: true })
        .order('action', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      return data as Permission[];
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
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['user-permissions', profile?.role, profile?.id],
    queryFn: async () => {
      if (!profile?.role) {
        console.log('🔍 useUserPermissions: No profile role, returning empty');
        return [];
      }

      console.log('🔍 useUserPermissions: Fetching permissions for role:', profile.role);

      // Super admin has all permissions
      if (profile.role === 'super_admin') {
        console.log('🔍 useUserPermissions: Super admin detected, fetching all permissions');
        const { data: allPermissions, error } = await supabase
          .from('permissions')
          .select('name')
          .order('name', { ascending: true });

        if (error) {
          console.error('🔍 useUserPermissions: Error fetching all permissions:', error);
          throw new Error(error.message);
        }

        const permNames = allPermissions?.map(p => p.name) || [];
        console.log('🔍 useUserPermissions: Super admin permissions:', permNames);
        return permNames;
      }

      // Get permissions for the user's role
      console.log('🔍 useUserPermissions: Fetching role permissions for:', profile.role);
      const { data, error } = await supabase
        .from('role_permissions')
        .select(`
          permission:permissions(name)
        `)
        .eq('role', profile.role);

      if (error) {
        console.error('🔍 useUserPermissions: Error fetching role permissions:', error);
        throw new Error(error.message);
      }

      const permNames = data?.map(rp => rp.permission.name) || [];
      console.log('🔍 useUserPermissions: Role permissions:', permNames);
      return permNames;
    },
    enabled: !!profile?.role,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useHasPermission = (permissionName: string) => {
  const { data: profile } = useProfile();
  const { data: permissions, isLoading } = useUserPermissions();
  
  // Super admin always has all permissions (immediate return, no query needed)
  if (profile?.role === 'super_admin') {
    return true;
  }
  
  // While loading, return false to prevent showing items prematurely
  if (isLoading || !permissions) {
    return false;
  }
  
  return permissions.includes(permissionName);
};

export const useAssignPermissionToRole = () => {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async ({ role, permissionId }: { role: string; permissionId: string }) => {
      if (profile?.role !== 'super_admin') {
        throw new Error('Only super administrators can assign permissions');
      }

      const { data, error } = await supabase
        .from('role_permissions')
        .insert({
          role,
          permission_id: permissionId,
        })
        .select()
        .single();

      if (error) {
        // If it's a unique constraint violation, the permission is already assigned
        if (error.code === '23505') {
          return { role, permission_id: permissionId }; // Return existing assignment
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
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async ({ role, permissionId }: { role: string; permissionId: string }) => {
      if (profile?.role !== 'super_admin') {
        throw new Error('Only super administrators can remove permissions');
      }

      const { error } = await supabase
        .from('role_permissions')
        .delete()
        .eq('role', role)
        .eq('permission_id', permissionId);

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

