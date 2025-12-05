// Student API Types - Match Laravel API response (snake_case, DB columns)

export type StudentStatus = 'applied' | 'admitted' | 'active' | 'withdrawn';
export type AdmissionFeeStatus = 'paid' | 'pending' | 'waived' | 'partial';
export type Gender = 'male' | 'female';

// Student interface matching the database schema
export interface Student {
  id: string;
  organization_id: string;
  school_id: string | null;
  card_number: string | null;
  admission_no: string;
  student_code: string | null;
  full_name: string;
  father_name: string;
  grandfather_name: string | null;
  mother_name: string | null;
  gender: Gender;
  birth_year: string | null;
  birth_date: string | null;
  age: number | null;
  admission_year: string | null;
  orig_province: string | null;
  orig_district: string | null;
  orig_village: string | null;
  curr_province: string | null;
  curr_district: string | null;
  curr_village: string | null;
  nationality: string | null;
  preferred_language: string | null;
  previous_school: string | null;
  guardian_name: string | null;
  guardian_relation: string | null;
  guardian_phone: string | null;
  guardian_tazkira: string | null;
  guardian_picture_path: string | null;
  home_address: string | null;
  zamin_name: string | null;
  zamin_phone: string | null;
  zamin_tazkira: string | null;
  zamin_address: string | null;
  applying_grade: string | null;
  is_orphan: boolean;
  admission_fee_status: AdmissionFeeStatus;
  student_status: StudentStatus;
  disability_status: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  family_income: string | null;
  picture_path: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  organization?: {
    id: string;
    name: string;
  };
  school?: {
    id: string;
    school_name: string;
  };
}

export interface StudentInsert {
  admission_no: string;
  student_code?: string | null;
  full_name: string;
  father_name: string;
  gender: string;
  organization_id?: string | null;
  school_id?: string | null;
  card_number?: string | null;
  grandfather_name?: string | null;
  mother_name?: string | null;
  birth_year?: string | null;
  birth_date?: string | null;
  age?: number | null;
  admission_year?: string | null;
  orig_province?: string | null;
  orig_district?: string | null;
  orig_village?: string | null;
  curr_province?: string | null;
  curr_district?: string | null;
  curr_village?: string | null;
  nationality?: string | null;
  preferred_language?: string | null;
  previous_school?: string | null;
  guardian_name?: string | null;
  guardian_relation?: string | null;
  guardian_phone?: string | null;
  guardian_tazkira?: string | null;
  guardian_picture_path?: string | null;
  home_address?: string | null;
  zamin_name?: string | null;
  zamin_phone?: string | null;
  zamin_tazkira?: string | null;
  zamin_address?: string | null;
  applying_grade?: string | null;
  is_orphan?: boolean;
  admission_fee_status?: string;
  student_status?: string;
  disability_status?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  family_income?: string | null;
  picture_path?: string | null;
}

export type StudentUpdate = Partial<StudentInsert>;

export interface StudentStats {
  total: number;
  male: number;
  female: number;
  orphans: number;
  feePending: number;
}

export interface StudentDocument {
  id: string;
  student_id: string;
  organization_id: string;
  school_id: string | null;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  description: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface StudentEducationalHistory {
  id: string;
  student_id: string;
  organization_id: string;
  school_id: string | null;
  institution_name: string;
  academic_year: string | null;
  grade_level: string | null;
  start_date: string | null;
  end_date: string | null;
  achievements: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface StudentEducationalHistoryInsert {
  student_id: string;
  organization_id?: string;
  school_id?: string | null;
  institution_name: string;
  academic_year?: string | null;
  grade_level?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  achievements?: string | null;
  notes?: string | null;
}

export type DisciplineSeverity = 'minor' | 'moderate' | 'major' | 'severe';

export interface StudentDisciplineRecord {
  id: string;
  student_id: string;
  organization_id: string;
  school_id: string | null;
  incident_date: string;
  incident_type: string;
  description: string | null;
  severity: DisciplineSeverity;
  action_taken: string | null;
  resolved: boolean;
  resolved_date: string | null;
  resolved_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface StudentDisciplineRecordInsert {
  student_id: string;
  organization_id?: string;
  school_id?: string | null;
  incident_date: string;
  incident_type: string;
  description?: string | null;
  severity?: DisciplineSeverity;
  action_taken?: string | null;
  resolved?: boolean;
  resolved_date?: string | null;
  resolved_by?: string | null;
}
