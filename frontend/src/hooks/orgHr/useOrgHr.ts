import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { orgHrApi } from '@/lib/api/client';
import { showToast } from '@/lib/toast';
import type * as OrgHrApi from '@/types/api/orgHr';
import type {
  OrgHrStaff,
  OrgHrAssignment,
  OrgHrCompensationProfile,
  OrgHrPayrollPeriod,
  OrgHrPayrollRun,
  OrgHrPayrollRunItem,
  OrgHrAnalyticsOverview,
} from '@/types/domain/orgHr';
import {
  mapOrgHrStaffApiToDomain,
  mapOrgHrAssignmentApiToDomain,
  mapOrgHrCompensationApiToDomain,
  mapOrgHrPayrollPeriodApiToDomain,
  mapOrgHrPayrollRunApiToDomain,
  mapOrgHrPayrollRunItemApiToDomain,
  mapOrgHrAnalyticsApiToDomain,
} from '@/mappers/orgHrMapper';

export type {
  OrgHrStaff,
  OrgHrAssignment,
  OrgHrCompensationProfile,
  OrgHrPayrollPeriod,
  OrgHrPayrollRun,
  OrgHrPayrollRunItem,
  OrgHrAnalyticsOverview,
};

export const useOrgHrStaff = (params?: { search?: string; schoolId?: string; status?: string; perPage?: number }) => {
  const { profile } = useAuth();

  return useQuery<{ data: OrgHrStaff[]; total: number }>({
    queryKey: [
      'org-hr-staff',
      profile?.organization_id,
      profile?.default_school_id ?? null,
      params?.search ?? '',
      params?.schoolId ?? '',
      params?.status ?? '',
      params?.perPage ?? 25,
    ],
    queryFn: async () => {
      if (!profile?.organization_id) {
        return { data: [], total: 0 };
      }

      // Only pass school_id when explicitly filtered (e.g. user chose a school). Do NOT default to current school so Org Admin sees all.
      const response = await orgHrApi.staff({
        search: params?.search || undefined,
        school_id: params?.schoolId ?? undefined,
        status: params?.status || undefined,
        per_page: params?.perPage ?? 25,
      }) as { data?: OrgHrApi.OrgHrStaff[]; total?: number };

      return {
        data: (response.data ?? []).map(mapOrgHrStaffApiToDomain),
        total: response.total ?? 0,
      };
    },
    enabled: !!profile?.organization_id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useOrgHrAssignments = (params?: { staffId?: string; schoolId?: string; status?: string }) => {
  const { profile } = useAuth();

  return useQuery<{ data: OrgHrAssignment[]; total: number }>({
    queryKey: [
      'org-hr-assignments',
      profile?.organization_id,
      profile?.default_school_id ?? null,
      params?.staffId ?? 'all',
      params?.schoolId ?? '',
      params?.status ?? '',
    ],
    queryFn: async () => {
      if (!profile?.organization_id) {
        return { data: [], total: 0 };
      }

      // Only pass school_id when explicitly filtered. Do NOT default to current school so Org Admin sees all assignments.
      const response = await orgHrApi.assignments({
        staff_id: params?.staffId || undefined,
        school_id: params?.schoolId ?? undefined,
        status: params?.status || undefined,
        per_page: 50,
      }) as { data?: OrgHrApi.OrgHrAssignment[]; total?: number };

      return {
        data: (response.data ?? []).map(mapOrgHrAssignmentApiToDomain),
        total: response.total ?? 0,
      };
    },
    enabled: !!profile?.organization_id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useCreateOrgHrAssignment = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (data: OrgHrApi.OrgHrAssignmentInsert) => {
      return orgHrApi.createAssignment(data);
    },
    onSuccess: async () => {
      showToast.success(t('organizationHr.assignmentCreated') || 'Assignment created successfully');
      await queryClient.invalidateQueries({ queryKey: ['org-hr-assignments'] });
      await queryClient.invalidateQueries({ queryKey: ['org-hr-analytics-overview'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('organizationHr.assignmentCreateFailed') || 'Failed to create assignment');
    },
  });
};

export const useUpdateOrgHrAssignment = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      role_title?: string | null;
      allocation_percent?: number;
      is_primary?: boolean;
      end_date?: string | null;
      status?: string;
      notes?: string | null;
    }) => {
      return orgHrApi.updateAssignment(id, data);
    },
    onSuccess: async () => {
      showToast.success(t('organizationHr.assignmentUpdated') || 'Assignment updated');
      await queryClient.invalidateQueries({ queryKey: ['org-hr-assignments'] });
      await queryClient.invalidateQueries({ queryKey: ['org-hr-analytics-overview'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('organizationHr.assignmentUpdateFailed') || 'Failed to update assignment');
    },
  });
};

export const useDeleteOrgHrAssignment = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (id: string) => {
      await orgHrApi.deleteAssignment(id);
    },
    onSuccess: async () => {
      showToast.success(t('organizationHr.assignmentDeleted') || 'Assignment removed');
      await queryClient.invalidateQueries({ queryKey: ['org-hr-assignments'] });
      await queryClient.refetchQueries({ queryKey: ['org-hr-assignments'] });
      await queryClient.invalidateQueries({ queryKey: ['org-hr-analytics-overview'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('organizationHr.assignmentDeleteFailed') || 'Failed to remove assignment');
    },
  });
};

export const useOrgHrCompensation = (staffId?: string) => {
  const { profile } = useAuth();

  return useQuery<{ data: OrgHrCompensationProfile[]; total: number }>({
    queryKey: ['org-hr-compensation', profile?.organization_id, profile?.default_school_id ?? null, staffId ?? 'all'],
    queryFn: async () => {
      if (!profile?.organization_id) {
        return { data: [], total: 0 };
      }

      const response = await orgHrApi.compensationProfiles({
        staff_id: staffId || undefined,
        per_page: 50,
      }) as { data?: OrgHrApi.OrgHrCompensationProfile[]; total?: number };

      return {
        data: (response.data ?? []).map(mapOrgHrCompensationApiToDomain),
        total: response.total ?? 0,
      };
    },
    enabled: !!profile?.organization_id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useCreateOrgHrCompensation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: OrgHrApi.OrgHrCompensationProfileInsert) => {
      return orgHrApi.createCompensationProfile(data);
    },
    onSuccess: async () => {
      showToast.success('Compensation profile created');
      await queryClient.invalidateQueries({ queryKey: ['org-hr-compensation'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to create compensation profile');
    },
  });
};

export const useUpdateOrgHrCompensation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: OrgHrApi.OrgHrCompensationProfileUpdate & { id: string }) => {
      return orgHrApi.updateCompensationProfile(id, data);
    },
    onSuccess: async () => {
      showToast.success('Compensation profile updated');
      await queryClient.invalidateQueries({ queryKey: ['org-hr-compensation'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to update compensation profile');
    },
  });
};

export const useDeleteOrgHrCompensation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await orgHrApi.deleteCompensationProfile(id);
    },
    onSuccess: async () => {
      showToast.success('Compensation profile removed');
      await queryClient.invalidateQueries({ queryKey: ['org-hr-compensation'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to remove compensation profile');
    },
  });
};

export const useOrgHrPayrollPeriods = () => {
  const { profile } = useAuth();

  return useQuery<OrgHrPayrollPeriod[]>({
    queryKey: ['org-hr-payroll-periods', profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!profile?.organization_id) {
        return [];
      }

      const response = await orgHrApi.payrollPeriods() as OrgHrApi.OrgHrPayrollPeriod[] | { data?: OrgHrApi.OrgHrPayrollPeriod[] };

      const items = Array.isArray(response) ? response : (response.data ?? []);
      return items.map(mapOrgHrPayrollPeriodApiToDomain);
    },
    enabled: !!profile?.organization_id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useCreateOrgHrPayrollPeriod = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (data: OrgHrApi.OrgHrPayrollPeriodInsert) => {
      return orgHrApi.createPayrollPeriod(data);
    },
    onSuccess: async () => {
      showToast.success(t('organizationHr.payrollPeriodCreated') || 'Payroll period created successfully');
      await queryClient.invalidateQueries({ queryKey: ['org-hr-payroll-periods'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('organizationHr.payrollPeriodCreateFailed') || 'Failed to create payroll period');
    },
  });
};

export const useOrgHrPayrollRuns = (params?: { payrollPeriodId?: string; status?: string }) => {
  const { profile } = useAuth();

  return useQuery<{ data: OrgHrPayrollRun[]; total: number }>({
    queryKey: [
      'org-hr-payroll-runs',
      profile?.organization_id,
      profile?.default_school_id ?? null,
      params?.payrollPeriodId ?? 'all',
      params?.status ?? '',
    ],
    queryFn: async () => {
      if (!profile?.organization_id) {
        return { data: [], total: 0 };
      }

      const response = await orgHrApi.payrollRuns({
        payroll_period_id: params?.payrollPeriodId || undefined,
        status: params?.status || undefined,
        per_page: 100,
      }) as { data?: OrgHrApi.OrgHrPayrollRun[]; total?: number };

      return {
        data: (response.data ?? []).map(mapOrgHrPayrollRunApiToDomain),
        total: response.total ?? 0,
      };
    },
    enabled: !!profile?.organization_id,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useOrgHrPayrollRun = (runId?: string | null) => {
  const { profile } = useAuth();

  return useQuery<{ run: OrgHrPayrollRun; items: OrgHrPayrollRunItem[] }>({
    queryKey: ['org-hr-payroll-run', profile?.organization_id, runId ?? 'none'],
    queryFn: async () => {
      if (!profile?.organization_id || !runId) {
        return {
          run: {
            id: '',
            organizationId: profile?.organization_id ?? '',
            payrollPeriodId: '',
            runName: '',
            status: 'draft',
            approvedBy: null,
            approvedAt: null,
            lockedAt: null,
            payrollPeriodName: '',
            periodStart: '',
            periodEnd: '',
            payDate: null,
            itemCount: 0,
            totalGross: 0,
            totalDeduction: 0,
            totalNet: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          items: [],
        };
      }

      const response = await orgHrApi.payrollRun(runId) as {
        run: OrgHrApi.OrgHrPayrollRun;
        items: OrgHrApi.OrgHrPayrollRunItem[];
      };

      return {
        run: mapOrgHrPayrollRunApiToDomain(response.run),
        items: (response.items ?? []).map(mapOrgHrPayrollRunItemApiToDomain),
      };
    },
    enabled: !!profile?.organization_id && !!runId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useCreateOrgHrPayrollRun = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: OrgHrApi.OrgHrPayrollRunInsert) => {
      return orgHrApi.createPayrollRun(data);
    },
    onSuccess: async () => {
      showToast.success('Payroll run created');
      await queryClient.invalidateQueries({ queryKey: ['org-hr-payroll-runs'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to create payroll run');
    },
  });
};

export const useCalculateOrgHrPayrollRun = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (runId: string) => {
      return orgHrApi.calculatePayrollRun(runId);
    },
    onSuccess: async (_data, runId) => {
      showToast.success('Payroll run calculated');
      await queryClient.invalidateQueries({ queryKey: ['org-hr-payroll-runs'] });
      await queryClient.invalidateQueries({ queryKey: ['org-hr-payroll-run'] });
      await queryClient.invalidateQueries({ queryKey: ['org-hr-analytics-overview'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to calculate payroll run');
    },
  });
};

export const useFinalizeOrgHrPayrollRun = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (runId: string) => {
      return orgHrApi.finalizePayrollRun(runId);
    },
    onSuccess: async (_data, runId) => {
      showToast.success('Payroll run finalized');
      await queryClient.invalidateQueries({ queryKey: ['org-hr-payroll-runs'] });
      await queryClient.invalidateQueries({ queryKey: ['org-hr-payroll-run'] });
      await queryClient.invalidateQueries({ queryKey: ['org-hr-analytics-overview'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to finalize payroll run');
    },
  });
};

export interface MarkPayrollRunPaidPayload {
  runId: string;
  account_id: string;
  expense_category_id?: string;
}

export const useMarkOrgHrPayrollRunPaid = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: MarkPayrollRunPaidPayload) => {
      return orgHrApi.markPayrollRunPaid(payload.runId, {
        account_id: payload.account_id,
        expense_category_id: payload.expense_category_id,
      });
    },
    onSuccess: async () => {
      showToast.success('Payroll run marked as paid');
      await queryClient.invalidateQueries({ queryKey: ['org-hr-payroll-runs'] });
      await queryClient.invalidateQueries({ queryKey: ['org-hr-payroll-run'] });
      await queryClient.invalidateQueries({ queryKey: ['org-hr-analytics-overview'] });
      await queryClient.invalidateQueries({ queryKey: ['org-finance'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to mark payroll run as paid');
    },
  });
};

export const useOrgHrAnalyticsOverview = () => {
  const { profile } = useAuth();

  return useQuery<OrgHrAnalyticsOverview>({
    queryKey: ['org-hr-analytics-overview', profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!profile?.organization_id) {
        return { headcountBySchool: [], payrollByMonth: [], pendingApprovals: 0 };
      }

      const response = await orgHrApi.analyticsOverview() as OrgHrApi.OrgHrAnalyticsOverview;
      return mapOrgHrAnalyticsApiToDomain(response);
    },
    enabled: !!profile?.organization_id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};
