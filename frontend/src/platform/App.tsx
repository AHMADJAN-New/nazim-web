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
  const { data: permissions, isLoading: permissionsLoading } = usePlatformAdminPermissions();

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

  // Check for platform admin permission (global, not organization-scoped)
  const hasPlatformAdmin = permissions?.includes('subscription.admin') ?? false;

  if (!hasPlatformAdmin) {
    return <Navigate to="/platform/login" replace />;
  }

  return <>{children}</>;
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

