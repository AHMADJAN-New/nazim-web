import { useQuery } from '@tanstack/react-query';

import { useAuth } from './useAuth';

import { organizationDashboardApi } from '@/lib/api/client';

export interface OrganizationDashboardAttendanceSummary {
  present: number;
  total: number;
  rate: number;
}

export interface OrganizationDashboardFinanceSummary {
  income: number;
  expense: number;
  net: number;
  fee_collection: number;
}

export interface OrganizationDashboardSummary {
  total_students: number;
  total_staff: number;
  total_schools: number;
  active_schools: number;
  total_classes: number;
  total_buildings: number;
  total_rooms: number;
  today_attendance: OrganizationDashboardAttendanceSummary;
  finance: OrganizationDashboardFinanceSummary;
}

export interface OrganizationDashboardSchool {
  id: string;
  name: string;
  slug: string | null;
  is_active: boolean;
  students_count: number;
  staff_count: number;
  classes_count: number;
  buildings_count: number;
  rooms_count: number;
  today_attendance: OrganizationDashboardAttendanceSummary;
  finance: OrganizationDashboardFinanceSummary;
}

export interface OrganizationDashboardChartPoint {
  name: string;
  value: number;
}

export interface OrganizationDashboardCharts {
  students_by_school: OrganizationDashboardChartPoint[];
  staff_by_school: OrganizationDashboardChartPoint[];
  attendance_rate_by_school: OrganizationDashboardChartPoint[];
  fee_collection_by_school: OrganizationDashboardChartPoint[];
  income_by_school: OrganizationDashboardChartPoint[];
  expense_by_school: OrganizationDashboardChartPoint[];
}

export interface OrganizationDashboardExam {
  id: string;
  name: string;
  school_id: string;
  school_name: string;
  start_date: string;
  status: string;
}

export interface OrganizationDashboardActivity {
  id: string;
  description: string;
  event: string;
  subject_type: string;
  created_at: string;
}

export interface OrganizationDashboardAlert {
  type: string;
  severity: 'info' | 'warning' | 'error' | 'success' | string;
  message: string;
}

export interface OrganizationDashboardTodaySummary {
  upcoming_exams_count: number;
  upcoming_exams: OrganizationDashboardExam[];
  recent_activity: OrganizationDashboardActivity[];
  alerts: OrganizationDashboardAlert[];
  schools_without_attendance_today?: number;
}

export interface OrganizationDashboardOverviewResponse {
  summary: OrganizationDashboardSummary;
  schools: OrganizationDashboardSchool[];
  charts: OrganizationDashboardCharts;
  today_summary: OrganizationDashboardTodaySummary;
  generated_at?: string;
}

export const useOrganizationDashboardOverview = (enabled = true) => {
  const { user, profile } = useAuth();

  return useQuery<OrganizationDashboardOverviewResponse>({
    queryKey: [
      'organization-dashboard-overview',
      profile?.organization_id,
      profile?.default_school_id ?? null,
    ],
    queryFn: async () => {
      if (!user || !profile?.organization_id) {
        throw new Error('User must be assigned to an organization');
      }

      return organizationDashboardApi.overview() as Promise<OrganizationDashboardOverviewResponse>;
    },
    enabled: enabled && !!user && !!profile?.organization_id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
};
