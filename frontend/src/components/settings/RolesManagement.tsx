import { useState, useMemo } from 'react';
import {
  useRoles,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  type Role,
} from '@/hooks/usePermissions';
import { useProfile } from '@/hooks/useProfiles';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Shield, Edit, Trash2, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

const roleSchema = z.object({
  name: z.string().min(1, 'Role name is required').max(255, 'Role name must be 255 characters or less'),
  description: z.string().max(1000, 'Description must be 1000 characters or less').optional().nullable(),
});

type RoleFormData = z.infer<typeof roleSchema>;

export function RolesManagement() {
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
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              You do not have permission to view roles.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Roles Management
              </CardTitle>
              <CardDescription>
                Manage roles for your organization. Roles define what permissions users have.
              </CardDescription>
            </div>
            {hasCreatePermission && (
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Create Role
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
                placeholder="Search roles by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Roles Table */}
          {rolesLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading roles...</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRoles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        {searchQuery ? 'No roles found matching your search' : 'No roles found'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRoles.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell className="font-medium">
                          {role.name}
                        </TableCell>
                        <TableCell>
                          {role.description || <span className="text-muted-foreground">No description</span>}
                        </TableCell>
                        <TableCell>
                          {role.organization_id ? (
                            <Badge variant="outline">Organization-specific</Badge>
                          ) : (
                            <Badge variant="secondary">Global</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {hasUpdatePermission && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenDialog(role)}
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
          )}

          {/* Statistics */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{roles.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Organization Roles</CardTitle>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Role' : 'Create Role'}</DialogTitle>
            <DialogDescription>
              {isEditMode ? 'Update role information' : 'Create a new role for your organization'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="name">Role Name *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="e.g., manager, accountant"
                disabled={isEditMode} // Role names cannot be changed (would break existing assignments)
              />
              {errors.name && (
                <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
              )}
              {isEditMode && (
                <p className="text-sm text-muted-foreground mt-1">
                  Role names cannot be changed to maintain data integrity.
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                {...register('description')}
                placeholder="Describe what this role is for"
              />
              {errors.description && (
                <p className="text-sm text-destructive mt-1">{errors.description.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={createRole.isPending || updateRole.isPending}>
                {isEditMode ? 'Update' : 'Create'} Role
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the role &quot;{selectedRole?.name}&quot;? This action cannot be undone.
              <br />
              <br />
              <strong>Note:</strong> Roles that are assigned to users cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

