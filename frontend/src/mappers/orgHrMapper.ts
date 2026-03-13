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
    staffFirstName: api.staff_first_name ?? null,
    staffFatherName: api.staff_father_name ?? null,
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
    employeeId: api.employee_id ?? null,
    staffFirstName: api.staff_first_name ?? null,
    staffFatherName: api.staff_father_name ?? null,
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

export function mapOrgHrPayrollRunApiToDomain(api: OrgHrApi.OrgHrPayrollRun): OrgHrPayrollRun {
  return {
    id: api.id,
    organizationId: api.organization_id,
    payrollPeriodId: api.payroll_period_id,
    runName: api.run_name,
    status: api.status,
    approvedBy: api.approved_by,
    approvedAt: api.approved_at,
    lockedAt: api.locked_at,
    payrollPeriodName: api.payroll_period_name,
    periodStart: api.period_start,
    periodEnd: api.period_end,
    payDate: api.pay_date,
    itemCount: typeof api.item_count === 'string' ? parseInt(api.item_count, 10) : api.item_count,
    totalGross: typeof api.total_gross === 'string' ? parseFloat(api.total_gross) : api.total_gross,
    totalDeduction: typeof api.total_deduction === 'string' ? parseFloat(api.total_deduction) : api.total_deduction,
    totalNet: typeof api.total_net === 'string' ? parseFloat(api.total_net) : api.total_net,
    expenseEntryId: api.expense_entry_id ?? null,
    paidAt: api.paid_at ?? null,
    createdAt: api.created_at ? new Date(api.created_at) : new Date(),
    updatedAt: api.updated_at ? new Date(api.updated_at) : new Date(),
  };
}

export function mapOrgHrPayrollRunItemApiToDomain(api: OrgHrApi.OrgHrPayrollRunItem): OrgHrPayrollRunItem {
  let breakdown: Record<string, unknown> = {};
  if (typeof api.breakdown === 'string') {
    try {
      breakdown = JSON.parse(api.breakdown) as Record<string, unknown>;
    } catch {
      breakdown = {};
    }
  } else if (api.breakdown && typeof api.breakdown === 'object') {
    breakdown = api.breakdown as Record<string, unknown>;
  }

  return {
    id: api.id,
    organizationId: api.organization_id,
    payrollRunId: api.payroll_run_id,
    staffId: api.staff_id,
    grossAmount: typeof api.gross_amount === 'string' ? parseFloat(api.gross_amount) : api.gross_amount,
    deductionAmount: typeof api.deduction_amount === 'string' ? parseFloat(api.deduction_amount) : api.deduction_amount,
    netAmount: typeof api.net_amount === 'string' ? parseFloat(api.net_amount) : api.net_amount,
    breakdown,
    adjustmentNotes: api.adjustment_notes,
    employeeId: api.employee_id ?? null,
    staffFirstName: api.staff_first_name ?? null,
    staffFatherName: api.staff_father_name ?? null,
    payslipNumber: api.payslip_number ?? null,
    payslipStatus: api.payslip_status ?? null,
    createdAt: api.created_at ? new Date(api.created_at) : new Date(),
    updatedAt: api.updated_at ? new Date(api.updated_at) : new Date(),
  };
}
