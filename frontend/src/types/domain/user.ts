// User Domain Types - UI-friendly structure (camelCase, Date objects)

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  organizationId: string | null;
  defaultSchoolId?: string | null;
  phone: string | null;
  avatar?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  email: string;
  password: string;
  fullName: string;
  role: string;
  organizationId?: string | null;
  defaultSchoolId?: string | null;
  phone?: string;
}

export interface UpdateUserData {
  id: string;
  fullName?: string;
  email?: string;
  role?: string;
  organizationId?: string | null;
  defaultSchoolId?: string | null;
  phone?: string;
  isActive?: boolean;
}
