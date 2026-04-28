import React, { createContext, useContext, useEffect, useState } from 'react';

import { authApi, apiClient, pushOfflineAuthContext } from '@/lib/api/client';
import { getOfflineBridge } from '@/lib/electron-offline';

const OFFLINE_BOOTSTRAP_KEY = 'nazim:offline-bootstrap:v1';
const OFFLINE_PROFILE_CACHE_KEY = 'auth:profile';
const OFFLINE_PROFILE_CACHE_KIND = 'auth.profile';

function getApiBaseUrl(): string {
  const apiUrl: string = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : 'http://localhost:8000/api');
  return apiUrl.startsWith('http') ? apiUrl : `${window.location.origin}${apiUrl}`;
}

// Profile type matching database structure
export type Profile = {
  id: string;
  organization_id: string | null;
  staff_id?: string | null;
  role: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  default_school_id: string | null;
  calendar_preference?: string | null;
  schools_access_all?: boolean;
  event_id?: string | null;
  is_event_user?: boolean;
  has_completed_onboarding?: boolean;
  has_completed_tour?: boolean;
  onboarding_completed_at?: string | null;
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
        // Cache for offline use (fire-and-forget)
        getOfflineBridge()?.cachePut(OFFLINE_PROFILE_CACHE_KEY, OFFLINE_PROFILE_CACHE_KIND, profileData).catch(() => {});
        if (!profileData.organization_id) {
          console.warn('Profile missing organization_id - backend should have assigned it. User may need to log out and log back in.');
        }
      }
    } catch (error: any) {
      console.error('Failed to load profile:', error);
      // Restore from offline cache before clearing profile
      const cachedProfile = await getOfflineBridge()?.cacheGet(OFFLINE_PROFILE_CACHE_KEY).catch(() => null);
      if (cachedProfile?.body) {
        setProfile(cachedProfile.body as Profile);
      } else {
        setProfile(null);
        if (error.message?.includes('Unauthenticated') || error.message?.includes('401')) {
          apiClient.setToken(null);
          setUser(null);
          setSession(null);
        }
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

      // CRITICAL: Check if we're in platform admin context
      // If we are, we still need to set user/auth state for platform admin to work
      // But we mark it as a platform admin session to prevent main app from using it
      const isPlatformAdminRoute = typeof window !== 'undefined' && 
        (window.location.pathname.startsWith('/platform') || 
         localStorage.getItem('is_platform_admin_session') === 'true');
      
      // Verify token is valid by fetching user
      const response = await authApi.getUser();
      if (response.user && response.profile) {
        // CRITICAL: Always set user/auth state - both apps need it
        // The separation is handled by the route guards, not by clearing auth state
        setUser(response.user);
        setSession({ token });

        // Initialize offline bridge so the DB is open for caching (fire-and-forget)
        pushOfflineAuthContext({ user: response.user, token, profile: response.profile }).catch(() => {});

        // Save bootstrap for offline startup (non-sensitive ids only)
        try {
          localStorage.setItem(OFFLINE_BOOTSTRAP_KEY, JSON.stringify({
            userId: response.user.id,
            organizationId: (response.profile as Profile).organization_id ?? null,
            schoolId: (response.profile as Profile).default_school_id ?? null,
          }));
        } catch { /* storage full — non-fatal */ }

        // If profile doesn't have organization_id, backend should have assigned it during login, so refresh profile
        if (!response.profile.organization_id) {
          if (import.meta.env.DEV) {
            console.warn('Profile missing organization_id, refreshing...');
          }
          // Refresh profile to get updated organization_id
          await loadUserProfile();
        } else {
          setProfile(response.profile as Profile);
          // Cache freshly fetched profile for offline use
          getOfflineBridge()?.cachePut(OFFLINE_PROFILE_CACHE_KEY, OFFLINE_PROFILE_CACHE_KIND, response.profile).catch(() => {});
        }
      } else {
        // Invalid token, clear it
        apiClient.setToken(null);
        setUser(null);
        setSession(null);
        setProfile(null);
      }
      
      // If we're in platform admin context, we're done - don't proceed with main app logic
      // But user/auth state is already set above, so platform admin can use it
      if (isPlatformAdminRoute && !window.location.pathname.startsWith('/platform/login')) {
        setLoading(false);
        return;
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

        // Offline-first: attempt to restore the session from the local encrypted cache.
        // Flow: read bootstrap ids from localStorage → open the user's offline DB via
        // bridge.login() → read the cached profile → hydrate React state so the app
        // remains usable without a network round-trip.
        const offlineToken = apiClient.getToken();
        if (offlineToken) {
          try {
            const rawBootstrap = localStorage.getItem(OFFLINE_BOOTSTRAP_KEY);
            if (rawBootstrap) {
              const bootstrap = JSON.parse(rawBootstrap) as {
                userId: string;
                organizationId: string | null;
                schoolId: string | null;
              };
              if (bootstrap.userId) {
                const bridge = getOfflineBridge();
                if (bridge) {
                  await bridge.login({
                    userId: bootstrap.userId,
                    organizationId: bootstrap.organizationId ?? '',
                    schoolId: bootstrap.schoolId ?? null,
                    apiToken: offlineToken,
                    apiBaseUrl: getApiBaseUrl(),
                  });
                  const cached = await bridge.cacheGet(OFFLINE_PROFILE_CACHE_KEY).catch(() => null);
                  if (cached?.body) {
                    setUser({ id: bootstrap.userId, email: (cached.body as Profile).email ?? '' });
                    setSession({ token: offlineToken });
                    setProfile(cached.body as Profile);
                  }
                }
              }
            }
          } catch { /* offline restore failure is non-fatal */ }
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
    // CRITICAL: Always check auth - both apps need user state
    // The separation is handled by route guards, not by preventing auth checks
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
      // CRITICAL: Check if this is a platform admin logout
      const isPlatformAdminSession = localStorage.getItem('is_platform_admin_session') === 'true';
      const mainAppTokenBackup = localStorage.getItem('main_app_token_backup');
      
      await authApi.logout();
      
      // If this was a platform admin session, restore main app token
      if (isPlatformAdminSession && mainAppTokenBackup) {
        localStorage.setItem('api_token', mainAppTokenBackup);
        localStorage.removeItem('main_app_token_backup');
        localStorage.removeItem('is_platform_admin_session');
        // Don't clear auth state - main app token is restored
        return;
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Only clear token if not restoring main app session
      const isPlatformAdminSession = localStorage.getItem('is_platform_admin_session') === 'true';
      const mainAppTokenBackup = localStorage.getItem('main_app_token_backup');
      
      if (!(isPlatformAdminSession && mainAppTokenBackup)) {
        localStorage.removeItem('selected_school_id');
        localStorage.removeItem('has_schools_access_all');
        apiClient.setToken(null);
        setUser(null);
        setSession(null);
        setProfile(null);
      }
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
