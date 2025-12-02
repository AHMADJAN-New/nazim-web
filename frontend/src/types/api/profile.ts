// Profile API Types - Match Laravel API response (snake_case, DB columns)

export interface Profile {
  id: string;
  organization_id: string | null;
  role: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  default_school_id: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export type ProfileInsert = Omit<Profile, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type ProfileUpdate = Partial<ProfileInsert>;
