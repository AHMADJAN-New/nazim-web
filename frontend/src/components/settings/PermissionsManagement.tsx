import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Search, Shield, Edit, Save, X, Trash2, Building2, Users } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useCurrentOrganization } from '@/hooks/useOrganizations';
import {
  usePermissions,
  useRolePermissions,
  useAssignPermissionToRole,
  useRemovePermissionFromRole,
  useCreatePermission,
  useUpdatePermission,
  useDeletePermission,
  useRoles,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  type Permission,
  type Role
} from '@/hooks/usePermissions';
import { useProfile } from '@/hooks/useProfiles';
import { useHasPermission } from '@/hooks/usePermissions';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useLanguage } from '@/hooks/useLanguage';
import { showToast } from '@/lib/toast';
import { LoadingSpinner } from '@/components/ui/loading';

const roleSchema = z.object({
  name: z.string().min(1, 'Role name is required').max(255, 'Role name must be 255 characters or less'),
  description: z.string().max(1000, 'Description must be 1000 characters or less').optional().nullable(),
});

type RoleFormData = z.infer<typeof roleSchema>;

// Component to fetch and display role permissions
function RolePermissionsCard({ role, allPermissions, onEdit, onDelete, canEdit, canDelete }: {
  role: Role;
  allPermissions: Permission[];
  onEdit: (role: Role) => void;
  onDelete: (role: Role) => void;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const { t } = useLanguage();
  const { data: rolePermsData, isLoading } = useRolePermissions(role.name);
  const assignPermission = useAssignPermissionToRole();
  const removePermission = useRemovePermissionFromRole();
  const [editingPermissions, setEditingPermissions] = useState<Set<string>>(new Set());
  const [isEditing, setIsEditing] = useState(false);

  const rolePermissions = rolePermsData?.permissions || [];

  // Group permissions by resource
  const groupedPermissions = useMemo(() => {
    const grouped: Record<string, { read: boolean; write: boolean; delete: boolean }> = {};
    
    allPermissions.forEach(permission => {
      if (!grouped[permission.resource]) {
        grouped[permission.resource] = { read: false, write: false, delete: false };
      }
      
      const hasPermission = rolePermissions.includes(permission.name);
      if (hasPermission) {
        if (permission.action === 'read') grouped[permission.resource].read = true;
        if (permission.action === 'write' || permission.action === 'create' || permission.action === 'update') grouped[permission.resource].write = true;
        if (permission.action === 'delete') grouped[permission.resource].delete = true;
      }
    });
    
    return grouped;
  }, [allPermissions, rolePermissions]);

  // Get permission name for a resource and action
  const getPermissionName = (resource: string, action: string): string | null => {
    const perm = allPermissions.find(p => p.resource === resource && (
      (action === 'read' && p.action === 'read') ||
      (action === 'write' && (p.action === 'write' || p.action === 'create' || p.action === 'update')) ||
      (action === 'delete' && p.action === 'delete')
    ));
    return perm?.name || null;
  };

  const handleTogglePermission = async (resource: string, action: 'read' | 'write' | 'delete') => {
    if (!isEditing) return;
    
    const permission = allPermissions.find(p => {
      if (p.resource !== resource) return false;
      if (action === 'read' && p.action === 'read') return true;
      if (action === 'write' && (p.action === 'write' || p.action === 'create' || p.action === 'update')) return true;
      if (action === 'delete' && p.action === 'delete') return true;
      return false;
    });
    
    if (!permission) return;

    const hasPermission = rolePermissions.includes(permission.name);
    
    try {
      if (hasPermission) {
        await removePermission.mutateAsync({ role: role.name, permissionId: permission.id });
      } else {
        await assignPermission.mutateAsync({ role: role.name, permissionId: permission.id });
      }
    } catch (error: any) {
      showToast.error(error.message || t('permissions.failedToUpdate'));
    }
  };

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditingPermissions(new Set(rolePermissions));
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingPermissions(new Set());
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <LoadingSpinner size="sm" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold capitalize">{role.name}</CardTitle>
        {role.description && (
          <CardDescription className="text-sm">{role.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Permissions grouped by resource */}
        {Object.entries(groupedPermissions).map(([resource, perms]) => (
          <div key={resource} className="space-y-2 border-b pb-3 last:border-0">
            <Label className="text-sm font-medium capitalize">{resource}</Label>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`${role.id}-${resource}-read`}
                  checked={perms.read}
                  onCheckedChange={() => handleTogglePermission(resource, 'read')}
                  disabled={!isEditing || !getPermissionName(resource, 'read')}
                />
                <Label
                  htmlFor={`${role.id}-${resource}-read`}
                  className="text-sm font-normal cursor-pointer"
                >
                  Read
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`${role.id}-${resource}-write`}
                  checked={perms.write}
                  onCheckedChange={() => handleTogglePermission(resource, 'write')}
                  disabled={!isEditing || !getPermissionName(resource, 'write')}
                />
                <Label
                  htmlFor={`${role.id}-${resource}-write`}
                  className="text-sm font-normal cursor-pointer"
                >
                  Write
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`${role.id}-${resource}-delete`}
                  checked={perms.delete}
                  onCheckedChange={() => handleTogglePermission(resource, 'delete')}
                  disabled={!isEditing || !getPermissionName(resource, 'delete')}
                />
                <Label
                  htmlFor={`${role.id}-${resource}-delete`}
                  className="text-sm font-normal cursor-pointer"
                >
                  Delete
                </Label>
              </div>
            </div>
          </div>
        ))}
        
        {/* Action buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          {!isEditing ? (
            <>
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStartEdit}
                  className="flex-shrink-0"
                >
                  <Edit className="h-4 w-4" />
                  <span className="hidden sm:inline ml-2">{t('events.edit')}</span>
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onDelete(role)}
                  className="flex-shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline ml-2">{t('events.delete')}</span>
                </Button>
              )}
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelEdit}
                className="flex-shrink-0"
              >
                <X className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">{t('events.cancel')}</span>
              </Button>
              <Button
                size="sm"
                onClick={handleCancelEdit}
                disabled={assignPermission.isPending || removePermission.isPending}
                className="flex-shrink-0"
              >
                <Save className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">{t('events.save')}</span>
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function PermissionsManagement() {
  const { t } = useLanguage();
  const { data: profile } = useProfile();
  const { data: currentOrg } = useCurrentOrganization();
  const { data: roles = [], isLoading: rolesLoading } = useRoles();
  const hasPermissionsPermission = useHasPermission('permissions.read');
  const hasPermissionsUpdatePermission = useHasPermission('permissions.update');
  const hasRolesCreatePermission = useHasPermission('roles.create');
  const hasRolesUpdatePermission = useHasPermission('roles.update');
  const hasRolesDeletePermission = useHasPermission('roles.delete');

  const { data: allPermissions, isLoading: permissionsLoading } = usePermissions();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();

  // Filter permissions by organization: show global (organization_id = NULL) + user's org permissions
  const permissions = useMemo(() => {
    if (!allPermissions || !profile) return [];

    // Users see: global permissions + their organization's permissions
    return allPermissions.filter(p =>
      p.organizationId === null || p.organizationId === profile.organization_id
    );
  }, [allPermissions, profile]);

  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateRoleDialog, setShowCreateRoleDialog] = useState(false);
  const [showEditRoleDialog, setShowEditRoleDialog] = useState(false);
  const [showDeleteRoleDialog, setShowDeleteRoleDialog] = useState(false);
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

  const handleCreateRole = async (data: RoleFormData) => {
    try {
      await createRole.mutateAsync({
        name: data.name,
        description: data.description || null,
        guard_name: 'web',
      });
      setShowCreateRoleDialog(false);
      reset();
    } catch (error: any) {
      // Error handled by mutation
    }
  };

  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    reset({
      name: role.name,
      description: role.description || '',
    });
    setShowEditRoleDialog(true);
  };

  const handleUpdateRole = async (data: RoleFormData) => {
    if (!selectedRole) return;
    try {
      await updateRole.mutateAsync({
        id: selectedRole.id,
        name: data.name,
        description: data.description || null,
      });
      setShowEditRoleDialog(false);
      setSelectedRole(null);
      reset();
    } catch (error: any) {
      // Error handled by mutation
    }
  };

  const handleDeleteRole = (role: Role) => {
    setSelectedRole(role);
    setShowDeleteRoleDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedRole) return;
    try {
      await deleteRole.mutateAsync(selectedRole.id);
      setShowDeleteRoleDialog(false);
      setSelectedRole(null);
    } catch (error: any) {
      // Error handled by mutation
    }
  };

  // Check if user has permission to view permissions management
  if (!hasPermissionsPermission) {
    return (
      <div className="container mx-auto p-4 md:p-6 max-w-7xl overflow-x-hidden">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-destructive">
              <Shield className="h-12 w-12 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('permissions.accessDenied')}</h3>
              <p>{t('permissions.noPermissionMessage')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (permissionsLoading || rolesLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6 max-w-7xl overflow-x-hidden">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <LoadingSpinner size="lg" text={t('permissions.loadingPermissions')} />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      {/* Organization Context Banner */}
      {currentOrg && (
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {t('permissions.managingPermissionsFor').replace('{name}', currentOrg.name)}
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  {t('permissions.viewGlobalAndManage')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 hidden sm:inline-flex" />
                {t('events.title') || 'Roles and Permissions'}
              </CardTitle>
              <CardDescription className="hidden md:block">
                {t('hostel.subtitle')?.replace('{orgName}', currentOrg?.name || 'your organization') || 
                 'user roles and permissions management panel. where the admin can create a new roles for the users and set permission in the role.'}
              </CardDescription>
            </div>
            {hasRolesCreatePermission && (
              <Button
                variant="default"
                onClick={() => setShowCreateRoleDialog(true)}
                className="w-full sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                <span className="ml-2">{t('roles.createRole') || t('events.add') || 'Add Role'}</span>
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
                placeholder={t('assets.searchPlaceholder') || t('events.search') || 'Search roles...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Role Cards Grid */}
          {filteredRoles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery ? (t('roles.noRolesFound') || 'No roles found') : (t('roles.noRolesMessage') || 'No roles available')}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredRoles.map((role) => (
                <RolePermissionsCard
                  key={role.id}
                  role={role}
                  allPermissions={permissions}
                  onEdit={handleEditRole}
                  onDelete={handleDeleteRole}
                  canEdit={hasRolesUpdatePermission}
                  canDelete={hasRolesDeletePermission}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Role Dialog */}
      <Dialog open={showCreateRoleDialog} onOpenChange={setShowCreateRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('roles.createRoleDialog') || 'Create Role'}</DialogTitle>
            <DialogDescription>
              {t('roles.createNewRole') || 'Create a new role for your organization'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleCreateRole)} className="space-y-4">
            <div>
              <Label htmlFor="create-role-name">{t('roles.roleNameRequired') || 'Role Name'} *</Label>
              <Input
                id="create-role-name"
                {...register('name')}
                placeholder={t('roles.roleNamePlaceholder') || 'e.g., Manager, Editor'}
              />
              {errors.name && (
                <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="create-role-description">{t('events.description') || 'Description'}</Label>
              <Input
                id="create-role-description"
                {...register('description')}
                placeholder={t('permissions.descriptionPlaceholder') || 'Optional description'}
              />
              {errors.description && (
                <p className="text-sm text-destructive mt-1">{errors.description.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setShowCreateRoleDialog(false);
                reset();
              }}>
                {t('events.cancel') || 'Cancel'}
              </Button>
              <Button type="submit" disabled={createRole.isPending}>
                {createRole.isPending ? (t('events.saving') || 'Saving...') : (t('events.create') || 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={showEditRoleDialog} onOpenChange={setShowEditRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('roles.editRole') || 'Edit Role'}</DialogTitle>
            <DialogDescription>
              {t('roles.updateRoleInfo') || 'Update role information'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleUpdateRole)} className="space-y-4">
            <div>
              <Label htmlFor="edit-role-name">{t('roles.roleNameRequired') || 'Role Name'} *</Label>
              <Input
                id="edit-role-name"
                {...register('name')}
                placeholder={t('roles.roleNamePlaceholder') || 'e.g., Manager, Editor'}
                disabled
              />
              <p className="text-sm text-muted-foreground mt-1">
                {t('roles.roleNameCannotChange') || 'Role name cannot be changed'}
              </p>
            </div>
            <div>
              <Label htmlFor="edit-role-description">{t('events.description') || 'Description'}</Label>
              <Input
                id="edit-role-description"
                {...register('description')}
                placeholder={t('permissions.descriptionPlaceholder') || 'Optional description'}
              />
              {errors.description && (
                <p className="text-sm text-destructive mt-1">{errors.description.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setShowEditRoleDialog(false);
                setSelectedRole(null);
                reset();
              }}>
                {t('events.cancel') || 'Cancel'}
              </Button>
              <Button type="submit" disabled={updateRole.isPending}>
                {updateRole.isPending ? (t('events.saving') || 'Saving...') : (t('events.update') || 'Update')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Role Dialog */}
      <AlertDialog open={showDeleteRoleDialog} onOpenChange={setShowDeleteRoleDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('roles.deleteRole') || 'Delete Role'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('assets.deleteConfirm')?.replace('{name}', selectedRole?.name || '') || 
               `Are you sure you want to delete "${selectedRole?.name}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteRoleDialog(false);
              setSelectedRole(null);
            }}>
              {t('events.cancel') || 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteRole.isPending}
            >
              {deleteRole.isPending ? (t('events.deleting') || 'Deleting...') : (t('events.delete') || 'Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
