import { Search, Shield, User, X, Building2, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { useState, useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCurrentOrganization } from '@/hooks/useOrganizations';
import {
  usePermissions,
  useUserPermissionsForUser,
  useAssignPermissionToUser,
  useRemovePermissionFromUser,
  useAssignRoleToUser,
  useRemoveRoleFromUser,
  useUserRoles,
  useRoles,
  getFeatureKeyForGrouping,
  type Permission,
  type Role,
} from '@/hooks/usePermissions';
import { useProfile, useProfiles } from '@/hooks/useProfiles';
import { useHasPermission } from '@/hooks/usePermissions';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { showToast } from '@/lib/toast';
import { useLanguage } from '@/hooks/useLanguage';

/** Display labels for feature groups in the permissions dialog */
const FEATURE_LABELS: Record<string, string> = {
  students: 'Students',
  staff: 'Staff',
  classes: 'Classes',
  attendance: 'Attendance',
  hostel: 'Hostel',
  subjects: 'Subjects',
  exams: 'Exams',
  exams_full: 'Exams (full)',
  question_bank: 'Question Bank',
  exam_paper_generator: 'Exam Papers',
  grades: 'Grades',
  timetables: 'Timetables',
  timetable: 'Timetables',
  library: 'Library',
  finance: 'Finance',
  fees: 'Fees',
  multi_currency: 'Multi-currency',
  dms: 'Document Management',
  events: 'Events',
  leave_management: 'Leave Management',
  graduation: 'Graduation',
  id_cards: 'ID Cards',
  assets: 'Assets',
  other: 'Other',
};

/** Order of feature sections in the permissions dialog (first = default expanded) */
const FEATURE_ORDER = [
  'students', 'staff', 'classes', 'subjects', 'exams', 'exams_full', 'grades',
  'attendance', 'finance', 'fees', 'multi_currency', 'dms', 'events', 'library',
  'hostel', 'graduation', 'id_cards', 'assets', 'leave_management', 'other',
];

export function UserPermissionsManagement() {
  const { t } = useLanguage();
  const { data: profile } = useProfile();
  const { data: currentOrg } = useCurrentOrganization();
  const hasPermissionsPermission = useHasPermission('permissions.read');
  const hasPermissionsUpdatePermission = useHasPermission('permissions.update');
  
  const { data: allPermissions, isLoading: permissionsLoading } = usePermissions();
  const { data: allUsers, isLoading: usersLoading } = useProfiles();
  const { data: roles = [], isLoading: rolesLoading } = useRoles();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [permissionSearchInDialog, setPermissionSearchInDialog] = useState('');
  const [expandedFeatureSections, setExpandedFeatureSections] = useState<Set<string>>(
    () => new Set([FEATURE_ORDER[0] ?? 'other'])
  );
  
  // Get permissions for selected user
  const { data: userPermissionsData, isLoading: userPermissionsLoading } = useUserPermissionsForUser(selectedUserId || '');
  
  // Get roles for selected user
  const { data: userRolesData, isLoading: userRolesLoading } = useUserRoles(selectedUserId || '');
  
  const assignPermission = useAssignPermissionToUser();
  const removePermission = useRemovePermissionFromUser();
  const assignRole = useAssignRoleToUser();
  const removeRole = useRemoveRoleFromUser();
  
  // Filter permissions by organization: show global (organization_id = NULL) + user's org permissions
  // Also ensure all permissions have valid UUID IDs
  const permissions = useMemo(() => {
    if (!allPermissions || !profile) {
      if (import.meta.env.DEV && !allPermissions) {
        console.warn('[UserPermissionsManagement] allPermissions is empty or undefined');
      }
      return [];
    }
    
    // Users see: global permissions + their organization's permissions
    // Permissions use integer IDs (not UUIDs) - filter out any without valid IDs
    const filtered = allPermissions.filter(p => {
      // Check organization scope
      const orgMatch = p.organizationId === null || p.organizationId === profile.organization_id;
      // Check ID is valid (integer or UUID - permissions use integers)
      const validId = p.id && (typeof p.id === 'number' || typeof p.id === 'string');
      
      return orgMatch && validId;
    });
    
    if (import.meta.env.DEV && filtered.length === 0 && allPermissions.length > 0) {
      console.warn('[UserPermissionsManagement] All permissions filtered out. Total permissions:', allPermissions.length, 'Sample:', allPermissions[0]);
    }
    
    return filtered;
  }, [allPermissions, profile]);
  
  // Filter users
  const filteredUsers = useMemo(() => {
    if (!allUsers) return [];
    
    return allUsers.filter(user => {
      // Search filter
      if (searchQuery) {
        const query = (searchQuery || '').toLowerCase();
        const matchesSearch = 
          user.fullName?.toLowerCase().includes(query) ||
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
  // Permission IDs can be numbers (integer) or strings
  const userSpecificPermissionIds = useMemo(() => {
    if (!userPermissionsData) return new Set<string | number>();
    
    return new Set(
      userPermissionsData.userPermissions.map((up: { permission_id: string | number }) => up.permission_id)
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

  // Group permissions by feature for dialog (collapsible sections)
  const permissionsByFeature = useMemo(() => {
    const grouped: Record<string, Permission[]> = {};
    permissions.forEach(perm => {
      const featureKey = getFeatureKeyForGrouping(perm.name);
      if (!grouped[featureKey]) {
        grouped[featureKey] = [];
      }
      grouped[featureKey].push(perm);
    });
    return grouped;
  }, [permissions]);

  // Filter by search in dialog (by permission name or resource)
  const filteredPermissionsByFeature = useMemo(() => {
    const search = (permissionSearchInDialog || '').trim().toLowerCase();
    if (!search) {
      return permissionsByFeature;
    }
    const result: Record<string, Permission[]> = {};
    Object.entries(permissionsByFeature).forEach(([featureKey, perms]) => {
      const filtered = perms.filter(
        p =>
          p.name.toLowerCase().includes(search) ||
          (p.resource && p.resource.toLowerCase().includes(search))
      );
      if (filtered.length > 0) {
        result[featureKey] = filtered;
      }
    });
    return result;
  }, [permissionsByFeature, permissionSearchInDialog]);

  const toggleFeatureSection = (featureKey: string) => {
    setExpandedFeatureSections(prev => {
      const next = new Set(prev);
      if (next.has(featureKey)) {
        next.delete(featureKey);
      } else {
        next.add(featureKey);
      }
      return next;
    });
  };

  const handleOpenPermissionsDialog = (userId: string) => {
    setSelectedUserId(userId);
    setIsPermissionsDialogOpen(true);
  };
  
  const handleClosePermissionsDialog = () => {
    setIsPermissionsDialogOpen(false);
    setSelectedUserId(null);
    setPermissionSearchInDialog('');
  };
  
  const handleTogglePermission = async (permission: Permission) => {
    if (!selectedUserId) return;
    
    // Validate permission has a valid ID (permissions use integer IDs, not UUIDs)
    if (!permission.id || (typeof permission.id !== 'number' && typeof permission.id !== 'string')) {
      if (import.meta.env.DEV) {
        console.error('[UserPermissionsManagement] Invalid permission ID:', permission);
      }
      showToast.error(t('userPermissions.failedToUpdate'));
      return;
    }
    
    const hasPermission = userEffectivePermissions.has(permission.name);
    const isUserSpecific = userSpecificPermissionIds.has(permission.id);
    
    try {
      if (hasPermission && isUserSpecific) {
        // Remove user-specific permission
        await removePermission.mutateAsync({
          userId: selectedUserId,
          permissionId: permission.id,
        });
        showToast.success(t('userPermissions.permissionRemoved'));
      } else if (!hasPermission) {
        // Add user-specific permission
        await assignPermission.mutateAsync({
          userId: selectedUserId,
          permissionId: permission.id,
        });
        showToast.success(t('userPermissions.permissionAssigned'));
      } else {
        // Permission exists via role, cannot remove (would need to remove from role)
        showToast.info(t('userPermissions.permissionFromRole'));
      }
    } catch (error: any) {
      showToast.error(error.message || t('userPermissions.failedToUpdate'));
    }
  };

  const handleAssignRole = async (roleName: string) => {
    if (!selectedUserId) return;
    
    try {
      await assignRole.mutateAsync({
        userId: selectedUserId,
        role: roleName,
      });
    } catch (error: any) {
      showToast.error(error.message || t('userPermissions.failedToAssignRole'));
    }
  };

  const handleRemoveRole = async (roleName: string) => {
    if (!selectedUserId) return;
    
    if (!confirm(t('userPermissions.removeRoleConfirm', { roleName }))) {
      return;
    }
    
    try {
      await removeRole.mutateAsync({
        userId: selectedUserId,
        role: roleName,
      });
    } catch (error: any) {
      showToast.error(error.message || t('userPermissions.failedToRemoveRole'));
    }
  };
  
  // Check if user has permission to view user permissions management
  if (!hasPermissionsPermission) {
    return (
      <div className="container mx-auto p-4 md:p-6 max-w-7xl overflow-x-hidden">
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="text-center text-destructive">
              <Shield className="h-12 w-12 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('userPermissions.accessDenied')}</h3>
              <p>{t('userPermissions.noPermissionMessage')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (usersLoading || permissionsLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6 max-w-7xl overflow-x-hidden">
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="text-center">{t('common.loading')}</div>
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
            <div className="flex items-start gap-2">
              <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100 break-words">
                  {t('userPermissions.managingUserPermissionsFor', { name: currentOrg.name })}
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  {t('userPermissions.assignSpecificPermissions')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 hidden md:inline-flex" />
            {t('userPermissions.title')}
          </CardTitle>
          <CardDescription className="hidden md:block">
            {t('userPermissions.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="mb-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('assets.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label>{t('userPermissions.filterByRole')}</Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('userManagement.allRoles')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('userManagement.allRoles')}</SelectItem>
                    <SelectItem value="staff">{t('userPermissions.roleStaff')}</SelectItem>
                    <SelectItem value="admin">{t('userPermissions.roleAdmin')}</SelectItem>
                    <SelectItem value="teacher">{t('userPermissions.roleTeacher')}</SelectItem>
                    <SelectItem value="accountant">{t('userPermissions.roleAccountant')}</SelectItem>
                    <SelectItem value="librarian">{t('userPermissions.roleLibrarian')}</SelectItem>
                    <SelectItem value="hostel_manager">{t('userPermissions.roleHostelManager')}</SelectItem>
                    <SelectItem value="asset_manager">{t('userPermissions.roleAssetManager')}</SelectItem>
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
                    <TableHead>{t('events.name')}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t('events.email')}</TableHead>
                    <TableHead className="hidden md:table-cell">{t('userManagement.role')}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t('events.status')}</TableHead>
                    <TableHead className="text-right">{t('events.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        {t('userManagement.noUsersFound')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col sm:hidden gap-1">
                            <span>{user.fullName || t('userPermissions.noName')}</span>
                            <span className="text-xs text-muted-foreground">{user.email || t('userPermissions.noEmail')}</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              <Badge variant="outline" className="text-xs">{user.role}</Badge>
                              <Badge variant={user.isActive ? 'default' : 'secondary'} className="text-xs">
                                {user.isActive ? t('events.active') : t('events.inactive')}
                              </Badge>
                            </div>
                          </div>
                          <span className="hidden sm:inline">{user.fullName || t('userPermissions.noName')}</span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{user.email || t('userPermissions.noEmail')}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline">{user.role}</Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Badge variant={user.isActive ? 'default' : 'secondary'}>
                            {user.isActive ? t('events.active') : t('events.inactive')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {hasPermissionsUpdatePermission && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenPermissionsDialog(user.id)}
                              className="flex-shrink-0"
                            >
                              <Shield className="h-4 w-4 sm:mr-2" />
                              <span className="hidden sm:inline">{t('userPermissions.managePermissions')}</span>
                            </Button>
                          )}
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
      
      {/* Permissions Dialog */}
      <Dialog open={isPermissionsDialogOpen} onOpenChange={setIsPermissionsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="break-words">
              {t('userPermissions.managePermissionsDialogTitle', { name: selectedUser?.fullName || selectedUser?.email || t('userPermissions.user') })}
            </DialogTitle>
            <DialogDescription className="hidden md:block">
              {t('userPermissions.managePermissionsDialogDescription')}
            </DialogDescription>
          </DialogHeader>
          
          {userPermissionsLoading || userRolesLoading || permissionsLoading || permissions.length === 0 ? (
            <div className="text-center py-8">
              {permissionsLoading ? t('userPermissions.loadingPermissions') : permissions.length === 0 ? t('userPermissions.noPermissionsAvailable') : t('userPermissions.loadingUserPermissions')}
            </div>
          ) : (
            <div className="space-y-6">
              {/* User Roles Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('userPermissions.userRoles')}</CardTitle>
                  <CardDescription className="hidden md:block">
                    {t('userPermissions.manageRolesDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Current Roles */}
                    <div>
                      <Label className="text-sm font-medium mb-2 block">{t('userPermissions.currentRoles')}</Label>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {userRolesData?.roles && userRolesData.roles.length > 0 ? (
                          userRolesData.roles.map((roleName) => (
                            <Badge key={roleName} variant="default" className="flex items-center gap-2">
                              {roleName}
                              {hasPermissionsUpdatePermission && (
                                <button
                                  onClick={() => handleRemoveRole(roleName)}
                                  className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                                  disabled={assignRole.isPending || removeRole.isPending}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">{t('userPermissions.noRolesAssigned')}</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Available Roles to Assign */}
                    {hasPermissionsUpdatePermission && (
                      <div>
                        <Label className="text-sm font-medium mb-2 block">{t('userPermissions.assignRole')}</Label>
                        <div className="flex flex-wrap gap-2">
                          {roles
                            .filter(role => !userRolesData?.roles?.includes(role.name))
                            .map((role) => (
                              <Button
                                key={role.name}
                                variant="outline"
                                size="sm"
                                onClick={() => handleAssignRole(role.name)}
                                disabled={assignRole.isPending || removeRole.isPending}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                {role.name}
                              </Button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Direct Permissions – grouped by feature with search */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('userPermissions.directPermissions')}</CardTitle>
                  <CardDescription className="hidden md:block">
                    {t('userPermissions.directPermissionsDescription')}
                  </CardDescription>
                  <div className="pt-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={t('userPermissions.searchPermissions') || 'Search by permission or resource...'}
                        value={permissionSearchInDialog}
                        onChange={(e) => setPermissionSearchInDialog(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {FEATURE_ORDER.map((featureKey) => {
                    const featurePermissions = filteredPermissionsByFeature[featureKey];
                    if (!featurePermissions || featurePermissions.length === 0) {
                      return null;
                    }
                    const label = FEATURE_LABELS[featureKey] ?? featureKey.replace(/_/g, ' ');
                    const isOpen = expandedFeatureSections.has(featureKey);
                    return (
                      <Collapsible
                        key={featureKey}
                        open={isOpen}
                        onOpenChange={() => toggleFeatureSection(featureKey)}
                      >
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            className="w-full justify-between px-3 py-2 h-auto font-medium"
                          >
                            <span className="flex items-center gap-2">
                              {isOpen ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                              {label}
                              <Badge variant="secondary" className="text-xs">
                                {featurePermissions.length}
                              </Badge>
                            </span>
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="space-y-2 pl-6 pt-2 pb-2">
                            {featurePermissions.map((permission) => {
                              const hasPermission = userEffectivePermissions.has(permission.name);
                              const isUserSpecific = userSpecificPermissionIds.has(permission.id);
                              const isRoleBased = hasPermission && !isUserSpecific;
                              return (
                                <div
                                  key={permission.id}
                                  className="flex items-start justify-between p-2 rounded border hover:bg-muted/50 gap-2"
                                >
                                  <div className="flex items-start gap-3 flex-1 min-w-0">
                                    <Checkbox
                                      checked={hasPermission}
                                      onCheckedChange={() => handleTogglePermission(permission)}
                                      disabled={!hasPermissionsUpdatePermission}
                                      className="mt-1 flex-shrink-0"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <Label className="font-medium break-words">{permission.name}</Label>
                                        {isUserSpecific && (
                                          <Badge variant="default" className="text-xs flex-shrink-0">{t('permissions.userSpecific')}</Badge>
                                        )}
                                        {isRoleBased && (
                                          <Badge variant="outline" className="text-xs flex-shrink-0">{t('permissions.fromRole')}</Badge>
                                        )}
                                      </div>
                                      {permission.description && (
                                        <p className="text-sm text-muted-foreground mt-1 break-words">{permission.description}</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={handleClosePermissionsDialog} className="w-full sm:w-auto">
              {t('events.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

