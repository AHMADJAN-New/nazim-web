// Profile Domain Types - UI-friendly structure (camelCase, Date objects)

export interface Profile {
  id: string;
  organizationId: string | null;
  role: string | null;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  defaultSchoolId: string | null;
  calendarPreference?: string | null;
  eventId?: string | null;
  isEventUser?: boolean;
  hasCompletedOnboarding?: boolean;
  hasCompletedTour?: boolean;
  onboardingCompletedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}
