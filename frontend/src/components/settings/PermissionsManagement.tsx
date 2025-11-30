import { useState, useMemo } from 'react';
import { 
  usePermissions, 
  useRolePermissions,
  useAssignPermissionToRole, 
  useRemovePermissionFromRole,
  useCreatePermission,
  useUpdatePermission,
  useDeletePermission,
  type Permission
} from '@/hooks/usePermissions';
import { useProfile, useIsSuperAdmin } from '@/hooks/useProfiles';
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
import { toast } from 'sonner';

const AVAILABLE_ROLES = [
  'super_admin',
  'admin',
  'teacher',
  'accountant',
  'librarian',
  'parent',
  'student',
  'hostel_manager',
  'asset_manager',
  'staff',
] as const;

type Role = typeof AVAILABLE_ROLES[number];

export function PermissionsManagement() {
  const { data: profile } = useProfile();
  const isSuperAdmin = useIsSuperAdmin();
  const { data: currentOrg } = useCurrentOrganization();
  const hasPermissionsPermission = useHasPermission('permissions.read');
  const hasPermissionsUpdatePermission = useHasPermission('permissions.update');
  
  const { data: allPermissions, isLoading: permissionsLoading } = usePermissions();
  
  // Filter permissions by organization: show global (organization_id = NULL) + user's org permissions
  const permissions = useMemo(() => {
    if (!allPermissions || !profile) return [];
    
    if (isSuperAdmin) {
      // Super admin sees all permissions
      return allPermissions;
    }
    
    // Regular users see: global permissions + their organization's permissions
    return allPermissions.filter(p => 
      p.organization_id === null || p.organization_id === profile.organization_id
    );
  }, [allPermissions, profile, isSuperAdmin]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResource, setSelectedResource] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingPermission, setEditingPermission] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, Role[]>>({});
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPermission, setNewPermission] = useState({
    name: '',
    resource: '',
    action: '',
    description: '',
  });

  // Fetch role permissions for all roles
  const rolePermissionsQueries = AVAILABLE_ROLES.map(role => ({
    role,
    query: useRolePermissions(role),
  }));

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
  const getRolesWithPermission = (permissionId: string): Role[] => {
    return rolePermissionsQueries
      .filter(({ query }) => {
        const rolePerms = query.data || [];
        return rolePerms.some(rp => rp.permission_id === permissionId);
      })
      .map(({ role }) => role);
  };

  // Filter permissions based on search and resource filter
  const filteredPermissions = useMemo(() => {
    if (!permissions) return [];

    let filtered = permissions;

    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.resource.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
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

      toast.success('Permission roles updated successfully');
      setIsEditMode(false);
      setEditingPermission(null);
      setSelectedRoles({});
    } catch (error: any) {
      toast.error(error.message || 'Failed to update permission roles');
    }
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditingPermission(null);
    setSelectedRoles({});
  };

  const toggleRoleForPermission = (permissionId: string, role: Role) => {
    setSelectedRoles(prev => {
      const current = prev[permissionId] || getRolesWithPermission(permissionId);
      const newRoles = current.includes(role)
        ? current.filter(r => r !== role)
        : [...current, role];
      return {
        ...prev,
        [permissionId]: newRoles,
      };
    });
  };

  // Check if user has permission to view permissions management
  if (!hasPermissionsPermission && !isSuperAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-destructive">
              <Shield className="h-12 w-12 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
              <p>You do not have permission to manage permissions.</p>
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
            <div className="text-center">Loading permissions...</div>
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
      toast.error(error.message || 'Failed to create permission');
    }
  };

  const handleDeletePermission = async (permissionId: string) => {
    if (!confirm('Are you sure you want to delete this permission? This action cannot be undone.')) {
      return;
    }
    try {
      await deletePermission.mutateAsync(permissionId);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete permission');
    }
  };

  const isPermissionEditable = (permission: Permission): boolean => {
    if (isSuperAdmin) return true;
    if (!hasPermissionsUpdatePermission) return false;
    // Regular admin can only edit permissions for their organization
    return permission.organization_id === profile?.organization_id;
  };

  const isPermissionDeletable = (permission: Permission): boolean => {
    if (isSuperAdmin) return true;
    if (!hasPermissionsUpdatePermission) return false;
    // Regular admin can only delete permissions for their organization (not global)
    return permission.organization_id === profile?.organization_id && permission.organization_id !== null;
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
                  Managing permissions for: <span className="font-semibold">{currentOrg.name}</span>
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  You can view global permissions and manage permissions for your organization
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
                Permissions Management
              </CardTitle>
              <CardDescription>
                {isSuperAdmin 
                  ? 'View and manage all permissions across all organizations.'
                  : `View and manage permissions for ${currentOrg?.name || 'your organization'}. You can create organization-specific permissions.`
                }
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {hasPermissionsUpdatePermission && (
                <Button
                  variant="default"
                  onClick={() => setShowCreateDialog(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Permission
                </Button>
              )}
            {!isEditMode && (
              <Button
                variant="outline"
                onClick={() => setIsEditMode(true)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Mode
              </Button>
            )}
            {isEditMode && (
              <Button
                variant="outline"
                onClick={() => handleCancelEdit()}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel Edit
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
                placeholder="Search permissions by name, resource, action, or description..."
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
                All Resources
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
                  <TableHead>Permission Name</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Roles</TableHead>
                  {isEditMode && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPermissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isEditMode ? 6 : 5} className="text-center text-muted-foreground">
                      No permissions found
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
                            {permission.organization_id === null ? (
                              <Badge variant="outline" className="text-xs">Global</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">Org-Specific</Badge>
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
                          {permission.description || 'No description'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {isEditing ? (
                              <div className="space-y-2">
                                {AVAILABLE_ROLES.map(role => (
                                  <div key={role} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`${permission.id}-${role}`}
                                      checked={selectedRolesForPermission.includes(role)}
                                      onCheckedChange={() => toggleRoleForPermission(permission.id, role)}
                                    />
                                    <Label
                                      htmlFor={`${permission.id}-${role}`}
                                      className="text-sm font-normal cursor-pointer"
                                    >
                                      {role.replace('_', ' ')}
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
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCancelEdit()}
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Cancel
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
                                    Edit Roles
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
                                    Delete
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
                <CardTitle className="text-sm font-medium">Total Permissions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{permissions?.length || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Resources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{resources.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Roles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{AVAILABLE_ROLES.length}</div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Create Permission Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Permission</DialogTitle>
            <DialogDescription>
              Create a new organization-specific permission. This permission will only be available for your organization.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="permission-name">Permission Name</Label>
              <Input
                id="permission-name"
                placeholder="e.g., custom_feature.read"
                value={newPermission.name}
                onChange={(e) => setNewPermission({ ...newPermission, name: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Format: resource.action (e.g., custom_feature.read)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="permission-resource">Resource</Label>
              <Input
                id="permission-resource"
                placeholder="e.g., custom_feature"
                value={newPermission.resource}
                onChange={(e) => setNewPermission({ ...newPermission, resource: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="permission-action">Action</Label>
              <Input
                id="permission-action"
                placeholder="e.g., read, create, update, delete"
                value={newPermission.action}
                onChange={(e) => setNewPermission({ ...newPermission, action: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="permission-description">Description</Label>
              <Input
                id="permission-description"
                placeholder="Describe what this permission allows"
                value={newPermission.description}
                onChange={(e) => setNewPermission({ ...newPermission, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreatePermission}
              disabled={!newPermission.name || !newPermission.resource || !newPermission.action || createPermission.isPending}
            >
              {createPermission.isPending ? 'Creating...' : 'Create Permission'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

