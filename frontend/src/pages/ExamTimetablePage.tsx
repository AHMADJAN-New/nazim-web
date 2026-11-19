import { 
  ArrowLeft, Plus, Trash2, Clock, Calendar as CalendarIcon, Lock, Unlock,
  Pencil, MapPin, User
} from 'lucide-react';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { ExamTimetableBoard } from '@/components/exams/ExamTimetableBoard';
import { ExamTimeSlotDialog } from '@/components/exams/ExamTimeSlotDialog';
import {
  ExamTimetableGeneratePanel,
  type ExamTimetableGenerateConfig,
} from '@/components/exams/ExamTimetableGeneratePanel';
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
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  useExam, useExamClasses, useExamSubjects, useExamTimes,
  useCreateExamTime, useUpdateExamTime, useDeleteExamTime, useToggleExamTimeLock,
  useReorderExamTimes,
  useBulkReplaceExamTimes,
  useExams, useLatestExamFromCurrentYear
} from '@/hooks/useExams';
import { useRooms } from '@/hooks/useRooms';
import { useStaff } from '@/hooks/useStaff';
import { useProfile } from '@/hooks/useProfiles';
import { useHasPermission } from '@/hooks/usePermissions';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/hooks/useLanguage';
import { showToast } from '@/lib/toast';
import { dateToLocalYYYYMMDD, parseLocalDate } from '@/lib/dateUtils';
import { slotKey, sortClassesByMode, type ClassSortMode } from '@/lib/examScheduleSlots';
import type { ExamTimeSlotFormValues } from '@/lib/validations/examTime';
import {
  buildExamDays,
  solveExamTimetable,
  type ExamSolverEntry,
} from '@/lib/examTimetableSolver';
import { buildExamTimetableMatrixExport } from '@/lib/examTimetableMatrixExport';
import { formatDate } from '@/lib/utils';
import type { ExamTime } from '@/types/domain/exam';

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
  const reorderExamTimes = useReorderExamTimes();
  const toggleLock = useToggleExamTimeLock();
  const bulkReplaceExamTimes = useBulkReplaceExamTimes();

  // Permissions
  const hasManageTimetable = useHasPermission('exams.manage_timetable');

  // State
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [classSortMode, setClassSortMode] = useState<ClassSortMode>('viewing');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('');
  const [isSlotDialogOpen, setIsSlotDialogOpen] = useState(false);
  const [slotDialogMode, setSlotDialogMode] = useState<'create' | 'edit'>('create');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRegenerateConfirmOpen, setIsRegenerateConfirmOpen] = useState(false);
  const [pendingGenerateConfig, setPendingGenerateConfig] = useState<ExamTimetableGenerateConfig | null>(null);
  const [boardEntries, setBoardEntries] = useState<ExamSolverEntry[]>([]);
  const [boardAllDays, setBoardAllDays] = useState<string[]>([]);
  const [boardRestDays, setBoardRestDays] = useState<string[]>([]);
  const [boardDirty, setBoardDirty] = useState(false);
  const [timeToEdit, setTimeToEdit] = useState<ExamTime | null>(null);
  const [timeToDelete, setTimeToDelete] = useState<ExamTime | null>(null);

  const toDateKey = (value: Date | string) => {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      return value.slice(0, 10);
    }
    return dateToLocalYYYYMMDD(value instanceof Date ? value : new Date(value));
  };

  const examDateBounds = useMemo(() => {
    const toBoundDate = (value?: Date | string | null) => {
      if (!value) return undefined;
      if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? undefined : value;
      }
      const key = String(value).slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return undefined;
      const parsed = parseLocalDate(key);
      return Number.isNaN(parsed.getTime()) ? undefined : parsed;
    };
    return {
      minDate: toBoundDate(exam?.startDate),
      maxDate: toBoundDate(exam?.endDate),
    };
  }, [exam?.startDate, exam?.endDate]);

  const sortedExamClasses = useMemo(() => {
    const items = (examClasses ?? []).map((ec) => {
      const className = ec.classAcademicYear?.class?.name || 'Class';
      const name = ec.classAcademicYear?.sectionName
        ? `${className} - ${ec.classAcademicYear.sectionName}`
        : className;
      return {
        id: ec.id,
        classAcademicYearId: ec.classAcademicYearId,
        name,
        gradeLevel: ec.classAcademicYear?.class?.gradeLevel ?? null,
      };
    });
    return sortClassesByMode(items, classSortMode);
  }, [examClasses, classSortMode]);

  const classRank = useMemo(
    () => new Map(sortedExamClasses.map((item, index) => [item.id, index])),
    [sortedExamClasses],
  );

  // Filter exam times
  const filteredExamTimes = useMemo(() => {
    if (!examTimes) return [];
    return examTimes.filter(et => {
      const matchesClass = selectedClassFilter === 'all' || et.examClassId === selectedClassFilter;
      const matchesDate = !selectedDateFilter || toDateKey(et.date) === selectedDateFilter;
      return matchesClass && matchesDate;
    }).sort((a, b) => {
      const dateCompare = toDateKey(a.date).localeCompare(toDateKey(b.date));
      if (dateCompare !== 0) return dateCompare;
      const rank = (classRank.get(a.examClassId) ?? 0) - (classRank.get(b.examClassId) ?? 0);
      if (rank !== 0) return rank;
      const timeCompare = a.startTime.localeCompare(b.startTime);
      if (timeCompare !== 0) return timeCompare;
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    });
  }, [examTimes, selectedClassFilter, selectedDateFilter, classRank]);

  // Group exam times by date
  const groupedByDate = useMemo(() => {
    const groups: Record<string, ExamTime[]> = {};
    filteredExamTimes.forEach(et => {
      const dateKey = toDateKey(et.date);
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

  // Class × date matrix for PDF/Excel export (matches printed timetable layout)
  // Sections of the same class are merged into one row (no section names in export).
  const examTimetableMatrix = useMemo(() => {
    const classes = (examClasses ?? []).map((ec) => {
      const baseName = ec.classAcademicYear?.class?.name || 'Class';
      const classId = ec.classAcademicYear?.classId || ec.classAcademicYear?.class?.id || ec.id;
      return {
        id: ec.id,
        name: baseName,
        groupKey: classId,
      };
    });
    const slots = filteredExamTimes.map((et) => ({
      examClassId: et.examClassId,
      date: toDateKey(et.date),
      subjectName: getSubjectName(et.examSubjectId),
    }));
    return buildExamTimetableMatrixExport(classes, slots, {
      classColumnLabel: t('search.class') || t('exams.boardClass') || 'Class',
      formatDayHeader: (dateYmd, weekdayKey) => {
        const dayLabel =
          t(`academic.timetable.days.${weekdayKey}`) ||
          t(`timetable.days.${weekdayKey}`) ||
          weekdayKey;
        return `${dayLabel}\n${formatDate(dateYmd)}`;
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredExamTimes, examClasses, examSubjects, t]);

  const canModify =
    hasManageTimetable &&
    !!exam &&
    exam.status !== 'completed' &&
    exam.status !== 'archived';

  const examStartKey = exam?.startDate ? toDateKey(exam.startDate) : '';
  const examEndKey = exam?.endDate ? toDateKey(exam.endDate) : '';

  const boardClasses = useMemo(
    () => sortedExamClasses.map((item) => ({ id: item.id, name: item.name })),
    [sortedExamClasses],
  );

  // Reset draft when switching exams
  useEffect(() => {
    setBoardDirty(false);
    setBoardEntries([]);
    setBoardAllDays([]);
    setBoardRestDays([]);
    setPendingGenerateConfig(null);
    setIsRegenerateConfirmOpen(false);
  }, [examId]);

  // Seed board from server when not dirty
  useEffect(() => {
    if (boardDirty || !examTimes) return;
    if (!examStartKey || !examEndKey || examTimes.length === 0) {
      setBoardEntries([]);
      setBoardAllDays([]);
      setBoardRestDays([]);
      return;
    }
    const allDays = buildExamDays(examStartKey, examEndKey, []);
    setBoardAllDays(allDays);
    setBoardRestDays([]);
    setBoardEntries(
      examTimes.map((et) => ({
        examClassId: et.examClassId,
        examSubjectId: et.examSubjectId,
        subjectId: et.examSubject?.subjectId ?? '',
        date: toDateKey(et.date),
        startTime: et.startTime.slice(0, 5),
        endTime: et.endTime.slice(0, 5),
        sortOrder: et.sortOrder ?? 0,
        roomId: et.roomId ?? null,
        invigilatorId: et.invigilatorId ?? null,
        isLocked: et.isLocked,
        subjectName: getSubjectName(et.examSubjectId),
        className: getClassName(et.examClassId),
      }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examTimes, examStartKey, examEndKey, boardDirty, examId]);

  const runGenerate = useCallback(
    (config: ExamTimetableGenerateConfig) => {
      if (!examSubjects?.length || !examClasses?.length) {
        showToast.error('exams.needClassesAndSubjects');
        return;
      }

      const allDaysInclusive = buildExamDays(config.startDate, config.endDate, []);
      const examDays = buildExamDays(config.startDate, config.endDate, config.restDays);
      const lockedSlots = (examTimes ?? [])
        .filter((et) => et.isLocked)
        .map((et) => ({
          examSubjectId: et.examSubjectId,
          examClassId: et.examClassId,
          date: toDateKey(et.date),
          startTime: et.startTime.slice(0, 5),
          endTime: et.endTime.slice(0, 5),
          roomId: et.roomId ?? null,
          invigilatorId: et.invigilatorId ?? null,
        }));

      const subjectsInput = examSubjects.map((es) => ({
        examSubjectId: es.id,
        examClassId: es.examClassId,
        subjectId: es.subjectId,
        subjectName: es.subject?.name || getSubjectName(es.id),
        className: getClassName(es.examClassId),
      }));

      const result = solveExamTimetable(subjectsInput, {
        examDays,
        startTime: config.startTime,
        endTime: config.endTime,
        lockedSlots,
        assignRooms: config.assignRooms,
        rooms: config.assignRooms
          ? (rooms ?? []).map((r) => ({ id: r.id }))
          : [],
        assignInvigilators: config.assignInvigilators,
        staff: config.assignInvigilators
          ? (staff ?? []).map((s) => ({ id: s.id }))
          : [],
      });

      setBoardAllDays(allDaysInclusive);
      setBoardRestDays(config.restDays);
      setBoardEntries(result.entries);
      setBoardDirty(true);

      if (result.unscheduled.length > 0) {
        showToast.warning('exams.unscheduledSubjects', {
          count: result.unscheduled.length,
        });
      } else {
        showToast.success('toast.examTimetableGenerated');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [examSubjects, examClasses, examTimes, rooms, staff, t]
  );

  const handleGenerateRequest = (config: ExamTimetableGenerateConfig) => {
    const hasUnlocked = (examTimes ?? []).some((et) => !et.isLocked);
    if (hasUnlocked || boardDirty) {
      setPendingGenerateConfig(config);
      setIsRegenerateConfirmOpen(true);
      return;
    }
    runGenerate(config);
  };

  const handleApplyBoard = () => {
    if (!examId) return;
    const unlocked = boardEntries.filter((e) => !e.isLocked);
    bulkReplaceExamTimes.mutate(
      {
        examId,
        times: unlocked.map((e) => ({
          examClassId: e.examClassId,
          examSubjectId: e.examSubjectId,
          date: e.date,
          startTime: e.startTime.slice(0, 5),
          endTime: e.endTime.slice(0, 5),
          roomId: e.roomId ?? null,
          invigilatorId: e.invigilatorId ?? null,
        })),
      },
      {
        onSuccess: () => {
          setBoardDirty(false);
        },
      }
    );
  };

  const handleDiscardBoard = () => {
    setBoardDirty(false);
    showToast.info('toast.examTimetableDiscarded');
  };

  const slotSubjects = useMemo(() => {
    if (!timeToEdit || !examTimes) return [];
    const key = slotKey({
      examClassId: timeToEdit.examClassId,
      date: toDateKey(timeToEdit.date),
      startTime: timeToEdit.startTime,
      endTime: timeToEdit.endTime,
    });
    return examTimes
      .filter((item) => slotKey({
        examClassId: item.examClassId,
        date: toDateKey(item.date),
        startTime: item.startTime,
        endTime: item.endTime,
      }) === key)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((item) => ({
        id: item.id,
        classSubjectId: examSubjects?.find((subject) => subject.id === item.examSubjectId)?.classSubjectId || '',
        name: getSubjectName(item.examSubjectId),
        locked: item.isLocked,
      }));
  }, [timeToEdit, examTimes, examSubjects]);

  const slotInitialValues = useMemo<ExamTimeSlotFormValues>(() => {
    if (slotDialogMode === 'edit' && timeToEdit) {
      return {
        examClassId: timeToEdit.examClassId,
        classSubjectId: examSubjects?.find((subject) => subject.id === timeToEdit.examSubjectId)?.classSubjectId || '',
        date: toDateKey(timeToEdit.date),
        startTime: timeToEdit.startTime.slice(0, 5),
        endTime: timeToEdit.endTime.slice(0, 5),
        roomId: timeToEdit.roomId || '',
        invigilatorId: timeToEdit.invigilatorId || '',
        notes: timeToEdit.notes || '',
      };
    }
    return {
      examClassId: '',
      classSubjectId: '',
      date: '',
      startTime: '',
      endTime: '',
      roomId: '',
      invigilatorId: '',
      notes: '',
    };
  }, [slotDialogMode, timeToEdit, examSubjects]);

  const handleSlotSubmit = (values: ExamTimeSlotFormValues) => {
    if (!examId) return;
    const payload = {
      examClassId: values.examClassId,
      classSubjectId: values.classSubjectId,
      date: parseLocalDate(values.date),
      startTime: values.startTime,
      endTime: values.endTime,
      roomId: values.roomId || null,
      invigilatorId: values.invigilatorId || null,
      notes: values.notes || null,
    };

    if (slotDialogMode === 'create') {
      createExamTime.mutate(
        { examId, data: payload },
        { onSuccess: () => setIsSlotDialogOpen(false) },
      );
      return;
    }

    if (!timeToEdit) return;
    updateExamTime.mutate(
      {
        id: timeToEdit.id,
        data: {
          ...payload,
          syncSlot: values.examClassId === timeToEdit.examClassId,
        },
      },
      { onSuccess: () => setIsSlotDialogOpen(false) },
    );
  };

  const handleAddClassSubject = (classSubjectId: string) => {
    if (!examId || !timeToEdit) return;
    createExamTime.mutate({
      examId,
      data: {
        examClassId: timeToEdit.examClassId,
        classSubjectId,
        date: timeToEdit.date,
        startTime: timeToEdit.startTime,
        endTime: timeToEdit.endTime,
        roomId: timeToEdit.roomId ?? null,
        invigilatorId: timeToEdit.invigilatorId ?? null,
        notes: timeToEdit.notes ?? null,
        sortOrder: slotSubjects.length,
      },
    });
  };

  const handleReorderSlot = (orderedIds: string[]) => {
    if (!examId) return;
    reorderExamTimes.mutate({ examId, examTimeIds: orderedIds });
  };

  const handleRemoveSlotSubject = (examTimeId: string) => {
    deleteExamTime.mutate(examTimeId, {
      onSuccess: () => {
        if (timeToEdit?.id !== examTimeId) return;
        const next = slotSubjects.find((row) => row.id !== examTimeId);
        const nextTime = next ? examTimes?.find((item) => item.id === next.id) : undefined;
        if (!nextTime) {
          setIsSlotDialogOpen(false);
          setTimeToEdit(null);
          return;
        }
        setTimeToEdit(nextTime);
      },
    });
  };

  const openEditDialog = (examTime: ExamTime) => {
    setTimeToEdit(examTime);
    setSlotDialogMode('edit');
    setIsSlotDialogOpen(true);
  };

  const openCreateDialog = () => {
    setTimeToEdit(null);
    setSlotDialogMode('create');
    setIsSlotDialogOpen(true);
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

  const isLoading = (examIdFromParams ? examLoading : examsLoading) || timesLoading;

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Show exam selector if accessed individually and no exam selected yet
  if (!examIdFromParams && (!allExams || allExams.length === 0)) {
    return (
      <div className="container mx-auto p-4 md:p-6 max-w-7xl overflow-x-hidden">
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('exams.noExamsAvailable') || 'No exams available'}</p>
          <Button variant="link" onClick={() => navigate('/exams')} className="mt-4">
            <ArrowLeft className="h-4 w-4" />
            <span className="ml-2">{t('exams.backToList') || 'Back to Exams'}</span>
          </Button>
        </div>
      </div>
    );
  }

  // Show exam selector when accessed from sidebar (no examId in URL) and no exam selected yet
  if (!examIdFromParams && !selectedExamId && allExams && allExams.length > 0) {
    return (
      <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/exams')} className="flex-shrink-0" aria-label={t('events.back') || 'Back'}>
                <ArrowLeft className="h-5 w-5" />
                <span className="sr-only">{t('events.back') || 'Back'}</span>
              </Button>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-2xl">{t('exams.timetable') || 'Exam Timetable'}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1 hidden md:block">
                  {t('exams.selectExamToViewTimetable') || 'Select an exam to view and manage its timetable'}
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>
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
      <div className="container mx-auto p-4 md:p-6 max-w-7xl overflow-x-hidden">
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('exams.selectExamToViewTimetable') || 'Please select an exam to view timetable'}</p>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="container mx-auto p-4 md:p-6 max-w-7xl overflow-x-hidden">
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('events.notFound') || 'Exam not found'}</p>
          <Button variant="link" onClick={() => navigate('/exams')} className="mt-4">
            <ArrowLeft className="h-4 w-4" />
            <span className="ml-2">{t('exams.backToList') || 'Back to Exams'}</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <Button variant="ghost" size="icon" onClick={() => navigate('/exams')} className="flex-shrink-0" aria-label={t('events.back') || 'Back'}>
                <ArrowLeft className="h-5 w-5" />
                <span className="sr-only">{t('events.back') || 'Back'}</span>
              </Button>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-2xl truncate">{exam.name}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1 hidden md:block">
                  {t('exams.timetableDescription') || 'Manage exam timetable and schedule'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 flex-shrink-0">
              <Badge variant="outline">{exam.academicYear?.name || 'N/A'}</Badge>
              {exam.startDate && exam.endDate && (
                <Badge variant="secondary" className="gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  <span className="hidden sm:inline">{formatDate(exam.startDate)} - {formatDate(exam.endDate)}</span>
                  <span className="sm:hidden">{formatDate(exam.startDate)}</span>
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

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

      {/* Auto-generate + drag board */}
      {canModify && (
        <ExamTimetableGeneratePanel
          defaultStartDate={examStartKey || undefined}
          defaultEndDate={examEndKey || undefined}
          disabled={!examClasses?.length || !examSubjects?.length}
          onGenerate={handleGenerateRequest}
        />
      )}

      {(boardDirty || boardEntries.length > 0) && boardAllDays.length > 0 && (
        <ExamTimetableBoard
          classes={boardClasses}
          allDays={boardAllDays}
          restDays={boardRestDays}
          entries={boardEntries}
          dirty={boardDirty}
          isApplying={bulkReplaceExamTimes.isPending}
          disabled={!canModify}
          onEntriesChange={(next) => {
            setBoardEntries(next);
            setBoardDirty(true);
          }}
          onApply={handleApplyBoard}
          onDiscard={handleDiscardBoard}
        />
      )}

      {/* Filters and Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <Select value={selectedClassFilter} onValueChange={setSelectedClassFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder={t('exams.filterByClass') || 'Filter by class'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('subjects.all') || 'All Classes'}</SelectItem>
                  {sortedExamClasses.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={classSortMode} onValueChange={(value) => setClassSortMode(value as ClassSortMode)}>
                <SelectTrigger className="w-full sm:w-[180px]" aria-label={t('exams.classSort')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">{t('exams.classSortAsc')}</SelectItem>
                  <SelectItem value="desc">{t('exams.classSortDesc')}</SelectItem>
                  <SelectItem value="viewing">{t('exams.classSortViewing')}</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 flex-1">
                <CalendarDatePicker
                  date={selectedDateFilter ? parseLocalDate(selectedDateFilter) : undefined}
                  onDateChange={(date) => setSelectedDateFilter(date ? dateToLocalYYYYMMDD(date) : '')}
                  placeholder={t('common.selectDate') || 'Select date'}
                  className="w-full"
                />
                {selectedDateFilter && (
                  <Button variant="ghost" size="sm" onClick={() => setSelectedDateFilter('')} className="flex-shrink-0">
                    {t('events.clear') || 'Clear'}
                  </Button>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              {filteredExamTimes.length > 0 && (
                <ReportExportButtons
                  data={examTimetableMatrix.rows}
                  columns={examTimetableMatrix.columns}
                  reportKey="exam_timetable"
                  title={`${t('exams.examTimetable') || 'Exam Timetable'} - ${exam?.name || ''}`}
                  transformData={(rows) => rows}
                  buildFiltersSummary={() => {
                    const parts: string[] = [];
                    if (exam?.name) parts.push(`Exam: ${exam.name}`);
                    if (exam?.academicYear?.name) parts.push(`Academic Year: ${exam.academicYear.name}`);
                    if (selectedClassFilter !== 'all') {
                      parts.push(`Class: ${getClassName(selectedClassFilter)}`);
                    }
                    if (selectedDateFilter) {
                      parts.push(`Date: ${formatDate(selectedDateFilter)}`);
                    }
                    parts.push(`Total Sessions: ${filteredExamTimes.length}`);
                    return parts.join(' | ');
                  }}
                  schoolId={profile?.default_school_id}
                  templateType="exam_timetable"
                  disabled={examTimetableMatrix.rows.length === 0}
                />
              )}
              {canModify && (
                <Button onClick={openCreateDialog} disabled={!examClasses?.length} className="w-full sm:w-auto flex-shrink-0">
                  <Plus className="h-4 w-4" />
                  <span className="ml-2">{t('exams.addTimeSlot') || 'Add Time Slot'}</span>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timetable */}
      <Card>
        <CardHeader>
          <CardTitle>{t('exams.examTimetable') || 'Exam Timetable'}</CardTitle>
          <CardDescription className="hidden md:block">
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
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('exams.time') || 'Time'}</TableHead>
                          <TableHead>{t('search.class') || 'Class'}</TableHead>
                          <TableHead>{t('exams.subject') || 'Subject'}</TableHead>
                          <TableHead className="hidden md:table-cell">{t('exams.room') || 'Room'}</TableHead>
                          <TableHead className="hidden lg:table-cell">{t('exams.invigilator') || 'Invigilator'}</TableHead>
                          <TableHead>{t('events.actions') || 'Actions'}</TableHead>
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
                          <TableCell className="hidden md:table-cell">
                            {examTime.room ? (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {examTime.room.name}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {examTime.invigilator ? (
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {examTime.invigilator.fullName}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {canModify && (
                              <div className="flex justify-end gap-1.5 sm:gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleToggleLock(examTime)}
                                  className="flex-shrink-0"
                                  aria-label={examTime.isLocked ? t('exams.unlock') || 'Unlock' : t('exams.lock') || 'Lock'}
                                  title={examTime.isLocked ? t('exams.unlock') || 'Unlock' : t('exams.lock') || 'Lock'}
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
                                      className="flex-shrink-0"
                                      aria-label={t('events.edit') || 'Edit'}
                                    >
                                      <Pencil className="h-4 w-4" />
                                      <span className="sr-only">{t('events.edit') || 'Edit'}</span>
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        setTimeToDelete(examTime);
                                        setIsDeleteDialogOpen(true);
                                      }}
                                      className="flex-shrink-0"
                                      aria-label={t('events.delete') || 'Delete'}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                      <span className="sr-only">{t('events.delete') || 'Delete'}</span>
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
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ExamTimeSlotDialog
        open={isSlotDialogOpen}
        mode={slotDialogMode}
        openKey={timeToEdit?.id ?? 'create'}
        classes={sortedExamClasses}
        rooms={(rooms ?? []).map((room) => ({ id: room.id, name: room.roomNumber }))}
        staff={(staff ?? []).map((person) => ({
          id: person.id,
          name: person.fullName || `${person.firstName} ${person.lastName}`.trim(),
        }))}
        minDate={examDateBounds.minDate}
        maxDate={examDateBounds.maxDate}
        initial={slotInitialValues}
        slotSubjects={slotDialogMode === 'edit' ? slotSubjects : []}
        savedClassId={timeToEdit?.examClassId}
        canArrangeSubjects={canModify && slotDialogMode === 'edit'}
        pending={createExamTime.isPending || updateExamTime.isPending || reorderExamTimes.isPending || deleteExamTime.isPending}
        onOpenChange={(open) => {
          setIsSlotDialogOpen(open);
          if (!open) setTimeToEdit(null);
        }}
        onSubmit={handleSlotSubmit}
        onReorder={handleReorderSlot}
        onAddClassSubject={handleAddClassSubject}
        onRemoveSlotSubject={handleRemoveSlotSubject}
      />

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
            <AlertDialogCancel>{t('events.cancel') || 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {t('events.delete') || 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Regenerate confirm */}
      <AlertDialog
        open={isRegenerateConfirmOpen}
        onOpenChange={(open) => {
          setIsRegenerateConfirmOpen(open);
          if (!open) setPendingGenerateConfig(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('exams.regeneratingConfirmTitle') || 'Replace unlocked timetable?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('exams.regeneratingConfirmDescription') ||
                'Unlocked time slots will be replaced. Locked slots stay as they are.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('events.cancel') || 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingGenerateConfig) {
                  runGenerate(pendingGenerateConfig);
                }
                setPendingGenerateConfig(null);
                setIsRegenerateConfirmOpen(false);
              }}
            >
              {t('exams.generate') || 'Generate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
