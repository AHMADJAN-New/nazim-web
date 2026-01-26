import { Building2, Users, Mail, Phone, Search, Shield, Settings, MoreHorizontal, KeyRound } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/hooks/useLanguage';
import { showToast } from '@/lib/toast';
import { platformApi } from '@/platform/lib/platformApi';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
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
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAdmin, setSelectedAdmin] = useState<{ id: string; organizationId: string; name: string } | null>(null);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [passwordAdmin, setPasswordAdmin] = useState<{ id: string; name: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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

  // Password reset mutation
  const resetPassword = useMutation({
    mutationFn: async ({ userId, password }: { userId: string; password: string }) => {
      // Use resetPasswordAny for organization admins (not platform admins)
      return platformApi.users.resetPasswordAny(userId, password);
    },
    onSuccess: () => {
      showToast.success('Password reset successfully');
      setIsPasswordDialogOpen(false);
      setPasswordAdmin(null);
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to reset password');
    },
  });

  const handleOpenPasswordDialog = (admin: { id: string; name: string }) => {
    setPasswordAdmin(admin);
    setIsPasswordDialogOpen(true);
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleResetPassword = () => {
    if (!passwordAdmin) return;
    
    if (!newPassword || newPassword.length < 8) {
      showToast.error('Password must be at least 8 characters long');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      showToast.error('Passwords do not match');
      return;
    }

    resetPassword.mutate({
      userId: passwordAdmin.id,
      password: newPassword,
    });
  };

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
      <div className="container mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 max-w-7xl w-full overflow-x-hidden min-w-0">
        <Card>
          <CardContent className="pt-6">
            <LoadingSpinner />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 max-w-7xl w-full overflow-x-hidden min-w-0">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">Failed to load organization admins</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 max-w-7xl w-full overflow-x-hidden min-w-0">
      <PageHeader
        title="Organization Administrators"
        description="View and manage administrators for all organizations"
        icon={<Users className="h-5 w-5" />}
        showDescriptionOnMobile={false}
      />

      <Card className="overflow-hidden w-full min-w-0">
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 min-w-0">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base sm:text-lg md:text-xl truncate">Search Administrators</CardTitle>
              <CardDescription className="hidden md:block text-sm mt-1">
                Search by organization name, email, or administrator details
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
          {/* Search */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search organizations or admins..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 w-full"
              />
            </div>
          </div>

          {/* Organizations List */}
          <div className="space-y-4 min-w-0 w-full">
            {filteredData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No organizations found
              </div>
            ) : (
              filteredData.map((item: any) => (
                <Card key={item.organization.id} className="border-l-4 border-l-primary overflow-hidden w-full min-w-0">
                  <CardHeader className="p-3 sm:p-4 md:p-6 pb-2 sm:pb-3 min-w-0">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                        <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary hidden sm:inline-flex flex-shrink-0" />
                        <CardTitle className="text-sm sm:text-base md:text-lg line-clamp-2 break-words min-w-0 flex-1">{item.organization.name}</CardTitle>
                        <Badge variant={item.organization.is_active ? 'default' : 'secondary'} className="flex-shrink-0 text-xs">
                          {item.organization.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap">
                        {item.admin_count} admin{item.admin_count !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1.5 sm:mt-2 min-w-0">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5 sm:gap-2 md:gap-4 min-w-0">
                        {item.organization.email && (
                          <div className="flex items-center gap-1 min-w-0 flex-1 sm:flex-initial">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{item.organization.email}</span>
                          </div>
                        )}
                        {item.organization.phone && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Phone className="h-3 w-3 flex-shrink-0" />
                            <span className="whitespace-nowrap">{item.organization.phone}</span>
                          </div>
                        )}
                        <span className="flex-shrink-0 whitespace-nowrap">
                          Created: {formatDate(new Date(item.organization.created_at))}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-2 sm:p-4 md:p-6 pt-0">
                    {item.admins.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        No administrators found for this organization
                      </div>
                    ) : (
                      <>
                        {/* Mobile Card Layout */}
                        <div className="space-y-2 sm:hidden w-full min-w-0">
                          {item.admins.map((admin: any) => (
                            <Card key={admin.id} className="border overflow-hidden w-full min-w-0">
                              <CardContent className="p-3 min-w-0">
                                <div className="space-y-2.5">
                                  <div className="flex items-start justify-between gap-2 min-w-0">
                                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                      <Shield className="h-4 w-4 text-primary flex-shrink-0" />
                                      <div className="min-w-0 flex-1 overflow-hidden">
                                        <div className="font-medium text-sm truncate">{admin.full_name || 'N/A'}</div>
                                        <div className="text-xs text-muted-foreground truncate mt-0.5">{admin.email}</div>
                                      </div>
                                    </div>
                                    <Badge variant="outline" className="flex-shrink-0 text-xs">{admin.role}</Badge>
                                  </div>
                                  {admin.phone && (
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
                                      <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                                      <span className="truncate">{admin.phone}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="truncate">Created: {formatDate(new Date(admin.created_at))}</span>
                                  </div>
                                  <div className="pt-2 border-t space-y-2">
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
                                      className="w-full text-xs h-8"
                                      aria-label="Manage Permissions"
                                    >
                                      <Settings className="h-3.5 w-3.5 mr-1.5" />
                                      Manage Permissions
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleOpenPasswordDialog({
                                        id: admin.id,
                                        name: admin.full_name || admin.email,
                                      })}
                                      className="w-full text-xs h-8"
                                      aria-label="Reset Password"
                                    >
                                      <KeyRound className="h-3.5 w-3.5 mr-1.5" />
                                      Reset Password
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>

                        {/* Desktop Table Layout */}
                        <div className="hidden sm:block overflow-x-auto">
                          <div className="inline-block min-w-full align-middle">
                            <Table className="min-w-[600px]">
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="whitespace-nowrap">Name</TableHead>
                                  <TableHead className="whitespace-nowrap">Email</TableHead>
                                  <TableHead className="hidden md:table-cell whitespace-nowrap">Phone</TableHead>
                                  <TableHead className="hidden md:table-cell whitespace-nowrap">Role</TableHead>
                                  <TableHead className="hidden lg:table-cell whitespace-nowrap">Created</TableHead>
                                  <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {item.admins.map((admin: any) => (
                                  <TableRow key={admin.id}>
                                    <TableCell className="font-medium max-w-[200px]">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <Shield className="h-4 w-4 text-primary flex-shrink-0" />
                                        <div className="line-clamp-2 break-words">{admin.full_name || 'N/A'}</div>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="truncate max-w-[200px]">{admin.email}</div>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">{admin.phone || '-'}</TableCell>
                                    <TableCell className="hidden md:table-cell">
                                      <Badge variant="outline">{admin.role}</Badge>
                                    </TableCell>
                                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                                      {formatDate(new Date(admin.created_at))}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {/* Desktop: Show buttons */}
                                      <div className="hidden md:flex items-center gap-1.5 sm:gap-2 justify-end">
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
                                          className="flex-shrink-0"
                                          aria-label="Manage Permissions"
                                        >
                                          <Settings className="h-4 w-4" />
                                          <span className="hidden sm:inline ml-2">Manage</span>
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleOpenPasswordDialog({
                                            id: admin.id,
                                            name: admin.full_name || admin.email,
                                          })}
                                          className="flex-shrink-0"
                                          aria-label="Reset Password"
                                        >
                                          <KeyRound className="h-4 w-4" />
                                          <span className="hidden sm:inline ml-2">Password</span>
                                        </Button>
                                      </div>
                                      
                                      {/* Mobile: Show dropdown */}
                                      <div className="md:hidden flex justify-end">
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" aria-label="Actions">
                                              <MoreHorizontal className="h-4 w-4" />
                                              <span className="sr-only">Actions</span>
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => {
                                              setSelectedAdmin({
                                                id: admin.id,
                                                organizationId: item.organization.id,
                                                name: admin.full_name || admin.email,
                                              });
                                              setIsPermissionsDialogOpen(true);
                                            }}>
                                              <Settings className="mr-2 h-4 w-4" />
                                              Manage Permissions
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => handleOpenPasswordDialog({
                                              id: admin.id,
                                              name: admin.full_name || admin.email,
                                            })}>
                                              <KeyRound className="mr-2 h-4 w-4" />
                                              Reset Password
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </>
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
        <style>{`
          @media (max-width: 639px) {
            [data-radix-dialog-content][data-state="open"] {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              right: 0 !important;
              bottom: 0 !important;
              transform: none !important;
              margin: 0 !important;
              max-width: 100% !important;
              width: 100% !important;
              height: 100vh !important;
              max-height: 100vh !important;
              border-radius: 0 !important;
            }
          }
        `}</style>
        <DialogContent className="max-w-4xl max-h-[100vh] h-[100vh] sm:max-h-[95vh] sm:h-[95vh] w-full sm:w-[95vw] md:w-[90vw] lg:w-full p-0 gap-0 flex flex-col m-0 sm:m-4 rounded-none sm:rounded-lg overflow-hidden">
          <DialogHeader className="px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 md:pt-6 pb-2 sm:pb-3 md:pb-4 flex-shrink-0 border-b">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span className="truncate">Manage Permissions: {selectedAdmin?.name}</span>
            </DialogTitle>
            <DialogDescription className="hidden sm:block text-xs sm:text-sm mt-1">
              Assign or remove permissions for this organization administrator
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6 min-w-0">
            {userPermissionsLoading ? (
              <div className="py-8">
                <LoadingSpinner />
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {/* Current Permissions Summary */}
                {userPermissionsData && (
                  <Card className="overflow-hidden">
                    <CardHeader className="p-3 sm:p-4 md:p-6">
                      <CardTitle className="text-sm sm:text-base">Current Permissions</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        Total: {userPermissionsData.all_permissions.length} permissions
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
                      <div className="space-y-2 sm:space-y-3">
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                          {userPermissionsData.all_permissions.length === 0 ? (
                            <span className="text-xs sm:text-sm text-muted-foreground">No permissions assigned</span>
                          ) : (
                            userPermissionsData.all_permissions.map((perm) => {
                              const isDirect = userPermissionsData.direct_permissions.some(p => p.name === perm);
                              const isFromRole = userPermissionsData.role_permissions.some(p => p.name === perm);
                              return (
                                <Badge 
                                  key={perm} 
                                  variant={isDirect ? "default" : "secondary"}
                                  title={isDirect ? "Direct permission" : isFromRole ? "From role" : ""}
                                  className="text-xs"
                                >
                                  <span className="truncate max-w-[150px] sm:max-w-none">{perm}</span>
                                  {isDirect && <span className="ml-1">*</span>}
                                </Badge>
                              );
                            })
                          )}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-xs text-muted-foreground pt-2 border-t">
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
                  <Card className="overflow-hidden">
                    <CardHeader className="p-3 sm:p-4 md:p-6">
                      <CardTitle className="text-sm sm:text-base">Permission Groups</CardTitle>
                      <CardDescription className="text-xs sm:text-sm hidden sm:block">
                        Assign or remove entire permission groups at once. This is faster than assigning individual permissions.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
                      <div className="space-y-2 max-h-48 sm:max-h-64 overflow-y-auto">
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
                              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 p-2 sm:p-3 border rounded-md hover:bg-muted/30 transition-colors min-w-0"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm sm:text-base flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                  <span className="truncate">{group.name}</span>
                                  <Badge variant="outline" className="text-xs flex-shrink-0">
                                    {group.permissions.length} permission{group.permissions.length !== 1 ? 's' : ''}
                                  </Badge>
                                </div>
                                {group.description && (
                                  <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {group.description}
                                  </div>
                                )}
                                <div className="text-xs text-muted-foreground mt-1 truncate">
                                  Includes: {group.permissions.slice(0, 3).map(p => p.name).join(', ')}
                                  {group.permissions.length > 3 && ` +${group.permissions.length - 3} more`}
                                </div>
                              </div>
                              <div className="flex gap-1.5 sm:gap-2 w-full sm:w-auto">
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
                                    className="flex-1 sm:flex-initial text-xs"
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
                                    className="flex-1 sm:flex-initial text-xs"
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
                <Card className="overflow-hidden">
                  <CardHeader className="p-3 sm:p-4 md:p-6">
                    <CardTitle className="text-sm sm:text-base">Available Permissions</CardTitle>
                    <CardDescription className="text-xs sm:text-sm hidden sm:block">
                      Select individual permissions to assign to this administrator. Permissions inherited from roles cannot be removed here.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
                    {!orgPermissions || !Array.isArray(orgPermissions) || orgPermissions.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground text-xs sm:text-sm">
                        {orgPermissions === undefined ? (
                          <LoadingSpinner />
                        ) : (
                          "No permissions available for this organization"
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-64 sm:max-h-96 overflow-y-auto">
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
                              className={`flex items-start sm:items-center justify-between gap-2 sm:gap-3 p-2 sm:p-3 border rounded-md transition-colors min-w-0 ${
                                isFromRole ? 'bg-muted/50' : 'hover:bg-muted/30'
                              } ${isLoading ? 'opacity-60' : ''}`}
                            >
                              <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
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
                                  className="mt-0.5 sm:mt-0 flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0 overflow-hidden">
                                  <div className="font-medium text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                    <span className="truncate">{permission.name}</span>
                                    {isLoading && (
                                      <LoadingSpinner size="sm" />
                                    )}
                                    {isFromRole && (
                                      <Badge variant="outline" className="text-xs flex-shrink-0" title="This permission comes from a role and cannot be removed directly. Remove the role or the permission from the role instead.">
                                        From Role
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-0.5 sm:mt-1 line-clamp-2">
                                    <span className="font-medium">{permission.resource}</span> • <span className="font-medium">{permission.action}</span>
                                    {permission.description && (
                                      <span className="ml-1 sm:ml-2">• {permission.description}</span>
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
          </div>

          <DialogFooter className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 border-t flex-shrink-0">
            <Button 
              variant="outline" 
              onClick={() => setIsPermissionsDialogOpen(false)}
              className="w-full sm:w-auto text-xs sm:text-sm"
            >
              Close
            </Button>
          </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Password Reset Dialog */}
        <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
          <DialogContent className="max-w-md w-[95vw] sm:w-full">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Reset Password
              </DialogTitle>
              <DialogDescription>
                Reset password for {passwordAdmin?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 8 characters)"
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  minLength={8}
                />
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsPasswordDialogOpen(false);
                  setPasswordAdmin(null);
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                onClick={handleResetPassword}
                disabled={resetPassword.isPending || !newPassword || !confirmPassword || newPassword.length < 8}
                className="w-full sm:w-auto"
              >
                {resetPassword.isPending ? 'Resetting...' : 'Reset Password'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

