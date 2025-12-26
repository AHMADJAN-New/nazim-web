import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { showToast } from '@/lib/toast';
import { useAuth } from './useAuth';
import { useLanguage } from './useLanguage';
import { usePagination } from './usePagination';
import {
  feeAssignmentsApi,
  feeExceptionsApi,
  feePaymentsApi,
  feeReportsApi,
  feeStructuresApi,
  studentAdmissionsApi,
} from '@/lib/api/client';
import type * as FeeApi from '@/types/api/fees';
import type { FeeAssignment, FeeException, FeePayment, FeeStructure } from '@/types/domain/fees';
import type { PaginatedResponse, PaginationMeta } from '@/types/pagination';
import {
  mapFeeAssignmentApiToDomain,
  mapFeeAssignmentDomainToInsert,
  mapFeeAssignmentDomainToUpdate,
  mapFeeExceptionApiToDomain,
  mapFeeExceptionDomainToInsert,
  mapFeeExceptionDomainToUpdate,
  mapFeePaymentApiToDomain,
  mapFeePaymentDomainToInsert,
  mapFeePaymentDomainToUpdate,
  mapFeeStructureApiToDomain,
  mapFeeStructureDomainToInsert,
  mapFeeStructureDomainToUpdate,
} from '@/mappers/feeMapper';
import type * as StudentAdmissionApi from '@/types/api/studentAdmission';

const FIVE_MINUTES = 5 * 60 * 1000;

export const useFeeStructures = (
  filters?: {
    academicYearId?: string;
    classId?: string;
    classAcademicYearId?: string;
    isActive?: boolean;
  },
  usePaginated?: boolean
) => {
  const { user, profile } = useAuth();
  const { page, pageSize, setPage, setPageSize, updateFromMeta, paginationState } = usePagination({
    initialPage: 1,
    initialPageSize: 25,
  });

  const { data, isLoading, error } = useQuery<FeeStructure[] | PaginatedResponse<FeeApi.FeeStructure>>({
    queryKey: [
      'fee-structures',
      profile?.organization_id,
      profile?.default_school_id ?? null,
      filters,
      usePaginated ? page : undefined,
      usePaginated ? pageSize : undefined,
    ],
    queryFn: async () => {
      if (!user || !profile) {
        return [];
      }

      const params: any = {
        organization_id: profile.organization_id,
        academic_year_id: filters?.academicYearId,
        class_id: filters?.classId,
        is_active: filters?.isActive,
      };
      
      // Only include class_academic_year_id if it's a valid UUID (not "all")
      if (filters?.classAcademicYearId && filters.classAcademicYearId !== 'all') {
        params.class_academic_year_id = filters.classAcademicYearId;
      }

      // Add pagination params if using pagination
      if (usePaginated) {
        params.page = page;
        params.per_page = pageSize;
      }

      const apiStructures = await feeStructuresApi.list(params);

      // Check if response is paginated (Laravel returns meta fields directly, not nested)
      if (usePaginated && apiStructures && typeof apiStructures === 'object' && 'data' in apiStructures && 'current_page' in apiStructures) {
        const paginatedResponse = apiStructures as any;
        // Map API models to domain models
        const structures = (paginatedResponse.data as FeeApi.FeeStructure[]).map(mapFeeStructureApiToDomain);
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
        return { data: structures, meta } as PaginatedResponse<FeeApi.FeeStructure>;
      }

      // Map API models to domain models (non-paginated or backend doesn't support pagination)
      const structures = (apiStructures as FeeApi.FeeStructure[]).map(mapFeeStructureApiToDomain);
      
      // If pagination was requested but backend returned non-paginated response,
      // wrap it in a paginated response structure for consistency
      if (usePaginated) {
        const meta: PaginationMeta = {
          current_page: 1,
          from: structures.length > 0 ? 1 : null,
          last_page: 1,
          per_page: structures.length,
          to: structures.length,
          total: structures.length,
          path: '',
          first_page_url: '',
          last_page_url: '',
          next_page_url: null,
          prev_page_url: null,
        };
        return { data: structures, meta } as PaginatedResponse<FeeApi.FeeStructure>;
      }

      return structures;
    },
    enabled: !!user && !!profile,
    staleTime: FIVE_MINUTES,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Update pagination state from API response
  useEffect(() => {
    if (usePaginated && data && typeof data === 'object' && 'meta' in data) {
      updateFromMeta((data as PaginatedResponse<FeeApi.FeeStructure>).meta);
    }
  }, [data, usePaginated, updateFromMeta]);

  // Return appropriate format based on pagination mode
  if (usePaginated) {
    const paginatedData = data as PaginatedResponse<FeeApi.FeeStructure> | undefined;
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
    };
  }

  return {
    data: data as FeeStructure[] | undefined,
    isLoading,
    error,
  };
};

export const useCreateFeeStructure = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (payload: Partial<FeeStructure>) => {
      if (!profile?.organization_id) {
        throw new Error('toast.organizationRequired');
      }

      const insert = mapFeeStructureDomainToInsert({
        ...payload,
        organizationId: profile.organization_id,
      });
      const apiStructure = await feeStructuresApi.create(insert);
      return mapFeeStructureApiToDomain(apiStructure as FeeApi.FeeStructure);
    },
    onSuccess: () => {
      showToast.success(t('toast.feeStructureCreated'));
      void queryClient.invalidateQueries({ queryKey: ['fee-structures'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.feeStructureCreateFailed'));
    },
  });
};

export const useUpdateFeeStructure = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FeeStructure> }) => {
      const updateData = mapFeeStructureDomainToUpdate(data);
      const apiStructure = await feeStructuresApi.update(id, updateData);
      return mapFeeStructureApiToDomain(apiStructure as FeeApi.FeeStructure);
    },
    onSuccess: () => {
      showToast.success(t('toast.feeStructureUpdated'));
      void queryClient.invalidateQueries({ queryKey: ['fee-structures'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.feeStructureUpdateFailed'));
    },
  });
};

export const useDeleteFeeStructure = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (id: string) => {
      await feeStructuresApi.delete(id);
      return id;
    },
    onSuccess: () => {
      showToast.success(t('toast.feeStructureDeleted'));
      void queryClient.invalidateQueries({ queryKey: ['fee-structures'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.feeStructureDeleteFailed'));
    },
  });
};

export const useFeeAssignments = (
  filters?: {
    studentId?: string;
    studentAdmissionId?: string;
    academicYearId?: string;
    classAcademicYearId?: string;
    classId?: string;
    status?: string;
  },
  usePaginated?: boolean
) => {
  const { user, profile } = useAuth();
  const { page, pageSize, setPage, setPageSize, updateFromMeta, paginationState } = usePagination({
    initialPage: 1,
    initialPageSize: 25,
  });

  const { data, isLoading, error } = useQuery<FeeAssignment[] | PaginatedResponse<FeeApi.FeeAssignment>>({
    queryKey: [
      'fee-assignments',
      profile?.organization_id,
      profile?.default_school_id ?? null,
      filters,
      usePaginated ? page : undefined,
      usePaginated ? pageSize : undefined,
    ],
    queryFn: async () => {
      if (!user || !profile) return [];

      const params: any = {
        organization_id: profile.organization_id,
        student_id: filters?.studentId,
        student_admission_id: filters?.studentAdmissionId,
        academic_year_id: filters?.academicYearId,
        class_id: filters?.classId,
        status: filters?.status,
      };
      
      // Only include class_academic_year_id if it's a valid UUID (not "all")
      if (filters?.classAcademicYearId && filters.classAcademicYearId !== 'all') {
        params.class_academic_year_id = filters.classAcademicYearId;
      }

      // Add pagination params if using pagination
      if (usePaginated) {
        params.page = page;
        params.per_page = pageSize;
      }

      const apiAssignments = await feeAssignmentsApi.list(params);

      // Check if response is paginated (Laravel returns meta fields directly, not nested)
      if (usePaginated && apiAssignments && typeof apiAssignments === 'object' && 'data' in apiAssignments && 'current_page' in apiAssignments) {
        const paginatedResponse = apiAssignments as any;
        // Map assignments and preserve student relationship data
        const assignments = (paginatedResponse.data as any[]).map((api) => {
          const mapped = mapFeeAssignmentApiToDomain(api as FeeApi.FeeAssignment);
          // Preserve student data if available
          if (api.student) {
            (mapped as any).student = api.student;
          }
          return mapped;
        });
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
        return { data: assignments, meta } as PaginatedResponse<FeeApi.FeeAssignment>;
      }

      // Map assignments and preserve student relationship data (non-paginated)
      const assignments = (apiAssignments as any[]).map((api) => {
        const mapped = mapFeeAssignmentApiToDomain(api as FeeApi.FeeAssignment);
        // Preserve student data if available
        if (api.student) {
          (mapped as any).student = api.student;
        }
        return mapped;
      });

      // If pagination was requested but backend returned non-paginated response,
      // wrap it in a paginated response structure for consistency
      if (usePaginated) {
        const meta: PaginationMeta = {
          current_page: 1,
          from: assignments.length > 0 ? 1 : null,
          last_page: 1,
          per_page: assignments.length,
          to: assignments.length,
          total: assignments.length,
          path: '',
          first_page_url: '',
          last_page_url: '',
          next_page_url: null,
          prev_page_url: null,
        };
        return { data: assignments, meta } as PaginatedResponse<FeeApi.FeeAssignment>;
      }

      return assignments;
    },
    enabled: !!user && !!profile,
    staleTime: FIVE_MINUTES,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Update pagination state from API response
  useEffect(() => {
    if (usePaginated && data && typeof data === 'object' && 'meta' in data) {
      updateFromMeta((data as PaginatedResponse<FeeApi.FeeAssignment>).meta);
    }
  }, [data, usePaginated, updateFromMeta]);

  // Return appropriate format based on pagination mode
  if (usePaginated) {
    const paginatedData = data as PaginatedResponse<FeeApi.FeeAssignment> | undefined;
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
    };
  }

  return {
    data: data as FeeAssignment[] | undefined,
    isLoading,
    error,
  };
};

export const useCreateFeeAssignment = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (payload: Partial<FeeAssignment>) => {
      if (!profile?.organization_id) {
        throw new Error('toast.organizationRequired');
      }
      const insert = mapFeeAssignmentDomainToInsert({
        ...payload,
        organizationId: profile.organization_id,
      });
      const apiAssignment = await feeAssignmentsApi.create(insert);
      return mapFeeAssignmentApiToDomain(apiAssignment as FeeApi.FeeAssignment);
    },
    onSuccess: async () => {
      showToast.success(t('toast.feeAssignmentCreated'));
      await queryClient.invalidateQueries({ queryKey: ['fee-assignments'] });
      await queryClient.refetchQueries({ queryKey: ['fee-assignments'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.feeAssignmentCreateFailed'));
    },
  });
};

export const useUpdateFeeAssignment = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FeeAssignment> }) => {
      if (!profile?.organization_id) {
        throw new Error('toast.organizationRequired');
      }

      const updateData = mapFeeAssignmentDomainToUpdate(data);
      const apiAssignment = await feeAssignmentsApi.update(id, updateData);
      return mapFeeAssignmentApiToDomain(apiAssignment as FeeApi.FeeAssignment);
    },
    onSuccess: async () => {
      showToast.success(t('toast.feeAssignmentUpdated'));
      await queryClient.invalidateQueries({ queryKey: ['fee-assignments'] });
      await queryClient.refetchQueries({ queryKey: ['fee-assignments'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.feeAssignmentUpdateFailed'));
    },
  });
};

export const useDeleteFeeAssignment = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (id: string) => {
      await feeAssignmentsApi.delete(id);
    },
    onSuccess: async () => {
      showToast.success(t('toast.feeAssignmentDeleted'));
      await queryClient.invalidateQueries({ queryKey: ['fee-assignments'] });
      await queryClient.refetchQueries({ queryKey: ['fee-assignments'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.feeAssignmentDeleteFailed'));
    },
  });
};

export const useBulkAssignFeeAssignments = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { t } = useLanguage();

  const getErrorMessage = (error: any) => {
    const responseData = error?.response?.data;

    // Laravel validation errors: { errors: { field: ['msg'] } }
    const firstValidation =
      responseData?.errors &&
      Object.values(responseData.errors)
        .flat()
        .find(Boolean);

    if (firstValidation) return String(firstValidation);

    const apiMessage =
      responseData?.error ||
      responseData?.message ||
      error?.message ||
      t('toast.feeAssignmentCreateFailed');

    // If backend intentionally returns a translation key, allow it through
    if (typeof apiMessage === 'string' && apiMessage.startsWith('toast.')) {
      return apiMessage;
    }

    return apiMessage || t('toast.feeAssignmentCreateFailed');
  };

  return useMutation({
    mutationFn: async (payload: {
      feeStructureId: string;
      academicYearId: string;
      classId: string;
      classAcademicYearId?: string | null;
      assignedAmount?: number;
      dueDate: string;
      paymentPeriodStart?: string | null;
      paymentPeriodEnd?: string | null;
      notes?: string | null;
      schoolId?: string | null;
    }) => {
      if (!profile?.organization_id) {
        throw new Error('toast.organizationRequired');
      }

      const structure = (await feeStructuresApi.get(payload.feeStructureId)) as FeeApi.FeeStructure;

      const admissions = (await studentAdmissionsApi.list({
        organization_id: profile.organization_id,
        academic_year_id: payload.academicYearId,
        class_id: payload.classId,
      })) as StudentAdmissionApi.StudentAdmission[];

      if (!admissions.length) {
        throw new Error('toast.feeAssignmentsNoStudentsForClass');
      }

      const baseAmount = payload.assignedAmount ?? structure.amount ?? 0;
      const currencyId = structure.currency_id ?? null;
      const dueDate = payload.dueDate ? new Date(payload.dueDate) : undefined;
      const paymentPeriodStart = payload.paymentPeriodStart ? new Date(payload.paymentPeriodStart) : null;
      const paymentPeriodEnd = payload.paymentPeriodEnd ? new Date(payload.paymentPeriodEnd) : null;

      await Promise.all(
        admissions.map((admission) => {
          const insert = mapFeeAssignmentDomainToInsert({
            organizationId: profile.organization_id,
            schoolId: payload.schoolId ?? admission.school_id ?? null,
            studentId: admission.student_id,
            studentAdmissionId: admission.id,
            feeStructureId: payload.feeStructureId,
            academicYearId: payload.academicYearId,
            classAcademicYearId: payload.classAcademicYearId ?? null,
            originalAmount: baseAmount,
            assignedAmount: baseAmount,
            currencyId,
            paymentPeriodStart,
            paymentPeriodEnd,
            dueDate,
            notes: payload.notes ?? null,
          });

          return feeAssignmentsApi.create(insert);
        }),
      );

      return { created: admissions.length };
    },
    onSuccess: async () => {
      showToast.success(t('toast.feeAssignmentCreated'));
      await queryClient.invalidateQueries({ queryKey: ['fee-assignments'] });
      await queryClient.refetchQueries({ queryKey: ['fee-assignments'] });
    },
    onError: (error: any) => {
      const message = getErrorMessage(error);
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.error('[useBulkAssignFeeAssignments] failed', error);
      }
      showToast.error(message);
    },
  });
};

export const useFeePayments = (
  filters?: {
    feeAssignmentId?: string;
    studentId?: string;
    paymentDateFrom?: string;
    paymentDateTo?: string;
  },
  usePaginated?: boolean
) => {
  const { user, profile } = useAuth();
  const { page, pageSize, setPage, setPageSize, updateFromMeta, paginationState } = usePagination({
    initialPage: 1,
    initialPageSize: 25,
  });

  const { data, isLoading, error } = useQuery<FeePayment[] | PaginatedResponse<FeeApi.FeePayment>>({
    queryKey: [
      'fee-payments',
      profile?.organization_id,
      profile?.default_school_id ?? null,
      filters,
      usePaginated ? page : undefined,
      usePaginated ? pageSize : undefined,
    ],
    queryFn: async () => {
      if (!user || !profile) return [];

      const params: any = {
        fee_assignment_id: filters?.feeAssignmentId,
        student_id: filters?.studentId,
        payment_date_from: filters?.paymentDateFrom,
        payment_date_to: filters?.paymentDateTo,
      };

      // Add pagination params if using pagination
      if (usePaginated) {
        params.page = page;
        params.per_page = pageSize;
      }

      const apiPayments = await feePaymentsApi.list(params);

      // Check if response is paginated (Laravel returns meta fields directly, not nested)
      if (usePaginated && apiPayments && typeof apiPayments === 'object' && 'data' in apiPayments && 'current_page' in apiPayments) {
        const paginatedResponse = apiPayments as any;
        // Map API models to domain models
        const payments = (paginatedResponse.data as FeeApi.FeePayment[]).map(mapFeePaymentApiToDomain);
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
        return { data: payments, meta } as PaginatedResponse<FeeApi.FeePayment>;
      }

      // Map API models to domain models (non-paginated)
      const payments = (apiPayments as FeeApi.FeePayment[]).map(mapFeePaymentApiToDomain);

      // If pagination was requested but backend returned non-paginated response,
      // wrap it in a paginated response structure for consistency
      if (usePaginated) {
        const meta: PaginationMeta = {
          current_page: 1,
          from: payments.length > 0 ? 1 : null,
          last_page: 1,
          per_page: payments.length,
          to: payments.length,
          total: payments.length,
          path: '',
          first_page_url: '',
          last_page_url: '',
          next_page_url: null,
          prev_page_url: null,
        };
        return { data: payments, meta } as PaginatedResponse<FeeApi.FeePayment>;
      }

      return payments;
    },
    enabled: !!user && !!profile && !!profile.default_school_id,
    staleTime: FIVE_MINUTES,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Update pagination state from API response
  useEffect(() => {
    if (usePaginated && data && typeof data === 'object' && 'meta' in data) {
      updateFromMeta((data as PaginatedResponse<FeeApi.FeePayment>).meta);
    }
  }, [data, usePaginated, updateFromMeta]);

  // Return appropriate format based on pagination mode
  if (usePaginated) {
    const paginatedData = data as PaginatedResponse<FeeApi.FeePayment> | undefined;
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
    };
  }

  return {
    data: data as FeePayment[] | undefined,
    isLoading,
    error,
  };
};

export const useCreateFeePayment = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (payload: Partial<FeePayment>) => {
      if (!profile?.organization_id) {
        throw new Error('toast.organizationRequired');
      }

      const insert = mapFeePaymentDomainToInsert({
        ...payload,
        organizationId: profile.organization_id,
      });
      const apiPayment = await feePaymentsApi.create(insert);
      return mapFeePaymentApiToDomain(apiPayment as FeeApi.FeePayment);
    },
    onSuccess: () => {
      showToast.success(t('toast.feePaymentRecorded'));
      void queryClient.invalidateQueries({ queryKey: ['fee-payments'] });
      void queryClient.invalidateQueries({ queryKey: ['fee-assignments'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.feePaymentFailed'));
    },
  });
};

export const useFeeExceptions = (filters?: {
  academicYearId?: string;
  classAcademicYearId?: string;
  studentId?: string;
  feeAssignmentId?: string;
  exceptionType?: string;
  isActive?: boolean;
}) => {
  const { user, profile } = useAuth();

  return useQuery<FeeException[]>({
    queryKey: ['fee-exceptions', profile?.organization_id, profile?.default_school_id ?? null, filters],
    queryFn: async () => {
      if (!user || !profile || !profile.organization_id) {
        if (import.meta.env.DEV) {
          console.log('[useFeeExceptions] Missing user, profile, or organization_id');
        }
        return [];
      }

      try {
        const apiExceptions = await feeExceptionsApi.list({
          organization_id: profile.organization_id,
          academic_year_id: filters?.academicYearId,
          class_academic_year_id: filters?.classAcademicYearId,
          student_id: filters?.studentId,
          fee_assignment_id: filters?.feeAssignmentId,
          exception_type: filters?.exceptionType,
          is_active: filters?.isActive,
        });

        if (import.meta.env.DEV) {
          console.log('[useFeeExceptions] Fetched', Array.isArray(apiExceptions) ? apiExceptions.length : 0, 'exceptions');
        }

        // Handle both array and object responses
        const exceptionsArray = Array.isArray(apiExceptions) ? apiExceptions : [];
        return exceptionsArray.map(mapFeeExceptionApiToDomain);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[useFeeExceptions] Error fetching exceptions:', error);
        }
        throw error;
      }
    },
    enabled: !!user && !!profile && !!profile.organization_id,
    staleTime: FIVE_MINUTES,
    refetchOnWindowFocus: false,
  });
};

export const useCreateFeeException = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (payload: Partial<FeeException>) => {
      if (!profile?.organization_id) {
        throw new Error('toast.organizationRequired');
      }

      const insert = mapFeeExceptionDomainToInsert({
        ...payload,
        organizationId: profile.organization_id,
      });
      const apiException = await feeExceptionsApi.create(insert);
      return mapFeeExceptionApiToDomain(apiException as FeeApi.FeeException);
    },
    onSuccess: async () => {
      showToast.success(t('toast.feeExceptionCreated'));
      await queryClient.invalidateQueries({ queryKey: ['fee-exceptions'] });
      await queryClient.invalidateQueries({ queryKey: ['fee-assignments'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.feeExceptionFailed'));
    },
  });
};

export const useUpdateFeeException = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FeeException> & { id: string }) => {
      if (!profile?.organization_id) {
        throw new Error('toast.organizationRequired');
      }

      const updateData = mapFeeExceptionDomainToUpdate(updates);
      const apiException = await feeExceptionsApi.update(id, updateData);
      return mapFeeExceptionApiToDomain(apiException as FeeApi.FeeException);
    },
    onSuccess: async () => {
      showToast.success(t('toast.feeExceptionUpdated'));
      await queryClient.invalidateQueries({ queryKey: ['fee-exceptions'] });
      await queryClient.invalidateQueries({ queryKey: ['fee-assignments'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.feeExceptionUpdateFailed'));
    },
  });
};

export const useDeleteFeeException = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!profile?.organization_id) {
        throw new Error('toast.organizationRequired');
      }

      await feeExceptionsApi.delete(id);
    },
    onSuccess: async () => {
      showToast.success(t('toast.feeExceptionDeleted'));
      await queryClient.invalidateQueries({ queryKey: ['fee-exceptions'] });
      await queryClient.refetchQueries({ queryKey: ['fee-exceptions'] });
      await queryClient.invalidateQueries({ queryKey: ['fee-assignments'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.feeExceptionDeleteFailed'));
    },
  });
};

// Fee Reports Hooks

export interface FeeReportDashboard {
  summary: {
    totalAssignments: number;
    totalStudents: number;
    totalAssigned: number;
    totalPaid: number;
    totalRemaining: number;
    collectionRate: number;
    statusCounts: {
      paid: number;
      partial: number;
      pending: number;
      overdue: number;
      waived: number;
    };
  };
  byClass: Array<{
    classAcademicYearId: string;
    classId: string;
    className: string;
    assignmentCount: number;
    studentCount: number;
    totalAssigned: number;
    totalPaid: number;
    totalRemaining: number;
    collectionPercentage: number;
  }>;
  byStructure: Array<{
    feeStructureId: string;
    structureName: string;
    feeType: string;
    assignmentCount: number;
    totalAssigned: number;
    totalPaid: number;
    totalRemaining: number;
  }>;
  recentPayments: Array<{
    id: string;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    referenceNo: string | null;
    studentName: string | null;
    studentRegistration: string | null;
    feeStructureName: string | null;
  }>;
  exceptions?: {
    totalCount: number;
    totalAmount: number;
    byType: {
      discount_percentage: { count: number; amount: number };
      discount_fixed: { count: number; amount: number };
      waiver: { count: number; amount: number };
      custom: { count: number; amount: number };
    };
    impactOnCollection: {
      originalTotal: number;
      adjustedTotal: number;
      exceptionReduction: number;
    };
  };
}

export interface StudentFeeRecord {
  id: string;
  firstName: string;
  lastName: string;
  fatherName: string;
  registrationNumber: string;
  photoUrl: string | null;
  className: string;
  classAcademicYearId: string;
  assignmentCount: number;
  totalAssigned: number;
  totalPaid: number;
  totalRemaining: number;
  overallStatus: 'paid' | 'partial' | 'pending' | 'overdue';
}

export interface FeeDefaulter {
  assignmentId: string;
  studentId: string;
  firstName: string;
  lastName: string;
  fatherName: string;
  registrationNumber: string;
  phone: string | null;
  className: string;
  feeStructureName: string;
  assignedAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string | null;
  status: string;
}

const mapDashboardResponse = (data: any): FeeReportDashboard => ({
  summary: {
    totalAssignments: data.summary.total_assignments,
    totalStudents: data.summary.total_students,
    totalAssigned: data.summary.total_assigned,
    totalPaid: data.summary.total_paid,
    totalRemaining: data.summary.total_remaining,
    collectionRate: data.summary.collection_rate,
    statusCounts: {
      paid: data.summary.status_counts.paid,
      partial: data.summary.status_counts.partial,
      pending: data.summary.status_counts.pending,
      overdue: data.summary.status_counts.overdue,
      waived: data.summary.status_counts.waived,
    },
  },
  byClass: (data.by_class || []).map((item: any) => ({
    classAcademicYearId: item.class_academic_year_id,
    classId: item.class_id,
    className: item.class_name || 'Unknown',
    assignmentCount: item.assignment_count,
    studentCount: item.student_count,
    totalAssigned: parseFloat(item.total_assigned),
    totalPaid: parseFloat(item.total_paid),
    totalRemaining: parseFloat(item.total_remaining),
    collectionPercentage: parseFloat(item.collection_percentage),
  })),
  byStructure: (data.by_structure || []).map((item: any) => ({
    feeStructureId: item.fee_structure_id,
    structureName: item.structure_name || 'Unknown',
    feeType: item.fee_type,
    assignmentCount: item.assignment_count,
    totalAssigned: parseFloat(item.total_assigned),
    totalPaid: parseFloat(item.total_paid),
    totalRemaining: parseFloat(item.total_remaining),
  })),
  recentPayments: (data.recent_payments || []).map((item: any) => ({
    id: item.id,
    amount: item.amount,
    paymentDate: item.payment_date,
    paymentMethod: item.payment_method,
    referenceNo: item.reference_no,
    studentName: item.student_name,
    studentRegistration: item.student_registration,
    feeStructureName: item.fee_structure_name,
  })),
  exceptions: data.exceptions ? {
    totalCount: data.exceptions.total_count || 0,
    totalAmount: parseFloat(data.exceptions.total_amount || 0),
    byType: {
      discount_percentage: {
        count: data.exceptions.by_type?.discount_percentage?.count || 0,
        amount: parseFloat(data.exceptions.by_type?.discount_percentage?.amount || 0),
      },
      discount_fixed: {
        count: data.exceptions.by_type?.discount_fixed?.count || 0,
        amount: parseFloat(data.exceptions.by_type?.discount_fixed?.amount || 0),
      },
      waiver: {
        count: data.exceptions.by_type?.waiver?.count || 0,
        amount: parseFloat(data.exceptions.by_type?.waiver?.amount || 0),
      },
      custom: {
        count: data.exceptions.by_type?.custom?.count || 0,
        amount: parseFloat(data.exceptions.by_type?.custom?.amount || 0),
      },
    },
    impactOnCollection: {
      originalTotal: parseFloat(data.exceptions.impact_on_collection?.original_total || 0),
      adjustedTotal: parseFloat(data.exceptions.impact_on_collection?.adjusted_total || 0),
      exceptionReduction: parseFloat(data.exceptions.impact_on_collection?.exception_reduction || 0),
    },
  } : undefined,
});

const mapStudentFeeRecord = (item: any): StudentFeeRecord => {
  // Split full_name into first and last name
  const fullName = item.full_name || '';
  const nameParts = fullName.trim().split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  return {
    id: item.id,
    firstName,
    lastName,
    fatherName: item.father_name,
    registrationNumber: item.registration_number,
    photoUrl: item.picture_path,
    className: item.class_name || 'Unknown',
    classAcademicYearId: item.class_academic_year_id,
    assignmentCount: item.assignment_count,
    totalAssigned: parseFloat(item.total_assigned),
    totalPaid: parseFloat(item.total_paid),
    totalRemaining: parseFloat(item.total_remaining),
    overallStatus: item.overall_status,
  };
};

const mapFeeDefaulter = (item: any): FeeDefaulter => {
  // Split full_name into first and last name
  const fullName = item.full_name || '';
  const nameParts = fullName.trim().split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  return {
    assignmentId: item.assignment_id,
    studentId: item.student_id,
    firstName,
    lastName,
    fatherName: item.father_name,
    registrationNumber: item.registration_number,
    phone: item.phone,
    className: item.class_name || 'Unknown',
    feeStructureName: item.fee_structure_name || 'Unknown',
    assignedAmount: parseFloat(item.assigned_amount),
    paidAmount: parseFloat(item.paid_amount),
    remainingAmount: parseFloat(item.remaining_amount),
    dueDate: item.due_date,
    status: item.status,
  };
};

export const useFeeReportDashboard = (filters?: {
  academicYearId?: string;
  classAcademicYearId?: string;
  schoolId?: string;
}) => {
  const { user, profile } = useAuth();

  return useQuery<FeeReportDashboard>({
    queryKey: ['fee-report-dashboard', profile?.organization_id, profile?.default_school_id ?? null, filters],
    queryFn: async () => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      const params = {
        academic_year_id: filters?.academicYearId,
        class_academic_year_id: filters?.classAcademicYearId,
      };

      const data = await feeReportsApi.dashboard(params);
      return mapDashboardResponse(data);
    },
    enabled: !!user && !!profile,
    staleTime: FIVE_MINUTES,
    refetchOnWindowFocus: false,
  });
};

export const useStudentFees = (filters?: {
  academicYearId?: string;
  classAcademicYearId?: string;
  schoolId?: string;
  status?: string;
  search?: string;
  page?: number;
  perPage?: number;
}) => {
  const { user, profile } = useAuth();

  return useQuery<{
    data: StudentFeeRecord[];
    pagination: {
      currentPage: number;
      perPage: number;
      total: number;
      lastPage: number;
    };
  }>({
    queryKey: ['student-fees', profile?.organization_id, profile?.default_school_id ?? null, filters],
    queryFn: async () => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      const params = {
        academic_year_id: filters?.academicYearId,
        class_academic_year_id: filters?.classAcademicYearId,
        status: filters?.status,
        search: filters?.search,
        page: filters?.page,
        per_page: filters?.perPage,
      };

      const response = await feeReportsApi.studentFees(params);
      return {
        data: (response.data || []).map(mapStudentFeeRecord),
        pagination: {
          currentPage: response.pagination.current_page,
          perPage: response.pagination.per_page,
          total: response.pagination.total,
          lastPage: response.pagination.last_page,
        },
      };
    },
    enabled: !!user && !!profile,
    staleTime: FIVE_MINUTES,
    refetchOnWindowFocus: false,
  });
};

export const useFeeDefaulters = (filters?: {
  academicYearId?: string;
  classAcademicYearId?: string;
  schoolId?: string;
  minAmount?: number;
}) => {
  const { user, profile } = useAuth();

  return useQuery<{
    summary: {
      totalDefaulters: number;
      totalAssignments: number;
      totalOutstanding: number;
    };
    defaulters: FeeDefaulter[];
  }>({
    queryKey: ['fee-defaulters', profile?.organization_id, profile?.default_school_id ?? null, filters],
    queryFn: async () => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      const params = {
        academic_year_id: filters?.academicYearId,
        class_academic_year_id: filters?.classAcademicYearId,
        min_amount: filters?.minAmount,
      };

      const response = await feeReportsApi.defaulters(params);
      return {
        summary: {
          totalDefaulters: response.summary.total_defaulters,
          totalAssignments: response.summary.total_assignments,
          totalOutstanding: response.summary.total_outstanding,
        },
        defaulters: (response.defaulters || []).map(mapFeeDefaulter),
      };
    },
    enabled: !!user && !!profile,
    staleTime: FIVE_MINUTES,
    refetchOnWindowFocus: false,
  });
};

export const useFeeCollectionReport = (filters?: {
  academicYearId?: string;
  classAcademicYearId?: string;
  schoolId?: string;
  startDate?: string;
  endDate?: string;
}) => {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ['fee-collection-report', profile?.organization_id, profile?.default_school_id ?? null, filters],
    queryFn: async () => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      const params = {
        academic_year_id: filters?.academicYearId,
        class_academic_year_id: filters?.classAcademicYearId,
        start_date: filters?.startDate,
        end_date: filters?.endDate,
      };

      const response = await feeReportsApi.collectionReport(params);
      return {
        monthlyCollection: (response.monthly_collection || []).map((item: any) => ({
          month: item.month,
          paymentCount: item.payment_count,
          totalAmount: parseFloat(item.total_amount),
        })),
        byMethod: (response.by_method || []).map((item: any) => ({
          paymentMethod: item.payment_method,
          paymentCount: item.payment_count,
          totalAmount: parseFloat(item.total_amount),
        })),
        dailyCollection: (response.daily_collection || []).map((item: any) => ({
          date: item.date,
          paymentCount: item.payment_count,
          totalAmount: parseFloat(item.total_amount),
        })),
      };
    },
    enabled: !!user && !!profile,
    staleTime: FIVE_MINUTES,
    refetchOnWindowFocus: false,
  });
};

