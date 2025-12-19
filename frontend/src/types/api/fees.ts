// Fee API types (snake_case to match Laravel responses)

export type FeeType = 'one_time' | 'monthly' | 'quarterly' | 'semester' | 'annual' | 'custom';
export type FeeAssignmentStatus = 'pending' | 'partial' | 'paid' | 'overdue' | 'waived' | 'cancelled';
export type FeeExceptionType = 'discount_percentage' | 'discount_fixed' | 'waiver' | 'custom' | 'none';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'cheque' | 'other';

export interface FeeStructure {
  id: string;
  organization_id: string;
  school_id: string | null;
  academic_year_id: string;
  class_id: string | null;
  class_academic_year_id: string | null;
  name: string;
  code: string | null;
  description: string | null;
  fee_type: FeeType;
  amount: number;
  currency_id: string | null;
  due_date: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  is_required: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface FeeStructureInsert {
  organization_id?: string;
  school_id?: string | null;
  academic_year_id: string;
  class_id?: string | null;
  class_academic_year_id?: string | null;
  name: string;
  code?: string | null;
  description?: string | null;
  fee_type: FeeType;
  amount: number;
  currency_id?: string | null;
  due_date?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_active?: boolean;
  is_required?: boolean;
  display_order?: number;
}

export type FeeStructureUpdate = Partial<FeeStructureInsert>;

export interface FeeAssignment {
  id: string;
  organization_id: string;
  school_id: string | null;
  student_id: string;
  student_admission_id: string;
  fee_structure_id: string;
  academic_year_id: string;
  class_academic_year_id: string | null;
  original_amount: number;
  assigned_amount: number;
  currency_id: string | null;
  exception_type: FeeExceptionType;
  exception_amount: number;
  exception_reason: string | null;
  exception_approved_by: string | null;
  exception_approved_at: string | null;
  payment_period_start: string | null;
  payment_period_end: string | null;
  due_date: string;
  status: FeeAssignmentStatus;
  paid_amount: number;
  remaining_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface FeeAssignmentInsert {
  organization_id?: string;
  school_id?: string | null;
  student_id: string;
  student_admission_id: string;
  fee_structure_id: string;
  academic_year_id: string;
  class_academic_year_id?: string | null;
  original_amount?: number;
  assigned_amount?: number;
  currency_id?: string | null;
  exception_type?: FeeExceptionType;
  exception_amount?: number;
  exception_reason?: string | null;
  exception_approved_by?: string | null;
  exception_approved_at?: string | null;
  payment_period_start?: string | null;
  payment_period_end?: string | null;
  due_date: string;
  status?: FeeAssignmentStatus;
  paid_amount?: number;
  remaining_amount?: number;
  notes?: string | null;
}

export type FeeAssignmentUpdate = Partial<FeeAssignmentInsert>;

export interface FeePayment {
  id: string;
  organization_id: string;
  school_id: string | null;
  fee_assignment_id: string;
  student_id: string;
  student_admission_id: string;
  amount: number;
  currency_id: string | null;
  payment_date: string;
  payment_method: PaymentMethod;
  reference_no: string | null;
  account_id: string;
  income_entry_id: string | null;
  received_by_user_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface FeePaymentInsert {
  organization_id?: string;
  school_id?: string | null;
  fee_assignment_id: string;
  student_id: string;
  student_admission_id: string;
  amount: number;
  currency_id?: string | null;
  payment_date: string;
  payment_method?: PaymentMethod;
  reference_no?: string | null;
  account_id: string;
  received_by_user_id?: string | null;
  notes?: string | null;
}

export type FeePaymentUpdate = Partial<FeePaymentInsert>;

export interface FeeException {
  id: string;
  organization_id: string;
  fee_assignment_id: string;
  student_id: string;
  exception_type: FeeExceptionType;
  exception_amount: number;
  exception_reason: string;
  approved_by_user_id: string;
  approved_at: string | null;
  valid_from: string;
  valid_to: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Nested relationships (from Laravel with() clause)
  fee_assignment?: FeeAssignment;
  student?: any;
  approved_by?: any;
}

export interface FeeExceptionInsert {
  organization_id?: string;
  fee_assignment_id: string;
  student_id: string;
  exception_type: FeeExceptionType;
  exception_amount: number;
  exception_reason: string;
  approved_by_user_id: string;
  approved_at?: string | null;
  valid_from: string;
  valid_to?: string | null;
  is_active?: boolean;
  notes?: string | null;
}

export type FeeExceptionUpdate = Partial<FeeExceptionInsert>;

