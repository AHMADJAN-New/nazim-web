import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Users, ShieldCheck, Pencil, Trash2, KeyRound } from 'lucide-react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';

import { PageHeader } from '@/components/layout/PageHeader';
import { FilterPanel } from '@/components/layout/FilterPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { useLanguage } from '@/hooks/useLanguage';
import { useHasPermission, useRoles } from '@/hooks/usePermissions';
import { useProfile } from '@/hooks/useProfiles';
import { useSchools } from '@/hooks/useSchools';
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useResetUserPassword,
  type UserProfile,
  type CreateUserData,
  type UpdateUserData,
} from '@/hooks/useUsers';

const DEFAULT_WEBSITE_ROLES = [
  { name: 'website_admin' },
  { name: 'website_editor' },
  { name: 'website_media' },
];

const createWebsiteUserSchema = (t: (key: string) => string) => z.object({
  full_name: z.string().min(1, t('userManagement.fullNameRequired')).max(255, t('userManagement.fullNameMaxLength')),
  email: z.string().email(t('userManagement.invalidEmail')),
  password: z.string().min(8, t('userManagement.passwordMinLength')).optional(),
  role: z.string().min(1, t('userManagement.roleRequired')),
  phone: z.string().optional(),
  default_school_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().optional().default(true),
});

type WebsiteUserFormData = z.infer<ReturnType<typeof createWebsiteUserSchema>>;

const getWebsiteRoleLabel = (t: (key: string) => string, roleName: string) => {
  const labels: Record<string, string> = {
    website_admin: t('websiteAdmin.users.roles.website_admin'),
    website_editor: t('websiteAdmin.users.roles.website_editor'),
    website_media: t('websiteAdmin.users.roles.website_media'),
  };

  return labels[roleName] || roleName.replace(/_/g, ' ');
};

export default function WebsiteUsersPage() {
  const { t } = useLanguage();
  const { data: profile } = useProfile();

  const canViewUsers = useHasPermission('users.read');
  const canCreateUsers = useHasPermission('users.create');
  const canUpdateUsers = useHasPermission('users.update');
  const canDeleteUsers = useHasPermission('users.delete');
  const canResetPasswords = useHasPermission('users.reset_password');

  const { data: roles } = useRoles();
  const { data: schools = [] } = useSchools(profile?.organization_id);

  const {
    data: users = [],
    isLoading: usersLoading,
  } = useUsers(undefined, { enabled: canViewUsers === true });

  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const resetPassword = useResetUserPassword();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const websiteRoles = useMemo(() => {
    const roleList = Array.isArray(roles) ? roles : [];
    const filtered = roleList.filter((role) => role.name.startsWith('website_'));
    if (filtered.length > 0) {
      return filtered;
    }
    return DEFAULT_WEBSITE_ROLES;
  }, [roles]);

  const websiteRoleNames = useMemo(() => new Set(websiteRoles.map((role) => role.name)), [websiteRoles]);

  const websiteUsers = useMemo(() => {
    return users.filter((user) => websiteRoleNames.has(user.role));
  }, [users, websiteRoleNames]);

  const filteredUsers = useMemo(() => {
    return websiteUsers.filter((user) => {
      const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? user.isActive : !user.isActive);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [websiteUsers, searchQuery, roleFilter, statusFilter]);

  const stats = useMemo(() => {
    const activeCount = websiteUsers.filter((user) => user.isActive).length;
    const inactiveCount = websiteUsers.filter((user) => !user.isActive).length;
    const rolesCount = new Set(websiteUsers.map((user) => user.role)).size;
    return {
      total: websiteUsers.length,
      active: activeCount,
      inactive: inactiveCount,
      roles: rolesCount,
    };
  }, [websiteUsers]);

  const schema = useMemo(() => createWebsiteUserSchema(t), [t]);
  const form = useForm<WebsiteUserFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: '',
      email: '',
      password: '',
      role: websiteRoles[0]?.name || 'website_admin',
      phone: '',
      default_school_id: null,
      is_active: true,
    },
  });

  useEffect(() => {
    if (!selectedUser && schools.length === 1 && !form.getValues('default_school_id')) {
      form.setValue('default_school_id', schools[0].id);
    }
  }, [schools, form, selectedUser]);

  const openCreateDialog = () => {
    setSelectedUser(null);
    form.reset({
      full_name: '',
      email: '',
      password: '',
      role: websiteRoles[0]?.name || 'website_admin',
      phone: '',
      default_school_id: schools.length === 1 ? schools[0].id : null,
      is_active: true,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (user: UserProfile) => {
    setSelectedUser(user);
    form.reset({
      full_name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || '',
      default_school_id: user.defaultSchoolId || null,
      is_active: user.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (data: WebsiteUserFormData) => {
    try {
      if (selectedUser) {
        const updateData: UpdateUserData = {
          id: selectedUser.id,
          fullName: data.full_name,
          email: data.email,
          phone: data.phone || undefined,
          defaultSchoolId: data.default_school_id || null,
          isActive: data.is_active ?? true,
        };
        await updateUser.mutateAsync(updateData);
      } else {
        if (!data.password) {
          form.setError('password', { type: 'manual', message: t('userManagement.passwordRequired') });
          return;
        }
        const createData: CreateUserData = {
          email: data.email,
          password: data.password,
          fullName: data.full_name,
          role: data.role,
          defaultSchoolId: data.default_school_id || null,
          phone: data.phone || undefined,
        };
        await createUser.mutateAsync(createData);
      }
      setIsDialogOpen(false);
      setSelectedUser(null);
    } catch {
      // Errors are handled by the mutation hooks.
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    try {
      await deleteUser.mutateAsync(selectedUser.id);
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
    } catch {
      // Errors are handled by the mutation hooks.
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) return;
    try {
      await resetPassword.mutateAsync({
        userId: selectedUser.id,
        newPassword,
      });
      setIsPasswordDialogOpen(false);
      setNewPassword('');
      setSelectedUser(null);
    } catch {
      // Errors are handled by the mutation hooks.
    }
  };

  if (canViewUsers === false) {
    return (
      <div className="container mx-auto p-4 md:p-6 max-w-6xl overflow-x-hidden">
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <ShieldCheck className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="font-semibold text-lg">{t('websiteAdmin.users.noPermissionTitle')}</p>
            <p className="text-sm mt-2">{t('websiteAdmin.users.noPermissionDescription')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (usersLoading || canViewUsers === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <PageHeader
        title={t('websiteAdmin.users.title')}
        description={t('websiteAdmin.users.description')}
        icon={<Users className="h-5 w-5" />}
        primaryAction={canCreateUsers ? {
          label: t('websiteAdmin.users.actions.invite'),
          onClick: openCreateDialog,
          icon: <Plus className="h-4 w-4" />,
        } : undefined}
      />

      <Card className="border-l-4 border-l-blue-500/70">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium">{t('websiteAdmin.users.helperTitle')}</p>
              <p className="text-sm text-muted-foreground">{t('websiteAdmin.users.helperDescription')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('websiteAdmin.users.stats.total')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('websiteAdmin.users.stats.active')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('websiteAdmin.users.stats.inactive')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{stats.inactive}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('websiteAdmin.users.stats.roles')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.roles}</div>
          </CardContent>
        </Card>
      </div>

      <FilterPanel title={t('websiteAdmin.common.filters')}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>{t('websiteAdmin.common.search')}</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('websiteAdmin.users.filters.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('websiteAdmin.users.filters.role')}</Label>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('websiteAdmin.users.filters.allRoles')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('websiteAdmin.users.filters.allRoles')}</SelectItem>
                {websiteRoles.map((role) => (
                  <SelectItem key={role.name} value={role.name}>
                    {getWebsiteRoleLabel(t, role.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('websiteAdmin.users.filters.status')}</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('websiteAdmin.users.filters.allStatuses')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('websiteAdmin.users.filters.allStatuses')}</SelectItem>
                <SelectItem value="active">{t('websiteAdmin.users.status.active')}</SelectItem>
                <SelectItem value="inactive">{t('websiteAdmin.users.status.inactive')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </FilterPanel>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('websiteAdmin.users.table.name')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('websiteAdmin.users.table.email')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('websiteAdmin.users.table.role')}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t('websiteAdmin.users.table.status')}</TableHead>
                  <TableHead className="text-right">{t('websiteAdmin.users.table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      <div className="space-y-2">
                        <p className="font-medium">{t('websiteAdmin.users.empty.title')}</p>
                        <p className="text-sm">{t('websiteAdmin.users.empty.description')}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col gap-1">
                          <span className="truncate">{user.name}</span>
                          <span className="text-xs text-muted-foreground md:hidden">{user.email}</span>
                          <div className="flex flex-wrap gap-1 md:hidden">
                            <Badge variant="outline" className="text-xs">
                              {getWebsiteRoleLabel(t, user.role)}
                            </Badge>
                            <Badge variant={user.isActive ? 'default' : 'secondary'} className="text-xs">
                              {user.isActive ? t('websiteAdmin.users.status.active') : t('websiteAdmin.users.status.inactive')}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{user.email}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline">
                          {getWebsiteRoleLabel(t, user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge variant={user.isActive ? 'default' : 'secondary'}>
                          {user.isActive ? t('websiteAdmin.users.status.active') : t('websiteAdmin.users.status.inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {canUpdateUsers && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(user)}
                              aria-label={t('websiteAdmin.users.actions.edit')}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canResetPasswords && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedUser(user);
                                setIsPasswordDialogOpen(true);
                              }}
                              aria-label={t('websiteAdmin.users.actions.resetPassword')}
                            >
                              <KeyRound className="h-4 w-4" />
                            </Button>
                          )}
                          {canDeleteUsers && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedUser(user);
                                setIsDeleteDialogOpen(true);
                              }}
                              aria-label={t('websiteAdmin.users.actions.delete')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedUser ? t('websiteAdmin.users.dialogs.editTitle') : t('websiteAdmin.users.dialogs.createTitle')}
            </DialogTitle>
            <DialogDescription>
              {selectedUser ? t('websiteAdmin.users.dialogs.editDescription') : t('websiteAdmin.users.dialogs.createDescription')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">{t('websiteAdmin.users.form.fullName')}</Label>
                <Input id="full_name" {...form.register('full_name')} />
                {form.formState.errors.full_name && (
                  <p className="text-sm text-destructive">{form.formState.errors.full_name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('websiteAdmin.users.form.email')}</Label>
                <Input id="email" type="email" {...form.register('email')} />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>
            </div>
            {!selectedUser && (
              <div className="space-y-2">
                <Label htmlFor="password">{t('websiteAdmin.users.form.password')}</Label>
                <Input id="password" type="password" {...form.register('password')} />
                {form.formState.errors.password && (
                  <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
                )}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">{t('websiteAdmin.users.form.role')}</Label>
                <Select
                  value={form.watch('role')}
                  onValueChange={(value) => form.setValue('role', value)}
                  disabled={!!selectedUser}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {websiteRoles.map((role) => (
                      <SelectItem key={role.name} value={role.name}>
                        {getWebsiteRoleLabel(t, role.name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedUser && (
                  <p className="text-xs text-muted-foreground">
                    {t('websiteAdmin.users.roleLocked')}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t('websiteAdmin.users.form.phone')}</Label>
                <Input id="phone" {...form.register('phone')} />
              </div>
            </div>
            {schools.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="default_school_id">{t('websiteAdmin.users.form.defaultSchool')}</Label>
                <Select
                  value={form.watch('default_school_id') || 'none'}
                  onValueChange={(value) => form.setValue('default_school_id', value === 'none' ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('websiteAdmin.users.form.selectSchool')} />
                  </SelectTrigger>
                  <SelectContent>
                    {schools.length > 1 && (
                      <SelectItem value="none">{t('websiteAdmin.users.form.noDefaultSchool')}</SelectItem>
                    )}
                    {schools.map((school) => (
                      <SelectItem key={school.id} value={school.id}>
                        {school.schoolName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {selectedUser && (
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">{t('websiteAdmin.users.form.active')}</p>
                  <p className="text-xs text-muted-foreground">{t('websiteAdmin.users.form.activeHint')}</p>
                </div>
                <Controller
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <Switch checked={field.value ?? true} onCheckedChange={field.onChange} />
                  )}
                />
              </div>
            )}
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto">
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createUser.isPending || updateUser.isPending} className="w-full sm:w-auto">
                {selectedUser ? t('common.update') : t('websiteAdmin.users.actions.invite')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('websiteAdmin.users.dialogs.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('websiteAdmin.users.dialogs.deleteDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteUser.isPending}>
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('websiteAdmin.users.dialogs.resetTitle')}</DialogTitle>
            <DialogDescription>{t('websiteAdmin.users.dialogs.resetDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="newPassword">{t('websiteAdmin.users.form.password')}</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t('userManagement.passwordPlaceholder')}
            />
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={() => setIsPasswordDialogOpen(false)} className="w-full sm:w-auto">
              {t('common.cancel')}
            </Button>
            <Button onClick={handleResetPassword} disabled={!newPassword || resetPassword.isPending} className="w-full sm:w-auto">
              {t('websiteAdmin.users.actions.resetPassword')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
