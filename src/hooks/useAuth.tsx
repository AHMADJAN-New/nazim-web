import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Development mode: Set to true to bypass authentication
const DEV_AUTH_BYPASS = import.meta.env.DEV && import.meta.env.VITE_DISABLE_AUTH !== 'false';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Development mode: Bypass authentication
    if (DEV_AUTH_BYPASS) {
      console.log('🔓 Development mode: Authentication bypassed');
      const mockUser = createMockUser();
      const mockSession = createMockSession(mockUser);
      setUser(mockUser);
      setSession(mockSession);
      setLoading(false);
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

        // Set up auth state listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!mounted) return;
            
            console.log('Auth state change:', event);
            
            setSession(session);
            setUser(session?.user ?? null);
            
            // Log successful authentication events
            if (event === 'SIGNED_IN' && session?.user) {
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

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
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