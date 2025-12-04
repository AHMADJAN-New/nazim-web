// Permission Domain Types - UI-friendly structure (camelCase, Date objects)

export interface Permission {
  id: string | number; // Permissions use integer IDs (bigIncrements), not UUIDs
  name: string;
  resource: string;
  action: string;
  description?: string | null;
  organizationId?: string | null;
  createdAt?: Date | null; // Allow null to prevent getTime() errors on undefined
  updatedAt?: Date | null; // Allow null to prevent getTime() errors on undefined
}

// Role permission type
export interface RolePermission {
  id: string | number;
  role: string;
  permissionId: string | number; // Permissions use integer IDs
  organizationId?: string | null;
  createdAt?: Date | null; // Allow null to prevent getTime() errors on undefined
  updatedAt?: Date | null; // Allow null to prevent getTime() errors on undefined
  permission?: Permission;
}

// User permission type
export interface UserPermission {
  id: string | number;
  userId: string;
  permissionId: string | number; // Permissions use integer IDs
  organizationId: string | null;
  createdAt: Date;
  deletedAt: Date | null;
}
