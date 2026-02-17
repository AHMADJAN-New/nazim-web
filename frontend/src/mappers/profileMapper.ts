// Profile Mapper - Converts between API (snake_case) and Domain (camelCase) models

import type * as ProfileApi from '@/types/api/profile';
import type { Profile } from '@/types/domain/profile';

/**
 * Convert API Profile model to Domain Profile model
 */
export function mapProfileApiToDomain(api: ProfileApi.Profile): Profile {
  return {
    id: api.id,
    organizationId: api.organization_id,
    role: api.role,
    fullName: api.full_name,
    email: api.email,
    phone: api.phone,
    avatarUrl: api.avatar_url,
    isActive: api.is_active,
    defaultSchoolId: api.default_school_id,
    calendarPreference: api.calendar_preference ?? null,
    eventId: api.event_id ?? null,
    isEventUser: api.is_event_user ?? false,
    hasCompletedOnboarding: api.has_completed_onboarding ?? false,
    hasCompletedTour: api.has_completed_tour ?? false,
    onboardingCompletedAt: api.onboarding_completed_at ? new Date(api.onboarding_completed_at) : null,
    createdAt: api.created_at ? new Date(api.created_at) : undefined,
    updatedAt: api.updated_at ? new Date(api.updated_at) : undefined,
    deletedAt: api.deleted_at ? new Date(api.deleted_at) : null,
  };
}

/**
 * Convert Domain Profile model to API ProfileInsert payload
 */
export function mapProfileDomainToInsert(domain: Partial<Profile>): ProfileApi.ProfileInsert {
  return {
    organization_id: domain.organizationId || null,
    role: domain.role || null,
    full_name: domain.fullName || null,
    email: domain.email || null,
    phone: domain.phone || null,
    avatar_url: domain.avatarUrl || null,
    is_active: domain.isActive ?? true,
    default_school_id: domain.defaultSchoolId || null,
    calendar_preference: domain.calendarPreference ?? null,
    event_id: domain.eventId ?? null,
    is_event_user: domain.isEventUser ?? false,
    has_completed_onboarding: domain.hasCompletedOnboarding ?? false,
    has_completed_tour: domain.hasCompletedTour ?? false,
    onboarding_completed_at: domain.onboardingCompletedAt ? domain.onboardingCompletedAt.toISOString() : null,
  };
}

/**
 * Convert Domain Profile model to API ProfileUpdate payload
 */
export function mapProfileDomainToUpdate(domain: Partial<Profile>): ProfileApi.ProfileUpdate {
  const update: ProfileApi.ProfileUpdate = {};
  
  if (domain.organizationId !== undefined) update.organization_id = domain.organizationId;
  if (domain.role !== undefined) update.role = domain.role;
  if (domain.fullName !== undefined) update.full_name = domain.fullName;
  if (domain.email !== undefined) update.email = domain.email;
  if (domain.phone !== undefined) update.phone = domain.phone;
  if (domain.avatarUrl !== undefined) update.avatar_url = domain.avatarUrl;
  if (domain.isActive !== undefined) update.is_active = domain.isActive;
  if (domain.defaultSchoolId !== undefined) update.default_school_id = domain.defaultSchoolId;
  if (domain.calendarPreference !== undefined) update.calendar_preference = domain.calendarPreference;
  if (domain.eventId !== undefined) update.event_id = domain.eventId;
  if (domain.isEventUser !== undefined) update.is_event_user = domain.isEventUser;
  if (domain.hasCompletedOnboarding !== undefined) update.has_completed_onboarding = domain.hasCompletedOnboarding;
  if (domain.hasCompletedTour !== undefined) update.has_completed_tour = domain.hasCompletedTour;
  if (domain.onboardingCompletedAt !== undefined) {
    update.onboarding_completed_at = domain.onboardingCompletedAt ? domain.onboardingCompletedAt.toISOString() : null;
  }
  
  return update;
}
