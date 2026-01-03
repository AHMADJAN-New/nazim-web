import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Pencil, Trash2, Search, GraduationCap } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';

import * as z from 'zod';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';


import { useLanguage } from '@/hooks/useLanguage';


import { ReportExportButtons } from '@/components/reports/ReportExportButtons';
import { useHasPermission } from '@/hooks/usePermissions';
import { useProfile } from '@/hooks/useProfiles';
import { useResidencyTypes, useCreateResidencyType, useUpdateResidencyType, useDeleteResidencyType, type ResidencyType } from '@/hooks/useResidencyTypes';

const residencyTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  code: z.string().min(1, 'Code is required').max(50, 'Code must be 50 characters or less'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional().nullable(),
  is_active: z.boolean().default(true),
});

type ResidencyTypeFormData = z.infer<typeof residencyTypeSchema>;

export function ResidencyTypesManagement() {
  const { t } = useLanguage();
  const { data: profile } = useProfile();
  const hasCreatePermission = useHasPermission('residency_types.create');
  const hasUpdatePermission = useHasPermission('residency_types.update');
  const hasDeletePermission = useHasPermission('residency_types.delete');
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedResidencyType, setSelectedResidencyType] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: residencyTypes, isLoading } = useResidencyTypes(profile?.organization_id);
  const createResidencyType = useCreateResidencyType();
  const updateResidencyType = useUpdateResidencyType();
  const deleteResidencyType = useDeleteResidencyType();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ResidencyTypeFormData>({
    resolver: zodResolver(residencyTypeSchema),
    defaultValues: {
      is_active: true,
    },
  });

  const isActiveValue = watch('is_active');

  const filteredResidencyTypes = useMemo(() => {
    if (!residencyTypes) return [];
    const query = (searchQuery || '').toLowerCase();
    return residencyTypes.filter((type) =>
      type.name?.toLowerCase().includes(query) ||
      type.code?.toLowerCase().includes(query) ||
      (type.description && type.description.toLowerCase().includes(query))
    );
  }, [residencyTypes, searchQuery]);

  const handleOpenDialog = (residencyTypeId?: string) => {
    if (residencyTypeId) {
      const type = residencyTypes?.find((t) => t.id === residencyTypeId);
      if (type) {
        reset({
          name: type.name,
          code: type.code,
          description: type.description || '',
          is_active: type.is_active,
        });
        setSelectedResidencyType(residencyTypeId);
      }
    } else {
      reset({
        name: '',
        code: '',
        description: '',
        is_active: true,
      });
      setSelectedResidencyType(null);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedResidencyType(null);
    reset({
      name: '',
      code: '',
      description: '',
      is_active: true,
    });
  };

  const onSubmit = (data: ResidencyTypeFormData) => {
    if (selectedResidencyType) {
      updateResidencyType.mutate(
        { 
          id: selectedResidencyType, 
          ...data,
          organization_id: profile?.organization_id || null,
        },
        {
          onSuccess: () => {
            handleCloseDialog();
          },
        }
      );
    } else {
      createResidencyType.mutate({
        ...data,
        organization_id: profile?.organization_id || null,
      }, {
        onSuccess: () => {
          handleCloseDialog();
        },
      });
    }
  };

  const handleDeleteClick = (residencyTypeId: string) => {
    setSelectedResidencyType(residencyTypeId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedResidencyType) {
      deleteResidencyType.mutate(selectedResidencyType, {
        onSuccess: () => {
          setIsDeleteDialogOpen(false);
          setSelectedResidencyType(null);
        },
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6 max-w-7xl overflow-x-hidden">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">{t('common.loading')}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 hidden sm:inline-flex" />
                {t('academic.residencyTypes.management')}
              </CardTitle>
              <CardDescription className="hidden md:block">
                {t('academic.residencyTypes.title')}
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
              <ReportExportButtons
                data={filteredResidencyTypes}
                columns={[
                  { key: 'name', label: t('academic.residencyTypes.name') },
                  { key: 'code', label: t('academic.residencyTypes.code') },
                  { key: 'description', label: t('academic.residencyTypes.description') },
                  { key: 'isActive', label: t('academic.residencyTypes.isActive') },
                ]}
                reportKey="residency_types"
                title={t('academic.residencyTypes.management') || 'Residency Types Report'}
                transformData={(data) => data.map((type) => ({
                  name: type.name || '',
                  code: type.code || '',
                  description: type.description || '-',
                  isActive: type.is_active ? t('common.active') : t('common.inactive'),
                }))}
                buildFiltersSummary={() => {
                  if (searchQuery) return `Search: ${searchQuery}`;
                  return '';
                }}
                schoolId={profile?.default_school_id}
                templateType="residency_types"
                disabled={filteredResidencyTypes.length === 0}
              />
              {hasCreatePermission && (
                <Button onClick={() => handleOpenDialog()} className="w-full sm:w-auto">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline ml-2">{t('academic.residencyTypes.addResidencyType')}</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('academic.residencyTypes.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('academic.residencyTypes.name')}</TableHead>
                  <TableHead>{t('academic.residencyTypes.code')}</TableHead>
                  <TableHead>{t('academic.residencyTypes.description')}</TableHead>
                  <TableHead>{t('academic.residencyTypes.isActive')}</TableHead>
                  <TableHead className="text-right">{t('students.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResidencyTypes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      {searchQuery 
                        ? t('academic.residencyTypes.noResidencyTypesFound')
                        : t('academic.residencyTypes.noResidencyTypesMessage')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredResidencyTypes.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell className="font-medium">{type.name}</TableCell>
                      <TableCell>
                        <code className="px-2 py-1 bg-muted rounded text-sm">{type.code}</code>
                      </TableCell>
                      <TableCell className="max-w-md truncate">
                        {type.description || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={type.is_active ? 'default' : 'secondary'}>
                          {type.is_active ? t('academic.residencyTypes.active') : t('academic.residencyTypes.inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5 sm:gap-2">
                          {hasUpdatePermission && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(type.id)}
                              className="flex-shrink-0"
                              aria-label={t('academic.residencyTypes.editResidencyType')}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {hasDeletePermission && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(type.id)}
                              className="flex-shrink-0"
                              aria-label={t('common.delete')}
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

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>
                {selectedResidencyType 
                  ? t('academic.residencyTypes.editResidencyType')
                  : t('academic.residencyTypes.addResidencyType')}
              </DialogTitle>
              <DialogDescription>
                {selectedResidencyType
                  ? t('academic.residencyTypes.management')
                  : t('academic.residencyTypes.management')}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">
                  {t('academic.residencyTypes.name')} *
                </Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder={t('academic.residencyTypes.name')}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="code">
                  {t('academic.residencyTypes.code')} *
                </Label>
                <Input
                  id="code"
                  {...register('code')}
                  placeholder={t('academic.residencyTypes.code')}
                />
                {errors.code && (
                  <p className="text-sm text-destructive">{errors.code.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">
                  {t('academic.residencyTypes.description')}
                </Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder={t('academic.residencyTypes.description')}
                  rows={3}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description.message}</p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={isActiveValue}
                  onCheckedChange={(checked) => setValue('is_active', checked)}
                />
                <Label htmlFor="is_active" className="cursor-pointer">
                  {t('academic.residencyTypes.isActive')}
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                {t('common.cancel')}
              </Button>
              <Button type="submit">
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('academic.residencyTypes.deleteConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

