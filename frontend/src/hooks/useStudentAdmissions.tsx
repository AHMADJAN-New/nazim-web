import type { QueryClient } from '@tanstack/react-query';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useAuth } from './useAuth';
import { usePagination } from './usePagination';

import { studentAdmissionsApi } from '@/lib/api/client';
import { showToast } from '@/lib/toast';
import { mapStudentAdmissionApiToDomain, mapStudentAdmissionDomainToInsert, mapStudentAdmissionDomainToUpdate, mapAdmissionStatsApiToDomain } from '@/mappers/studentAdmissionMapper';
import type * as StudentAdmissionApi from '@/types/api/studentAdmission';
import type { StudentAdmission, StudentAdmissionInsert, StudentAdmissionUpdate, AdmissionStatus, AdmissionStats } from '@/types/domain/studentAdmission';
import type { PaginatedResponse, PaginationMeta } from '@/types/pagination';

/** Immediate list refresh: merge API response into every cached student-admissions query (paginated or not). */
function mergeUpdatedAdmissionIntoStudentAdmissionsCaches(
  queryClient: QueryClient,
  updated: StudentAdmission
): void {
  queryClient.setQueriesData({ queryKey: ['student-admissions'] }, (old: unknown) => {
    if (!old) return old;
    if (Array.isArray(old)) {
      const list = old as StudentAdmission[];
      const idx = list.findIndex((a) => a.id === updated.id);
      if (idx === -1) return old;
      const next = [...list];
      next[idx] = updated;
      return next;
    }
    if (typeof old === 'object' && old !== null && 'data' in old) {
      const pr = old as PaginatedResponse<StudentAdmission>;
      if (!Array.isArray(pr.data)) return old;
      const idx = pr.data.findIndex((a) => a.id === updated.id);
      if (idx === -1) return old;
      const nextData = [...pr.data];
      nextData[idx] = updated;
      return { ...pr, data: nextData };
    }
    return old;
  });
}

function removeAdmissionFromStudentAdmissionsCaches(queryClient: QueryClient, id: string): void {
  queryClient.setQueriesData({ queryKey: ['student-admissions'] }, (old: unknown) => {
    if (!old) return old;
    if (Array.isArray(old)) {
      return (old as StudentAdmission[]).filter((a) => a.id !== id);
    }
    if (typeof old === 'object' && old !== null && 'data' in old) {
      const pr = old as PaginatedResponse<StudentAdmission>;
      if (!Array.isArray(pr.data)) return old;
      return { ...pr, data: pr.data.filter((a) => a.id !== id) };
    }
    return old;
  });
}

async function refetchAllStudentAdmissionListQueries(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({
    queryKey: ['student-admissions'],
    refetchType: 'all',
  });
}

// Re-export domain types for convenience
export type { StudentAdmission, StudentAdmissionInsert, StudentAdmissionUpdate, AdmissionStatus, AdmissionStats } from '@/types/domain/studentAdmission';

export interface StudentAdmissionFilters {
  search?: string;
  student_id?: string;
  enrollment_status?: string;
  academic_year_id?: string;
  class_id?: string;
  class_academic_year_id?: string;
  residency_type_id?: string;
  is_boarder?: boolean;
  school_id?: string;
}

export const useStudentAdmissions = (
  organizationId?: string, 
  usePaginated?: boolean,
  filters?: StudentAdmissionFilters,
  enabled = true
) => {
  const { user, profile } = useAuth();
  const { page, pageSize, setPage, setPageSize, updateFromMeta, paginationState } = usePagination({
    initialPage: 1,
    initialPageSize: 25,
  });

  // Create filter key for queryKey (for proper cache invalidation)
  const filterKey = filters ? JSON.stringify(filters) : undefined;

  const { data, isLoading, error, refetch } = useQuery<StudentAdmission[] | PaginatedResponse<StudentAdmissionApi.StudentAdmission>>({
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
          student_id?: string;
          page?: number; 
          per_page?: number;
          enrollment_status?: string;
          academic_year_id?: string;
          class_id?: string;
          class_academic_year_id?: string;
          residency_type_id?: string;
          is_boarder?: boolean;
          search?: string;
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
          if (filters.student_id) {
            params.student_id = filters.student_id;
          }
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
          if (filters.residency_type_id) {
            params.residency_type_id = filters.residency_type_id;
          }
          if (typeof filters.is_boarder === 'boolean') {
            params.is_boarder = filters.is_boarder;
          }
          if (filters.search) {
            params.search = filters.search;
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
    enabled: enabled && !!user && !!profile,
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
      refetch,
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
    refetch,
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
    onSuccess: async () => {
      showToast.success('toast.studentAdmissions.admitted');
      await refetchAllStudentAdmissionListQueries(queryClient);
      void queryClient.invalidateQueries({ queryKey: ['student-admissions-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['students'] });
      void queryClient.invalidateQueries({ queryKey: ['hostel-overview'] });
      void queryClient.refetchQueries({ queryKey: ['hostel-overview'] });
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
    onSuccess: async (updated) => {
      showToast.success('toast.studentAdmissions.updated');
      mergeUpdatedAdmissionIntoStudentAdmissionsCaches(queryClient, updated);
      void queryClient.invalidateQueries({ queryKey: ['student-admissions-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['students'] });
      void queryClient.invalidateQueries({ queryKey: ['hostel-overview'] });
      void queryClient.refetchQueries({ queryKey: ['hostel-overview'] });
      // Background sync so filters / pagination totals stay correct without a full page reload.
      void refetchAllStudentAdmissionListQueries(queryClient);
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
    onSuccess: async (id) => {
      showToast.success('toast.studentAdmissions.removed');
      removeAdmissionFromStudentAdmissionsCaches(queryClient, id);
      void queryClient.invalidateQueries({ queryKey: ['student-admissions-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['students'] });
      void queryClient.invalidateQueries({ queryKey: ['hostel-overview'] });
      void refetchAllStudentAdmissionListQueries(queryClient);
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
    onSuccess: async (result) => {
      showToast.success(result.message || `${result.deactivated_count} student(s) deactivated successfully`);
      await refetchAllStudentAdmissionListQueries(queryClient);
      void queryClient.invalidateQueries({ queryKey: ['student-admissions-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['students'] });
      void queryClient.invalidateQueries({ queryKey: ['hostel-overview'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.studentAdmissions.bulkDeactivateFailed' || 'Failed to deactivate students');
    },
  });
};

export const useBulkUpdateAdmissionStatus = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      admission_ids: string[];
      enrollment_status: AdmissionStatus;
    }) => {
      if (!profile) {
        throw new Error('User not authenticated');
      }

      const result = await studentAdmissionsApi.bulkStatus(data);

      return result as {
        message: string;
        updated_count: number;
        skipped_count: number;
        total_processed: number;
        enrollment_status: AdmissionStatus;
      };
    },
    onSuccess: async (result) => {
      showToast.success(result.message || `${result.updated_count} admission(s) updated successfully`);
      await refetchAllStudentAdmissionListQueries(queryClient);
      void queryClient.invalidateQueries({ queryKey: ['student-admissions-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['students'] });
      void queryClient.invalidateQueries({ queryKey: ['hostel-overview'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to update admissions');
    },
  });
};

export const useBulkAssignAdmissionPlacement = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      student_ids?: string[];
      admission_ids?: string[];
      class_academic_year_id: string;
      is_boarder: boolean;
      residency_type_id?: string | null;
      room_id?: string | null;
      enrollment_status?: StudentAdmissionApi.StudentAdmission['enrollment_status'];
      shift?: string | null;
      placement_notes?: string | null;
      only_without_class?: boolean;
    }) => {
      if (!profile) {
        throw new Error('User not authenticated');
      }

      return studentAdmissionsApi.bulkAssignPlacement(data);
    },
    onSuccess: async (result) => {
      const errors = Array.isArray(result.errors) ? result.errors : [];
      const errCount = errors.length;
      const updated = result.updated_count ?? 0;
      const skipped = result.skipped_count ?? 0;
      const resolutionReasons = new Set([
        'no_unassigned_admission_for_year',
        'no_admission_for_year',
        'student_not_found',
      ]);
      const allResolutionLike =
        errCount > 0 &&
        updated === 0 &&
        errors.every(
          (e: { reason?: string }) => typeof e.reason === 'string' && resolutionReasons.has(e.reason)
        );

      if (errCount > 0 && updated > 0) {
        showToast.warning('admissions.bulkAssignPlacementPartial', {
          updated,
          skipped: skipped + errCount,
        });
      } else if (allResolutionLike) {
        showToast.warning('admissions.bulkAssignPlacementNoneResolved', { count: errCount });
      } else if (errCount > 0 && updated === 0) {
        showToast.warning('admissions.bulkAssignPlacementPartial', {
          updated: 0,
          skipped: skipped + errCount,
        });
      } else if (updated === 0 && skipped > 0) {
        showToast.info('admissions.bulkAssignPlacementNoop', { skipped });
      } else {
        showToast.success('admissions.bulkAssignPlacementSuccess', { updated });
      }
      await refetchAllStudentAdmissionListQueries(queryClient);
      void queryClient.invalidateQueries({ queryKey: ['student-admissions-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['students'] });
      void queryClient.invalidateQueries({ queryKey: ['hostel-overview'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'admissions.bulkAssignPlacementFailed');
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
    onSuccess: async (result) => {
      showToast.success(result.message || `${result.deactivated_count} student(s) deactivated successfully`);
      await refetchAllStudentAdmissionListQueries(queryClient);
      void queryClient.invalidateQueries({ queryKey: ['student-admissions-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['students'] });
      void queryClient.invalidateQueries({ queryKey: ['hostel-overview'] });
      void queryClient.invalidateQueries({ queryKey: ['graduation-batch'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.studentAdmissions.bulkDeactivateFailed' || 'Failed to deactivate students');
    },
  });
};
