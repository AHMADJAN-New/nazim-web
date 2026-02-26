import { zodResolver } from '@hookform/resolvers/zod';
import { Shield, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import * as z from 'zod';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { authApi } from '@/lib/api/client';
import { showToast } from '@/lib/toast';
import { usePlatformAdminPermissions } from '@/platform/hooks/usePlatformAdminPermissions';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function PlatformAdminLogin() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { refreshAuth } = useAuth();
  const { refetch: refetchPermissions } = usePlatformAdminPermissions();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // CRITICAL: Store the current main app token before platform admin login
      // This allows us to restore it if login fails or user logs out of platform admin
      const mainAppToken = localStorage.getItem('api_token');
      const isMainAppLoggedIn = !!mainAppToken;
      
      // Store flag to indicate this is a platform admin session
      // This prevents main app from auto-logging in when user is in platform admin context
      if (isMainAppLoggedIn) {
        localStorage.setItem('main_app_token_backup', mainAppToken);
        localStorage.setItem('is_platform_admin_session', 'true');
      } else {
        localStorage.setItem('is_platform_admin_session', 'true');
      }

      // Login with platform_admin context for audit logging
      await authApi.login(data.email, data.password, { loginContext: 'platform_admin' });

      // Refresh auth state
      await refreshAuth();

      // Wait a bit for auth to settle
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check for platform admin permission
      // CRITICAL: During maintenance mode, permission check might fail
      // In that case, proceed anyway - backend route guard will verify permissions
      let hasPlatformAdmin = false;
      try {
        const { data: permissions } = await refetchPermissions();
        hasPlatformAdmin = permissions?.includes('subscription.admin') ?? false;
      } catch (permError: any) {
        // Handle maintenance mode or other errors gracefully
        const isMaintenanceError = permError?.status === 503 || 
                                  permError?.isMaintenanceMode ||
                                  permError?.message?.includes('Service Unavailable') ||
                                  permError?.message?.includes('maintenance');
        
        if (isMaintenanceError) {
          // During maintenance mode, if user logged in successfully, 
          // proceed anyway - backend route guard will verify permissions
          if (import.meta.env.DEV) {
            console.warn('[PlatformAdminLogin] Permission check failed due to maintenance mode, proceeding - backend will verify');
          }
          // Set flag to indicate we're proceeding despite maintenance mode
          hasPlatformAdmin = true; // Allow to proceed, backend will verify
        } else if (permError.message?.includes('platform administrators') || 
                   permError.message?.includes('403') ||
                   permError?.status === 403) {
          // User doesn't have platform admin permission
          setError('You do not have platform administrator access. Please use the regular login.');
          // Restore main app token if it existed
          if (isMainAppLoggedIn && mainAppToken) {
            localStorage.setItem('api_token', mainAppToken);
            localStorage.removeItem('main_app_token_backup');
          } else {
            await authApi.logout();
          }
          localStorage.removeItem('is_platform_admin_session');
          setIsLoading(false);
          return;
        } else {
          // Other errors - log but proceed anyway (backend will verify)
          if (import.meta.env.DEV) {
            console.warn('[PlatformAdminLogin] Permission check failed, but proceeding - backend will verify:', permError);
          }
          // Allow to proceed - backend route guard will handle verification
          hasPlatformAdmin = true;
        }
      }

      // Only block if we're sure user doesn't have permission (and it's not maintenance mode)
      if (!hasPlatformAdmin) {
        setError('You do not have platform administrator access. Please use the regular login.');
        // Restore main app token if it existed
        if (isMainAppLoggedIn && mainAppToken) {
          localStorage.setItem('api_token', mainAppToken);
          localStorage.removeItem('main_app_token_backup');
        } else {
          await authApi.logout();
        }
        localStorage.removeItem('is_platform_admin_session');
        setIsLoading(false);
        return;
      }

      // CRITICAL: Ensure auth state is refreshed and permissions are loaded before navigation
      // Force a refresh of auth state to ensure user is set
      await refreshAuth();
      
      // Wait for auth state to fully settle
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Try to refetch permissions (but don't fail if it doesn't work during maintenance)
      try {
        await refetchPermissions();
      } catch (refetchError) {
        // Ignore refetch errors during maintenance mode
        if (import.meta.env.DEV) {
          console.warn('[PlatformAdminLogin] Permission refetch failed, but proceeding:', refetchError);
        }
      }
      
      // Wait a bit more for everything to settle
      await new Promise(resolve => setTimeout(resolve, 200));

      // Redirect to platform dashboard
      showToast.success('Welcome to Platform Administration');
      // Use window.location for a hard navigation to ensure route guard runs
      window.location.href = '/platform/dashboard';
    } catch (err: any) {
      const errorMessage = err.message || 'Login failed. Please check your credentials.';
      const isLocked = errorMessage.toLowerCase().includes('locked') || err.locked_until;
      const displayMessage = isLocked
        ? (err.locked_until ? errorMessage : t('auth.accountLocked'))
        : errorMessage;
      setError(displayMessage);
      showToast.error(displayMessage);
      // Clean up on error
      localStorage.removeItem('is_platform_admin_session');
      const mainAppTokenBackup = localStorage.getItem('main_app_token_backup');
      if (mainAppTokenBackup) {
        localStorage.setItem('api_token', mainAppTokenBackup);
        localStorage.removeItem('main_app_token_backup');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 overflow-auto">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Platform Administration</CardTitle>
          <CardDescription>
            Sign in to manage the Nazim platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                {...register('email')}
                disabled={isLoading}
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
                disabled={isLoading}
                autoComplete="current-password"
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              <a
                href="/"
                className="text-primary hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = '/';
                }}
              >
                Back to Main App
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

