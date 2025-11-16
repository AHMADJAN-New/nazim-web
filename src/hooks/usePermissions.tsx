import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from './useProfiles';

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
    queryKey: ['user-permissions', profile?.role],
    queryFn: async () => {
      if (!profile?.role) return [];

      // Super admin has all permissions
      if (profile.role === 'super_admin') {
        const { data: allPermissions } = await supabase
          .from('permissions')
          .select('name')
          .order('name', { ascending: true });

        return allPermissions?.map(p => p.name) || [];
      }

      // Get permissions for the user's role
      const { data, error } = await supabase
        .from('role_permissions')
        .select(`
          permission:permissions(name)
        `)
        .eq('role', profile.role);

      if (error) {
        throw new Error(error.message);
      }

      return data?.map(rp => rp.permission.name) || [];
    },
    enabled: !!profile?.role,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useHasPermission = (permissionName: string) => {
  const { data: permissions } = useUserPermissions();
  return permissions?.includes(permissionName) || false;
};

