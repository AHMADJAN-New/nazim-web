import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { orgHrApi } from '@/lib/api/client';

export interface OrgHrStaff {
  id: string;
  organization_id: string;
  school_id: string | null;
  employee_id: string;
  first_name: string;
  father_name: string;
  status: string;
  position: string | null;
}

export interface OrgHrAssignment {
  id: string;
  organization_id: string;
  staff_id: string;
  school_id: string;
  role_title: string | null;
  allocation_percent: number;
  is_primary: boolean;
  start_date: string;
  end_date: string | null;
  status: string;
}

export interface OrgHrAnalyticsOverview {
  headcount_by_school: Array<{ school_id: string; headcount: number }>;
  payroll_by_month: Array<{ month: string; total_net: string | number }>;
  pending_approvals: number;
}

export const useOrgHrStaff = (search?: string) => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['org-hr-staff', profile?.organization_id, profile?.default_school_id ?? null, search ?? ''],
    queryFn: async (): Promise<{ data: OrgHrStaff[]; total: number }> => {
      if (!profile?.organization_id || !profile?.default_school_id) {
        return { data: [], total: 0 };
      }

      const response = await orgHrApi.staff({
        search,
        per_page: 25,
      }) as { data?: OrgHrStaff[]; total?: number };

      return {
        data: response.data ?? [],
        total: response.total ?? 0,
      };
    },
    enabled: !!profile?.organization_id && !!profile?.default_school_id,
  });
};

export const useOrgHrAnalyticsOverview = () => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['org-hr-analytics-overview', profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async (): Promise<OrgHrAnalyticsOverview> => {
      if (!profile?.organization_id || !profile?.default_school_id) {
        return { headcount_by_school: [], payroll_by_month: [], pending_approvals: 0 };
      }

      return orgHrApi.analyticsOverview() as Promise<OrgHrAnalyticsOverview>;
    },
    enabled: !!profile?.organization_id && !!profile?.default_school_id,
  });
};

export const useOrgHrAssignments = (staffId?: string) => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['org-hr-assignments', profile?.organization_id, profile?.default_school_id ?? null, staffId ?? 'all'],
    queryFn: async (): Promise<{ data: OrgHrAssignment[]; total: number }> => {
      if (!profile?.organization_id || !profile?.default_school_id) {
        return { data: [], total: 0 };
      }

      const response = await orgHrApi.assignments({
        staff_id: staffId,
        per_page: 50,
      }) as { data?: OrgHrAssignment[]; total?: number };

      return {
        data: response.data ?? [],
        total: response.total ?? 0,
      };
    },
    enabled: !!profile?.organization_id && !!profile?.default_school_id,
  });
};
