export interface OrgHrStaff {
  id: string;
  organization_id: string;
  school_id: string | null;
  employee_id: string;
  first_name: string;
  father_name: string;
  grandfather_name: string | null;
  email: string | null;
  phone_number: string | null;
  position: string | null;
  duty: string | null;
  status: string;
  staff_type_id: string | null;
  picture_path: string | null;
  created_at: string;
  updated_at: string;
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
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  staff_first_name?: string | null;
  staff_father_name?: string | null;
}

export interface OrgHrCompensationProfile {
  id: string;
  organization_id: string;
  staff_id: string;
  base_salary: string | number;
  pay_frequency: string;
  currency: string;
  effective_from: string;
  effective_to: string | null;
  grade: string | null;
  step: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface OrgHrPayrollPeriod {
  id: string;
  organization_id: string;
  name: string;
  period_start: string;
  period_end: string;
  pay_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface OrgHrAnalyticsOverview {
  headcount_by_school: Array<{ school_id: string; headcount: number }>;
  payroll_by_month: Array<{ month: string; total_net: string | number }>;
  pending_approvals: number;
}

export interface OrgHrAssignmentInsert {
  staff_id: string;
  school_id: string;
  role_title?: string | null;
  allocation_percent: number;
  is_primary: boolean;
  start_date: string;
  end_date?: string | null;
  status?: string;
  notes?: string | null;
}

export interface OrgHrPayrollPeriodInsert {
  name: string;
  period_start: string;
  period_end: string;
  pay_date?: string | null;
}
