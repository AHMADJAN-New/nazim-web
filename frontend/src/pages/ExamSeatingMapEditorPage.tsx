import {
  AlertCircle,
  ArrowLeft,
  ArrowLeftRight,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Lock,
  RefreshCw,
  Save,
  Search,
  Wand2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
  useSolveExamSeatingMap,
  useSyncExamSeatingAssignments,
  useSyncExamSeatingClassColors,
} from '@/hooks/useExamSeating';
import { useExamClasses } from '@/hooks/useExams';
import { useHasPermission } from '@/hooks/usePermissions';
import { useLanguage } from '@/hooks/useLanguage';
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

  const [draftAssignments, setDraftAssignments] = useState<DraftAssignment[]>([]);
  const [classColors, setClassColors] = useState<ExamSeatingClassColor[]>([]);
  const [selectedCell, setSelectedCell] = useState<{ row: number; column: number } | null>(null);
  const [movingStudentId, setMovingStudentId] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [previewData, setPreviewData] = useState<MapRollNumberPreviewResponse | null>(null);
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [showReportProgress, setShowReportProgress] = useState(false);

  const syncAssignmentsMutation = useSyncExamSeatingAssignments();
  const syncColorsMutation = useSyncExamSeatingClassColors();
  const solveMutation = useSolveExamSeatingMap();
  const finalizeMutation = useFinalizeExamSeatingMap();
  const previewRollMutation = usePreviewMapRollNumbers();
  const confirmRollMutation = useConfirmMapRollNumbers();

  const {
    generateSeatingMapReport,
    isGenerating,
    progress,
    status: reportStatus,
    downloadUrl,
    reset: resetReport,
  } = useExamSeatingMapReport();

  const isSolverRunning = mapDetail?.solverStatus === 'pending' || mapDetail?.solverStatus === 'running';
  const { data: solveStatus } = useExamSeatingSolveStatus(
    examId,
    mapId,
    isSolverRunning,
    isSolverRunning ? 2000 : false
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
    setClassColors(mapDetail.classColors);
  }, [mapDetail]);

  useEffect(() => {
    if (!isSolverRunning) return;
    if (solveStatus?.solverStatus === 'succeeded' || solveStatus?.solverStatus === 'failed') {
      void refetch();
    }
  }, [isSolverRunning, solveStatus?.solverStatus, refetch]);

  const assignmentByCell = useMemo(() => {
    const map = new Map<string, DraftAssignment>();
    draftAssignments.forEach((assignment) => {
      map.set(`${assignment.rowNumber}-${assignment.columnNumber}`, assignment);
    });
    return map;
  }, [draftAssignments]);

  const colorByClassId = useMemo(() => {
    const map = new Map<string, string>();
    classColors.forEach((color) => map.set(color.examClassId, color.colorHex));
    return map;
  }, [classColors]);

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
    }));
  };

  const handleSaveAssignments = async () => {
    if (!examId || !mapId || !mapDetail) return;
    await syncAssignmentsMutation.mutateAsync({
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

  const handleSolve = async () => {
    if (!examId || !mapId || !mapDetail) return;
    await handleSaveAssignments();
    await solveMutation.mutateAsync({
      examId,
      mapId,
      revision: mapDetail.revision,
      strictMode: true,
    });
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
    if (!examId || !mapId) return;
    await confirmRollMutation.mutateAsync({ examId, mapId });
    setShowConfirmDialog(false);
    setShowPreviewDialog(false);
    await refetch();
  };

  const handleExport = async (reportType: 'pdf' | 'excel') => {
    if (!reportData) return;
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
    const existing = new Map(classColors.map((color) => [color.examClassId, color]));
    const nextColors = examClasses.map((examClass, index) => {
      const className =
        examClass.classAcademicYear?.class?.name ||
        examClass.classAcademicYear?.section ||
        `Class ${index + 1}`;
      const existingColor = existing.get(examClass.id);
      if (existingColor) return existingColor;
      return {
        id: `temp-${examClass.id}`,
        organizationId: mapDetail.organizationId,
        schoolId: mapDetail.schoolId,
        examSeatingMapId: mapDetail.id,
        examClassId: examClass.id,
        colorHex: DEFAULT_CLASS_COLORS[index % DEFAULT_CLASS_COLORS.length],
        createdAt: new Date(),
        updatedAt: new Date(),
        className,
      };
    });
    setClassColors(nextColors);
  };

  useEffect(() => {
    if (examClasses.length > 0 && classColors.length === 0) {
      initializeClassColors();
    }
  }, [examClasses.length, classColors.length]);

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

      <div className="flex flex-col lg:flex-row gap-4">
        <Card className="flex-1 overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <CardTitle>{t('exams.seatingMaps.grid') || 'Seating Grid'}</CardTitle>
                <CardDescription>
                  {mapDetail.rows} × {mapDetail.columns} · {t('exams.seatingMaps.startSeat') || 'Start'} {mapDetail.startSeatNumber}
                </CardDescription>
              </div>
              <TooltipProvider>
                <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                  {editable && hasAssignPermission && (
                    <>
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
                            <span className="hidden sm:inline ml-2">{t('common.save') || 'Save'}</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="sm:hidden">
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
                            <span className="hidden sm:inline ml-2">{t('exams.seatingMaps.solve') || 'Solve'}</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="sm:hidden">
                          <p>{t('exams.seatingMaps.solve') || 'Solve'}</p>
                        </TooltipContent>
                      </Tooltip>
                    </>
                  )}
                  {hasUpdatePermission && editable && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFinalizeDialog(true)}
                      disabled={finalizeMutation.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="hidden sm:inline ml-2">{t('exams.seatingMaps.finalize') || 'Finalize'}</span>
                    </Button>
                  )}
                  {hasAssignPermission && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handlePreviewRollNumbers()}
                      disabled={previewRollMutation.isPending}
                    >
                      <ArrowLeftRight className="h-4 w-4" />
                      <span className="hidden sm:inline ml-2">{t('exams.seatingMaps.applyRollNumbers') || 'Apply Roll Numbers'}</span>
                    </Button>
                  )}
                  {hasPrintPermission && reportData && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-shrink-0"
                        aria-label={t('common.exportPdf') || 'Export PDF'}
                        onClick={() => void handleExport('pdf')}
                        disabled={isGenerating}
                      >
                        <FileText className="h-4 w-4" />
                        <span className="hidden sm:inline ml-2">{t('common.exportPdf') || 'PDF'}</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-shrink-0"
                        aria-label={t('common.exportExcel') || 'Export Excel'}
                        onClick={() => void handleExport('excel')}
                        disabled={isGenerating}
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        <span className="hidden sm:inline ml-2">{t('common.exportExcel') || 'Excel'}</span>
                      </Button>
                    </>
                  )}
                </div>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent>
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
                      ? colorByClassId.get(assignment.examClassId)
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

            {selectedAssignment && (
              <div className="mt-4 flex flex-wrap gap-2">
                {editable && hasAssignPermission && (
                  <>
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
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="w-full lg:w-80 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('exams.seatingMaps.unassignedStudents') || 'Unassigned Students'}</CardTitle>
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
              <div className="max-h-[320px] overflow-y-auto space-y-2">
                {filteredUnassignedStudents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t('exams.seatingMaps.noUnassignedStudents') || 'No unassigned students'}
                  </p>
                ) : (
                  filteredUnassignedStudents.map((student) => (
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
                      <div className="text-xs text-muted-foreground">{student.className}</div>
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('exams.seatingMaps.classColors') || 'Class Colors'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {classColors.map((color, index) => (
                <div key={color.examClassId} className="flex items-center gap-2">
                  <input
                    type="color"
                    value={color.colorHex}
                    disabled={!editable || !hasUpdatePermission}
                    onChange={(e) => {
                      const next = [...classColors];
                      next[index] = { ...color, colorHex: e.target.value };
                      setClassColors(next);
                    }}
                    className="h-8 w-10 rounded border"
                  />
                  <span className="text-sm flex-1 truncate">
                    {color.className || examClasses.find((c) => c.id === color.examClassId)?.classAcademicYear?.class?.name || color.examClassId}
                  </span>
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

      <ReportProgressDialog
        open={showReportProgress}
        onOpenChange={setShowReportProgress}
        status={reportStatus}
        progress={progress}
        downloadUrl={downloadUrl}
      />
    </div>
  );
}

export default ExamSeatingMapEditorPage;
