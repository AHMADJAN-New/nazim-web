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

export type OrgHrStaffStatus = 'active' | 'inactive' | 'on_leave' | 'terminated' | 'suspended';
export type OrgHrAssignmentStatus = 'active' | 'ended' | 'suspended';
export type OrgHrPayrollPeriodStatus = 'draft' | 'processing' | 'finalized' | 'paid';
