import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';

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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';


import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { useForm, Controller } from 'react-hook-form';
import { useState, useMemo } from 'react';
import * as z from 'zod';

import { ReportExportButtons } from '@/components/reports/ReportExportButtons';
import { useExamTypes, useCreateExamType, useUpdateExamType, useDeleteExamType } from '@/hooks/useExamTypes';
import { useLanguage } from '@/hooks/useLanguage';
import { useHasPermission } from '@/hooks/usePermissions';
import { useProfile } from '@/hooks/useProfiles';
import type { ReportColumn } from '@/lib/reporting/serverReportTypes';
import type { ExamType } from '@/types/domain/examType';

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
  const { data: profile } = useProfile();
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
      <div className="container mx-auto p-4 md:p-6 max-w-7xl overflow-x-hidden">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>{t('events.title') || 'Exam Types'}</CardTitle>
              <CardDescription className="hidden md:block">
                {t('events.description') || 'Manage exam types for your organization'}
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
              {filteredExamTypes && filteredExamTypes.length > 0 && (
                <ReportExportButtons
                  data={filteredExamTypes}
                  columns={[
                    { key: 'name', label: t('events.name') || 'Name' },
                    { key: 'code', label: t('events.code') || 'Code' },
                    { key: 'description', label: t('events.description') || 'Description' },
                    { key: 'displayOrder', label: t('events.displayOrder') || 'Display Order' },
                    { key: 'isActive', label: t('examTypes.isActive') || 'Active' },
                  ]}
                  reportKey="exam_types"
                  title={t('events.title') || 'Exam Types Report'}
                  transformData={(data) => data.map((examType) => ({
                    name: examType.name || '',
                    code: examType.code || '',
                    description: examType.description || '',
                    displayOrder: examType.displayOrder || 0,
                    isActive: examType.isActive ? (t('events.active') || 'Active') : (t('events.inactive') || 'Inactive'),
                  }))}
                  buildFiltersSummary={() => {
                    const filters: string[] = [];
                    if (searchQuery) filters.push(`Search: ${searchQuery}`);
                    return filters.length > 0 ? filters.join(' | ') : '';
                  }}
                  schoolId={profile?.default_school_id}
                  templateType="exam_types"
                  disabled={!filteredExamTypes || filteredExamTypes.length === 0}
                />
              )}
              {hasCreate && (
                <Button onClick={() => setIsCreateDialogOpen(true)} className="w-full sm:w-auto">
                  <Plus className="h-4 w-4" />
                  <span className="ml-2">{t('events.create') || t('events.add') || 'Add'}</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('events.search') || 'Search...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
              <TableRow>
                <TableHead>{t('events.name') || 'Name'}</TableHead>
                <TableHead>{t('events.code') || 'Code'}</TableHead>
                <TableHead>{t('events.description') || 'Description'}</TableHead>
                <TableHead>{t('events.displayOrder') || 'Display Order'}</TableHead>
                <TableHead>{t('examTypes.isActive') || 'Active'}</TableHead>
                <TableHead className="text-right">{t('events.actions') || 'Actions'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExamTypes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    {t('events.noData') || 'No exam types found'}
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
                        {examType.isActive ? (t('events.active') || 'Active') : (t('events.inactive') || 'Inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5 sm:gap-2">
                        {hasUpdate && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(examType)}
                            className="flex-shrink-0"
                            aria-label={t('events.edit') || 'Edit'}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {hasDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(examType)}
                            className="flex-shrink-0"
                            aria-label={t('events.delete') || 'Delete'}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
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
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('events.create') || 'Create Exam Type'}</DialogTitle>
            <DialogDescription>
              {t('examTypes.createDescription') || 'Add a new exam type to your organization'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleCreate)}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('events.name') || 'Name'} *</Label>
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
                <Label htmlFor="code">{t('events.code') || 'Code'}</Label>
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
                <Label htmlFor="description">{t('events.description') || 'Description'}</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder={t('permissions.descriptionPlaceholder') || 'Optional description'}
                  rows={3}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="display_order">{t('events.displayOrder') || 'Display Order'}</Label>
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
                {t('events.cancel') || 'Cancel'}
              </Button>
              <Button type="submit" disabled={createExamType.isPending}>
                {createExamType.isPending ? (t('events.saving') || 'Saving...') : (t('events.save') || 'Save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('events.edit') || 'Edit Exam Type'}</DialogTitle>
            <DialogDescription>
              {t('examTypes.editDescription') || 'Update exam type details'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleEdit)}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">{t('events.name') || 'Name'} *</Label>
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
                <Label htmlFor="edit-code">{t('events.code') || 'Code'}</Label>
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
                <Label htmlFor="edit-description">{t('events.description') || 'Description'}</Label>
                <Textarea
                  id="edit-description"
                  {...register('description')}
                  placeholder={t('permissions.descriptionPlaceholder') || 'Optional description'}
                  rows={3}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-display_order">{t('events.displayOrder') || 'Display Order'}</Label>
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
                {t('events.cancel') || 'Cancel'}
              </Button>
              <Button type="submit" disabled={updateExamType.isPending}>
                {updateExamType.isPending ? (t('events.saving') || 'Saving...') : (t('events.save') || 'Save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('events.confirmDelete') || 'Confirm Delete'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('assets.deleteConfirm', { name: examTypeToDelete?.name }) ||
                `Are you sure you want to delete "${examTypeToDelete?.name}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setExamTypeToDelete(null)}>
              {t('events.cancel') || 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteExamType.isPending}
            >
              {deleteExamType.isPending ? (t('events.deleting') || 'Deleting...') : (t('events.delete') || 'Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

