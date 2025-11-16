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
const createMockUser = (): User => ({
  id: 'dev-user-id',
  email: 'dev@example.com',
  created_at: new Date().toISOString(),
  app_metadata: {
    role: 'admin' // Set role in app_metadata
  },
  user_metadata: {
    full_name: 'Development User',
    role: 'admin' // Also set in user_metadata
  },
  aud: 'authenticated',
  confirmation_sent_at: null,
  recovery_sent_at: null,
  email_confirmed_at: new Date().toISOString(),
  invited_at: null,
  action_link: null,
  last_sign_in_at: new Date().toISOString(),
  phone: null,
  confirmed_at: new Date().toISOString(),
  email_change_sent_at: null,
  new_email: null,
  phone_confirmed_at: null,
  phone_change: null,
  phone_change_token: null,
  email_change: null,
  email_change_token: null,
  is_anonymous: false,
  factors: null,
});

const createMockSession = (user: User): Session => ({
  access_token: 'dev-mock-token',
  refresh_token: 'dev-mock-refresh-token',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  // Helper function to load user profile
  const loadUserProfile = async (userId: string) => {
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, organization_id, role, full_name, email, phone, avatar_url, is_active')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Failed to load profile:', error);
        // Profile might not exist yet - it will be created by trigger
        setProfile(null);
      } else {
        setProfile(data as Profile);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setProfile(null);
    } finally {
      setProfileLoading(false);
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
      });
      setLoading(false);
      setProfileLoading(false);
      return;
    }

    // Production mode: Normal authentication
    let mounted = true;
    let fallbackTimer: number | undefined;

    const initializeAuth = async () => {
      try {
        // Check for existing session first
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
        }

        // Load profile for existing session
        if (session?.user) {
          await loadUserProfile(session.user.id);
        }

        // Set up auth state listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!mounted) return;
            
            console.log('Auth state change:', event);
            
            setSession(session);
            setUser(session?.user ?? null);
            
            // Load profile when user signs in
            if (event === 'SIGNED_IN' && session?.user) {
              await loadUserProfile(session.user.id);
              
              try {
                await supabase.rpc('log_auth_event', {
                  event_type: 'user_signin_success',
                  event_data: { user_id: session.user.id, email: session.user.email },
                  error_message: null,
                  user_email: session.user.email
                });
              } catch (logError) {
                console.warn('Failed to log auth event:', logError);
              }
            } else if (event === 'SIGNED_OUT') {
              setProfile(null);
            }
          }
        );

        if (mounted) {
          setLoading(false);
          if (fallbackTimer) window.clearTimeout(fallbackTimer);
        }

        // Note: we can't return this from async initializer in useEffect
        // Cleanup handled by outer effect cleanup
        const unsub = () => subscription.unsubscribe();
        // Store on window in dev to avoid GC before cleanup (no-op in prod)
        if (import.meta.env.DEV) (window as any).__supabaseUnsub = unsub;
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setLoading(false);
          if (fallbackTimer) window.clearTimeout(fallbackTimer);
        }
      }
    };

    // Fallback safety: ensure we never remain in loading indefinitely
    fallbackTimer = window.setTimeout(() => {
      if (mounted) {
        console.warn('Auth loading timeout fallback triggered');
        setLoading(false);
      }
    }, 4000);

    initializeAuth();

    return () => {
      mounted = false;
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      // Clean up auth subscription if we stashed it
      if (import.meta.env.DEV && (window as any).__supabaseUnsub) {
        try { (window as any).__supabaseUnsub(); } catch {}
        (window as any).__supabaseUnsub = undefined;
      }
    };
  }, []);

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
        await supabase.rpc('log_auth_event', {
          event_type: 'user_signout',
          event_data: { user_id: user?.id, email: user?.email },
          error_message: null,
          user_email: user?.email || null
        });
      } catch {
        // Silent fail for logging to prevent blocking signout
      }
    } catch (error: any) {
      // Log signout error
      try {
        await supabase.rpc('log_auth_event', {
          event_type: 'signout_error',
          event_data: { user_id: user?.id },
          error_message: error.message,
          user_email: user?.email || null
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
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile,
      loading, 
      profileLoading,
      signOut,
      isSuperAdmin,
      getOrganizationId,
      getRole,
    }}>
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