import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { showToast } from '@/lib/toast';
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
import type { PaginatedResponse, PaginationMeta } from '@/types/pagination';
import { usePagination } from './usePagination';
import { useEffect } from 'react';

// Re-export domain types for convenience
export type { Staff, StaffType, StaffDocument, StaffStats, StaffStatus } from '@/types/domain/staff';

// Hook to fetch all staff with organization filtering
export const useStaff = (organizationId?: string, usePaginated?: boolean) => {
  const { user, profile } = useAuth();
  const { orgIds, isLoading: orgsLoading } = useAccessibleOrganizations();
  const orgId = organizationId || profile?.organization_id || null;
  const { page, pageSize, setPage, setPageSize, updateFromMeta, paginationState } = usePagination({
    initialPage: 1,
    initialPageSize: 25,
  });

  const { data, isLoading, error, refetch } = useQuery<Staff[] | PaginatedResponse<StaffApi.Staff>>({
    queryKey: [
      'staff',
      orgId,
      orgIds.join(','),
      profile?.default_school_id ?? null,
      usePaginated ? page : undefined,
      usePaginated ? pageSize : undefined,
    ],
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

      // Add pagination params if using pagination
      if (usePaginated) {
        params.page = page;
        params.per_page = pageSize;
      }

      const apiStaff = await staffApi.list(params);

      // Check if response is paginated (Laravel returns meta fields directly, not nested)
      if (usePaginated && apiStaff && typeof apiStaff === 'object' && 'data' in apiStaff && 'current_page' in apiStaff) {
        // Laravel's paginated response has data and meta fields at the same level
        const paginatedResponse = apiStaff as any;
        // Map API models to domain models
        const staff = (paginatedResponse.data as StaffApi.Staff[]).map(mapStaffApiToDomain);
        // Extract meta from Laravel's response structure
        const meta: PaginationMeta = {
          current_page: paginatedResponse.current_page,
          from: paginatedResponse.from,
          last_page: paginatedResponse.last_page,
          per_page: paginatedResponse.per_page,
          to: paginatedResponse.to,
          total: paginatedResponse.total,
          path: paginatedResponse.path,
          first_page_url: paginatedResponse.first_page_url,
          last_page_url: paginatedResponse.last_page_url,
          next_page_url: paginatedResponse.next_page_url,
          prev_page_url: paginatedResponse.prev_page_url,
        };
        return { data: staff, meta } as PaginatedResponse<StaffApi.Staff>;
      }

      // Map API models to domain models (non-paginated)
      return (apiStaff as StaffApi.Staff[]).map(mapStaffApiToDomain);
    },
    enabled: !!user && !!profile && !!profile.default_school_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Update pagination state from API response
  useEffect(() => {
    if (usePaginated && data && typeof data === 'object' && 'meta' in data) {
      updateFromMeta((data as PaginatedResponse<StaffApi.Staff>).meta);
    }
  }, [data, usePaginated, updateFromMeta]);

  // Return appropriate format based on pagination mode
  if (usePaginated) {
    const paginatedData = data as PaginatedResponse<StaffApi.Staff> | undefined;
    return {
      data: paginatedData?.data || [],
      isLoading,
      error,
      pagination: paginatedData?.meta ?? null,
      paginationState,
      page,
      pageSize,
      setPage,
      setPageSize,
      refetch,
    };
  }

  return {
    data: data as Staff[] | undefined,
    isLoading,
    error,
    refetch,
  };
};

// Hook to fetch a single staff member
export const useStaffMember = (staffId: string) => {
  const { profile } = useAuth();
  return useQuery<Staff>({
    queryKey: ['staff', staffId, profile?.default_school_id ?? null],
    queryFn: async () => {
      const apiStaff = await staffApi.get(staffId);
      return mapStaffApiToDomain(apiStaff as StaffApi.Staff);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false, // REQUIRED: Performance optimization
    refetchOnReconnect: false, // REQUIRED: Performance optimization
    enabled: !!profile?.default_school_id,
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
    onSuccess: async (data, variables) => {
      // CRITICAL: Use both invalidateQueries AND refetchQueries for immediate UI updates
      await queryClient.invalidateQueries({ queryKey: ['staff'] });
      await queryClient.refetchQueries({ queryKey: ['staff'] });
      if (variables.organizationId) {
        await queryClient.invalidateQueries({ queryKey: ['staff', variables.organizationId] });
        await queryClient.refetchQueries({ queryKey: ['staff', variables.organizationId] });
      }
      await queryClient.invalidateQueries({ queryKey: ['staff-stats'] });
      await queryClient.refetchQueries({ queryKey: ['staff-stats'] });
      showToast.success('toast.staff.created');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.staff.createFailed');
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
    onSuccess: async () => {
      // CRITICAL: Use both invalidateQueries AND refetchQueries for immediate UI updates
      await queryClient.invalidateQueries({ queryKey: ['staff'] });
      await queryClient.refetchQueries({ queryKey: ['staff'] });
      await queryClient.invalidateQueries({ queryKey: ['staff-stats'] });
      await queryClient.refetchQueries({ queryKey: ['staff-stats'] });
      showToast.success('toast.staff.updated');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.staff.updateFailed');
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
    onSuccess: async () => {
      // CRITICAL: Use both invalidateQueries AND refetchQueries for immediate UI updates
      await queryClient.invalidateQueries({ queryKey: ['staff'] });
      await queryClient.refetchQueries({ queryKey: ['staff'] });
      await queryClient.invalidateQueries({ queryKey: ['staff-stats'] });
      await queryClient.refetchQueries({ queryKey: ['staff-stats'] });
      showToast.success('toast.staff.deleted');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.staff.deleteFailed');
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
      showToast.success('toast.staffTypes.created');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.staffTypes.createFailed');
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
      showToast.success('toast.staffTypes.updated');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.staffTypes.updateFailed');
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
      showToast.success('toast.staffTypes.deleted');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.staffTypes.deleteFailed');
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
      showToast.success('toast.staff.documentDeleted');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.staff.documentDeleteFailed');
    },
  });
};
