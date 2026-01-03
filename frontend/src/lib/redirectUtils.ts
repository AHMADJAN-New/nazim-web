import { useAuth } from '@/hooks/useAuth';
import { useUserPermissions } from '@/hooks/usePermissions';
import { eventsApi } from '@/lib/api/client';

/**
 * Get the redirect path after login based on user permissions and event user status
 * Priority:
 * 1. If user is event user -> redirect to their assigned event
 * 2. If user has only event_checkins.create -> redirect to first published event's check-in page
 * 3. If user has only event_guests.create -> redirect to first published event's add guest page
 * 4. If user has both -> redirect to first published event
 * 5. If user has dashboard permission -> redirect to dashboard
 * 6. Otherwise -> redirect to dashboard
 */
export async function getPostLoginRedirectPath(permissions: string[], profile?: { event_id?: string | null; is_event_user?: boolean } | null): Promise<string> {
  // CRITICAL: Event users should be redirected to their assigned event
  if (profile?.is_event_user && profile?.event_id) {
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

  const hasCheckinPermission = permissions.includes('event_checkins.create');
  const hasGuestCreatePermission = permissions.includes('event_guests.create');
  const hasEventsReadPermission = permissions.includes('events.read');
  const hasDashboardPermission = permissions.includes('dashboard.read');

  // If user has event-related permissions, try to find first published event
  if (hasCheckinPermission || hasGuestCreatePermission) {
    try {
      // Fetch first published event
      const events = await eventsApi.list({ status: 'published', page: 1, per_page: 1 });
      if (events && events.data && events.data.length > 0) {
        const firstEvent = events.data[0];
        
        // If user has only check-in permission, redirect to check-in page
        if (hasCheckinPermission && !hasGuestCreatePermission) {
          return `/events/${firstEvent.id}/checkin`;
        }
        
        // If user has only add guest permission, redirect to add guest page
        if (hasGuestCreatePermission && !hasCheckinPermission) {
          return `/events/${firstEvent.id}/guests/add`;
        }
        
        // If user has both, redirect to event detail page
        return `/events/${firstEvent.id}`;
      }
    } catch (error) {
      // If error fetching events, fall back to events list
      if (import.meta.env.DEV) {
        console.warn('Failed to fetch events for redirect:', error);
      }
    }
    
    // Fallback to events list if no published events found
    return '/events';
  }

  // If user has dashboard permission, go to dashboard
  if (hasDashboardPermission) {
    return '/dashboard';
  }

  // Default to dashboard for any other users
  return '/dashboard';
}

/**
 * Hook to get redirect path after login (returns promise)
 * Note: This hook is async, use it in useEffect or async functions
 */
export function usePostLoginRedirectPath(): Promise<string> {
  const { data: permissions = [] } = useUserPermissions();
  const { profile } = useAuth();
  return getPostLoginRedirectPath(permissions, profile);
}

