// Permission Domain Types - UI-friendly structure (camelCase, Date objects)

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string | null;
  organizationId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

// Role permission type
export interface RolePermission {
  id: string;
  role: string;
  permissionId: string;
  organizationId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  permission?: Permission;
}

// User permission type
export interface UserPermission {
  id: string;
  userId: string;
  permissionId: string;
  organizationId: string | null;
  createdAt: Date;
  deletedAt: Date | null;
}
