import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { showToast } from '@/lib/toast';
import { useAuth } from './useAuth';
import { studentAdmissionsApi } from '@/lib/api/client';
import type * as StudentAdmissionApi from '@/types/api/studentAdmission';
import type { StudentAdmission, StudentAdmissionInsert, StudentAdmissionUpdate, AdmissionStatus, AdmissionStats } from '@/types/domain/studentAdmission';
import { mapStudentAdmissionApiToDomain, mapStudentAdmissionDomainToInsert, mapStudentAdmissionDomainToUpdate, mapAdmissionStatsApiToDomain } from '@/mappers/studentAdmissionMapper';
import type { PaginatedResponse, PaginationMeta } from '@/types/pagination';
import { usePagination } from './usePagination';
import { useEffect } from 'react';

// Re-export domain types for convenience
export type { StudentAdmission, StudentAdmissionInsert, StudentAdmissionUpdate, AdmissionStatus, AdmissionStats } from '@/types/domain/studentAdmission';

export interface StudentAdmissionFilters {
  enrollment_status?: string;
  academic_year_id?: string;
  class_id?: string;
  class_academic_year_id?: string;
  school_id?: string;
}

export const useStudentAdmissions = (
  organizationId?: string, 
  usePaginated?: boolean,
  filters?: StudentAdmissionFilters
) => {
  const { user, profile } = useAuth();
  const { page, pageSize, setPage, setPageSize, updateFromMeta, paginationState } = usePagination({
    initialPage: 1,
    initialPageSize: 25,
  });

  // Create filter key for queryKey (for proper cache invalidation)
  const filterKey = filters ? JSON.stringify(filters) : undefined;

  const { data, isLoading, error } = useQuery<StudentAdmission[] | PaginatedResponse<StudentAdmissionApi.StudentAdmission>>({
    queryKey: ['student-admissions', organizationId ?? profile?.organization_id ?? null, profile?.default_school_id ?? null, usePaginated ? page : undefined, usePaginated ? pageSize : undefined, filterKey],
    queryFn: async () => {
      if (!user || !profile) return [];

      try {
        const effectiveOrgId = organizationId || profile.organization_id;
        if (import.meta.env.DEV) {
          console.log('[useStudentAdmissions] Fetching admissions for organization:', effectiveOrgId, 'with filters:', filters);
        }

        const params: { 
          organization_id?: string; 
          page?: number; 
          per_page?: number;
          enrollment_status?: string;
          academic_year_id?: string;
          class_id?: string;
          class_academic_year_id?: string;
          school_id?: string;
        } = {
          organization_id: effectiveOrgId || undefined,
        };

        // Add pagination params if using pagination
        if (usePaginated) {
          params.page = page;
          params.per_page = pageSize;
        }

        // Add filters if provided
        if (filters) {
          if (filters.enrollment_status) {
            params.enrollment_status = filters.enrollment_status;
          }
          if (filters.academic_year_id) {
            params.academic_year_id = filters.academic_year_id;
          }
          if (filters.class_id) {
            params.class_id = filters.class_id;
          }
          if (filters.class_academic_year_id) {
            params.class_academic_year_id = filters.class_academic_year_id;
          }
          if (filters.school_id) {
            params.school_id = filters.school_id;
          }
        }

        const apiAdmissions = await studentAdmissionsApi.list(params);

        // Check if response is paginated (Laravel returns meta fields directly, not nested)
        if (usePaginated && apiAdmissions && typeof apiAdmissions === 'object' && 'data' in apiAdmissions && 'current_page' in apiAdmissions) {
          // Laravel's paginated response has data and meta fields at the same level
          const paginatedResponse = apiAdmissions as any;
          // Map API → Domain
          const mapped = (paginatedResponse.data as StudentAdmissionApi.StudentAdmission[]).map(mapStudentAdmissionApiToDomain);
          
          if (import.meta.env.DEV) {
            console.log('[useStudentAdmissions] Fetched', mapped.length, 'admissions (paginated)');
          }
          
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
          return { data: mapped, meta } as PaginatedResponse<StudentAdmissionApi.StudentAdmission>;
        }

        // Map API → Domain (non-paginated)
        const mapped = (apiAdmissions as StudentAdmissionApi.StudentAdmission[]).map(mapStudentAdmissionApiToDomain);
        
        if (import.meta.env.DEV) {
          console.log('[useStudentAdmissions] Fetched', mapped.length, 'admissions');
        }
        return mapped;
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[useStudentAdmissions] Error fetching admissions:', error);
        }
        throw error;
      }
    },
    enabled: !!user && !!profile,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Update pagination state from API response
  useEffect(() => {
    if (usePaginated && data && typeof data === 'object' && 'meta' in data) {
      updateFromMeta((data as PaginatedResponse<StudentAdmissionApi.StudentAdmission>).meta);
    }
  }, [data, usePaginated, updateFromMeta]);

  // Return appropriate format based on pagination mode
  if (usePaginated) {
    const paginatedData = data as PaginatedResponse<StudentAdmissionApi.StudentAdmission> | undefined;
    return {
      admissions: paginatedData?.data || [],
      isLoading,
      error,
      pagination: paginatedData?.meta ?? null,
      paginationState,
      page,
      pageSize,
      setPage,
      setPageSize,
    };
  }

  return {
    data: data as StudentAdmission[] | undefined,
    isLoading,
    error,
  };
};

export const useCreateStudentAdmission = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (payload: StudentAdmissionInsert) => {
      const organizationId = payload.organizationId || profile?.organization_id;
      if (!organizationId) {
        throw new Error('Organization is required to admit a student');
      }

      // Prepare domain data with defaults
      const domainData: StudentAdmissionInsert = {
        ...payload,
        organizationId,
        admissionDate: payload.admissionDate || new Date().toISOString().slice(0, 10),
        enrollmentStatus: payload.enrollmentStatus || 'admitted',
        isBoarder: payload.isBoarder ?? false,
      };

      // Map Domain → API
      const insertData = mapStudentAdmissionDomainToInsert(domainData);

      const apiAdmission = await studentAdmissionsApi.create(insertData);
      
      // Map API → Domain
      return mapStudentAdmissionApiToDomain(apiAdmission as StudentAdmissionApi.StudentAdmission);
    },
    onSuccess: () => {
      showToast.success('toast.studentAdmissions.admitted');
      void queryClient.invalidateQueries({ queryKey: ['student-admissions'] });
      void queryClient.invalidateQueries({ queryKey: ['hostel-overview'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.studentAdmissions.admitFailed');
    },
  });
};

export const useUpdateStudentAdmission = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: StudentAdmissionUpdate }) => {
      if (!profile) throw new Error('User not authenticated');

      // Map Domain → API
      const updateData = mapStudentAdmissionDomainToUpdate(data);

      const apiUpdated = await studentAdmissionsApi.update(id, updateData);
      
      // Map API → Domain
      return mapStudentAdmissionApiToDomain(apiUpdated as StudentAdmissionApi.StudentAdmission);
    },
    onSuccess: () => {
      showToast.success('toast.studentAdmissions.updated');
      void queryClient.invalidateQueries({ queryKey: ['student-admissions'] });
      void queryClient.invalidateQueries({ queryKey: ['hostel-overview'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.studentAdmissions.updateFailed');
    },
  });
};

export const useDeleteStudentAdmission = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!profile) {
        throw new Error('User not authenticated');
      }

      await studentAdmissionsApi.delete(id);
      return id;
    },
    onSuccess: () => {
      showToast.success('toast.studentAdmissions.removed');
      void queryClient.invalidateQueries({ queryKey: ['student-admissions'] });
      void queryClient.invalidateQueries({ queryKey: ['hostel-overview'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.studentAdmissions.removeFailed');
    },
  });
};

export const useAdmissionStats = (organizationId?: string) => {
  const { user, profile } = useAuth();

  const { data: stats, isLoading } = useQuery<AdmissionStats>({
    queryKey: ['student-admissions-stats', organizationId ?? profile?.organization_id ?? null, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!user || !profile) {
        return { total: 0, active: 0, pending: 0, boarders: 0 };
      }

      const effectiveOrgId = organizationId || profile.organization_id;
      const apiResult = await studentAdmissionsApi.stats({
        organization_id: effectiveOrgId || undefined,
      });

      // Map API → Domain (no transformation needed, but for consistency)
      return mapAdmissionStatsApiToDomain(apiResult as StudentAdmissionApi.AdmissionStats);
    },
    enabled: !!user && !!profile,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  return { stats: stats || { total: 0, active: 0, pending: 0, boarders: 0 }, isLoading };
};

export const useBulkDeactivateAdmissions = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (admissionIds: string[]) => {
      if (!profile) {
        throw new Error('User not authenticated');
      }

      const result = await studentAdmissionsApi.bulkDeactivate({
        admission_ids: admissionIds,
      });

      return result as {
        message: string;
        deactivated_count: number;
        skipped_count: number;
        total_processed: number;
      };
    },
    onSuccess: (result) => {
      showToast.success(
        `toast.studentAdmissions.bulkDeactivated` || 
        `${result.deactivated_count} student(s) deactivated successfully`
      );
      void queryClient.invalidateQueries({ queryKey: ['student-admissions'] });
      void queryClient.invalidateQueries({ queryKey: ['student-admissions-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['hostel-overview'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.studentAdmissions.bulkDeactivateFailed' || 'Failed to deactivate students');
    },
  });
};

export const useBulkDeactivateAdmissionsByStudentIds = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      student_ids: string[];
      class_id: string;
      academic_year_id: string;
    }) => {
      if (!profile) {
        throw new Error('User not authenticated');
      }

      const result = await studentAdmissionsApi.bulkDeactivateByStudentIds(data);

      return result as {
        message: string;
        deactivated_count: number;
        skipped_count: number;
        total_processed: number;
      };
    },
    onSuccess: (result) => {
      showToast.success(
        `toast.studentAdmissions.bulkDeactivated` || 
        `${result.deactivated_count} student(s) deactivated successfully`
      );
      void queryClient.invalidateQueries({ queryKey: ['student-admissions'] });
      void queryClient.invalidateQueries({ queryKey: ['student-admissions-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['hostel-overview'] });
      void queryClient.invalidateQueries({ queryKey: ['graduation-batch'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.studentAdmissions.bulkDeactivateFailed' || 'Failed to deactivate students');
    },
  });
};
