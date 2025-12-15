import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi, apiClient, appApi } from '@/lib/api/client';
import { useQueryClient } from '@tanstack/react-query';

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
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<{ token: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(false); // Prevent duplicate bootstrap calls

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

  // Check authentication function - uses bootstrap endpoint for efficiency
  const checkAuth = async () => {
    // Prevent duplicate calls (React StrictMode causes double renders in dev)
    if (checkingAuth) {
      return;
    }

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

      // Check if bootstrap data is already cached
      const cachedBootstrap = queryClient.getQueryData(['app', 'bootstrap']);
      if (cachedBootstrap) {
        const bootstrapData = cachedBootstrap as any;
        if (bootstrapData.user && bootstrapData.profile) {
          setUser(bootstrapData.user);
          setSession({ token });
          setProfile(bootstrapData.profile as Profile);
          setLoading(false);
          return;
        }
      }

      setCheckingAuth(true);

      // Use bootstrap endpoint to get all initial data in one request
      // This replaces multiple calls: getUser, getProfile, permissions, organizations, etc.
      try {
        const bootstrapData = await appApi.bootstrap();
        
        if (bootstrapData.user && bootstrapData.profile) {
          setUser(bootstrapData.user);
          setSession({ token });
          setProfile(bootstrapData.profile as Profile);
          
          // Store bootstrap data in React Query cache for other hooks to use
          queryClient.setQueryData(['app', 'bootstrap'], bootstrapData);
          
          // Cache permissions - use a key that matches useUserPermissions pattern
          // Note: useUserPermissions will check bootstrap data first, so exact key match not critical
          if (bootstrapData.permissions) {
            queryClient.setQueryData(['user-permissions', bootstrapData.profile.organization_id, bootstrapData.user.id, ''], bootstrapData.permissions);
          }
          
          // Cache accessible organizations
          const orgIds = bootstrapData.accessibleOrganizations.map((org: any) => org.id);
          queryClient.setQueryData(['accessible-organizations', bootstrapData.user.id, bootstrapData.profile.organization_id, bootstrapData.profile.role], {
            orgIds,
            primaryOrgId: bootstrapData.selectedOrganization?.id || bootstrapData.profile.organization_id,
          });
          
          // Cache selected organization
          if (bootstrapData.selectedOrganization) {
            queryClient.setQueryData(['organizations', bootstrapData.selectedOrganization.id], bootstrapData.selectedOrganization);
            queryClient.setQueryData(['current-organization', bootstrapData.profile.organization_id], bootstrapData.selectedOrganization);
          }
        } else {
          // Fallback to getUser if bootstrap fails
          const response = await authApi.getUser();
          if (response.user && response.profile) {
            setUser(response.user);
            setSession({ token });
            setProfile(response.profile as Profile);
          } else {
            throw new Error('Invalid response');
          }
        }
      } catch (bootstrapError: any) {
        // If bootstrap fails, fallback to getUser (for backward compatibility)
        if (import.meta.env.DEV) {
          console.warn('Bootstrap failed, falling back to getUser:', bootstrapError);
        }
        const response = await authApi.getUser();
        if (response.user && response.profile) {
          setUser(response.user);
          setSession({ token });
          setProfile(response.profile as Profile);
        } else {
          throw new Error('Invalid response');
        }
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
      setCheckingAuth(false);
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
