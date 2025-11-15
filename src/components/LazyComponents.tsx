import React, { Suspense, lazy } from 'react';
import { PageSkeleton, DashboardSkeleton } from '@/components/ui/loading';

// Lazy load core pages for better code splitting
export const Dashboard = lazy(() => import('@/pages/Dashboard'));
export const PendingApprovalPage = lazy(() => import('@/pages/PendingApprovalPage'));
export const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'));

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