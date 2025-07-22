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
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      // Clear development mode data
      if (import.meta.env.DEV) {
        localStorage.removeItem('dev_mode_user');
      }

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