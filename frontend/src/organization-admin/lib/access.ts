export interface OrgAdminAccessProfile {
  role?: string | null;
  schools_access_all?: boolean;
  default_school_id?: string | null;
}

export const ORG_ADMIN_ENTRY_PERMISSIONS = [
  'organizations.read',
  'dashboard.read',
  'school_branding.read',
  'users.read',
  'roles.read',
  'permissions.read',
  'subscription.read',
  'hr_staff.read',
  'hr_assignments.read',
  'hr_payroll.read',
  'hr_reports.read',
  'org_finance.read',
] as const;

export function hasOrgAdminEntryPermission(permissions: readonly string[] = []): boolean {
  return ORG_ADMIN_ENTRY_PERMISSIONS.some((permission) => permissions.includes(permission));
}

export function canAccessOrgAdminArea(
  profile?: OrgAdminAccessProfile | null,
  permissions: readonly string[] = [],
): boolean {
  if (!profile) {
    return false;
  }

  return (
    profile?.role === 'organization_admin' ||
    profile?.role === 'platform_admin' ||
    profile?.role === 'admin' ||
    hasOrgAdminEntryPermission(permissions)
  );
}

/**
 * Decide whether an org-admin-capable user should land in /org-admin by default.
 * Users who already have a default school should still be able to use the school app.
 */
export function shouldDefaultToOrgAdminArea(
  profile?: OrgAdminAccessProfile | null,
  permissions: readonly string[] = [],
): boolean {
  if (!canAccessOrgAdminArea(profile, permissions)) {
    return false;
  }

  return !profile?.default_school_id;
}
