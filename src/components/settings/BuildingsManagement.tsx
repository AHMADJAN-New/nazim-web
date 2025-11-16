import { useState } from 'react';
import { useBuildings, useCreateBuilding, useUpdateBuilding, useDeleteBuilding } from '@/hooks/useBuildings';
import { useProfile, useIsSuperAdmin } from '@/hooks/useProfiles';
import { useHasPermission } from '@/hooks/usePermissions';
import { useOrganizations } from '@/hooks/useOrganizations';
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
import { Plus, Pencil, Trash2, Search, Building2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const buildingSchema = z.object({
  building_name: z.string().min(1, 'Building name is required').max(100, 'Building name must be 100 characters or less'),
});

type BuildingFormData = z.infer<typeof buildingSchema>;

export function BuildingsManagement() {
  const { t } = useLanguage();
  const { data: profile } = useProfile();
  const isSuperAdmin = useIsSuperAdmin();
  const hasCreatePermission = useHasPermission('buildings.create');
  const hasUpdatePermission = useHasPermission('buildings.update');
  const hasDeletePermission = useHasPermission('buildings.delete');
  const { data: organizations } = useOrganizations();
  const { data: buildings, isLoading } = useBuildings();
  const createBuilding = useCreateBuilding();
  const updateBuilding = useUpdateBuilding();
  const deleteBuilding = useDeleteBuilding();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BuildingFormData>({
    resolver: zodResolver(buildingSchema),
  });

  const filteredBuildings = buildings?.filter((building) =>
    building.building_name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleOpenDialog = (buildingId?: string) => {
    if (buildingId) {
      const building = buildings?.find((b) => b.id === buildingId);
      if (building) {
        reset({ building_name: building.building_name });
        setSelectedBuilding(buildingId);
      }
    } else {
      reset({ building_name: '' });
      setSelectedBuilding(null);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedBuilding(null);
    reset();
  };

  const onSubmit = (data: BuildingFormData) => {
    if (selectedBuilding) {
      updateBuilding.mutate(
        { id: selectedBuilding, ...data },
        {
          onSuccess: () => {
            handleCloseDialog();
          },
        }
      );
    } else {
      createBuilding.mutate(data, {
        onSuccess: () => {
          handleCloseDialog();
        },
      });
    }
  };

  const handleDeleteClick = (buildingId: string) => {
    setSelectedBuilding(buildingId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedBuilding) {
      deleteBuilding.mutate(selectedBuilding, {
        onSuccess: () => {
          setIsDeleteDialogOpen(false);
          setSelectedBuilding(null);
        },
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">Loading buildings...</div>
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
                Buildings Management
              </CardTitle>
              <CardDescription>Manage building names and information</CardDescription>
            </div>
            <Button 
              onClick={() => handleOpenDialog()}
              disabled={!hasCreatePermission}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Building
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search buildings..."
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
                  <TableHead>Building Name</TableHead>
                  {isSuperAdmin && <TableHead>Organization</TableHead>}
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBuildings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isSuperAdmin ? 4 : 3} className="text-center text-muted-foreground">
                      {searchQuery ? 'No buildings found matching your search' : 'No buildings found. Add your first building.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBuildings.map((building) => {
                    const org = isSuperAdmin && organizations?.find(o => o.id === building.organization_id);
                    return (
                      <TableRow key={building.id}>
                        <TableCell className="font-medium">{building.building_name}</TableCell>
                        {isSuperAdmin && (
                          <TableCell>
                            {org?.name || 'Unknown'}
                          </TableCell>
                        )}
                        <TableCell>
                          {new Date(building.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(building.id)}
                              disabled={!hasUpdatePermission}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(building.id)}
                              disabled={!hasDeletePermission}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
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
                {selectedBuilding ? 'Edit Building' : 'Add New Building'}
              </DialogTitle>
              <DialogDescription>
                {selectedBuilding
                  ? 'Update the building information below.'
                  : 'Enter the building name to add a new building.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="building_name">Building Name</Label>
                <Input
                  id="building_name"
                  {...register('building_name')}
                  placeholder="Enter building name"
                />
                {errors.building_name && (
                  <p className="text-sm text-destructive">{errors.building_name.message}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={createBuilding.isPending || updateBuilding.isPending}>
                {selectedBuilding ? 'Update' : 'Create'}
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
              This action cannot be undone. This will permanently delete the building
              {selectedBuilding &&
                buildings?.find((b) => b.id === selectedBuilding) &&
                ` "${buildings.find((b) => b.id === selectedBuilding)?.building_name}"`}
              . If this building has rooms assigned, the deletion will fail.
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

