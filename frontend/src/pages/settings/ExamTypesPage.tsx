import { useState, useMemo } from 'react';
import { useExamTypes, useCreateExamType, useUpdateExamType, useDeleteExamType } from '@/hooks/useExamTypes';
import type { ExamType } from '@/types/domain/examType';
import { useHasPermission } from '@/hooks/usePermissions';
import { useLanguage } from '@/hooks/useLanguage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const examTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  code: z.string().max(50, 'Code must be 50 characters or less').optional().nullable(),
  description: z.string().max(500, 'Description must be 500 characters or less').optional().nullable(),
  display_order: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
});

type ExamTypeFormData = z.infer<typeof examTypeSchema>;

export function ExamTypesPage() {
  const { t } = useLanguage();
  const { data: examTypes, isLoading } = useExamTypes();
  const createExamType = useCreateExamType();
  const updateExamType = useUpdateExamType();
  const deleteExamType = useDeleteExamType();

  const hasCreate = useHasPermission('exam_types.create');
  const hasUpdate = useHasPermission('exam_types.update');
  const hasDelete = useHasPermission('exam_types.delete');

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedExamType, setSelectedExamType] = useState<ExamType | null>(null);
  const [examTypeToDelete, setExamTypeToDelete] = useState<ExamType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ExamTypeFormData>({
    resolver: zodResolver(examTypeSchema),
    defaultValues: {
      name: '',
      code: null,
      description: null,
      display_order: 0,
      is_active: true,
    },
  });

  const filteredExamTypes = useMemo(() => {
    if (!examTypes) return [];
    return examTypes
      .filter(et => {
        const matchesSearch = et.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          et.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          et.description?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
      })
      .sort((a, b) => {
        // Sort by display_order first, then by name
        if (a.displayOrder !== b.displayOrder) {
          return a.displayOrder - b.displayOrder;
        }
        return a.name.localeCompare(b.name);
      });
  }, [examTypes, searchQuery]);

  const handleCreate = (data: ExamTypeFormData) => {
    createExamType.mutate(
      {
        name: data.name,
        code: data.code || null,
        description: data.description || null,
        displayOrder: data.display_order,
        isActive: data.is_active,
      },
      {
        onSuccess: () => {
          setIsCreateDialogOpen(false);
          reset();
        },
      }
    );
  };

  const handleEdit = (data: ExamTypeFormData) => {
    if (!selectedExamType) return;

    updateExamType.mutate(
      {
        id: selectedExamType.id,
        data: {
          name: data.name,
          code: data.code || null,
          description: data.description || null,
          displayOrder: data.display_order,
          isActive: data.is_active,
        },
      },
      {
        onSuccess: () => {
          setIsEditDialogOpen(false);
          setSelectedExamType(null);
          reset();
        },
      }
    );
  };

  const handleDelete = () => {
    if (!examTypeToDelete) return;

    deleteExamType.mutate(examTypeToDelete.id, {
      onSuccess: () => {
        setIsDeleteDialogOpen(false);
        setExamTypeToDelete(null);
      },
    });
  };

  const openEditDialog = (examType: ExamType) => {
    setSelectedExamType(examType);
    reset({
      name: examType.name,
      code: examType.code || null,
      description: examType.description || null,
      display_order: examType.displayOrder,
      is_active: examType.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (examType: ExamType) => {
    setExamTypeToDelete(examType);
    setIsDeleteDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('examTypes.title') || 'Exam Types'}</CardTitle>
              <CardDescription>
                {t('examTypes.description') || 'Manage exam types for your organization'}
              </CardDescription>
            </div>
            {hasCreate && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t('common.add') || 'Add'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('common.search') || 'Search...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('examTypes.name') || 'Name'}</TableHead>
                <TableHead>{t('examTypes.code') || 'Code'}</TableHead>
                <TableHead>{t('examTypes.description') || 'Description'}</TableHead>
                <TableHead>{t('examTypes.displayOrder') || 'Display Order'}</TableHead>
                <TableHead>{t('examTypes.isActive') || 'Active'}</TableHead>
                <TableHead className="text-right">{t('common.actions') || 'Actions'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExamTypes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    {t('common.noData') || 'No exam types found'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredExamTypes.map((examType) => (
                  <TableRow key={examType.id}>
                    <TableCell className="font-medium">{examType.name}</TableCell>
                    <TableCell>
                      {examType.code ? (
                        <Badge variant="outline">{examType.code}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-md truncate">
                      {examType.description || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>{examType.displayOrder}</TableCell>
                    <TableCell>
                      <Badge variant={examType.isActive ? 'default' : 'secondary'}>
                        {examType.isActive ? (t('common.active') || 'Active') : (t('common.inactive') || 'Inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {hasUpdate && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(examType)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {hasDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(examType)}
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
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('examTypes.create') || 'Create Exam Type'}</DialogTitle>
            <DialogDescription>
              {t('examTypes.createDescription') || 'Add a new exam type to your organization'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleCreate)}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('examTypes.name') || 'Name'} *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder={t('examTypes.namePlaceholder') || 'e.g., Monthly, Final, Mid-Term'}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">{t('examTypes.code') || 'Code'}</Label>
                <Input
                  id="code"
                  {...register('code')}
                  placeholder={t('examTypes.codePlaceholder') || 'e.g., MONTHLY, FINAL, MID'}
                />
                {errors.code && (
                  <p className="text-sm text-destructive">{errors.code.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t('examTypes.description') || 'Description'}</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder={t('examTypes.descriptionPlaceholder') || 'Optional description'}
                  rows={3}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="display_order">{t('examTypes.displayOrder') || 'Display Order'}</Label>
                <Input
                  id="display_order"
                  type="number"
                  {...register('display_order', { valueAsNumber: true })}
                  min={0}
                />
                {errors.display_order && (
                  <p className="text-sm text-destructive">{errors.display_order.message}</p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Controller
                  control={control}
                  name="is_active"
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="is_active">{t('examTypes.isActive') || 'Active'}</Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  reset();
                }}
              >
                {t('common.cancel') || 'Cancel'}
              </Button>
              <Button type="submit" disabled={createExamType.isPending}>
                {createExamType.isPending ? (t('common.saving') || 'Saving...') : (t('common.save') || 'Save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('examTypes.edit') || 'Edit Exam Type'}</DialogTitle>
            <DialogDescription>
              {t('examTypes.editDescription') || 'Update exam type details'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleEdit)}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">{t('examTypes.name') || 'Name'} *</Label>
                <Input
                  id="edit-name"
                  {...register('name')}
                  placeholder={t('examTypes.namePlaceholder') || 'e.g., Monthly, Final, Mid-Term'}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-code">{t('examTypes.code') || 'Code'}</Label>
                <Input
                  id="edit-code"
                  {...register('code')}
                  placeholder={t('examTypes.codePlaceholder') || 'e.g., MONTHLY, FINAL, MID'}
                />
                {errors.code && (
                  <p className="text-sm text-destructive">{errors.code.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">{t('examTypes.description') || 'Description'}</Label>
                <Textarea
                  id="edit-description"
                  {...register('description')}
                  placeholder={t('examTypes.descriptionPlaceholder') || 'Optional description'}
                  rows={3}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-display_order">{t('examTypes.displayOrder') || 'Display Order'}</Label>
                <Input
                  id="edit-display_order"
                  type="number"
                  {...register('display_order', { valueAsNumber: true })}
                  min={0}
                />
                {errors.display_order && (
                  <p className="text-sm text-destructive">{errors.display_order.message}</p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Controller
                  control={control}
                  name="is_active"
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="edit-is_active">{t('examTypes.isActive') || 'Active'}</Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setSelectedExamType(null);
                  reset();
                }}
              >
                {t('common.cancel') || 'Cancel'}
              </Button>
              <Button type="submit" disabled={updateExamType.isPending}>
                {updateExamType.isPending ? (t('common.saving') || 'Saving...') : (t('common.save') || 'Save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirmDelete') || 'Confirm Delete'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('examTypes.deleteConfirm', { name: examTypeToDelete?.name }) ||
                `Are you sure you want to delete "${examTypeToDelete?.name}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setExamTypeToDelete(null)}>
              {t('common.cancel') || 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteExamType.isPending}
            >
              {deleteExamType.isPending ? (t('common.deleting') || 'Deleting...') : (t('common.delete') || 'Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

