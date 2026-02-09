export type CourseCompletionStatus = 'enrolled' | 'completed' | 'dropped' | 'failed';

export interface CourseStudent {
  id: string;
  organization_id: string;
  school_id: string;
  course_id: string;
  main_student_id?: string | null;
  admission_no: string;
  registration_date: string;
  completion_status: CourseCompletionStatus;
  completion_date?: string | null;
  grade?: string | null;
  certificate_issued: boolean;
  certificate_issued_date?: string | null;
  fee_paid: boolean;
  fee_paid_date?: string | null;
  fee_amount?: number | null;
  full_name: string;
  tazkira_number?: string | null;
  phone?: string | null;
  notes?: string | null;
  father_name?: string | null;
  grandfather_name?: string | null;
  mother_name?: string | null;
  gender?: string | null;
  birth_year?: number | null;
  birth_date?: string | null;
  age?: number | null;
  orig_province?: string | null;
  orig_district?: string | null;
  orig_village?: string | null;
  curr_province?: string | null;
  curr_district?: string | null;
  curr_village?: string | null;
  nationality?: string | null;
  preferred_language?: string | null;
  guardian_name?: string | null;
  guardian_relation?: string | null;
  guardian_phone?: string | null;
  home_address?: string | null;
  picture_path?: string | null;
  is_orphan?: boolean | null;
  disability_status?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CourseStudentInsert {
  organization_id: string;
  course_id: string;
  admission_no?: string | null;
  registration_date: string;
  completion_status?: CourseCompletionStatus;
  fee_paid?: boolean;
  fee_amount?: number | null;
  full_name: string;
  tazkira_number?: string | null;
  phone?: string | null;
  notes?: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  home_address?: string | null;
}

export interface CourseStudentUpdate extends Partial<CourseStudentInsert> {
  completion_status?: CourseCompletionStatus;
  completion_date?: string | null;
  grade?: string | null;
  certificate_issued?: boolean;
  certificate_issued_date?: string | null;
  fee_paid_date?: string | null;
}
