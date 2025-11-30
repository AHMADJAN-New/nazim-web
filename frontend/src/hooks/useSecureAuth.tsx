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
      console.log('Supabase client initialized:', !!supabase);

      // Attempt sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('Sign in response:', { data: data ? { user: data.user?.email, session: !!data.session } : null, error });

      if (error) {
        console.error('Supabase auth error:', error);
        console.error('Error details:', {
          message: error.message,
          status: error.status,
          name: error.name
        });

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

        // Log authentication event (non-blocking) - completely optional
        // This is a fire-and-forget operation that should never block login
        (async () => {
          try {
            // Try edge function first, fallback to RPC if available
            try {
              await supabase.functions.invoke('log-password-event', {
                body: { email, event_type: 'login_failed' }
              });
            } catch (edgeError) {
              // Try RPC fallback (may not exist in local dev)
              try {
                await supabase.rpc('log_auth_event', {
                  event_type: 'login_failed',
                  event_data: { email },
                  error_message: error.message,
                  user_email: email
                });
              } catch (rpcError) {
                // Both failed - that's okay, just log to console
                console.debug('Auth logging not available (this is normal in local dev)');
              }
            }
          } catch (logError) {
            // Completely silent - don't even warn, this is expected in local dev
          }
        })();

        return { error };
      }

      // Log successful login (non-blocking) - completely optional
      if (data.user) {
        console.log('Login successful for:', data.user.email);

        // Fire-and-forget logging - should never block login
        (async () => {
          try {
            // Try edge function first, fallback to RPC if available
            try {
              await supabase.functions.invoke('log-password-event', {
                body: { email, event_type: 'login_success' }
              });
            } catch (edgeError) {
              // Try RPC fallback (may not exist in local dev)
              try {
                await supabase.rpc('log_auth_event', {
                  event_type: 'login_success',
                  event_data: { email, user_id: data.user.id },
                  error_message: null,
                  user_email: email
                });
              } catch (rpcError) {
                // Both failed - that's okay, just log to console
                console.debug('Auth logging not available (this is normal in local dev)');
              }
            }
          } catch (logError) {
            // Completely silent - don't even warn, this is expected in local dev
          }
        })();
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
      console.log('Secure sign up attempt for:', email);
      console.log('Supabase client initialized:', !!supabase);

      // Validate password strength
      const passwordErrors = validatePasswordStrength(password);
      if (passwordErrors.length > 0) {
        toast.error('Password does not meet security requirements:\n' + passwordErrors.join('\n'));
        return { error: { message: passwordErrors.join(', ') } };
      }

      const redirectUrl = `${window.location.origin}/`;

      console.log('Attempting sign up with:', { email, redirectUrl, userData });
      console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);

      // Make the signup call with better error handling
      let data, error;
      try {
        const result = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: userData
          }
        });
        data = result.data;
        error = result.error;
      } catch (signupError: any) {
        console.error('Signup call failed:', signupError);
        // Handle network errors specifically
        if (signupError.message?.includes('Failed to fetch') || signupError.message?.includes('NetworkError')) {
          return {
            error: {
              message: 'Network error: Unable to connect to authentication server. Please check your internet connection and ensure Supabase is running.',
              status: 0,
              name: 'NetworkError'
            }
          };
        }
        return { error: signupError };
      }

      console.log('Sign up response:', {
        data: data ? { user: data.user?.email, session: !!data.session } : null,
        error
      });

      if (error) {
        console.error('Supabase sign up error:', error);
        console.error('Error details:', {
          message: error.message,
          status: error.status,
          name: error.name
        });

        // Log failed registration (non-blocking) - completely optional
        // This is a fire-and-forget operation that should never block user creation
        (async () => {
          try {
            // Try edge function first, fallback to RPC if available
            try {
              await supabase.functions.invoke('log-password-event', {
                body: { email, event_type: 'registration_failed' }
              });
            } catch (edgeError) {
              // Try RPC fallback (may not exist in local dev)
              try {
                await supabase.rpc('log_auth_event', {
                  event_type: 'registration_failed',
                  event_data: { email },
                  error_message: error.message,
                  user_email: email
                });
              } catch (rpcError) {
                // Both failed - that's okay, just log to console
                console.debug('Auth logging not available (this is normal in local dev)');
              }
            }
          } catch (logError) {
            // Completely silent - don't even warn, this is expected in local dev
          }
        })();
        // Normalize duplicate email errors to a friendly message
        const raw = String((error as any)?.message || '');
        let message = raw || 'Failed to create account';
        if (/users_email_partial_key|already registered|email.*exists|Database error saving new user/i.test(raw)) {
          message = 'This email is already registered. Please sign in or reset your password.';
        }
        return { error: { message } };
      }

      // Log successful registration (non-blocking) - completely optional
      if (data.user) {
        // Fire-and-forget logging - should never block registration
        (async () => {
          try {
            // Try edge function first, fallback to RPC if available
            try {
              await supabase.functions.invoke('log-password-event', {
                body: { email, event_type: 'registration_success' }
              });
            } catch (edgeError) {
              // Try RPC fallback (may not exist in local dev)
              try {
                await supabase.rpc('log_auth_event', {
                  event_type: 'registration_success',
                  event_data: { email, user_id: data.user.id },
                  error_message: null,
                  user_email: email
                });
              } catch (rpcError) {
                // Both failed - that's okay, just log to console
                console.debug('Auth logging not available (this is normal in local dev)');
              }
            }
          } catch (logError) {
            // Completely silent - don't even warn, this is expected in local dev
          }
        })();
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