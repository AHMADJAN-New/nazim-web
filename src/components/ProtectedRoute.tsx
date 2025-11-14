import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
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