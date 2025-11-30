import { useState, useMemo } from 'react';
import { 
  usePermissions,
  useUserPermissionsForUser,
  useAssignPermissionToUser,
  useRemovePermissionFromUser,
  type Permission
} from '@/hooks/usePermissions';
import { useProfile, useProfiles, useIsSuperAdmin } from '@/hooks/useProfiles';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Shield, User, X, Building2 } from 'lucide-react';
import { toast } from 'sonner';

export function UserPermissionsManagement() {
  const { data: profile } = useProfile();
  const isSuperAdmin = useIsSuperAdmin();
  const { data: currentOrg } = useCurrentOrganization();
  const hasPermissionsPermission = useHasPermission('permissions.read');
  const hasPermissionsUpdatePermission = useHasPermission('permissions.update');
  
  const { data: allPermissions, isLoading: permissionsLoading } = usePermissions();
  const { data: allUsers, isLoading: usersLoading } = useProfiles();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  
  // Get permissions for selected user
  const { data: userPermissionsData, isLoading: userPermissionsLoading } = useUserPermissionsForUser(selectedUserId || '');
  
  const assignPermission = useAssignPermissionToUser();
  const removePermission = useRemovePermissionFromUser();
  
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
  
  // Filter users
  const filteredUsers = useMemo(() => {
    if (!allUsers) return [];
    
    return allUsers.filter(user => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          user.full_name?.toLowerCase().includes(query) ||
          user.email?.toLowerCase().includes(query) ||
          user.role?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      
      // Role filter
      if (roleFilter !== 'all' && user.role !== roleFilter) {
        return false;
      }
      
      return true;
    });
  }, [allUsers, searchQuery, roleFilter]);
  
  // Get selected user
  const selectedUser = useMemo(() => {
    if (!selectedUserId || !allUsers) return null;
    return allUsers.find(u => u.id === selectedUserId);
  }, [selectedUserId, allUsers]);
  
  // Get user's effective permissions (user_permissions + role_permissions)
  const userEffectivePermissions = useMemo(() => {
    if (!userPermissionsData || !permissions) return new Set<string>();
    
    const permSet = new Set<string>();
    
    // Add role-based permissions
    userPermissionsData.rolePermissions.forEach((rp: { permission: Permission | null }) => {
      if (rp.permission) {
        permSet.add(rp.permission.name);
      }
    });
    
    // Add user-specific permissions (these override role permissions)
    userPermissionsData.userPermissions.forEach((up: { permission: Permission | null }) => {
      if (up.permission) {
        permSet.add(up.permission.name);
      }
    });
    
    return permSet;
  }, [userPermissionsData, permissions]);
  
  // Get user-specific permission IDs (for visual distinction)
  const userSpecificPermissionIds = useMemo(() => {
    if (!userPermissionsData) return new Set<string>();
    
    return new Set(
      userPermissionsData.userPermissions.map((up: { permission_id: string }) => up.permission_id)
    );
  }, [userPermissionsData]);
  
  // Group permissions by resource (must be before any early returns)
  const permissionsByResource = useMemo(() => {
    const grouped: Record<string, Permission[]> = {};
    permissions.forEach(perm => {
      if (!grouped[perm.resource]) {
        grouped[perm.resource] = [];
      }
      grouped[perm.resource].push(perm);
    });
    return grouped;
  }, [permissions]);
  
  const handleOpenPermissionsDialog = (userId: string) => {
    setSelectedUserId(userId);
    setIsPermissionsDialogOpen(true);
  };
  
  const handleClosePermissionsDialog = () => {
    setIsPermissionsDialogOpen(false);
    setSelectedUserId(null);
  };
  
  const handleTogglePermission = async (permission: Permission) => {
    if (!selectedUserId) return;
    
    const hasPermission = userEffectivePermissions.has(permission.name);
    const isUserSpecific = userSpecificPermissionIds.has(permission.id);
    
    try {
      if (hasPermission && isUserSpecific) {
        // Remove user-specific permission
        await removePermission.mutateAsync({
          userId: selectedUserId,
          permissionId: permission.id,
        });
        toast.success('Permission removed from user');
      } else if (!hasPermission) {
        // Add user-specific permission
        await assignPermission.mutateAsync({
          userId: selectedUserId,
          permissionId: permission.id,
        });
        toast.success('Permission assigned to user');
      } else {
        // Permission exists via role, cannot remove (would need to remove from role)
        toast.info('Permission is assigned via role. Remove from role to revoke.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update permission');
    }
  };
  
  // Check if user has permission to view user permissions management
  if (!hasPermissionsPermission && !isSuperAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-destructive">
              <Shield className="h-12 w-12 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
              <p>You do not have permission to manage user permissions.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (usersLoading || permissionsLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">Loading...</div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
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
                  Managing user permissions for: <span className="font-semibold">{currentOrg.name}</span>
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Assign specific permissions to individual users. User-specific permissions override role-based permissions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Permissions Management
          </CardTitle>
          <CardDescription>
            Assign specific permissions to individual users. This is useful for staff members who need different permissions than their role provides.
          </CardDescription>
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
            <div className="flex gap-4">
              <div className="flex-1">
                <Label>Filter by Role</Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="accountant">Accountant</SelectItem>
                    <SelectItem value="librarian">Librarian</SelectItem>
                    <SelectItem value="hostel_manager">Hostel Manager</SelectItem>
                    <SelectItem value="asset_manager">Asset Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          {/* Users Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  {isSuperAdmin && <TableHead>Organization</TableHead>}
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isSuperAdmin ? 6 : 5} className="text-center text-muted-foreground">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.full_name || 'No name'}
                      </TableCell>
                      <TableCell>{user.email || 'No email'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.role}</Badge>
                      </TableCell>
                      {isSuperAdmin && (
                        <TableCell>
                          {user.organization_id ? (
                            <Badge variant="secondary">
                              {currentOrg?.id === user.organization_id ? currentOrg.name : 'Other'}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">None</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge variant={user.is_active ? 'default' : 'secondary'}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenPermissionsDialog(user.id)}
                          disabled={!hasPermissionsUpdatePermission && !isSuperAdmin}
                        >
                          <Shield className="h-4 w-4 mr-2" />
                          Manage Permissions
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {/* Permissions Dialog */}
      <Dialog open={isPermissionsDialogOpen} onOpenChange={setIsPermissionsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Manage Permissions for {selectedUser?.full_name || selectedUser?.email || 'User'}
            </DialogTitle>
            <DialogDescription>
              Assign or remove specific permissions for this user. User-specific permissions override role-based permissions.
            </DialogDescription>
          </DialogHeader>
          
          {userPermissionsLoading ? (
            <div className="text-center py-8">Loading permissions...</div>
          ) : (
            <div className="space-y-4">
              {Object.entries(permissionsByResource).map(([resource, resourcePermissions]) => (
                <Card key={resource}>
                  <CardHeader>
                    <CardTitle className="text-lg capitalize">{resource.replace('_', ' ')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {resourcePermissions.map((permission) => {
                        const hasPermission = userEffectivePermissions.has(permission.name);
                        const isUserSpecific = userSpecificPermissionIds.has(permission.id);
                        const isRoleBased = hasPermission && !isUserSpecific;
                        
                        return (
                          <div
                            key={permission.id}
                            className="flex items-center justify-between p-2 rounded border hover:bg-muted/50"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <Checkbox
                                checked={hasPermission}
                                onCheckedChange={() => handleTogglePermission(permission)}
                                disabled={!hasPermissionsUpdatePermission && !isSuperAdmin}
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Label className="font-medium">{permission.name}</Label>
                                  {isUserSpecific && (
                                    <Badge variant="default" className="text-xs">User-Specific</Badge>
                                  )}
                                  {isRoleBased && (
                                    <Badge variant="outline" className="text-xs">From Role</Badge>
                                  )}
                                </div>
                                {permission.description && (
                                  <p className="text-sm text-muted-foreground">{permission.description}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={handleClosePermissionsDialog}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

