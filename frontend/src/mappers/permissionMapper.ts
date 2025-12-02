// Permission Mapper - Converts between API (snake_case) and Domain (camelCase) models

import type * as PermissionApi from '@/types/api/permission';
import type { Permission, RolePermission, UserPermission } from '@/types/domain/permission';

/**
 * Convert API Permission model to Domain Permission model
 */
export function mapPermissionApiToDomain(api: PermissionApi.Permission): Permission {
  return {
    id: api.id,
    name: api.name,
    resource: api.resource,
    action: api.action,
    description: api.description,
    organizationId: api.organization_id,
    createdAt: api.created_at ? new Date(api.created_at) : undefined,
    updatedAt: api.updated_at ? new Date(api.updated_at) : undefined,
  };
}

/**
 * Convert Domain Permission model to API PermissionInsert payload
 */
export function mapPermissionDomainToInsert(domain: Partial<Permission>): PermissionApi.PermissionInsert {
  return {
    name: domain.name || '',
    resource: domain.resource || '',
    action: domain.action || '',
    description: domain.description || null,
    organization_id: domain.organizationId || null,
  };
}

/**
 * Convert Domain Permission model to API PermissionUpdate payload
 */
export function mapPermissionDomainToUpdate(domain: Partial<Permission>): PermissionApi.PermissionUpdate {
  return mapPermissionDomainToInsert(domain);
}

/**
 * Convert API RolePermission model to Domain RolePermission model
 */
export function mapRolePermissionApiToDomain(api: PermissionApi.RolePermission): RolePermission {
  return {
    id: api.id,
    role: api.role,
    permissionId: api.permission_id,
    organizationId: api.organization_id,
    createdAt: api.created_at ? new Date(api.created_at) : undefined,
    updatedAt: api.updated_at ? new Date(api.updated_at) : undefined,
    permission: api.permission ? mapPermissionApiToDomain(api.permission) : undefined,
  };
}

/**
 * Convert Domain RolePermission model to API RolePermissionInsert payload
 */
export function mapRolePermissionDomainToInsert(domain: Partial<RolePermission>): PermissionApi.RolePermissionInsert {
  return {
    role: domain.role || '',
    permission_id: domain.permissionId || '',
    organization_id: domain.organizationId || null,
  };
}

/**
 * Convert Domain RolePermission model to API RolePermissionUpdate payload
 */
export function mapRolePermissionDomainToUpdate(domain: Partial<RolePermission>): PermissionApi.RolePermissionUpdate {
  return mapRolePermissionDomainToInsert(domain);
}

/**
 * Convert API UserPermission model to Domain UserPermission model
 */
export function mapUserPermissionApiToDomain(api: PermissionApi.UserPermission): UserPermission {
  return {
    id: api.id,
    userId: api.user_id,
    permissionId: api.permission_id,
    organizationId: api.organization_id,
    createdAt: api.created_at ? new Date(api.created_at) : new Date(),
    deletedAt: api.deleted_at ? new Date(api.deleted_at) : null,
  };
}
