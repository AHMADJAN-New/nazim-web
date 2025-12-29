import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePlatformAdminPermissions } from '@/platform/hooks/usePlatformAdminPermissions';
import { LoadingSpinner } from '@/components/ui/loading';

interface PlatformAdminRouteProps {
  children: React.ReactNode;
}

/**
 * Platform Admin Route Guard
 * 
 * CRITICAL: Platform admins are NOT tied to organizations.
 * This route checks for subscription.admin permission (GLOBAL, not organization-scoped).
 * Users without organization_id can still access if they have subscription.admin permission.
 */
export function PlatformAdminRoute({ children }: PlatformAdminRouteProps) {
  const { user, loading } = useAuth();
  const { data: permissions, isLoading: permissionsLoading, isFetching: permissionsFetching } = usePlatformAdminPermissions();

  // CRITICAL: Wait for both auth and permissions to finish loading
  // Don't redirect until we're sure permissions are loaded (not just placeholder data)
  // isFetching is true when data is being fetched (including on mount/refetch)
  if (loading || permissionsLoading || (permissions === undefined && permissionsFetching)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/platform/login" replace />;
  }

  // CRITICAL: Only check permissions if they're actually loaded
  // If permissions is undefined, it means the query hasn't completed yet - keep loading
  if (permissions === undefined) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Now we know permissions are loaded (either array or null)
  // Check for platform admin permission (GLOBAL, not organization-scoped)
  const hasPlatformAdmin = Array.isArray(permissions) && permissions.includes('subscription.admin');

  if (!hasPlatformAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

