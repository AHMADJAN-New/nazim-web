// User API Types - Match Laravel API response (snake_case, DB columns)

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  organization_id: string | null;
  default_school_id?: string | null;
  staff_id?: string | null;
  phone: string | null;
  avatar?: string | null;
  schools_access_all?: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  staff?: {
    id: string;
    full_name: string;
    employee_id: string;
    picture_url: string | null;
  } | null;
}

export interface CreateUserData {
  email: string;
  password: string;
  full_name: string;
  role: string;
  organization_id?: string | null;
  default_school_id?: string | null;
  staff_id?: string | null;
  schools_access_all?: boolean;
  phone?: string;
}

export interface UpdateUserData {
  id: string;
  full_name?: string;
  email?: string;
  role?: string;
  organization_id?: string | null;
  default_school_id?: string | null;
  staff_id?: string | null;
  schools_access_all?: boolean;
  phone?: string;
  is_active?: boolean;
}
