import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';


import { PlatformAdminLayout } from './components/PlatformAdminLayout';
import { usePlatformAdminPermissions } from './hooks/usePlatformAdminPermissions';
import DiscountCodesManagement from './pages/admin/DiscountCodesManagement';
import HelpCenterManagement from './pages/admin/HelpCenterManagement';
import MaintenanceHistory from './pages/admin/MaintenanceHistory';
import OrganizationSubscriptionDetail from './pages/admin/OrganizationSubscriptionDetail';
import SubscriptionAdminDashboard from './pages/admin/SubscriptionAdminDashboard';
import PlansManagement from './pages/admin/PlansManagement';
import PlanRequestsPage from './pages/admin/PlanRequestsPage';
import RenewalReviewPage from './pages/admin/RenewalReviewPage';
import PlatformSettings from './pages/admin/PlatformSettings';
import MaintenanceFeesManagement from './pages/admin/MaintenanceFeesManagement';
import LicenseFeesManagement from './pages/admin/LicenseFeesManagement';
import DesktopLicenseGeneration from './pages/admin/DesktopLicenseGeneration';
import { PlatformAdminDashboard } from './pages/PlatformAdminDashboard';
import { PlatformAdminLogin } from './pages/PlatformAdminLogin';
import { PlatformPermissionGroupsManagement } from './pages/PlatformPermissionGroupsManagement';

import { TranslationsManagement, OrganizationRevenueHistory } from '@/components/LazyComponents';
import { PageSkeleton } from '@/components/ui/loading';
import { LoadingSpinner } from '@/components/ui/loading';
import { Toaster } from '@/components/ui/sonner';
import { useAuth } from '@/hooks/useAuth';
import { LanguageProvider } from '@/hooks/useLanguage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedPlatformLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  // Debug: Log route changes
  if (import.meta.env.DEV) {
    console.log('[ProtectedPlatformLayout] Route:', location.pathname);
  }

  const {
    data: permissions,
    isLoading: permissionsLoading,
    error: permissionsError,
  } = usePlatformAdminPermissions();

  // Debug logging (only in dev mode)
  if (import.meta.env.DEV) {
    console.log('[ProtectedPlatformLayout] State:', {
      pathname: location.pathname,
      loading,
      permissionsLoading,
      user: user ? { id: user.id, email: user.email } : null,
      permissions: permissions === undefined ? 'undefined' : Array.isArray(permissions) ? `array[${permissions.length}]` : String(permissions),
      permissionsError: permissionsError ? String(permissionsError) : null,
    });
  }

  // If auth is loading OR permissions are loading, show spinner
  if (loading || permissionsLoading) {
    if (import.meta.env.DEV) {
      console.log('[ProtectedPlatformLayout] Showing loading spinner');
    }
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Checking access..." />
      </div>
    );
  }

  // If not logged in, go to platform login
  if (!user) {
    return <Navigate to="/platform/login" replace state={{ from: location }} />;
  }

  // CRITICAL: Wait for permissions to be definitively loaded
  // If permissions is undefined, the query hasn't completed yet
  if (permissions === undefined && !permissionsError) {
    if (import.meta.env.DEV) {
      console.log('[ProtectedPlatformLayout] Permissions still loading, showing spinner');
    }
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Checking permissions..." />
      </div>
    );
  }

  // Compute permission safely
  const hasPlatformAdmin =
    Array.isArray(permissions) && permissions.includes('subscription.admin');

  // If endpoint errored (including 403 patterns), treat as denial
  const errMsg = String((permissionsError as any)?.message ?? '');
  const status = (permissionsError as any)?.status ?? (permissionsError as any)?.response?.status;

  const looksDenied =
    status === 403 ||
    errMsg.includes('403') ||
    errMsg.includes('platform administrators') ||
    errMsg.includes('Access Denied') ||
    errMsg.includes('only accessible');

  if (import.meta.env.DEV) {
    console.log('[ProtectedPlatformLayout] Permission check:', {
      hasPlatformAdmin,
      looksDenied,
      permissionsArray: Array.isArray(permissions) ? permissions : 'not array',
      permissionsCount: Array.isArray(permissions) ? permissions.length : 0,
      willRedirect: !hasPlatformAdmin || looksDenied,
    });
  }

  if (!hasPlatformAdmin || looksDenied) {
    if (import.meta.env.DEV) {
      console.warn('[ProtectedPlatformLayout] Access denied, redirecting to /dashboard', {
        reason: !hasPlatformAdmin ? 'No subscription.admin permission' : '403 error detected',
        userEmail: user?.email,
      });
    }
    // Clear flags to prevent loops
    localStorage.removeItem('is_platform_admin_session');
    localStorage.removeItem('platform_admin_token_backup');

    // Soft redirect using Navigate (no hard refresh)
    return <Navigate to="/dashboard" replace />;
  }

  // ✅ Allowed: show platform layout + nested routes
  if (import.meta.env.DEV) {
    console.log('[ProtectedPlatformLayout] Access granted, rendering layout with Outlet');
    console.log('[ProtectedPlatformLayout] Current pathname:', location.pathname);
    console.log('[ProtectedPlatformLayout] Will render child route for:', location.pathname);
  }
  return (
    <PlatformAdminLayout>
      <Outlet />
    </PlatformAdminLayout>
  );
}

export function PlatformAdminApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <BrowserRouter>
          <Routes>
            {/* Login */}
            <Route path="/platform/login" element={<PlatformAdminLogin />} />

            {/* Protected platform routes */}
            <Route path="/platform" element={<ProtectedPlatformLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />

              <Route path="dashboard" element={<PlatformAdminDashboard />} />

              {/* IMPORTANT: specific routes first */}
              <Route
                path="organizations/:organizationId/subscription"
                element={<OrganizationSubscriptionDetail />}
              />

              <Route path="organizations" element={<PlatformAdminDashboard />} />
              <Route path="subscriptions" element={<SubscriptionAdminDashboard />} />
              <Route path="plans" element={<PlansManagement />} />
              <Route path="plan-requests" element={<PlanRequestsPage />} />
              <Route path="discount-codes" element={<DiscountCodesManagement />} />
              <Route path="renewals/:renewalId" element={<RenewalReviewPage />} />
              <Route path="pending" element={<SubscriptionAdminDashboard />} />
              <Route path="admins" element={<PlatformAdminDashboard />} />
              <Route path="revenue-history" element={
                <Suspense fallback={<PageSkeleton />}>
                  <OrganizationRevenueHistory />
                </Suspense>
              } />
              <Route path="maintenance-fees" element={
                <Suspense fallback={<PageSkeleton />}>
                  <MaintenanceFeesManagement />
                </Suspense>
              } />
              <Route path="license-fees" element={
                <Suspense fallback={<PageSkeleton />}>
                  <LicenseFeesManagement />
                </Suspense>
              } />
              <Route path="permission-groups" element={<PlatformPermissionGroupsManagement />} />
              {/* CRITICAL: More specific routes must come before less specific ones */}
              <Route path="settings/translations" element={
                <Suspense fallback={<PageSkeleton />}>
                  <TranslationsManagement />
                </Suspense>
              } />
              <Route path="settings" element={<PlatformSettings />} />
              <Route path="help-center" element={<HelpCenterManagement />} />
              <Route path="maintenance-history" element={<MaintenanceHistory />} />
              <Route path="desktop-licenses" element={<DesktopLicenseGeneration />} />

              {/* Fallback inside platform */}
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Route>

            {/* Global fallback */}
            <Route path="*" element={<Navigate to="/platform/login" replace />} />
          </Routes>

          <Toaster />
        </BrowserRouter>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

