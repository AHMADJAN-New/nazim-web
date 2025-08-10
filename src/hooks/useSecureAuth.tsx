import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LoginAttempt {
  locked: boolean;
  attempts: number;
  remaining?: number;
  lockUntil?: string;
}

export const useSecureAuth = () => {
  const [loading, setLoading] = useState(false);

  const secureSignIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      console.log('Secure sign in attempt for:', email);
      
      // Attempt sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Supabase auth error:', error);
        
        // Handle failed login attempt
        try {
          const { data: failureData } = await supabase.rpc('handle_failed_login', {
            user_email: email
          }) as { data: LoginAttempt };

          if (failureData?.locked) {
            toast.error(`Account locked due to multiple failed attempts. Try again after 15 minutes.`);
          } else if (failureData?.remaining) {
            toast.error(`Invalid credentials. ${failureData.remaining} attempts remaining.`);
          }
        } catch (failureError) {
          console.warn('Failed to handle login failure:', failureError);
        }

        // Log authentication event
        try {
          await supabase.functions.invoke('log-password-event', {
            body: {
              email,
              event_type: 'login_failed'
            }
          });
        } catch (logError) {
          console.warn('Failed to log password event:', logError);
        }

        return { error };
      }

      // Log successful login
      if (data.user) {
        console.log('Login successful for:', data.user.email);
        
        try {
          await supabase.functions.invoke('log-password-event', {
            body: {
              email,
              event_type: 'login_success'
            }
          });
        } catch (logError) {
          console.warn('Failed to log password event:', logError);
        }
      }

      return { data, error: null };
    } catch (error: any) {
      console.error('Unexpected error during sign in:', error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const validatePasswordStrength = (password: string): string[] => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return errors;
  };

  const secureSignUp = async (email: string, password: string, userData: any) => {
    setLoading(true);
    try {
      // Validate password strength
      const passwordErrors = validatePasswordStrength(password);
      if (passwordErrors.length > 0) {
        toast.error('Password does not meet security requirements:\n' + passwordErrors.join('\n'));
        return { error: { message: passwordErrors.join(', ') } };
      }

      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: userData
        }
      });

      if (error) {
        // Log failed registration
        try {
          await supabase.functions.invoke('log-password-event', {
            body: {
              email,
              event_type: 'registration_failed'
            }
          });
        } catch (logError) {
          console.warn('Failed to log password event:', logError);
        }
        return { error };
      }

      // Log successful registration
      if (data.user) {
        try {
          await supabase.functions.invoke('log-password-event', {
            body: {
              email,
              event_type: 'registration_success'
            }
          });
        } catch (logError) {
          console.warn('Failed to log password event:', logError);
        }
      }

      return { data, error: null };
    } catch (error: any) {
      return { error };
    } finally {
      setLoading(false);
    }
  };

  return {
    secureSignIn,
    secureSignUp,
    validatePasswordStrength,
    loading
  };
};