import { Shield, Eye, EyeOff } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/hooks/useLanguage';


export default function ResetPasswordPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    // Check if we have the required token from the URL
    const token = searchParams.get('token');
    
    if (!token) {
      toast.error(t('resetPassword.invalidResetLink') || 'Invalid reset link. Please request a new password reset.');
      navigate('/auth');
      return;
    }

    // TODO: Validate token with Laravel API
    // Token validation should be done when submitting the form
  }, [searchParams, navigate]);

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push(t('resetPassword.requirement8Chars') || 'Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push(t('resetPassword.requirementUppercase') || 'Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push(t('resetPassword.requirementLowercase') || 'Password must contain at least one lowercase letter');
    }
    if (!/\d/.test(password)) {
      errors.push(t('resetPassword.requirementNumber') || 'Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push(t('resetPassword.requirementSpecial') || 'Password must contain at least one special character');
    }
    
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error(t('resetPassword.passwordsDoNotMatch') || 'Passwords do not match');
      return;
    }

    const passwordErrors = validatePassword(formData.password);
    if (passwordErrors.length > 0) {
      toast.error(passwordErrors[0]);
      return;
    }

    setLoading(true);
    try {
      const token = searchParams.get('token');
      if (!token) {
        throw new Error('Reset token is missing');
      }

      // TODO: Implement Laravel API endpoint for password reset
      // await authApi.resetPassword(token, formData.password);
      
      toast.error('Password reset endpoint not yet implemented in Laravel API');
      // toast.success('Password reset successfully! You can now sign in with your new password.');
      // navigate('/auth');
    } catch (error: any) {
      toast.error(error.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (password: string): { strength: number; label: string; color: string } => {
    const errors = validatePassword(password);
    const strength = Math.max(0, 5 - errors.length);
    
    if (strength === 0) return { strength: 0, label: 'Very Weak', color: 'bg-red-500' };
    if (strength === 1) return { strength: 20, label: 'Weak', color: 'bg-red-400' };
    if (strength === 2) return { strength: 40, label: 'Fair', color: 'bg-yellow-500' };
    if (strength === 3) return { strength: 60, label: 'Good', color: 'bg-yellow-400' };
    if (strength === 4) return { strength: 80, label: 'Strong', color: 'bg-green-400' };
    return { strength: 100, label: 'Very Strong', color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
            <Shield className="h-6 w-6" />
            {t('nav.authentication') || 'Reset Password'}
          </CardTitle>
          <CardDescription className="text-center">
            {t('resetPassword.subtitle') || 'Create a new secure password for your account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="password">{t('userManagement.newPassword') || 'New Password'}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={t('userManagement.newPassword') || 'Enter your new password'}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              
              {formData.password && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span>{t('resetPassword.passwordStrength') || 'Password Strength'}</span>
                    <span className={passwordStrength.strength >= 80 ? 'text-green-600' : 'text-muted-foreground'}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                      style={{ width: `${passwordStrength.strength}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="confirmPassword">{t('auth.confirmPassword') || 'Confirm New Password'}</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder={t('auth.confirmPassword') || 'Confirm your new password'}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>{t('resetPassword.passwordRequirements') || 'Password must contain:'}</p>
              <ul className="list-disc list-inside space-y-1">
                <li>{t('resetPassword.requirement8Chars') || 'At least 8 characters'}</li>
                <li>{t('resetPassword.requirementUppercase') || 'One uppercase letter'}</li>
                <li>{t('resetPassword.requirementLowercase') || 'One lowercase letter'}</li>
                <li>{t('resetPassword.requirementNumber') || 'One number'}</li>
                <li>{t('resetPassword.requirementSpecial') || 'One special character'}</li>
              </ul>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (t('resetPassword.updatingPassword') || 'Updating Password...') : (t('resetPassword.updatePassword') || 'Update Password')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}