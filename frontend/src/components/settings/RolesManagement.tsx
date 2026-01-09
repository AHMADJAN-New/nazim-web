import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Search, Shield, Edit, Trash2, X } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  useRoles,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  type Role,
} from '@/hooks/usePermissions';
import { useProfile } from '@/hooks/useProfiles';
import { useHasPermission } from '@/hooks/usePermissions';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { showToast } from '@/lib/toast';
import { useLanguage } from '@/hooks/useLanguage';

const roleSchema = z.object({
  name: z.string().min(1, 'Role name is required').max(255, 'Role name must be 255 characters or less'),
  description: z.string().max(1000, 'Description must be 1000 characters or less').optional().nullable(),
});

type RoleFormData = z.infer<typeof roleSchema>;

export function RolesManagement() {
  const { t } = useLanguage();
  const { data: profile } = useProfile();
  const { data: roles = [], isLoading: rolesLoading } = useRoles();
  const hasReadPermission = useHasPermission('roles.read');
  const hasCreatePermission = useHasPermission('roles.create');
  const hasUpdatePermission = useHasPermission('roles.update');
  const hasDeletePermission = useHasPermission('roles.delete');

  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();

  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const isEditMode = !!selectedRole;

  // Filter roles based on search
  const filteredRoles = useMemo(() => {
    if (!roles) return [];

    let filtered = roles;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        role =>
          role.name.toLowerCase().includes(query) ||
          (role.description && role.description.toLowerCase().includes(query))
      );
    }

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [roles, searchQuery]);

  const handleOpenDialog = (role?: Role) => {
    if (role) {
      setSelectedRole(role);
      reset({
        name: role.name,
        description: role.description || '',
      });
    } else {
      setSelectedRole(null);
      reset({
        name: '',
        description: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedRole(null);
    reset();
  };

  const onSubmit = async (data: RoleFormData) => {
    try {
      if (isEditMode && selectedRole) {
        await updateRole.mutateAsync({
          id: selectedRole.id,
          name: data.name,
          description: data.description || null,
        });
      } else {
        await createRole.mutateAsync({
          name: data.name,
          description: data.description || null,
          guard_name: 'web',
        });
      }
      handleCloseDialog();
    } catch (error: any) {
      // Error is handled by the mutation
    }
  };

  const handleDelete = async () => {
    if (!selectedRole) return;
    try {
      await deleteRole.mutateAsync(selectedRole.id);
      setIsDeleteDialogOpen(false);
      setSelectedRole(null);
    } catch (error: any) {
      // Error is handled by the mutation
    }
  };

  if (!hasReadPermission) {
    return (
      <div className="container mx-auto p-4 md:p-6 max-w-7xl overflow-x-hidden">
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="text-center text-muted-foreground">
              {t('events.noPermission')}
            </div>
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
                <Shield className="h-5 w-5 hidden md:inline-flex" />
                {t('events.title')}
              </CardTitle>
              <CardDescription className="hidden md:block">
                {t('hostel.subtitle')}
              </CardDescription>
            </div>
            {hasCreatePermission && (
              <Button onClick={() => handleOpenDialog()} className="flex-shrink-0">
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">{t('roles.createRole')}</span>
                <span className="sm:hidden">{t('events.create')}</span>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('assets.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Roles Table */}
          {rolesLoading ? (
            <div className="text-center py-8 text-muted-foreground">{t('events.loading')}</div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('events.name')}</TableHead>
                      <TableHead className="hidden md:table-cell">{t('events.description')}</TableHead>
                      <TableHead className="hidden lg:table-cell">{t('students.organization')}</TableHead>
                      <TableHead className="text-right">{t('events.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRoles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          {searchQuery ? t('roles.noRolesFound') : t('roles.noRolesMessage')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRoles.map((role) => (
                        <TableRow key={role.id}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col sm:hidden gap-1">
                              <span>{role.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {role.description || t('permissions.noDescription')}
                              </span>
                              {role.organization_id ? (
                                <Badge variant="outline" className="text-xs w-fit">{t('roles.organizationSpecific')}</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs w-fit">{t('roles.global')}</Badge>
                              )}
                            </div>
                            <span className="hidden sm:inline">{role.name}</span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {role.description || <span className="text-muted-foreground">{t('permissions.noDescription')}</span>}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {role.organization_id ? (
                              <Badge variant="outline">{t('roles.organizationSpecific')}</Badge>
                            ) : (
                              <Badge variant="secondary">{t('roles.global')}</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {hasUpdatePermission && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenDialog(role)}
                                  className="flex-shrink-0"
                                  aria-label={t('roles.editRole')}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {hasDeletePermission && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    setSelectedRole(role);
                                    setIsDeleteDialogOpen(true);
                                  }}
                                  className="flex-shrink-0"
                                  aria-label={t('roles.deleteRole')}
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
          )}

          {/* Statistics */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t('roles.totalRoles')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{roles.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t('roles.organizationRoles')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {roles.filter(r => r.organization_id).length}
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Role Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditMode ? t('roles.editRole') : t('roles.createRoleDialog')}</DialogTitle>
            <DialogDescription className="hidden md:block">
              {isEditMode ? t('roles.updateRoleInfo') : t('roles.createNewRole')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="name">{t('roles.roleNameRequired')}</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder={t('roles.roleNamePlaceholder')}
                disabled={isEditMode} // Role names cannot be changed (would break existing assignments)
              />
              {errors.name && (
                <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
              )}
              {isEditMode && (
                <p className="text-sm text-muted-foreground mt-1">
                  {t('roles.roleNameCannotChange')}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="description">{t('events.description')}</Label>
              <Input
                id="description"
                {...register('description')}
                placeholder={t('permissions.descriptionPlaceholder')}
              />
              {errors.description && (
                <p className="text-sm text-destructive mt-1">{errors.description.message}</p>
              )}
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={handleCloseDialog} className="w-full sm:w-auto">
                {t('events.cancel')}
              </Button>
              <Button type="submit" disabled={createRole.isPending || updateRole.isPending} className="w-full sm:w-auto">
                {isEditMode ? t('events.update') : t('events.create')} {t('events.name')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('roles.deleteRole')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('assets.deleteConfirm').replace('{name}', selectedRole?.name || '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('events.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {t('events.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

