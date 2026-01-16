import { Trash2, Plus, Pencil, CheckCircle, XCircle } from 'lucide-react';
import { useState } from 'react';

import { ReportExportButtons } from '@/components/reports/ReportExportButtons';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { GradeFormData } from '@/types/domain/grade';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/hooks/useLanguage';
import { Switch } from '@/components/ui/switch';
import { useGrades, useCreateGrade, useUpdateGrade, useDeleteGrade } from '@/hooks/useGrades';
import { useHasPermission } from '@/hooks/usePermissions';
import { useProfile } from '@/hooks/useProfiles';

interface GradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gradeId?: string;
}

function GradeDialog({ open, onOpenChange, gradeId }: GradeDialogProps) {
  const { t } = useLanguage();
  const isEdit = Boolean(gradeId);
  const { data: grades } = useGrades();
  const grade = grades?.find(g => g.id === gradeId);

  const [formData, setFormData] = useState<GradeFormData>(() => ({
    nameEn: grade?.nameEn || '',
    nameAr: grade?.nameAr || '',
    namePs: grade?.namePs || '',
    nameFa: grade?.nameFa || '',
    minPercentage: grade?.minPercentage || 0,
    maxPercentage: grade?.maxPercentage || 0,
    order: grade?.order || 0,
    isPass: grade?.isPass ?? true,
  }));

  const createGrade = useCreateGrade();
  const updateGrade = useUpdateGrade();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (formData.minPercentage >= formData.maxPercentage) {
      return;
    }

    if (isEdit && gradeId) {
      await updateGrade.mutateAsync({ id: gradeId, data: formData });
    } else {
      await createGrade.mutateAsync(formData);
    }

    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      nameEn: '',
      nameAr: '',
      namePs: '',
      nameFa: '',
      minPercentage: 0,
      maxPercentage: 0,
      order: 0,
      isPass: true,
    });
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('events.edit') : t('events.create')}</DialogTitle>
          <DialogDescription>
            {isEdit ? t('grades.editDescription') : t('grades.createDescription')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Multi-language name fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nameEn">{t('grades.nameEn')}</Label>
                <Input
                  id="nameEn"
                  value={formData.nameEn}
                  onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                  placeholder={t('grades.nameEnPlaceholder')}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nameAr">{t('grades.nameAr')}</Label>
                <Input
                  id="nameAr"
                  value={formData.nameAr}
                  onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                  placeholder={t('grades.nameArPlaceholder')}
                  required
                  dir="rtl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="namePs">{t('grades.namePs')}</Label>
                <Input
                  id="namePs"
                  value={formData.namePs}
                  onChange={(e) => setFormData({ ...formData, namePs: e.target.value })}
                  placeholder={t('grades.namePsPlaceholder')}
                  required
                  dir="rtl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nameFa">{t('grades.nameFa')}</Label>
                <Input
                  id="nameFa"
                  value={formData.nameFa}
                  onChange={(e) => setFormData({ ...formData, nameFa: e.target.value })}
                  placeholder={t('grades.nameFaPlaceholder')}
                  required
                  dir="rtl"
                />
              </div>
            </div>

            {/* Percentage range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minPercentage">{t('attendance.minPercentage')}</Label>
                <Input
                  id="minPercentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.minPercentage}
                  onChange={(e) => setFormData({ ...formData, minPercentage: parseFloat(e.target.value) || 0 })}
                  placeholder={t('grades.minPercentagePlaceholder')}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxPercentage">{t('grades.maxPercentage')}</Label>
                <Input
                  id="maxPercentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.maxPercentage}
                  onChange={(e) => setFormData({ ...formData, maxPercentage: parseFloat(e.target.value) || 0 })}
                  placeholder={t('grades.maxPercentagePlaceholder')}
                  required
                />
              </div>
            </div>

            {/* Order and Pass/Fail toggle */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="order">{t('grades.order')}</Label>
                <Input
                  id="order"
                  type="number"
                  min="0"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                  placeholder={t('grades.orderPlaceholder')}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="isPass">{t('grades.isPass')}</Label>
                <div className="flex items-center space-x-2 h-10">
                  <Switch
                    id="isPass"
                    checked={formData.isPass}
                    onCheckedChange={(checked) => setFormData({ ...formData, isPass: checked })}
                  />
                  <span className="text-sm text-muted-foreground">
                    {formData.isPass ? t('grades.passingGrade') : t('grades.failingGrade')}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              {t('events.cancel')}
            </Button>
            <Button type="submit" disabled={createGrade.isPending || updateGrade.isPending}>
              {isEdit ? t('events.update') : t('events.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function GradesManagement() {
  const { t } = useLanguage();
  const { data: profile } = useProfile();
  const { data: grades, isLoading } = useGrades();
  const deleteGrade = useDeleteGrade();
  const canCreate = useHasPermission('grades.create');
  const canUpdate = useHasPermission('grades.update');
  const canDelete = useHasPermission('grades.delete');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGradeId, setEditingGradeId] = useState<string | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingGradeId, setDeletingGradeId] = useState<string | undefined>();

  const handleCreate = () => {
    setEditingGradeId(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (gradeId: string) => {
    setEditingGradeId(gradeId);
    setDialogOpen(true);
  };

  const handleDeleteClick = (gradeId: string) => {
    setDeletingGradeId(gradeId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (deletingGradeId) {
      await deleteGrade.mutateAsync(deletingGradeId);
      setDeleteDialogOpen(false);
      setDeletingGradeId(undefined);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>{t('nav.grades.management')}</CardTitle>
              <CardDescription className="hidden md:block">{t('grades.managementDescription')}</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
              {grades && grades.length > 0 && (
                <ReportExportButtons
                  data={grades}
                  columns={[
                    { key: 'nameEn', label: t('grades.nameEn') },
                    { key: 'nameAr', label: t('grades.nameAr') },
                    { key: 'namePs', label: t('grades.namePs') },
                    { key: 'nameFa', label: t('grades.nameFa') },
                    { key: 'percentageRange', label: t('grades.percentageRange') },
                    { key: 'order', label: t('grades.order') },
                    { key: 'isPass', label: t('grades.isPass') },
                  ]}
                  reportKey="grades"
                  title={t('nav.grades.management') || 'Grades Report'}
                  transformData={(data) => data.map((grade) => ({
                    nameEn: grade.nameEn || '',
                    nameAr: grade.nameAr || '',
                    namePs: grade.namePs || '',
                    nameFa: grade.nameFa || '',
                    percentageRange: `${grade.minPercentage}% - ${grade.maxPercentage}%`,
                    order: grade.order || 0,
                    isPass: grade.isPass ? t('grades.passingGrade') : t('grades.failingGrade'),
                  }))}
                  buildFiltersSummary={() => ''}
                  schoolId={profile?.default_school_id}
                  templateType="grades"
                  disabled={!grades || grades.length === 0}
                />
              )}
              {canCreate && (
                <Button onClick={handleCreate} className="w-full sm:w-auto">
                  <Plus className="h-4 w-4" />
                  <span className="ml-2">{t('events.create')}</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !grades || grades.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-2">{t('grades.noGrades')}</div>
              <div className="text-sm text-muted-foreground">{t('grades.noGradesDescription')}</div>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                <TableRow>
                  <TableHead>{t('grades.nameEn')}</TableHead>
                  <TableHead>{t('grades.nameAr')}</TableHead>
                  <TableHead>{t('grades.namePs')}</TableHead>
                  <TableHead>{t('grades.nameFa')}</TableHead>
                  <TableHead>{t('grades.percentageRange')}</TableHead>
                  <TableHead>{t('grades.order')}</TableHead>
                  <TableHead>{t('grades.isPass')}</TableHead>
                  <TableHead className="text-right">{t('events.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grades.map((grade) => (
                  <TableRow key={grade.id}>
                    <TableCell className="font-medium">{grade.nameEn}</TableCell>
                    <TableCell dir="rtl">{grade.nameAr}</TableCell>
                    <TableCell dir="rtl">{grade.namePs}</TableCell>
                    <TableCell dir="rtl">{grade.nameFa}</TableCell>
                    <TableCell>
                      {grade.minPercentage}% - {grade.maxPercentage}%
                    </TableCell>
                    <TableCell>{grade.order}</TableCell>
                    <TableCell>
                      {grade.isPass ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle className="h-3 w-3" />
                          {t('grades.passingGrade')}
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1">
                          <XCircle className="h-3 w-3" />
                          {t('grades.failingGrade')}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5 sm:gap-2">
                        {canUpdate && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(grade.id)}
                            className="flex-shrink-0"
                            aria-label={t('events.edit')}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(grade.id)}
                            className="flex-shrink-0"
                            aria-label={t('events.delete')}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
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

      <GradeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        gradeId={editingGradeId}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('assets.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('grades.deleteConfirmMessage')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('events.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('events.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
