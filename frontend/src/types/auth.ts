// Authentication and Role-based Access Control Types

export type UserRole = 
  | 'super_admin'
  | 'admin'
  | 'teacher'
  | 'accountant'
  | 'librarian'
  | 'parent'
  | 'student'
  | 'hostel_manager'
  | 'asset_manager';

export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  branchId?: string;
  profilePhoto?: string;
  phone?: string;
  isActive: boolean;
  lastLogin?: Date;
  preferences: UserPreferences;
  permissions: Permission[];
}

export interface UserPreferences {
  language: 'en' | 'ps' | 'fa' | 'ar';
  theme: 'light' | 'dark';
  rtl: boolean;
  dashboardLayout?: string;
  notifications: {
    email: boolean;
    sms: boolean;
    inApp: boolean;
  };
}

export interface Permission {
  module: string;
  actions: string[]; // ['read', 'create', 'update', 'delete']
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  principal: string;
  isActive: boolean;
  establishedDate: Date;
}

// Role-based permissions mapping
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: [
    { module: '*', actions: ['read', 'create', 'update', 'delete'] }
  ],
  admin: [
    { module: 'students', actions: ['read', 'create', 'update', 'delete'] },
    { module: 'teachers', actions: ['read', 'create', 'update', 'delete'] },
    { module: 'classes', actions: ['read', 'create', 'update', 'delete'] },
    { module: 'attendance', actions: ['read', 'create', 'update'] },
    { module: 'exams', actions: ['read', 'create', 'update', 'delete'] },
    { module: 'reports', actions: ['read'] },
    { module: 'settings', actions: ['read', 'update'] }
  ],
  teacher: [
    { module: 'students', actions: ['read'] },
    { module: 'attendance', actions: ['read', 'create', 'update'] },
    { module: 'exams', actions: ['read', 'create', 'update'] },
    { module: 'results', actions: ['read', 'create', 'update'] },
    { module: 'reports', actions: ['read'] }
  ],
  accountant: [
    { module: 'fees', actions: ['read', 'create', 'update', 'delete'] },
    { module: 'finance', actions: ['read', 'create', 'update', 'delete'] },
    { module: 'donations', actions: ['read', 'create', 'update'] },
    { module: 'reports', actions: ['read'] }
  ],
  librarian: [
    { module: 'library', actions: ['read', 'create', 'update', 'delete'] },
    { module: 'students', actions: ['read'] },
    { module: 'reports', actions: ['read'] }
  ],
  parent: [
    { module: 'students', actions: ['read'] },
    { module: 'attendance', actions: ['read'] },
    { module: 'results', actions: ['read'] },
    { module: 'fees', actions: ['read'] },
    { module: 'communication', actions: ['read'] }
  ],
  student: [
    { module: 'profile', actions: ['read', 'update'] },
    { module: 'attendance', actions: ['read'] },
    { module: 'results', actions: ['read'] },
    { module: 'library', actions: ['read'] },
    { module: 'communication', actions: ['read'] }
  ],
  hostel_manager: [
    { module: 'hostel', actions: ['read', 'create', 'update', 'delete'] },
    { module: 'students', actions: ['read'] },
    { module: 'attendance', actions: ['read', 'create', 'update'] },
    { module: 'reports', actions: ['read'] }
  ],
  asset_manager: [
    { module: 'assets', actions: ['read', 'create', 'update', 'delete'] },
    { module: 'inventory', actions: ['read', 'create', 'update', 'delete'] },
    { module: 'reports', actions: ['read'] }
  ]
};