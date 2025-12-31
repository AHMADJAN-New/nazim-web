// Student ID Card API Types - Match Laravel API response (snake_case, DB columns)

export interface StudentIdCard {
  id: string;
  organization_id: string;
  school_id: string | null;
  student_id: string;
  student_admission_id: string;
  id_card_template_id: string;
  academic_year_id: string;
  class_id: string | null;
  class_academic_year_id: string | null;
  card_number: string | null;
  card_fee: number;
  card_fee_paid: boolean;
  card_fee_paid_date: string | null;
  income_entry_id: string | null;
  is_printed: boolean;
  printed_at: string | null;
  printed_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  
  // Relationships (when loaded with eager loading)
  student?: {
    id: string;
    full_name: string;
    admission_no: string;
    student_code?: string | null;
    card_number?: string | null;
    father_name?: string | null;
    gender?: string | null;
    picture_path: string | null;
  };
  student_admission?: {
    id: string;
    enrollment_status: string;
    class_academic_year_id: string | null;
  };
  template?: {
    id: string;
    name: string;
    is_active: boolean;
  };
  academic_year?: {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
  };
  class?: {
    id: string;
    name: string;
    code: string;
    grade_level?: number | null;
  };
  class_academic_year?: {
    id: string;
    section_name: string | null;
  };
  organization?: {
    id: string;
    name: string;
  };
  printed_by_user?: {
    id: string;
    full_name: string | null;
  };
  income_entry?: {
    id: string;
    account_id: string;
    income_category_id: string;
    amount: number;
    date: string;
  };
}

export interface StudentIdCardInsert {
  organization_id: string;
  student_id: string;
  student_admission_id: string;
  id_card_template_id: string;
  academic_year_id: string;
  class_id?: string | null;
  class_academic_year_id?: string | null;
  card_number?: string | null;
  card_fee?: number;
  card_fee_paid?: boolean;
  card_fee_paid_date?: string | null;
  notes?: string | null;
}

export interface StudentIdCardUpdate {
  card_number?: string | null;
  card_fee?: number;
  card_fee_paid?: boolean;
  card_fee_paid_date?: string | null;
  account_id?: string | null;
  income_category_id?: string | null;
  is_printed?: boolean;
  printed_at?: string | null;
  printed_by?: string | null;
  notes?: string | null;
}

export interface AssignIdCardRequest {
  academic_year_id: string;
  id_card_template_id: string;
  student_admission_ids: string[];
  class_id?: string | null;
  class_academic_year_id?: string | null;
  card_fee?: number;
  card_fee_paid?: boolean;
  card_fee_paid_date?: string | null;
  account_id?: string | null;
  income_category_id?: string | null;
  card_number?: string | null;
  notes?: string | null;
}

export interface StudentIdCardFilters {
  academic_year_id?: string;
  school_id?: string;
  class_id?: string;
  class_academic_year_id?: string;
  enrollment_status?: string;
  id_card_template_id?: string;
  is_printed?: boolean;
  card_fee_paid?: boolean;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface ExportIdCardRequest {
  card_ids?: string[];
  filters?: StudentIdCardFilters;
  format: 'zip' | 'pdf';
  sides: ('front' | 'back')[];
  cards_per_page?: number;
  quality?: 'standard' | 'high';
  include_unprinted?: boolean;
  include_unpaid?: boolean;
  file_naming_template?: string;
}
