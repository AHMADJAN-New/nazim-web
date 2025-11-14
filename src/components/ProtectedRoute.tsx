import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui/loading';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Development mode: Set to true to bypass authentication
const DEV_AUTH_BYPASS = import.meta.env.DEV && import.meta.env.VITE_DISABLE_AUTH !== 'false';

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  // Development mode: Allow access without authentication
  if (DEV_AUTH_BYPASS) {
    return <>{children}</>;
  }

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading..." fullScreen />;
  }

  // Only allow authenticated users
  if (!user) {
    console.log('No user found, redirecting to auth');
    return <Navigate to="/auth" replace />;
  }

  console.log('User authenticated');
  return <>{children}</>;
};

export default ProtectedRoute;