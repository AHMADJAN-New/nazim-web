import { useState } from 'react';
import { showToast } from '@/lib/toast';
import { authApi } from '@/lib/api/client';

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
      // Use Laravel API for authentication
      const response = await authApi.login(email, password);
      
      if (response.user && response.token) {
        return { user: response.user, session: { access_token: response.token } };
      }
      
      throw new Error('Login failed');
    } catch (error: any) {
      console.error('Auth error:', error);

      // TODO: Implement failed login attempt handling in Laravel API
      // For now, show generic error message
      if (error.message?.includes('credentials') || error.message?.includes('Invalid')) {
        showToast.error('toast.invalidCredentials');
      } else {
        showToast.error(error.message || 'toast.loginFailed');
              }

        return { error };
    } catch (error: any) {
      console.error('Unexpected error during sign in:', error);
      return { error };
    } finally {
      setLoading(false);
      }
  };
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

      // Validate password strength
      const passwordErrors = validatePasswordStrength(password);
      if (passwordErrors.length > 0) {
        showToast.error('toast.passwordRequirementsNotMet');
        return { error: { message: passwordErrors.join(', ') } };
      }

      // Use Laravel API for registration
      const response = await authApi.register({
          email,
          password,
        password_confirmation: password,
        full_name: userData?.full_name || '',
        organization_id: userData?.organization_id,
      });

      if (response.user && response.token) {
        return { data: { user: response.user, session: { access_token: response.token } }, error: null };
      }

      throw new Error('Registration failed');
    } catch (error: any) {
      console.error('Signup error:', error);
      
        // Normalize duplicate email errors to a friendly message
      const raw = String(error?.message || '');
        let message = raw || 'Failed to create account';
      if (/already registered|email.*exists|already exists/i.test(raw)) {
          message = 'This email is already registered. Please sign in or reset your password.';
        }
      
        return { error: { message } };
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