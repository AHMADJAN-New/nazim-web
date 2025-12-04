// Permission API Types - Match Laravel API response (snake_case, DB columns)

export interface Permission {
  id: string | number; // Permissions use integer IDs (bigIncrements), not UUIDs
  name: string;
  resource: string;
  action: string;
  description?: string | null;
  organization_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type PermissionInsert = Omit<Permission, 'id' | 'created_at' | 'updated_at'>;
export type PermissionUpdate = Partial<PermissionInsert>;

// Role permission type
export interface RolePermission {
  id: string | number;
  role: string;
  permission_id: string | number; // Permissions use integer IDs
  organization_id?: string | null;
  created_at?: string;
  updated_at?: string;
  permission?: Permission;
}

export type RolePermissionInsert = Omit<RolePermission, 'id' | 'created_at' | 'updated_at' | 'permission'>;
export type RolePermissionUpdate = Partial<RolePermissionInsert>;

// User permission type
export interface UserPermission {
  id: string | number;
  user_id: string;
  permission_id: string | number; // Permissions use integer IDs
  organization_id: string | null;
  created_at: string;
  deleted_at: string | null;
}
