import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { organizationsApi, authApi } from '@/lib/api/client';
import { validatePasswordStrength } from '@/lib/utils/passwordValidation';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function AuthPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user, refreshAuth } = useAuth();
  const [authLoading, setAuthLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const fetchOrganizations = async () => {
    try {
      // Fetch organizations from Laravel API (public endpoint for signup form)
      const data = await organizationsApi.publicList() as Organization[];
      setOrganizations(data || []);

      if (!data || data.length === 0) {
        console.warn('No organizations found in database');
      }
    } catch (error: any) {
      console.error('Error fetching organizations:', error);
      logger.error('Error fetching organizations', error);
      setOrganizations([]);

      // Only show error for network issues
      if (error?.message?.includes('Failed to fetch') ||
        error?.message?.includes('Network') ||
        error?.message?.includes('fetch')) {
        toast.error(t('auth.networkError') || 'Network error: Unable to fetch organizations. Please check your connection and ensure the API server is running.');
      } else {
        // Other errors - show a generic message
        console.warn('Could not fetch organizations:', error.message);
      }
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast.error(t('auth.enterEmailAndPassword') || 'Please enter both email and password');
      return;
    }

    setAuthLoading(true);

    try {
      const response = await authApi.login(formData.email, formData.password);

      if (response.user && response.token) {
        // Refresh auth state (simplified - no unnecessary delays)
        await refreshAuth();

        // Wait a bit more to ensure auth state is fully updated
        await new Promise(resolve => setTimeout(resolve, 100));

        toast.success(t('auth.loggedInSuccessfully') || 'Logged in successfully!');

        // Navigate to dashboard after auth is ready
        navigate('/dashboard', { replace: true });
      } else {
        if (import.meta.env.DEV) {
          console.warn('Sign in returned no user data');
        }
        toast.error(t('auth.signInFailed') || 'Sign in failed. Please try again.');
      }
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Sign in error:', error);
      }
      const errorMessage = error.message || t('auth.signInFailed') || 'Failed to sign in. Please check your credentials and try again.';

      if (errorMessage.includes('credentials') || errorMessage.includes('Invalid')) {
        toast.error(t('auth.invalidCredentials') || 'Invalid email or password. Please check your credentials and try again.');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
      setAuthLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error(t('resetPassword.passwordsDoNotMatch') || 'Passwords do not match');
      return;
    }

    if (!formData.organizationId) {
      toast.error(t('auth.selectOrganizationRequired') || 'Please select an organization');
      return;
    }

    if (!formData.fullName) {
      toast.error(t('auth.enterFullName') || 'Please enter your full name');
      return;
    }

    if (!formData.email) {
      toast.error(t('auth.enterEmail') || 'Please enter your email address');
      return;
    }

    setLoading(true);
    setAuthLoading(true);

    try {
      console.log('Attempting sign up for:', formData.email);

      const response = await authApi.register({
        email: formData.email,
        password: formData.password,
        password_confirmation: formData.confirmPassword,
        full_name: formData.fullName,
        organization_id: formData.organizationId || undefined,
      });

      if (response.user && response.token) {
        console.log('Sign up successful:', response.user.email);
        toast.success(t('auth.registrationSuccessful') || 'Registration successful! You can now sign in.');
        // Clear form
        setFormData({
          email: '',
          password: '',
          confirmPassword: '',
          fullName: '',
          phone: '',
          role: 'student',
          organizationId: ''
        });
        // Redirect to login tab or reload
        window.location.reload();
      } else {
        console.warn('Sign up returned no user data');
        toast.error(t('auth.signUpFailed') || 'Sign up failed. Please try again.');
      }
    } catch (error: any) {
      console.error('Sign up error:', error);
      let errorMessage = error.message || t('auth.signUpFailed') || 'Failed to create account';

      if (errorMessage.includes('already registered') || errorMessage.includes('already exists')) {
        errorMessage = t('auth.emailAlreadyRegistered') || 'This email is already registered. Please sign in or reset your password.';
      } else if (errorMessage.includes('Invalid email')) {
        errorMessage = t('auth.invalidEmail') || 'Please enter a valid email address.';
      } else if (errorMessage.includes('Password')) {
        errorMessage = errorMessage; // Password validation errors are already user-friendly
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
      setAuthLoading(false);
    }
  };

  return (
    <>
    <div 
      className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4" 
      dir="ltr"
      style={{ 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        minHeight: '100vh'
      }}
    >
      <Card className="w-full max-w-md shrink-0" style={{ margin: '0 auto' }}>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {t('auth.title') || 'School Management System'}
          </CardTitle>
          <CardDescription className="text-center">
            {t('auth.subtitle') || 'Access your school management system'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{t('auth.signIn') || 'Sign In'}</TabsTrigger>
              <TabsTrigger value="signup">{t('auth.signUp') || 'Sign Up'}</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <Label htmlFor="signin-email">{t('auth.email') || 'Email'}</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="signin-password">{t('auth.password') || 'Password'}</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={authLoading}>
                  {authLoading ? (t('auth.signingIn') || 'Signing In...') : (t('auth.signIn') || 'Sign In')}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <Label htmlFor="full-name">{t('auth.fullName') || 'Full Name'}</Label>
                  <Input
                    id="full-name"
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="signup-email">{t('auth.email') || 'Email'}</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">{t('auth.phone') || 'Phone'} ({t('common.optional') || 'optional'})</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="role">{t('auth.role') || 'Role'}</Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('auth.selectRole') || 'Select your role'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">{t('auth.roleStudent') || 'Student'}</SelectItem>
                      <SelectItem value="teacher">{t('auth.roleTeacher') || 'Teacher'}</SelectItem>
                      <SelectItem value="parent">{t('auth.roleParent') || 'Parent'}</SelectItem>
                      <SelectItem value="staff">{t('auth.roleStaff') || 'Staff'}</SelectItem>
                      <SelectItem value="admin">{t('auth.roleAdmin') || 'Admin'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="organization">{t('auth.organization') || 'Organization'}</Label>
                  <Select value={formData.organizationId} onValueChange={(value) => setFormData({ ...formData, organizationId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('auth.selectOrganization') || 'Select your organization'} />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          {t('auth.noOrganizationsAvailable') || 'No organizations available'}
                        </div>
                      ) : (
                        organizations.map((org) => (
                          <SelectItem key={org.id} value={org.id}>
                            {org.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {organizations.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('auth.noOrganizationsFound') || 'No organizations found. Please contact an administrator.'}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="signup-password">{t('auth.password') || 'Password'}</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => {
                      const password = e.target.value;
                      setFormData({ ...formData, password });
                      setPasswordErrors(validatePasswordStrength(password));
                    }}
                    required
                  />
                  {passwordErrors.length > 0 && formData.password && (
                    <div className="mt-2 space-y-1">
                      {passwordErrors.map((error, index) => (
                        <p key={index} className="text-sm text-destructive">
                          • {error}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="confirm-password">{t('auth.confirmPassword') || 'Confirm Password'}</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading || authLoading || passwordErrors.length > 0}>
                  {loading || authLoading ? (t('auth.creatingAccount') || 'Creating Account...') : (t('auth.signUp') || 'Sign Up')}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
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
    </>
  );
}
