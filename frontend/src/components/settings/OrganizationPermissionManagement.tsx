import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Search, Save, RefreshCw } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
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
import { organizationsApi } from '@/lib/api/client';
import { platformApi } from '@/platform/lib/platformApi';
import { showToast } from '@/lib/toast';

interface OrganizationPermissionManagementProps {
  organizationId: string;
  // Optional: Use platform admin API endpoints instead of regular endpoints
  usePlatformAdminApi?: boolean;
}

interface PermissionsResponse {
  permissions: Array<{
    id: number | string;
    name: string;
    resource?: string;
    action?: string;
    description?: string;
  }>;
  roles: Array<{
    name: string;
    permissions?: string[];
  }>;
  organization?: {
    id: string;
    name: string;
  };
}

export function OrganizationPermissionManagement({ 
  organizationId,
  usePlatformAdminApi = false,
}: OrganizationPermissionManagementProps) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Use platform admin API if specified, otherwise use regular API
  const permissionsApi = usePlatformAdminApi
    ? async (id: string): Promise<PermissionsResponse> => {
        // Platform API returns just permissions array, but we need to match the regular API structure
        // For now, fetch permissions and construct a compatible response
        const permissions = await platformApi.permissions.getForOrganization(id);
        // Get organization info separately
        const orgResponse = await platformApi.organizations.get(id);
        const organization = (orgResponse as any)?.data || orgResponse;
        // Get roles - platform API might not have this, so we'll use empty array for now
        // TODO: Add roles endpoint to platform API if needed
        return {
          permissions: Array.isArray(permissions) ? permissions : [],
          roles: [], // Platform API doesn't have roles endpoint yet
          organization: organization ? { id: organization.id || id, name: organization.name || '' } : undefined,
        };
      }
    : async (id: string): Promise<PermissionsResponse> => {
        const response = await organizationsApi.permissions(id);
        return response as PermissionsResponse;
      };

  const { data, isLoading, error } = useQuery<PermissionsResponse>({
    queryKey: ['organization-permissions', organizationId, usePlatformAdminApi ? 'platform' : 'regular'],
    queryFn: () => permissionsApi(organizationId),
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ role, permissionIds }: { role: string; permissionIds: string[] }) => {
      // Platform admin API doesn't have updatePermissions endpoint yet
      // For now, use regular API (platform admin should have access to it)
      return organizationsApi.updatePermissions(organizationId, {
        role,
        permission_ids: permissionIds,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-permissions', organizationId] });
      showToast.success('toast.permissionsUpdated');
      setIsEditDialogOpen(false);
      setSelectedRole(null);
      setSelectedPermissions(new Set());
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.permissionsUpdateFailed');
    },
  });

  const permissions = data?.permissions || [];
  const roles = data?.roles || [];

  const filteredPermissions = useMemo(() => {
    if (!searchQuery) return permissions;
    const query = searchQuery.toLowerCase();
    return permissions.filter((p: any) =>
      p.name?.toLowerCase().includes(query) ||
      p.resource?.toLowerCase().includes(query) ||
      p.action?.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query)
    );
  }, [permissions, searchQuery]);

  const handleEditRole = (roleName: string) => {
    const role = roles.find((r: any) => r.name === roleName);
    if (role) {
      setSelectedRole(roleName);
      setSelectedPermissions(new Set(role.permissions || []));
      setIsEditDialogOpen(true);
    }
  };

  const handleTogglePermission = (permissionName: string) => {
    const newSet = new Set(selectedPermissions);
    if (newSet.has(permissionName)) {
      newSet.delete(permissionName);
    } else {
      newSet.add(permissionName);
    }
    setSelectedPermissions(newSet);
  };

  const handleSavePermissions = () => {
    if (!selectedRole) return;

    const permissionIds = filteredPermissions
      .filter((p: any) => selectedPermissions.has(p.name))
      .map((p: any) => p.id);

    updatePermissionsMutation.mutate({
      role: selectedRole,
      permissionIds,
    });
  };

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
          <p className="text-destructive">Failed to load permissions</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Organization Permissions
          </CardTitle>
          <CardDescription>
            Manage permissions for {data?.organization?.name || 'this organization'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Roles Summary */}
          <div>
            <h3 className="font-semibold mb-3">Roles & Permissions</h3>
            <div className="grid gap-4 md:grid-cols-3">
              {roles.map((role: any) => (
                <Card key={role.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{role.name}</CardTitle>
                    <CardDescription>{role.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {role.permissions_count} permissions
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditRole(role.name)}
                      >
                        Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Permissions List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">
                All Permissions ({permissions.length})
              </h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search permissions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 w-64"
                  />
                </div>
              </div>
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Resource</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPermissions.map((permission: any) => (
                    <TableRow key={permission.id}>
                      <TableCell>
                        <Badge variant="outline">{permission.resource}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge>{permission.action}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {permission.description || permission.name}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Permissions Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Permissions for {selectedRole}</DialogTitle>
            <DialogDescription>
              Select which permissions should be assigned to the {selectedRole} role
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search permissions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="border rounded-lg max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPermissions.map((permission: any) => (
                    <TableRow key={permission.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedPermissions.has(permission.name)}
                          onCheckedChange={() => handleTogglePermission(permission.name)}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{permission.resource}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge>{permission.action}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {permission.description || permission.name}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="text-sm text-muted-foreground">
              Selected: {selectedPermissions.size} of {filteredPermissions.length} permissions
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePermissions}
              disabled={updatePermissionsMutation.isPending}
            >
              {updatePermissionsMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Permissions
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

