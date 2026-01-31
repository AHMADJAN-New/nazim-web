export type OnlineAdmissionStatus =
  | 'submitted'
  | 'under_review'
  | 'accepted'
  | 'rejected'
  | 'archived';

export type OnlineAdmissionFieldType =
  | 'text'
  | 'textarea'
  | 'phone'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'date'
  | 'toggle'
  | 'email'
  | 'id_number'
  | 'address'
  | 'photo'
  | 'file';

export interface OnlineAdmission {
  id: string;
  organization_id: string;
  school_id: string;
  student_id: string | null;
  application_no: string;
  status: OnlineAdmissionStatus;
  submitted_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  full_name: string;
  father_name: string;
  grandfather_name: string | null;
  mother_name: string | null;
  gender: 'male' | 'female';
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
  previous_grade_level: string | null;
  previous_academic_year: string | null;
  previous_school_notes: string | null;
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
  disability_status: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  family_income: string | null;
  picture_path: string | null;
  picture_url?: string | null;
  guardian_picture_url?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  documents?: OnlineAdmissionDocument[];
  field_values?: OnlineAdmissionFieldValue[];
}

export interface OnlineAdmissionDocument {
  id: string;
  online_admission_id: string;
  organization_id: string;
  school_id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  description: string | null;
  uploaded_by: string | null;
  file_url?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface OnlineAdmissionField {
  id: string;
  organization_id: string;
  school_id: string;
  key: string;
  label: string;
  field_type: OnlineAdmissionFieldType;
  is_required: boolean;
  is_enabled: boolean;
  sort_order: number;
  placeholder: string | null;
  help_text: string | null;
  validation_rules: Record<string, unknown> | null;
  options: Array<{ value: string; label: string }> | null;
  created_at?: string;
  updated_at?: string;
}

export interface OnlineAdmissionFieldValue {
  id: string;
  online_admission_id: string;
  field_id: string;
  value_text: string | null;
  value_json: string[] | Record<string, unknown> | null;
  file_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  file_size: number | null;
  file_url?: string | null;
  field?: OnlineAdmissionField;
  created_at?: string;
  updated_at?: string;
}

export interface OnlineAdmissionFieldInsert {
  key: string;
  label: string;
  field_type: OnlineAdmissionFieldType;
  is_required?: boolean;
  is_enabled?: boolean;
  sort_order?: number;
  placeholder?: string | null;
  help_text?: string | null;
  validation_rules?: Record<string, unknown> | null;
  options?: Array<{ value: string; label: string }> | null;
}

export type OnlineAdmissionFieldUpdate = Partial<OnlineAdmissionFieldInsert>;
