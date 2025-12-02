// User Mapper - Converts between API (snake_case) and Domain (camelCase) models

import type * as UserApi from '@/types/api/user';
import type { UserProfile, CreateUserData, UpdateUserData } from '@/types/domain/user';

/**
 * Convert API UserProfile model to Domain UserProfile model
 */
export function mapUserProfileApiToDomain(api: UserApi.UserProfile): UserProfile {
  return {
    id: api.id,
    name: api.name,
    email: api.email,
    role: api.role,
    organizationId: api.organization_id,
    defaultSchoolId: api.default_school_id,
    phone: api.phone,
    avatar: api.avatar,
    isActive: api.is_active,
    createdAt: new Date(api.created_at),
    updatedAt: new Date(api.updated_at),
  };
}

/**
 * Convert Domain CreateUserData model to API CreateUserData payload
 */
export function mapCreateUserDataDomainToApi(domain: CreateUserData): UserApi.CreateUserData {
  return {
    email: domain.email,
    password: domain.password,
    full_name: domain.fullName,
    role: domain.role,
    organization_id: domain.organizationId,
    default_school_id: domain.defaultSchoolId,
    phone: domain.phone,
  };
}

/**
 * Convert Domain UpdateUserData model to API UpdateUserData payload
 */
export function mapUpdateUserDataDomainToApi(domain: UpdateUserData): UserApi.UpdateUserData {
  const update: UserApi.UpdateUserData = {
    id: domain.id,
  };
  
  if (domain.fullName !== undefined) update.full_name = domain.fullName;
  if (domain.email !== undefined) update.email = domain.email;
  if (domain.role !== undefined) update.role = domain.role;
  if (domain.organizationId !== undefined) update.organization_id = domain.organizationId;
  if (domain.defaultSchoolId !== undefined) update.default_school_id = domain.defaultSchoolId;
  if (domain.phone !== undefined) update.phone = domain.phone;
  if (domain.isActive !== undefined) update.is_active = domain.isActive;
  
  return update;
}
