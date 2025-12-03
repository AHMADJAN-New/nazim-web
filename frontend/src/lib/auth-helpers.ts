// For now, they throw errors indicating they need to be updated

/**
 * Auth helper functions for permission checking and access control
 */

export interface Profile {
  id: string;
  organization_id: string | null;
  role: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
}

/**
 * Require user to be authenticated
 * Throws error if not authenticated
 * TODO: Migrate to Laravel API
 */
export async function requireAuth(): Promise<any> {
  throw new Error('requireAuth needs to be migrated to Laravel API. Use useAuth hook instead.');
}

/**
 * Get user's profile
 * TODO: Migrate to Laravel API - use profilesApi.get() instead
 */
export async function getUserProfile(userId: string): Promise<Profile | null> {
  throw new Error('getUserProfile needs to be migrated to Laravel API. Use profilesApi.get() or useAuth hook instead.');
}

/**
 * Get current user's organization ID
 */
export async function getUserOrganization(): Promise<string | null> {
  const user = await requireAuth();
  const profile = await getUserProfile(user.id);
  return profile?.organization_id || null;
}


/**
 * Require user to have a specific role
 * Throws error if user doesn't have the role
 */
export async function requireRole(requiredRole: string): Promise<Profile> {
  const user = await requireAuth();
  const profile = await getUserProfile(user.id);

  if (!profile) {
    throw new Error('Profile not found');
  }

  if (profile.role !== requiredRole) {
    throw new Error(`Role '${requiredRole}' required`);
  }

  return profile;
}

/**
 * Check if user has a specific permission
 */
export async function userHasPermission(permissionName: string): Promise<boolean> {
  const user = await requireAuth();
  const profile = await getUserProfile(user.id);

  if (!profile) {
    return false;
  }

  // TODO: Migrate to Laravel API - use permissionsApi.userPermissions() instead
  throw new Error('userHasPermission needs to be migrated to Laravel API. Use useHasPermission hook instead.');
}

/**
 * Require user to have a specific permission
 * Throws error if user doesn't have the permission
 */
export async function requirePermission(permissionName: string): Promise<void> {
  const hasPermission = await userHasPermission(permissionName);

  if (!hasPermission) {
    throw new Error(`Permission '${permissionName}' required`);
  }
}

/**
 * Check if user can access an organization
 */
export async function canAccessOrganization(orgId: string): Promise<boolean> {
  const user = await requireAuth();
  const profile = await getUserProfile(user.id);

  if (!profile) {
    return false;
  }

  // All users can only access their own organization
  return profile.organization_id === orgId;
}

/**
 * Require user to be able to access an organization
 * Throws error if user cannot access the organization
 */
export async function requireOrganizationAccess(orgId: string): Promise<void> {
  const canAccess = await canAccessOrganization(orgId);

  if (!canAccess) {
    throw new Error('Access denied to this organization');
  }
}

/**
 * Get user's role
 */
export async function getUserRole(): Promise<string | null> {
  const user = await requireAuth();
  const profile = await getUserProfile(user.id);
  return profile?.role || null;
}

