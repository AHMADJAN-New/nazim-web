import { useState } from 'react';
import { useProfile, useProfiles, useUpdateProfile } from '@/hooks/useProfiles';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useHasPermission, useRoles } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Pencil, User, Shield } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useLanguage } from '@/hooks/useLanguage';

// Schema will be created inside component to use translations

export function ProfileManagement() {
  const { t } = useLanguage();
  const { data: currentProfile, isLoading: currentProfileLoading } = useProfile();
  const { data: roles = [], isLoading: rolesLoading } = useRoles();
  const hasUpdatePermission = useHasPermission('profiles.update');
  const { data: organizations } = useOrganizations();
  const { data: profiles, isLoading: profilesLoading } = useProfiles();
  const updateProfile = useUpdateProfile();

  const profileSchema = z.object({
    full_name: z.string().min(1, t('profileManagement.fullNameRequired')).max(255, t('profileManagement.fullNameMaxLength')),
    email: z.string().email(t('profileManagement.invalidEmail')).optional().or(z.literal('')),
    phone: z.string().max(50, t('profileManagement.phoneMaxLength')).optional().or(z.literal('')),
    role: z.string().optional(),
    organization_id: z.string().nullable().optional(),
    is_active: z.boolean().optional(),
  });

  type ProfileFormData = z.infer<typeof profileSchema>;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  const isEditingOwnProfile = selectedProfileId === currentProfile?.id;
  const canEditRole = !isEditingOwnProfile && hasUpdatePermission;

  const handleOpenDialog = (profileId?: string) => {
    const profile = profileId 
      ? profiles?.find((p) => p.id === profileId)
      : currentProfile;
    
    if (profile) {
      // Handle both API format (currentProfile from useAuth) and domain format (profiles from useProfiles)
      const isDomainFormat = profileId !== undefined; // profiles from useProfiles are domain format
      reset({
        full_name: isDomainFormat ? (profile as any).fullName || '' : (profile as any).full_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        role: profile.role,
        organization_id: isDomainFormat ? (profile as any).organizationId || null : (profile as any).organization_id || null,
        is_active: isDomainFormat ? (profile as any).isActive : (profile as any).is_active,
      });
      setSelectedProfileId(profile.id);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedProfileId(null);
    reset();
  };

  const onSubmit = (data: ProfileFormData) => {
    if (selectedProfileId) {
      // Map form data (snake_case) to domain types (camelCase)
      updateProfile.mutate(
        { 
          id: selectedProfileId,
          fullName: data.full_name,
          email: data.email,
          phone: data.phone,
          role: data.role,
          organizationId: data.organization_id || null,
          isActive: data.is_active,
        },
        {
          onSuccess: () => {
            handleCloseDialog();
          },
        }
      );
    }
  };

  if (currentProfileLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6 max-w-7xl overflow-x-hidden">
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="text-center">{t('profileManagement.loadingProfile')}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 hidden md:inline-flex" />
                {t('profileManagement.title')}
              </CardTitle>
              <CardDescription className="hidden md:block">
                {t('profileManagement.subtitle')}
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()} className="flex-shrink-0">
              <Pencil className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{t('profileManagement.editMyProfile')}</span>
              <span className="sm:hidden">{t('profileManagement.edit')}</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Current User Profile Card */}
          {currentProfile && (
            <div className="mb-6 p-4 border rounded-lg bg-muted/50">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{currentProfile.full_name || t('profileManagement.noName')}</h3>
                  <p className="text-sm text-muted-foreground truncate">{currentProfile.email || t('profileManagement.noEmail')}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                      {currentProfile.role}
                    </span>
                    {currentProfile.organization_id && (
                      <span className="text-xs bg-secondary px-2 py-1 rounded">
                        {organizations?.find(o => o.id === currentProfile.organization_id)?.name || t('profileManagement.unknownOrg')}
                      </span>
                    )}
                    {!currentProfile.organization_id && (
                      <span className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded">
                        {t('profileManagement.superAdmin')}
                      </span>
                    )}
                  </div>
                </div>
                <Button variant="outline" onClick={() => handleOpenDialog()} className="flex-shrink-0">
                  <Pencil className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">{t('profileManagement.edit')}</span>
                </Button>
              </div>
            </div>
          )}

          {/* Other Profiles Table (users with profiles.read permission) */}
          {hasUpdatePermission && (
            <>
              <h3 className="text-lg font-semibold mb-4">{t('profileManagement.allProfiles')}</h3>
              <div className="rounded-md border overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('profileManagement.name')}</TableHead>
                        <TableHead className="hidden sm:table-cell">{t('profileManagement.email')}</TableHead>
                        <TableHead className="hidden md:table-cell">{t('profileManagement.role')}</TableHead>
                        <TableHead className="hidden lg:table-cell">{t('profileManagement.status')}</TableHead>
                        <TableHead className="text-right">{t('profileManagement.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profilesLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center">
                            {t('profileManagement.loadingProfiles')}
                          </TableCell>
                        </TableRow>
                      ) : profiles && profiles.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            {t('profileManagement.noProfilesFound')}
                          </TableCell>
                        </TableRow>
                      ) : (
                        profiles?.map((profile) => {
                          return (
                            <TableRow key={profile.id}>
                              <TableCell className="font-medium">
                                <div className="flex flex-col sm:hidden gap-1">
                                  <span>{profile.fullName || t('profileManagement.noName')}</span>
                                  <span className="text-xs text-muted-foreground">{profile.email || t('profileManagement.noEmail')}</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                      {profile.role}
                                    </span>
                                    <span className={`text-xs px-2 py-1 rounded ${
                                      profile.isActive 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-red-100 text-red-800'
                                    }`}>
                                      {profile.isActive ? t('profileManagement.active') : t('profileManagement.inactive')}
                                    </span>
                                  </div>
                                </div>
                                <span className="hidden sm:inline">{profile.fullName || t('profileManagement.noName')}</span>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell">{profile.email || t('profileManagement.noEmail')}</TableCell>
                              <TableCell className="hidden md:table-cell">
                                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                  {profile.role}
                                </span>
                              </TableCell>
                              <TableCell className="hidden lg:table-cell">
                                <span className={`text-xs px-2 py-1 rounded ${
                                  profile.isActive 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {profile.isActive ? t('profileManagement.active') : t('profileManagement.inactive')}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                {hasUpdatePermission && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleOpenDialog(profile.id)}
                                    className="flex-shrink-0"
                                    aria-label={t('profileManagement.edit')}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>
                {isEditingOwnProfile ? t('profileManagement.editMyProfile') : t('profileManagement.editProfile')}
              </DialogTitle>
              <DialogDescription className="hidden md:block">
                {isEditingOwnProfile
                  ? t('profileManagement.updateOwnProfileDescription')
                  : t('profileManagement.updateProfileDescription')}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="full_name">{t('profileManagement.fullName')}</Label>
                <Input
                  id="full_name"
                  {...register('full_name')}
                  placeholder={t('profileManagement.enterFullName')}
                />
                {errors.full_name && (
                  <p className="text-sm text-destructive">{errors.full_name.message}</p>
                )}
              </div>

              {!isEditingOwnProfile && (
                <div className="grid gap-2">
                  <Label htmlFor="email">{t('profileManagement.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    placeholder={t('profileManagement.enterEmail')}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="phone">{t('profileManagement.phone')}</Label>
                <Input
                  id="phone"
                  {...register('phone')}
                  placeholder={t('profileManagement.enterPhoneNumber')}
                />
                {errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone.message}</p>
                )}
              </div>

              {canEditRole && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="role">{t('profileManagement.role')}</Label>
                    <Controller
                      name="role"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <SelectTrigger>
                            <SelectValue placeholder={t('profileManagement.selectRole')} />
                          </SelectTrigger>
                          <SelectContent>
                            {rolesLoading ? (
                              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                {t('profileManagement.loadingRoles')}
                              </div>
                            ) : (
                              roles.map((role) => (
                                <SelectItem key={role.name} value={role.name}>
                                  {role.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>


                  {!isEditingOwnProfile && (
                    <div className="grid gap-2">
                      <Label htmlFor="is_active">{t('profileManagement.status')}</Label>
                      <Controller
                        name="is_active"
                        control={control}
                        render={({ field }) => (
                          <Select 
                            onValueChange={(value) => field.onChange(value === 'true')} 
                            value={field.value ? 'true' : 'false'}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">{t('profileManagement.active')}</SelectItem>
                              <SelectItem value="false">{t('profileManagement.inactive')}</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={handleCloseDialog} className="w-full sm:w-auto">
                {t('profileManagement.cancel')}
              </Button>
              {hasUpdatePermission && (
                <Button type="submit" disabled={updateProfile.isPending} className="w-full sm:w-auto">
                  {t('profileManagement.update')}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

