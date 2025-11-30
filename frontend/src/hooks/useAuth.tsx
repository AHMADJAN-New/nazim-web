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
  isSuperAdmin: () => boolean;
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
        setProfile(response as Profile);
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

  // Check authentication on mount and when token changes
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = apiClient.getToken();
        if (token) {
          // Verify token is valid by fetching user
          const response = await authApi.getUser();
          if (response.user && response.profile) {
            setUser(response.user);
            setSession({ token });
            setProfile(response.profile as Profile);
          } else {
            // Invalid token, clear it
            apiClient.setToken(null);
            setUser(null);
            setSession(null);
            setProfile(null);
          }
        } else {
          setUser(null);
          setSession(null);
          setProfile(null);
        }
      } catch (error: any) {
        console.error('Auth check failed:', error);
        // Clear invalid token
        apiClient.setToken(null);
        setUser(null);
        setSession(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for storage changes (when token is set in another tab/window)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'api_token') {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
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

  const isSuperAdmin = () => {
    return profile?.role === 'super_admin' && profile?.organization_id === null;
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
        isSuperAdmin,
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
