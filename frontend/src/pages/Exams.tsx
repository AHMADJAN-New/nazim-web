import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExams, useCreateExam, useUpdateExam, useDeleteExam, useUpdateExamStatus } from '@/hooks/useExams';
import { useAcademicYears, useCurrentAcademicYear } from '@/hooks/useAcademicYears';
import { useProfile } from '@/hooks/useProfiles';
import { useHasPermission } from '@/hooks/usePermissions';
import type { Exam, ExamStatus } from '@/types/domain/exam';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Trash2, Plus, Pencil, CheckCircle, Calendar, Settings, Users, 
  ClipboardList, FileText, Clock, MoreHorizontal, Search 
} from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const statusConfig: Record<ExamStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: 'Draft', variant: 'outline' },
  scheduled: { label: 'Scheduled', variant: 'secondary' },
  in_progress: { label: 'In Progress', variant: 'default' },
  completed: { label: 'Completed', variant: 'default' },
  archived: { label: 'Archived', variant: 'outline' },
};

const statusTransitions: Record<ExamStatus, ExamStatus[]> = {
  draft: ['scheduled'],
  scheduled: ['draft', 'in_progress'],
  in_progress: ['completed'],
  completed: ['archived'],
  archived: [],
};

export function Exams() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const organizationId = profile?.organization_id;

  const { data: academicYears } = useAcademicYears(organizationId);
  const { data: currentAcademicYear } = useCurrentAcademicYear(organizationId);
  const { data: exams, isLoading } = useExams(organizationId);
  const createExam = useCreateExam();
  const updateExam = useUpdateExam();
  const deleteExam = useDeleteExam();
  const updateExamStatus = useUpdateExamStatus();

  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [statusToChange, setStatusToChange] = useState<{ exam: Exam; newStatus: ExamStatus } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ExamStatus | 'all'>('all');
  const [formData, setFormData] = useState({
    name: '',
    academicYearId: '',
    description: '',
    startDate: '',
    endDate: '',
    status: 'draft' as ExamStatus,
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
  const hasManage = useHasPermission('exams.manage');
  const hasManageTimetable = useHasPermission('exams.manage_timetable');
  const hasEnrollStudents = useHasPermission('exams.enroll_students');
  const hasEnterMarks = useHasPermission('exams.enter_marks');
  const hasViewReports = useHasPermission('exams.view_reports');

  // Filter exams
  const filteredExams = useMemo(() => {
    if (!exams) return [];
    return exams.filter(exam => {
      const matchesSearch = exam.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exam.academicYear?.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || exam.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [exams, searchQuery, statusFilter]);

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
        status: formData.status,
      },
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

  const handleStatusChange = () => {
    if (!statusToChange) return;

    updateExamStatus.mutate(
      { examId: statusToChange.exam.id, status: statusToChange.newStatus },
      {
        onSuccess: () => {
          showToast.success(t('toast.examStatusUpdated') || 'Exam status updated');
          setIsStatusDialogOpen(false);
          setStatusToChange(null);
        },
        onError: (error: Error) => {
          showToast.error(error.message || t('toast.examStatusUpdateFailed') || 'Failed to update status');
        },
      }
    );
  };

  const resetForm = () => {
    setFormData({
      name: '',
      academicYearId: currentAcademicYear?.id || '',
      description: '',
      startDate: '',
      endDate: '',
      status: 'draft',
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
      status: exam.status,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (exam: Exam) => {
    setExamToDelete(exam);
    setIsDeleteDialogOpen(true);
  };

  const openStatusDialog = (exam: Exam, newStatus: ExamStatus) => {
    setStatusToChange({ exam, newStatus });
    setIsStatusDialogOpen(true);
  };

  const getStatusBadge = (status: ExamStatus) => {
    const config = statusConfig[status] || statusConfig.draft;
    return (
      <Badge variant={config.variant}>
        {t(`exams.status.${status}`) || config.label}
      </Badge>
    );
  };

  const canEditExam = (exam: Exam) => {
    return hasUpdate && ['draft', 'scheduled'].includes(exam.status);
  };

  const canDeleteExam = (exam: Exam) => {
    return hasDelete && exam.status === 'draft';
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

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('exams.searchPlaceholder') || 'Search exams...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ExamStatus | 'all')}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('exams.filterByStatus') || 'Filter by status'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all') || 'All'}</SelectItem>
                <SelectItem value="draft">{t('exams.status.draft') || 'Draft'}</SelectItem>
                <SelectItem value="scheduled">{t('exams.status.scheduled') || 'Scheduled'}</SelectItem>
                <SelectItem value="in_progress">{t('exams.status.in_progress') || 'In Progress'}</SelectItem>
                <SelectItem value="completed">{t('exams.status.completed') || 'Completed'}</SelectItem>
                <SelectItem value="archived">{t('exams.status.archived') || 'Archived'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

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
          ) : !filteredExams || filteredExams.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                {searchQuery || statusFilter !== 'all' 
                  ? (t('exams.noExamsFiltered') || 'No exams match your filters.')
                  : (t('exams.noExams') || 'No exams found. Create your first exam to get started.')}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('exams.name') || 'Name'}</TableHead>
                  <TableHead>{t('exams.academicYear') || 'Academic Year'}</TableHead>
                  <TableHead>{t('exams.status') || 'Status'}</TableHead>
                  <TableHead>{t('exams.period') || 'Period'}</TableHead>
                  <TableHead className="text-right">{t('common.actions') || 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExams.map((exam) => (
                  <TableRow key={exam.id}>
                    <TableCell className="font-medium">{exam.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{exam.academicYear?.name || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(exam.status)}</TableCell>
                    <TableCell>
                      {exam.startDate && exam.endDate ? (
                        <span className="text-sm">
                          {new Date(exam.startDate).toLocaleDateString()} - {new Date(exam.endDate).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>{t('common.actions') || 'Actions'}</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          
                          {/* Configuration Actions */}
                          {hasManage && (
                            <DropdownMenuItem onClick={() => navigate(`/exams/${exam.id}/classes-subjects`)}>
                              <Settings className="h-4 w-4 mr-2" />
                              {t('exams.classesSubjects') || 'Classes & Subjects'}
                            </DropdownMenuItem>
                          )}
                          {hasManageTimetable && (
                            <DropdownMenuItem onClick={() => navigate(`/exams/${exam.id}/timetable`)}>
                              <Clock className="h-4 w-4 mr-2" />
                              {t('exams.timetable') || 'Timetable'}
                            </DropdownMenuItem>
                          )}
                          {hasEnrollStudents && (
                            <DropdownMenuItem onClick={() => navigate(`/exams/${exam.id}/students`)}>
                              <Users className="h-4 w-4 mr-2" />
                              {t('exams.studentEnrollment') || 'Student Enrollment'}
                            </DropdownMenuItem>
                          )}
                          {hasEnterMarks && (
                            <DropdownMenuItem onClick={() => navigate(`/exams/${exam.id}/marks`)}>
                              <ClipboardList className="h-4 w-4 mr-2" />
                              {t('exams.marks') || 'Marks Entry'}
                            </DropdownMenuItem>
                          )}
                          {hasViewReports && (
                            <DropdownMenuItem onClick={() => navigate(`/exams/${exam.id}/reports`)}>
                              <FileText className="h-4 w-4 mr-2" />
                              {t('exams.reports') || 'Reports'}
                            </DropdownMenuItem>
                          )}
                          
                          <DropdownMenuSeparator />
                          
                          {/* Status Change Actions */}
                          {hasUpdate && statusTransitions[exam.status]?.length > 0 && (
                            <>
                              <DropdownMenuLabel>{t('exams.changeStatus') || 'Change Status'}</DropdownMenuLabel>
                              {statusTransitions[exam.status].map(newStatus => (
                                <DropdownMenuItem 
                                  key={newStatus}
                                  onClick={() => openStatusDialog(exam, newStatus)}
                                >
                                  {t(`exams.status.${newStatus}`) || statusConfig[newStatus].label}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuSeparator />
                            </>
                          )}
                          
                          {/* Edit/Delete Actions */}
                          {canEditExam(exam) && (
                            <DropdownMenuItem onClick={() => openEditDialog(exam)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              {t('common.edit') || 'Edit'}
                            </DropdownMenuItem>
                          )}
                          {canDeleteExam(exam) && (
                            <DropdownMenuItem 
                              onClick={() => openDeleteDialog(exam)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t('common.delete') || 'Delete'}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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

      {/* Status Change Dialog */}
      <AlertDialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('exams.changeStatusConfirm') || 'Change Exam Status'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('exams.changeStatusConfirmMessage') || 'Are you sure you want to change the status of this exam?'}
              {statusToChange && (
                <div className="mt-4 space-y-2">
                  <div className="font-medium">{statusToChange.exam.name}</div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(statusToChange.exam.status)}
                    <span>→</span>
                    {getStatusBadge(statusToChange.newStatus)}
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel') || 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleStatusChange} disabled={updateExamStatus.isPending}>
              {t('common.confirm') || 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

