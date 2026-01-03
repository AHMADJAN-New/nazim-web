import { Building2, Users, Mail, Phone, Search, Shield, Settings } from 'lucide-react';
import { useState, useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLanguage } from '@/hooks/useLanguage';
import { formatDate } from '@/lib/utils';
import { 
  usePlatformOrganizationAdmins,
  usePlatformOrganizationPermissions,
  usePlatformUserPermissions,
  usePlatformAssignPermissionToUser,
  usePlatformRemovePermissionFromUser,
  usePlatformPermissionGroups,
  usePlatformAssignPermissionGroupToUser,
  usePlatformRemovePermissionGroupFromUser,
} from '@/platform/hooks/usePlatformAdminComplete';

export function OrganizationAdminsManagement() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAdmin, setSelectedAdmin] = useState<{ id: string; organizationId: string; name: string } | null>(null);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);

  const { data, isLoading, error } = usePlatformOrganizationAdmins();
  
  // Get permissions for selected admin's organization
  const { data: orgPermissions } = usePlatformOrganizationPermissions(selectedAdmin?.organizationId || null);
  
  // Get global permission groups (can be assigned to any organization)
  const { data: permissionGroups } = usePlatformPermissionGroups();
  
  // Get user permissions for selected admin
  const { data: userPermissionsData, isLoading: userPermissionsLoading } = usePlatformUserPermissions(selectedAdmin?.id || null);
  
  const assignPermission = usePlatformAssignPermissionToUser();
  const removePermission = usePlatformRemovePermissionFromUser();
  const assignPermissionGroup = usePlatformAssignPermissionGroupToUser();
  const removePermissionGroup = usePlatformRemovePermissionGroupFromUser();

  const filteredData = useMemo(() => {
    if (!data) return [];
    if (!searchQuery) return data;

    const query = searchQuery.toLowerCase();
    return data.filter((item: any) => {
      const orgMatch = 
        item.organization.name?.toLowerCase().includes(query) ||
        item.organization.slug?.toLowerCase().includes(query) ||
        item.organization.email?.toLowerCase().includes(query);
      
      const adminMatch = item.admins.some((admin: any) =>
        admin.email?.toLowerCase().includes(query) ||
        admin.full_name?.toLowerCase().includes(query) ||
        admin.phone?.toLowerCase().includes(query)
      );

      return orgMatch || adminMatch;
    });
  }, [data, searchQuery]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">Failed to load organization admins</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Organization Administrators
          </CardTitle>
          <CardDescription>
            View and manage administrators for all organizations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search organizations or admins..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {/* Organizations List */}
          <div className="space-y-4">
            {filteredData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No organizations found
              </div>
            ) : (
              filteredData.map((item: any) => (
                <Card key={item.organization.id} className="border-l-4 border-l-primary">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">{item.organization.name}</CardTitle>
                        <Badge variant={item.organization.is_active ? 'default' : 'secondary'}>
                          {item.organization.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {item.admin_count} admin{item.admin_count !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-4 mt-2">
                        {item.organization.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            <span className="text-xs">{item.organization.email}</span>
                          </div>
                        )}
                        {item.organization.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <span className="text-xs">{item.organization.phone}</span>
                          </div>
                        )}
                        <span className="text-xs">
                          Created: {formatDate(new Date(item.organization.created_at))}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {item.admins.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        No administrators found for this organization
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {item.admins.map((admin: any) => (
                            <TableRow key={admin.id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <Shield className="h-4 w-4 text-primary" />
                                  {admin.full_name}
                                </div>
                              </TableCell>
                              <TableCell>{admin.email}</TableCell>
                              <TableCell>{admin.phone || '-'}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{admin.role}</Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {formatDate(new Date(admin.created_at))}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedAdmin({
                                      id: admin.id,
                                      organizationId: item.organization.id,
                                      name: admin.full_name || admin.email,
                                    });
                                    setIsPermissionsDialogOpen(true);
                                  }}
                                >
                                  <Settings className="h-4 w-4 mr-2" />
                                  Manage Permissions
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Permissions Management Dialog */}
      <Dialog open={isPermissionsDialogOpen} onOpenChange={setIsPermissionsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Manage Permissions: {selectedAdmin?.name}
            </DialogTitle>
            <DialogDescription>
              Assign or remove permissions for this organization administrator
            </DialogDescription>
          </DialogHeader>

          {userPermissionsLoading ? (
            <div className="py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Current Permissions Summary */}
              {userPermissionsData && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Current Permissions</CardTitle>
                    <CardDescription>
                      Total: {userPermissionsData.all_permissions.length} permissions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {userPermissionsData.all_permissions.length === 0 ? (
                          <span className="text-sm text-muted-foreground">No permissions assigned</span>
                        ) : (
                          userPermissionsData.all_permissions.map((perm) => {
                            const isDirect = userPermissionsData.direct_permissions.some(p => p.name === perm);
                            const isFromRole = userPermissionsData.role_permissions.some(p => p.name === perm);
                            return (
                              <Badge 
                                key={perm} 
                                variant={isDirect ? "default" : "secondary"}
                                title={isDirect ? "Direct permission" : isFromRole ? "From role" : ""}
                              >
                                {perm}
                                {isDirect && <span className="ml-1">*</span>}
                              </Badge>
                            );
                          })
                        )}
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground pt-2 border-t">
                        <div>
                          <span className="font-medium">Direct:</span> {userPermissionsData.direct_permissions.length}
                        </div>
                        <div>
                          <span className="font-medium">From Role:</span> {userPermissionsData.role_permissions.length}
                        </div>
                        <div className="text-xs">
                          <span className="font-medium">*</span> = Direct permission (can be removed)
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Permission Groups */}
              {permissionGroups && permissionGroups.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Permission Groups</CardTitle>
                    <CardDescription>
                      Assign or remove entire permission groups at once. This is faster than assigning individual permissions.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {permissionGroups.map((group: any) => {
                        // Ensure permission IDs are numbers
                        const groupPermissionIds = group.permissions.map((p: any) => 
                          typeof p.id === 'string' ? parseInt(p.id, 10) : p.id
                        );
                        const allAssigned = groupPermissionIds.every((pid: number) => 
                          userPermissionsData?.direct_permissions.some(p => p.id === pid)
                        );
                        const someAssigned = groupPermissionIds.some((pid: number) => 
                          userPermissionsData?.direct_permissions.some(p => p.id === pid)
                        );
                        const isLoading = assignPermissionGroup.isPending || removePermissionGroup.isPending;

                        return (
                          <div
                            key={group.id}
                            className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="font-medium flex items-center gap-2">
                                {group.name}
                                <Badge variant="outline" className="text-xs">
                                  {group.permissions.length} permission{group.permissions.length !== 1 ? 's' : ''}
                                </Badge>
                              </div>
                              {group.description && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {group.description}
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground mt-1">
                                Includes: {group.permissions.slice(0, 3).map(p => p.name).join(', ')}
                                {group.permissions.length > 3 && ` +${group.permissions.length - 3} more`}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {allAssigned ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={isLoading}
                                  onClick={() => {
                                    if (!selectedAdmin || isLoading) return;
                                    removePermissionGroup.mutate({
                                      userId: selectedAdmin.id,
                                      permissionGroupId: group.id,
                                    });
                                  }}
                                >
                                  Remove All
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="default"
                                  disabled={isLoading}
                                  onClick={() => {
                                    if (!selectedAdmin || isLoading) return;
                                    assignPermissionGroup.mutate({
                                      userId: selectedAdmin.id,
                                      permissionGroupId: group.id,
                                    });
                                  }}
                                >
                                  {someAssigned ? 'Add Missing' : 'Assign All'}
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Available Permissions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Available Permissions</CardTitle>
                  <CardDescription>
                    Select individual permissions to assign to this administrator. Permissions inherited from roles cannot be removed here.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!orgPermissions || !Array.isArray(orgPermissions) || orgPermissions.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      {orgPermissions === undefined ? (
                        <LoadingSpinner />
                      ) : (
                        "No permissions available for this organization"
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {orgPermissions.map((permission: any) => {
                        // Ensure permission.id is a number (backend expects integer)
                        const permissionId = typeof permission.id === 'string' ? parseInt(permission.id, 10) : permission.id;
                        
                        const isAssigned = userPermissionsData?.direct_permissions.some(
                          (p) => p.id === permissionId
                        );
                        const isFromRole = userPermissionsData?.role_permissions.some(
                          (p) => p.id === permissionId
                        );
                        const isLoading = assignPermission.isPending || removePermission.isPending;

                        return (
                          <div
                            key={permission.id}
                            className={`flex items-center justify-between p-3 border rounded-md transition-colors ${
                              isFromRole ? 'bg-muted/50' : 'hover:bg-muted/30'
                            } ${isLoading ? 'opacity-60' : ''}`}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <Checkbox
                                checked={isAssigned || isFromRole}
                                disabled={isFromRole || isLoading}
                                onCheckedChange={(checked) => {
                                  if (!selectedAdmin || isFromRole || isLoading) return;
                                  
                                  if (checked) {
                                    assignPermission.mutate({
                                      userId: selectedAdmin.id,
                                      permissionId: permissionId,
                                    });
                                  } else {
                                    removePermission.mutate({
                                      userId: selectedAdmin.id,
                                      permissionId: permissionId,
                                    });
                                  }
                                }}
                              />
                              <div className="flex-1">
                                <div className="font-medium flex items-center gap-2">
                                  {permission.name}
                                  {isLoading && (
                                    <LoadingSpinner size="sm" />
                                  )}
                                  {isFromRole && (
                                    <Badge variant="outline" className="text-xs" title="This permission comes from a role and cannot be removed directly. Remove the role or the permission from the role instead.">
                                      From Role
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  <span className="font-medium">{permission.resource}</span> • <span className="font-medium">{permission.action}</span>
                                  {permission.description && (
                                    <span className="ml-2">• {permission.description}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPermissionsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

