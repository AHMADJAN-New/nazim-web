import { useState } from 'react';
import { useOrganizations, useCreateOrganization, useUpdateOrganization, useDeleteOrganization } from '@/hooks/useOrganizations';
import { useIsSuperAdmin } from '@/hooks/useProfiles';
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
import { Plus, Pencil, Trash2, Search, Building2, Shield } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useIsSuperAdmin as useIsSuperAdminHook } from '@/hooks/useProfiles';

const organizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(255, 'Organization name must be 255 characters or less'),
  slug: z.string()
    .min(1, 'Slug is required')
    .max(100, 'Slug must be 100 characters or less')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
});

type OrganizationFormData = z.infer<typeof organizationSchema>;

export function OrganizationsManagement() {
  const isSuperAdmin = useIsSuperAdminHook();
  const hasCreatePermission = useHasPermission('organizations.create');
  const hasUpdatePermission = useHasPermission('organizations.update');
  const hasDeletePermission = useHasPermission('organizations.delete');
  const { data: organizations, isLoading } = useOrganizations();
  const createOrganization = useCreateOrganization();
  const updateOrganization = useUpdateOrganization();
  const deleteOrganization = useDeleteOrganization();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
  });

  // Redirect if not super admin
  if (!isSuperAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-destructive">
              <Shield className="h-12 w-12 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
              <p>Only super administrators can manage organizations.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredOrganizations = organizations?.filter((org) =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.slug.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleOpenDialog = (orgId?: string) => {
    if (orgId) {
      const org = organizations?.find((o) => o.id === orgId);
      if (org) {
        reset({ name: org.name, slug: org.slug });
        setSelectedOrganization(orgId);
      }
    } else {
      reset({ name: '', slug: '' });
      setSelectedOrganization(null);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedOrganization(null);
    reset();
  };

  const onSubmit = (data: OrganizationFormData) => {
    if (selectedOrganization) {
      updateOrganization.mutate(
        { id: selectedOrganization, ...data },
        {
          onSuccess: () => {
            handleCloseDialog();
          },
        }
      );
    } else {
      createOrganization.mutate(data, {
        onSuccess: () => {
          handleCloseDialog();
        },
      });
    }
  };

  const handleDeleteClick = (orgId: string) => {
    setSelectedOrganization(orgId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedOrganization) {
      deleteOrganization.mutate(selectedOrganization, {
        onSuccess: () => {
          setIsDeleteDialogOpen(false);
          setSelectedOrganization(null);
        },
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">Loading organizations...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organizations Management
              </CardTitle>
              <CardDescription>Manage organizations for multi-tenant SaaS</CardDescription>
            </div>
            <Button 
              onClick={() => handleOpenDialog()}
              disabled={!hasCreatePermission}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Organization
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search organizations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrganizations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      {searchQuery ? 'No organizations found matching your search' : 'No organizations found. Add your first organization.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrganizations.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell className="font-medium">{org.name}</TableCell>
                      <TableCell>
                        <code className="text-sm bg-muted px-2 py-1 rounded">{org.slug}</code>
                      </TableCell>
                      <TableCell>
                        {new Date(org.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(org.id)}
                            disabled={!hasUpdatePermission}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(org.id)}
                            disabled={!hasDeletePermission}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>
                {selectedOrganization ? 'Edit Organization' : 'Add New Organization'}
              </DialogTitle>
              <DialogDescription>
                {selectedOrganization
                  ? 'Update the organization information below.'
                  : 'Enter the organization details to add a new organization.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Organization Name</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="Enter organization name"
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  {...register('slug')}
                  placeholder="organization-slug"
                />
                {errors.slug && (
                  <p className="text-sm text-destructive">{errors.slug.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  URL-friendly identifier (lowercase letters, numbers, and hyphens only)
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={createOrganization.isPending || updateOrganization.isPending}>
                {selectedOrganization ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the organization
              {selectedOrganization &&
                organizations?.find((o) => o.id === selectedOrganization) &&
                ` "${organizations.find((o) => o.id === selectedOrganization)?.name}"`}
              . If this organization has users or data, the deletion will fail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

