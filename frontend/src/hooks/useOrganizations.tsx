import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationsApi } from '@/lib/api/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { useAccessibleOrganizations } from './useAccessibleOrganizations';

// Organization type matching Laravel API response
export interface Organization {
  id: string;
  name: string;
  slug: string;
  settings?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export type OrganizationInsert = Omit<Organization, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type OrganizationUpdate = Partial<OrganizationInsert>;

export const useOrganizations = () => {
  const { user } = useAuth();
  const { orgIds, isLoading: orgsLoading } = useAccessibleOrganizations();
  
  return useQuery({
    queryKey: ['organizations', orgIds.join(',')],
    queryFn: async () => {
      if (!user) return [];
      if (orgsLoading) return [];
      
      // Use Laravel API - it already filters by accessible organizations
      const organizations = await organizationsApi.list();
      
      // Filter by accessible org IDs if we have them
      if (orgIds.length > 0) {
        return (organizations as Organization[]).filter(org => orgIds.includes(org.id));
      }
      
      return organizations as Organization[];
    },
    enabled: !!user && !orgsLoading,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useOrganization = (id: string) => {
  return useQuery({
    queryKey: ['organizations', id],
    queryFn: async () => {
      const organization = await organizationsApi.get(id);
      return organization as Organization;
    },
    enabled: !!id,
  });
};

export const useCreateOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orgData: { name: string; slug: string; settings?: Record<string, any> }) => {
      // Validate slug format (alphanumeric and hyphens only)
      const slugRegex = /^[a-z0-9-]+$/;
      if (!slugRegex.test(orgData.slug)) {
        throw new Error('Slug must contain only lowercase letters, numbers, and hyphens');
      }

      const organization = await organizationsApi.create({
        name: orgData.name.trim(),
        slug: orgData.slug.trim().toLowerCase(),
        settings: orgData.settings || {},
      });

      return organization as Organization;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['accessible-organizations'] });
      toast.success('Organization created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create organization');
    },
  });
};

export const useUpdateOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Organization> & { id: string }) => {
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

      const organization = await organizationsApi.update(id, updateData);
      return organization as Organization;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['accessible-organizations'] });
      toast.success('Organization updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update organization');
    },
  });
};

export const useDeleteOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await organizationsApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['accessible-organizations'] });
      toast.success('Organization deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete organization');
    },
  });
};

export const useCurrentOrganization = () => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['current-organization', profile?.organization_id],
    queryFn: async () => {
      if (!profile || !profile.organization_id) {
        return null; // Super admin or no organization
      }

      const organization = await organizationsApi.get(profile.organization_id);
      return organization as Organization;
    },
    enabled: !!profile && !!profile.organization_id,
  });
};

// TODO: Migrate to Laravel API when statistics endpoint is available
export const useOrganizationStatistics = (organizationId: string) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { supabase } = require('@/integrations/supabase/client');
  
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

// Use accessible organizations instead - Laravel API handles super admin orgs
export const useSuperAdminOrganizations = (superAdminId?: string) => {
  const { orgIds } = useAccessibleOrganizations();
  const { data: organizations } = useOrganizations();

  return {
    data: organizations?.filter(org => orgIds.includes(org.id)) || [],
    isLoading: false,
  };
};

// TODO: Migrate to Laravel API when super admin assignment endpoint is available
export const useAssignSuperAdminToOrganization = () => {
  const queryClient = useQueryClient();
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { supabase } = require('@/integrations/supabase/client');

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
      queryClient.invalidateQueries({ queryKey: ['accessible-organizations'] });
      toast.success('Super admin assigned to organization');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to assign super admin');
    },
  });
};

// TODO: Migrate to Laravel API when super admin removal endpoint is available
export const useRemoveSuperAdminFromOrganization = () => {
  const queryClient = useQueryClient();
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { supabase } = require('@/integrations/supabase/client');

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
      queryClient.invalidateQueries({ queryKey: ['accessible-organizations'] });
      toast.success('Super admin removed from organization');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove super admin');
    },
  });
};

