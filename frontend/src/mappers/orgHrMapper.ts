import type * as OrgHrApi from '@/types/api/orgHr';
import type {
  OrgHrStaff,
  OrgHrAssignment,
  OrgHrCompensationProfile,
  OrgHrPayrollPeriod,
  OrgHrAnalyticsOverview,
} from '@/types/domain/orgHr';

export function mapOrgHrStaffApiToDomain(api: OrgHrApi.OrgHrStaff): OrgHrStaff {
  return {
    id: api.id,
    organizationId: api.organization_id,
    schoolId: api.school_id,
    employeeId: api.employee_id,
    firstName: api.first_name,
    fatherName: api.father_name,
    grandfatherName: api.grandfather_name,
    email: api.email,
    phoneNumber: api.phone_number,
    position: api.position,
    duty: api.duty,
    status: api.status,
    staffTypeId: api.staff_type_id,
    picturePath: api.picture_path,
    createdAt: api.created_at ? new Date(api.created_at) : new Date(),
    updatedAt: api.updated_at ? new Date(api.updated_at) : new Date(),
  };
}

export function mapOrgHrAssignmentApiToDomain(api: OrgHrApi.OrgHrAssignment): OrgHrAssignment {
  return {
    id: api.id,
    organizationId: api.organization_id,
    staffId: api.staff_id,
    schoolId: api.school_id,
    roleTitle: api.role_title,
    allocationPercent: api.allocation_percent,
    isPrimary: api.is_primary,
    startDate: api.start_date,
    endDate: api.end_date,
    status: api.status,
    notes: api.notes,
    createdAt: api.created_at ? new Date(api.created_at) : new Date(),
    updatedAt: api.updated_at ? new Date(api.updated_at) : new Date(),
  };
}

export function mapOrgHrCompensationApiToDomain(api: OrgHrApi.OrgHrCompensationProfile): OrgHrCompensationProfile {
  return {
    id: api.id,
    organizationId: api.organization_id,
    staffId: api.staff_id,
    baseSalary: typeof api.base_salary === 'string' ? parseFloat(api.base_salary) : api.base_salary,
    payFrequency: api.pay_frequency,
    currency: api.currency,
    effectiveFrom: api.effective_from,
    effectiveTo: api.effective_to,
    grade: api.grade,
    step: api.step,
    status: api.status,
    createdAt: api.created_at ? new Date(api.created_at) : new Date(),
    updatedAt: api.updated_at ? new Date(api.updated_at) : new Date(),
  };
}

export function mapOrgHrPayrollPeriodApiToDomain(api: OrgHrApi.OrgHrPayrollPeriod): OrgHrPayrollPeriod {
  return {
    id: api.id,
    organizationId: api.organization_id,
    name: api.name,
    periodStart: api.period_start,
    periodEnd: api.period_end,
    payDate: api.pay_date,
    status: api.status,
    createdAt: api.created_at ? new Date(api.created_at) : new Date(),
    updatedAt: api.updated_at ? new Date(api.updated_at) : new Date(),
  };
}

export function mapOrgHrAnalyticsApiToDomain(api: OrgHrApi.OrgHrAnalyticsOverview): OrgHrAnalyticsOverview {
  return {
    headcountBySchool: (api.headcount_by_school ?? []).map(item => ({
      schoolId: item.school_id,
      headcount: item.headcount,
    })),
    payrollByMonth: (api.payroll_by_month ?? []).map(item => ({
      month: item.month,
      totalNet: typeof item.total_net === 'string' ? parseFloat(item.total_net) : item.total_net,
    })),
    pendingApprovals: api.pending_approvals ?? 0,
  };
}
