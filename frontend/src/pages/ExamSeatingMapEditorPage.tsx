import {
  AlertCircle,
  ArrowLeft,
  ArrowLeftRight,
  CheckCircle2,
  FileSpreadsheet,
  Lock,
  RefreshCw,
  Save,
  Search,
  Wand2,
  X,
  Grid3x3,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ReportProgressDialog } from '@/components/reports/ReportProgressDialog';
import { PageHeader } from '@/components/layout/PageHeader';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  useConfirmMapRollNumbers,
  useExamSeatingMap,
  useExamSeatingMapReport,
  useExamSeatingReportData,
  useExamSeatingSolveStatus,
  useFinalizeExamSeatingMap,
  usePreviewMapRollNumbers,
  useReopenExamSeatingMap,
  useSolveExamSeatingMap,
  useSyncExamSeatingAssignments,
  useSyncExamSeatingClassColors,
  useSyncExamSeatingMapClasses,
  useUpdateExamSeatingMap,
} from '@/hooks/useExamSeating';
import { useExamClasses } from '@/hooks/useExams';
import { useHasPermission } from '@/hooks/usePermissions';
import { useLanguage } from '@/hooks/useLanguage';
import { showToast } from '@/lib/toast';
import { Checkbox } from '@/components/ui/checkbox';
import type {
  ExamSeatingClassColor,
  ExamSeatingMapDetail,
  MapRollNumberPreviewResponse,
  SyncExamSeatingAssignmentItem,
} from '@/types/domain/examSeating';

const DEFAULT_CLASS_COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
  '#F97316',
];

type DraftAssignment = SyncExamSeatingAssignmentItem & {
  seatNumber: number;
  studentName?: string | null;
  className?: string | null;
  examClassId?: string | null;
};

function resolveMainClassId(examClass: {
  id: string;
  classAcademicYear?: { classId?: string; class?: { id?: string; name?: string } | null } | null;
}): string {
  return (
    examClass.classAcademicYear?.classId ||
    examClass.classAcademicYear?.class?.id ||
    examClass.id
  );
}

function resolveMainClassName(
  examClass: {
    id: string;
    classAcademicYear?: { class?: { name?: string } | null } | null;
  },
  fallback?: string | null
): string {
  return examClass.classAcademicYear?.class?.name || fallback || examClass.id;
}

const isMapEditable = (map: ExamSeatingMapDetail | null | undefined): boolean => {
  if (!map) return false;
  return map.status === 'draft' || map.status === 'generated';
};

export function ExamSeatingMapEditorPage() {
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();
  const { examId, mapId } = useParams<{ examId: string; mapId: string }>();

  const { data: mapDetail, isLoading, refetch } = useExamSeatingMap(examId, mapId);
  const { data: examClasses = [] } = useExamClasses(examId);
  const { data: reportData } = useExamSeatingReportData(examId, mapId);

  const mapExamClasses = useMemo(() => {
    const allowed = new Set(mapDetail?.examClassIds ?? []);
    if (allowed.size === 0) return [];
    return examClasses.filter((examClass) => allowed.has(examClass.id));
  }, [examClasses, mapDetail?.examClassIds]);

  const [draftAssignments, setDraftAssignments] = useState<DraftAssignment[]>([]);
  const [classColors, setClassColors] = useState<ExamSeatingClassColor[]>([]);
  const [draftMapClassIds, setDraftMapClassIds] = useState<string[]>([]);
  const [selectedCell, setSelectedCell] = useState<{ row: number; column: number } | null>(null);
  const [movingStudentId, setMovingStudentId] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [previewData, setPreviewData] = useState<MapRollNumberPreviewResponse | null>(null);
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [showResizeDialog, setShowResizeDialog] = useState(false);
  const [showReportProgress, setShowReportProgress] = useState(false);
  const [awaitingSolve, setAwaitingSolve] = useState(false);
  const [draftRows, setDraftRows] = useState('');
  const [draftColumns, setDraftColumns] = useState('');
  const [draftStartSeat, setDraftStartSeat] = useState('');

  const syncAssignmentsMutation = useSyncExamSeatingAssignments();
  const syncColorsMutation = useSyncExamSeatingClassColors();
  const syncMapClassesMutation = useSyncExamSeatingMapClasses();
  const updateMapMutation = useUpdateExamSeatingMap();
  const solveMutation = useSolveExamSeatingMap();
  const finalizeMutation = useFinalizeExamSeatingMap();
  const reopenMutation = useReopenExamSeatingMap();
  const previewRollMutation = usePreviewMapRollNumbers();
  const confirmRollMutation = useConfirmMapRollNumbers();

  const {
    generateSeatingMapReport,
    isGenerating,
    progress,
    status: reportStatus,
    fileName,
    error: reportError,
    downloadReport,
    reset: resetReport,
  } = useExamSeatingMapReport();

  const isSolverRunning =
    awaitingSolve ||
    mapDetail?.solverStatus === 'pending' ||
    mapDetail?.solverStatus === 'running';
  const { data: solveStatus } = useExamSeatingSolveStatus(
    examId,
    mapId,
    isSolverRunning,
    isSolverRunning ? 1500 : false
  );

  const hasReadPermission = useHasPermission('exam_seating_maps.read');
  const hasAssignPermission = useHasPermission('exam_seating_maps.assign');
  const hasUpdatePermission = useHasPermission('exam_seating_maps.update');
  const hasPrintPermission = useHasPermission('exam_seating_maps.print');

  const editable = isMapEditable(mapDetail);

  useEffect(() => {
    if (!mapDetail) return;
    setDraftAssignments(
      mapDetail.assignments.map((assignment) => ({
        rowNumber: assignment.rowNumber,
        columnNumber: assignment.columnNumber,
        seatNumber: assignment.seatNumber,
        examStudentId: assignment.examStudentId,
        isLocked: assignment.isLocked,
        isDisabled: assignment.isDisabled,
        studentName: assignment.examStudent?.fullName ?? null,
        className: assignment.examStudent?.className ?? null,
        examClassId: assignment.examStudent?.examClassId ?? null,
      }))
    );
    setDraftMapClassIds(mapDetail.examClassIds ?? []);
    setDraftRows(String(mapDetail.rows));
    setDraftColumns(String(mapDetail.columns));
    setDraftStartSeat(String(mapDetail.startSeatNumber));
  }, [mapDetail]);

  useEffect(() => {
    if (!mapDetail) return;

    if (mapExamClasses.length === 0) {
      setClassColors(
        mapDetail.classColors.filter((color) =>
          (mapDetail.examClassIds ?? []).includes(color.examClassId)
        )
      );
      return;
    }

    const existingByExamClassId = new Map(
      mapDetail.classColors.map((color) => [color.examClassId, color])
    );
    const colorByMainClassId = new Map<string, string>();
    let paletteIndex = 0;

    mapExamClasses.forEach((examClass) => {
      const mainClassId = resolveMainClassId(examClass);
      if (colorByMainClassId.has(mainClassId)) return;
      const existing = existingByExamClassId.get(examClass.id);
      colorByMainClassId.set(
        mainClassId,
        existing?.colorHex || DEFAULT_CLASS_COLORS[paletteIndex % DEFAULT_CLASS_COLORS.length]
      );
      paletteIndex += 1;
    });

    setClassColors(
      mapExamClasses.map((examClass) => {
        const mainClassId = resolveMainClassId(examClass);
        const existing = existingByExamClassId.get(examClass.id);
        return {
          id: existing?.id || `temp-${examClass.id}`,
          organizationId: existing?.organizationId || mapDetail.organizationId,
          schoolId: existing?.schoolId || mapDetail.schoolId,
          examSeatingMapId: existing?.examSeatingMapId || mapDetail.id,
          examClassId: examClass.id,
          colorHex: colorByMainClassId.get(mainClassId) || DEFAULT_CLASS_COLORS[0],
          createdAt: existing?.createdAt || new Date(),
          updatedAt: existing?.updatedAt || new Date(),
          className: resolveMainClassName(examClass, existing?.className),
        };
      })
    );
  }, [mapDetail, mapExamClasses]);

  const solveCompletionHandledRef = useRef(false);

  useEffect(() => {
    const polledStatus = solveStatus?.solverStatus;
    const mapStatus = mapDetail?.solverStatus;
    const shouldWatch =
      awaitingSolve || mapStatus === 'pending' || mapStatus === 'running';

    if (!shouldWatch) {
      solveCompletionHandledRef.current = false;
      return;
    }

    const terminalStatus =
      polledStatus === 'succeeded' || polledStatus === 'failed'
        ? polledStatus
        : mapStatus === 'succeeded' || mapStatus === 'failed'
          ? mapStatus
          : null;

    if (!terminalStatus) return;
    if (solveCompletionHandledRef.current) return;
    solveCompletionHandledRef.current = true;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 20;

    const finish = (refreshedMap: ExamSeatingMapDetail | null | undefined) => {
      if (cancelled) return;
      if (terminalStatus === 'succeeded') {
        const assigned =
          refreshedMap?.assignments.filter((a) => a.examStudentId && !a.isDisabled).length ?? 0;
        showToast.success(
          t('exams.seatingMaps.solveCompleted', { count: assigned }) ||
            `Seating solve completed (${assigned} seated)`
        );
      } else {
        showToast.error(
          (solveStatus?.solverDiagnostics?.error as string | undefined) ||
            (solveStatus?.solverDiagnostics?.message as string | undefined) ||
            (refreshedMap?.solverDiagnostics?.message as string | undefined) ||
            t('toast.seatingMapSolveFailed')
        );
      }
      setAwaitingSolve(false);
    };

    const pullUntilReady = async () => {
      while (!cancelled && attempts < maxAttempts) {
        attempts += 1;
        try {
          const refreshed = await refetch();
          const mapSolverStatus = refreshed.data?.solverStatus;
          if (
            mapSolverStatus === 'succeeded' ||
            mapSolverStatus === 'failed' ||
            terminalStatus === 'failed'
          ) {
            finish(refreshed.data);
            return;
          }
        } catch {
          // Keep retrying while the solver result may still be applying.
        }
        await new Promise((resolve) => {
          window.setTimeout(resolve, 1000);
        });
      }

      if (!cancelled) {
        const last = await refetch();
        finish(last.data);
      }
    };

    void pullUntilReady();

    return () => {
      cancelled = true;
    };
  }, [
    awaitingSolve,
    mapDetail?.solverStatus,
    solveStatus?.solverStatus,
    solveStatus?.solverDiagnostics,
    refetch,
    t,
  ]);

  const assignmentByCell = useMemo(() => {
    const map = new Map<string, DraftAssignment>();
    draftAssignments.forEach((assignment) => {
      map.set(`${assignment.rowNumber}-${assignment.columnNumber}`, assignment);
    });
    return map;
  }, [draftAssignments]);

  const examClassIdToMainClassId = useMemo(() => {
    const map = new Map<string, string>();
    examClasses.forEach((examClass) => {
      map.set(examClass.id, resolveMainClassId(examClass));
    });
    return map;
  }, [examClasses]);

  const colorByExamClassId = useMemo(() => {
    const colorByMainClassId = new Map<string, string>();
    classColors.forEach((color) => {
      const mainId = examClassIdToMainClassId.get(color.examClassId) || color.examClassId;
      if (!colorByMainClassId.has(mainId)) {
        colorByMainClassId.set(mainId, color.colorHex);
      }
    });

    const map = new Map<string, string>();
    classColors.forEach((color) => {
      const mainId = examClassIdToMainClassId.get(color.examClassId) || color.examClassId;
      map.set(color.examClassId, colorByMainClassId.get(mainId) || color.colorHex);
    });
    // Also map any exam class that might not yet be in classColors
    examClassIdToMainClassId.forEach((mainId, examClassId) => {
      if (!map.has(examClassId) && colorByMainClassId.has(mainId)) {
        map.set(examClassId, colorByMainClassId.get(mainId)!);
      }
    });
    return map;
  }, [classColors, examClassIdToMainClassId]);

  const mainClassColorRows = useMemo(() => {
    const rows = new Map<
      string,
      { mainClassId: string; className: string; colorHex: string; examClassIds: string[] }
    >();

    const preferredHex = new Map<string, string>();
    classColors.forEach((color) => {
      const mainId = examClassIdToMainClassId.get(color.examClassId) || color.examClassId;
      if (!preferredHex.has(mainId)) {
        preferredHex.set(mainId, color.colorHex);
      }
    });

    mapExamClasses.forEach((examClass, index) => {
      const mainClassId = resolveMainClassId(examClass);
      const className = resolveMainClassName(examClass);
      const existing = rows.get(mainClassId);
      if (existing) {
        existing.examClassIds.push(examClass.id);
        return;
      }
      rows.set(mainClassId, {
        mainClassId,
        className,
        colorHex:
          preferredHex.get(mainClassId) ||
          DEFAULT_CLASS_COLORS[index % DEFAULT_CLASS_COLORS.length],
        examClassIds: [examClass.id],
      });
    });

    // Include colors for exam classes not in the current mapExamClasses list
    classColors.forEach((color) => {
      const mainId = examClassIdToMainClassId.get(color.examClassId) || color.examClassId;
      if (rows.has(mainId)) return;
      rows.set(mainId, {
        mainClassId: mainId,
        className: color.className || color.examClassId,
        colorHex: color.colorHex,
        examClassIds: [color.examClassId],
      });
    });

    return Array.from(rows.values()).sort((a, b) =>
      a.className.localeCompare(b.className, undefined, { sensitivity: 'base' })
    );
  }, [classColors, mapExamClasses, examClassIdToMainClassId]);

  const filteredUnassignedStudents = useMemo(() => {
    if (!mapDetail?.unassignedStudents) return [];
    const assignedIds = new Set(
      draftAssignments
        .filter((assignment) => assignment.examStudentId && !assignment.isDisabled)
        .map((assignment) => assignment.examStudentId as string)
    );
    const term = studentSearch.trim().toLowerCase();
    return mapDetail.unassignedStudents
      .filter((student) => !assignedIds.has(student.examStudentId))
      .filter((student) => {
        if (!term) return true;
        return (
          student.fullName.toLowerCase().includes(term) ||
          student.className.toLowerCase().includes(term) ||
          (student.examRollNumber?.toLowerCase().includes(term) ?? false)
        );
      });
  }, [draftAssignments, mapDetail?.unassignedStudents, studentSearch]);

  const groupedUnassignedStudents = useMemo(() => {
    const groups = new Map<
      string,
      {
        mainClassId: string;
        examClassId: string;
        className: string;
        students: typeof filteredUnassignedStudents;
      }
    >();

    filteredUnassignedStudents.forEach((student) => {
      const matchedExamClass = examClasses.find((examClass) => examClass.id === student.examClassId);
      const mainClassId = matchedExamClass
        ? resolveMainClassId(matchedExamClass)
        : examClassIdToMainClassId.get(student.examClassId) ||
          student.className ||
          student.examClassId ||
          'unknown';
      const className = matchedExamClass
        ? resolveMainClassName(matchedExamClass, student.className)
        : student.className || t('exams.seatingMaps.unknownClass') || 'Unknown class';
      const existing = groups.get(mainClassId);
      if (existing) {
        existing.students.push(student);
        return;
      }
      groups.set(mainClassId, {
        mainClassId,
        examClassId: student.examClassId,
        className,
        students: [student],
      });
    });

    return Array.from(groups.values()).sort((a, b) =>
      a.className.localeCompare(b.className, undefined, { sensitivity: 'base' })
    );
  }, [examClassIdToMainClassId, examClasses, filteredUnassignedStudents, t]);

  const enabledEmptySeatCount = useMemo(
    () =>
      draftAssignments.filter(
        (assignment) => !assignment.isDisabled && !assignment.examStudentId && !assignment.isLocked
      ).length,
    [draftAssignments]
  );

  const conflictCount = useMemo(() => {
    const diagnostics = solveStatus?.solverDiagnostics ?? mapDetail?.solverDiagnostics;
    return diagnostics?.conflictsCount ?? 0;
  }, [mapDetail?.solverDiagnostics, solveStatus?.solverDiagnostics]);

  const updateAssignmentAt = useCallback(
    (row: number, column: number, updater: (current: DraftAssignment) => DraftAssignment) => {
      setDraftAssignments((prev) =>
        prev.map((assignment) =>
          assignment.rowNumber === row && assignment.columnNumber === column
            ? updater(assignment)
            : assignment
        )
      );
    },
    []
  );

  const handleCellClick = (row: number, column: number) => {
    if (!editable || !hasAssignPermission) return;
    const current = assignmentByCell.get(`${row}-${column}`);
    if (!current) return;

    if (movingStudentId) {
      const source = draftAssignments.find(
        (assignment) => assignment.examStudentId === movingStudentId && !assignment.isDisabled
      );
      if (!source) {
        setMovingStudentId(null);
        return;
      }
      if (current.isDisabled || current.isLocked) {
        setMovingStudentId(null);
        return;
      }

      setDraftAssignments((prev) =>
        prev.map((assignment) => {
          if (assignment.rowNumber === source.rowNumber && assignment.columnNumber === source.columnNumber) {
            return {
              ...assignment,
              examStudentId: current.examStudentId,
              studentName: current.studentName ?? null,
              className: current.className ?? null,
              examClassId: current.examClassId ?? null,
            };
          }
          if (assignment.rowNumber === row && assignment.columnNumber === column) {
            return {
              ...assignment,
              examStudentId: source.examStudentId,
              studentName: source.studentName ?? null,
              className: source.className ?? null,
              examClassId: source.examClassId ?? null,
            };
          }
          return assignment;
        })
      );
      setMovingStudentId(null);
      setSelectedCell({ row, column });
      return;
    }

    if (selectedCell?.row === row && selectedCell.column === column) {
      setSelectedCell(null);
      return;
    }
    setSelectedCell({ row, column });
  };

  const handleAssignStudent = (examStudentId: string, student: {
    fullName: string;
    className: string;
    examClassId: string;
  }) => {
    if (!editable || !hasAssignPermission || !selectedCell) return;
    const current = assignmentByCell.get(`${selectedCell.row}-${selectedCell.column}`);
    if (!current || current.isDisabled || current.isLocked) return;

    updateAssignmentAt(selectedCell.row, selectedCell.column, (assignment) => ({
      ...assignment,
      examStudentId,
      studentName: student.fullName,
      className: student.className,
      examClassId: student.examClassId,
      isDisabled: false,
    }));
  };

  const handleToggleDisabled = () => {
    if (!selectedCell || !editable || !hasAssignPermission) return;
    const current = assignmentByCell.get(`${selectedCell.row}-${selectedCell.column}`);
    if (!current) return;
    const nextDisabled = !current.isDisabled;
    updateAssignmentAt(selectedCell.row, selectedCell.column, (assignment) => ({
      ...assignment,
      isDisabled: nextDisabled,
      isLocked: nextDisabled ? false : assignment.isLocked,
      examStudentId: nextDisabled ? null : assignment.examStudentId,
      studentName: nextDisabled ? null : assignment.studentName,
      className: nextDisabled ? null : assignment.className,
      examClassId: nextDisabled ? null : assignment.examClassId,
    }));
  };

  const handleToggleLocked = () => {
    if (!selectedCell || !editable || !hasAssignPermission) return;
    const current = assignmentByCell.get(`${selectedCell.row}-${selectedCell.column}`);
    if (!current || current.isDisabled || !current.examStudentId) return;
    updateAssignmentAt(selectedCell.row, selectedCell.column, (assignment) => ({
      ...assignment,
      isLocked: !assignment.isLocked,
    }));
  };

  const handleClearSeat = () => {
    if (!selectedCell || !editable || !hasAssignPermission) return;
    const current = assignmentByCell.get(`${selectedCell.row}-${selectedCell.column}`);
    if (!current || current.isLocked || current.isDisabled) return;
    updateAssignmentAt(selectedCell.row, selectedCell.column, (assignment) => ({
      ...assignment,
      examStudentId: null,
      studentName: null,
      className: null,
      examClassId: null,
      isDisabled: true,
      isLocked: false,
    }));
  };

  const handleEnableAllSeats = () => {
    if (!editable || !hasAssignPermission) return;
    setDraftAssignments((prev) =>
      prev.map((assignment) =>
        assignment.isLocked || assignment.examStudentId
          ? assignment
          : { ...assignment, isDisabled: false }
      )
    );
  };

  const handleDisableAllEmptySeats = () => {
    if (!editable || !hasAssignPermission) return;
    setDraftAssignments((prev) =>
      prev.map((assignment) =>
        assignment.isLocked || assignment.examStudentId
          ? assignment
          : {
              ...assignment,
              isDisabled: true,
              examStudentId: null,
              studentName: null,
              className: null,
              examClassId: null,
            }
      )
    );
  };

  const handleSaveAssignments = async () => {
    if (!examId || !mapId || !mapDetail) return null;
    try {
      const saved = await syncAssignmentsMutation.mutateAsync({
        examId,
        mapId,
        revision: mapDetail.revision,
        assignments: draftAssignments.map((assignment) => ({
          rowNumber: assignment.rowNumber,
          columnNumber: assignment.columnNumber,
          examStudentId: assignment.examStudentId,
          isLocked: assignment.isLocked,
          isDisabled: assignment.isDisabled,
        })),
      });
      await refetch();
      return saved;
    } catch {
      // Toast is shown by mutation onError.
      return null;
    }
  };

  const handleSaveClassColors = async () => {
    if (!examId || !mapId) return;
    await syncColorsMutation.mutateAsync({
      examId,
      mapId,
      colors: classColors.map((color) => ({
        examClassId: color.examClassId,
        colorHex: color.colorHex,
      })),
    });
    await refetch();
  };

  const handleSaveMapClasses = async () => {
    if (!examId || !mapId || draftMapClassIds.length === 0) return;
    try {
      await syncMapClassesMutation.mutateAsync({
        examId,
        mapId,
        examClassIds: draftMapClassIds,
      });
      await refetch();
    } catch {
      // Toast is shown by mutation onError.
    }
  };

  const parsedDraftRows = Number.parseInt(draftRows, 10);
  const parsedDraftColumns = Number.parseInt(draftColumns, 10);
  const parsedDraftStartSeat = Number.parseInt(draftStartSeat, 10);
  const dimensionsDirty =
    !!mapDetail &&
    (parsedDraftRows !== mapDetail.rows ||
      parsedDraftColumns !== mapDetail.columns ||
      parsedDraftStartSeat !== mapDetail.startSeatNumber);
  const dimensionsValid =
    Number.isInteger(parsedDraftRows) &&
    parsedDraftRows >= 1 &&
    parsedDraftRows <= 100 &&
    Number.isInteger(parsedDraftColumns) &&
    parsedDraftColumns >= 1 &&
    parsedDraftColumns <= 100 &&
    Number.isInteger(parsedDraftStartSeat) &&
    parsedDraftStartSeat >= 1;

  const applyDimensionsUpdate = async () => {
    if (!examId || !mapId || !mapDetail || !dimensionsValid) return;
    try {
      await updateMapMutation.mutateAsync({
        examId,
        mapId,
        data: {
          rows: parsedDraftRows,
          columns: parsedDraftColumns,
          startSeatNumber: parsedDraftStartSeat,
        },
      });
      setSelectedCell(null);
      setMovingStudentId(null);
      setShowResizeDialog(false);
      await refetch();
    } catch {
      // Toast is shown by mutation onError.
    }
  };

  const handleSaveDimensions = () => {
    if (!editable || !hasUpdatePermission || !mapDetail || !dimensionsValid || !dimensionsDirty) return;

    const hasOccupiedSeats = draftAssignments.some((assignment) => !!assignment.examStudentId);
    if (hasOccupiedSeats) {
      setShowResizeDialog(true);
      return;
    }
    void applyDimensionsUpdate();
  };

  const toggleDraftMapClass = (examClassId: string, checked: boolean) => {
    setDraftMapClassIds((prev) => {
      if (checked) {
        return prev.includes(examClassId) ? prev : [...prev, examClassId];
      }
      return prev.filter((id) => id !== examClassId);
    });
  };

  const handleSolve = async () => {
    if (!examId || !mapId || !mapDetail) return;

    const studentsToPlace = filteredUnassignedStudents.length;
    if (studentsToPlace > 0 && enabledEmptySeatCount === 0) {
      showToast.error(t('exams.seatingMaps.enableSeatsBeforeSolve'));
      return;
    }

    if (studentsToPlace > enabledEmptySeatCount) {
      showToast.error(
        t('exams.seatingMaps.notEnoughEnabledSeats', {
          students: studentsToPlace,
          seats: enabledEmptySeatCount,
        })
      );
      return;
    }

    try {
      setAwaitingSolve(true);
      solveCompletionHandledRef.current = false;
      const saved = await syncAssignmentsMutation.mutateAsync({
        examId,
        mapId,
        revision: mapDetail.revision,
        assignments: draftAssignments.map((assignment) => ({
          rowNumber: assignment.rowNumber,
          columnNumber: assignment.columnNumber,
          examStudentId: assignment.examStudentId,
          isLocked: assignment.isLocked,
          isDisabled: assignment.isDisabled,
        })),
      });
      if (!saved.inputChecksum) {
        setAwaitingSolve(false);
        showToast.error(t('toast.seatingMapSolveFailed'));
        return;
      }
      await solveMutation.mutateAsync({
        examId,
        mapId,
        revision: saved.revision,
        inputChecksum: saved.inputChecksum,
        strictMode: true,
      });
      // Keep awaitingSolve true so status polling continues until terminal state,
      // then the effect above refetches the map and updates the draft grid.
    } catch {
      setAwaitingSolve(false);
      // Toast is shown by mutation onError.
    }
  };

  const handleFinalize = async () => {
    if (!examId || !mapId || !mapDetail) return;
    await finalizeMutation.mutateAsync({
      examId,
      mapId,
      revision: mapDetail.revision,
    });
    setShowFinalizeDialog(false);
    await refetch();
  };

  const handlePreviewRollNumbers = async () => {
    if (!examId || !mapId) return;
    const result = await previewRollMutation.mutateAsync({ examId, mapId });
    setPreviewData(result);
    setShowPreviewDialog(true);
  };

  const handleConfirmRollNumbers = async () => {
    if (!examId || !mapId || !mapDetail?.inputChecksum) return;
    await confirmRollMutation.mutateAsync({
      examId,
      mapId,
      revision: mapDetail.revision,
      inputChecksum: mapDetail.inputChecksum,
    });
    setShowConfirmDialog(false);
    setShowPreviewDialog(false);
    await refetch();
  };

  const handleExport = async (reportType: 'excel') => {
    if (!reportData || !examId || !mapId) return;

    // Persist on-screen class colors so Excel/PDF fills match the editor
    // (server rebuilds report data from DB; unsaved palette defaults would be missing).
    if (classColors.length > 0) {
      try {
        await syncColorsMutation.mutateAsync({
          examId,
          mapId,
          colors: classColors.map((color) => ({
            examClassId: color.examClassId,
            colorHex: color.colorHex,
          })),
        });
      } catch {
        // Continue export with whatever is already saved; backend also applies
        // default palette fills when colors are missing.
      }
    }

    setShowReportProgress(true);
    resetReport();
    await generateSeatingMapReport({
      reportData,
      reportType,
      title: `${t('exams.seatingMaps.reportTitle') || 'Seating Map'} - ${reportData.map.name}`,
    });
  };

  const initializeClassColors = () => {
    if (!mapDetail) return;
    const existingByExamClassId = new Map(classColors.map((color) => [color.examClassId, color]));
    const colorByMainClassId = new Map<string, string>();
    let paletteIndex = 0;

    mapExamClasses.forEach((examClass) => {
      const mainClassId = resolveMainClassId(examClass);
      if (colorByMainClassId.has(mainClassId)) return;
      const existing = existingByExamClassId.get(examClass.id);
      colorByMainClassId.set(
        mainClassId,
        existing?.colorHex || DEFAULT_CLASS_COLORS[paletteIndex % DEFAULT_CLASS_COLORS.length]
      );
      paletteIndex += 1;
    });

    const nextColors = mapExamClasses.map((examClass) => {
      const mainClassId = resolveMainClassId(examClass);
      const existing = existingByExamClassId.get(examClass.id);
      return {
        id: existing?.id || `temp-${examClass.id}`,
        organizationId: existing?.organizationId || mapDetail.organizationId,
        schoolId: existing?.schoolId || mapDetail.schoolId,
        examSeatingMapId: existing?.examSeatingMapId || mapDetail.id,
        examClassId: examClass.id,
        colorHex: colorByMainClassId.get(mainClassId) || DEFAULT_CLASS_COLORS[0],
        createdAt: existing?.createdAt || new Date(),
        updatedAt: existing?.updatedAt || new Date(),
        className: resolveMainClassName(examClass, existing?.className),
      };
    });
    setClassColors(nextColors);
  };

  useEffect(() => {
    if (mapExamClasses.length > 0 && classColors.length === 0) {
      initializeClassColors();
    }
  }, [mapExamClasses.length, classColors.length]);

  if (!hasReadPermission) {
    return (
      <div className="container mx-auto p-4 md:p-6 max-w-7xl overflow-x-hidden">
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {t('common.noPermission') || 'You do not have permission to view this page.'}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !mapDetail) {
    return (
      <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  const selectedAssignment = selectedCell
    ? assignmentByCell.get(`${selectedCell.row}-${selectedCell.column}`)
    : undefined;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      <PageHeader
        title={mapDetail.name}
        description={t('exams.seatingMaps.editorDescription') || 'Arrange students on the seating grid'}
        breadcrumbs={[
          { label: t('exams.title') || 'Exams', href: '/exams' },
          { label: t('exams.seatingMaps.title') || 'Seating Maps', href: examId ? `/exams/${examId}/seating-maps` : undefined },
          { label: mapDetail.name },
        ]}
        secondaryActions={[
          {
            label: t('common.back') || 'Back',
            icon: <ArrowLeft className="h-4 w-4" />,
            onClick: () => navigate(examId ? `/exams/${examId}/seating-maps` : '/exams/seating-maps'),
            variant: 'outline',
          },
          {
            label: t('common.refresh') || 'Refresh',
            icon: <RefreshCw className="h-4 w-4" />,
            onClick: () => void refetch(),
            variant: 'outline',
          },
        ]}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">
          {t(`exams.seatingMaps.status.${mapDetail.status}`) || mapDetail.status}
        </Badge>
        <Badge variant="outline">
          {t(`exams.seatingMaps.solver.${mapDetail.solverStatus}`) || mapDetail.solverStatus}
        </Badge>
        <Badge variant="secondary">
          {t('exams.seatingMaps.revision') || 'Revision'}: {mapDetail.revision}
        </Badge>
        {conflictCount > 0 && (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            {t('exams.seatingMaps.conflicts', { count: conflictCount }) || `${conflictCount} conflicts`}
          </Badge>
        )}
      </div>

      {!editable && (mapDetail.status === 'applied' || mapDetail.status === 'finalized') && (
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertTitle>{t('exams.seatingMaps.mapLockedTitle') || 'Map is locked'}</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>
              {t('exams.seatingMaps.mapLockedDescription') ||
                'Applied and finalized maps are read-only. Reopen the map to edit the seating grid.'}
            </span>
            {hasUpdatePermission && (
              <Button
                variant="default"
                size="sm"
                className="flex-shrink-0 w-fit"
                onClick={() => {
                  if (!examId || !mapId) return;
                  void reopenMutation.mutateAsync({ examId, mapId });
                }}
                disabled={reopenMutation.isPending}
              >
                <RefreshCw className={`h-4 w-4 ${reopenMutation.isPending ? 'animate-spin' : ''}`} />
                <span className="ml-2">{t('exams.seatingMaps.reopen') || 'Reopen'}</span>
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col lg:flex-row gap-4">
        <Card className="flex-1 overflow-hidden">
          <CardHeader className="pb-3 space-y-3">
            <div className="flex flex-col gap-1">
              <CardTitle>{t('exams.seatingMaps.grid') || 'Seating Grid'}</CardTitle>
              <CardDescription>
                {mapDetail.rows} × {mapDetail.columns} · {t('exams.seatingMaps.startSeat') || 'Start'}{' '}
                {mapDetail.startSeatNumber}
              </CardDescription>
            </div>
            <TooltipProvider>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {editable && hasAssignPermission && (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-shrink-0"
                          aria-label={t('exams.seatingMaps.enableAllSeats')}
                          onClick={handleEnableAllSeats}
                        >
                          <Grid3x3 className="h-4 w-4" />
                          <span className="hidden md:inline ml-2">{t('exams.seatingMaps.enableAllSeats')}</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="md:hidden">
                        <p>{t('exams.seatingMaps.enableAllSeats')}</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-shrink-0"
                          aria-label={t('exams.seatingMaps.disableAllEmptySeats')}
                          onClick={handleDisableAllEmptySeats}
                        >
                          <X className="h-4 w-4" />
                          <span className="hidden md:inline ml-2">
                            {t('exams.seatingMaps.disableAllEmptySeats')}
                          </span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="md:hidden">
                        <p>{t('exams.seatingMaps.disableAllEmptySeats')}</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-shrink-0"
                          aria-label={t('common.save') || 'Save'}
                          onClick={() => void handleSaveAssignments()}
                          disabled={syncAssignmentsMutation.isPending}
                        >
                          <Save className="h-4 w-4" />
                          <span className="hidden md:inline ml-2">{t('common.save') || 'Save'}</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="md:hidden">
                        <p>{t('common.save') || 'Save'}</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="default"
                          size="sm"
                          className="flex-shrink-0"
                          aria-label={t('exams.seatingMaps.solve') || 'Solve'}
                          onClick={() => void handleSolve()}
                          disabled={solveMutation.isPending || isSolverRunning}
                        >
                          <Wand2 className="h-4 w-4" />
                          <span className="hidden md:inline ml-2">{t('exams.seatingMaps.solve') || 'Solve'}</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="md:hidden">
                        <p>{t('exams.seatingMaps.solve') || 'Solve'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </>
                )}
                {hasUpdatePermission && editable && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-shrink-0"
                        aria-label={t('exams.seatingMaps.finalize') || 'Finalize'}
                        onClick={() => setShowFinalizeDialog(true)}
                        disabled={finalizeMutation.isPending}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="hidden md:inline ml-2">
                          {t('exams.seatingMaps.finalize') || 'Finalize'}
                        </span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="md:hidden">
                      <p>{t('exams.seatingMaps.finalize') || 'Finalize'}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {hasUpdatePermission && (mapDetail.status === 'applied' || mapDetail.status === 'finalized') && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-shrink-0"
                        aria-label={t('exams.seatingMaps.reopen') || 'Reopen for editing'}
                        onClick={() => {
                          if (!examId || !mapId) return;
                          void reopenMutation.mutateAsync({ examId, mapId });
                        }}
                        disabled={reopenMutation.isPending}
                      >
                        <RefreshCw className={`h-4 w-4 ${reopenMutation.isPending ? 'animate-spin' : ''}`} />
                        <span className="hidden md:inline ml-2">
                          {t('exams.seatingMaps.reopen') || 'Reopen'}
                        </span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="md:hidden">
                      <p>{t('exams.seatingMaps.reopen') || 'Reopen for editing'}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {hasAssignPermission && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-shrink-0"
                        aria-label={t('exams.seatingMaps.applyRollNumbers') || 'Apply Roll Numbers'}
                        onClick={() => void handlePreviewRollNumbers()}
                        disabled={previewRollMutation.isPending}
                      >
                        <ArrowLeftRight className="h-4 w-4" />
                        <span className="hidden md:inline ml-2">
                          {t('exams.seatingMaps.applyRollNumbers') || 'Apply Roll Numbers'}
                        </span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="md:hidden">
                      <p>{t('exams.seatingMaps.applyRollNumbers') || 'Apply Roll Numbers'}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {hasPrintPermission && reportData && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-shrink-0"
                        aria-label={t('common.exportExcel') || 'Export Excel'}
                        onClick={() => void handleExport('excel')}
                        disabled={isGenerating}
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        <span className="hidden md:inline ml-2">
                          {t('common.exportExcel') || 'Excel'}
                        </span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="md:hidden">
                      <p>{t('common.exportExcel') || 'Excel'}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </TooltipProvider>
          </CardHeader>
          <CardContent>
            {editable && hasAssignPermission && (
              <p className="mb-3 text-xs text-muted-foreground">
                {t('exams.seatingMaps.enableSeatsHint')}
              </p>
            )}
            <div className="overflow-x-auto">
              <div
                className="inline-grid gap-1 min-w-max"
                style={{ gridTemplateColumns: `repeat(${mapDetail.columns}, minmax(56px, 1fr))` }}
              >
                {Array.from({ length: mapDetail.rows }, (_, rowIndex) => {
                  const row = rowIndex + 1;
                  return Array.from({ length: mapDetail.columns }, (_, colIndex) => {
                    const column = colIndex + 1;
                    const assignment = assignmentByCell.get(`${row}-${column}`);
                    const isSelected = selectedCell?.row === row && selectedCell.column === column;
                    const classColor = assignment?.examClassId
                      ? colorByExamClassId.get(assignment.examClassId)
                      : undefined;

                    let cellClass = 'border bg-muted/40 text-muted-foreground';
                    if (assignment?.isDisabled) {
                      cellClass = 'border bg-muted text-muted-foreground line-through';
                    } else if (assignment?.examStudentId) {
                      cellClass = 'border text-foreground';
                    }

                    return (
                      <button
                        key={`${row}-${column}`}
                        type="button"
                        className={`relative h-14 rounded-md p-1 text-xs transition-colors ${cellClass} ${
                          isSelected ? 'ring-2 ring-primary' : ''
                        } ${editable && hasAssignPermission ? 'cursor-pointer hover:opacity-90' : 'cursor-default'}`}
                        style={{
                          backgroundColor: assignment?.isDisabled
                            ? undefined
                            : classColor
                              ? `${classColor}22`
                              : undefined,
                          borderColor: classColor || undefined,
                        }}
                        onClick={() => handleCellClick(row, column)}
                        title={
                          assignment?.studentName
                            ? `${assignment.studentName} (${assignment.className})`
                            : assignment?.isDisabled
                              ? t('exams.seatingMaps.disabledSeat') || 'Disabled seat'
                              : `${t('exams.seatingMaps.seat') || 'Seat'} ${assignment?.seatNumber ?? ''}`
                        }
                      >
                        <div className="font-semibold">{assignment?.seatNumber}</div>
                        {assignment?.examStudentId && (
                          <div className="truncate text-[10px]">{assignment.studentName}</div>
                        )}
                        {assignment?.isLocked && (
                          <Lock className="absolute top-1 end-1 h-3 w-3 text-muted-foreground" />
                        )}
                      </button>
                    );
                  });
                })}
              </div>
            </div>

            {selectedAssignment && editable && hasAssignPermission && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={handleToggleDisabled}>
                  {selectedAssignment.isDisabled
                    ? t('exams.seatingMaps.enableSeat') || 'Enable Seat'
                    : t('exams.seatingMaps.disableSeat') || 'Disable Seat'}
                </Button>
                {!selectedAssignment.isDisabled && selectedAssignment.examStudentId && (
                  <Button variant="outline" size="sm" onClick={handleToggleLocked}>
                    {selectedAssignment.isLocked
                      ? t('exams.seatingMaps.unlockSeat') || 'Unlock'
                      : t('exams.seatingMaps.lockSeat') || 'Lock'}
                  </Button>
                )}
                {!selectedAssignment.isDisabled && !selectedAssignment.isLocked && (
                  <Button variant="outline" size="sm" onClick={handleClearSeat}>
                    <X className="h-4 w-4" />
                    <span className="hidden sm:inline ml-2">{t('exams.seatingMaps.clearSeat') || 'Clear'}</span>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="w-full lg:w-80 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {t('exams.seatingMaps.dimensions') || 'Dimensions'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {t('exams.seatingMaps.dimensionsHint') ||
                  'Change rows, columns, or start seat. Saving a size change rebuilds an empty grid.'}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="editor-map-rows">{t('exams.seatingMaps.rows') || 'Rows'}</Label>
                  <Input
                    id="editor-map-rows"
                    type="number"
                    min={1}
                    max={100}
                    value={draftRows}
                    disabled={!editable || !hasUpdatePermission}
                    onChange={(e) => setDraftRows(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="editor-map-columns">{t('exams.seatingMaps.columns') || 'Columns'}</Label>
                  <Input
                    id="editor-map-columns"
                    type="number"
                    min={1}
                    max={100}
                    value={draftColumns}
                    disabled={!editable || !hasUpdatePermission}
                    onChange={(e) => setDraftColumns(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="editor-map-start-seat">
                  {t('exams.seatingMaps.startSeat') || 'Start Seat'}
                </Label>
                <Input
                  id="editor-map-start-seat"
                  type="number"
                  min={1}
                  value={draftStartSeat}
                  disabled={!editable || !hasUpdatePermission}
                  onChange={(e) => setDraftStartSeat(e.target.value)}
                />
              </div>
              {editable && hasUpdatePermission && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleSaveDimensions}
                  disabled={
                    !dimensionsDirty || !dimensionsValid || updateMapMutation.isPending
                  }
                >
                  {t('exams.seatingMaps.saveDimensions') || 'Save Dimensions'}
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('exams.seatingMaps.unassignedStudents') || 'Unassigned Students'}</CardTitle>
              {filteredUnassignedStudents.length > 0 && (
                <CardDescription>
                  {t('exams.seatingMaps.unassignedStudentCount', {
                    count: filteredUnassignedStudents.length,
                  })}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder={t('common.search') || 'Search'}
                  className="ps-9"
                />
              </div>
              <div className="max-h-[320px] overflow-y-auto space-y-3">
                {groupedUnassignedStudents.length === 0 ? (
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>{t('exams.seatingMaps.noUnassignedStudents') || 'No unassigned students'}</p>
                    {(mapDetail.seatedElsewhereCount ?? 0) > 0 && (
                      <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
                        {t('exams.seatingMaps.studentsSeatedElsewhere', {
                          count: mapDetail.seatedElsewhereCount,
                          maps: mapDetail.seatedElsewhereMaps
                            .map((row) => `${row.name} (${row.count})`)
                            .join(', '),
                        }) ||
                          `${mapDetail.seatedElsewhereCount} student(s) from this map's classes are already seated on applied/finalized map(s): ${mapDetail.seatedElsewhereMaps
                            .map((row) => `${row.name} (${row.count})`)
                            .join(', ')}. Reopen that map and clear those seats, or remove those classes from it.`}
                      </p>
                    )}
                  </div>
                ) : (
                  groupedUnassignedStudents.map((group) => (
                    <div key={group.mainClassId} className="space-y-1.5">
                      <div className="sticky top-0 z-10 flex items-center gap-2 rounded-md bg-muted/80 px-2 py-1.5 backdrop-blur-sm">
                        <span
                          className="h-3 w-3 shrink-0 rounded-full border"
                          style={{
                            backgroundColor: colorByExamClassId.get(group.examClassId)
                              ? `${colorByExamClassId.get(group.examClassId)}44`
                              : undefined,
                            borderColor: colorByExamClassId.get(group.examClassId) || undefined,
                          }}
                        />
                        <span className="text-xs font-semibold uppercase tracking-wide truncate">
                          {group.className}
                        </span>
                        <Badge variant="secondary" className="ms-auto shrink-0 text-[10px]">
                          {group.students.length}
                        </Badge>
                      </div>
                      {group.students.map((student) => (
                        <button
                          key={student.examStudentId}
                          type="button"
                          className={`w-full rounded-md border p-2 text-start text-sm hover:bg-muted/50 ${
                            movingStudentId === student.examStudentId ? 'ring-2 ring-primary' : ''
                          }`}
                          onClick={() => {
                            if (!editable || !hasAssignPermission) return;
                            if (selectedCell) {
                              handleAssignStudent(student.examStudentId, {
                                fullName: student.fullName,
                                className: student.className,
                                examClassId: student.examClassId,
                              });
                            } else {
                              setMovingStudentId(
                                movingStudentId === student.examStudentId ? null : student.examStudentId
                              );
                            }
                          }}
                        >
                          <div className="font-medium">{student.fullName}</div>
                          {student.examRollNumber && (
                            <div className="text-xs text-muted-foreground">{student.examRollNumber}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {t('exams.seatingMaps.mapClasses') || 'Map Classes'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {t('exams.seatingMaps.mapClassesHint') ||
                  'Only students from selected classes appear in this map.'}
              </p>
              <div className="max-h-48 overflow-y-auto space-y-2 rounded-md border p-3">
                {examClasses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t('exams.seatingMaps.noExamClasses') || 'No classes on this exam yet.'}
                  </p>
                ) : (
                  examClasses.map((examClass) => {
                    const className =
                      examClass.classAcademicYear?.class?.name ||
                      examClass.classAcademicYear?.sectionName ||
                      examClass.id;
                    const sectionName = examClass.classAcademicYear?.sectionName;
                    const label =
                      sectionName && !String(className).includes(String(sectionName))
                        ? `${className} — ${sectionName}`
                        : String(className);
                    return (
                      <label
                        key={examClass.id}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <Checkbox
                          checked={draftMapClassIds.includes(examClass.id)}
                          disabled={!editable || !hasUpdatePermission}
                          onCheckedChange={(value) =>
                            toggleDraftMapClass(examClass.id, value === true)
                          }
                        />
                        <span>{label}</span>
                      </label>
                    );
                  })
                )}
              </div>
              {editable && hasUpdatePermission && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => void handleSaveMapClasses()}
                  disabled={
                    draftMapClassIds.length === 0 || syncMapClassesMutation.isPending
                  }
                >
                  {t('exams.seatingMaps.saveClasses') || 'Save Classes'}
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('exams.seatingMaps.classColors') || 'Class Colors'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mainClassColorRows.map((row) => (
                <div key={row.mainClassId} className="flex items-center gap-2">
                  <input
                    type="color"
                    value={row.colorHex}
                    disabled={!editable || !hasUpdatePermission}
                    onChange={(e) => {
                      const nextHex = e.target.value;
                      const examClassIds = new Set(row.examClassIds);
                      setClassColors((prev) =>
                        prev.map((color) =>
                          examClassIds.has(color.examClassId)
                            ? { ...color, colorHex: nextHex, className: row.className }
                            : color
                        )
                      );
                    }}
                    className="h-8 w-10 rounded border"
                  />
                  <span className="text-sm flex-1 truncate">{row.className}</span>
                </div>
              ))}
              {editable && hasUpdatePermission && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => void handleSaveClassColors()}
                  disabled={syncColorsMutation.isPending}
                >
                  {t('exams.seatingMaps.saveColors') || 'Save Colors'}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('exams.seatingMaps.rollPreviewTitle') || 'Apply Roll Numbers Preview'}</DialogTitle>
            <DialogDescription>
              {t('exams.seatingMaps.rollPreviewDescription') || 'Review seat numbers before applying as roll numbers.'}
            </DialogDescription>
          </DialogHeader>
          {previewData && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge>{t('exams.seatingMaps.total') || 'Total'}: {previewData.total}</Badge>
                <Badge variant="secondary">
                  {t('exams.rollNumbers.willOverride') || 'Will override'}: {previewData.willOverrideCount}
                </Badge>
                {previewData.collisionCount > 0 && (
                  <Badge variant="destructive">
                    {t('exams.rollNumbers.collision') || 'Collisions'}: {previewData.collisionCount}
                  </Badge>
                )}
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('students.fullName') || 'Student'}</TableHead>
                      <TableHead>{t('exams.rollNumbers.rollNumber') || 'Roll Number'}</TableHead>
                      <TableHead>{t('exams.seatingMaps.seat') || 'Seat'}</TableHead>
                      <TableHead>{t('common.status') || 'Status'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.items.slice(0, 50).map((item) => (
                      <TableRow key={item.examStudentId}>
                        <TableCell>
                          <div>{item.studentName}</div>
                          <div className="text-xs text-muted-foreground">{item.className}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-muted-foreground">{item.currentRollNumber || '—'}</div>
                          <div className="font-medium">{item.newRollNumber}</div>
                        </TableCell>
                        <TableCell>{item.seatNumber}</TableCell>
                        <TableCell>
                          {item.hasCollision ? (
                            <Badge variant="destructive">{t('exams.rollNumbers.collision') || 'Collision'}</Badge>
                          ) : item.willOverride ? (
                            <Badge variant="secondary">{t('exams.rollNumbers.override') || 'Override'}</Badge>
                          ) : (
                            <Badge>{t('exams.rollNumbers.new') || 'New'}</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button
              onClick={() => setShowConfirmDialog(true)}
              disabled={!previewData || previewData.collisionCount > 0 || confirmRollMutation.isPending}
            >
              {t('exams.rollNumbers.confirmAssign') || 'Confirm & Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('exams.seatingMaps.confirmRollTitle') || 'Apply roll numbers?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('exams.seatingMaps.confirmRollDescription') || 'Seat numbers will be written to exam roll numbers.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel') || 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleConfirmRollNumbers()}>
              {t('exams.rollNumbers.confirmAssign') || 'Confirm & Assign'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('exams.seatingMaps.finalizeTitle') || 'Finalize seating map?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('exams.seatingMaps.finalizeDescription') || 'Finalized maps cannot be edited.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel') || 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleFinalize()}>
              {t('exams.seatingMaps.finalize') || 'Finalize'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showResizeDialog} onOpenChange={setShowResizeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('exams.seatingMaps.resizeTitle') || 'Change grid size?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('exams.seatingMaps.resizeDescription') ||
                'Changing rows, columns, or start seat clears all current seat assignments and rebuilds an empty grid.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel') || 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void applyDimensionsUpdate()}
              disabled={updateMapMutation.isPending}
            >
              {t('exams.seatingMaps.saveDimensions') || 'Save Dimensions'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ReportProgressDialog
        open={showReportProgress}
        onOpenChange={setShowReportProgress}
        status={reportStatus}
        progress={progress}
        fileName={fileName}
        error={reportError}
        onDownload={() => {
          void downloadReport();
        }}
        onClose={resetReport}
      />
    </div>
  );
}

export default ExamSeatingMapEditorPage;
