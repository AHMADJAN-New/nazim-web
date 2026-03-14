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

export const ORG_ADMIN_DASHBOARD_PERMISSIONS = [
  'organizations.read',
  'dashboard.read',
  'school_branding.read',
] as const;

export function hasOrgWideScope(profile?: OrgAdminAccessProfile | null): boolean {
  if (!profile) {
    return false;
  }

  return profile?.schools_access_all === true || !profile?.default_school_id;
}

export function hasOrgAdminEntryPermission(permissions: readonly string[] = []): boolean {
  return ORG_ADMIN_ENTRY_PERMISSIONS.some((permission) => permissions.includes(permission));
}

export function hasOrgAdminDashboardPermission(permissions: readonly string[] = []): boolean {
  return ORG_ADMIN_DASHBOARD_PERMISSIONS.some((permission) => permissions.includes(permission));
}

export function canAccessOrgAdminArea(
  profile?: OrgAdminAccessProfile | null,
  permissions: readonly string[] = [],
): boolean {
  if (!profile) {
    return false;
  }

  // "admin" is the school-scoped admin role in this app, not an org-wide org-admin role.
  if (profile?.role === 'admin') {
    return false;
  }

  if (profile?.role === 'platform_admin' || profile?.role === 'organization_admin') {
    return true;
  }

  if (!hasOrgWideScope(profile)) {
    return false;
  }

  return (
    hasOrgAdminEntryPermission(permissions)
  );
}

export function canAccessOrgAdminDashboard(
  profile?: OrgAdminAccessProfile | null,
  permissions: readonly string[] = [],
): boolean {
  if (profile?.role === 'admin') {
    return false;
  }

  if (!profile?.schools_access_all) {
    return false;
  }

  return (
    profile?.role === 'organization_admin' ||
    profile?.role === 'platform_admin' ||
    hasOrgAdminDashboardPermission(permissions)
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
