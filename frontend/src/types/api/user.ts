// User API Types - Match Laravel API response (snake_case, DB columns)

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  organization_id: string | null;
  default_school_id?: string | null;
  phone: string | null;
  avatar?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  full_name: string;
  role: string;
  organization_id?: string | null;
  default_school_id?: string | null;
  phone?: string;
}

export interface UpdateUserData {
  id: string;
  full_name?: string;
  email?: string;
  role?: string;
  organization_id?: string | null;
  default_school_id?: string | null;
  phone?: string;
  is_active?: boolean;
}
