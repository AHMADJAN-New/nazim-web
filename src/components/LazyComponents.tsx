import React, { Suspense, lazy } from 'react';
import { PageSkeleton, DashboardSkeleton } from '@/components/ui/loading';

// Lazy load core pages for better code splitting
export const Dashboard = lazy(() => import('@/pages/Dashboard'));
export const PendingApprovalPage = lazy(() => import('@/pages/PendingApprovalPage'));
export const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'));

// Lazy load settings components
export const BuildingsManagement = lazy(() => import('@/components/settings/BuildingsManagement').then(module => ({ default: module.BuildingsManagement })));
export const RoomsManagement = lazy(() => import('@/components/settings/RoomsManagement').then(module => ({ default: module.RoomsManagement })));
export const OrganizationsManagement = lazy(() => import('@/components/settings/OrganizationsManagement').then(module => ({ default: module.OrganizationsManagement })));
export const ProfileManagement = lazy(() => import('@/components/settings/ProfileManagement').then(module => ({ default: module.ProfileManagement })));
export const PermissionsManagement = lazy(() => import('@/components/settings/PermissionsManagement').then(module => ({ default: module.PermissionsManagement })));
export const SchoolsManagement = lazy(() => import('@/components/settings/SchoolsManagement').then(module => ({ default: module.SchoolsManagement })));
export const ReportTemplatesManagement = lazy(() => import('@/components/settings/ReportTemplatesManagement').then(module => ({ default: module.ReportTemplatesManagement })));
export const ResidencyTypesManagement = lazy(() => import('@/components/settings/ResidencyTypesManagement').then(module => ({ default: module.ResidencyTypesManagement })));
export const UserManagement = lazy(() => import('@/components/admin/UserManagement').then(module => ({ default: module.UserManagement })));

// Lazy load financial settings pages
export const CurrenciesPage = lazy(() => import('@/pages/settings/finance').then(m => ({ default: m.CurrenciesPage })));
export const FiscalYearsPage = lazy(() => import('@/pages/settings/finance').then(m => ({ default: m.FiscalYearsPage })));
export const CostCentersPage = lazy(() => import('@/pages/settings/finance').then(m => ({ default: m.CostCentersPage })));
export const IncomeCategoriesPage = lazy(() => import('@/pages/settings/finance').then(m => ({ default: m.IncomeCategoriesPage })));
export const ExpenseCategoriesPage = lazy(() => import('@/pages/settings/finance').then(m => ({ default: m.ExpenseCategoriesPage })));
export const PaymentMethodsPage = lazy(() => import('@/pages/settings/finance').then(m => ({ default: m.PaymentMethodsPage })));
export const AssetCategoriesPage = lazy(() => import('@/pages/settings/finance').then(m => ({ default: m.AssetCategoriesPage })));
export const FundTypesPage = lazy(() => import('@/pages/settings/finance').then(m => ({ default: m.FundTypesPage })));
export const DebtCategoriesPage = lazy(() => import('@/pages/settings/finance').then(m => ({ default: m.DebtCategoriesPage })));
export const FinancialAccountsPage = lazy(() => import('@/pages/settings/finance').then(m => ({ default: m.FinancialAccountsPage })));

// Re-export loading components for backward compatibility
export { PageSkeleton, DashboardSkeleton } from '@/components/ui/loading';

// Higher-order component for lazy loading with custom skeleton
export const withLazyLoading = <T extends object>(
  Component: React.ComponentType<T>,
  LoadingSkeleton: React.ComponentType = PageSkeleton
) => {
  return (props: T) => (
    <Suspense fallback={<LoadingSkeleton />}>
      <Component {...props} />
    </Suspense>
  );
};