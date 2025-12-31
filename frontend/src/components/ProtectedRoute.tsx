import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfiles';
import { LoadingSpinner } from '@/components/ui/loading';
import { useLanguage } from '@/hooks/useLanguage';
import { useSubscriptionStatus } from '@/hooks/useSubscription';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOrganization?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireOrganization = false
}) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user, loading, profile, profileLoading } = useAuth();
  const { data: profileData, isLoading: profileQueryLoading } = useProfile();
  const { data: subscriptionStatus, isLoading: subscriptionLoading } = useSubscriptionStatus();
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const hasRedirectedRef = React.useRef(false); // Track if we've already redirected
  const subscriptionRedirectRef = React.useRef(false); // Track subscription redirect

  // CRITICAL: ALL hooks must be called before ANY early returns
  // This ensures hooks are always called in the same order (Rules of Hooks)

  // Timeout fallback: prevent infinite loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading || (profileLoading && !profile && !profileData)) {
        setLoadingTimeout(true);
      }
    }, 5000); // 5 second timeout

    return () => clearTimeout(timer);
  }, [loading, profileLoading, profile, profileData]);

  // CRITICAL: Check subscription status and redirect if suspended/expired
  // This must run BEFORE platform admin check to prevent suspended users from accessing anything
  useEffect(() => {
    // Early returns
    if (subscriptionRedirectRef.current) return; // Already redirected
    if (!user) return; // No user, skip
    if (subscriptionLoading) return; // Still loading subscription status
    if (!profile && !profileData) return; // No profile yet
    
    // Don't redirect if already on subscription page
    const isOnSubscriptionPage = typeof window !== 'undefined' && 
      (window.location.pathname.startsWith('/subscription') || 
       window.location.pathname === '/subscription');
    
    if (isOnSubscriptionPage) {
      return;
    }
    
    // Check subscription status
    if (subscriptionStatus) {
      const status = subscriptionStatus.status;
      const accessLevel = subscriptionStatus.accessLevel;
      
      // CRITICAL: Redirect if subscription is suspended, expired, blocked, or readonly with no access
      // These statuses mean the organization has no access to features
      if (status === 'suspended' || status === 'expired' || 
          accessLevel === 'blocked' || accessLevel === 'none' ||
          (status === 'readonly' && accessLevel === 'none')) {
        subscriptionRedirectRef.current = true; // Mark as redirected
        // Use hard redirect to prevent hooks from continuing to fetch
        window.location.href = '/subscription';
        return;
      }
    }
  }, [user, subscriptionStatus, subscriptionLoading, profile, profileData, navigate]);

  // CRITICAL: Check if user is in platform admin session
  // Only redirect if we're on a main app route (not already on platform routes)
  // Use a ref to prevent infinite redirect loops
  // CRITICAL: This useEffect must always be called (same order) to follow Rules of Hooks
  useEffect(() => {
    // Early return if already redirected
    if (hasRedirectedRef.current) return;
    
    // Early return if no user
    if (!user) return;
    
    // Don't redirect if subscription redirect is in progress
    if (subscriptionRedirectRef.current) return;
    
    const isPlatformAdminSession = typeof window !== 'undefined' && 
      localStorage.getItem('is_platform_admin_session') === 'true';
    const isOnPlatformRoute = typeof window !== 'undefined' && 
      window.location.pathname.startsWith('/platform');
    
    // CRITICAL: Don't redirect if already on platform route (prevents loops)
    if (isOnPlatformRoute) {
      return;
    }
    
    // CRITICAL: Only redirect if user is in platform admin session AND authenticated
    // But first check if they actually have permission (to prevent loops)
    if (isPlatformAdminSession) {
      // Check if user has platform admin permission before redirecting
      // This prevents redirect loops when user doesn't have permission
      // We'll let the platform admin ProtectedRoute handle the permission check
      // and redirect back if needed
      hasRedirectedRef.current = true; // Mark as redirected
      window.location.href = '/platform/dashboard';
    }
  }, [user]); // Only run when user changes, not on every render

  // Use cached profile from context first, fallback to query data
  const currentProfile = profile || profileData;

  // Only show spinner if we're truly loading AND have no cached data
  // Don't block rendering if we have cached profile data
  const isLoading = (loading || (profileLoading && !currentProfile)) && !loadingTimeout;

  // NOW we can do early returns after all hooks have been called
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