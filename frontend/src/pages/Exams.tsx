import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Trash2, Plus, Pencil, CheckCircle, Calendar, Settings, Users, 
  ClipboardList, FileText, Clock, MoreHorizontal, Search, UserCheck,
  ChevronDown, ChevronUp, BookOpen, GraduationCap
} from 'lucide-react';
import { useState, useEffect, useMemo, Fragment } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';
import { PageHeader } from '@/components/layout/PageHeader';
import { FilterPanel } from '@/components/layout/FilterPanel';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAcademicYears, useCurrentAcademicYear } from '@/hooks/useAcademicYears';
import { useExams, useCreateExam, useUpdateExam, useDeleteExam, useUpdateExamStatus, useExamClasses, useExamSummaryReport } from '@/hooks/useExams';
import { useExamTypes } from '@/hooks/useExamTypes';
import { useLanguage } from '@/hooks/useLanguage';
import { useHasPermission } from '@/hooks/usePermissions';
import { useProfile } from '@/hooks/useProfiles';
import { showToast } from '@/lib/toast';
import { formatDate, formatDateTime } from '@/lib/utils';
import type { Exam, ExamStatus } from '@/types/domain/exam';

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

interface ExpandedRowContentProps {
  exam: Exam;
}

function ExpandedRowContent({ exam }: ExpandedRowContentProps) {
  const { t } = useLanguage();
  const { data: examClasses, isLoading: classesLoading } = useExamClasses(exam.id);
  const { data: summaryReport, isLoading: summaryLoading } = useExamSummaryReport(exam.id);

  const isLoading = classesLoading || summaryLoading;

  return (
    <div className="bg-muted/20 border-t px-4 py-3">
      <div className="flex items-start gap-6 flex-wrap">
        {/* Description Section */}
        {exam.description && (
          <div className="flex-shrink-0 min-w-[200px]">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">{t('events.description') || 'Description'}</span>
            </div>
            <p className="text-sm leading-relaxed">{exam.description}</p>
          </div>
        )}

        {/* Stats Section */}
        {summaryReport && (
          <div className="flex-shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <ClipboardList className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">{t('exams.statistics') || 'Statistics'}</span>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">{t('nav.classes') || 'Classes'}:</span>
                <span className="text-sm font-semibold">{summaryReport.totals.classes || 0}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">{t('events.subjects') || 'Subjects'}:</span>
                <span className="text-sm font-semibold">{summaryReport.totals.subjects || 0}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">{t('table.students') || 'Students'}:</span>
                <span className="text-sm font-semibold">{summaryReport.totals.enrolledStudents || 0}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">{t('students.results') || 'Results'}:</span>
                <span className="text-sm font-semibold">{summaryReport.totals.resultsEntered || 0}</span>
              </div>
              {summaryReport.passFail && (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">{t('exams.passed') || 'Passed'}:</span>
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                      {summaryReport.passFail.passCount || 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">{t('exams.failed') || 'Failed'}:</span>
                    <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                      {summaryReport.passFail.failCount || 0}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Classes Section */}
        <div className="flex-1 min-w-[300px]">
          <div className="flex items-center gap-2 mb-2">
            <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              {t('nav.classes') || 'Classes'} ({examClasses?.length || 0})
            </span>
          </div>
          {isLoading ? (
            <div className="flex gap-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-24" />
            </div>
          ) : !examClasses || examClasses.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              {t('exams.noClassesAssigned') || 'No classes assigned'}
            </p>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {examClasses.map((examClass) => (
                <Badge
                  key={examClass.id}
                  variant="outline"
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-card hover:bg-muted/50 transition-colors"
                >
                  <BookOpen className="h-3 w-3 text-primary" />
                  <span className="text-xs">
                    {examClass.classAcademicYear?.class?.name || 'Unknown'}
                    {examClass.classAcademicYear?.sectionName && (
                      <span className="text-muted-foreground"> - {examClass.classAcademicYear.sectionName}</span>
                    )}
                  </span>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function Exams() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: profile } = useProfile();
  const organizationId = profile?.organization_id;

  const { data: academicYears } = useAcademicYears(organizationId);
  const { data: currentAcademicYear } = useCurrentAcademicYear(organizationId);
  const { data: examTypes } = useExamTypes();
  const queryClient = useQueryClient();
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
  const [examTypeFilter, setExamTypeFilter] = useState<string | 'all'>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    name: '',
    academicYearId: '',
    examTypeId: '',
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
  const hasManageAttendance = useHasPermission('exams.manage_attendance');
  const hasViewAttendanceReports = useHasPermission('exams.view_attendance_reports');

  // Check for view query param and auto-expand exam row
  useEffect(() => {
    const viewExamId = searchParams.get('view');
    if (viewExamId && exams && exams.length > 0) {
      const exam = exams.find(e => e.id === viewExamId);
      if (exam) {
        // Expand the row to show exam details
        setExpandedRows(prev => new Set(prev).add(exam.id));
        // Clean up URL
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, exams, setSearchParams]);

  // Filter exams
  const filteredExams = useMemo(() => {
    if (!exams) return [];
    return exams.filter(exam => {
      const matchesSearch = exam.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exam.academicYear?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exam.examType?.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || exam.status === statusFilter;
      const matchesExamType = examTypeFilter === 'all' || exam.examTypeId === examTypeFilter;
      return matchesSearch && matchesStatus && matchesExamType;
    });
  }, [exams, searchQuery, statusFilter, examTypeFilter]);

  const handleCreate = () => {
    if (!formData.name || !formData.academicYearId) {
      showToast.error(t('events.required') || 'Please fill in all required fields');
      return;
    }

    createExam.mutate(
      {
        name: formData.name,
        academicYearId: formData.academicYearId,
        examTypeId: formData.examTypeId || undefined,
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
      showToast.error(t('events.required') || 'Please fill in all required fields');
      return;
    }

    updateExam.mutate(
      {
        id: selectedExam.id,
        data: {
          name: formData.name,
          academicYearId: formData.academicYearId,
          examTypeId: formData.examTypeId || undefined,
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
        onSuccess: async () => {
          setIsStatusDialogOpen(false);
          setStatusToChange(null);
          // Refetch exams to ensure UI updates immediately
          await queryClient.refetchQueries({ queryKey: ['exams'] });
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
      examTypeId: '',
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
      examTypeId: exam.examTypeId || '',
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

  const toggleRow = (examId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(examId)) {
        newSet.delete(examId);
      } else {
        newSet.add(examId);
      }
      return newSet;
    });
  };

  const isRowExpanded = (examId: string) => expandedRows.has(examId);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title={t('exams') || 'Exams'}
        description={t('students.management') || 'Create and manage exams for academic years'}
        primaryAction={
          hasCreate
            ? {
                label: t('events.create') || 'Create Exam',
                onClick: () => {
                  setFormData(prev => ({
                    ...prev,
                    academicYearId: currentAcademicYear?.id || prev.academicYearId,
                  }));
                  setIsCreateDialogOpen(true);
                },
                icon: <Plus className="h-4 w-4" />,
              }
            : undefined
        }
      />

      {/* Filters */}
      <FilterPanel title={t('events.filters')}>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('assets.searchPlaceholder') || 'Search exams...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ExamStatus | 'all')}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder={t('events.filterByStatus') || 'Filter by status'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('subjects.all') || 'All'}</SelectItem>
              <SelectItem value="draft">{t('exams.status.draft') || 'Draft'}</SelectItem>
              <SelectItem value="scheduled">{t('exams.status.scheduled') || 'Scheduled'}</SelectItem>
              <SelectItem value="in_progress">{t('exams.status.in_progress') || 'In Progress'}</SelectItem>
              <SelectItem value="completed">{t('exams.status.completed') || 'Completed'}</SelectItem>
              <SelectItem value="archived">{t('exams.status.archived') || 'Archived'}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={examTypeFilter} onValueChange={(value) => setExamTypeFilter(value)}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder={t('exams.filterByExamType') || 'Filter by exam type'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('subjects.all') || 'All'}</SelectItem>
              {examTypes?.filter(et => et.isActive).map((examType) => (
                <SelectItem key={examType.id} value={examType.id}>
                  {examType.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FilterPanel>

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
                  <TableHead className="w-12"></TableHead>
                  <TableHead>{t('events.name') || 'Name'}</TableHead>
                  <TableHead>{t('exams.examType') || 'Exam Type'}</TableHead>
                  <TableHead>{t('exams.academicYear') || 'Academic Year'}</TableHead>
                  <TableHead>{t('events.status') || 'Status'}</TableHead>
                  <TableHead>{t('exams.period') || 'Period'}</TableHead>
                  <TableHead className="text-right">{t('events.actions') || 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExams.map((exam) => {
                  const isExpanded = isRowExpanded(exam.id);
                  return (
                    <Fragment key={exam.id}>
                      <TableRow className="cursor-pointer hover:bg-muted/50">
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => toggleRow(exam.id)}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell 
                          className="font-medium cursor-pointer hover:text-primary transition-colors"
                          onClick={() => toggleRow(exam.id)}
                        >
                          {exam.name}
                        </TableCell>
                    <TableCell>
                      {exam.examType ? (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800">
                          {exam.examType.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                        {exam.academicYear?.name || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(exam.status)}</TableCell>
                    <TableCell>
                      {exam.startDate && exam.endDate ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800">
                            <Calendar className="h-3 w-3 mr-1" />
                            {formatDate(exam.startDate)}
                          </Badge>
                          <span className="text-muted-foreground">→</span>
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800">
                            <Calendar className="h-3 w-3 mr-1" />
                            {formatDate(exam.endDate)}
                          </Badge>
                        </div>
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
                          <DropdownMenuLabel>{t('events.actions') || 'Actions'}</DropdownMenuLabel>
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
                              {t('nav.reports') || 'Reports'}
                            </DropdownMenuItem>
                          )}
                          {(hasManageAttendance || hasViewAttendanceReports) && (
                            <DropdownMenuItem onClick={() => navigate(`/exams/${exam.id}/attendance`)}>
                              <UserCheck className="h-4 w-4 mr-2" />
                              {t('dashboard.markAttendance') || 'Mark Attendance'}
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
                              {t('events.edit') || 'Edit'}
                            </DropdownMenuItem>
                          )}
                          {canDeleteExam(exam) && (
                            <DropdownMenuItem 
                              onClick={() => openDeleteDialog(exam)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t('events.delete') || 'Delete'}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow key={`${exam.id}-expanded`}>
                      <TableCell colSpan={7} className="p-0">
                        <ExpandedRowContent exam={exam} />
                      </TableCell>
                    </TableRow>
                  )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('events.create') || 'Create Exam'}</DialogTitle>
            <DialogDescription>
              {t('exams.createDescription') || 'Create a new exam for an academic year'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="create-name">{t('events.name') || 'Name'} *</Label>
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
              <Label htmlFor="create-exam-type">{t('exams.examType') || 'Exam Type'}</Label>
              <Select
                value={formData.examTypeId || 'none'}
                onValueChange={(value) => setFormData({ ...formData, examTypeId: value === 'none' ? '' : value })}
              >
                <SelectTrigger id="create-exam-type">
                  <SelectValue placeholder={t('exams.selectExamType') || 'Select exam type (optional)'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('events.none') || 'None'}</SelectItem>
                  {(examTypes || []).filter(et => et.isActive).map((examType) => (
                    <SelectItem key={examType.id} value={examType.id}>
                      {examType.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="create-description">{t('events.description') || 'Description'}</Label>
              <Textarea
                id="create-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('permissions.descriptionPlaceholder') || 'Optional description'}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="create-start-date">{t('events.startDate') || 'Start Date'}</Label>
                <CalendarDatePicker date={formData.startDate ? new Date(formData.startDate) : undefined} onDateChange={(date) => setFormData(date ? date.toISOString().split("T")[0] : "")} />
              </div>
              <div>
                <Label htmlFor="create-end-date">{t('events.endDate') || 'End Date'}</Label>
                <CalendarDatePicker date={formData.endDate ? new Date(formData.endDate) : undefined} onDateChange={(date) => setFormData(date ? date.toISOString().split("T")[0] : "")} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); resetForm(); }}>
              {t('events.cancel') || 'Cancel'}
            </Button>
            <Button onClick={handleCreate} disabled={createExam.isPending}>
              <CheckCircle className="h-4 w-4 mr-2" />
              {t('events.create') || 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('events.edit') || 'Edit Exam'}</DialogTitle>
            <DialogDescription>
              {t('exams.editDescription') || 'Update exam details'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">{t('events.name') || 'Name'} *</Label>
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
              <Label htmlFor="edit-exam-type">{t('exams.examType') || 'Exam Type'}</Label>
              <Select
                value={formData.examTypeId || 'none'}
                onValueChange={(value) => setFormData({ ...formData, examTypeId: value === 'none' ? '' : value })}
              >
                <SelectTrigger id="edit-exam-type">
                  <SelectValue placeholder={t('exams.selectExamType') || 'Select exam type (optional)'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('events.none') || 'None'}</SelectItem>
                  {(examTypes || []).filter(et => et.isActive).map((examType) => (
                    <SelectItem key={examType.id} value={examType.id}>
                      {examType.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-description">{t('events.description') || 'Description'}</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('permissions.descriptionPlaceholder') || 'Optional description'}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-start-date">{t('events.startDate') || 'Start Date'}</Label>
                <CalendarDatePicker date={formData.startDate ? new Date(formData.startDate) : undefined} onDateChange={(date) => setFormData(date ? date.toISOString().split("T")[0] : "")} />
              </div>
              <div>
                <Label htmlFor="edit-end-date">{t('events.endDate') || 'End Date'}</Label>
                <CalendarDatePicker date={formData.endDate ? new Date(formData.endDate) : undefined} onDateChange={(date) => setFormData(date ? date.toISOString().split("T")[0] : "")} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); resetForm(); }}>
              {t('events.cancel') || 'Cancel'}
            </Button>
            <Button onClick={handleUpdate} disabled={updateExam.isPending}>
              <CheckCircle className="h-4 w-4 mr-2" />
              {t('events.update') || 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Change Dialog */}
      <AlertDialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('exams.changeStatusConfirm') || 'Change Exam Status'}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p>{t('exams.changeStatusConfirmMessage') || 'Are you sure you want to change the status of this exam?'}</p>
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
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('events.cancel') || 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleStatusChange} disabled={updateExamStatus.isPending}>
              {t('events.confirm') || 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('assets.deleteConfirm') || 'Delete Exam'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('exams.deleteConfirmMessage') || 'Are you sure you want to delete this exam? This action cannot be undone.'}
              {examToDelete && (
                <span className="block mt-2 font-semibold">{examToDelete.name}</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('events.cancel') || 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {t('events.delete') || 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

