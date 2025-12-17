import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { showToast } from '@/lib/toast';
import { useAuth } from './useAuth';
import { useLanguage } from './useLanguage';
import {
  feeAssignmentsApi,
  feeExceptionsApi,
  feePaymentsApi,
  feeStructuresApi,
  studentAdmissionsApi,
} from '@/lib/api/client';
import type * as FeeApi from '@/types/api/fees';
import type { FeeAssignment, FeeException, FeePayment, FeeStructure } from '@/types/domain/fees';
import {
  mapFeeAssignmentApiToDomain,
  mapFeeAssignmentDomainToInsert,
  mapFeeAssignmentDomainToUpdate,
  mapFeeExceptionApiToDomain,
  mapFeeExceptionDomainToInsert,
  mapFeePaymentApiToDomain,
  mapFeePaymentDomainToInsert,
  mapFeePaymentDomainToUpdate,
  mapFeeStructureApiToDomain,
  mapFeeStructureDomainToInsert,
  mapFeeStructureDomainToUpdate,
} from '@/mappers/feeMapper';
import type * as StudentAdmissionApi from '@/types/api/studentAdmission';

const FIVE_MINUTES = 5 * 60 * 1000;

export const useFeeStructures = (filters?: {
  academicYearId?: string;
  classId?: string;
  classAcademicYearId?: string;
  isActive?: boolean;
}) => {
  const { user, profile } = useAuth();

  return useQuery<FeeStructure[]>({
    queryKey: ['fee-structures', profile?.organization_id, filters],
    queryFn: async () => {
      if (!user || !profile) {
        return [];
      }

      const params = {
        organization_id: profile.organization_id,
        academic_year_id: filters?.academicYearId,
        class_id: filters?.classId,
        class_academic_year_id: filters?.classAcademicYearId,
        is_active: filters?.isActive,
      };

      const apiStructures = await feeStructuresApi.list(params);
      return (apiStructures as FeeApi.FeeStructure[]).map(mapFeeStructureApiToDomain);
    },
    enabled: !!user && !!profile,
    staleTime: FIVE_MINUTES,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
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

export const useFeeAssignments = (filters?: {
  studentId?: string;
  studentAdmissionId?: string;
  academicYearId?: string;
  classAcademicYearId?: string;
  classId?: string;
  status?: string;
}) => {
  const { user, profile } = useAuth();

  return useQuery<FeeAssignment[]>({
    queryKey: ['fee-assignments', profile?.organization_id, filters],
    queryFn: async () => {
      if (!user || !profile) return [];

      const params = {
        organization_id: profile.organization_id,
        student_id: filters?.studentId,
        student_admission_id: filters?.studentAdmissionId,
        academic_year_id: filters?.academicYearId,
        class_academic_year_id: filters?.classAcademicYearId,
        class_id: filters?.classId,
        status: filters?.status,
      };

      const apiAssignments = await feeAssignmentsApi.list(params);
      return (apiAssignments as FeeApi.FeeAssignment[]).map(mapFeeAssignmentApiToDomain);
    },
    enabled: !!user && !!profile,
    staleTime: FIVE_MINUTES,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
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
    onSuccess: () => {
      showToast.success(t('toast.feeAssignmentCreated'));
      void queryClient.invalidateQueries({ queryKey: ['fee-assignments'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.feeAssignmentCreateFailed'));
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

export const useFeePayments = (filters?: {
  feeAssignmentId?: string;
  studentId?: string;
  paymentDateFrom?: string;
  paymentDateTo?: string;
}) => {
  const { user, profile } = useAuth();

  return useQuery<FeePayment[]>({
    queryKey: ['fee-payments', profile?.organization_id, filters],
    queryFn: async () => {
      if (!user || !profile) return [];

      const params = {
        fee_assignment_id: filters?.feeAssignmentId,
        student_id: filters?.studentId,
        payment_date_from: filters?.paymentDateFrom,
        payment_date_to: filters?.paymentDateTo,
      };

      const apiPayments = await feePaymentsApi.list(params);
      return (apiPayments as FeeApi.FeePayment[]).map(mapFeePaymentApiToDomain);
    },
    enabled: !!user && !!profile,
    staleTime: FIVE_MINUTES,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
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
    onSuccess: () => {
      showToast.success(t('toast.feeExceptionCreated'));
      void queryClient.invalidateQueries({ queryKey: ['fee-assignments'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.feeExceptionFailed'));
    },
  });
};

