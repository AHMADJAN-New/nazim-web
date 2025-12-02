import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui/loading';

/**
 * Simple redirect component that sends authenticated users to the dashboard.
 * Since we now use permissions for access control, we don't need role-based redirects.
 * All users go to the dashboard, and PermissionRoute/PermissionGuard handle access control.
 */
export default function RoleBasedRedirect() {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    // Wait for auth to load
    if (loading) {
      return;
    }

    // If no user, redirect to auth
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }

    // Check if user has pending approval status
    // This is determined by the profile's is_active status or role
    if (profile && (profile.role === 'pending' || !profile.is_active)) {
      navigate('/pending-approval', { replace: true });
      return;
    }

    // All authenticated users go to dashboard
    // PermissionRoute and PermissionGuard will handle access control
    navigate('/dashboard', { replace: true });
  }, [user, profile, loading, navigate]);

  // Show loading while determining redirect
  if (loading || !user) {
    return <LoadingSpinner size="lg" text="Loading..." fullScreen />;
  }

  return null;
}