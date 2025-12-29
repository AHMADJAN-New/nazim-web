import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { authApi } from '@/lib/api/client';
import { useAuth } from '@/hooks/useAuth';
import { usePlatformAdminPermissions } from '@/platform/hooks/usePlatformAdminPermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Loader2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { showToast } from '@/lib/toast';

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
      // Login
      await authApi.login(data.email, data.password);

      // Refresh auth state
      await refreshAuth();

      // Wait a bit for auth to settle
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check for platform admin permission
      try {
        const { data: permissions } = await refetchPermissions();
        const hasPlatformAdmin = permissions?.includes('subscription.admin');

        if (!hasPlatformAdmin) {
          setError('You do not have platform administrator access. Please use the regular login.');
          await authApi.logout();
          return;
        }

        // Redirect to platform dashboard
        navigate('/platform/dashboard');
        showToast.success('Welcome to Platform Administration');
      } catch (permError: any) {
        // If permission check fails, it might be because user doesn't have the permission
        // or the endpoint is not accessible
        if (permError.message?.includes('platform administrators') || permError.message?.includes('403')) {
          setError('You do not have platform administrator access. Please use the regular login.');
          await authApi.logout();
          return;
        }
        // Re-throw other errors
        throw permError;
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Login failed. Please check your credentials.';
      setError(errorMessage);
      showToast.error(errorMessage);
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

