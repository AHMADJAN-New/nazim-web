import { Navigate } from 'react-router-dom';

import { LoadingSpinner } from '@/components/ui/loading';
import { useAuth } from '@/hooks/useAuth';
import { useUserPermissions } from '@/hooks/usePermissions';
import { canAccessOrgAdminDashboard } from '@/organization-admin/lib/access';

export function OrganizationAdminIndexRedirect() {
  const { profile, loading } = useAuth();
  const { data: permissions, isLoading: permissionsLoading } = useUserPermissions();

  if (loading || permissionsLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const target = canAccessOrgAdminDashboard(profile, permissions ?? []) ? 'dashboard' : 'subscription';

  return <Navigate to={target} replace />;
}
