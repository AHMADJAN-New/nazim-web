import { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import ErrorBoundary from "@/components/ErrorBoundary";
import { SidebarProvider } from "@/components/ui/sidebar";
import { PersistentLayout } from "@/components/layout/PersistentLayout";

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/hooks/useLanguage";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleBasedRedirect from "./components/RoleBasedRedirect";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";

// Lazy-loaded components with optimized loading
import {
  Dashboard,
  PendingApprovalPage,
  ResetPasswordPage,
  DashboardSkeleton,
  PageSkeleton,
  BuildingsManagement,
  RoomsManagement,
  OrganizationsManagement,
  ProfileManagement,
  PermissionsManagement,
  SchoolsManagement,
  ReportTemplatesManagement,
  ResidencyTypesManagement,
  UserManagement,
  // Financial pages
  CurrenciesPage,
  FiscalYearsPage,
  CostCentersPage,
  IncomeCategoriesPage,
  ExpenseCategoriesPage,
  PaymentMethodsPage,
  AssetCategoriesPage,
  FundTypesPage,
  DebtCategoriesPage,
  FinancialAccountsPage
} from "@/components/LazyComponents";
import { PermissionGuard } from "@/components/PermissionGuard";

// Optimized QueryClient with better caching and performance settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 60 * 1000, // 30 minutes - data doesn't change often
      gcTime: 60 * 60 * 1000, // 1 hour (formerly cacheTime)
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false, // Don't refetch on window focus
      refetchOnMount: false, // Don't refetch on mount if data is fresh
      refetchOnReconnect: false, // Don't refetch on reconnect (prevents sidebar disappearing)
    },
    mutations: {
      retry: 2,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <LanguageProvider>
        <AuthProvider>
          <BrowserRouter>
            <SidebarProvider>
              <ErrorBoundary>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/redirect" element={<ProtectedRoute><RoleBasedRedirect /></ProtectedRoute>} />
                <Route path="/pending-approval" element={<ProtectedRoute><PendingApprovalPage /></ProtectedRoute>} />

                {/* Protected routes with persistent layout */}
                <Route element={<ProtectedRoute><PersistentLayout /></ProtectedRoute>}>
                  {/* Dashboard with optimized loading */}
                  <Route path="/dashboard" element={
                    <Suspense fallback={<DashboardSkeleton />}>
                      <Dashboard />
                    </Suspense>
                  } />
                  {/* Settings routes */}
                  <Route path="/settings/organizations" element={
                    <Suspense fallback={<PageSkeleton />}>
                      <PermissionGuard permission="organizations.read">
                        <OrganizationsManagement />
                      </PermissionGuard>
                    </Suspense>
                  } />
                  <Route path="/settings/buildings" element={
                    <Suspense fallback={<PageSkeleton />}>
                      <PermissionGuard permission="buildings.read">
                        <BuildingsManagement />
                      </PermissionGuard>
                    </Suspense>
                  } />
                  <Route path="/settings/rooms" element={
                    <Suspense fallback={<PageSkeleton />}>
                      <PermissionGuard permission="rooms.read">
                        <RoomsManagement />
                      </PermissionGuard>
                    </Suspense>
                  } />
                  <Route path="/settings/profile" element={
                    <Suspense fallback={<PageSkeleton />}>
                      <PermissionGuard permission="profiles.read">
                        <ProfileManagement />
                      </PermissionGuard>
                    </Suspense>
                  } />
                  <Route path="/settings/permissions" element={
                    <Suspense fallback={<PageSkeleton />}>
                      <PermissionsManagement />
                    </Suspense>
                  } />
                  <Route path="/settings/schools" element={
                    <Suspense fallback={<PageSkeleton />}>
                      <PermissionGuard permission="branding.read">
                        <SchoolsManagement />
                      </PermissionGuard>
                    </Suspense>
                  } />
                  <Route path="/settings/report-templates" element={
                    <Suspense fallback={<PageSkeleton />}>
                      <PermissionGuard permission="reports.read">
                        <ReportTemplatesManagement />
                      </PermissionGuard>
                    </Suspense>
                  } />
                  <Route path="/settings/residency-types" element={
                    <Suspense fallback={<PageSkeleton />}>
                      <PermissionGuard permission="academic.residency_types.read">
                        <ResidencyTypesManagement />
                      </PermissionGuard>
                    </Suspense>
                  } />
                  <Route path="/settings/backup" element={
                    <Suspense fallback={<PageSkeleton />}>
                      <PermissionGuard permission="backup.read">
                        <div className="p-6">
                          <h1 className="text-2xl font-bold mb-4">Backup & Restore</h1>
                          <p className="text-muted-foreground">Backup and restore functionality will be implemented here.</p>
                        </div>
                      </PermissionGuard>
                    </Suspense>
                  } />
                  
                  {/* Financial Settings Routes */}
                  <Route path="/settings/finance/currencies" element={
                    <Suspense fallback={<PageSkeleton />}>
                      <PermissionGuard permission="finance.currencies.read">
                        <CurrenciesPage />
                      </PermissionGuard>
                    </Suspense>
                  } />
                  <Route path="/settings/finance/fiscal-years" element={
                    <Suspense fallback={<PageSkeleton />}>
                      <PermissionGuard permission="finance.fiscal_years.read">
                        <FiscalYearsPage />
                      </PermissionGuard>
                    </Suspense>
                  } />
                  <Route path="/settings/finance/cost-centers" element={
                    <Suspense fallback={<PageSkeleton />}>
                      <PermissionGuard permission="finance.cost_centers.read">
                        <CostCentersPage />
                      </PermissionGuard>
                    </Suspense>
                  } />
                  <Route path="/settings/finance/income-categories" element={
                    <Suspense fallback={<PageSkeleton />}>
                      <PermissionGuard permission="finance.income_categories.read">
                        <IncomeCategoriesPage />
                      </PermissionGuard>
                    </Suspense>
                  } />
                  <Route path="/settings/finance/expense-categories" element={
                    <Suspense fallback={<PageSkeleton />}>
                      <PermissionGuard permission="finance.expense_categories.read">
                        <ExpenseCategoriesPage />
                      </PermissionGuard>
                    </Suspense>
                  } />
                  <Route path="/settings/finance/payment-methods" element={
                    <Suspense fallback={<PageSkeleton />}>
                      <PermissionGuard permission="finance.payment_methods.read">
                        <PaymentMethodsPage />
                      </PermissionGuard>
                    </Suspense>
                  } />
                  <Route path="/settings/finance/asset-categories" element={
                    <Suspense fallback={<PageSkeleton />}>
                      <PermissionGuard permission="finance.asset_categories.read">
                        <AssetCategoriesPage />
                      </PermissionGuard>
                    </Suspense>
                  } />
                  <Route path="/settings/finance/fund-types" element={
                    <Suspense fallback={<PageSkeleton />}>
                      <PermissionGuard permission="finance.fund_types.read">
                        <FundTypesPage />
                      </PermissionGuard>
                    </Suspense>
                  } />
                  <Route path="/settings/finance/debt-categories" element={
                    <Suspense fallback={<PageSkeleton />}>
                      <PermissionGuard permission="finance.debt_categories.read">
                        <DebtCategoriesPage />
                      </PermissionGuard>
                    </Suspense>
                  } />
                  <Route path="/settings/finance/accounts" element={
                    <Suspense fallback={<PageSkeleton />}>
                      <PermissionGuard permission="finance.accounts.read">
                        <FinancialAccountsPage />
                      </PermissionGuard>
                    </Suspense>
                  } />
                  
                  {/* Admin routes */}
                  <Route path="/admin/users" element={
                    <Suspense fallback={<PageSkeleton />}>
                      <PermissionGuard permission="users.read">
                        <UserManagement />
                      </PermissionGuard>
                    </Suspense>
                  } />
                </Route>

                {/* Catch-all route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ErrorBoundary>
          </SidebarProvider>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
    </TooltipProvider>
    {import.meta.env.DEV && import.meta.env.VITE_ENABLE_QUERY_DEVTOOLS === 'true' && (
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
    )}
  </QueryClientProvider>
);

export default App;
