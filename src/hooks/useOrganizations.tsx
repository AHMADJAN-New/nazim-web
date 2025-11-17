import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export const useOrganizations = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      // Check if user is super admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, role')
        .eq('id', user?.id || '')
        .single();

      if (!profile || (profile.organization_id !== null && profile.role !== 'super_admin')) {
        throw new Error('Only super admins can view all organizations');
      }

      // Try with deleted_at filter first, fallback to without if column doesn't exist
      let query = supabase
        .from('organizations')
        .select('*')
        .order('name', { ascending: true });
      
      // Try with deleted_at filter, but handle case where column might not exist yet
      const { data, error } = await query.is('deleted_at', null);
      
      // If error is about missing column, retry without the filter
      if (error && (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist'))) {
        const { data: retryData, error: retryError } = await supabase
          .from('organizations')
          .select('*')
          .order('name', { ascending: true });
        
        if (retryError) {
          throw new Error(retryError.message);
        }
        return retryData as Organization[];
      }

      if (error) {
        throw new Error(error.message);
      }

      return data as Organization[];
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useOrganization = (id: string) => {
  return useQuery({
    queryKey: ['organizations', id],
    queryFn: async () => {
      // Try with deleted_at filter first, fallback to without if column doesn't exist
      let query = supabase
        .from('organizations')
        .select('*')
        .eq('id', id);
      
      const { data, error } = await query.is('deleted_at', null).single();
      
      // If error is about missing column, retry without the filter
      if (error && (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist'))) {
        const { data: retryData, error: retryError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', id)
          .single();
        
        if (retryError) {
          throw new Error(retryError.message);
        }
        return retryData as Organization;
      }

      if (error) {
        throw new Error(error.message);
      }

      return data as Organization;
    },
    enabled: !!id,
  });
};

export const useCreateOrganization = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (orgData: { name: string; slug: string; settings?: Record<string, any> }) => {
      // Check if user is super admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, role')
        .eq('id', user?.id || '')
        .single();

      if (!profile || (profile.organization_id !== null && profile.role !== 'super_admin')) {
        throw new Error('Only super admins can create organizations');
      }

      // Validate slug format (alphanumeric and hyphens only)
      const slugRegex = /^[a-z0-9-]+$/;
      if (!slugRegex.test(orgData.slug)) {
        throw new Error('Slug must contain only lowercase letters, numbers, and hyphens');
      }

      const { data, error } = await supabase
        .from('organizations')
        .insert({
          name: orgData.name.trim(),
          slug: orgData.slug.trim().toLowerCase(),
          settings: orgData.settings || {},
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast.success('Organization created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create organization');
    },
  });
};

export const useUpdateOrganization = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Organization> & { id: string }) => {
      // Check if user is super admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, role')
        .eq('id', user?.id || '')
        .single();

      if (!profile || (profile.organization_id !== null && profile.role !== 'super_admin')) {
        throw new Error('Only super admins can update organizations');
      }

      const updateData: any = {};
      if (updates.name) updateData.name = updates.name.trim();
      if (updates.slug) {
        const slugRegex = /^[a-z0-9-]+$/;
        if (!slugRegex.test(updates.slug)) {
          throw new Error('Slug must contain only lowercase letters, numbers, and hyphens');
        }
        updateData.slug = updates.slug.trim().toLowerCase();
      }
      if (updates.settings !== undefined) updateData.settings = updates.settings;

      const { data, error } = await supabase
        .from('organizations')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast.success('Organization updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update organization');
    },
  });
};

export const useDeleteOrganization = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      // Check if user is super admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, role')
        .eq('id', user?.id || '')
        .single();

      if (!profile || (profile.organization_id !== null && profile.role !== 'super_admin')) {
        throw new Error('Only super admins can delete organizations');
      }

      // Check if organization has profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('organization_id', id)
        .limit(1);

      if (profiles && profiles.length > 0) {
        throw new Error('Cannot delete organization with existing users');
      }

      const { error } = await supabase
        .from('organizations')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast.success('Organization deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete organization');
    },
  });
};

export const useCurrentOrganization = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['current-organization'],
    queryFn: async () => {
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile || !profile.organization_id) {
        return null; // Super admin or no organization
      }

      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as Organization;
    },
    enabled: !!user,
  });
};

export const useOrganizationStatistics = (organizationId: string) => {
  return useQuery({
    queryKey: ['organization-statistics', organizationId],
    queryFn: async () => {
      const [usersResult, buildingsResult, roomsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId),
        supabase
          .from('buildings')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId),
        supabase
          .from('rooms')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId),
      ]);

      return {
        userCount: usersResult.count || 0,
        buildingCount: buildingsResult.count || 0,
        roomCount: roomsResult.count || 0,
      };
    },
    enabled: !!organizationId,
  });
};

export const useSuperAdminOrganizations = (superAdminId?: string) => {
  return useQuery({
    queryKey: ['super-admin-organizations', superAdminId],
    queryFn: async () => {
      if (!superAdminId) return [];

      const { data, error } = await supabase
        .from('super_admin_organizations')
        .select(`
          *,
          organization:organizations(*)
        `)
        .eq('super_admin_id', superAdminId);

      if (error) {
        throw new Error(error.message);
      }

      return data || [];
    },
    enabled: !!superAdminId,
  });
};

export const useAssignSuperAdminToOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ superAdminId, organizationId, isPrimary = false }: { superAdminId: string; organizationId: string; isPrimary?: boolean }) => {
      const { data, error } = await supabase
        .from('super_admin_organizations')
        .insert({
          super_admin_id: superAdminId,
          organization_id: organizationId,
          is_primary: isPrimary,
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-organizations'] });
      toast.success('Super admin assigned to organization');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to assign super admin');
    },
  });
};

export const useRemoveSuperAdminFromOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ superAdminId, organizationId }: { superAdminId: string; organizationId: string }) => {
      const { error } = await supabase
        .from('super_admin_organizations')
        .update({ deleted_at: new Date().toISOString() })
        .eq('super_admin_id', superAdminId)
        .eq('organization_id', organizationId);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-organizations'] });
      toast.success('Super admin removed from organization');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove super admin');
    },
  });
};

