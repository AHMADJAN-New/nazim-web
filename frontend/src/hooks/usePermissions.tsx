import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useAccessibleOrganizations } from './useAccessibleOrganizations';
import { useAuth } from './useAuth';
import { useHasFeature, useFeatures } from './useSubscription';

import { permissionsApi, rolesApi } from '@/lib/api/client';
import { showToast } from '@/lib/toast';
import { mapPermissionApiToDomain, mapRolePermissionApiToDomain } from '@/mappers/permissionMapper';
import type * as PermissionApi from '@/types/api/permission';
import type { Permission, RolePermission } from '@/types/domain/permission';

// Re-export domain types for convenience
export type { Permission, RolePermission } from '@/types/domain/permission';

export const usePermissions = () => {
  const { profile } = useAuth();

  return useQuery<Permission[]>({
    queryKey: ['permissions', profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      // Laravel API automatically filters permissions by user's organization
      // Returns: global permissions (organization_id = NULL) + user's org permissions
      const apiPermissions = await permissionsApi.list();
      // Laravel API returns permissions sorted, but ensure they're sorted by resource and action
      const sorted = (apiPermissions as PermissionApi.Permission[]).sort((a, b) => {
        if (a.resource !== b.resource) {
          return a.resource.localeCompare(b.resource);
        }
        return a.action.localeCompare(b.action);
      });
      // Map API → Domain
      return sorted.map(mapPermissionApiToDomain);
    },
    enabled: !!profile?.organization_id, // Only fetch if user has organization
    staleTime: 30 * 60 * 1000, // 30 minutes - permissions don't change often
    gcTime: 60 * 60 * 1000, // 1 hour
  });
};

export const useRolePermissions = (role: string) => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['role-permissions', role, profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!role || !profile?.organization_id) return { role, permissions: [] };

      const response = await permissionsApi.rolePermissions(role);
      return response as { role: string; permissions: string[] };
    },
    enabled: !!role && !!profile?.organization_id,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
};

export interface Role {
  id: string;
  name: string;
  description: string | null;
  organization_id: string | null;
  guard_name?: string;
  created_at?: string;
  updated_at?: string;
}

export const useRoles = () => {
  const { profile } = useAuth();

  return useQuery<Role[]>({
    queryKey: ['roles', profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      const roles = await rolesApi.list();
      return (roles as Role[]);
    },
    enabled: !!profile && !!profile.organization_id,
    staleTime: 30 * 60 * 1000, // 30 minutes - roles don't change often
    gcTime: 60 * 60 * 1000, // 1 hour
  });
};

export const useCreateRole = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const canCreateRoles = useHasPermission('roles.create');

  return useMutation({
    mutationFn: async (roleData: {
      name: string;
      description?: string | null;
      guard_name?: string;
    }) => {
      if (!profile) {
        throw new Error('User not authenticated');
      }

      if (!canCreateRoles) {
        throw new Error('You do not have permission to create roles');
      }

      if (!profile.organization_id) {
        throw new Error('User must be assigned to an organization');
      }

      return await rolesApi.create({
        name: roleData.name,
        description: roleData.description || null,
        guard_name: roleData.guard_name || 'web',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      showToast.success('toast.roleCreated');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.roleCreateFailed');
    },
  });
};

export const useUpdateRole = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const canUpdateRoles = useHasPermission('roles.update');

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      name?: string;
      description?: string | null;
    }) => {
      if (!profile) {
        throw new Error('User not authenticated');
      }

      if (!canUpdateRoles) {
        throw new Error('You do not have permission to update roles');
      }

      if (!profile.organization_id) {
        throw new Error('User must be assigned to an organization');
      }

      return await rolesApi.update(id, {
        name: updates.name,
        description: updates.description,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      showToast.success('toast.roleUpdated');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.roleUpdateFailed');
    },
  });
};

export const useDeleteRole = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const canDeleteRoles = useHasPermission('roles.delete');

  return useMutation({
    mutationFn: async (roleId: string) => {
      if (!profile) {
        throw new Error('User not authenticated');
      }

      if (!canDeleteRoles) {
        throw new Error('You do not have permission to delete roles');
      }

      if (!profile.organization_id) {
        throw new Error('User must be assigned to an organization');
      }

      // Delete role via Laravel API (soft delete)
      // Backend handles all validation: permission check, organization access, and "in use" check
      await rolesApi.delete(roleId);
    },
    onSuccess: async () => {
      // CRITICAL: Use both invalidateQueries AND refetchQueries for immediate UI updates
      await queryClient.invalidateQueries({ queryKey: ['roles'] });
      await queryClient.refetchQueries({ queryKey: ['roles'] });
      showToast.success('toast.roleDeleted');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.roleDeleteFailed');
    },
  });
};

export const useUserPermissions = () => {
  const { profile } = useAuth();
  const { orgIds, isLoading: orgsLoading } = useAccessibleOrganizations();

  return useQuery({
    queryKey: ['user-permissions', profile?.organization_id, profile?.default_school_id ?? null, profile?.id, orgIds.join(',')],
    queryFn: async () => {
      // Require organization_id - backend enforces this
      if (!profile?.organization_id) return [];

      if (orgsLoading) return [];
      if (orgIds.length === 0 && profile.organization_id === null) {
        // Super admin with no orgs might still have permissions
        // Allow the API call to proceed
      }

      // Use Laravel API - it handles all permission logic on backend
      const response = await permissionsApi.userPermissions();

      // Laravel returns { permissions: string[] }
      const permissions = (response as { permissions?: string[] })?.permissions || [];

      return permissions.sort();
    },
    // FIXED: Check organization_id instead of role (role column is deprecated)
    enabled: !!profile?.organization_id && !orgsLoading,
    staleTime: 60 * 60 * 1000, // 1 hour - permissions don't change often
    gcTime: 24 * 60 * 60 * 1000, // 24 hours - keep in cache longer
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: true, // FIXED: Must refetch on mount to get permissions!
    refetchOnReconnect: false, // Don't refetch on reconnect
    refetchInterval: false, // Never auto-refetch
    // Use placeholderData instead of initialData to allow fetching
    placeholderData: [],
  });
};

export const useHasPermission = (permissionName: string): boolean | undefined => {
  const { profile } = useAuth();
  const { data: permissions, isLoading } = useUserPermissions();

  // Check permissions for all users
  // Use cached permissions even during background refetch
  // Only return undefined if we truly have no cached data AND we're loading
  if (permissions && permissions.length > 0) {
    // We have cached permissions, use them even if refetching in background
    return permissions.includes(permissionName);
  }

  // If loading and no cached data, return undefined (PermissionGuard will show loading)
  // This only happens on initial load, not on tab switches (cache should be available)
  if (isLoading && !permissions) {
    return undefined; // Indicates loading state
  }

  // No permissions found (not loading, but no permissions)
  return false;
};

/**
 * Map permission names to feature keys
 * This determines which subscription feature is required for a permission
 */
const PERMISSION_TO_FEATURE_MAP: Record<string, string | string[]> = {
  // Core features
  'students.read': 'students',
  'students.create': 'students',
  'students.update': 'students',
  'students.delete': 'students',
  'students.import': 'students',
  'student_admissions.read': 'students',
  'student_admissions.create': 'students',
  'student_admissions.update': 'students',
  'student_admissions.delete': 'students',
  'staff.read': 'staff',
  'staff.create': 'staff',
  'staff.update': 'staff',
  'staff.delete': 'staff',
  'staff_types.read': 'staff',
  'staff_types.create': 'staff',
  'staff_types.update': 'staff',
  'staff_types.delete': 'staff',
  'classes.read': 'classes',
  'classes.create': 'classes',
  'classes.update': 'classes',
  'classes.delete': 'classes',
  'attendance_sessions.read': 'attendance',
  'attendance_sessions.create': 'attendance',
  'attendance_sessions.update': 'attendance',
  'attendance_sessions.delete': 'attendance',
  'attendance_sessions.report': 'attendance',

  // Hostel feature
  'hostel.read': 'hostel',
  'hostel.create': 'hostel',
  'hostel.update': 'hostel',
  'hostel.delete': 'hostel',

  // Subjects feature
  'subjects.read': 'subjects',
  'subjects.create': 'subjects',
  'subjects.update': 'subjects',
  'subjects.delete': 'subjects',
  'subjects.assign': 'subjects',
  'subjects.copy': 'subjects',
  'teacher_subject_assignments.read': 'teacher_subject_assignments',
  'teacher_subject_assignments.create': 'teacher_subject_assignments',
  'teacher_subject_assignments.update': 'teacher_subject_assignments',
  'teacher_subject_assignments.delete': 'teacher_subject_assignments',

  // Exams feature
  'exams.read': 'exams',
  'exams.create': 'exams',
  'exams.update': 'exams',
  'exams.delete': 'exams',
  'exams.assign': 'exams',
  'exams.manage': 'exams',
  'exams.manage_timetable': 'exams_full',
  'exams.enroll_students': 'exams',
  'exams.enter_marks': 'exams',
  'exams.view_reports': 'exams',
  'exams.view_grade_cards': 'exams',
  'exams.view_consolidated_reports': 'exams',
  'exams.view_class_reports': 'exams',
  'exams.view_student_reports': 'exams',
  'exams.manage_attendance': 'exams_full',
  'exams.view_attendance_reports': 'exams_full',
  'exams.roll_numbers.read': 'exams_full',
  'exams.roll_numbers.assign': 'exams_full',
  'exams.secret_numbers.read': 'exams_full',
  'exams.secret_numbers.assign': 'exams_full',
  'exams.numbers.print': 'exams_full',
  'exam_classes.read': 'exams',
  'exam_classes.create': 'exams',
  'exam_classes.update': 'exams',
  'exam_classes.delete': 'exams',
  'exam_subjects.read': 'exams',
  'exam_subjects.create': 'exams',
  'exam_subjects.update': 'exams',
  'exam_subjects.delete': 'exams',
  'exam_students.read': 'exams',
  'exam_students.create': 'exams',
  'exam_students.update': 'exams',
  'exam_students.delete': 'exams',
  'exam_results.read': 'exams',
  'exam_results.create': 'exams',
  'exam_results.update': 'exams',
  'exam_results.delete': 'exams',
  'exam_times.read': 'exams_full',
  'exam_times.create': 'exams_full',
  'exam_times.update': 'exams_full',
  'exam_times.delete': 'exams_full',
  'exam_types.read': 'exams_full',
  'exam_types.create': 'exams_full',
  'exam_types.update': 'exams_full',
  'exam_types.delete': 'exams_full',
  'exam_documents.read': 'exams_full',
  'exam_documents.create': 'exams_full',
  'exam_documents.update': 'exams_full',
  'exam_documents.delete': 'exams_full',
  'exams.questions.read': 'question_bank',
  'exams.questions.create': 'question_bank',
  'exams.questions.update': 'question_bank',
  'exams.questions.delete': 'question_bank',
  'exams.papers.read': 'exam_paper_generator',
  'exams.papers.create': 'exam_paper_generator',
  'exams.papers.update': 'exam_paper_generator',
  'exams.papers.delete': 'exam_paper_generator',
  'grades.read': 'grades',
  'grades.create': 'grades',
  'grades.update': 'grades',
  'grades.delete': 'grades',

  // Timetables feature
  'timetables.read': ['timetables', 'timetable'],
  'timetables.create': ['timetables', 'timetable'],
  'timetables.update': ['timetables', 'timetable'],
  'timetables.delete': ['timetables', 'timetable'],
  'timetables.export': ['timetables', 'timetable'],
  'schedule_slots.read': ['timetables', 'timetable'],
  'schedule_slots.create': ['timetables', 'timetable'],
  'schedule_slots.update': ['timetables', 'timetable'],
  'schedule_slots.delete': ['timetables', 'timetable'],
  'teacher_timetable_preferences.read': ['timetables', 'timetable'],
  'teacher_timetable_preferences.create': ['timetables', 'timetable'],
  'teacher_timetable_preferences.update': ['timetables', 'timetable'],
  'teacher_timetable_preferences.delete': ['timetables', 'timetable'],

  // Assets feature
  'assets.read': 'assets',
  'assets.create': 'assets',
  'assets.update': 'assets',
  'assets.delete': 'assets',
  'asset_categories.read': 'assets',
  'asset_categories.create': 'assets',
  'asset_categories.update': 'assets',
  'asset_categories.delete': 'assets',

  // Library feature
  'library_books.read': 'library',
  'library_books.create': 'library',
  'library_books.update': 'library',
  'library_books.delete': 'library',
  'library_categories.read': 'library',
  'library_categories.create': 'library',
  'library_categories.update': 'library',
  'library_categories.delete': 'library',
  'library_loans.read': 'library',
  'library_loans.create': 'library',
  'library_loans.update': 'library',
  'library_loans.delete': 'library',

  // Reports feature
  'reports.read': ['pdf_reports', 'reports'],
  'reports.create': ['pdf_reports', 'reports'],
  'reports.update': ['pdf_reports', 'reports'],
  'reports.delete': ['pdf_reports', 'reports'],
  'staff_reports.read': ['pdf_reports', 'reports'],
  'staff_reports.export': ['pdf_reports', 'reports'],
  'student_reports.read': ['pdf_reports', 'reports'],
  'student_reports.export': ['pdf_reports', 'reports'],

  // Report templates feature
  'report_templates.read': 'report_templates',
  'report_templates.create': 'report_templates',
  'report_templates.update': 'report_templates',
  'report_templates.delete': 'report_templates',

  // Short-term courses feature
  'short_term_courses.read': 'short_courses',
  'short_term_courses.create': 'short_courses',
  'short_term_courses.update': 'short_courses',
  'short_term_courses.delete': 'short_courses',
  'short_term_courses.close': 'short_courses',
  'course_students.read': 'short_courses',
  'course_students.create': 'short_courses',
  'course_students.update': 'short_courses',
  'course_students.delete': 'short_courses',
  'course_students.enroll_from_main': 'short_courses',
  'course_students.copy_to_main': 'short_courses',
  'course_students.report': 'short_courses',
  'course_student_discipline_records.read': 'short_courses',
  'course_student_discipline_records.create': 'short_courses',
  'course_student_discipline_records.update': 'short_courses',
  'course_student_discipline_records.delete': 'short_courses',
  'course_attendance.read': 'short_courses',
  'course_attendance.create': 'short_courses',
  'course_attendance.update': 'short_courses',
  'course_attendance.delete': 'short_courses',
  'course_documents.read': 'short_courses',
  'course_documents.create': 'short_courses',
  'course_documents.update': 'short_courses',
  'course_documents.delete': 'short_courses',

  // Graduation feature
  'certificate_templates.read': 'graduation',
  'certificate_templates.create': 'graduation',
  'certificate_templates.update': 'graduation',
  'certificate_templates.delete': 'graduation',
  'certificate_templates.activate': 'graduation',
  'certificate_templates.deactivate': 'graduation',
  'graduation_batches.read': 'graduation',
  'graduation_batches.create': 'graduation',
  'graduation_batches.generate_students': 'graduation',
  'graduation_batches.approve': 'graduation',
  'graduation_batches.issue': 'graduation',
  'issued_certificates.read': 'graduation',
  'certificates.issue': 'graduation',
  'certificates.print': 'graduation',
  'certificates.revoke': 'graduation',

  // ID cards feature
  'id_cards.read': 'id_cards',
  'id_cards.create': 'id_cards',
  'id_cards.update': 'id_cards',
  'id_cards.delete': 'id_cards',
  'id_cards.export': 'id_cards',

  // Finance feature
  'finance_accounts.read': 'finance',
  'finance_accounts.create': 'finance',
  'finance_accounts.update': 'finance',
  'finance_accounts.delete': 'finance',
  'income_entries.read': 'finance',
  'income_entries.create': 'finance',
  'income_entries.update': 'finance',
  'income_entries.delete': 'finance',
  'income_categories.read': 'finance',
  'income_categories.create': 'finance',
  'income_categories.update': 'finance',
  'income_categories.delete': 'finance',
  'expense_entries.read': 'finance',
  'expense_entries.create': 'finance',
  'expense_entries.update': 'finance',
  'expense_entries.delete': 'finance',
  'expense_categories.read': 'finance',
  'expense_categories.create': 'finance',
  'expense_categories.update': 'finance',
  'expense_categories.delete': 'finance',
  'finance_projects.read': 'finance',
  'finance_projects.create': 'finance',
  'finance_projects.update': 'finance',
  'finance_projects.delete': 'finance',
  'donors.read': 'finance',
  'donors.create': 'finance',
  'donors.update': 'finance',
  'donors.delete': 'finance',
  'finance_reports.read': 'finance',
  'finance_documents.read': 'finance',
  'finance_documents.create': 'finance',
  'finance_documents.update': 'finance',
  'finance_documents.delete': 'finance',

  // Fees feature
  'fees.read': 'fees',
  'fees.create': 'fees',
  'fees.update': 'fees',
  'fees.delete': 'fees',
  'fees.payments.create': 'fees',
  'fees.exceptions.create': 'fees',
  'fees.exceptions.approve': 'fees',

  // Multi-currency feature
  'currencies.read': 'multi_currency',
  'currencies.create': 'multi_currency',
  'currencies.update': 'multi_currency',
  'currencies.delete': 'multi_currency',
  'exchange_rates.read': 'multi_currency',
  'exchange_rates.create': 'multi_currency',
  'exchange_rates.update': 'multi_currency',
  'exchange_rates.delete': 'multi_currency',

  // DMS feature
  'dms.incoming.read': 'dms',
  'dms.incoming.create': 'dms',
  'dms.incoming.update': 'dms',
  'dms.incoming.delete': 'dms',
  'dms.outgoing.read': 'dms',
  'dms.outgoing.create': 'dms',
  'dms.outgoing.update': 'dms',
  'dms.outgoing.delete': 'dms',
  'dms.outgoing.generate_pdf': 'dms',
  'dms.templates.read': 'dms',
  'dms.templates.create': 'dms',
  'dms.templates.update': 'dms',
  'dms.templates.delete': 'dms',
  'dms.letterheads.read': 'dms',
  'dms.letterheads.create': 'dms',
  'dms.letterheads.update': 'dms',
  'dms.letterheads.delete': 'dms',
  'dms.letterheads.manage': 'dms',
  'dms.letter_types.read': 'dms',
  'dms.letter_types.create': 'dms',
  'dms.letter_types.update': 'dms',
  'dms.letter_types.delete': 'dms',
  'dms.departments.read': 'dms',
  'dms.departments.create': 'dms',
  'dms.departments.update': 'dms',
  'dms.departments.delete': 'dms',
  'dms.files.read': 'dms',
  'dms.files.create': 'dms',
  'dms.files.update': 'dms',
  'dms.files.delete': 'dms',
  'dms.files.download': 'dms',
  'dms.reports.read': 'dms',
  'dms.settings.read': 'dms',
  'dms.settings.manage': 'dms',
  'dms.archive.read': 'dms',
  'dms.archive.search': 'dms',

  // Events feature
  'events.read': 'events',
  'events.create': 'events',
  'events.update': 'events',
  'events.delete': 'events',
  'event_types.read': 'events',
  'event_types.create': 'events',
  'event_types.update': 'events',
  'event_types.delete': 'events',
  'event_guests.read': 'events',
  'event_guests.create': 'events',
  'event_guests.update': 'events',
  'event_guests.delete': 'events',
  'event_guests.import': 'events',
  'event_guests.checkin': 'events',
  'event_checkins.read': 'events',
  'event_checkins.create': 'events',
  'event_checkins.update': 'events',
  'event_checkins.delete': 'events',

  // Leave management feature
  'leave_requests.read': 'leave_management',
  'leave_requests.create': 'leave_management',
  'leave_requests.update': 'leave_management',
  'leave_requests.delete': 'leave_management',

  // Legacy finance permissions (backward compatibility)
  'finance_income.read': 'finance',
  'finance_income.create': 'finance',
  'finance_income.update': 'finance',
  'finance_income.delete': 'finance',
  'finance_expense.read': 'finance',
  'finance_expense.create': 'finance',
  'finance_expense.update': 'finance',
  'finance_expense.delete': 'finance',
  'finance_donors.read': 'finance',
  'finance_donors.create': 'finance',
  'finance_donors.update': 'finance',
  'finance_donors.delete': 'finance',
};

/**
 * Get the feature key(s) required for a permission (if any)
 */
function getFeatureKeysForPermission(permissionName: string): string[] {
  const mapped = PERMISSION_TO_FEATURE_MAP[permissionName];
  if (!mapped) {
    return [];
  }
  return Array.isArray(mapped) ? mapped : [mapped];
}

/**
 * Get a single feature key for grouping permissions in UI (e.g. permissions dialog).
 * Returns the first feature key or 'other' for permissions not mapped to a feature.
 */
export function getFeatureKeyForGrouping(permissionName: string): string {
  const keys = getFeatureKeysForPermission(permissionName);
  return keys[0] ?? 'other';
}

const READONLY_ACTIONS = new Set([
  'read',
  'export',
  'view',
  'report',
  'stats',
  'download',
  'print',
  'search',
  'lookup',
  'preview',
]);

function getPermissionAction(permissionName: string): string {
  const parts = permissionName.split('.');
  return parts[parts.length - 1] || permissionName;
}

function isReadOnlyPermission(permissionName: string): boolean {
  const action = getPermissionAction(permissionName);

  if (READONLY_ACTIONS.has(action)) {
    return true;
  }

  if (action.startsWith('view_')) {
    return true;
  }

  if (action.endsWith('_report') || action.endsWith('_reports')) {
    return true;
  }

  return false;
}

function getFeatureAccessLevel(feature: { accessLevel?: string; isAccessible?: boolean; isEnabled?: boolean }): 'full' | 'readonly' | 'none' {
  if (feature.accessLevel === 'full' || feature.accessLevel === 'readonly' || feature.accessLevel === 'none') {
    return feature.accessLevel;
  }

  if (feature.isAccessible) {
    return 'full';
  }

  return feature.isEnabled ? 'full' : 'none';
}

function canUseFeatureForPermission(feature: { accessLevel?: string; isAccessible?: boolean; isEnabled?: boolean }, permissionName: string): boolean {
  const accessLevel = getFeatureAccessLevel(feature);

  if (accessLevel === 'full') {
    return true;
  }

  if (accessLevel === 'readonly') {
    return isReadOnlyPermission(permissionName);
  }

  return false;
}

/**
 * Combined hook that checks both permission AND feature access
 * Returns true only if BOTH conditions are met:
 * 1. User has the permission
 * 2. User's organization has the required feature enabled (if feature is required)
 * 
 * CRITICAL: Always calls useFeatures() unconditionally to follow Rules of Hooks
 */
export const useHasPermissionAndFeature = (permissionName: string): boolean | undefined => {
  const { profile } = useAuth();
  const hasPermission = useHasPermission(permissionName);
  const featureKeys = getFeatureKeysForPermission(permissionName);
  
  // CRITICAL: Always call useFeatures() unconditionally (Rules of Hooks)
  // Even if no feature is required, we still call the hook to maintain hook order
  const { data: features, isLoading: featuresLoading, error: featuresError } = useFeatures();
  
  // If no feature is required for this permission, just check permission
  if (featureKeys.length === 0) {
    return hasPermission;
  }
  
  // If permissions are loading, return undefined
  if (hasPermission === undefined) {
    return undefined;
  }

  if (profile?.is_event_user) {
    return hasPermission;
  }
  
  // If features query has an error (e.g., 402 Payment Required), treat as feature not available
  // This ensures buttons are hidden when features are disabled, even if the query fails
  if (featuresError) {
    // If permission is false, return false
    if (!hasPermission) {
      return false;
    }
    // Permission is true but feature query failed - assume feature is not available
    // This handles 402 errors where features endpoint itself might be blocked
    return false;
  }
  
  // If features are loading, return undefined (wait for data)
  // But only if we have placeholder data (empty array) - otherwise wait
  if (featuresLoading) {
    // If we have placeholder data (empty array), we can make a decision
    // Otherwise, wait for actual data
    if (features !== undefined && Array.isArray(features)) {
      // TypeScript: features is guaranteed to be defined and an array here
      const featuresArray = features;
      // We have placeholder data, check if feature exists
      if (featuresArray.length === 0) {
        // Empty array means no features available
        return false;
      }
      // Has some features, check if our feature is in the list
      const hasFeature = featuresArray.some((feature) => featureKeys.includes(feature.featureKey) && canUseFeatureForPermission(feature, permissionName));
      return hasFeature && hasPermission;
    }
    // No placeholder data yet, wait
    return undefined;
  }
  
  // If features data is not yet loaded (undefined), return undefined (wait for data)
  if (features === undefined) {
    return undefined;
  }
  
  // If features array is empty, assume feature is not enabled
  // This handles cases where the query returns empty array (e.g., 402 error handled in queryFn)
  if (!features || features.length === 0) {
    // CRITICAL: If features array is empty, feature is not available
    // Return false even if permission is true (feature access is required)
    return false;
  }
  
  // Check if the specific feature is enabled
  // CRITICAL: Must check if ANY of the featureKeys are in the enabled features list
  const hasFeature = features.some((feature) => 
    featureKeys.includes(feature.featureKey) && canUseFeatureForPermission(feature, permissionName)
  );
  
  // Both must be true - if permission is false, return false immediately
  if (!hasPermission) {
    return false;
  }
  
  // CRITICAL: Permission is true, but feature must also be true
  // If feature is not in the list or not enabled, return false
  if (!hasFeature) {
    return false;
  }
  
  return true;
};

/**
 * Combined hook that checks whether the user has ANY of the permissions
 * and the required feature access (if applicable).
 */
export const useHasAnyPermissionAndFeature = (permissionNames: string[]): boolean | undefined => {
  const { profile } = useAuth();
  const { data: userPermissions, isLoading: permissionsLoading } = useUserPermissions();
  const { data: features, isLoading: featuresLoading, error: featuresError } = useFeatures();

  const hasProfile = profile?.organization_id !== undefined && profile !== null;
  const queryCanRun = hasProfile && !permissionsLoading;
  const hasPermissionsData = Array.isArray(userPermissions);
  const permissionsReady = hasProfile && queryCanRun && hasPermissionsData;

  if (!permissionsReady) {
    return undefined;
  }

  if (!permissionNames || permissionNames.length === 0 || !userPermissions) {
    return false;
  }

  const permissionsSet = new Set(userPermissions);

  if (profile?.is_event_user) {
    return permissionNames.some((permissionName) => permissionsSet.has(permissionName));
  }

  // First pass: any permission without a feature requirement grants access.
  for (const permissionName of permissionNames) {
    if (!permissionsSet.has(permissionName)) {
      continue;
    }
    const featureKeys = getFeatureKeysForPermission(permissionName);
    if (featureKeys.length === 0) {
      return true;
    }
  }

  // Only feature-bound permissions could grant access.
  if (featuresError) {
    return false;
  }

  if (featuresLoading) {
    if (features !== undefined && Array.isArray(features)) {
      // TypeScript: features is guaranteed to be defined and an array here
      const featuresArray = features;
      if (featuresArray.length === 0) {
        return false;
      }
    } else {
      return undefined;
    }
  }

  if (!features || !Array.isArray(features) || features.length === 0) {
    return false;
  }
  
  // TypeScript: features is guaranteed to be defined and an array here
  const featuresArray = features;

  for (const permissionName of permissionNames) {
    if (!permissionsSet.has(permissionName)) {
      continue;
    }
    const featureKeys = getFeatureKeysForPermission(permissionName);
    if (featureKeys.length === 0) {
      continue;
    }
    const hasFeature = features.some((feature) => featureKeys.includes(feature.featureKey) && canUseFeatureForPermission(feature, permissionName));
    if (hasFeature) {
      return true;
    }
  }

  return false;
};

export const useAssignPermissionToRole = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const canUpdatePermissions = useHasPermission('permissions.update');

  return useMutation({
    mutationFn: async ({ role, permissionId }: { role: string; permissionId: string }) => {
      if (!profile) {
        throw new Error('User not authenticated');
      }

      if (!canUpdatePermissions) {
        throw new Error('You do not have permission to assign permissions');
      }

      if (!profile.organization_id) {
        throw new Error('User must be assigned to an organization');
      }

      return await permissionsApi.assignPermissionToRole({
        role,
        permission_id: permissionId,
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions', variables.role] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      showToast.success(`Permission assigned to ${variables.role} role`);
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.permissionAssignFailed');
    },
  });
};

export const useRemovePermissionFromRole = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const canUpdatePermissions = useHasPermission('permissions.update');

  return useMutation({
    mutationFn: async ({ role, permissionId }: { role: string; permissionId: string }) => {
      if (!profile) {
        throw new Error('User not authenticated');
      }

      if (!canUpdatePermissions) {
        throw new Error('You do not have permission to remove permissions');
      }

      if (!profile.organization_id) {
        throw new Error('User must be assigned to an organization');
      }

      return await permissionsApi.removePermissionFromRole({
        role,
        permission_id: permissionId,
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions', variables.role] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      showToast.success(`Permission removed from ${variables.role} role`);
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.permissionRemoveFailed');
    },
  });
};

export const useCreatePermission = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const canCreatePermissions = useHasPermission('permissions.create');

  return useMutation({
    mutationFn: async (permissionData: {
      name: string;
      resource: string;
      action: string;
      description?: string | null;
    }) => {
      if (!profile) {
        throw new Error('User not authenticated');
      }

      if (!canCreatePermissions) {
        throw new Error('You do not have permission to create permissions');
      }

      if (!profile.organization_id) {
        throw new Error('User must be assigned to an organization');
      }

      return await permissionsApi.create({
        name: permissionData.name,
        resource: permissionData.resource,
        action: permissionData.action,
        description: permissionData.description || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      showToast.success('toast.permissionCreated');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.permissionCreateFailed');
    },
  });
};

export const useUpdatePermission = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const canUpdatePermissions = useHasPermission('permissions.update');

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      name?: string;
      resource?: string;
      action?: string;
      description?: string | null;
    }) => {
      if (!profile) {
        throw new Error('User not authenticated');
      }

      if (!canUpdatePermissions) {
        throw new Error('You do not have permission to update permissions');
      }

      if (!profile.organization_id) {
        throw new Error('User must be assigned to an organization');
      }

      return await permissionsApi.update(id, {
        name: updates.name,
        resource: updates.resource,
        action: updates.action,
        description: updates.description,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      showToast.success('toast.permissionUpdated');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.permissionUpdateFailed');
    },
  });
};

export const useDeletePermission = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const canUpdatePermissions = useHasPermission('permissions.update');

  return useMutation({
    mutationFn: async (permissionId: string) => {
      if (!profile) {
        throw new Error('User not authenticated');
      }

      if (!canUpdatePermissions) {
        throw new Error('You do not have permission to delete permissions');
      }

      if (!profile.organization_id) {
        throw new Error('User must be assigned to an organization');
      }

      return await permissionsApi.delete(permissionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      showToast.success('toast.permissionDeleted');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.permissionDeleteFailed');
    },
  });
};

// ============================================================================
// User Permissions Hooks (for managing per-user permissions)
// ============================================================================

export const useUserPermissionsForUser = (userId: string) => {
  const { profile } = useAuth();
  const { data: allPermissions } = usePermissions();

  return useQuery({
    queryKey: ['user-permissions-for-user', userId, profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!userId) {
        return { userPermissions: [], rolePermissions: [], allPermissions: [] };
      }

      if (!profile?.organization_id) {
        return { userPermissions: [], rolePermissions: [], allPermissions: [] };
      }

      const response = await permissionsApi.userPermissionsForUser(userId);
      const data = response as {
        user_id: string;
        all_permissions: string[];
        direct_permissions: Array<{ id: string; name: string }>;
        role_permissions: Array<{ id: string; name: string }>;
      };

      // Map permission objects from backend response to component format
      const directPerms = (data.direct_permissions || []).map(permData => {
        const perm = allPermissions?.find(p => p.id === permData.id || p.name === permData.name);
        return {
          permission_id: permData.id, // Use ID directly from backend
          permission: perm || null,
        };
      });

      const rolePerms = (data.role_permissions || []).map(permData => {
        const perm = allPermissions?.find(p => p.id === permData.id || p.name === permData.name);
        return {
          permission_id: permData.id, // Use ID directly from backend
          permission: perm || null,
        };
      });

      return {
        userPermissions: directPerms,
        rolePermissions: rolePerms,
        allPermissions: data.all_permissions || [],
      };
    },
    enabled: !!userId && !!profile && !!allPermissions,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useAssignPermissionToUser = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const canUpdatePermissions = useHasPermission('permissions.update');

  return useMutation({
    mutationFn: async ({ userId, permissionId }: { userId: string; permissionId: string }) => {
      if (!profile) {
        throw new Error('User not authenticated');
      }

      if (!canUpdatePermissions) {
        throw new Error('You do not have permission to assign user permissions');
      }

      if (!profile.organization_id) {
        throw new Error('User must be assigned to an organization');
      }

      // Validate permission ID is valid (permissions use integer IDs, not UUIDs)
      if (!permissionId || (typeof permissionId !== 'number' && typeof permissionId !== 'string')) {
        throw new Error('Invalid permission ID. Please refresh the page and try again.');
      }

      return await permissionsApi.assignPermissionToUser({
        user_id: userId,
        permission_id: permissionId,
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions-for-user', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      showToast.success('toast.permissionAssignedToUser');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.permissionAssignFailed');
    },
  });
};

export const useRemovePermissionFromUser = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const canUpdatePermissions = useHasPermission('permissions.update');

  return useMutation({
    mutationFn: async ({ userId, permissionId }: { userId: string; permissionId: string }) => {
      if (!profile) {
        throw new Error('User not authenticated');
      }

      if (!canUpdatePermissions) {
        throw new Error('You do not have permission to remove user permissions');
      }

      if (!profile.organization_id) {
        throw new Error('User must be assigned to an organization');
      }

      // Validate permission ID is valid (permissions use integer IDs, not UUIDs)
      if (!permissionId || (typeof permissionId !== 'number' && typeof permissionId !== 'string')) {
        throw new Error('Invalid permission ID. Please refresh the page and try again.');
      }

      return await permissionsApi.removePermissionFromUser({
        user_id: userId,
        permission_id: permissionId,
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions-for-user', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      showToast.success('toast.permissionRemovedFromUser');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.permissionRemoveFailed');
    },
  });
};

// ============================================================================
// User Role Management Hooks
// ============================================================================

export const useAssignRoleToUser = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const canUpdatePermissions = useHasPermission('permissions.update');

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      if (!profile) {
        throw new Error('User not authenticated');
      }

      if (!canUpdatePermissions) {
        throw new Error('You do not have permission to assign roles');
      }

      if (!profile.organization_id) {
        throw new Error('User must be assigned to an organization');
      }

      return await permissionsApi.assignRoleToUser({
        user_id: userId,
        role,
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions-for-user', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['user-roles', variables.userId] });
      showToast.success(`Role ${variables.role} assigned to user`);
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.roleAssignFailed');
    },
  });
};

export const useRemoveRoleFromUser = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const canUpdatePermissions = useHasPermission('permissions.update');

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      if (!profile) {
        throw new Error('User not authenticated');
      }

      if (!canUpdatePermissions) {
        throw new Error('You do not have permission to remove roles');
      }

      if (!profile.organization_id) {
        throw new Error('User must be assigned to an organization');
      }

      return await permissionsApi.removeRoleFromUser({
        user_id: userId,
        role,
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions-for-user', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['user-roles', variables.userId] });
      showToast.success(`Role ${variables.role} removed from user`);
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.roleRemoveFailed');
    },
  });
};

export const useUserRoles = (userId: string) => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['user-roles', userId, profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!userId || !profile?.organization_id) {
        return { user_id: userId, roles: [] };
      }

      const response = await permissionsApi.userRoles(userId);
      return response as { user_id: string; roles: string[] };
    },
    enabled: !!userId && !!profile?.organization_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
