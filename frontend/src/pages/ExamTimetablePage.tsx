import { useState, useMemo, useEffect } from 'react';
import { formatDate, formatDateTime } from '@/lib/utils';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  useExam, useExamClasses, useExamSubjects, useExamTimes,
  useCreateExamTime, useUpdateExamTime, useDeleteExamTime, useToggleExamTimeLock,
  useExams, useLatestExamFromCurrentYear
} from '@/hooks/useExams';
import { useRooms } from '@/hooks/useRooms';
import { useStaff } from '@/hooks/useStaff';
import { useProfile } from '@/hooks/useProfiles';
import { useHasPermission } from '@/hooks/usePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, Plus, Trash2, Clock, Calendar as CalendarIcon, Lock, Unlock,
  Pencil, MapPin, User
} from 'lucide-react';
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
import type { ExamTime, ExamClass, ExamSubject } from '@/types/domain/exam';

export function ExamTimetablePage() {
  const { t } = useLanguage();
  const { examId: examIdFromParams } = useParams<{ examId?: string }>();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const organizationId = profile?.organization_id;

  // State for exam selection (when accessed individually)
  const [selectedExamId, setSelectedExamId] = useState<string | undefined>(undefined);

  // Determine which exam ID to use: from params (when accessed from exam page) or selected (when accessed individually)
  const examId = examIdFromParams || selectedExamId || undefined;

  // Fetch all exams for selector (only when accessed individually)
  const { data: allExams, isLoading: examsLoading } = useExams(organizationId);
  const latestExam = useLatestExamFromCurrentYear(organizationId);

  // Set exam from URL params (when accessed from exams page)
  useEffect(() => {
    if (examIdFromParams) {
      // Clear selectedExamId when URL has examId (use URL examId instead)
      setSelectedExamId(undefined);
    }
  }, [examIdFromParams]);

  // Auto-select latest exam from current academic year (only when accessed individually, no URL examId)
  useEffect(() => {
    if (!examIdFromParams && !selectedExamId) {
      if (latestExam) {
        setSelectedExamId(latestExam.id);
      } else if (allExams && allExams.length > 0) {
        // Fallback to first exam if no current year exam
        setSelectedExamId(allExams[0].id);
      }
    }
  }, [allExams, latestExam, selectedExamId, examIdFromParams]);

  // Data hooks
  const { data: exam, isLoading: examLoading } = useExam(examId);
  const { data: examClasses } = useExamClasses(examId);
  const { data: examSubjects } = useExamSubjects(examId);
  const { data: examTimes, isLoading: timesLoading } = useExamTimes(examId);
  const { data: rooms } = useRooms(organizationId);
  const { data: staff } = useStaff(organizationId);

  // Mutations
  const createExamTime = useCreateExamTime();
  const updateExamTime = useUpdateExamTime();
  const deleteExamTime = useDeleteExamTime();
  const toggleLock = useToggleExamTimeLock();

  // Permissions
  const hasManageTimetable = useHasPermission('exams.manage_timetable');

  // State
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [timeToEdit, setTimeToEdit] = useState<ExamTime | null>(null);
  const [timeToDelete, setTimeToDelete] = useState<ExamTime | null>(null);
  const [formData, setFormData] = useState({
    examClassId: '',
    examSubjectId: '',
    date: '',
    startTime: '',
    endTime: '',
    roomId: '',
    invigilatorId: '',
    notes: '',
  });

  // Get subjects for selected class in form
  const subjectsForSelectedClass = useMemo(() => {
    if (!formData.examClassId || !examSubjects) return [];
    return examSubjects.filter(es => es.examClassId === formData.examClassId);
  }, [formData.examClassId, examSubjects]);

  // Filter exam times
  const filteredExamTimes = useMemo(() => {
    if (!examTimes) return [];
    return examTimes.filter(et => {
      const matchesClass = selectedClassFilter === 'all' || et.examClassId === selectedClassFilter;
      const matchesDate = !selectedDateFilter || 
        new Date(et.date).toISOString().slice(0, 10) === selectedDateFilter;
      return matchesClass && matchesDate;
    }).sort((a, b) => {
      // Sort by date, then by start time
      const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.localeCompare(b.startTime);
    });
  }, [examTimes, selectedClassFilter, selectedDateFilter]);

  // Group exam times by date
  const groupedByDate = useMemo(() => {
    const groups: Record<string, ExamTime[]> = {};
    filteredExamTimes.forEach(et => {
      const dateKey = new Date(et.date).toISOString().slice(0, 10);
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(et);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredExamTimes]);

  // Get class name from exam class
  const getClassName = (examClassId: string) => {
    const examClass = examClasses?.find(ec => ec.id === examClassId);
    if (!examClass?.classAcademicYear) return 'Class';
    const className = examClass.classAcademicYear.class?.name || 'Class';
    return examClass.classAcademicYear.sectionName 
      ? `${className} - ${examClass.classAcademicYear.sectionName}`
      : className;
  };

  // Get subject name from exam subject
  const getSubjectName = (examSubjectId: string) => {
    const examSubject = examSubjects?.find(es => es.id === examSubjectId);
    return examSubject?.subject?.name || 'Subject';
  };

  const resetForm = () => {
    setFormData({
      examClassId: '',
      examSubjectId: '',
      date: '',
      startTime: '',
      endTime: '',
      roomId: 'none',
      invigilatorId: 'none',
      notes: '',
    });
  };

  const handleCreate = () => {
    if (!examId || !formData.examClassId || !formData.examSubjectId || !formData.date || !formData.startTime || !formData.endTime) {
      showToast.error(t('forms.required') || 'Please fill in all required fields');
      return;
    }

    if (formData.startTime >= formData.endTime) {
      showToast.error(t('exams.invalidTimeRange') || 'End time must be after start time');
      return;
    }

    createExamTime.mutate(
      {
        examId,
        data: {
          examClassId: formData.examClassId,
          examSubjectId: formData.examSubjectId,
          date: new Date(formData.date),
          startTime: formData.startTime,
          endTime: formData.endTime,
          roomId: formData.roomId && formData.roomId !== 'none' ? formData.roomId : null,
          invigilatorId: formData.invigilatorId && formData.invigilatorId !== 'none' ? formData.invigilatorId : null,
          notes: formData.notes || null,
        },
      },
      {
        onSuccess: () => {
          showToast.success(t('toast.examTimeCreated') || 'Time slot created');
          setIsCreateDialogOpen(false);
          resetForm();
        },
        onError: (error: Error) => {
          showToast.error(error.message || t('toast.examTimeCreateFailed') || 'Failed to create time slot');
        },
      }
    );
  };

  const handleUpdate = () => {
    if (!timeToEdit || !formData.date || !formData.startTime || !formData.endTime) {
      showToast.error(t('forms.required') || 'Please fill in all required fields');
      return;
    }

    if (formData.startTime >= formData.endTime) {
      showToast.error(t('exams.invalidTimeRange') || 'End time must be after start time');
      return;
    }

    updateExamTime.mutate(
      {
        id: timeToEdit.id,
        data: {
          date: new Date(formData.date),
          startTime: formData.startTime,
          endTime: formData.endTime,
          roomId: formData.roomId && formData.roomId !== 'none' ? formData.roomId : null,
          invigilatorId: formData.invigilatorId && formData.invigilatorId !== 'none' ? formData.invigilatorId : null,
          notes: formData.notes || null,
        },
      },
      {
        onSuccess: () => {
          showToast.success(t('toast.examTimeUpdated') || 'Time slot updated');
          setIsEditDialogOpen(false);
          setTimeToEdit(null);
          resetForm();
        },
        onError: (error: Error) => {
          showToast.error(error.message || t('toast.examTimeUpdateFailed') || 'Failed to update time slot');
        },
      }
    );
  };

  const handleDelete = () => {
    if (!timeToDelete) return;

    deleteExamTime.mutate(timeToDelete.id, {
      onSuccess: () => {
        showToast.success(t('toast.examTimeDeleted') || 'Time slot deleted');
        setIsDeleteDialogOpen(false);
        setTimeToDelete(null);
      },
      onError: (error: Error) => {
        showToast.error(error.message || t('toast.examTimeDeleteFailed') || 'Failed to delete time slot');
      },
    });
  };

  const handleToggleLock = (examTime: ExamTime) => {
    toggleLock.mutate(examTime.id, {
      onSuccess: () => {
        showToast.success(
          examTime.isLocked 
            ? (t('toast.examTimeUnlocked') || 'Time slot unlocked')
            : (t('toast.examTimeLocked') || 'Time slot locked')
        );
      },
      onError: (error: Error) => {
        showToast.error(error.message || t('toast.examTimeLockToggleFailed') || 'Failed to toggle lock');
      },
    });
  };

  const openEditDialog = (examTime: ExamTime) => {
    setTimeToEdit(examTime);
    setFormData({
      examClassId: examTime.examClassId,
      examSubjectId: examTime.examSubjectId,
      date: new Date(examTime.date).toISOString().slice(0, 10),
      startTime: examTime.startTime,
      endTime: examTime.endTime,
      roomId: examTime.roomId || 'none',
      invigilatorId: examTime.invigilatorId || 'none',
      notes: examTime.notes || '',
    });
    setIsEditDialogOpen(true);
  };

  const isLoading = (examIdFromParams ? examLoading : examsLoading) || timesLoading;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Show exam selector if accessed individually and no exam selected yet
  if (!examIdFromParams && (!allExams || allExams.length === 0)) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('exams.noExamsAvailable') || 'No exams available'}</p>
          <Button variant="link" onClick={() => navigate('/exams')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('exams.backToList') || 'Back to Exams'}
          </Button>
        </div>
      </div>
    );
  }

  // Show exam selector when accessed from sidebar (no examId in URL) and no exam selected yet
  if (!examIdFromParams && !selectedExamId && allExams && allExams.length > 0) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/exams')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">{t('exams.timetable') || 'Exam Timetable'}</h1>
            <p className="text-sm text-muted-foreground">
              {t('exams.selectExamToViewTimetable') || 'Select an exam to view and manage its timetable'}
            </p>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('exams.selectExam') || 'Select Exam'}</CardTitle>
            <CardDescription>
              {t('exams.selectExamDescription') || 'Choose an exam to view and manage its timetable'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full max-w-md">
              <Label>{t('exams.exam') || 'Exam'}</Label>
              <Select
                value={selectedExamId || ''}
                onValueChange={(v) => setSelectedExamId(v)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={t('exams.selectExamPlaceholder') || 'Select an exam...'} />
                </SelectTrigger>
                <SelectContent>
                  {allExams.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} {e.academicYear?.name ? `(${e.academicYear.name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!examId) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('exams.selectExamToViewTimetable') || 'Please select an exam to view timetable'}</p>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('exams.notFound') || 'Exam not found'}</p>
          <Button variant="link" onClick={() => navigate('/exams')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('exams.backToList') || 'Back to Exams'}
          </Button>
        </div>
      </div>
    );
  }

  const canModify = hasManageTimetable && ['draft', 'scheduled', 'in_progress'].includes(exam.status);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/exams')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">{exam.name}</h1>
          <p className="text-sm text-muted-foreground">
            {t('exams.timetableDescription') || 'Manage exam timetable and schedule'}
          </p>
        </div>
        <Badge variant="outline">{exam.academicYear?.name || 'N/A'}</Badge>
        {exam.startDate && exam.endDate && (
          <Badge variant="secondary" className="gap-1">
            <CalendarIcon className="h-3 w-3" />
            {formatDate(exam.startDate)} - {formatDate(exam.endDate)}
          </Badge>
        )}
      </div>

      {/* Exam Selector - only show when accessed directly (without examId in URL) */}
      {!examIdFromParams && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('exams.selectExam') || 'Select Exam'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full max-w-md">
              <Select
                value={selectedExamId || ''}
                onValueChange={(v) => setSelectedExamId(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('exams.selectExamPlaceholder') || 'Select an exam...'} />
                </SelectTrigger>
                <SelectContent>
                  {allExams?.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} {e.academicYear?.name ? `(${e.academicYear.name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex-1 flex flex-col md:flex-row gap-4">
              <Select value={selectedClassFilter} onValueChange={setSelectedClassFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder={t('exams.filterByClass') || 'Filter by class'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all') || 'All Classes'}</SelectItem>
                  {examClasses?.map((ec) => (
                    <SelectItem key={ec.id} value={ec.id}>
                      {getClassName(ec.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={selectedDateFilter}
                onChange={(e) => setSelectedDateFilter(e.target.value)}
                className="w-[200px]"
                min={exam.startDate ? new Date(exam.startDate).toISOString().slice(0, 10) : undefined}
                max={exam.endDate ? new Date(exam.endDate).toISOString().slice(0, 10) : undefined}
              />
              {selectedDateFilter && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedDateFilter('')}>
                  {t('common.clear') || 'Clear'}
                </Button>
              )}
            </div>
            {canModify && (
              <Button onClick={() => setIsCreateDialogOpen(true)} disabled={!examClasses?.length || !examSubjects?.length}>
                <Plus className="h-4 w-4 mr-2" />
                {t('exams.addTimeSlot') || 'Add Time Slot'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Timetable */}
      <Card>
        <CardHeader>
          <CardTitle>{t('exams.examTimetable') || 'Exam Timetable'}</CardTitle>
          <CardDescription>
            {t('exams.examTimetableDescription') || 'Schedule of exam sessions'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {groupedByDate.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                {t('exams.noTimeSlots') || 'No time slots scheduled yet.'}
              </p>
              {!examClasses?.length && (
                <p className="text-sm text-muted-foreground mt-2">
                  {t('exams.addClassesFirst') || 'Add classes to the exam first.'}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {groupedByDate.map(([dateKey, times]) => (
                <div key={dateKey}>
                  <div className="flex items-center gap-2 mb-3">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-medium">
                      {formatDate(dateKey)}
                    </h3>
                    <Badge variant="outline">{times.length} {t('exams.sessions') || 'sessions'}</Badge>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('exams.time') || 'Time'}</TableHead>
                        <TableHead>{t('exams.class') || 'Class'}</TableHead>
                        <TableHead>{t('exams.subject') || 'Subject'}</TableHead>
                        <TableHead>{t('exams.room') || 'Room'}</TableHead>
                        <TableHead>{t('exams.invigilator') || 'Invigilator'}</TableHead>
                        <TableHead className="text-right">{t('common.actions') || 'Actions'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {times.map((examTime) => (
                        <TableRow key={examTime.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {examTime.startTime} - {examTime.endTime}
                              </span>
                              {examTime.isLocked && (
                                <Lock className="h-3 w-3 text-muted-foreground" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{getClassName(examTime.examClassId)}</TableCell>
                          <TableCell>{getSubjectName(examTime.examSubjectId)}</TableCell>
                          <TableCell>
                            {examTime.room ? (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {examTime.room.name}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {examTime.invigilator ? (
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {examTime.invigilator.fullName}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {canModify && (
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleToggleLock(examTime)}
                                  title={examTime.isLocked ? 'Unlock' : 'Lock'}
                                >
                                  {examTime.isLocked ? (
                                    <Unlock className="h-4 w-4" />
                                  ) : (
                                    <Lock className="h-4 w-4" />
                                  )}
                                </Button>
                                {!examTime.isLocked && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => openEditDialog(examTime)}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        setTimeToDelete(examTime);
                                        setIsDeleteDialogOpen(true);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('exams.addTimeSlot') || 'Add Time Slot'}</DialogTitle>
            <DialogDescription>
              {t('exams.addTimeSlotDescription') || 'Schedule a new exam session'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('exams.class') || 'Class'} *</Label>
                <Select 
                  value={formData.examClassId} 
                  onValueChange={(v) => setFormData({ ...formData, examClassId: v, examSubjectId: '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('exams.selectClass') || 'Select class'} />
                  </SelectTrigger>
                  <SelectContent>
                    {examClasses?.map((ec) => (
                      <SelectItem key={ec.id} value={ec.id}>
                        {getClassName(ec.id)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('exams.subject') || 'Subject'} *</Label>
                <Select 
                  value={formData.examSubjectId} 
                  onValueChange={(v) => setFormData({ ...formData, examSubjectId: v })}
                  disabled={!formData.examClassId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('exams.selectSubject') || 'Select subject'} />
                  </SelectTrigger>
                  <SelectContent>
                    {subjectsForSelectedClass.map((es) => (
                      <SelectItem key={es.id} value={es.id}>
                        {es.subject?.name || 'Subject'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>{t('exams.date') || 'Date'} *</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                min={exam.startDate ? new Date(exam.startDate).toISOString().slice(0, 10) : undefined}
                max={exam.endDate ? new Date(exam.endDate).toISOString().slice(0, 10) : undefined}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('exams.startTime') || 'Start Time'} *</Label>
                <Input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('exams.endTime') || 'End Time'} *</Label>
                <Input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('exams.room') || 'Room'}</Label>
                <Select value={formData.roomId || 'none'} onValueChange={(v) => setFormData({ ...formData, roomId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('exams.selectRoom') || 'Select room'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('common.none') || 'None'}</SelectItem>
                    {rooms?.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('exams.invigilator') || 'Invigilator'}</Label>
                <Select value={formData.invigilatorId || 'none'} onValueChange={(v) => setFormData({ ...formData, invigilatorId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('exams.selectInvigilator') || 'Select invigilator'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('common.none') || 'None'}</SelectItem>
                    {staff?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.firstName} {s.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>{t('exams.notes') || 'Notes'}</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t('exams.notesPlaceholder') || 'Optional notes...'}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); resetForm(); }}>
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button onClick={handleCreate} disabled={createExamTime.isPending}>
              {t('common.create') || 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('exams.editTimeSlot') || 'Edit Time Slot'}</DialogTitle>
            <DialogDescription>
              {t('exams.editTimeSlotDescription') || 'Update exam session details'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {timeToEdit && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="font-medium">{getClassName(timeToEdit.examClassId)} - {getSubjectName(timeToEdit.examSubjectId)}</p>
              </div>
            )}
            <div>
              <Label>{t('exams.date') || 'Date'} *</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                min={exam.startDate ? new Date(exam.startDate).toISOString().slice(0, 10) : undefined}
                max={exam.endDate ? new Date(exam.endDate).toISOString().slice(0, 10) : undefined}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('exams.startTime') || 'Start Time'} *</Label>
                <Input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('exams.endTime') || 'End Time'} *</Label>
                <Input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('exams.room') || 'Room'}</Label>
                <Select value={formData.roomId || 'none'} onValueChange={(v) => setFormData({ ...formData, roomId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('exams.selectRoom') || 'Select room'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('common.none') || 'None'}</SelectItem>
                    {rooms?.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('exams.invigilator') || 'Invigilator'}</Label>
                <Select value={formData.invigilatorId || 'none'} onValueChange={(v) => setFormData({ ...formData, invigilatorId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('exams.selectInvigilator') || 'Select invigilator'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('common.none') || 'None'}</SelectItem>
                    {staff?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.firstName} {s.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>{t('exams.notes') || 'Notes'}</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t('exams.notesPlaceholder') || 'Optional notes...'}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); setTimeToEdit(null); resetForm(); }}>
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button onClick={handleUpdate} disabled={updateExamTime.isPending}>
              {t('common.update') || 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('exams.deleteTimeSlotConfirm') || 'Delete Time Slot'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('exams.deleteTimeSlotConfirmMessage') || 'Are you sure you want to delete this time slot?'}
              {timeToDelete && (
                <div className="mt-2 font-medium">
                  {getClassName(timeToDelete.examClassId)} - {getSubjectName(timeToDelete.examSubjectId)}
                  <br />
                  {formatDate(timeToDelete.date)} {timeToDelete.startTime} - {timeToDelete.endTime}
                </div>
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
