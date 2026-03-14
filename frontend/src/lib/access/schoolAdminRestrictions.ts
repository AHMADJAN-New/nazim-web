type RestrictedProfile = {
  role?: string | null;
  default_school_id?: string | null;
  schools_access_all?: boolean;
};

export const PROTECTED_ORGANIZATION_ROLE = 'organization_admin';

export function isProtectedOrganizationRole(roleName?: string | null): boolean {
  return roleName === PROTECTED_ORGANIZATION_ROLE;
}

export function isSchoolScopedAdmin(profile?: RestrictedProfile | null): boolean {
  return (
    profile?.role === 'admin' &&
    !!profile.default_school_id &&
    profile.schools_access_all !== true
  );
}

export function filterRolesForSchoolScopedAdmin<T extends { name: string }>(
  roles: T[] | undefined,
  profile?: RestrictedProfile | null,
): T[] {
  if (!roles) {
    return [];
  }

  if (!isSchoolScopedAdmin(profile)) {
    return roles;
  }

  return roles.filter((role) => !isProtectedOrganizationRole(role.name));
}

export function canSchoolScopedAdminManageRole(
  profile?: RestrictedProfile | null,
  roleName?: string | null,
): boolean {
  return !isSchoolScopedAdmin(profile) || !isProtectedOrganizationRole(roleName);
}

export function canSchoolScopedAdminManageUser(
  profile?: RestrictedProfile | null,
  userRole?: string | null,
): boolean {
  return canSchoolScopedAdminManageRole(profile, userRole);
}

export function isSchoolAdminRestrictedPermissionName(permissionName?: string | null): boolean {
  if (!permissionName) {
    return false;
  }

  return permissionName === 'schools.access_all'
    || permissionName.startsWith('hr_staff.')
    || permissionName.startsWith('hr_assignments.')
    || permissionName.startsWith('hr_payroll.')
    || permissionName.startsWith('hr_reports.')
    || permissionName.startsWith('org_finance.');
}

export function canRoleReceivePermission(
  roleName?: string | null,
  permissionName?: string | null,
): boolean {
  if (roleName !== 'admin') {
    return true;
  }

  return !isSchoolAdminRestrictedPermissionName(permissionName);
}

export function canProfileReceivePermission(
  profile?: RestrictedProfile | null,
  permissionName?: string | null,
): boolean {
  if (!isSchoolScopedAdmin(profile)) {
    return true;
  }

  return !isSchoolAdminRestrictedPermissionName(permissionName);
}

export function filterPermissionsForRole<T extends { name: string }>(
  permissions: T[] | undefined,
  roleName?: string | null,
): T[] {
  if (!permissions) {
    return [];
  }

  return permissions.filter((permission) => canRoleReceivePermission(roleName, permission.name));
}
