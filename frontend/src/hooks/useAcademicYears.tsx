import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { showToast } from '@/lib/toast';
import { useAuth } from './useAuth';
import { useAccessibleOrganizations } from './useAccessibleOrganizations';
import { useLanguage } from './useLanguage';
import { academicYearsApi } from '@/lib/api/client';
import type * as AcademicYearApi from '@/types/api/academicYear';
import type { AcademicYear } from '@/types/domain/academicYear';
import { mapAcademicYearApiToDomain, mapAcademicYearDomainToInsert, mapAcademicYearDomainToUpdate } from '@/mappers/academicYearMapper';

// Re-export domain types for convenience
export type { AcademicYear } from '@/types/domain/academicYear';

export const useAcademicYears = (organizationId?: string) => {
  const { user, profile } = useAuth();
  const { orgIds, isLoading: orgsLoading } = useAccessibleOrganizations();

  return useQuery<AcademicYear[]>({
    queryKey: ['academic-years', organizationId || profile?.organization_id, orgIds.join(','), profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!user || !profile) return [];

      const resolvedOrgId = organizationId || profile.organization_id;
      const apiAcademicYears = await academicYearsApi.list({
        organization_id: resolvedOrgId || undefined,
      });

      // Map API models to domain models
      return (apiAcademicYears as AcademicYearApi.AcademicYear[]).map(mapAcademicYearApiToDomain);
    },
    enabled: !!user && !!profile && !!profile.default_school_id && !orgsLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

export const useCurrentAcademicYear = (organizationId?: string) => {
  const { user, profile } = useAuth();
  const { orgIds, isLoading: orgsLoading } = useAccessibleOrganizations();

  return useQuery<AcademicYear | null>({
    queryKey: ['current-academic-year', organizationId || profile?.organization_id, orgIds.join(','), profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!user || !profile) return null;

      const resolvedOrgId = organizationId || profile.organization_id;
      const data = await academicYearsApi.list({
        organization_id: resolvedOrgId || undefined,
        is_current: true,
      });

      if (data && Array.isArray(data) && data.length > 0) {
        return mapAcademicYearApiToDomain(data[0] as AcademicYearApi.AcademicYear);
      }
      
      return null;
    },
    enabled: !!user && !!profile && !!profile.default_school_id && !orgsLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

export const useCreateAcademicYear = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (academicYearData: { 
      name: string; 
      startDate: Date | string;
      endDate: Date | string;
      isCurrent?: boolean;
      description?: string | null;
      status?: string;
      organizationId?: string | null;
    }) => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      // Get organization_id - use provided or user's org
      let organizationId = academicYearData.organizationId;
      if (organizationId === undefined) {
        if (profile.organization_id) {
          organizationId = profile.organization_id;
        } else {
          throw new Error('User must be assigned to an organization');
        }
      }

      // Validate organization access (all users)
      if (organizationId !== profile.organization_id) {
        throw new Error('Cannot create academic year for different organization');
      }

      // Validation: max 100 characters for name
      if (academicYearData.name.length > 100) {
        throw new Error(t('academic.academicYears.nameMaxLength'));
      }

      // Validate dates are provided
      if (!academicYearData.startDate) {
        throw new Error(t('academic.academicYears.startDateRequired'));
      }
      if (!academicYearData.endDate) {
        throw new Error(t('academic.academicYears.endDateRequired'));
      }

      // Convert dates to Date objects if strings
      const startDate = typeof academicYearData.startDate === 'string' 
        ? new Date(academicYearData.startDate) 
        : academicYearData.startDate;
      const endDate = typeof academicYearData.endDate === 'string'
        ? new Date(academicYearData.endDate)
        : academicYearData.endDate;
      
      // Validate dates are valid Date objects
      if (!startDate || !(startDate instanceof Date) || isNaN(startDate.getTime())) {
        throw new Error('Invalid start date');
      }
      
      if (!endDate || !(endDate instanceof Date) || isNaN(endDate.getTime())) {
        throw new Error('Invalid end date');
      }
      
      if (endDate <= startDate) {
        throw new Error(t('academic.academicYears.dateRangeError'));
      }

      // Trim whitespace
      const trimmedName = academicYearData.name.trim();
      
      if (!trimmedName) {
        throw new Error('Name cannot be empty');
      }

      // Convert domain model to API insert payload
      const insertData = mapAcademicYearDomainToInsert({
        name: trimmedName,
        startDate,
        endDate,
        isCurrent: academicYearData.isCurrent || false,
        description: academicYearData.description || null,
        status: academicYearData.status || 'active',
        organizationId,
      });

      // Create academic year via Laravel API
      const apiAcademicYear = await academicYearsApi.create(insertData);
      
      // Map API response back to domain model
      return mapAcademicYearApiToDomain(apiAcademicYear as AcademicYearApi.AcademicYear);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-years'] });
      queryClient.invalidateQueries({ queryKey: ['current-academic-year'] });
      showToast.success('academic.academicYears.academicYearCreated');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.academicYears.createFailed');
    },
  });
};

export const useUpdateAcademicYear = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AcademicYear> & { id: string }) => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      // Get current academic year to check organization
      const currentAcademicYearApi = await academicYearsApi.get(id);
      const currentAcademicYear = mapAcademicYearApiToDomain(currentAcademicYearApi as AcademicYearApi.AcademicYear);

      if (!currentAcademicYear) {
        throw new Error('Academic year not found');
      }

      // Validate organization access (all users)
      if (currentAcademicYear.organizationId !== profile.organization_id && currentAcademicYear.organizationId !== null) {
        throw new Error('Cannot update academic year from different organization');
      }

      // Prevent organizationId changes (all users)
      if (updates.organizationId !== undefined) {
        throw new Error('Cannot change organizationId');
      }

      // Validation: max 100 characters for name
      if (updates.name && updates.name.length > 100) {
        throw new Error(t('academic.academicYears.nameMaxLength'));
      }

      // Validation: date range
      const startDate = updates.startDate || currentAcademicYear.startDate;
      const endDate = updates.endDate || currentAcademicYear.endDate;
      
      // Validate dates are valid Date objects
      if (!startDate || !(startDate instanceof Date) || isNaN(startDate.getTime())) {
        throw new Error('Invalid start date format');
      }
      
      if (!endDate || !(endDate instanceof Date) || isNaN(endDate.getTime())) {
        throw new Error('Invalid end date format');
      }
      
      if (endDate <= startDate) {
        throw new Error(t('academic.academicYears.dateRangeError'));
      }

      // Prepare update data
      const updateData: Partial<AcademicYear> = { ...updates };
      if (updateData.name) {
        const trimmedName = updateData.name.trim();
        if (!trimmedName) {
          throw new Error('Name cannot be empty');
        }
        updateData.name = trimmedName;
      }

      // Convert domain model to API update payload
      const apiUpdateData = mapAcademicYearDomainToUpdate(updateData);

      // Update academic year via Laravel API
      const apiAcademicYear = await academicYearsApi.update(id, apiUpdateData);

      // Map API response back to domain model
      return mapAcademicYearApiToDomain(apiAcademicYear as AcademicYearApi.AcademicYear);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-years'] });
      queryClient.invalidateQueries({ queryKey: ['current-academic-year'] });
      showToast.success('academic.academicYears.academicYearUpdated');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.academicYears.updateFailed');
    },
  });
};

export const useDeleteAcademicYear = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      // Get current academic year to check organization
      const currentAcademicYearApi = await academicYearsApi.get(id);
      const currentAcademicYear = mapAcademicYearApiToDomain(currentAcademicYearApi as AcademicYearApi.AcademicYear);

      if (!currentAcademicYear) {
        throw new Error('Academic year not found');
      }

      // Validate organization access (all users)
      // Note: Global years (organizationId = NULL) cannot be deleted
      if (currentAcademicYear.organizationId === null) {
        throw new Error(t('academic.academicYears.cannotDeleteGlobal'));
      }
      if (currentAcademicYear.organizationId !== profile.organization_id) {
        throw new Error('Cannot delete academic year from different organization');
      }

      // Prevent deletion of current year (warn user)
      if (currentAcademicYear.isCurrent) {
        throw new Error(t('academic.academicYears.cannotDeleteCurrent'));
      }

      // Delete academic year via Laravel API (soft delete)
      await academicYearsApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-years'] });
      queryClient.invalidateQueries({ queryKey: ['current-academic-year'] });
      showToast.success('academic.academicYears.academicYearDeleted');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.academicYears.deleteFailed');
    },
  });
};

export const useSetCurrentAcademicYear = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      // Get current academic year to check organization
      const academicYearApi = await academicYearsApi.get(id);
      const academicYear = mapAcademicYearApiToDomain(academicYearApi as AcademicYearApi.AcademicYear);

      if (!academicYear) {
        throw new Error('Academic year not found');
      }

      // Validate organization access (all users)
      if (academicYear.organizationId !== profile.organization_id && academicYear.organizationId !== null) {
        throw new Error('Cannot set academic year from different organization as current');
      }

      // Set as current via Laravel API
      const apiAcademicYear = await academicYearsApi.setCurrent(id);

      // Map API response back to domain model
      return mapAcademicYearApiToDomain(apiAcademicYear as AcademicYearApi.AcademicYear);
    },
    onSuccess: async () => {
      // Invalidate and refetch to ensure UI updates immediately
      await queryClient.invalidateQueries({ queryKey: ['academic-years'] });
      await queryClient.invalidateQueries({ queryKey: ['current-academic-year'] });
      // Force refetch to update the UI
      await queryClient.refetchQueries({ queryKey: ['academic-years'] });
      await queryClient.refetchQueries({ queryKey: ['current-academic-year'] });
      showToast.success('academic.academicYears.academicYearSetAsCurrent');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.academicYears.setCurrentFailed');
    },
  });
};

