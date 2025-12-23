import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Eye, EyeOff, Lock, Calendar, Shield } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { passwordChangeSchema, type PasswordChangeFormData } from '@/lib/validations/passwordChange';
import { authApi } from '@/lib/api/client';
import { showToast } from '@/lib/toast';
import { DatePreferenceSettings } from '@/components/settings/DatePreferenceSettings';

export default function UserSettings() {
  const { t } = useLanguage();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<PasswordChangeFormData>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      current_password: '',
      new_password: '',
      new_password_confirmation: '',
    },
  });

  const newPassword = watch('new_password');

  const getPasswordStrength = (password: string): { strength: number; label: string; color: string } => {
    if (!password) return { strength: 0, label: '', color: 'bg-gray-200' };

    const checks = [
      password.length >= 8,
      /[A-Z]/.test(password),
      /[a-z]/.test(password),
      /\d/.test(password),
      /[!@#$%^&*(),.?":{}|<>]/.test(password),
    ];

    const strength = checks.filter(Boolean).length;

    if (strength === 0) return { strength: 0, label: t('resetPassword.passwordStrength'), color: 'bg-red-500' };
    if (strength === 1) return { strength: 20, label: t('common.weak'), color: 'bg-red-400' };
    if (strength === 2) return { strength: 40, label: t('common.fair'), color: 'bg-yellow-500' };
    if (strength === 3) return { strength: 60, label: t('common.good'), color: 'bg-yellow-400' };
    if (strength === 4) return { strength: 80, label: t('common.strong'), color: 'bg-green-400' };
    return { strength: 100, label: t('common.veryStrong'), color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength(newPassword || '');

  const onSubmit = async (data: PasswordChangeFormData) => {
    setIsSubmitting(true);
    try {
      await authApi.changePassword({
        current_password: data.current_password,
        new_password: data.new_password,
        new_password_confirmation: data.new_password_confirmation,
      });

      showToast.success(t('toast.passwordChanged'));
      reset();
    } catch (error: any) {
      showToast.error(error.message || t('toast.passwordChangeFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="h-6 w-6" />
          <h1 className="text-2xl font-bold">{t('settings.userSettings.title')}</h1>
        </div>
        <p className="text-muted-foreground">{t('settings.userSettings.description')}</p>
      </div>

      <Tabs defaultValue="preferences" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {t('settings.userSettings.preferences')}
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            {t('settings.userSettings.security')}
          </TabsTrigger>
        </TabsList>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="mt-6">
          <DatePreferenceSettings />
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                <CardTitle>{t('settings.userSettings.changePassword')}</CardTitle>
              </div>
              <CardDescription>
                {t('settings.userSettings.changePasswordDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Current Password */}
                <div className="space-y-2">
                  <Label htmlFor="current_password">{t('common.currentPassword')} *</Label>
                  <div className="relative">
                    <Input
                      id="current_password"
                      type={showCurrentPassword ? 'text' : 'password'}
                      {...register('current_password')}
                      placeholder={t('common.enterCurrentPassword')}
                      disabled={isSubmitting}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      disabled={isSubmitting}
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  {errors.current_password && (
                    <p className="text-sm text-destructive">{errors.current_password.message}</p>
                  )}
                </div>

                {/* New Password */}
                <div className="space-y-2">
                  <Label htmlFor="new_password">{t('resetPassword.newPassword')} *</Label>
                  <div className="relative">
                    <Input
                      id="new_password"
                      type={showNewPassword ? 'text' : 'password'}
                      {...register('new_password')}
                      placeholder={t('common.enterNewPassword')}
                      disabled={isSubmitting}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      disabled={isSubmitting}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  {errors.new_password && (
                    <p className="text-sm text-destructive">{errors.new_password.message}</p>
                  )}
                  {/* Password Strength Indicator */}
                  {newPassword && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{t('resetPassword.passwordStrength')}:</span>
                        <span className="font-medium">{passwordStrength.label}</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                          style={{ width: `${passwordStrength.strength}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm New Password */}
                <div className="space-y-2">
                  <Label htmlFor="new_password_confirmation">{t('resetPassword.confirmPassword')} *</Label>
                  <div className="relative">
                    <Input
                      id="new_password_confirmation"
                      type={showConfirmPassword ? 'text' : 'password'}
                      {...register('new_password_confirmation')}
                      placeholder={t('resetPassword.confirmPassword')}
                      disabled={isSubmitting}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={isSubmitting}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  {errors.new_password_confirmation && (
                    <p className="text-sm text-destructive">{errors.new_password_confirmation.message}</p>
                  )}
                </div>

                {/* Password Requirements */}
                <div className="rounded-lg bg-muted p-4 space-y-2">
                  <p className="text-sm font-medium">{t('resetPassword.passwordRequirements')}</p>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li>{t('resetPassword.requirement8Chars')}</li>
                    <li>{t('resetPassword.requirementUppercase')}</li>
                    <li>{t('resetPassword.requirementLowercase')}</li>
                    <li>{t('resetPassword.requirementNumber')}</li>
                    <li>{t('resetPassword.requirementSpecial')}</li>
                  </ul>
                </div>

                {/* Submit Button */}
                <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                  {isSubmitting ? t('resetPassword.updatingPassword') : t('resetPassword.updatePassword')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

