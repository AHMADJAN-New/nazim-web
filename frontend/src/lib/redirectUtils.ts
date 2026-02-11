import { useAuth } from '@/hooks/useAuth';
import { useUserPermissions } from '@/hooks/usePermissions';
import { eventsApi } from '@/lib/api/client';
import { useFeatures, type FeatureInfo } from '@/hooks/useSubscription';

/**
 * Get the redirect path after login based on user permissions and event user status
 * Priority:
 * 1. If user is event user -> redirect to their assigned event (only if events feature is enabled)
 * 2. If user can access org dashboard -> redirect to organization dashboard
 * 3. If user has dashboard permission -> redirect to dashboard
 * 4. Otherwise -> redirect to dashboard
 * 
 * CRITICAL: Only event users (is_event_user = true) are redirected to events pages.
 * Regular users with event permissions are NOT redirected to events on first login.
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
  // Check if events feature is enabled
  // Use the same pattern as useHasFeature hook: check isAccessible first, then isEnabled
  const hasEventsFeature = features?.some((f) => {
    if (f.featureKey !== 'events') return false;
    // Check isAccessible first (more accurate), fallback to isEnabled
    return f.isAccessible ?? f.isEnabled ?? false;
  }) ?? false;

  // CRITICAL: Only event users should be redirected to their assigned event (only if events feature is enabled)
  if (profile?.is_event_user && profile?.event_id && hasEventsFeature) {
    const hasCheckinPermission = permissions.includes('event_checkins.create');
    const hasGuestCreatePermission = permissions.includes('event_guests.create');
    
    // Redirect to appropriate page based on permissions
    if (hasCheckinPermission && !hasGuestCreatePermission) {
      return `/events/${profile.event_id}/checkin`;
    }
    if (hasGuestCreatePermission && !hasCheckinPermission) {
      return `/events/${profile.event_id}/guests/add`;
    }
    // If both or just events.read, go to event detail
    return `/events/${profile.event_id}`;
  }

  const canAccessOrganizationDashboard =
    profile?.schools_access_all === true &&
    (
      profile?.role === 'organization_admin' ||
      permissions.includes('organizations.read') ||
      permissions.includes('dashboard.read') ||
      permissions.includes('school_branding.read')
    );

  if (canAccessOrganizationDashboard) {
    return '/organization-dashboard';
  }

  const hasDashboardPermission = permissions.includes('dashboard.read');

  // If user has dashboard permission, go to dashboard
  if (hasDashboardPermission) {
    return '/dashboard';
  }

  // Default to dashboard for any other users (including non-event users with event permissions)
  return '/dashboard';
}

/**
 * Hook to get redirect path after login (returns promise)
 * Note: This hook is async, use it in useEffect or async functions
 */
export function usePostLoginRedirectPath(): Promise<string> {
  const { data: permissions = [] } = useUserPermissions();
  const { profile } = useAuth();
  const { data: features } = useFeatures();
  return getPostLoginRedirectPath(permissions, profile, features);
}
