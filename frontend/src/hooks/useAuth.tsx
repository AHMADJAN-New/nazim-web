import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi, apiClient } from '@/lib/api/client';

// Profile type matching database structure
export type Profile = {
  id: string;
  organization_id: string | null;
  role: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  default_school_id: string | null;
};

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  session: { token: string } | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  getOrganizationId: () => string | null;
  getRole: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<{ token: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  // Load user profile from Laravel API
  const loadUserProfile = async () => {
    setProfileLoading(true);
    try {
      const response = await authApi.getProfile();
      if (response) {
        const profileData = response as Profile;
        setProfile(profileData);

        // If profile doesn't have organization_id, backend should have assigned it on login
        if (!profileData.organization_id) {
          console.warn('Profile missing organization_id - backend should have assigned it. User may need to log out and log back in.');
        }
      }
    } catch (error: any) {
      console.error('Failed to load profile:', error);
      setProfile(null);
      // If unauthorized, clear auth
      if (error.message?.includes('Unauthenticated') || error.message?.includes('401')) {
        apiClient.setToken(null);
        setUser(null);
        setSession(null);
      }
    } finally {
      setProfileLoading(false);
    }
  };

  // Check authentication function
  const checkAuth = async () => {
    try {
      const token = apiClient.getToken();
      if (!token) {
        // No token - user is not authenticated (expected state)
        setUser(null);
        setSession(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      // Verify token is valid by fetching user
      const response = await authApi.getUser();
      if (response.user && response.profile) {
        setUser(response.user);
        setSession({ token });

        // If profile doesn't have organization_id, backend should have assigned it during login, so refresh profile
        if (!response.profile.organization_id) {
          if (import.meta.env.DEV) {
            console.warn('Profile missing organization_id, refreshing...');
          }
          // Refresh profile to get updated organization_id
          await loadUserProfile();
        } else {
          setProfile(response.profile as Profile);
        }
      } else {
        // Invalid token, clear it
        apiClient.setToken(null);
        setUser(null);
        setSession(null);
        setProfile(null);
      }
    } catch (error: any) {
      // Only log errors if we had a token (unexpected failure)
      // If no token, 401 is expected and shouldn't be logged
      const token = apiClient.getToken();
      const isExpectedError = error?.expected || (!token && error?.message?.includes('401'));

      // Check if it's a network error (backend not running)
      const isNetworkError = error.message?.includes('Network error') || 
                            error.message?.includes('Unable to connect') ||
                            error.message?.includes('Failed to fetch');

      if (isNetworkError) {
        // Check if we're in an iframe context (template preview, etc.)
        // If so, silently ignore - iframe errors shouldn't affect parent auth
        const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
        
        if (isInIframe) {
          // We're in an iframe - silently ignore network errors
          // The parent window handles auth, not the iframe
          setLoading(false);
          return;
        }

        // Backend is likely not running - show helpful message but don't clear token
        // Throttle warnings to avoid console spam (only show once per 30 seconds)
        if (import.meta.env.DEV) {
          const lastWarning = (window as any).__LAST_NETWORK_ERROR_WARNING__ || 0;
          const now = Date.now();
          if (now - lastWarning > 30000) { // Only show once per 30 seconds
            (window as any).__LAST_NETWORK_ERROR_WARNING__ = now;
            console.warn('%c⚠️ Network Error (Non-Critical)', 'color: #f59e0b; font-weight: bold;');
            console.warn('Auth check failed due to network error. Token preserved.');
            console.log('%c💡 If backend is down:', 'color: #10b981; font-weight: bold;');
            console.log('  Run: cd backend && php artisan serve');
            console.log('  Then refresh this page');
          }
        }
        // Don't clear token or auth state - backend might just be temporarily down
        setLoading(false);
        return;
      }

      if (token && !isExpectedError) {
        // Had token but auth failed - this is unexpected, log it
        if (import.meta.env.DEV) {
          console.error('Auth check failed (had token):', error);
        }
        // Clear invalid token
        apiClient.setToken(null);
      }
      // Clear auth state (whether we had token or not)
      setUser(null);
      setSession(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  // Refresh auth state (can be called after login)
  const refreshAuth = async () => {
    setLoading(true);
    await checkAuth();
  };

  // Check authentication on mount and when token changes
  useEffect(() => {
    checkAuth();

    // Listen for storage changes (when token is set in another tab/window)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'api_token') {
        checkAuth();
      }
    };

    // Also listen for custom storage events (for same-tab updates)
    const handleCustomStorageChange = () => {
      checkAuth();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth-token-changed', handleCustomStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-token-changed', handleCustomStorageChange);
    };
  }, []);

  const signOut = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      apiClient.setToken(null);
      setUser(null);
      setSession(null);
      setProfile(null);
    }
  };

  const getOrganizationId = () => {
    return profile?.organization_id || null;
  };

  const getRole = () => {
    return profile?.role || null;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        profileLoading,
        signOut,
        refreshAuth,
        getOrganizationId,
        getRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
