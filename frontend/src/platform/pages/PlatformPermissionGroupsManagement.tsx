import { useState, useMemo, useRef, useEffect } from 'react';
import {
  usePlatformPermissionGroups,
  usePlatformCreatePermissionGroup,
  usePlatformUpdatePermissionGroup,
  usePlatformDeletePermissionGroup,
} from '@/platform/hooks/usePlatformAdminComplete';
import { platformApi } from '@/platform/lib/platformApi';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, Plus, Edit, Trash2, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { showToast } from '@/lib/toast';

export function PlatformPermissionGroupsManagement() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<{
    id: string;
    name: string;
    description?: string;
    permissions: Array<{ id: number; name: string }>;
  } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permission_ids: [] as number[],
  });

  // Get all global permission groups
  const { data: permissionGroups, isLoading: groupsLoading } = usePlatformPermissionGroups();
  
  // Get all permissions from all organizations (for creating groups)
  const { data: allPermissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ['platform-all-permissions'],
    queryFn: async () => {
      return platformApi.permissions.getAll();
    },
    staleTime: 5 * 60 * 1000,
  });

  const createGroup = usePlatformCreatePermissionGroup();
  const updateGroup = usePlatformUpdatePermissionGroup();
  const deleteGroup = usePlatformDeletePermissionGroup();

  const filteredGroups = useMemo(() => {
    if (!permissionGroups) return [];
    if (!searchQuery) return permissionGroups;

    const query = searchQuery.toLowerCase();
    return permissionGroups.filter((group) => {
      return (
        group.name.toLowerCase().includes(query) ||
        group.description?.toLowerCase().includes(query) ||
        group.permissions.some((p) => p.name.toLowerCase().includes(query))
      );
    });
  }, [permissionGroups, searchQuery]);

  // Group permissions by resource for easier selection
  const permissionsByResource = useMemo(() => {
    if (!allPermissions) return {};
    
    const grouped: Record<string, Array<{ id: number; name: string; resource: string; action: string; description?: string; organization_id: string }>> = {};
    
    allPermissions.forEach((perm) => {
      const resource = perm.resource || 'other';
      if (!grouped[resource]) {
        grouped[resource] = [];
      }
      grouped[resource].push(perm);
    });
    
    // Sort resources alphabetically
    const sorted: Record<string, typeof grouped[string]> = {};
    Object.keys(grouped)
      .sort()
      .forEach((key) => {
        sorted[key] = grouped[key].sort((a, b) => a.action.localeCompare(b.action));
      });
    
    return sorted;
  }, [allPermissions]);

  // Track expanded/collapsed resource groups
  const [expandedResources, setExpandedResources] = useState<Set<string>>(new Set());

  const toggleResource = (resource: string) => {
    setExpandedResources((prev) => {
      const next = new Set(prev);
      if (next.has(resource)) {
        next.delete(resource);
      } else {
        next.add(resource);
      }
      return next;
    });
  };

  const toggleAllResources = () => {
    if (expandedResources.size === Object.keys(permissionsByResource).length) {
      setExpandedResources(new Set());
    } else {
      setExpandedResources(new Set(Object.keys(permissionsByResource)));
    }
  };

  // Select all permissions in a resource group
  const toggleResourcePermissions = (resource: string, selectAll: boolean) => {
    const resourcePerms = permissionsByResource[resource] || [];
    const resourcePermIds = resourcePerms.map((p) => p.id);

    setFormData((prev) => {
      if (selectAll) {
        // Add all permissions from this resource (avoid duplicates)
        const newIds = [...new Set([...prev.permission_ids, ...resourcePermIds])];
        return { ...prev, permission_ids: newIds };
      } else {
        // Remove all permissions from this resource
        return {
          ...prev,
          permission_ids: prev.permission_ids.filter((id) => !resourcePermIds.includes(id)),
        };
      }
    });
  };

  // Check if all permissions in a resource are selected
  const isResourceFullySelected = (resource: string): boolean => {
    const resourcePerms = permissionsByResource[resource] || [];
    if (resourcePerms.length === 0) return false;
    return resourcePerms.every((perm) => formData.permission_ids.includes(perm.id));
  };

  // Check if some (but not all) permissions in a resource are selected
  const isResourcePartiallySelected = (resource: string): boolean => {
    const resourcePerms = permissionsByResource[resource] || [];
    if (resourcePerms.length === 0) return false;
    const selectedCount = resourcePerms.filter((perm) => formData.permission_ids.includes(perm.id)).length;
    return selectedCount > 0 && selectedCount < resourcePerms.length;
  };

  const handleCreate = () => {
    setFormData({ name: '', description: '', permission_ids: [] });
    setIsCreateDialogOpen(true);
  };

  const handleEdit = (group: typeof selectedGroup) => {
    if (!group) return;
    setFormData({
      name: group.name,
      description: group.description || '',
      permission_ids: group.permissions.map((p) => p.id),
    });
    setSelectedGroup(group);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (group: typeof selectedGroup) => {
    setSelectedGroup(group);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmitCreate = () => {
    if (!formData.name || formData.permission_ids.length === 0) {
      showToast.error('Please fill in all required fields');
      return;
    }

    createGroup.mutate(
      {
        name: formData.name,
        description: formData.description || undefined,
        permission_ids: formData.permission_ids,
      },
      {
        onSuccess: () => {
          setIsCreateDialogOpen(false);
          setFormData({ name: '', description: '', permission_ids: [] });
        },
      }
    );
  };

  const handleSubmitEdit = () => {
    if (!selectedGroup || !formData.name || formData.permission_ids.length === 0) {
      showToast.error('Please fill in all required fields');
      return;
    }

    updateGroup.mutate(
      {
        groupId: selectedGroup.id,
        data: {
          name: formData.name,
          description: formData.description || undefined,
          permission_ids: formData.permission_ids,
        },
      },
      {
        onSuccess: () => {
          setIsEditDialogOpen(false);
          setSelectedGroup(null);
          setFormData({ name: '', description: '', permission_ids: [] });
        },
      }
    );
  };

  const handleConfirmDelete = () => {
    if (!selectedGroup) return;

    deleteGroup.mutate(selectedGroup.id, {
      onSuccess: () => {
        setIsDeleteDialogOpen(false);
        setSelectedGroup(null);
      },
    });
  };

  const togglePermission = (permissionId: number) => {
    setFormData((prev) => {
      const isSelected = prev.permission_ids.includes(permissionId);
      return {
        ...prev,
        permission_ids: isSelected
          ? prev.permission_ids.filter((id) => id !== permissionId)
          : [...prev.permission_ids, permissionId],
      };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Permission Groups Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Create and manage global permission groups that can be assigned to any organization
          </p>
        </div>
      </div>

      {/* Search and Create */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Global Permission Groups</CardTitle>
              <CardDescription>
                These groups can be assigned to organization admins in any organization
              </CardDescription>
            </div>
            <Button onClick={handleCreate} disabled={!allPermissions || allPermissions.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {groupsLoading ? (
            <div className="py-8">
              <LoadingSpinner />
            </div>
          ) : filteredGroups && filteredGroups.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGroups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell className="font-medium">{group.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {group.description || <span className="italic">No description</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline">
                          {group.permissions.length} permission{group.permissions.length !== 1 ? 's' : ''}
                        </Badge>
                        {group.permissions.slice(0, 3).map((perm) => (
                          <Badge key={perm.id} variant="secondary" className="text-xs">
                            {perm.name}
                          </Badge>
                        ))}
                        {group.permissions.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{group.permissions.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(group)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(group)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No groups found matching your search' : 'No permission groups created yet'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Global Permission Group</DialogTitle>
            <DialogDescription>
              Create a global permission group that can be assigned to organization admins in any organization.
              When assigned, permissions will be matched by name within the user&apos;s organization.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Group Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Full Admin, Staff Manager, etc."
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this permission group is for..."
                rows={3}
              />
            </div>

            <div>
              <Label>Select Permissions *</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Select permissions from any organization. When this group is assigned to a user, 
                permissions will be matched by name within their organization.
              </p>
              <div className="mt-2 border rounded-md p-4 max-h-96 overflow-y-auto">
                {permissionsLoading ? (
                  <div className="text-center py-4">
                    <LoadingSpinner />
                  </div>
                ) : !allPermissions || allPermissions.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No permissions available
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Expand/Collapse All Button */}
                    <div className="flex items-center justify-between mb-2 pb-2 border-b">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={toggleAllResources}
                        className="text-xs"
                      >
                        {expandedResources.size === Object.keys(permissionsByResource).length
                          ? 'Collapse All'
                          : 'Expand All'}
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        {Object.keys(permissionsByResource).length} resource groups
                      </span>
                    </div>

                    {/* Resource Groups */}
                    {Object.entries(permissionsByResource).map(([resource, perms]) => {
                      const isExpanded = expandedResources.has(resource);
                      const isFullySelected = isResourceFullySelected(resource);
                      const isPartiallySelected = isResourcePartiallySelected(resource);
                      const selectedCount = perms.filter((p) => formData.permission_ids.includes(p.id)).length;

                      return (
                        <div key={resource} className="border rounded-md">
                          {/* Resource Header */}
                          <div
                            className="flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => toggleResource(resource)}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                              <div className="flex-1">
                                <div className="font-medium text-sm capitalize">
                                  {resource.replace(/_/g, ' ')}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {perms.length} permission{perms.length !== 1 ? 's' : ''}
                                  {selectedCount > 0 && (
                                    <span className="ml-2 text-primary">
                                      • {selectedCount} selected
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={isFullySelected}
                                onCheckedChange={(checked) => {
                                  toggleResourcePermissions(resource, checked === true);
                                }}
                                className={isPartiallySelected ? 'data-[state=checked]:bg-primary/50' : ''}
                              />
                              <span className="text-xs text-muted-foreground">Select All</span>
                            </div>
                          </div>

                          {/* Permissions List */}
                          {isExpanded && (
                            <div className="p-2 space-y-1 border-t bg-background">
                              {perms.map((permission) => {
                                const isSelected = formData.permission_ids.includes(permission.id);
                                return (
                                  <div
                                    key={permission.id}
                                    className={`flex items-center gap-3 p-2 rounded-md transition-colors ${
                                      isSelected ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/30'
                                    }`}
                                  >
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => togglePermission(permission.id)}
                                    />
                                    <div className="flex-1">
                                      <div className="font-medium text-sm">{permission.name}</div>
                                      <div className="text-xs text-muted-foreground mt-0.5">
                                        <span className="font-medium capitalize">{permission.action}</span>
                                        {permission.description && (
                                          <span className="ml-2">• {permission.description}</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Selected: {formData.permission_ids.length} permission{formData.permission_ids.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitCreate}
              disabled={!formData.name || formData.permission_ids.length === 0 || createGroup.isPending}
            >
              {createGroup.isPending ? 'Creating...' : 'Create Group'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Permission Group</DialogTitle>
            <DialogDescription>
              Update the global permission group. Changes will affect all future assignments.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Group Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Full Admin, Staff Manager, etc."
              />
            </div>

            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this permission group is for..."
                rows={3}
              />
            </div>

            <div>
              <Label>Select Permissions *</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Select permissions grouped by resource. When this group is assigned to a user, 
                permissions will be matched by name within their organization.
              </p>
              <div className="mt-2 border rounded-md p-4 max-h-96 overflow-y-auto">
                {permissionsLoading ? (
                  <div className="text-center py-4">
                    <LoadingSpinner />
                  </div>
                ) : !allPermissions || allPermissions.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No permissions available
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Expand/Collapse All Button */}
                    <div className="flex items-center justify-between mb-2 pb-2 border-b">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={toggleAllResources}
                        className="text-xs"
                      >
                        {expandedResources.size === Object.keys(permissionsByResource).length
                          ? 'Collapse All'
                          : 'Expand All'}
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        {Object.keys(permissionsByResource).length} resource groups
                      </span>
                    </div>

                    {/* Resource Groups */}
                    {Object.entries(permissionsByResource).map(([resource, perms]) => {
                      const isExpanded = expandedResources.has(resource);
                      const isFullySelected = isResourceFullySelected(resource);
                      const isPartiallySelected = isResourcePartiallySelected(resource);
                      const selectedCount = perms.filter((p) => formData.permission_ids.includes(p.id)).length;

                      return (
                        <div key={resource} className="border rounded-md">
                          {/* Resource Header */}
                          <div
                            className="flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => toggleResource(resource)}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                              <div className="flex-1">
                                <div className="font-medium text-sm capitalize">
                                  {resource.replace(/_/g, ' ')}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {perms.length} permission{perms.length !== 1 ? 's' : ''}
                                  {selectedCount > 0 && (
                                    <span className="ml-2 text-primary">
                                      • {selectedCount} selected
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={isFullySelected}
                                onCheckedChange={(checked) => {
                                  toggleResourcePermissions(resource, checked === true);
                                }}
                                className={isPartiallySelected ? 'data-[state=checked]:bg-primary/50' : ''}
                              />
                              <span className="text-xs text-muted-foreground">Select All</span>
                            </div>
                          </div>

                          {/* Permissions List */}
                          {isExpanded && (
                            <div className="p-2 space-y-1 border-t bg-background">
                              {perms.map((permission) => {
                                const isSelected = formData.permission_ids.includes(permission.id);
                                return (
                                  <div
                                    key={permission.id}
                                    className={`flex items-center gap-3 p-2 rounded-md transition-colors ${
                                      isSelected ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/30'
                                    }`}
                                  >
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => togglePermission(permission.id)}
                                    />
                                    <div className="flex-1">
                                      <div className="font-medium text-sm">{permission.name}</div>
                                      <div className="text-xs text-muted-foreground mt-0.5">
                                        <span className="font-medium capitalize">{permission.action}</span>
                                        {permission.description && (
                                          <span className="ml-2">• {permission.description}</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Selected: {formData.permission_ids.length} permission{formData.permission_ids.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitEdit}
              disabled={!formData.name || formData.permission_ids.length === 0 || updateGroup.isPending}
            >
              {updateGroup.isPending ? 'Updating...' : 'Update Group'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Permission Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the permission group &quot;{selectedGroup?.name}&quot;?
              This will not remove permissions that have already been assigned to users, but you
              won&apos;t be able to assign this group to new users.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteGroup.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
