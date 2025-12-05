// Staff API Types - Match Laravel API response (snake_case, DB columns)

export type StaffStatus = 'active' | 'inactive' | 'on_leave' | 'terminated' | 'suspended';

// Staff Type types
export interface StaffType {
  id: string;
  organization_id: string | null;
  name: string;
  code: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type StaffTypeInsert = Omit<StaffType, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type StaffTypeUpdate = Partial<StaffTypeInsert>;

// Staff Document types
export interface StaffDocument {
  id: string;
  staff_id: string;
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

export type StaffDocumentInsert = Omit<StaffDocument, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type StaffDocumentUpdate = Partial<StaffDocumentInsert>;

// Staff types
export interface Staff {
  id: string;
  profile_id: string | null;
  organization_id: string;
  employee_id: string;
  staff_code: string | null;
  staff_type: string;
  staff_type_id: string | null;
  school_id: string | null;
  first_name: string;
  father_name: string;
  grandfather_name: string | null;
  full_name: string;
  tazkira_number: string | null;
  birth_year: string | null;
  birth_date: string | null;
  phone_number: string | null;
  email: string | null;
  home_address: string | null;
  origin_province: string | null;
  origin_district: string | null;
  origin_village: string | null;
  current_province: string | null;
  current_district: string | null;
  current_village: string | null;
  religious_education: string | null;
  religious_university: string | null;
  religious_graduation_year: string | null;
  religious_department: string | null;
  modern_education: string | null;
  modern_school_university: string | null;
  modern_graduation_year: string | null;
  modern_department: string | null;
  teaching_section: string | null;
  position: string | null;
  duty: string | null;
  salary: string | null;
  status: StaffStatus;
  picture_url: string | null;
  document_urls: any[];
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Extended with relations
  staff_type?: StaffType;
  profile?: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
    role: string;
  };
  organization?: {
    id: string;
    name: string;
  };
  school?: {
    id: string;
    school_name: string;
  };
}

export type StaffInsert = Omit<Staff, 'id' | 'full_name' | 'created_at' | 'updated_at' | 'deleted_at' | 'staff_type' | 'profile' | 'organization' | 'school'> & {
  staff_code?: string | null;
};
export type StaffUpdate = Partial<StaffInsert>;

export interface StaffStats {
  total: number;
  active: number;
  inactive: number;
  on_leave: number;
  terminated: number;
  suspended: number;
  by_type: {
    teacher: number;
    admin: number;
    accountant: number;
    librarian: number;
    other: number;
  };
}
