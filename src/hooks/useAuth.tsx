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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

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
            
            console.log('Auth state change:', event, session?.user?.email);
            
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
        }

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const signOut = async () => {
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