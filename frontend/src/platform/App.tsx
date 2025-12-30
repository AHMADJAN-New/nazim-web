import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from '@/hooks/useLanguage';
import { Toaster } from '@/components/ui/sonner';
import { PlatformAdminLogin } from './pages/PlatformAdminLogin';
import { PlatformAdminDashboard } from './pages/PlatformAdminDashboard';
import { PlatformAdminLayout } from './components/PlatformAdminLayout';
import OrganizationSubscriptionDetail from './pages/admin/OrganizationSubscriptionDetail';
import SubscriptionAdminDashboard from './pages/admin/SubscriptionAdminDashboard';
import PlansManagement from './pages/admin/PlansManagement';
import DiscountCodesManagement from './pages/admin/DiscountCodesManagement';
import RenewalReviewPage from './pages/admin/RenewalReviewPage';
import { PlatformPermissionGroupsManagement } from './pages/PlatformPermissionGroupsManagement';
import { useAuth } from '@/hooks/useAuth';
import { usePlatformAdminPermissions } from './hooks/usePlatformAdminPermissions';
import { LoadingSpinner } from '@/components/ui/loading';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  // CRITICAL: Use platform admin permissions hook (not regular useUserPermissions)
  const { data: permissions, isLoading: permissionsLoading, error: permissionsError } = usePlatformAdminPermissions();
  const [hasRedirected, setHasRedirected] = React.useState(false);

  // CRITICAL: If permissions query failed with 403, user is not a platform admin
  // Clear the platform admin session flag and redirect to main app dashboard
  // CRITICAL: This useEffect must always be called (same order) to follow Rules of Hooks
  React.useEffect(() => {
    // Early returns to avoid conditional hook calls
    if (loading || permissionsLoading) return;
    if (!user) return;
    if (hasRedirected) return; // Already redirected
    
    const is403Error = permissionsError && (
      (permissionsError as any)?.message?.includes('403') || 
      (permissionsError as any)?.message?.includes('platform administrators') ||
      (permissionsError as any)?.message?.includes('Access Denied') ||
      (permissionsError as any)?.message?.includes('This endpoint is only accessible')
    );
    
    // Check for platform admin permission (global, not organization-scoped)
    const hasPlatformAdmin = permissions && Array.isArray(permissions) && permissions.includes('subscription.admin');

    // CRITICAL: If user doesn't have permission OR got 403 error, clear flag and redirect ONCE
    if (is403Error || (!hasPlatformAdmin && permissions !== undefined)) {
      // CRITICAL: Mark as redirected immediately to prevent multiple redirects
      setHasRedirected(true);
      
      // CRITICAL: Clear platform admin session flag to prevent redirect loops
      localStorage.removeItem('is_platform_admin_session');
      localStorage.removeItem('platform_admin_token_backup');
      
      // User is authenticated but not a platform admin - redirect to main app
      window.location.href = '/dashboard';
    }
  }, [loading, permissionsLoading, user, hasRedirected, permissionsError, permissions]);

  if (loading || permissionsLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/platform/login" replace />;
  }

  // If we've redirected, show loading
  if (hasRedirected) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Redirecting..." />
      </div>
    );
  }

  // Check for platform admin permission (global, not organization-scoped)
  const hasPlatformAdmin = permissions && Array.isArray(permissions) && permissions.includes('subscription.admin');

  // CRITICAL: Wait for permissions to load before making decisions
  // If permissions are still loading (undefined), show loading spinner
  if (permissions === undefined && !permissionsError && !permissionsLoading) {
    // Permissions query hasn't started yet or is still initializing
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Checking permissions..." />
      </div>
    );
  }

  // If permissions have loaded and user has permission, render children
  if (hasPlatformAdmin) {
    return <>{children}</>;
  }

  // If permissions loaded but user doesn't have permission, redirect will happen in useEffect
  // Just show loading spinner while redirect is in progress
  if (permissions !== undefined && !hasPlatformAdmin) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Redirecting..." />
      </div>
    );
  }

  // Default: show loading (permissions are still loading)
  return (
    <div className="flex h-screen items-center justify-center">
      <LoadingSpinner size="lg" text="Loading..." />
    </div>
  );
}

export function PlatformAdminApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/platform/login" element={<PlatformAdminLogin />} />
            <Route
              path="/platform/*"
              element={
                <ProtectedRoute>
                  <PlatformAdminLayout>
                    <Routes>
                      <Route path="dashboard" element={<PlatformAdminDashboard />} />
                      {/* CRITICAL: More specific routes must come BEFORE general routes */}
                      <Route path="organizations/:organizationId/subscription" element={<OrganizationSubscriptionDetail />} />
                      <Route path="organizations" element={<PlatformAdminDashboard />} />
                      <Route path="subscriptions" element={<SubscriptionAdminDashboard />} />
                      <Route path="plans" element={<PlansManagement />} />
                      <Route path="discount-codes" element={<DiscountCodesManagement />} />
                      <Route path="renewals/:renewalId" element={<RenewalReviewPage />} />
                      <Route path="pending" element={<SubscriptionAdminDashboard />} />
                      <Route path="admins" element={<PlatformAdminDashboard />} />
                      <Route path="permission-groups" element={<PlatformPermissionGroupsManagement />} />
                      <Route path="settings" element={<PlatformAdminDashboard />} />
                      <Route path="" element={<Navigate to="/platform/dashboard" replace />} />
                    </Routes>
                  </PlatformAdminLayout>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/platform/login" replace />} />
          </Routes>
          <Toaster />
        </BrowserRouter>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

