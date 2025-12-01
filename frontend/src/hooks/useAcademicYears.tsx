import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { useAccessibleOrganizations } from './useAccessibleOrganizations';
import { academicYearsApi } from '@/lib/api/client';

// Academic Year type definition
export interface AcademicYear {
  id: string;
  organization_id: string | null;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type AcademicYearInsert = Omit<AcademicYear, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type AcademicYearUpdate = Partial<Omit<AcademicYear, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>>;

export const useAcademicYears = (organizationId?: string) => {
  const { user, profile } = useAuth();
  const { orgIds, isLoading: orgsLoading } = useAccessibleOrganizations();

  return useQuery({
    queryKey: ['academic-years', organizationId || profile?.organization_id, orgIds.join(',')],
    queryFn: async () => {
      if (!user || !profile || orgsLoading) return [];

      const resolvedOrgId = organizationId || profile.organization_id;
      const data = await academicYearsApi.list({
        organization_id: resolvedOrgId || undefined,
      });

      return (data || []) as AcademicYear[];
    },
    enabled: !!user && !!profile,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useCurrentAcademicYear = (organizationId?: string) => {
  const { user, profile } = useAuth();
  const { orgIds, isLoading: orgsLoading } = useAccessibleOrganizations();

  return useQuery({
    queryKey: ['current-academic-year', organizationId || profile?.organization_id, orgIds.join(',')],
    queryFn: async () => {
      if (!user || !profile || orgsLoading) return null;

      const resolvedOrgId = organizationId || profile.organization_id;
      const data = await academicYearsApi.list({
        organization_id: resolvedOrgId || undefined,
        is_current: true,
      });

      return (data && Array.isArray(data) && data.length > 0 ? data[0] : null) as AcademicYear | null;
    },
    enabled: !!user && !!profile,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useCreateAcademicYear = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (academicYearData: { 
      name: string; 
      start_date: string;
      end_date: string;
      is_current?: boolean;
      description?: string | null;
      status?: string;
      organization_id?: string | null;
    }) => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      // Get organization_id - use provided or user's org
      let organizationId = academicYearData.organization_id;
      if (organizationId === undefined) {
        if (profile.role === 'super_admin') {
          // Super admin can create global years (NULL) or org-specific
          organizationId = null; // Default to global
        } else if (profile.organization_id) {
          organizationId = profile.organization_id;
        } else {
          throw new Error('User must be assigned to an organization');
        }
      }

      // Validate organization access (unless super admin)
      if (profile.role !== 'super_admin' && organizationId !== profile.organization_id && organizationId !== null) {
        throw new Error('Cannot create academic year for different organization');
      }

      // Validation: max 100 characters for name
      if (academicYearData.name.length > 100) {
        throw new Error('Name must be 100 characters or less');
      }

      // Validation: date range
      const startDate = new Date(academicYearData.start_date);
      const endDate = new Date(academicYearData.end_date);
      
      if (isNaN(startDate.getTime())) {
        throw new Error('Invalid start date');
      }
      
      if (isNaN(endDate.getTime())) {
        throw new Error('Invalid end date');
      }
      
      if (endDate <= startDate) {
        throw new Error('End date must be after start date');
      }

      // Trim whitespace
      const trimmedName = academicYearData.name.trim();
      
      if (!trimmedName) {
        throw new Error('Name cannot be empty');
      }

      // Create academic year via Laravel API
      const data = await academicYearsApi.create({
        name: trimmedName,
        start_date: academicYearData.start_date,
        end_date: academicYearData.end_date,
        is_current: academicYearData.is_current || false,
        description: academicYearData.description || null,
        status: academicYearData.status || 'active',
        organization_id: organizationId,
      });

      return data as AcademicYear;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-years'] });
      queryClient.invalidateQueries({ queryKey: ['current-academic-year'] });
      toast.success('Academic year created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create academic year');
    },
  });
};

export const useUpdateAcademicYear = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AcademicYear> & { id: string }) => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      // Get current academic year to check organization
      const currentAcademicYear = await academicYearsApi.get(id);

      if (!currentAcademicYear) {
        throw new Error('Academic year not found');
      }

      // Validate organization access (unless super admin)
      if (profile.role !== 'super_admin' && currentAcademicYear.organization_id !== profile.organization_id && currentAcademicYear.organization_id !== null) {
        throw new Error('Cannot update academic year from different organization');
      }

      // Prevent organization_id changes (unless super admin)
      if (updates.organization_id !== undefined && profile.role !== 'super_admin') {
        throw new Error('Cannot change organization_id');
      }

      // Validation: max 100 characters for name
      if (updates.name && updates.name.length > 100) {
        throw new Error('Name must be 100 characters or less');
      }

      // Validation: date range
      const startDate = updates.start_date ? new Date(updates.start_date) : new Date(currentAcademicYear.start_date);
      const endDate = updates.end_date ? new Date(updates.end_date) : new Date(currentAcademicYear.end_date);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid date format');
      }
      
      if (endDate <= startDate) {
        throw new Error('End date must be after start date');
      }

      // Trim whitespace if name is being updated
      const updateData = { ...updates };
      if (updateData.name) {
        const trimmedName = updateData.name.trim();
        if (!trimmedName) {
          throw new Error('Name cannot be empty');
        }
        updateData.name = trimmedName;
      }

      // Update academic year via Laravel API
      const data = await academicYearsApi.update(id, updateData);

      return data as AcademicYear;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-years'] });
      queryClient.invalidateQueries({ queryKey: ['current-academic-year'] });
      toast.success('Academic year updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update academic year');
    },
  });
};

export const useDeleteAcademicYear = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      // Get current academic year to check organization
      const currentAcademicYear = await academicYearsApi.get(id);

      if (!currentAcademicYear) {
        throw new Error('Academic year not found');
      }

      // Validate organization access (unless super admin)
      // Note: Global years (organization_id = NULL) can only be deleted by super admin
      if (profile.role !== 'super_admin') {
        if (currentAcademicYear.organization_id === null) {
          throw new Error('Cannot delete global academic years');
        }
        if (currentAcademicYear.organization_id !== profile.organization_id) {
          throw new Error('Cannot delete academic year from different organization');
        }
      }

      // Prevent deletion of current year (warn user)
      if (currentAcademicYear.is_current) {
        throw new Error('Cannot delete the current academic year. Please set another year as current first.');
      }

      // Delete academic year via Laravel API (soft delete)
      await academicYearsApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-years'] });
      queryClient.invalidateQueries({ queryKey: ['current-academic-year'] });
      toast.success('Academic year deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete academic year');
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
      const academicYear = await academicYearsApi.get(id);

      if (!academicYear) {
        throw new Error('Academic year not found');
      }

      // Validate organization access (unless super admin)
      if (profile.role !== 'super_admin' && academicYear.organization_id !== profile.organization_id && academicYear.organization_id !== null) {
        throw new Error('Cannot set academic year from different organization as current');
      }

      // Set as current via Laravel API
      const data = await academicYearsApi.setCurrent(id);

      return data as AcademicYear;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-years'] });
      queryClient.invalidateQueries({ queryKey: ['current-academic-year'] });
      toast.success('Academic year set as current successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to set academic year as current');
    },
  });
};

