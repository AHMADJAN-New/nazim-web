import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  organization_id: string | null;
  role: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  default_school_id: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  signOut: () => Promise<void>;
  isSuperAdmin: () => boolean;
  getOrganizationId: () => string | null;
  getRole: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Development mode: Set to true to bypass authentication
// Can be controlled via VITE_DISABLE_AUTH env var (set to 'true' to enable bypass)
const DEV_AUTH_BYPASS = import.meta.env.VITE_DISABLE_AUTH === 'true';

// Mock user for development - with admin role for full access
const createMockUser = (): User => {
  const mock: any = {
    id: 'dev-user-id',
    email: 'dev@example.com',
    created_at: new Date().toISOString(),
    app_metadata: {
      role: 'admin',
    },
    user_metadata: {
      full_name: 'Development User',
      role: 'admin',
    },
    aud: 'authenticated',
  };
  return mock as User;
};

const createMockSession = (user: User): Session => ({
  access_token: 'dev-mock-token',
  refresh_token: 'dev-mock-refresh-token',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  // Helper function to load user profile
  // Uses RPC function to bypass PostgREST schema validation issues
  const loadUserProfile = async (userId: string, retryCount = 0) => {
    setProfileLoading(true);
    try {
      // Try RPC function first (bypasses schema validation)
      const { data: rpcData, error: rpcError } = await (supabase as any).rpc('get_user_profile', {
        user_id: userId
      });

      if (!rpcError && rpcData && rpcData.length > 0) {
        const profileData = rpcData[0];
        setProfile({
          id: profileData.id,
          organization_id: profileData.organization_id,
          role: profileData.role,
          full_name: profileData.full_name,
          email: profileData.email,
          phone: profileData.phone,
          avatar_url: profileData.avatar_url,
          is_active: profileData.is_active,
          default_school_id: profileData.default_school_id,
        });
        return;
      }

      // Fallback to direct query if RPC fails or returns no data
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select(
          'id, organization_id, role, full_name, email, phone, avatar_url, is_active, default_school_id'
        )
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        // Check for schema-related errors
        const isSchemaError =
          error.message?.toLowerCase().includes('schema') ||
          error.message?.toLowerCase().includes('querying schema') ||
          error.message?.toLowerCase().includes('database error') ||
          error.code === 'PGRST116' ||
          error.code === '42P01';

        if (isSchemaError && retryCount < 3) {
          console.log(`Schema error detected, retrying with RPC... (attempt ${retryCount + 1}/3)`);
          // Retry with longer delays
          setTimeout(async () => {
            await loadUserProfile(userId, retryCount + 1);
          }, (retryCount + 1) * 2000);
          return;
        }

        // Profile might not exist yet - it will be created by trigger
        if (retryCount < 2 && (
          error.message?.includes('No rows') ||
          error.message?.includes('not found') ||
          error.code === 'PGRST116'
        )) {
          console.log(`Profile not found, retrying... (attempt ${retryCount + 1}/2)`);
          setTimeout(async () => {
            await loadUserProfile(userId, retryCount + 1);
          }, (retryCount + 1) * 1000);
          return;
        }

        console.error('Failed to load profile:', error);
        setProfile(null);
      } else if (data) {
        setProfile(data as Profile);
      } else {
        // No data returned - retry if first attempt
        if (retryCount < 2) {
          console.log('No profile data, retrying...');
          setTimeout(async () => {
            await loadUserProfile(userId, retryCount + 1);
          }, (retryCount + 1) * 1000);
          return;
        }
        setProfile(null);
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
      // Handle schema query errors gracefully with retry
      if (retryCount < 3 && (
        error?.message?.toLowerCase().includes('schema') ||
        error?.message?.toLowerCase().includes('querying') ||
        error?.message?.toLowerCase().includes('database error') ||
        error?.message?.includes('NetworkError')
      )) {
        console.warn('Schema query error - retrying...');
        setTimeout(async () => {
          await loadUserProfile(userId, retryCount + 1);
        }, (retryCount + 1) * 2000);
        return;
      }
      setProfile(null);
    } finally {
      if (retryCount === 0) {
        setProfileLoading(false);
      }
    }
  };

  useEffect(() => {
    // Development mode: Bypass authentication
    if (DEV_AUTH_BYPASS) {
      console.log('🔓 Development mode: Authentication bypassed');
      const mockUser = createMockUser();
      const mockSession = createMockSession(mockUser);
      setUser(mockUser);
      setSession(mockSession);
      // Create mock profile for dev mode
      setProfile({
        id: mockUser.id,
        organization_id: null, // Super admin in dev
        role: 'super_admin',
        full_name: 'Development User',
        email: mockUser.email || null,
        phone: null,
        avatar_url: null,
        is_active: true,
        default_school_id: null,
      });
      setLoading(false);
      setProfileLoading(false);
      return;
    }

    // Production mode: Normal authentication
    let mounted = true;
    let fallbackTimer: number | undefined;
    let profileLoaded = false; // guard to avoid repeated profile fetches

    const safeLoadUserProfile = async (userId: string) => {
      if (!mounted) return;
      if (profileLoaded) return;
      profileLoaded = true;
      await loadUserProfile(userId);
    };

    const initializeAuth = async () => {
      try {
        // 1) Check for existing session first
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
        }

        // Load profile for existing session (once)
        if (session?.user) {
          await safeLoadUserProfile(session.user.id);
        }

        // 2) Set up auth state listener
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(
          async (event, sessionEvent) => {
            if (!mounted) return;

            console.log('Auth state change:', event);

            if (
              event === 'SIGNED_IN' ||
              event === 'SIGNED_OUT' ||
              event === 'TOKEN_REFRESHED'
            ) {
              setSession(sessionEvent || null);
              setUser(sessionEvent?.user ?? null);

              if (
                sessionEvent?.user &&
                (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')
              ) {
                await safeLoadUserProfile(sessionEvent.user.id);

                if (event === 'SIGNED_IN') {
                  // Log auth event
                  try {
                    await (supabase as any).rpc('log_auth_event', {
                      event_type: 'user_signin_success',
                      event_data: {
                        user_id: sessionEvent.user.id,
                        email: sessionEvent.user.email,
                      },
                      error_message: null,
                      user_email: sessionEvent.user.email,
                    });
                  } catch (logError) {
                    console.warn('Failed to log auth event:', logError);
                  }
                }
              } else if (event === 'SIGNED_OUT') {
                profileLoaded = false;
                setProfile(null);
              }
            } else if (event === 'INITIAL_SESSION') {
              // INITIAL_SESSION is fired on page load/refresh
              if (sessionEvent?.user) {
                setSession(sessionEvent);
                setUser(sessionEvent.user);
                await safeLoadUserProfile(sessionEvent.user.id);
              } else {
                setSession(null);
                setUser(null);
                setProfile(null);
                profileLoaded = false;
              }
            }
            // Other events (USER_UPDATED, PASSWORD_RECOVERY, etc.) are ignored
            // to avoid unnecessary profile reloads.
          }
        );

        if (mounted) {
          setLoading(false);
          if (fallbackTimer) window.clearTimeout(fallbackTimer);
        }

        // store unsubscribe in dev (optional)
        const unsub = () => subscription.unsubscribe();
        if (import.meta.env.DEV) (window as any).__supabaseUnsub = unsub;
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setLoading(false);
          if (fallbackTimer) window.clearTimeout(fallbackTimer);
        }
      }
    };

    // Fallback safety: never remain in loading forever
    fallbackTimer = window.setTimeout(() => {
      if (mounted) {
        console.warn('Auth loading timeout fallback triggered');
        setLoading(false);
      }
    }, 4000);

    initializeAuth();

    const handleVisibilityChange = () => {
      // We intentionally do nothing here now.
      // Auth state listener will handle everything; we avoid extra checks.
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted = false;
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (import.meta.env.DEV && (window as any).__supabaseUnsub) {
        try {
          (window as any).__supabaseUnsub();
        } catch {
          // ignore
        }
        (window as any).__supabaseUnsub = undefined;
      }
    };
  }, []); // 🔴 IMPORTANT: run once, do NOT depend on profile

  const signOut = async () => {
    // Development mode: Just clear mock user
    if (DEV_AUTH_BYPASS) {
      console.log('🔓 Development mode: Sign out bypassed');
      setUser(null);
      setSession(null);
      setProfile(null);
      return;
    }

    // Production mode: Normal sign out
    try {
      await supabase.auth.signOut();
      // Log successful signout
      try {
        await (supabase as any).rpc('log_auth_event', {
          event_type: 'user_signout',
          event_data: { user_id: user?.id, email: user?.email },
          error_message: null,
          user_email: user?.email || null,
        });
      } catch {
        // Silent fail for logging to prevent blocking signout
      }
    } catch (error: any) {
      // Log signout error
      try {
        await (supabase as any).rpc('log_auth_event', {
          event_type: 'signout_error',
          event_data: { user_id: user?.id },
          error_message: error.message,
          user_email: user?.email || null,
        });
      } catch {
        // Silent fail for logging
      }
      throw error;
    }
  };

  // Helper methods
  const isSuperAdmin = () => {
    return profile?.organization_id === null && profile?.role === 'super_admin';
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
