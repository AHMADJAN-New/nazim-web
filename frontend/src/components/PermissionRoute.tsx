import { ReactNode } from 'react';

import { PermissionGuard } from './PermissionGuard';

import { LoadingSpinner } from '@/components/ui/loading';
import { useAuth } from '@/hooks/useAuth';
import { useUserPermissions } from '@/hooks/usePermissions';


interface PermissionRouteProps {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
  showError?: boolean;
  /**
   * If true, checks both permission AND feature access (default: true)
   * If false, only checks permission (legacy behavior)
   */
  checkFeature?: boolean;
}

/**
 * Wrapper component that prevents lazy-loaded components from loading
 * until permissions are ready. This prevents the flash of content.
 * 
 * IMPORTANT: This component must return null (not a loading spinner) when permissions
 * aren't ready, to prevent React from trying to render children (which triggers lazy loading).
 */
export function PermissionRoute({
  permission,
  children,
  fallback,
  showError = true,
  checkFeature = true,
}: PermissionRouteProps) {
  const { profile } = useAuth();
  const { data: permissions, isLoading } = useUserPermissions();

  // Permissions are needed for all users

  // Permissions are ready if:
  // 1. We have a profile with organization_id (query can run)
  // 2. Query is not loading (has completed or is disabled)
  // 3. We have permissions data (even if empty array)
  const hasProfile = profile?.organization_id !== undefined && profile !== null;
  const queryCanRun = hasProfile && !isLoading;
  // With placeholderData and initialData, permissions should always be an array, never undefined
  const hasPermissionsData = Array.isArray(permissions);
  const permissionsReady = hasProfile && queryCanRun && hasPermissionsData;

  // Show loading state while permissions are loading
  // CRITICAL: Return early to prevent React from evaluating children
  // This prevents lazy components from loading until permissions are ready
  if (!permissionsReady) {
    return <LoadingSpinner size="lg" text="Loading permissions..." />;
  }

  // Once permissions are ready, use PermissionGuard to check the specific permission
  // Only now will React evaluate children, which triggers lazy component loading
  return (
    <PermissionGuard permission={permission} fallback={fallback} showError={showError} checkFeature={checkFeature}>
      {children}
    </PermissionGuard>
  );
}

