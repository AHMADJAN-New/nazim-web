import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfiles';
import { LoadingSpinner } from '@/components/ui/loading';
import { useLanguage } from '@/hooks/useLanguage';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOrganization?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireOrganization = false
}) => {
  const { t } = useLanguage();
  const { user, loading, profile, profileLoading } = useAuth();
  const { data: profileData, isLoading: profileQueryLoading } = useProfile();
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Timeout fallback: prevent infinite loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading || (profileLoading && !profile && !profileData)) {
        setLoadingTimeout(true);
      }
    }, 5000); // 5 second timeout

    return () => clearTimeout(timer);
  }, [loading, profileLoading, profile, profileData]);

  // Use cached profile from context first, fallback to query data
  const currentProfile = profile || profileData;

  // Only show spinner if we're truly loading AND have no cached data
  // Don't block rendering if we have cached profile data
  const isLoading = (loading || (profileLoading && !currentProfile)) && !loadingTimeout;

  if (isLoading) {
    return <LoadingSpinner size="lg" text={t('guards.loading')} fullScreen />;
  }

  // Only allow authenticated users
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If user exists but no profile after timeout, redirect to auth (invalid session)
  if (user && !currentProfile && loadingTimeout) {
    return <Navigate to="/auth" replace />;
  }

  // If organization is required and user doesn't have one
  if (requireOrganization && currentProfile) {
    if (!currentProfile.organization_id) {
      return (
        <div className="container mx-auto p-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">{t('guards.organizationRequired')}</h2>
            <p className="text-muted-foreground">
              {t('guards.organizationRequiredMessage')}
            </p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;