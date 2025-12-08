import { useState, useEffect } from 'react';
import { useExams, useCreateExam, useUpdateExam, useDeleteExam } from '@/hooks/useExams';
import { useAcademicYears, useCurrentAcademicYear } from '@/hooks/useAcademicYears';
import { useProfile } from '@/hooks/useProfiles';
import { useHasPermission } from '@/hooks/usePermissions';
import type { Exam } from '@/types/domain/exam';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Pencil, CheckCircle, Calendar, Settings } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/hooks/useLanguage';
import { showToast } from '@/lib/toast';
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

export function Exams() {
  const { t } = useLanguage();
  const { data: profile } = useProfile();
  const organizationId = profile?.organization_id;

  const { data: academicYears } = useAcademicYears(organizationId);
  const { data: currentAcademicYear } = useCurrentAcademicYear(organizationId);
  const { data: exams, isLoading } = useExams(organizationId);
  const createExam = useCreateExam();
  const updateExam = useUpdateExam();
  const deleteExam = useDeleteExam();

  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [examToConfig, setExamToConfig] = useState<Exam | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    academicYearId: '',
    description: '',
    startDate: '',
    endDate: '',
  });

  // Set default academic year to current when it's available
  useEffect(() => {
    if (currentAcademicYear && !formData.academicYearId && !selectedExam && !isCreateDialogOpen && !isEditDialogOpen) {
      setFormData(prev => ({
        ...prev,
        academicYearId: currentAcademicYear.id,
      }));
    }
  }, [currentAcademicYear?.id, selectedExam?.id, isCreateDialogOpen, isEditDialogOpen]);

  const hasCreate = useHasPermission('exams.create');
  const hasUpdate = useHasPermission('exams.update');
  const hasDelete = useHasPermission('exams.delete');

  const handleCreate = () => {
    if (!formData.name || !formData.academicYearId) {
      showToast.error(t('forms.required') || 'Please fill in all required fields');
      return;
    }

    createExam.mutate(
      {
        name: formData.name,
        academicYearId: formData.academicYearId,
        description: formData.description || undefined,
        startDate: formData.startDate ? new Date(formData.startDate) : undefined,
        endDate: formData.endDate ? new Date(formData.endDate) : undefined,
      } as Parameters<typeof createExam.mutate>[0],
      {
        onSuccess: () => {
          showToast.success(t('toast.examCreated') || 'Exam created successfully');
          setIsCreateDialogOpen(false);
          resetForm();
        },
        onError: (error: Error) => {
          showToast.error(error.message || t('toast.examCreateFailed') || 'Failed to create exam');
        },
      }
    );
  };

  const handleUpdate = () => {
    if (!selectedExam || !formData.name || !formData.academicYearId) {
      showToast.error(t('forms.required') || 'Please fill in all required fields');
      return;
    }

    updateExam.mutate(
      {
        id: selectedExam.id,
        data: {
          name: formData.name,
          academicYearId: formData.academicYearId,
          description: formData.description || undefined,
          startDate: formData.startDate ? new Date(formData.startDate) : undefined,
          endDate: formData.endDate ? new Date(formData.endDate) : undefined,
        },
      },
      {
        onSuccess: () => {
          showToast.success(t('toast.examUpdated') || 'Exam updated successfully');
          setIsEditDialogOpen(false);
          setSelectedExam(null);
          resetForm();
        },
        onError: (error: Error) => {
          showToast.error(error.message || t('toast.examUpdateFailed') || 'Failed to update exam');
        },
      }
    );
  };

  const handleDelete = () => {
    if (!examToDelete) return;

    deleteExam.mutate(examToDelete.id, {
      onSuccess: () => {
        showToast.success(t('toast.examDeleted') || 'Exam deleted successfully');
        setIsDeleteDialogOpen(false);
        setExamToDelete(null);
        if (selectedExam?.id === examToDelete.id) {
          setSelectedExam(null);
        }
      },
      onError: (error: Error) => {
        showToast.error(error.message || t('toast.examDeleteFailed') || 'Failed to delete exam');
      },
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      academicYearId: currentAcademicYear?.id || '',
      description: '',
      startDate: '',
      endDate: '',
    });
    setSelectedExam(null);
  };

  const openEditDialog = (exam: Exam) => {
    setSelectedExam(exam);
    setFormData({
      name: exam.name,
      academicYearId: exam.academicYearId,
      description: exam.description || '',
      startDate: exam.startDate ? new Date(exam.startDate).toISOString().slice(0, 10) : '',
      endDate: exam.endDate ? new Date(exam.endDate).toISOString().slice(0, 10) : '',
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (exam: Exam) => {
    setExamToDelete(exam);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t('exams') || 'Exams'}</h1>
          <p className="text-sm text-muted-foreground">
            {t('exams.management') || 'Create and manage exams for academic years'}
          </p>
        </div>
        {hasCreate && (
          <Button onClick={() => {
            // Set default academic year when opening create dialog
            setFormData(prev => ({
              ...prev,
              academicYearId: currentAcademicYear?.id || prev.academicYearId,
            }));
            setIsCreateDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            {t('exams.create') || 'Create Exam'}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('exams.list') || 'Exams List'}</CardTitle>
          <CardDescription>
            {t('exams.listDescription') || 'View and manage all exams'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="w-full h-32" />
          ) : !exams || exams.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                {t('exams.noExams') || 'No exams found. Create your first exam to get started.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('exams.name') || 'Name'}</TableHead>
                  <TableHead>{t('exams.academicYear') || 'Academic Year'}</TableHead>
                  <TableHead>{t('exams.startDate') || 'Start Date'}</TableHead>
                  <TableHead>{t('exams.endDate') || 'End Date'}</TableHead>
                  <TableHead>{t('exams.description') || 'Description'}</TableHead>
                  <TableHead className="text-right">{t('common.actions') || 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exams.map((exam) => (
                  <TableRow key={exam.id}>
                    <TableCell className="font-medium">{exam.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{exam.academicYear?.name || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell>
                      {exam.startDate ? new Date(exam.startDate).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell>
                      {exam.endDate ? new Date(exam.endDate).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {exam.description || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {hasUpdate && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setExamToConfig(exam);
                                setFormData({
                                  name: exam.name,
                                  academicYearId: exam.academicYearId,
                                  description: exam.description || '',
                                  startDate: exam.startDate ? new Date(exam.startDate).toISOString().slice(0, 10) : '',
                                  endDate: exam.endDate ? new Date(exam.endDate).toISOString().slice(0, 10) : '',
                                });
                                setIsConfigDialogOpen(true);
                              }}
                            >
                              <Settings className="h-4 w-4 mr-1" />
                              {t('exams.configure') || 'Configure'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(exam)}
                            >
                              <Pencil className="h-4 w-4 mr-1" />
                              {t('common.edit') || 'Edit'}
                            </Button>
                          </>
                        )}
                        {hasDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(exam)}
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
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('exams.create') || 'Create Exam'}</DialogTitle>
            <DialogDescription>
              {t('exams.createDescription') || 'Create a new exam for an academic year'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="create-name">{t('exams.name') || 'Name'} *</Label>
              <Input
                id="create-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('exams.namePlaceholder') || 'e.g., Midterm Exam'}
              />
            </div>
            <div>
              <Label htmlFor="create-academic-year">{t('exams.academicYear') || 'Academic Year'} *</Label>
              <Select
                value={formData.academicYearId}
                onValueChange={(value) => setFormData({ ...formData, academicYearId: value })}
              >
                <SelectTrigger id="create-academic-year">
                  <SelectValue placeholder={t('exams.selectAcademicYear') || 'Select academic year'} />
                </SelectTrigger>
                <SelectContent>
                  {(academicYears || []).map((year) => (
                    <SelectItem key={year.id} value={year.id}>
                      {year.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="create-description">{t('exams.description') || 'Description'}</Label>
              <Textarea
                id="create-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('exams.descriptionPlaceholder') || 'Optional description'}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="create-start-date">{t('exams.startDate') || 'Start Date'}</Label>
                <Input
                  id="create-start-date"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="create-end-date">{t('exams.endDate') || 'End Date'}</Label>
                <Input
                  id="create-end-date"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  min={formData.startDate || undefined}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); resetForm(); }}>
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button onClick={handleCreate} disabled={createExam.isPending}>
              <CheckCircle className="h-4 w-4 mr-2" />
              {t('common.create') || 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('exams.edit') || 'Edit Exam'}</DialogTitle>
            <DialogDescription>
              {t('exams.editDescription') || 'Update exam details'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">{t('exams.name') || 'Name'} *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('exams.namePlaceholder') || 'e.g., Midterm Exam'}
              />
            </div>
            <div>
              <Label htmlFor="edit-academic-year">{t('exams.academicYear') || 'Academic Year'} *</Label>
              <Select
                value={formData.academicYearId}
                onValueChange={(value) => setFormData({ ...formData, academicYearId: value })}
              >
                <SelectTrigger id="edit-academic-year">
                  <SelectValue placeholder={t('exams.selectAcademicYear') || 'Select academic year'} />
                </SelectTrigger>
                <SelectContent>
                  {(academicYears || []).map((year) => (
                    <SelectItem key={year.id} value={year.id}>
                      {year.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-description">{t('exams.description') || 'Description'}</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('exams.descriptionPlaceholder') || 'Optional description'}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-start-date">{t('exams.startDate') || 'Start Date'}</Label>
                <Input
                  id="edit-start-date"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-end-date">{t('exams.endDate') || 'End Date'}</Label>
                <Input
                  id="edit-end-date"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  min={formData.startDate || undefined}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); resetForm(); }}>
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button onClick={handleUpdate} disabled={updateExam.isPending}>
              <CheckCircle className="h-4 w-4 mr-2" />
              {t('common.update') || 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Configure & Schedule Dialog */}
      <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {t('exams.configureAndSchedule') || 'Configure & Schedule Exam'}
            </DialogTitle>
            <DialogDescription>
              {t('exams.configureAndScheduleDescription') || 'Set exam dates, duration, and scheduling details'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {examToConfig && (
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm font-medium">{t('exams.exam') || 'Exam'}: {examToConfig.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('exams.academicYear') || 'Academic Year'}: {examToConfig.academicYear?.name || 'N/A'}
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="config-start-date">{t('exams.startDate') || 'Start Date'} *</Label>
                <Input
                  id="config-start-date"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('exams.startDateHint') || 'When the exam period begins'}
                </p>
              </div>
              <div>
                <Label htmlFor="config-end-date">{t('exams.endDate') || 'End Date'} *</Label>
                <Input
                  id="config-end-date"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  min={formData.startDate || undefined}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('exams.endDateHint') || 'When the exam period ends'}
                </p>
              </div>
            </div>
            {formData.startDate && formData.endDate && (
              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {t('exams.examDuration') || 'Exam Duration'}
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  {(() => {
                    const start = new Date(formData.startDate);
                    const end = new Date(formData.endDate);
                    const diffTime = Math.abs(end.getTime() - start.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                    return `${diffDays} ${diffDays === 1 ? t('exams.day') || 'day' : t('exams.days') || 'days'}`;
                  })()}
                </p>
              </div>
            )}
            <div>
              <Label htmlFor="config-description">{t('exams.scheduleNotes') || 'Schedule Notes'}</Label>
              <Textarea
                id="config-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('exams.scheduleNotesPlaceholder') || 'Add any additional notes about the exam schedule...'}
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsConfigDialogOpen(false); setExamToConfig(null); }}>
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button onClick={() => {
              if (!examToConfig || !formData.startDate || !formData.endDate) {
                showToast.error(t('forms.required') || 'Please fill in all required fields');
                return;
              }
              updateExam.mutate(
                {
                  id: examToConfig.id,
                  data: {
                    name: examToConfig.name,
                    academicYearId: examToConfig.academicYearId,
                    description: formData.description || undefined,
                    startDate: new Date(formData.startDate),
                    endDate: new Date(formData.endDate),
                  },
                },
                {
                  onSuccess: () => {
                    showToast.success(t('toast.examUpdated') || 'Exam scheduled successfully');
                    setIsConfigDialogOpen(false);
                    setExamToConfig(null);
                  },
                  onError: (error: Error) => {
                    showToast.error(error.message || t('toast.examUpdateFailed') || 'Failed to schedule exam');
                  },
                }
              );
            }} disabled={updateExam.isPending}>
              <CheckCircle className="h-4 w-4 mr-2" />
              {t('exams.saveSchedule') || 'Save Schedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('exams.deleteConfirm') || 'Delete Exam'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('exams.deleteConfirmMessage') || 'Are you sure you want to delete this exam? This action cannot be undone.'}
              {examToDelete && (
                <span className="block mt-2 font-semibold">{examToDelete.name}</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel') || 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {t('common.delete') || 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

