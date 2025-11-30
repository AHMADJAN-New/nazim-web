import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

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
 */
export async function requireAuth(): Promise<User> {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    throw new Error('Authentication required');
  }
  
  return user;
}

/**
 * Get user's profile
 */
export async function getUserProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, organization_id, role, full_name, email, phone, avatar_url, is_active')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Failed to get user profile:', error);
    return null;
  }

  return data as Profile;
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
 * Check if current user is super admin
 */
export async function isSuperAdmin(): Promise<boolean> {
  const user = await requireAuth();
  const profile = await getUserProfile(user.id);
  return profile?.role === 'super_admin';
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
  
  if (profile.role !== requiredRole && profile.role !== 'super_admin') {
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
  
  // Super admin has all permissions
  if (profile.role === 'super_admin') {
    return true;
  }
  
  // Check permission via database function
  const { data, error } = await supabase.rpc('user_has_permission', {
    permission_name: permissionName,
  });
  
  if (error) {
    console.error('Failed to check permission:', error);
    return false;
  }
  
  return data === true;
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
  
  // Super admin can access all organizations
  if (profile.role === 'super_admin') {
    return true;
  }
  
  // Regular users can only access their own organization
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

