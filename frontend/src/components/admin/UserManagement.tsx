import { Plus, Pencil, Trash2, Search, UserCog, Download, KeyRound } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useMemo, useEffect } from 'react';
import * as z from 'zod';

import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useHasPermission, useRoles } from '@/hooks/usePermissions';
import { useProfile } from '@/hooks/useProfiles';
import { useSchools } from '@/hooks/useSchools';
import { useStaff } from '@/hooks/useStaff';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser, useResetUserPassword, type UserProfile, type CreateUserData, type UpdateUserData } from '@/hooks/useUsers';
import { showToast } from '@/lib/toast';
import { formatDate, formatDateTime } from '@/lib/utils';

// Note: Schema validation messages will be set dynamically in the component using t()
const createUserSchema = (t: (key: string) => string) => z.object({
  full_name: z.string().min(1, t('userManagement.fullNameRequired')).max(255, t('userManagement.fullNameMaxLength')),
  email: z.string().email(t('userManagement.invalidEmail')),
  password: z.string().min(8, t('userManagement.passwordMinLength')).optional(),
  role: z.string().min(1, t('userManagement.roleRequired')),
  default_school_id: z.string().uuid().nullable().optional(),
  staff_id: z.string().uuid().nullable().optional(),
  schools_access_all: z.boolean().optional().default(false),
  phone: z.string().optional(),
});

type UserFormData = z.infer<ReturnType<typeof createUserSchema>>;

export function UserManagement() {
  const { t } = useLanguage();
  const userSchema = createUserSchema(t);
  const hasCreatePermission = useHasPermission('users.create');
  const hasUpdatePermission = useHasPermission('users.update');
  const hasDeletePermission = useHasPermission('users.delete');
  const hasResetPasswordPermission = useHasPermission('users.reset_password');
  const { user } = useAuth();
  const { data: profile } = useProfile();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      role: 'student',
      default_school_id: null,
      schools_access_all: false,
    },
  });
  
  // Watch default_school_id for school selection
  const watchedSchoolId = watch('default_school_id');
  
  // Get schools for user's organization
  const { data: schools } = useSchools(profile?.organization_id);
  
  // Get roles from API
  const { data: roles } = useRoles();
  
  // Get staff for user's organization
  const { data: staff } = useStaff(profile?.organization_id);

  const filters = useMemo(() => ({
    search: searchQuery || undefined,
    role: roleFilter !== 'all' ? roleFilter : undefined,
    is_active: statusFilter !== 'all' ? statusFilter === 'active' : undefined,
  }), [searchQuery, roleFilter, statusFilter]);

  const { data: users, isLoading } = useUsers(filters);
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const resetPassword = useResetUserPassword();
  
  // Auto-select first school if only one exists and no school is selected
  useEffect(() => {
    if (schools && schools.length === 1 && !watchedSchoolId) {
      setValue('default_school_id', schools[0].id);
    }
  }, [schools, watchedSchoolId, setValue]);

  const isEditMode = !!selectedUser;
  const watchedRole = watch('role') || 'student';

  const handleOpenDialog = (user?: UserProfile) => {
    if (user) {
      setSelectedUser(user);
      setValue('full_name', user.name);
      setValue('email', user.email);
      setValue('role', user.role as any);
      setValue('default_school_id', user.defaultSchoolId || null);
      setValue('staff_id', user.staffId || null);
      setValue('schools_access_all', user.schoolsAccessAll || false);
      setValue('phone', user.phone || '');
    } else {
      setSelectedUser(null);
      reset({
        full_name: '',
        email: '',
        password: '',
        role: 'student',
        default_school_id: null,
        staff_id: null,
        schools_access_all: false,
        phone: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedUser(null);
    reset();
  };

  const handleClosePasswordDialog = () => {
    setIsPasswordDialogOpen(false);
    setNewPassword('');
    setSelectedUser(null);
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) {
      showToast.error(t('toast.passwordResetFailed'));
      return;
    }
    try {
      await resetPassword.mutateAsync({
        userId: selectedUser.id,
        newPassword,
      });
      // Only close dialog and reset state on success
      handleClosePasswordDialog();
    } catch (error: any) {
      // Error is already handled by the mutation's onError
    }
  };

  const onSubmit = async (data: UserFormData) => {
    try {
      if (isEditMode && selectedUser) {
        // Map form data (snake_case) to domain types (camelCase)
        const updateData: UpdateUserData = {
          id: selectedUser.id,
          fullName: data.full_name,
          email: data.email,
          role: data.role,
          defaultSchoolId: data.default_school_id || null,
          staffId: data.staff_id || null,
          schoolsAccessAll: data.schools_access_all || false,
          phone: data.phone || undefined,
        };
        await updateUser.mutateAsync(updateData);
      } else {
        if (!data.password) {
          showToast.error(t('events.userCreateFailed'));
          return;
        }
        // Map form data (snake_case) to domain types (camelCase)
        const createData: CreateUserData = {
          email: data.email,
          password: data.password,
          fullName: data.full_name,
          role: data.role,
          defaultSchoolId: data.default_school_id || null,
          staffId: data.staff_id || null,
          schoolsAccessAll: data.schools_access_all || false,
          phone: data.phone || undefined,
        };
        await createUser.mutateAsync(createData);
      }
      handleCloseDialog();
    } catch (error: any) {
      // Error is handled by the mutation
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    try {
      await deleteUser.mutateAsync(selectedUser.id);
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
    } catch (error: any) {
      // Error is handled by the mutation
    }
  };

  const handleExport = () => {
    if (!users || users.length === 0) {
      showToast.error(t('events.error'));
      return;
    }

    const csv = [
      [t('userManagement.name'), t('userManagement.email'), t('userManagement.role'), t('userManagement.phone'), t('userManagement.status'), 'Created At'].join(','),
      ...users.map(user => [
        user.name,
        user.email,
        user.role,
        user.phone || '',
        user.isActive ? t('userManagement.active') : t('userManagement.inactive'),
        formatDate(user.createdAt),
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    showToast.success(t('events.success'));
  };

  // Debug: Log users data if in development (only when data changes, not on every render)
  useEffect(() => {
    if (import.meta.env.DEV && users) {
      console.log('[UserManagement] Users data:', users);
      console.log('[UserManagement] First user details:', users[0] ? {
        id: users[0].id,
        name: users[0].name,
        email: users[0].email,
        role: users[0].role,
      } : 'No users');
    }
  }, [users]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6 max-w-7xl overflow-x-hidden">
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="text-center">{t('userManagement.loadingUsers')}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <Card>
        <CardHeader>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <UserCog className="h-5 w-5 hidden md:inline-flex" />
                  {t('userManagement.title')}
                </CardTitle>
                <CardDescription className="hidden md:block">
                  {t('userManagement.subtitle')}
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Button variant="outline" onClick={handleExport} className="flex-shrink-0">
                  <Download className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">{t('userManagement.exportCsv')}</span>
                </Button>
                {hasCreatePermission && (
                  <Button onClick={() => handleOpenDialog()} className="flex-shrink-0">
                    <Plus className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">{t('userManagement.createUser')}</span>
                    <span className="sm:hidden">{t('userManagement.create')}</span>
                  </Button>
                )}
              </div>
            </div>
            {/* Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{t('userManagement.totalUsers')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{users?.length || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{t('userManagement.activeUsers')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {users?.filter(u => u.isActive).length || 0}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{t('userManagement.inactiveUsers')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {users?.filter(u => !u.isActive).length || 0}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{t('userManagement.roles')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {new Set(users?.map(u => u.role)).size || 0}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardHeader>
        <CardContent>

          {/* Search and Filters */}
          <div className="mb-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('userManagement.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{t('userManagement.role')}</Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('userManagement.allRoles')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('userManagement.allRoles')}</SelectItem>
                    {roles?.map(role => (
                      <SelectItem key={role.name} value={role.name}>
                        {role.name.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('userManagement.status')}</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('userManagement.allStatuses')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('userManagement.allStatuses')}</SelectItem>
                    <SelectItem value="active">{t('userManagement.active')}</SelectItem>
                    <SelectItem value="inactive">{t('userManagement.inactive')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="rounded-md border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('userManagement.name')}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t('userManagement.email')}</TableHead>
                    <TableHead className="hidden md:table-cell">{t('userManagement.role')}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t('userManagement.phone')}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t('userManagement.status')}</TableHead>
                    <TableHead className="text-right">{t('userManagement.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users && users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        {t('userManagement.noUsersFound')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    users?.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col sm:hidden gap-1">
                            <div className="flex items-center gap-2">
                              {user.avatar || user.staff?.pictureUrl ? (
                                <img
                                  src={user.avatar || user.staff?.pictureUrl || ''}
                                  alt={user.name || user.email}
                                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium flex-shrink-0">
                                  {(user.name || user.email || 'U')[0].toUpperCase()}
                                </div>
                              )}
                              <span className="truncate">{user.name || user.email || t('userManagement.noName')}</span>
                            </div>
                            <span className="text-xs text-muted-foreground truncate">{user.email || t('userManagement.noEmail')}</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {typeof user.role === 'string' ? user.role.replace('_', ' ') : t('userManagement.na')}
                              </Badge>
                              <Badge variant={user.isActive ? 'default' : 'secondary'} className="text-xs">
                                {user.isActive ? t('userManagement.active') : t('userManagement.inactive')}
                              </Badge>
                            </div>
                          </div>
                          <div className="hidden sm:flex items-center gap-2">
                            {user.avatar || user.staff?.pictureUrl ? (
                              <img
                                src={user.avatar || user.staff?.pictureUrl || ''}
                                alt={user.name || user.email}
                                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium flex-shrink-0">
                                {(user.name || user.email || 'U')[0].toUpperCase()}
                              </div>
                            )}
                            <span className="truncate">{user.name || user.email || t('userManagement.noName')}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell truncate">{user.email || t('userManagement.noEmail')}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline">
                            {typeof user.role === 'string' ? user.role.replace('_', ' ') : t('userManagement.na')}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">{user.phone || '-'}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Badge variant={user.isActive ? 'default' : 'secondary'}>
                            {user.isActive ? t('userManagement.active') : t('userManagement.inactive')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {hasUpdatePermission && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenDialog(user)}
                                className="flex-shrink-0"
                                aria-label={t('userManagement.editUser')}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {hasResetPasswordPermission && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setIsPasswordDialogOpen(true);
                                }}
                                className="flex-shrink-0"
                                aria-label={t('userManagement.resetPassword')}
                              >
                                <KeyRound className="h-4 w-4" />
                              </Button>
                            )}
                            {hasDeletePermission && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setIsDeleteDialogOpen(true);
                                }}
                                className="flex-shrink-0"
                                aria-label={t('userManagement.deleteUser')}
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
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit User Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto z-50">
          <DialogHeader>
            <DialogTitle>{isEditMode ? t('userManagement.editUser') : t('userManagement.createUser')}</DialogTitle>
            <DialogDescription className="hidden md:block">
              {isEditMode ? t('userManagement.updateUserInformation') : t('userManagement.createNewUserAccount')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="full_name">{t('userManagement.fullNameRequired')}</Label>
                <Input
                  id="full_name"
                  {...register('full_name')}
                  placeholder={t('userManagement.fullNamePlaceholder')}
                />
                {errors.full_name && (
                  <p className="text-sm text-destructive mt-1">{errors.full_name.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="email">{t('userManagement.emailRequired')}</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder={t('userManagement.emailPlaceholder')}
                />
                {errors.email && (
                  <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
                )}
              </div>
            </div>
            {!isEditMode && (
              <div>
                <Label htmlFor="password">{t('userManagement.passwordRequired')}</Label>
                <Input
                  id="password"
                  type="password"
                  {...register('password')}
                  placeholder={t('userManagement.passwordPlaceholder')}
                />
                {errors.password && (
                  <p className="text-sm text-destructive mt-1">{errors.password.message}</p>
                )}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="role">{t('userManagement.roleRequired')}</Label>
                <Select
                  value={watchedRole}
                  onValueChange={(value) => setValue('role', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('userManagement.selectRole')} />
                  </SelectTrigger>
                  <SelectContent>
                    {roles?.map(role => (
                      <SelectItem key={role.name} value={role.name}>
                        {role.name.replace('_', ' ')}
                        {role.description && ` - ${role.description}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.role && (
                  <p className="text-sm text-destructive mt-1">{errors.role.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="phone">{t('userManagement.phone')}</Label>
                <Input
                  id="phone"
                  {...register('phone')}
                  placeholder={t('userManagement.phonePlaceholder')}
                />
                {errors.phone && (
                  <p className="text-sm text-destructive mt-1">{errors.phone.message}</p>
                )}
              </div>
            </div>
            {/* School Selection - Show if user's organization has schools */}
            {schools && schools.length > 0 && (
              <div>
                <Label htmlFor="default_school_id">
                  {t('userManagement.defaultSchool')}
                  {schools.length > 1 ? ` ${t('userManagement.selectOne')}` : ` ${t('userManagement.autoSelected')}`}
                </Label>
                <Select
                  value={watch('default_school_id') || 'none'}
                  onValueChange={(value) => setValue('default_school_id', value === 'none' ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={schools && schools.length === 1 ? schools[0].schoolName : t('userManagement.selectSchool')} />
                  </SelectTrigger>
                  <SelectContent>
                    {schools && schools.length > 1 && (
                      <SelectItem value="none">{t('userManagement.noDefaultSchool')}</SelectItem>
                    )}
                    {schools?.map(school => (
                      <SelectItem key={school.id} value={school.id}>
                        {school.schoolName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {schools.length > 1 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('userManagement.defaultSchoolDescription')}
                  </p>
                )}
                {schools.length === 1 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('userManagement.onlyOneSchoolDescription')}
                  </p>
                )}
              </div>
            )}
            {/* Staff Selection - Link user to staff member */}
            {staff && staff.length > 0 && (
              <div>
                <Label htmlFor="staff_id">
                  {t('userManagement.staffMemberOptional')}
                </Label>
                <Select
                  value={watch('staff_id') || 'none'}
                  onValueChange={(value) => setValue('staff_id', value === 'none' ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('userManagement.selectStaffMember')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('userManagement.noStaffMember')}</SelectItem>
                    {staff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          {s.pictureUrl && (
                            <img
                              src={s.pictureUrl}
                              alt={s.fullName}
                              className="w-5 h-5 rounded-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          )}
                          <span>{s.fullName} ({s.employeeId})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('userManagement.staffMemberDescription')}
                </p>
              </div>
            )}
            {/* Schools Access All Checkbox */}
            <div>
              <div className="flex items-center space-x-2">
                <Controller
                  control={control}
                  name="schools_access_all"
                  render={({ field }) => (
                    <Checkbox
                      id="schools_access_all"
                      checked={field.value || false}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="schools_access_all">
                  {t('userManagement.schoolsAccessAll')}
                </Label>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('userManagement.schoolsAccessAllDescription')}
              </p>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={handleCloseDialog} className="w-full sm:w-auto">
                {t('userManagement.cancel')}
              </Button>
              <Button type="submit" disabled={createUser.isPending || updateUser.isPending} className="w-full sm:w-auto">
                {isEditMode ? t('userManagement.update') : t('userManagement.create')} {t('userManagement.addUser')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="z-50">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('userManagement.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('userManagement.deleteConfirmDescription', { name: selectedUser?.name || selectedUser?.email || t('userManagement.addUser') })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('userManagement.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {t('userManagement.deleteUser')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Password Reset Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={(open) => {
        // Only allow closing if not pending
        if (!open && !resetPassword.isPending) {
          handleClosePasswordDialog();
        }
      }}>
        <DialogContent className="z-50" onInteractOutside={(e) => {
          // Prevent closing when clicking outside during reset
          if (resetPassword.isPending) {
            e.preventDefault();
          }
        }}>
          <DialogHeader>
            <DialogTitle>{t('userManagement.resetPasswordConfirm')}</DialogTitle>
            <DialogDescription className="hidden md:block">
              {t('userManagement.resetPasswordDescription', { name: selectedUser?.name || selectedUser?.email || t('userManagement.addUser') })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newPassword">{t('userManagement.newPassword')}</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('userManagement.passwordPlaceholder')}
                disabled={resetPassword.isPending}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClosePasswordDialog}
              disabled={resetPassword.isPending}
              className="w-full sm:w-auto"
            >
              {t('userManagement.cancel')}
            </Button>
            <Button onClick={handleResetPassword} disabled={!newPassword || resetPassword.isPending} className="w-full sm:w-auto">
              {resetPassword.isPending ? t('userManagement.resetting') : t('userManagement.resetPassword')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

