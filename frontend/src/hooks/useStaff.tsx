import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { useAccessibleOrganizations } from './useAccessibleOrganizations';
import { staffApi, staffTypesApi, staffDocumentsApi } from '@/lib/api/client';
import type * as StaffApi from '@/types/api/staff';
import type { Staff, StaffType, StaffDocument, StaffStats } from '@/types/domain/staff';
import {
  mapStaffApiToDomain,
  mapStaffDomainToInsert,
  mapStaffDomainToUpdate,
  mapStaffTypeApiToDomain,
  mapStaffTypeDomainToInsert,
  mapStaffTypeDomainToUpdate,
  mapStaffDocumentApiToDomain,
} from '@/mappers/staffMapper';

// Re-export domain types for convenience
export type { Staff, StaffType, StaffDocument, StaffStats, StaffStatus } from '@/types/domain/staff';

// Hook to fetch all staff with organization filtering
export const useStaff = (organizationId?: string) => {
  const { user, profile } = useAuth();
  const { orgIds, isLoading: orgsLoading } = useAccessibleOrganizations();
  const orgId = organizationId || profile?.organization_id || null;

  return useQuery<Staff[]>({
    queryKey: ['staff', orgId, orgIds.join(',')],
    queryFn: async () => {
      if (!user || !profile) return [];
      if (orgsLoading) return [];

      const resolvedOrgIds = orgIds;

      // Short-circuit if no accessible orgs
      if (resolvedOrgIds.length === 0) {
        return [];
      }

      // Fetch staff from Laravel API
      const params: any = {};
      if (organizationId) {
        if (!resolvedOrgIds.includes(organizationId)) {
          return [];
        }
        params.organization_id = organizationId;
      }

      const apiStaff = await staffApi.list(params);
      // Map API models to domain models
      return (apiStaff as StaffApi.Staff[]).map(mapStaffApiToDomain);
    },
    enabled: !!user && !!profile,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

// Hook to fetch a single staff member
export const useStaffMember = (staffId: string) => {
  return useQuery<Staff>({
    queryKey: ['staff', staffId],
    queryFn: async () => {
      const apiStaff = await staffApi.get(staffId);
      return mapStaffApiToDomain(apiStaff as StaffApi.Staff);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false, // REQUIRED: Performance optimization
    refetchOnReconnect: false, // REQUIRED: Performance optimization
  });
};

// Hook to fetch staff by type
export const useStaffByType = (staffTypeId: string, organizationId?: string) => {
  const { profile } = useAuth();
  const { orgIds, isLoading: orgsLoading } = useAccessibleOrganizations();
  const orgId = organizationId || profile?.organization_id || null;

  return useQuery<Staff[]>({
    queryKey: ['staff', 'type', staffTypeId, orgId],
    queryFn: async () => {
      const params: any = {
        staff_type_id: staffTypeId,
        status: 'active',
      };
      if (orgId) {
        params.organization_id = orgId;
      }

      const apiStaff = await staffApi.list(params);
      // Map API models to domain models and sort by fullName
      const domainStaff = (apiStaff as StaffApi.Staff[]).map(mapStaffApiToDomain);
      return domainStaff.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
    },
    enabled: (!!orgId || organizationId === undefined) && !orgsLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false, // REQUIRED: Performance optimization
    refetchOnReconnect: false, // REQUIRED: Performance optimization
  });
};

// Hook to get staff statistics
export const useStaffStats = (organizationId?: string) => {
  const { user, profile } = useAuth();
  const { orgIds, isLoading: orgsLoading } = useAccessibleOrganizations();

  return useQuery<StaffStats>({
    queryKey: ['staff-stats', organizationId === undefined ? 'all' : organizationId, orgIds.join(',')],
    queryFn: async (): Promise<StaffStats> => {
      if (!user || !profile || orgsLoading) {
        return { total: 0, active: 0, inactive: 0, onLeave: 0, terminated: 0, suspended: 0, byType: { teacher: 0, admin: 0, accountant: 0, librarian: 0, other: 0 } };
      }

      const resolvedOrgIds = orgIds;
      if (resolvedOrgIds.length === 0) {
        return { total: 0, active: 0, inactive: 0, onLeave: 0, terminated: 0, suspended: 0, byType: { teacher: 0, admin: 0, accountant: 0, librarian: 0, other: 0 } };
      }

      // Fetch stats from Laravel API
      const params: any = {};
      if (organizationId) {
        if (!resolvedOrgIds.includes(organizationId)) {
          return { total: 0, active: 0, inactive: 0, onLeave: 0, terminated: 0, suspended: 0, byType: { teacher: 0, admin: 0, accountant: 0, librarian: 0, other: 0 } };
        }
        params.organization_id = organizationId;
      }

      const apiStats = await staffApi.stats(params);
      const stats = apiStats as StaffApi.StaffStats;
      // Map API stats to domain stats
      return {
        total: stats.total,
        active: stats.active,
        inactive: stats.inactive,
        onLeave: stats.on_leave,
        terminated: stats.terminated,
        suspended: stats.suspended,
        byType: stats.by_type,
      };
    },
    enabled: !!user && !!profile && !orgsLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};

// Hook to create a new staff member
export const useCreateStaff = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (staffData: Partial<Staff>) => {
      // Get organization_id - automatically use profile's organization_id if not provided
      const organizationId = staffData.organizationId || profile?.organization_id;

      if (!organizationId) {
        throw new Error('You must be assigned to an organization. Please log out and log back in, or contact administrator.');
      }

      // Convert domain model to API insert payload
      const insertData = mapStaffDomainToInsert({
        ...staffData,
        organizationId,
        schoolId: staffData.schoolId && staffData.schoolId !== '' ? staffData.schoolId : null,
      });

      // Create staff via Laravel API
      const apiStaff = await staffApi.create(insertData);
      // Map API response back to domain model
      return mapStaffApiToDomain(apiStaff as StaffApi.Staff);
    },
    onSuccess: (data, variables) => {
      // Invalidate all staff queries
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      if (variables.organizationId) {
        queryClient.invalidateQueries({ queryKey: ['staff', variables.organizationId] });
      }
      queryClient.invalidateQueries({ queryKey: ['staff-stats'] });
      toast.success('Staff member created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create staff member');
    },
  });
};

// Hook to update a staff member
export const useUpdateStaff = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Staff> & { id: string }) => {
      // Convert domain model to API update payload
      const updateData = mapStaffDomainToUpdate(updates);

      // Update staff via Laravel API
      const apiStaff = await staffApi.update(id, updateData);
      // Map API response back to domain model
      return mapStaffApiToDomain(apiStaff as StaffApi.Staff);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['staff-stats'] });
      toast.success('Staff member updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update staff member');
    },
  });
};

// Hook to delete a staff member
export const useDeleteStaff = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await staffApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['staff-stats'] });
      toast.success('Staff member deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete staff member');
    },
  });
};

// Hook to upload staff picture
export const useUploadStaffPicture = () => {
  return useMutation({
    mutationFn: async ({
      staffId,
      file
    }: {
      staffId: string;
      file: File;
    }) => {
      // Upload picture via Laravel API
      const result = await staffApi.uploadPicture(staffId, file);
      return result.url;
    },
  });
};

// Hook to upload staff document
export const useUploadStaffDocument = () => {
  return useMutation({
    mutationFn: async ({
      staffId,
      file,
      documentType,
      description
    }: {
      staffId: string;
      file: File;
      documentType: string;
      description?: string | null;
    }) => {
      // Upload document via Laravel API
      const result = await staffApi.uploadDocument(staffId, file, documentType, description);
      return result;
    },
  });
};

// ============================================================================
// Staff Types Hooks
// ============================================================================

export const useStaffTypes = (organizationId?: string) => {
  const { user, profile } = useAuth();
  const { orgIds: accessibleOrgIds, isLoading: orgsLoading } = useAccessibleOrganizations();

  return useQuery<StaffType[]>({
    queryKey: ['staff-types', organizationId, accessibleOrgIds.join(',')],
    queryFn: async () => {
      if (!user || !profile) return [];
      if (orgsLoading) return [];

      // Fetch staff types from Laravel API
      const params: any = {};
      if (organizationId) {
        params.organization_id = organizationId;
      }

      const apiStaffTypes = await staffTypesApi.list(params);
      // Map API models to domain models
      return (apiStaffTypes as StaffApi.StaffType[]).map(mapStaffTypeApiToDomain);
    },
    enabled: !!user && !!profile && !orgsLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};

export const useCreateStaffType = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const { primaryOrgId } = useAccessibleOrganizations();

  return useMutation({
    mutationFn: async (typeData: Partial<StaffType>) => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      // Get organization_id - use provided or user's primary org
      let organizationId = typeData.organizationId;
      if (organizationId === undefined) {
        if (primaryOrgId) {
          organizationId = primaryOrgId;
        } else if (profile.organization_id) {
          organizationId = profile.organization_id;
        } else {
          throw new Error('User must be assigned to an organization');
        }
      }

      // Convert domain model to API insert payload
      const insertData = mapStaffTypeDomainToInsert({
        ...typeData,
        organizationId,
      });

      // Create staff type via Laravel API
      const apiStaffType = await staffTypesApi.create(insertData);
      // Map API response back to domain model
      return mapStaffTypeApiToDomain(apiStaffType as StaffApi.StaffType);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-types'] });
      toast.success('Staff type created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create staff type');
    },
  });
};

export const useUpdateStaffType = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<StaffType> & { id: string }) => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      // Convert domain model to API update payload
      const updateData = mapStaffTypeDomainToUpdate(updates);

      // Update staff type via Laravel API
      const apiStaffType = await staffTypesApi.update(id, updateData);
      // Map API response back to domain model
      return mapStaffTypeApiToDomain(apiStaffType as StaffApi.StaffType);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-types'] });
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Staff type updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update staff type');
    },
  });
};

export const useDeleteStaffType = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      // Delete staff type via Laravel API
      await staffTypesApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-types'] });
      toast.success('Staff type deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete staff type');
    },
  });
};

// ============================================================================
// Staff Documents Hooks
// ============================================================================

export const useStaffDocuments = (staffId: string) => {
  const { user, profile } = useAuth();

  return useQuery<StaffDocument[]>({
    queryKey: ['staff-files', staffId],
    queryFn: async () => {
      if (!user || !profile) return [];

      // Fetch documents from Laravel API
      const apiDocuments = await staffDocumentsApi.list(staffId);
      // Map API models to domain models
      return (apiDocuments as StaffApi.StaffDocument[]).map(mapStaffDocumentApiToDomain);
    },
    enabled: !!user && !!profile && !!staffId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};

export const useDeleteStaffDocument = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (documentId: string) => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      // Delete document via Laravel API
      await staffDocumentsApi.delete(documentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-files'] });
      toast.success('Document deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete document');
    },
  });
};
