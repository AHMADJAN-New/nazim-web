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
  employee_id?: string | null;
  staff_first_name?: string | null;
  staff_father_name?: string | null;
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

export interface OrgHrPayrollRun {
  id: string;
  organization_id: string;
  payroll_period_id: string;
  run_name: string;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  locked_at: string | null;
  created_at: string;
  updated_at: string;
  payroll_period_name: string;
  period_start: string;
  period_end: string;
  pay_date: string | null;
  item_count: string | number;
  total_gross: string | number;
  total_deduction: string | number;
  total_net: string | number;
  expense_entry_id?: string | null;
  paid_at?: string | null;
}

export interface OrgHrPayrollRunItem {
  id: string;
  organization_id: string;
  payroll_run_id: string;
  staff_id: string;
  gross_amount: string | number;
  deduction_amount: string | number;
  net_amount: string | number;
  breakdown: string | Record<string, unknown>;
  adjustment_notes: string | null;
  created_at: string;
  updated_at: string;
  employee_id?: string | null;
  staff_first_name?: string | null;
  staff_father_name?: string | null;
  payslip_number?: string | null;
  payslip_status?: string | null;
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

export interface OrgHrCompensationProfileInsert {
  staff_id: string;
  base_salary: number;
  pay_frequency: 'monthly' | 'semi_monthly' | 'semimonthly' | 'biweekly' | 'weekly' | 'daily' | 'annually';
  currency: string;
  grade?: string | null;
  step?: string | null;
  effective_from: string;
  effective_to?: string | null;
  status?: 'active' | 'inactive';
  legacy_salary_notes?: string | null;
}

export interface OrgHrCompensationProfileUpdate {
  base_salary?: number;
  pay_frequency?: 'monthly' | 'semi_monthly' | 'semimonthly' | 'biweekly' | 'weekly' | 'daily' | 'annually';
  currency?: string;
  grade?: string | null;
  step?: string | null;
  effective_from?: string;
  effective_to?: string | null;
  status?: 'active' | 'inactive';
  legacy_salary_notes?: string | null;
}

export interface OrgHrPayrollRunInsert {
  payroll_period_id: string;
  run_name?: string | null;
}
