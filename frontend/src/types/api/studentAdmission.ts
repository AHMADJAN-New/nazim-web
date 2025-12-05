// Student Admission API Types - Match Laravel API response (snake_case, DB columns)

export type AdmissionStatus = 'pending' | 'admitted' | 'active' | 'inactive' | 'suspended' | 'withdrawn' | 'graduated';

export interface StudentAdmission {
  id: string;
  organization_id: string;
  school_id: string | null;
  student_id: string;
  academic_year_id: string | null;
  class_id: string | null;
  class_academic_year_id: string | null;
  residency_type_id: string | null;
  room_id: string | null;
  admission_year: string | null;
  admission_date: string;
  enrollment_status: AdmissionStatus;
  enrollment_type: string | null;
  shift: string | null;
  is_boarder: boolean;
  fee_status: string | null;
  placement_notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  student?: {
    id: string;
    full_name: string;
    admission_no: string;
    student_code: string | null;
    card_number: string | null;
    father_name: string | null;
    gender: string | null;
    admission_year: string | null;
    guardian_name: string | null;
    guardian_phone: string | null;
  };
  organization?: {
    id: string;
    name: string;
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
    grade_level: number | null;
  };
  class_academic_year?: {
    id: string;
    section_name: string | null;
  };
  residency_type?: {
    id: string;
    name: string;
  };
  room?: {
    id: string;
    room_number: string;
  };
  school?: {
    id: string;
    school_name: string;
  };
}

export interface StudentAdmissionInsert {
  student_id: string;
  organization_id?: string | null;
  school_id?: string | null;
  academic_year_id?: string | null;
  class_id?: string | null;
  class_academic_year_id?: string | null;
  residency_type_id?: string | null;
  room_id?: string | null;
  admission_year?: string | null;
  admission_date?: string;
  enrollment_status?: string;
  enrollment_type?: string | null;
  shift?: string | null;
  is_boarder?: boolean;
  fee_status?: string | null;
  placement_notes?: string | null;
}

export type StudentAdmissionUpdate = Partial<StudentAdmissionInsert>;

export interface AdmissionStats {
  total: number;
  active: number;
  pending: number;
  boarders: number;
}
