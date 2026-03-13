import { Navigate } from 'react-router-dom';

import { LoadingSpinner } from '@/components/ui/loading';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizationPlanSlug } from '@/hooks/useOrganizationPlanSlug';
import { useUserPermissions } from '@/hooks/usePermissions';
import { canAccessOrgAdminArea } from '@/organization-admin/lib/access';

interface OrganizationAdminRouteProps {
  children: React.ReactNode;
}

export function OrganizationAdminRoute({ children }: OrganizationAdminRouteProps) {
  const { user, profile, loading } = useAuth();
  const { isEnterprise, isLoading: planLoading } = useOrganizationPlanSlug();
  const { data: permissions, isLoading: permissionsLoading } = useUserPermissions();

  if (loading || planLoading || permissionsLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user || !profile?.organization_id) {
    return <Navigate to="/auth" replace />;
  }

  if (!isEnterprise) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!canAccessOrgAdminArea(profile, permissions ?? [])) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
