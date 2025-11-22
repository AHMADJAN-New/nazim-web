import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCostCenters, useCreateCostCenter, useUpdateCostCenter, useDeleteCostCenter } from '@/hooks/finance/useFinancialLookups';
import { useProfile } from '@/hooks/useProfiles';
import { useHasPermission } from '@/hooks/usePermissions';
import { costCenterSchema } from '@/lib/finance/schemas';
import type { CostCenter } from '@/types/finance';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Plus, Pencil, Trash2, Search, Building2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

type CostCenterFormData = z.infer<typeof costCenterSchema>;

export function CostCentersPage() {
  const { t } = useLanguage();
  const { data: profile } = useProfile();
  const hasCreatePermission = useHasPermission('finance.cost_centers.create');
  const hasUpdatePermission = useHasPermission('finance.cost_centers.update');
  const hasDeletePermission = useHasPermission('finance.cost_centers.delete');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCostCenter, setSelectedCostCenter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [parentId, setParentId] = useState<string>('');

  const { data: costCenters, isLoading } = useCostCenters();
  const createCostCenter = useCreateCostCenter();
  const updateCostCenter = useUpdateCostCenter();
  const deleteCostCenter = useDeleteCostCenter();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CostCenterFormData>({
    resolver: zodResolver(costCenterSchema),
    defaultValues: {
      is_active: true,
      sort_order: 100,
    },
  });

  const isActiveValue = watch('is_active');

  const filteredCostCenters = useMemo(() => {
    if (!costCenters) return [];
    return costCenters.filter((cc) =>
      cc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cc.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cc.description && cc.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [costCenters, searchQuery]);

  const availableParents = useMemo(() => {
    if (!costCenters) return [];
    // Don't show the current cost center as a parent option (to avoid circular reference)
    return costCenters.filter(cc => cc.id !== selectedCostCenter);
  }, [costCenters, selectedCostCenter]);

  const handleOpenDialog = (costCenterId?: string) => {
    if (costCenterId) {
      const cc = costCenters?.find((c) => c.id === costCenterId);
      if (cc) {
        reset({
          code: cc.code,
          name: cc.name,
          description: cc.description || '',
          parent_id: cc.parent_id || undefined,
          manager_id: cc.manager_id || undefined,
          is_active: cc.is_active,
          sort_order: cc.sort_order,
        });
        setParentId(cc.parent_id || '');
        setSelectedCostCenter(costCenterId);
      }
    } else {
      reset({
        code: '',
        name: '',
        description: '',
        parent_id: undefined,
        manager_id: undefined,
        is_active: true,
        sort_order: 100,
      });
      setParentId('');
      setSelectedCostCenter(null);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedCostCenter(null);
    setParentId('');
    reset();
  };

  const onSubmit = (data: CostCenterFormData) => {
    const submitData = {
      ...data,
      parent_id: parentId || null,
    };

    if (selectedCostCenter) {
      updateCostCenter.mutate(
        { id: selectedCostCenter, ...submitData },
        {
          onSuccess: () => {
            handleCloseDialog();
          },
        }
      );
    } else {
      createCostCenter.mutate(submitData, {
        onSuccess: () => {
          handleCloseDialog();
        },
      });
    }
  };

  const handleDelete = () => {
    if (selectedCostCenter) {
      deleteCostCenter.mutate(selectedCostCenter, {
        onSuccess: () => {
          setIsDeleteDialogOpen(false);
          setSelectedCostCenter(null);
        },
      });
    }
  };

  const getParentName = (parentId: string | null) => {
    if (!parentId || !costCenters) return null;
    const parent = costCenters.find(cc => cc.id === parentId);
    return parent?.name;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Cost Centers
              </CardTitle>
              <CardDescription>
                Manage cost centers for tracking expenses by department or function
              </CardDescription>
            </div>
            {hasCreatePermission && (
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Cost Center
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search cost centers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredCostCenters.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No cost centers found matching your search.' : 'No cost centers found. Add one to get started.'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Parent</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCostCenters.map((cc) => (
                    <TableRow key={cc.id}>
                      <TableCell className="font-mono font-medium">{cc.code}</TableCell>
                      <TableCell>{cc.name}</TableCell>
                      <TableCell>
                        {getParentName(cc.parent_id) ? (
                          <Badge variant="outline">{getParentName(cc.parent_id)}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{cc.description || '-'}</TableCell>
                      <TableCell>
                        {cc.is_active ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {hasUpdatePermission && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(cc.id)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {hasDeletePermission && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedCostCenter(cc.id);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedCostCenter ? 'Edit Cost Center' : 'Add Cost Center'}
            </DialogTitle>
            <DialogDescription>
              {selectedCostCenter
                ? 'Update the cost center details below.'
                : 'Fill in the details to create a new cost center.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Code *</Label>
                <Input
                  id="code"
                  {...register('code')}
                  placeholder="ADMIN"
                  maxLength={50}
                />
                {errors.code && (
                  <p className="text-sm text-destructive">{errors.code.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="Administration"
                  maxLength={150}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="parent_id">Parent Cost Center</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select parent (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {availableParents.map((parent) => (
                    <SelectItem key={parent.id} value={parent.id}>
                      {parent.code} - {parent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Optional description"
                rows={3}
                maxLength={500}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sort_order">Sort Order</Label>
              <Input
                id="sort_order"
                type="number"
                min="0"
                {...register('sort_order', { valueAsNumber: true })}
              />
              {errors.sort_order && (
                <p className="text-sm text-destructive">{errors.sort_order.message}</p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={isActiveValue}
                onCheckedChange={(checked) => setValue('is_active', checked)}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createCostCenter.isPending || updateCostCenter.isPending}
              >
                {selectedCostCenter ? 'Update' : 'Create'}
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
              This will delete the cost center. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedCostCenter(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
