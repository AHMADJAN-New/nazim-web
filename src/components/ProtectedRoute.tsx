import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfiles';
import { LoadingSpinner } from '@/components/ui/loading';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOrganization?: boolean;
}

// Development mode: Set to true to bypass authentication
// Can be controlled via VITE_DISABLE_AUTH env var (set to 'true' to enable bypass)
const DEV_AUTH_BYPASS = import.meta.env.VITE_DISABLE_AUTH === 'true';

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireOrganization = false 
}) => {
  const { user, loading, profile, profileLoading } = useAuth();
  const { data: profileData, isLoading: profileQueryLoading } = useProfile();
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Development mode: Allow access without authentication
  if (DEV_AUTH_BYPASS) {
    return <>{children}</>;
  }

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
    return <LoadingSpinner size="lg" text="Loading..." fullScreen />;
  }

  // Only allow authenticated users
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If user exists but no profile after timeout, redirect to auth (invalid session)
  if (user && !currentProfile && loadingTimeout) {
    return <Navigate to="/auth" replace />;
  }
  
  // If organization is required and user doesn't have one (and isn't super admin)
  if (requireOrganization && currentProfile) {
    const isSuperAdmin = currentProfile.organization_id === null && currentProfile.role === 'super_admin';
    if (!isSuperAdmin && !currentProfile.organization_id) {
      return (
        <div className="container mx-auto p-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Organization Required</h2>
            <p className="text-muted-foreground">
              Your account must be assigned to an organization to access this resource.
              Please contact an administrator.
            </p>
          </div>
        </div>
      );
    }
  }
  
  return <>{children}</>;
};

export default ProtectedRoute;