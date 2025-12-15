import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationsApi } from '@/lib/api/client';
import { showToast } from '@/lib/toast';
import { useAuth } from './useAuth';
import { useAccessibleOrganizations } from './useAccessibleOrganizations';
import type * as OrganizationApi from '@/types/api/organization';
import type { Organization } from '@/types/domain/organization';
import { mapOrganizationApiToDomain, mapOrganizationDomainToInsert, mapOrganizationDomainToUpdate } from '@/mappers/organizationMapper';

// Re-export domain types for convenience
export type { Organization } from '@/types/domain/organization';

export const useOrganizations = () => {
  const { user, loading: authLoading } = useAuth();
  const { orgIds, isLoading: orgsLoading } = useAccessibleOrganizations();

  return useQuery<Organization[]>({
    queryKey: ['organizations', orgIds.join(',')],
    queryFn: async () => {
      if (!user || authLoading) return [];
      if (orgsLoading) return [];

      // Use Laravel API - it already filters by accessible organizations
      const apiOrganizations = await organizationsApi.list();
      
      // Map API models to domain models
      let organizations = (apiOrganizations as OrganizationApi.Organization[]).map(mapOrganizationApiToDomain);
      
      // Filter by accessible org IDs if we have them
      if (orgIds.length > 0) {
        organizations = organizations.filter(org => orgIds.includes(org.id));
      }
      
      return organizations;
    },
    enabled: !!user && !authLoading && !orgsLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

export const useOrganization = (id: string) => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useQuery<Organization>({
    queryKey: ['organizations', id],
    queryFn: async () => {
      // Check if we have bootstrap data cached (from useAuth)
      const bootstrapData = queryClient.getQueryData(['app', 'bootstrap']) as any;
      if (bootstrapData?.selectedOrganization && bootstrapData.selectedOrganization.id === id) {
        return mapOrganizationApiToDomain(bootstrapData.selectedOrganization as OrganizationApi.Organization);
      }

      // Check if already cached
      const cached = queryClient.getQueryData(['organizations', id]);
      if (cached) {
        return cached as Organization;
      }

      // Fallback to API call
      const apiOrganization = await organizationsApi.get(id);
      return mapOrganizationApiToDomain(apiOrganization as OrganizationApi.Organization);
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
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

      // Convert domain model to API insert payload
      const insertData = mapOrganizationDomainToInsert({
        name: orgData.name.trim(),
        slug: orgData.slug.trim().toLowerCase(),
        settings: orgData.settings || {},
      });

      const apiOrganization = await organizationsApi.create(insertData);
      
      // Map API response back to domain model
      return mapOrganizationApiToDomain(apiOrganization as OrganizationApi.Organization);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['accessible-organizations'] });
      showToast.success('toast.organizationCreated');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.organizationCreateFailed');
    },
  });
};

export const useUpdateOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Organization> & { id: string }) => {
      const updateData: Partial<Organization> = {};
      if (updates.name) updateData.name = updates.name.trim();
      if (updates.slug) {
        const slugRegex = /^[a-z0-9-]+$/;
        if (!slugRegex.test(updates.slug)) {
          throw new Error('Slug must contain only lowercase letters, numbers, and hyphens');
        }
        updateData.slug = updates.slug.trim().toLowerCase();
      }
      if (updates.settings !== undefined) updateData.settings = updates.settings;

      // Convert domain model to API update payload
      const apiUpdateData = mapOrganizationDomainToUpdate(updateData);

      const apiOrganization = await organizationsApi.update(id, apiUpdateData);
      
      // Map API response back to domain model
      return mapOrganizationApiToDomain(apiOrganization as OrganizationApi.Organization);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['accessible-organizations'] });
      showToast.success('toast.organizationUpdated');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.organizationUpdateFailed');
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
      showToast.success('toast.organizationDeleted');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.organizationDeleteFailed');
    },
  });
};

export const useCurrentOrganization = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  return useQuery<Organization | null>({
    queryKey: ['current-organization', profile?.organization_id],
    queryFn: async () => {
      if (!profile || !profile.organization_id) {
        return null; // Super admin or no organization
      }

      // Check if we have bootstrap data cached (from useAuth)
      const bootstrapData = queryClient.getQueryData(['app', 'bootstrap']) as any;
      if (bootstrapData?.selectedOrganization && bootstrapData.selectedOrganization.id === profile.organization_id) {
        return mapOrganizationApiToDomain(bootstrapData.selectedOrganization as OrganizationApi.Organization);
      }

      // Check if already cached
      const cached = queryClient.getQueryData(['organizations', profile.organization_id]);
      if (cached) {
        return cached as Organization;
      }

      // Fallback to API call
      const apiOrganization = await organizationsApi.get(profile.organization_id);
      return mapOrganizationApiToDomain(apiOrganization as OrganizationApi.Organization);
    },
    enabled: !!profile && !!profile.organization_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

export const useOrganizationStatistics = (organizationId: string) => {
  return useQuery({
    queryKey: ['organization-statistics', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        return {
          userCount: 0,
          schoolCount: 0,
          studentCount: 0,
          classCount: 0,
          staffCount: 0,
          buildingCount: 0,
          roomCount: 0,
        };
      }

      const stats = await organizationsApi.statistics(organizationId);
      return stats as {
        userCount: number;
        schoolCount: number;
        studentCount: number;
        classCount: number;
        staffCount: number;
        buildingCount: number;
        roomCount: number;
      };
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false, // REQUIRED: Performance optimization
    refetchOnReconnect: false, // REQUIRED: Performance optimization
  });
};

// Use accessible organizations instead - Laravel API handles org access
export const useSuperAdminOrganizations = (superAdminId?: string) => {
  const { orgIds } = useAccessibleOrganizations();
  const { data: organizations } = useOrganizations();

  return {
    data: organizations?.filter(org => orgIds.includes(org.id)) || [],
    isLoading: false,
  };
};

