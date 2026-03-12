import { useAuth } from '@/hooks/useAuth';
import { useUserPermissions } from '@/hooks/usePermissions';
import { apiClient } from '@/lib/api/client';
import { useFeatures, type FeatureInfo } from '@/hooks/useSubscription';

const ORG_LEVEL_ROLES = [
  'organization_admin',
  'organization_hr_admin',
  'hr_officer',
  'payroll_officer',
  'principal',
];

/**
 * Get the redirect path after login based on user permissions and event user status
 * Priority:
 * 1. If user is event user -> redirect to their assigned event (only if events feature is enabled)
 * 2. If user has an org-level role AND Enterprise plan -> redirect to /org-admin
 * 3. If user can access org dashboard (schools_access_all) AND Enterprise -> redirect to /org-admin
 * 4. If user has dashboard permission -> redirect to dashboard
 * 5. Otherwise -> redirect to dashboard
 */
export async function getPostLoginRedirectPath(
  permissions: string[], 
  profile?: {
    event_id?: string | null;
    is_event_user?: boolean;
    role?: string | null;
    schools_access_all?: boolean;
  } | null,
  features?: FeatureInfo[]
): Promise<string> {
  const hasEventsFeature = features?.some((f) => {
    if (f.featureKey !== 'events') return false;
    return f.isAccessible ?? f.isEnabled ?? false;
  }) ?? false;

  if (profile?.is_event_user && profile?.event_id && hasEventsFeature) {
    const hasCheckinPermission = permissions.includes('event_checkins.create');
    const hasGuestCreatePermission = permissions.includes('event_guests.create');
    
    if (hasCheckinPermission && !hasGuestCreatePermission) {
      return `/events/${profile.event_id}/checkin`;
    }
    if (hasGuestCreatePermission && !hasCheckinPermission) {
      return `/events/${profile.event_id}/guests/add`;
    }
    return `/events/${profile.event_id}`;
  }

  const isOrgLevelRole = ORG_LEVEL_ROLES.includes(profile?.role ?? '');

  const canAccessOrgAdmin =
    isOrgLevelRole ||
    (
      profile?.schools_access_all === true &&
      (
        permissions.includes('organizations.read') ||
        permissions.includes('dashboard.read') ||
        permissions.includes('school_branding.read')
      )
    );

  if (canAccessOrgAdmin) {
    try {
      const response = await apiClient.get('/subscription/plan-slug') as { plan_slug?: string | null };
      if (response?.plan_slug === 'enterprise') {
        return '/org-admin';
      }
    } catch {
      // Fall through to /dashboard if plan-slug fetch fails
    }
  }

  const hasDashboardPermission = permissions.includes('dashboard.read');
  if (hasDashboardPermission) {
    return '/dashboard';
  }

  return '/dashboard';
}

/**
 * Hook to get redirect path after login (returns promise)
 */
export function usePostLoginRedirectPath(): Promise<string> {
  const { data: permissions = [] } = useUserPermissions();
  const { profile } = useAuth();
  const { data: features } = useFeatures();
  return getPostLoginRedirectPath(permissions, profile, features);
}
