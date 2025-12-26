import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { showToast } from '@/lib/toast';
import { useProfile } from './useProfiles';
import { useAuth } from './useAuth';
import { useAccessibleOrganizations } from './useAccessibleOrganizations';
import { useHasPermission } from './usePermissions';
import { schoolsApi } from '@/lib/api/client';
import type * as SchoolApi from '@/types/api/school';
import type { School } from '@/types/domain/school';
import { mapSchoolApiToDomain, mapSchoolDomainToInsert, mapSchoolDomainToUpdate } from '@/mappers/schoolMapper';

// Re-export domain types for convenience
export type { School } from '@/types/domain/school';

export const useSchools = (organizationId?: string) => {
  const { user, profile } = useAuth();
  const { orgIds, isLoading: orgsLoading } = useAccessibleOrganizations();

  return useQuery<School[]>({
    queryKey: ['schools', organizationId || profile?.organization_id, profile?.default_school_id ?? null, orgIds.join(',')],
    queryFn: async () => {
      if (!user || !profile || orgsLoading) return [];

      // Fetch schools from Laravel API
      const apiSchools = await schoolsApi.list({
        organization_id: organizationId,
      });

      // Map API models to domain models
      const schools = (apiSchools as SchoolApi.School[]).map(mapSchoolApiToDomain);

      // Sort by schoolName
      return schools.sort((a, b) =>
        a.schoolName.localeCompare(b.schoolName)
      );
    },
    enabled: !!user && !!profile,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

export const useSchool = (schoolId: string) => {
  return useQuery<School>({
    queryKey: ['school', schoolId],
    queryFn: async () => {
      // Fetch school from Laravel API
      const apiSchool = await schoolsApi.get(schoolId);
      return mapSchoolApiToDomain(apiSchool as SchoolApi.School);
    },
    enabled: !!schoolId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

export const useCreateSchool = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const { orgIds } = useAccessibleOrganizations();
  const hasPermission = useHasPermission('school_branding.create');

  return useMutation({
    mutationFn: async (schoolData: Partial<School> & { organizationId?: string }) => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      if (!hasPermission) {
        throw new Error('Insufficient permissions to create schools');
      }

      const organizationId = schoolData.organizationId || profile.organization_id;
      if (!organizationId) {
        throw new Error('Organization ID is required');
      }
      if (!orgIds.includes(organizationId)) {
        throw new Error('Cannot create school for a non-accessible organization');
      }

      // Convert domain model to API insert payload
      const insertData = mapSchoolDomainToInsert({
        ...schoolData,
        organizationId,
      });

      // Create school via Laravel API
      const apiSchool = await schoolsApi.create(insertData);

      // Map API response back to domain model
      return mapSchoolApiToDomain(apiSchool as SchoolApi.School);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      showToast.success('toast.schoolCreated');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.schoolCreateFailed');
    },
  });
};

export const useUpdateSchool = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const hasPermission = useHasPermission('school_branding.update');

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<School> & { id: string }) => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      if (!hasPermission) {
        throw new Error('Insufficient permissions to update schools');
      }

      // Convert domain model to API update payload
      const apiUpdateData = mapSchoolDomainToUpdate(updates);

      // Update school via Laravel API
      const apiSchool = await schoolsApi.update(id, apiUpdateData);

      // Map API response back to domain model
      return mapSchoolApiToDomain(apiSchool as SchoolApi.School);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      queryClient.invalidateQueries({ queryKey: ['school'] });
      showToast.success('toast.schoolUpdated');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.schoolUpdateFailed');
    },
  });
};

export const useDeleteSchool = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const hasPermission = useHasPermission('school_branding.delete');

  return useMutation({
    mutationFn: async (schoolId: string) => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      if (!hasPermission) {
        throw new Error('Insufficient permissions to delete schools');
      }

      // Delete school via Laravel API (soft delete)
      // Backend handles all validation: permission check, organization access, and "in use" check
      await schoolsApi.delete(schoolId);
    },
    onSuccess: async () => {
      // CRITICAL: Use both invalidateQueries AND refetchQueries for immediate UI updates
      await queryClient.invalidateQueries({ queryKey: ['schools'] });
      await queryClient.refetchQueries({ queryKey: ['schools'] });
      await queryClient.invalidateQueries({ queryKey: ['school'] });
      showToast.success('toast.schoolDeleted');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.schoolDeleteFailed');
    },
  });
};

