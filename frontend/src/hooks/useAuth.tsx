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
