import { useState, useMemo } from 'react';
import {
  usePermissions,
  useRolePermissions,
  useAssignPermissionToRole,
  useRemovePermissionFromRole,
  useCreatePermission,
  useUpdatePermission,
  useDeletePermission,
  useRoles,
  type Permission,
  type Role
} from '@/hooks/usePermissions';
import { useProfile } from '@/hooks/useProfiles';
import { useCurrentOrganization } from '@/hooks/useOrganizations';
import { useHasPermission } from '@/hooks/usePermissions';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, Shield, Edit, Save, X, Trash2, Building2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { showToast } from '@/lib/toast';

export function PermissionsManagement() {
  const { t } = useLanguage();
  const { data: profile } = useProfile();
  const { data: currentOrg } = useCurrentOrganization();
  const { data: roles = [], isLoading: rolesLoading } = useRoles();
  const hasPermissionsPermission = useHasPermission('permissions.read');
  const hasPermissionsUpdatePermission = useHasPermission('permissions.update');

  const { data: allPermissions, isLoading: permissionsLoading } = usePermissions();

  // Filter permissions by organization: show global (organization_id = NULL) + user's org permissions
  const permissions = useMemo(() => {
    if (!allPermissions || !profile) return [];

    // Users see: global permissions + their organization's permissions
    return allPermissions.filter(p =>
      p.organizationId === null || p.organizationId === profile.organization_id
    );
  }, [allPermissions, profile]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResource, setSelectedResource] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingPermission, setEditingPermission] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string[]>>({});
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPermission, setNewPermission] = useState({
    name: '',
    resource: '',
    action: '',
    description: '',
  });

  // Fetch role permissions for all roles
  // We'll fetch for the main roles (admin, staff, teacher) and handle others dynamically
  const adminRolePerms = useRolePermissions('admin');
  const staffRolePerms = useRolePermissions('staff');
  const teacherRolePerms = useRolePermissions('teacher');

  // Create a map of role permissions for easy lookup
  const rolePermissionsMap = useMemo(() => {
    const map: Record<string, string[]> = {};

    // Add permissions for main roles
    if (adminRolePerms.data) {
      map['admin'] = adminRolePerms.data.permissions || [];
    }
    if (staffRolePerms.data) {
      map['staff'] = staffRolePerms.data.permissions || [];
    }
    if (teacherRolePerms.data) {
      map['teacher'] = teacherRolePerms.data.permissions || [];
    }

    // Initialize other roles with empty arrays (they'll be populated when needed)
    roles.forEach(role => {
      if (!map[role.name]) {
        map[role.name] = [];
      }
    });

    return map;
  }, [adminRolePerms.data, staffRolePerms.data, teacherRolePerms.data, roles]);

  const assignPermission = useAssignPermissionToRole();
  const removePermission = useRemovePermissionFromRole();
  const createPermission = useCreatePermission();
  const updatePermission = useUpdatePermission();
  const deletePermission = useDeletePermission();

  // Group permissions by resource
  const groupedPermissions = useMemo(() => {
    if (!permissions) return {};

    const grouped: Record<string, typeof permissions> = {};
    permissions.forEach(permission => {
      if (!grouped[permission.resource]) {
        grouped[permission.resource] = [];
      }
      grouped[permission.resource].push(permission);
    });

    return grouped;
  }, [permissions]);

  // Get roles that have a specific permission
  const getRolesWithPermission = (permissionId: string): string[] => {
    // Find the permission by ID to get its name
    const permission = permissions?.find(p => p.id === permissionId);
    if (!permission) return [];

    const permissionName = permission.name;
    const rolesWithPerm: string[] = [];

    Object.entries(rolePermissionsMap).forEach(([roleName, permNames]) => {
      if (permNames.includes(permissionName)) {
        rolesWithPerm.push(roleName);
      }
    });

    return rolesWithPerm;
  };

  // Filter permissions based on search and resource filter
  const filteredPermissions = useMemo(() => {
    if (!permissions) return [];

    let filtered = permissions;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name?.toLowerCase().includes(query) ||
        p.resource?.toLowerCase().includes(query) ||
        p.action?.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query))
      );
    }

    if (selectedResource) {
      filtered = filtered.filter(p => p.resource === selectedResource);
    }

    return filtered;
  }, [permissions, searchQuery, selectedResource]);

  // Get unique resources for filter
  const resources = useMemo(() => {
    if (!permissions) return [];
    return Array.from(new Set(permissions.map(p => p.resource))).sort();
  }, [permissions]);

  const handleEditPermission = (permissionId: string) => {
    setEditingPermission(permissionId);
    const rolesWithPermission = getRolesWithPermission(permissionId);
    setSelectedRoles({
      [permissionId]: rolesWithPermission,
    });
    setIsEditMode(true);
  };

  const handleSavePermission = async (permissionId: string) => {
    if (!editingPermission) return;

    const currentRoles = getRolesWithPermission(permissionId);
    const newRoles = selectedRoles[permissionId] || [];

    // Find roles to add
    const rolesToAdd = newRoles.filter(role => !currentRoles.includes(role));
    // Find roles to remove
    const rolesToRemove = currentRoles.filter(role => !newRoles.includes(role));

    try {
      // Add new role-permission assignments
      for (const role of rolesToAdd) {
        await assignPermission.mutateAsync({ role, permissionId });
      }

      // Remove role-permission assignments
      for (const role of rolesToRemove) {
        await removePermission.mutateAsync({ role, permissionId });
      }

      toast.success(t('permissions.permissionRolesUpdated'));
      setIsEditMode(false);
      setEditingPermission(null);
      setSelectedRoles({});
    } catch (error: any) {
      toast.error(error.message || t('permissions.failedToUpdate'));
    }
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditingPermission(null);
    setSelectedRoles({});
  };

  const toggleRoleForPermission = (permissionId: string, roleName: string) => {
    setSelectedRoles(prev => {
      const current = prev[permissionId] || getRolesWithPermission(permissionId);
      const newRoles = current.includes(roleName)
        ? current.filter(r => r !== roleName)
        : [...current, roleName];
      return {
        ...prev,
        [permissionId]: newRoles,
      };
    });
  };

  // Check if user has permission to view permissions management
  if (!hasPermissionsPermission) {
    return (
      <div className="container mx-auto p-6">
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

  if (permissionsLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">{t('permissions.loadingPermissions')}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleCreatePermission = async () => {
    try {
      await createPermission.mutateAsync(newPermission);
      setShowCreateDialog(false);
      setNewPermission({ name: '', resource: '', action: '', description: '' });
    } catch (error: any) {
      showToast.error(error.message || t('toast.permissionCreateFailed'));
    }
  };

  const handleDeletePermission = async (permissionId: string) => {
    if (!confirm(t('permissions.deleteConfirm'))) {
      return;
    }
    try {
      await deletePermission.mutateAsync(permissionId);
    } catch (error: any) {
      toast.error(error.message || t('permissions.failedToDelete'));
    }
  };

  const isPermissionEditable = (permission: Permission): boolean => {
    if (!hasPermissionsUpdatePermission) return false;
    // Users can only edit permissions for their organization
    return permission.organizationId === profile?.organization_id;
  };

  const isPermissionDeletable = (permission: Permission): boolean => {
    if (!hasPermissionsUpdatePermission) return false;
    // Users can only delete permissions for their organization (not global)
    return permission.organizationId === profile?.organization_id && permission.organizationId !== null;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {t('permissions.title')}
              </CardTitle>
              <CardDescription>
                {t('permissions.subtitle').replace('{orgName}', currentOrg?.name || 'your organization')}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {hasPermissionsUpdatePermission && (
                <Button
                  variant="default"
                  onClick={() => setShowCreateDialog(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('permissions.createPermission')}
                </Button>
              )}
              {!isEditMode && (
                <Button
                  variant="outline"
                  onClick={() => setIsEditMode(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {t('permissions.editMode')}
                </Button>
              )}
              {isEditMode && (
                <Button
                  variant="outline"
                  onClick={() => handleCancelEdit()}
                >
                  <X className="h-4 w-4 mr-2" />
                  {t('permissions.cancelEdit')}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filter */}
          <div className="mb-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('permissions.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedResource === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedResource(null)}
              >
                {t('permissions.allResources')}
              </Button>
              {resources.map(resource => (
                <Button
                  key={resource}
                  variant={selectedResource === resource ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedResource(resource)}
                >
                  {resource}
                </Button>
              ))}
            </div>
          </div>

          {/* Permissions Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('permissions.permissionName')}</TableHead>
                  <TableHead>{t('permissions.resource')}</TableHead>
                  <TableHead>{t('permissions.action')}</TableHead>
                  <TableHead>{t('permissions.description')}</TableHead>
                  <TableHead>{t('permissions.roles')}</TableHead>
                  {isEditMode && <TableHead className="text-right">{t('permissions.actions')}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPermissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isEditMode ? 6 : 5} className="text-center text-muted-foreground">
                      {t('permissions.noPermissionsFound')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPermissions.map((permission) => {
                    const rolesWithPermission = getRolesWithPermission(permission.id);
                    const isEditing = editingPermission === permission.id;
                    const selectedRolesForPermission = selectedRoles[permission.id] || rolesWithPermission;

                    return (
                      <TableRow key={permission.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {permission.name}
                            {permission.organizationId === null ? (
                              <Badge variant="outline" className="text-xs">{t('permissions.globalBadge')}</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">{t('permissions.orgSpecificBadge')}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{permission.resource}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{permission.action}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {permission.description || t('permissions.noDescription')}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {isEditing ? (
                              <div className="space-y-2">
                                {roles.map(role => (
                                  <div key={role.name} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`${permission.id}-${role.name}`}
                                      checked={selectedRolesForPermission.includes(role.name)}
                                      onCheckedChange={() => toggleRoleForPermission(permission.id, role.name)}
                                    />
                                    <Label
                                      htmlFor={`${permission.id}-${role.name}`}
                                      className="text-sm font-normal cursor-pointer"
                                    >
                                      {role.name.replace(/_/g, ' ')}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              rolesWithPermission.map(role => (
                                <Badge key={role} variant="default">
                                  {role.replace('_', ' ')}
                                </Badge>
                              ))
                            )}
                          </div>
                        </TableCell>
                        {isEditMode && (
                          <TableCell className="text-right">
                            {isEditing ? (
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleSavePermission(permission.id)}
                                  disabled={assignPermission.isPending || removePermission.isPending}
                                >
                                  <Save className="h-4 w-4 mr-2" />
                                  {t('permissions.save')}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCancelEdit()}
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  {t('permissions.cancel')}
                                </Button>
                              </div>
                            ) : (
                              <div className="flex justify-end gap-2">
                                {isPermissionEditable(permission) && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditPermission(permission.id)}
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    {t('permissions.editRoles')}
                                  </Button>
                                )}
                                {isPermissionDeletable(permission) && (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDeletePermission(permission.id)}
                                    disabled={deletePermission.isPending}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {t('permissions.delete')}
                                  </Button>
                                )}
                              </div>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Statistics */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t('permissions.totalPermissions')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{permissions?.length || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t('permissions.resources')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{resources.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t('permissions.rolesCount')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{roles.length}</div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Create Permission Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('permissions.createDialogTitle')}</DialogTitle>
            <DialogDescription>
              {t('permissions.createDialogDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="permission-name">{t('permissions.permissionName')}</Label>
              <Input
                id="permission-name"
                placeholder={t('permissions.permissionNamePlaceholder')}
                value={newPermission.name}
                onChange={(e) => setNewPermission({ ...newPermission, name: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                {t('permissions.permissionNameFormat')}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="permission-resource">{t('permissions.resource')}</Label>
              <Input
                id="permission-resource"
                placeholder={t('permissions.resourcePlaceholder')}
                value={newPermission.resource}
                onChange={(e) => setNewPermission({ ...newPermission, resource: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="permission-action">{t('permissions.action')}</Label>
              <Input
                id="permission-action"
                placeholder={t('permissions.actionPlaceholder')}
                value={newPermission.action}
                onChange={(e) => setNewPermission({ ...newPermission, action: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="permission-description">{t('permissions.description')}</Label>
              <Input
                id="permission-description"
                placeholder={t('permissions.descriptionPlaceholder')}
                value={newPermission.description}
                onChange={(e) => setNewPermission({ ...newPermission, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              {t('permissions.cancel')}
            </Button>
            <Button
              onClick={handleCreatePermission}
              disabled={!newPermission.name || !newPermission.resource || !newPermission.action || createPermission.isPending}
            >
              {createPermission.isPending ? t('permissions.creating') : t('permissions.createPermissionButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

