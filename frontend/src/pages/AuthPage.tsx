import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useUserPermissions } from '@/hooks/usePermissions';
import { authApi } from '@/lib/api/client';
import { getPostLoginRedirectPath } from '@/lib/redirectUtils';

interface Organization {
  id: string;
  name: string;
}

export default function AuthPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user, refreshAuth } = useAuth();
  const { data: permissions = [], isLoading: permissionsLoading } = useUserPermissions();
  const [authLoading, setAuthLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
    role: 'student',
    organizationId: '',
  });

  const { profile } = useAuth();

  useEffect(() => {
    if (user && !permissionsLoading) {
      // Get redirect path based on permissions and profile (async function)
      getPostLoginRedirectPath(permissions, profile).then((redirectPath) => {
        navigate(redirectPath, { replace: true });
      }).catch((error) => {
        // On error, default to dashboard (unless event user)
        if (import.meta.env.DEV) {
          console.error('Redirect error:', error);
        }
        if (profile?.is_event_user && profile?.event_id) {
          navigate(`/events/${profile.event_id}`, { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      });
    }
  }, [user, navigate, permissions, permissionsLoading, profile]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast.error(t('auth.enterEmailAndPassword') || 'Please enter both email and password');
      return;
    }

    setAuthLoading(true);

    try {
      // CRITICAL: Backup platform admin token if user is logged into platform admin
      // This allows platform admin session to be restored if main app login fails
      const isPlatformAdminSession = localStorage.getItem('is_platform_admin_session') === 'true';
      const platformAdminToken = isPlatformAdminSession ? localStorage.getItem('api_token') : null;
      
      if (isPlatformAdminSession && platformAdminToken) {
        localStorage.setItem('platform_admin_token_backup', platformAdminToken);
      }

      // Clear platform admin session flag - user is logging into main app
      localStorage.removeItem('is_platform_admin_session');

      const response = await authApi.login(formData.email, formData.password);

      if (response.user && response.token) {
        // Refresh auth state (simplified - no unnecessary delays)
        await refreshAuth();

        toast.success(t('auth.loggedInSuccessfully') || 'Logged in successfully!');

        // Don't navigate here - let the useEffect handle redirect based on loaded permissions
        // This ensures permissions are loaded before redirecting
      } else {
        if (import.meta.env.DEV) {
          console.warn('Sign in returned no user data');
        }
        // Restore platform admin token if login failed
        if (isPlatformAdminSession && platformAdminToken) {
          localStorage.setItem('api_token', platformAdminToken);
          localStorage.setItem('is_platform_admin_session', 'true');
          localStorage.removeItem('platform_admin_token_backup');
        }
        toast.error(t('auth.signInFailed') || 'Sign in failed. Please try again.');
      }
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Sign in error:', error);
      }
      
      // Check if this is a maintenance mode error
      if (error.isMaintenanceMode || error.status === 503) {
        // Maintenance mode is active - show maintenance message but don't block login attempt
        // The backend should allow login through, but if it doesn't, show the maintenance message
        const maintenanceMessage = error.message || t('maintenance.defaultMessage') || 'We are performing scheduled maintenance. We\'ll be back soon!';
        toast.error(maintenanceMessage);
        // Don't restore tokens on maintenance mode - let user try again
        setAuthLoading(false);
        return;
      }
      
      // Restore platform admin token if login failed
      const isPlatformAdminSession = localStorage.getItem('is_platform_admin_session') === 'true';
      const platformAdminTokenBackup = localStorage.getItem('platform_admin_token_backup');
      if (platformAdminTokenBackup) {
        localStorage.setItem('api_token', platformAdminTokenBackup);
        localStorage.setItem('is_platform_admin_session', 'true');
        localStorage.removeItem('platform_admin_token_backup');
      }
      
      const errorMessage = error.message || t('auth.signInFailed') || 'Failed to sign in. Please check your credentials and try again.';

      if (errorMessage.includes('credentials') || errorMessage.includes('Invalid')) {
        toast.error(t('toast.invalidCredentials') || 'Invalid email or password. Please check your credentials and try again.');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-4">
      {/* Main Container - Responsive design */}
      <div className="w-full max-w-[800px] min-h-[600px] md:h-[600px] flex rounded-[20px] overflow-hidden shadow-2xl">
        {/* Left Frame - Image Panel - Hidden on mobile */}
        <div className="hidden md:block w-[360px] relative overflow-hidden rounded-l-[20px] flex-shrink-0">
          <img
            src="/Login.jpg"
            alt="ناظم - د دیني مدارسو د تنظیم سیستم"
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback if image doesn't load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              if (target.parentElement) {
                target.parentElement.className = 'hidden md:block w-[360px] bg-[#2c2f33] rounded-l-[20px] flex-shrink-0';
              }
            }}
          />
        </div>

        {/* Right Frame - Login Form */}
        <div className="flex-1 bg-white rounded-[20px] md:rounded-l-none md:rounded-r-[20px] p-6 md:p-8 flex flex-col">
          {/* Title */}
          <h1
            className="text-[42px] md:text-[48px] font-bold text-[#2c2f33] text-center mb-4"
            style={{ fontFamily: "'Bahij Titr', 'Noto Sans Arabic', sans-serif" }}
          >
            ناظم
          </h1>

          {/* Subtitle */}
          <p
            className="text-[18px] md:text-[20px] text-[#0b3d91] text-center mb-8 md:mb-10 px-4 leading-relaxed"
            style={{ fontFamily: "'Bahij Nassim', 'Noto Sans Arabic', sans-serif" }}
          >
            د دیني مدارسو د تنظیم سیستم ته ښه راغلاست
          </p>

          {/* Login Form */}
          <form onSubmit={handleSignIn} className="flex-1 flex flex-col items-center justify-center space-y-6">
            {/* Email Input */}
            <div className="w-full max-w-[320px]">
              <Input
                id="signin-email"
                type="email"
                placeholder="کارن نوم"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="w-full px-5 py-4 border border-[#bfc9d2] rounded-[5px] text-[18px] md:text-[20px] text-center"
                style={{ fontFamily: "'Bahij Nassim', 'Noto Sans Arabic', sans-serif" }}
                dir="rtl"
              />
            </div>

            {/* Password Input */}
            <div className="w-full max-w-[320px]">
              <Input
                id="signin-password"
                type="password"
                placeholder="پاسورډ"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="w-full px-5 py-4 border border-[#bfc9d2] rounded-[5px] text-[18px] md:text-[20px] text-center"
                style={{ fontFamily: "'Bahij Nassim', 'Noto Sans Arabic', sans-serif" }}
                dir="rtl"
              />
            </div>

            {/* Remember Me Checkbox - Right aligned */}
            <div className="w-full max-w-[320px] flex items-center justify-end">
              <label className="flex items-center gap-2 text-[#666666] text-[16px] md:text-[18px] cursor-pointer hover:text-[#0b3d91] transition-colors">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded border-[#bfc9d2] cursor-pointer accent-[#0b3d91]"
                />
                <span style={{ fontFamily: "'Bahij Nassim', 'Noto Sans Arabic', sans-serif" }}>
                  ما په یاد وساته
                </span>
              </label>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              disabled={authLoading}
              className="w-full max-w-[320px] bg-[#0b3d91] hover:bg-[#092c5c] text-white rounded-[5px] py-4 px-6 text-[20px] md:text-[22px] font-medium transition-colors shadow-md hover:shadow-lg"
              style={{ fontFamily: "'Bahij Nassim', 'Noto Sans Arabic', sans-serif" }}
            >
              {authLoading ? 'ننوتل...' : 'ننوتل'}
            </Button>
          </form>

          {/* Contact Info */}
          <div className="mt-auto pt-6 flex items-center justify-center gap-3">
            {/* WhatsApp Icon */}
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="text-[#25D366]"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.98 2.898a9.825 9.825 0 012.853 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
            <span
              className="text-[#2c2f33] text-[16px] md:text-[18px]"
              style={{ fontFamily: "'Bahij Nassim', 'Noto Sans Arabic', sans-serif" }}
            >
              +93 787779988
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
