import { useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';

import { LoadingSpinner } from '@/components/ui/loading';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useOrganizationPlanSlug } from '@/hooks/useOrganizationPlanSlug';
import { useUserPermissions } from '@/hooks/usePermissions';
import { showToast } from '@/lib/toast';
import { canAccessOrgAdminArea } from '@/organization-admin/lib/access';

interface OrganizationAdminRouteProps {
  children: React.ReactNode;
}

export function OrganizationAdminRoute({ children }: OrganizationAdminRouteProps) {
  const { user, profile, loading } = useAuth();
  const { t } = useLanguage();
  const { isEnterprise, isLoading: planLoading } = useOrganizationPlanSlug();
  const { data: permissions, isLoading: permissionsLoading } = useUserPermissions();
  const toastShownRef = useRef(false);

  const showRedirectToast = (messageKey: string) => {
    if (!toastShownRef.current) {
      toastShownRef.current = true;
      showToast.error(t(messageKey));
    }
  };

  useEffect(() => {
    if (loading || planLoading || permissionsLoading) return;
    if (!user || !profile?.organization_id) return;
    if (!isEnterprise) {
      showRedirectToast('organizationAdmin.enterpriseRequired');
      return;
    }
    if (!canAccessOrgAdminArea(profile, permissions ?? [])) {
      showRedirectToast('organizationAdmin.accessDenied');
    }
  }, [loading, planLoading, permissionsLoading, user, profile, isEnterprise, permissions, t]);

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
