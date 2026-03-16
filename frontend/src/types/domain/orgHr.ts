export interface OrgHrStaff {
  id: string;
  organizationId: string;
  schoolId: string | null;
  employeeId: string;
  firstName: string;
  fatherName: string;
  grandfatherName: string | null;
  email: string | null;
  phoneNumber: string | null;
  position: string | null;
  duty: string | null;
  status: string;
  staffTypeId: string | null;
  picturePath: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrgHrAssignment {
  id: string;
  organizationId: string;
  staffId: string;
  schoolId: string;
  staffFirstName?: string | null;
  staffFatherName?: string | null;
  roleTitle: string | null;
  allocationPercent: number;
  isPrimary: boolean;
  startDate: string;
  endDate: string | null;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrgHrCompensationProfile {
  id: string;
  organizationId: string;
  staffId: string;
  baseSalary: number;
  payFrequency: string;
  currency: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  grade: string | null;
  step: string | null;
  status: string;
  employeeId?: string | null;
  staffFirstName?: string | null;
  staffFatherName?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrgHrPayrollPeriod {
  id: string;
  organizationId: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  payDate: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrgHrAnalyticsOverview {
  headcountBySchool: Array<{ schoolId: string; headcount: number }>;
  payrollByMonth: Array<{ month: string; totalNet: number }>;
  pendingApprovals: number;
}

export interface OrgHrPayrollRun {
  id: string;
  organizationId: string;
  payrollPeriodId: string;
  runName: string;
  status: string;
  approvedBy: string | null;
  approvedAt: string | null;
  lockedAt: string | null;
  payrollPeriodName: string;
  periodStart: string;
  periodEnd: string;
  payDate: string | null;
  itemCount: number;
  totalGross: number;
  totalDeduction: number;
  totalNet: number;
  expenseEntryId?: string | null;
  paidAt?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrgHrPayrollRunItem {
  id: string;
  organizationId: string;
  payrollRunId: string;
  staffId: string;
  grossAmount: number;
  deductionAmount: number;
  netAmount: number;
  breakdown: Record<string, unknown>;
  adjustmentNotes: string | null;
  employeeId?: string | null;
  staffFirstName?: string | null;
  staffFatherName?: string | null;
  payslipNumber?: string | null;
  payslipStatus?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type OrgHrStaffStatus = 'active' | 'inactive' | 'on_leave' | 'terminated' | 'suspended';
export type OrgHrAssignmentStatus = 'active' | 'ended' | 'suspended';
export type OrgHrPayrollPeriodStatus = 'draft' | 'processing' | 'finalized' | 'paid';
export type OrgHrPayFrequency = 'monthly' | 'semi_monthly' | 'semimonthly' | 'biweekly' | 'weekly' | 'daily' | 'annually';
