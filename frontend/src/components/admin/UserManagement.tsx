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

const userSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(255, 'Full name must be 255 characters or less'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  role: z.string().min(1, 'Role is required'),
  default_school_id: z.string().uuid().nullable().optional(),
  staff_id: z.string().uuid().nullable().optional(),
  schools_access_all: z.boolean().optional().default(false),
  phone: z.string().optional(),
});

type UserFormData = z.infer<typeof userSchema>;

export function UserManagement() {
  const { t } = useLanguage();
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
      ['Name', 'Email', 'Role', 'Phone', 'Status', 'Created At'].join(','),
      ...users.map(user => [
        user.name,
        user.email,
        user.role,
        user.phone || '',
        user.isActive ? 'Active' : 'Inactive',
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
            <div className="text-center">Loading users...</div>
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
                  User Management
                </CardTitle>
                <CardDescription className="hidden md:block">
                  Manage user accounts, roles, and permissions
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Button variant="outline" onClick={handleExport} className="flex-shrink-0">
                  <Download className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Export CSV</span>
                </Button>
                {hasCreatePermission && (
                  <Button onClick={() => handleOpenDialog()} className="flex-shrink-0">
                    <Plus className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Create User</span>
                    <span className="sm:hidden">Create</span>
                  </Button>
                )}
              </div>
            </div>
            {/* Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{users?.length || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {users?.filter(u => u.isActive).length || 0}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Inactive Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {users?.filter(u => !u.isActive).length || 0}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Roles</CardTitle>
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
                placeholder="Search by name, email, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Role</Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {roles?.map(role => (
                      <SelectItem key={role.name} value={role.name}>
                        {role.name.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
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
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Email</TableHead>
                    <TableHead className="hidden md:table-cell">Role</TableHead>
                    <TableHead className="hidden lg:table-cell">Phone</TableHead>
                    <TableHead className="hidden lg:table-cell">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users && users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No users found
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
                              <span className="truncate">{user.name || user.email || 'No name'}</span>
                            </div>
                            <span className="text-xs text-muted-foreground truncate">{user.email || 'No email'}</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {typeof user.role === 'string' ? user.role.replace('_', ' ') : 'N/A'}
                              </Badge>
                              <Badge variant={user.isActive ? 'default' : 'secondary'} className="text-xs">
                                {user.isActive ? 'Active' : 'Inactive'}
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
                            <span className="truncate">{user.name || user.email || 'No name'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell truncate">{user.email || 'No email'}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline">
                            {typeof user.role === 'string' ? user.role.replace('_', ' ') : 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">{user.phone || '-'}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Badge variant={user.isActive ? 'default' : 'secondary'}>
                            {user.isActive ? 'Active' : 'Inactive'}
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
                                aria-label="Edit user"
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
                                aria-label="Reset password"
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
                                aria-label="Delete user"
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
            <DialogTitle>{isEditMode ? 'Edit User' : 'Create User'}</DialogTitle>
            <DialogDescription className="hidden md:block">
              {isEditMode ? 'Update user information' : 'Create a new user account'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  {...register('full_name')}
                  placeholder="John Doe"
                />
                {errors.full_name && (
                  <p className="text-sm text-destructive mt-1">{errors.full_name.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="john@example.com"
                />
                {errors.email && (
                  <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
                )}
              </div>
            </div>
            {!isEditMode && (
              <div>
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  {...register('password')}
                  placeholder="Minimum 8 characters"
                />
                {errors.password && (
                  <p className="text-sm text-destructive mt-1">{errors.password.message}</p>
                )}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="role">Role *</Label>
                <Select
                  value={watchedRole}
                  onValueChange={(value) => setValue('role', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
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
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  {...register('phone')}
                  placeholder="+1234567890"
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
                  Default School
                  {schools.length > 1 ? ' (Select one)' : ' (Auto-selected)'}
                </Label>
                <Select
                  value={watch('default_school_id') || 'none'}
                  onValueChange={(value) => setValue('default_school_id', value === 'none' ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={schools && schools.length === 1 ? schools[0].schoolName : 'Select school'} />
                  </SelectTrigger>
                  <SelectContent>
                    {schools && schools.length > 1 && (
                      <SelectItem value="none">No Default School</SelectItem>
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
                    User will be assigned to the selected school. When they create buildings/rooms, this school will be used automatically.
                  </p>
                )}
                {schools.length === 1 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Only one school available. User will be automatically assigned to this school.
                  </p>
                )}
              </div>
            )}
            {/* Staff Selection - Link user to staff member */}
            {staff && staff.length > 0 && (
              <div>
                <Label htmlFor="staff_id">
                  Staff Member (Optional)
                </Label>
                <Select
                  value={watch('staff_id') || 'none'}
                  onValueChange={(value) => setValue('staff_id', value === 'none' ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Staff Member</SelectItem>
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
                  Link this user to a staff member. The staff member's avatar will be displayed in the user table.
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
                  Allow access to all schools in organization
                </Label>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                If checked, user can access all schools. Otherwise, access is restricted to default school.
              </p>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={handleCloseDialog} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" disabled={createUser.isPending || updateUser.isPending} className="w-full sm:w-auto">
                {isEditMode ? 'Update' : 'Create'} User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="z-50">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedUser?.name || selectedUser?.email || 'this user'}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
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
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription className="hidden md:block">
              Enter a new password for {selectedUser?.name || selectedUser?.email || 'this user'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
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
              Cancel
            </Button>
            <Button onClick={handleResetPassword} disabled={!newPassword || resetPassword.isPending} className="w-full sm:w-auto">
              {resetPassword.isPending ? 'Resetting...' : 'Reset Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

