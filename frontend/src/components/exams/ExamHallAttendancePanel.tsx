import { Check, ChevronLeft, ChevronRight, LayoutGrid, Rows3, X, Clock, AlertCircle, Loader2, Cloud, CloudOff } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useHallAttendanceStudents,
  useMarkHallExamAttendance,
  type HallAttendanceSeat,
} from '@/hooks/useExams';
import { useLanguage } from '@/hooks/useLanguage';
import { showToast } from '@/lib/toast';
import type { TranslationKey } from '@/lib/translations/keys.generated';
import { cn } from '@/lib/utils';
import type { ExamAttendanceStatus } from '@/types/domain/exam';

type HallViewMode = 'map' | 'walk';
type WalkAxis = 'row' | 'column';
type SyncState = 'idle' | 'saving' | 'saved' | 'error';

/** Stable empty arrays — `?? []` in render creates new refs and can infinite-loop effects. */
const EMPTY_SEATS: HallAttendanceSeat[] = [];
const EMPTY_STUDENTS: HallAttendanceSeat[] = [];

const STATUS_STYLES: Record<ExamAttendanceStatus, string> = {
  present: 'bg-green-100 border-green-500 text-green-900 dark:bg-green-950/50 dark:text-green-100',
  absent: 'bg-red-100 border-red-500 text-red-900 dark:bg-red-950/50 dark:text-red-100',
  late: 'bg-yellow-100 border-yellow-500 text-yellow-900 dark:bg-yellow-950/50 dark:text-yellow-100',
  excused: 'bg-blue-100 border-blue-500 text-blue-900 dark:bg-blue-950/50 dark:text-blue-100',
};

const STATUS_ICONS: Record<ExamAttendanceStatus, React.ReactNode> = {
  present: <Check className="h-3.5 w-3.5" />,
  absent: <X className="h-3.5 w-3.5" />,
  late: <Clock className="h-3.5 w-3.5" />,
  excused: <AlertCircle className="h-3.5 w-3.5" />,
};

const STATUS_LABEL_KEYS: Record<ExamAttendanceStatus, TranslationKey> = {
  present: 'exams.attendance.hallStatus.present',
  absent: 'exams.attendance.hallStatus.absent',
  late: 'exams.attendance.hallStatus.late',
  excused: 'exams.attendance.hallStatus.excused',
};

interface ExamHallAttendancePanelProps {
  examId: string;
  /** When set, uses seating-map layout. When null, uses session list (all classes). */
  mapId?: string | null;
  session: { date: string; startTime: string };
  canMark: boolean;
}

export function ExamHallAttendancePanel({
  examId,
  mapId = null,
  session,
  canMark,
}: ExamHallAttendancePanelProps) {
  const { t, isRTL } = useLanguage();
  const markHall = useMarkHallExamAttendance();
  const { data, isLoading, refetch } = useHallAttendanceStudents(examId, mapId, session);
  const hasSeatingMap = !!mapId && !!data?.map;

  const [viewMode, setViewMode] = useState<HallViewMode>('walk');
  const [walkAxis, setWalkAxis] = useState<WalkAxis>('row');
  const [currentSliceIndex, setCurrentSliceIndex] = useState(0);
  const [statusByStudent, setStatusByStudent] = useState<Map<string, ExamAttendanceStatus | null>>(new Map());
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [finishDialogOpen, setFinishDialogOpen] = useState(false);
  const [statusPickerStudentId, setStatusPickerStudentId] = useState<string | null>(null);

  const pendingRef = useRef<Map<string, { examTimeId: string; status: ExamAttendanceStatus; seatNumber: string }>>(new Map());
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = useRef(false);
  const statusByStudentRef = useRef(statusByStudent);
  statusByStudentRef.current = statusByStudent;

  const seats = data?.seats ?? EMPTY_SEATS;
  const markableStudents = data?.students ?? EMPTY_STUDENTS;

  useEffect(() => {
    setStatusByStudent(() => {
      const next = new Map<string, ExamAttendanceStatus | null>();
      markableStudents.forEach((s) => {
        if (!s.studentId) return;
        // Keep optimistic local/pending status until the server confirms it
        const pending = pendingRef.current.get(s.studentId);
        next.set(s.studentId, pending?.status ?? s.attendance?.status ?? null);
      });
      return next;
    });
  }, [markableStudents, mapId, session.date, session.startTime]);

  const seatsWithStatus = useMemo(() => {
    return seats.map((seat) => ({
      ...seat,
      status:
        seat.studentId && seat.markable
          ? (statusByStudent.get(seat.studentId) ?? null)
          : seat.attendance?.status ?? null,
    }));
  }, [seats, statusByStudent]);

  const walkableSlices = useMemo(() => {
    const values = new Set<number>();
    seatsWithStatus.forEach((s) => {
      if (!s.markable || s.isDisabled) return;
      values.add(walkAxis === 'row' ? s.rowNumber : s.columnNumber);
    });
    return Array.from(values).sort((a, b) => a - b);
  }, [seatsWithStatus, walkAxis]);

  useEffect(() => {
    setCurrentSliceIndex(0);
    if (!mapId) {
      setViewMode('walk');
    } else {
      // Prefer full map when a seating map is selected so taps work on the layout
      setViewMode('map');
    }
  }, [mapId, session.date, session.startTime]);

  useEffect(() => {
    setCurrentSliceIndex(0);
  }, [walkAxis]);

  useEffect(() => {
    if (currentSliceIndex >= walkableSlices.length && walkableSlices.length > 0) {
      setCurrentSliceIndex(walkableSlices.length - 1);
    }
  }, [walkableSlices.length, currentSliceIndex]);

  const currentSlice = walkableSlices[currentSliceIndex] ?? walkableSlices[0];
  const currentSliceSeats = useMemo(() => {
    if (walkAxis === 'row') {
      return seatsWithStatus
        .filter((s) => s.rowNumber === currentSlice)
        .sort((a, b) => a.columnNumber - b.columnNumber);
    }
    return seatsWithStatus
      .filter((s) => s.columnNumber === currentSlice)
      .sort((a, b) => a.rowNumber - b.rowNumber);
  }, [seatsWithStatus, currentSlice, walkAxis]);

  const counts = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;
    let unmarked = 0;
    markableStudents.forEach((s) => {
      if (!s.studentId) return;
      const status = statusByStudent.get(s.studentId) ?? null;
      if (!status) unmarked += 1;
      else if (status === 'present') present += 1;
      else if (status === 'absent') absent += 1;
      else if (status === 'late') late += 1;
      else if (status === 'excused') excused += 1;
    });
    return {
      present,
      absent,
      late,
      excused,
      unmarked,
      total: markableStudents.length,
      unresolved: data?.counts.unresolved ?? 0,
    };
  }, [markableStudents, statusByStudent, data?.counts.unresolved]);

  const flushPending = useCallback(async () => {
    if (!examId || pendingRef.current.size === 0) return;
    const batch = Array.from(pendingRef.current.entries()).map(([studentId, value]) => ({
      studentId,
      examTimeId: value.examTimeId,
      status: value.status,
      seatNumber: value.seatNumber,
    }));
    pendingRef.current.clear();
    setSyncState('saving');
    try {
      await markHall.mutateAsync({
        examId,
        attendances: batch,
        silent: true,
      });
      setSyncState('saved');
      void refetch();
    } catch {
      batch.forEach((item) => {
        pendingRef.current.set(item.studentId, {
          examTimeId: item.examTimeId,
          status: item.status,
          seatNumber: item.seatNumber ?? '',
        });
      });
      setSyncState('error');
    }
  }, [examId, markHall, refetch]);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void flushPending();
    }, 400);
  }, [flushPending]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, []);

  const applyStatus = useCallback(
    (seat: HallAttendanceSeat, status: ExamAttendanceStatus) => {
      if (!canMark || !seat.markable || !seat.studentId || !seat.examTimeId || seat.isDisabled) return;
      setStatusByStudent((prev) => {
        const next = new Map(prev);
        next.set(seat.studentId!, status);
        return next;
      });
      pendingRef.current.set(seat.studentId, {
        examTimeId: seat.examTimeId,
        status,
        seatNumber: String(seat.seatNumber),
      });
      setSyncState('saving');
      scheduleSave();
    },
    [canMark, scheduleSave]
  );

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleSeatTap = (seat: HallAttendanceSeat & { status: ExamAttendanceStatus | null }) => {
    if (!canMark || !seat.markable || !seat.studentId || !seat.examTimeId || seat.isDisabled) return;
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false;
      return;
    }
    const current = statusByStudent.get(seat.studentId) ?? null;
    if (current === null || current !== 'present') {
      applyStatus(seat, 'present');
      return;
    }
    setStatusPickerStudentId(seat.studentId);
  };

  const handlePointerDown = (seat: HallAttendanceSeat) => {
    if (!canMark || !seat.markable || !seat.studentId || !seat.examTimeId || seat.isDisabled) return;
    longPressFiredRef.current = false;
    clearLongPressTimer();
    longPressTimerRef.current = setTimeout(() => {
      longPressFiredRef.current = true;
      setStatusPickerStudentId(seat.studentId);
    }, 550);
  };

  const handlePointerUp = () => {
    clearLongPressTimer();
  };

  const pickerSeat = useMemo(() => {
    if (!statusPickerStudentId) return null;
    return seatsWithStatus.find((s) => s.studentId === statusPickerStudentId && s.markable) ?? null;
  }, [statusPickerStudentId, seatsWithStatus]);

  const handleFinish = async (markRemainingAbsent: boolean) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    if (markRemainingAbsent) {
      markableStudents.forEach((s) => {
        if (!s.studentId || !s.examTimeId) return;
        const current = statusByStudentRef.current.get(s.studentId) ?? null;
        if (current === null) {
          pendingRef.current.set(s.studentId, {
            examTimeId: s.examTimeId,
            status: 'absent',
            seatNumber: String(s.seatNumber),
          });
        }
      });
      setStatusByStudent((prev) => {
        const next = new Map(prev);
        markableStudents.forEach((s) => {
          if (s.studentId && (next.get(s.studentId) ?? null) === null) {
            next.set(s.studentId, 'absent');
          }
        });
        return next;
      });
    }

    setFinishDialogOpen(false);
    setSyncState('saving');
    try {
      await flushPending();
      showToast.success(t('exams.attendance.hallFinished'));
    } catch {
      setSyncState('error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <LoadingSpinner />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        {t('exams.attendance.hallNoSessionStudents') ||
          'No students found for this session. Check the exam timetable for this date and time.'}
      </div>
    );
  }

  if (markableStudents.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground space-y-2">
        <p>
          {hasSeatingMap
            ? t('exams.attendance.hallNoSeatedStudents')
            : t('exams.attendance.hallNoSessionStudents') ||
              'No students found for this session. Check enrollments and the exam timetable.'}
        </p>
        {(data.counts.unresolved ?? 0) > 0 && (
          <p>
            {t('exams.attendance.hallUnresolvedHint') ||
              `${data.counts.unresolved} seated student(s) have no matching time slot for this session date/time.`}
          </p>
        )}
      </div>
    );
  }

  const mapRows = data.map?.rows ?? 0;
  const mapColumns = data.map?.columns ?? 0;

  const renderSeatCard = (seat: HallAttendanceSeat & { status: ExamAttendanceStatus | null }) => {
    const interactive =
      canMark && seat.markable && !!seat.studentId && !!seat.examTimeId && !seat.isDisabled;
    const status = seat.markable ? seat.status : null;

    return (
      <button
        key={seat.assignmentId}
        type="button"
        disabled={!interactive}
        className={cn(
          'rounded-lg border-2 text-start transition-colors select-none h-full w-full flex flex-col touch-manipulation relative overflow-hidden',
          'min-h-[148px] p-3 gap-1',
          seat.isDisabled && 'bg-muted/40 border-muted opacity-50',
          !seat.isDisabled && !seat.studentId && 'bg-muted/20 border-dashed border-muted-foreground/30',
          !seat.isDisabled &&
            seat.studentId &&
            !seat.markable &&
            'bg-muted/50 border-muted text-muted-foreground',
          interactive && !status && 'bg-background border-muted-foreground/40 hover:border-primary cursor-pointer active:scale-[0.99]',
          interactive && status && cn(STATUS_STYLES[status], 'cursor-pointer active:scale-[0.99]'),
          !interactive && seat.markable && status && STATUS_STYLES[status],
          !interactive && 'cursor-default'
        )}
        style={
          hasSeatingMap && viewMode === 'map'
            ? { gridRow: seat.rowNumber, gridColumn: seat.columnNumber }
            : undefined
        }
        onClick={(e) => {
          e.preventDefault();
          handleSeatTap(seat);
        }}
        onPointerDown={(e) => {
          // Ignore secondary button / non-primary pointers
          if (e.button !== 0 && e.pointerType === 'mouse') return;
          handlePointerDown(seat);
        }}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onContextMenu={(e) => {
          if (!interactive) return;
          e.preventDefault();
          clearLongPressTimer();
          longPressFiredRef.current = false;
          setStatusPickerStudentId(seat.studentId);
        }}
        aria-label={
          seat.fullName
            ? `${seat.fullName}, seat ${seat.seatNumber}`
            : `${t('exams.attendance.seatNumber')} ${seat.seatNumber}`
        }
      >
        <div className="flex items-start justify-between gap-2 pointer-events-none">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={cn(
                'inline-flex items-center justify-center rounded-md bg-muted/80 px-1.5 font-semibold tabular-nums shrink-0',
                'text-sm h-7 min-w-7'
              )}
            >
              {seat.seatNumber}
            </span>
            {status && (
              <span className="inline-flex items-center gap-1 text-xs font-medium shrink-0">
                {STATUS_ICONS[status]}
                <span className="hidden sm:inline">{t(STATUS_LABEL_KEYS[status])}</span>
              </span>
            )}
          </div>
          {interactive && (
            <span className="text-[10px] sm:text-xs text-muted-foreground shrink-0 px-1 py-0.5">
              {t('exams.attendance.hallSetStatus')}
            </span>
          )}
        </div>

        <div className="flex-1 w-full min-w-0 text-start pointer-events-none space-y-0.5">
          {seat.fullName ? (
            <>
              <div className="font-semibold leading-snug text-foreground text-sm sm:text-base break-words">
                {seat.fullName}
              </div>
              {seat.fatherName && (
                <div className="text-xs sm:text-sm text-muted-foreground break-words">
                  {t('exams.fatherName')}: {seat.fatherName}
                </div>
              )}
              {seat.rollNumber && (
                <div className="text-xs sm:text-sm text-muted-foreground">
                  {t('exams.rollNumbers.rollNumber')}: {seat.rollNumber}
                </div>
              )}
              {seat.admissionNo && (
                <div className="text-xs sm:text-sm text-muted-foreground break-all">
                  {t('exams.admissionNo')}: {seat.admissionNo}
                </div>
              )}
              {seat.className && (
                <div className="text-xs sm:text-sm text-muted-foreground break-words">
                  {seat.className}
                </div>
              )}
              {hasSeatingMap && (
                <div className="text-[10px] sm:text-xs text-muted-foreground pt-0.5">
                  {t('exams.attendance.hallRow')} {seat.rowNumber}
                  {' · '}
                  {t('exams.attendance.hallColumn')} {seat.columnNumber}
                </div>
              )}
            </>
          ) : (
            <div className="text-muted-foreground text-xs mt-1">
              {seat.isDisabled
                ? t('exams.attendance.hallDisabledSeat')
                : t('exams.attendance.hallEmptySeat')}
            </div>
          )}

          {seat.studentId && !seat.markable && !seat.isDisabled && (
            <div className="text-[10px] text-amber-700 dark:text-amber-400 mt-1">
              {t('exams.attendance.hallSeatNotMarkable')}
            </div>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">
            {t('exams.attendance.hallPresent')}: {counts.present}
          </Badge>
          <Badge variant="secondary">
            {t('exams.attendance.hallAbsent')}: {counts.absent}
          </Badge>
          <Badge variant="outline">
            {t('exams.attendance.hallUnmarked')}: {counts.unmarked}
          </Badge>
          <Badge variant="outline">
            {t('exams.attendance.hallTotal')}: {counts.total}
          </Badge>
          {data.session.classCount > 1 && (
            <Badge variant="outline">
              {t('exams.attendance.hallClasses') || 'Classes'}: {data.session.classCount}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-[5.5rem]">
            {syncState === 'saving' && (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>{t('exams.attendance.hallSaving')}</span>
              </>
            )}
            {syncState === 'saved' && (
              <>
                <Cloud className="h-3.5 w-3.5" />
                <span>{t('exams.attendance.hallSaved')}</span>
              </>
            )}
            {syncState === 'error' && (
              <button
                type="button"
                className="flex items-center gap-1 text-destructive"
                onClick={() => void flushPending()}
              >
                <CloudOff className="h-3.5 w-3.5" />
                <span>{t('exams.attendance.hallRetry')}</span>
              </button>
            )}
          </div>

          {hasSeatingMap && (
            <div className="inline-flex rounded-lg border p-0.5">
              <Button
                type="button"
                size="sm"
                variant={viewMode === 'map' ? 'default' : 'ghost'}
                className="h-8 px-2.5"
                onClick={() => setViewMode('map')}
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline ml-1.5">{t('exams.attendance.hallMapView')}</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant={viewMode === 'walk' ? 'default' : 'ghost'}
                className="h-8 px-2.5"
                onClick={() => setViewMode('walk')}
              >
                <Rows3 className="h-4 w-4" />
                <span className="hidden sm:inline ml-1.5">{t('exams.attendance.hallWalkView')}</span>
              </Button>
            </div>
          )}

          {canMark && (
            <Button type="button" size="sm" onClick={() => setFinishDialogOpen(true)}>
              {t('exams.attendance.hallFinish')}
            </Button>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{t('exams.attendance.hallTapHint')}</p>

      {viewMode === 'walk' ? (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1.5 w-full sm:max-w-[220px]">
              <Label htmlFor="hall-walk-axis">
                {t('exams.attendance.hallWalkBy') || 'Walk by'}
              </Label>
              <Select
                value={walkAxis}
                onValueChange={(value) => setWalkAxis(value as WalkAxis)}
              >
                <SelectTrigger id="hall-walk-axis">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="row">
                    {t('exams.attendance.hallWalkByRow') || 'Row (left to right)'}
                  </SelectItem>
                  <SelectItem value="column">
                    {t('exams.attendance.hallWalkByColumn') || 'Column (top to bottom)'}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground sm:pb-2">
              {walkAxis === 'column'
                ? t('exams.attendance.hallWalkByColumnHint') ||
                  'Walk one column at a time (top to bottom).'
                : t('exams.attendance.hallWalkByRowHint') ||
                  'Walk one row at a time (left to right).'}
            </p>
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentSliceIndex <= 0}
              onClick={() => setCurrentSliceIndex((i) => Math.max(0, i - 1))}
            >
              {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              <span className="hidden sm:inline ml-1">
                {walkAxis === 'column'
                  ? t('exams.attendance.hallPrevColumn') || 'Previous column'
                  : t('exams.attendance.hallPrevRow')}
              </span>
            </Button>
            <div className="text-sm font-medium text-center">
              {walkAxis === 'column' ? (
                <>
                  {t('exams.attendance.hallColumn') || 'Column'} {currentSlice}{' '}
                </>
              ) : hasSeatingMap ? (
                <>
                  {t('exams.attendance.hallRow')} {currentSlice}{' '}
                </>
              ) : (
                <>
                  {currentSliceSeats[0]?.className || t('exams.attendance.hallRow')}{' '}
                </>
              )}
              <span className="text-muted-foreground font-normal">
                ({currentSliceIndex + 1}/{walkableSlices.length})
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentSliceIndex >= walkableSlices.length - 1}
              onClick={() =>
                setCurrentSliceIndex((i) => Math.min(walkableSlices.length - 1, i + 1))
              }
            >
              <span className="hidden sm:inline mr-1">
                {walkAxis === 'column'
                  ? t('exams.attendance.hallNextColumn') || 'Next column'
                  : t('exams.attendance.hallNextRow')}
              </span>
              {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
          <div
            className={cn(
              walkAxis === 'row' && hasSeatingMap && mapColumns > 0
                ? 'overflow-x-auto -mx-1 px-1 pb-2'
                : undefined
            )}
          >
            <div
              className={cn(
                'grid gap-2',
                walkAxis === 'column'
                  ? 'grid-cols-1 max-w-xl mx-auto w-full'
                  : hasSeatingMap && mapColumns > 0
                    ? 'min-w-max'
                    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
              )}
              style={
                walkAxis === 'row' && hasSeatingMap && mapColumns > 0
                  ? {
                      gridTemplateColumns: `repeat(${Math.max(mapColumns, currentSliceSeats.length)}, minmax(160px, 180px))`,
                    }
                  : undefined
              }
            >
              {currentSliceSeats.map((seat) => renderSeatCard(seat))}
            </div>
          </div>
        </div>
      ) : (
        <div className="overflow-auto -mx-1 px-1 pb-2 max-h-[70vh]">
          <div
            className="grid gap-3 min-w-max"
            style={{
              gridTemplateColumns: `repeat(${mapColumns || 4}, minmax(180px, 200px))`,
              gridAutoRows: 'minmax(148px, auto)',
              gridTemplateRows:
                mapRows > 0 ? `repeat(${mapRows}, minmax(148px, auto))` : undefined,
            }}
          >
            {seatsWithStatus.map((seat) => renderSeatCard(seat))}
          </div>
        </div>
      )}

      <Dialog open={!!statusPickerStudentId} onOpenChange={(open) => !open && setStatusPickerStudentId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('exams.attendance.hallSetStatus')}</DialogTitle>
            <DialogDescription>
              {pickerSeat?.fullName}
              {pickerSeat?.className ? ` · ${pickerSeat.className}` : ''}
              {pickerSeat?.seatNumber != null
                ? ` · ${t('exams.attendance.seatNumber')} ${pickerSeat.seatNumber}`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(STATUS_STYLES) as ExamAttendanceStatus[]).map((status) => (
              <Button
                key={status}
                type="button"
                variant="outline"
                className={cn('h-12 justify-start gap-2', STATUS_STYLES[status])}
                onClick={() => {
                  if (pickerSeat) applyStatus(pickerSeat, status);
                  setStatusPickerStudentId(null);
                }}
              >
                {STATUS_ICONS[status]}
                {t(STATUS_LABEL_KEYS[status])}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setStatusPickerStudentId(null)}>
              {t('common.cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={finishDialogOpen} onOpenChange={setFinishDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('exams.attendance.hallFinishTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {counts.unmarked > 0
                ? t('exams.attendance.hallFinishUnmarkedConfirm', { count: counts.unmarked })
                : t('exams.attendance.hallFinishAllMarked')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            {counts.unmarked > 0 && (
              <Button type="button" variant="outline" onClick={() => void handleFinish(false)}>
                {t('exams.attendance.hallFinishKeepUnmarked')}
              </Button>
            )}
            <AlertDialogAction onClick={() => void handleFinish(counts.unmarked > 0)}>
              {counts.unmarked > 0
                ? t('exams.attendance.hallMarkRemainingAbsent')
                : t('exams.attendance.hallFinish')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
