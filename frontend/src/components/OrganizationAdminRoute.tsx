import { Navigate } from 'react-router-dom';

import { LoadingSpinner } from '@/components/ui/loading';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizationPlanSlug } from '@/hooks/useOrganizationPlanSlug';
import { useUserPermissions } from '@/hooks/usePermissions';

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

  // Org-level user: has "access all schools" OR no school (organization management user) OR is platform_admin (can access org admin when in an org)
  const hasAllSchoolsAccess = profile.schools_access_all === true;
  const hasNoSchool = !profile?.default_school_id;
  const isPlatformAdmin = profile.role === 'platform_admin';
  const isOrgLevelUser = hasAllSchoolsAccess || hasNoSchool || isPlatformAdmin;

  const isOrganizationAdmin = profile.role === 'organization_admin' || isPlatformAdmin;
  const hasOrgPermission =
    (permissions ?? []).includes('organizations.read') ||
    (permissions ?? []).includes('dashboard.read') ||
    (permissions ?? []).includes('school_branding.read') ||
    (permissions ?? []).includes('hr_staff.read') ||
    (permissions ?? []).includes('hr_assignments.read') ||
    (permissions ?? []).includes('hr_payroll.read') ||
    (permissions ?? []).includes('hr_reports.read');

  if (!isOrgLevelUser || (!isOrganizationAdmin && !hasOrgPermission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
