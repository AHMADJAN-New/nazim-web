import {
  ArrowLeft,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  LayoutGrid,
  Loader2,
  UserCheck,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { FilterPanel } from '@/components/layout/FilterPanel';
import { PageHeader } from '@/components/layout/PageHeader';
import { ReportProgressDialog } from '@/components/reports/ReportProgressDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useExam,
  useExamAttendanceReportDetail,
  useExamAttendanceSummary,
  useExams,
  useHallAttendanceSessions,
  useLatestExamFromCurrentYear,
} from '@/hooks/useExams';
import { useLanguage } from '@/hooks/useLanguage';
import { useHasPermission } from '@/hooks/usePermissions';
import { useProfile } from '@/hooks/useProfiles';
import { useServerReport } from '@/hooks/useServerReport';
import { showToast } from '@/lib/toast';
import { cn, formatDate } from '@/lib/utils';
import type { AttendanceClassSubjectSummary } from '@/types/domain/exam';

type ViewMode = 'hall' | 'class';

const ALL = 'all';

export default function ExamAttendanceReportPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { examId: examIdFromParams } = useParams<{ examId?: string }>();
  const { data: profile } = useProfile();
  const organizationId = profile?.organization_id;
  const canView = useHasPermission('exams.view_attendance_reports');

  const [selectedExamId, setSelectedExamId] = useState<string | undefined>(undefined);
  const [viewMode, setViewMode] = useState<ViewMode>('hall');
  const [sessionKey, setSessionKey] = useState<string>(ALL);
  const [classFilterId, setClassFilterId] = useState<string>(ALL);
  const [subjectFilterId, setSubjectFilterId] = useState<string>(ALL);
  const [selectedUnit, setSelectedUnit] = useState<AttendanceClassSubjectSummary | null>(null);
  const [showReportProgress, setShowReportProgress] = useState(false);

  const examId = examIdFromParams || selectedExamId || undefined;
  const { data: allExams, isLoading: examsLoading } = useExams(organizationId);
  const latestExam = useLatestExamFromCurrentYear(organizationId);
  const { data: exam } = useExam(examId);
  const { data: summary, isLoading: summaryLoading } = useExamAttendanceSummary(examId);
  const { data: hallSessions = [], isLoading: hallSessionsLoading } = useHallAttendanceSessions(examId);
  const { data: detail, isLoading: detailLoading } = useExamAttendanceReportDetail(
    examId,
    selectedUnit?.examClassId,
    selectedUnit?.examSubjectId
  );

  const {
    generateReport,
    status,
    progress,
    downloadUrl,
    isGenerating,
    error: reportError,
    reset: resetReport,
    downloadReport,
  } = useServerReport();

  useEffect(() => {
    if (examIdFromParams) {
      setSelectedExamId(undefined);
    }
  }, [examIdFromParams]);

  useEffect(() => {
    if (!examIdFromParams && !selectedExamId && latestExam?.id) {
      setSelectedExamId(latestExam.id);
    }
  }, [examIdFromParams, latestExam?.id, selectedExamId]);

  useEffect(() => {
    setSelectedUnit(null);
    setSessionKey(ALL);
    setClassFilterId(ALL);
    setSubjectFilterId(ALL);
  }, [examId]);

  useEffect(() => {
    if (hallSessions.length > 0 && viewMode === 'hall' && sessionKey === ALL) {
      const first = hallSessions[0];
      setSessionKey(`${first.date}|${first.startTime}`);
    }
  }, [hallSessions, viewMode, sessionKey]);

  useEffect(() => {
    if (hallSessions.length === 0 && !hallSessionsLoading) {
      setViewMode('class');
    }
  }, [hallSessions.length, hallSessionsLoading]);

  const matrix = useMemo(() => summary?.byClassSubject ?? [], [summary?.byClassSubject]);

  const classOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of matrix) {
      if (!map.has(row.examClassId)) {
        map.set(row.examClassId, row.classLabel);
      }
    }
    return Array.from(map.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [matrix]);

  const subjectOptions = useMemo(() => {
    const rows =
      classFilterId === ALL
        ? matrix
        : matrix.filter((row) => row.examClassId === classFilterId);
    const map = new Map<string, string>();
    for (const row of rows) {
      if (!map.has(row.examSubjectId)) {
        map.set(row.examSubjectId, row.subjectName);
      }
    }
    return Array.from(map.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [matrix, classFilterId]);

  const filteredMatrix = useMemo(() => {
    return matrix.filter((row) => {
      if (viewMode === 'hall') {
        if (sessionKey === ALL) return true;
        const [date, start] = sessionKey.split('|');
        const rowDate = row.date ? String(row.date).slice(0, 10) : '';
        const rowStart = row.startTime ? String(row.startTime).slice(0, 5) : '';
        return rowDate === date && rowStart === start.slice(0, 5);
      }
      if (classFilterId !== ALL && row.examClassId !== classFilterId) return false;
      if (subjectFilterId !== ALL && row.examSubjectId !== subjectFilterId) return false;
      return true;
    });
  }, [matrix, viewMode, sessionKey, classFilterId, subjectFilterId]);

  const filteredTotals = useMemo(() => {
    return filteredMatrix.reduce(
      (acc, row) => {
        acc.enrolledStudents += row.enrolled;
        acc.present += row.present;
        acc.absent += row.absent;
        acc.late += row.late;
        acc.excused += row.excused;
        acc.unmarked += row.unmarked;
        return acc;
      },
      { enrolledStudents: 0, present: 0, absent: 0, late: 0, excused: 0, unmarked: 0 }
    );
  }, [filteredMatrix]);

  useEffect(() => {
    if (!selectedUnit) return;
    const stillVisible = filteredMatrix.some(
      (row) =>
        row.examClassId === selectedUnit.examClassId &&
        row.examSubjectId === selectedUnit.examSubjectId
    );
    if (!stillVisible) {
      setSelectedUnit(null);
    }
  }, [filteredMatrix, selectedUnit]);

  useEffect(() => {
    if (subjectFilterId !== ALL && !subjectOptions.some((s) => s.id === subjectFilterId)) {
      setSubjectFilterId(ALL);
    }
  }, [subjectOptions, subjectFilterId]);

  const exportParameters = useMemo(() => {
    const params: Record<string, string | undefined> = {
      exam_id: examId,
      school_id: profile?.default_school_id ?? undefined,
    };

    if (viewMode === 'hall' && sessionKey !== ALL) {
      const [date, start] = sessionKey.split('|');
      params.session_date = date;
      params.session_start_time = start;
    } else if (viewMode === 'class') {
      if (classFilterId !== ALL) params.exam_class_id = classFilterId;
      if (subjectFilterId !== ALL) params.exam_subject_id = subjectFilterId;
    }

    return params;
  }, [
    examId,
    profile?.default_school_id,
    viewMode,
    sessionKey,
    classFilterId,
    subjectFilterId,
  ]);

  const canExportSession =
    viewMode === 'hall' && sessionKey !== ALL && filteredMatrix.length > 0;

  const handleExportZip = useCallback(
    async (format: 'pdf' | 'excel') => {
      if (!examId || isGenerating) return;

      setShowReportProgress(true);
      resetReport();

      const title =
        format === 'pdf'
          ? `${t('examReports.attendanceReport')} PDF — ${exam?.name || ''}`
          : `${t('examReports.attendanceReport')} Excel — ${exam?.name || ''}`;

      try {
        await generateReport({
          reportKey: format === 'pdf' ? 'exam_attendance_pdf_zip' : 'exam_attendance_excel_zip',
          reportType: format,
          title,
          brandingId: profile?.default_school_id ?? undefined,
          async: true,
          columns: [],
          rows: [],
          parameters: exportParameters,
          onComplete: () => {
            showToast.success(t('examReports.attendanceZipReady'));
            void downloadReport();
          },
          onError: (error) => {
            showToast.error(error || t('examReports.attendanceZipFailed'));
          },
        });
      } catch (error: unknown) {
        showToast.error(
          error instanceof Error && error.message
            ? error.message
            : t('examReports.attendanceZipFailed')
        );
      }
    },
    [
      downloadReport,
      exam?.name,
      examId,
      exportParameters,
      generateReport,
      isGenerating,
      profile?.default_school_id,
      resetReport,
      t,
    ]
  );

  const handleExportSession = useCallback(
    async (format: 'pdf' | 'excel') => {
      if (!examId || isGenerating || !canExportSession) return;

      setShowReportProgress(true);
      resetReport();

      const title = `${t('examReports.sessionCombinedReport')} — ${exam?.name || ''}`;

      try {
        await generateReport({
          reportKey:
            format === 'pdf' ? 'exam_attendance_session_pdf' : 'exam_attendance_session_excel',
          reportType: format,
          title,
          brandingId: profile?.default_school_id ?? undefined,
          async: true,
          columns: [],
          rows: [],
          parameters: exportParameters,
          onComplete: () => {
            showToast.success(t('examReports.sessionReportReady'));
            void downloadReport();
          },
          onError: (error) => {
            showToast.error(error || t('examReports.sessionReportFailed'));
          },
        });
      } catch (error: unknown) {
        showToast.error(
          error instanceof Error && error.message
            ? error.message
            : t('examReports.sessionReportFailed')
        );
      }
    },
    [
      canExportSession,
      downloadReport,
      exam?.name,
      examId,
      exportParameters,
      generateReport,
      isGenerating,
      profile?.default_school_id,
      resetReport,
      t,
    ]
  );

  if (!canView) {
    return (
      <div className="container mx-auto p-4 md:p-6 max-w-7xl overflow-x-hidden">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">{t('events.noPermission')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <PageHeader
        title={t('examReports.attendanceReport')}
        description={t('examReports.attendanceReportDescription')}
        icon={<ClipboardList className="h-5 w-5" />}
        secondaryActions={[
          {
            label: t('common.back'),
            icon: <ArrowLeft className="h-4 w-4" />,
            onClick: () => navigate('/exams/reports-hub'),
          },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t('examReports.selectExam')}</CardTitle>
          <CardDescription>{t('examReports.selectExamPrompt')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-md space-y-2">
            <Label>{t('examReports.examName')}</Label>
            {examsLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select
                value={examId || ''}
                onValueChange={(value) => {
                  if (!examIdFromParams) {
                    setSelectedExamId(value);
                  } else {
                    navigate(`/exams/reports/attendance?examId=${value}`);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('examReports.selectExam')} />
                </SelectTrigger>
                <SelectContent>
                  {(allExams || []).map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {examId && (
        <FilterPanel
          title={t('examReports.filtersTitle')}
          defaultOpenDesktop={true}
          defaultOpenMobile={false}
        >
          <div className="space-y-4">
            <Tabs
              value={viewMode}
              onValueChange={(v) => {
                setViewMode(v as ViewMode);
                setSelectedUnit(null);
              }}
            >
              <TabsList className="grid w-full grid-cols-2 max-w-md">
                <TabsTrigger value="hall" className="flex items-center gap-2" disabled={hallSessions.length === 0}>
                  <LayoutGrid className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('exams.attendance.hall') || 'Hall'}</span>
                </TabsTrigger>
                <TabsTrigger value="class" className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('exams.attendance.byClass') || 'By class'}</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {viewMode === 'hall' ? (
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 max-w-2xl">
                <div className="space-y-2">
                  <Label>{t('exams.attendance.hallSelectSession') || 'Session (date & time)'}</Label>
                  <Select
                    value={sessionKey}
                    onValueChange={(value) => {
                      setSessionKey(value);
                      setSelectedUnit(null);
                    }}
                    disabled={hallSessionsLoading || hallSessions.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          hallSessions.length === 0
                            ? t('exams.attendance.hallNoSessions') || 'No sessions'
                            : t('exams.attendance.hallSelectSession') || 'Select session'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>{t('examReports.allSessions')}</SelectItem>
                      {hallSessions.map((session) => {
                        const key = `${session.date}|${session.startTime}`;
                        return (
                          <SelectItem key={key} value={key}>
                            {formatDate(session.date)} {session.startTime}
                            {session.endTime ? ` - ${session.endTime}` : ''}
                            {` · ${session.classCount} ${t('exams.attendance.hallClasses') || 'classes'}`}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 max-w-2xl">
                <div className="space-y-2">
                  <Label>{t('examReports.className')}</Label>
                  <Select
                    value={classFilterId}
                    onValueChange={(value) => {
                      setClassFilterId(value);
                      setSubjectFilterId(ALL);
                      setSelectedUnit(null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('examReports.allClasses')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>{t('examReports.allClasses')}</SelectItem>
                      {classOptions.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('examReports.selectSubject')}</Label>
                  <Select
                    value={subjectFilterId}
                    onValueChange={(value) => {
                      setSubjectFilterId(value);
                      setSelectedUnit(null);
                    }}
                    disabled={classFilterId === ALL}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('examReports.allSubjects')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>{t('examReports.allSubjects')}</SelectItem>
                      {subjectOptions.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isGenerating || filteredMatrix.length === 0}
                onClick={() => void handleExportZip('pdf')}
                aria-label={t('examReports.downloadPdfZip')}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                <span className="hidden sm:inline ml-2">{t('examReports.downloadPdfZip')}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={isGenerating || filteredMatrix.length === 0}
                onClick={() => void handleExportZip('excel')}
                aria-label={t('examReports.downloadExcelZip')}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4" />
                )}
                <span className="hidden sm:inline ml-2">{t('examReports.downloadExcelZip')}</span>
              </Button>
              {viewMode === 'hall' && (
                <>
                  <Button
                    variant="default"
                    size="sm"
                    disabled={isGenerating || !canExportSession}
                    onClick={() => void handleExportSession('pdf')}
                    aria-label={t('examReports.downloadSessionPdf')}
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline ml-2">{t('examReports.downloadSessionPdf')}</span>
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    disabled={isGenerating || !canExportSession}
                    onClick={() => void handleExportSession('excel')}
                    aria-label={t('examReports.downloadSessionExcel')}
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline ml-2">{t('examReports.downloadSessionExcel')}</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </FilterPanel>
      )}

      {examId && summaryLoading && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      )}

      {examId && !summaryLoading && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardDescription>{t('exams.attendance.enrolledStudents')}</CardDescription>
              <CardTitle className="text-2xl">{filteredTotals.enrolledStudents}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardDescription>{t('exams.attendance.hallPresent')}</CardDescription>
              <CardTitle className="text-2xl text-green-700">{filteredTotals.present}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardDescription>{t('exams.attendance.hallAbsent')}</CardDescription>
              <CardTitle className="text-2xl text-red-700">{filteredTotals.absent}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardDescription>{t('exams.attendance.lateExcused')}</CardDescription>
              <CardTitle className="text-2xl">
                {filteredTotals.late + filteredTotals.excused}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {examId && (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>{t('examReports.attendanceByClassSubject')}</CardTitle>
            <CardDescription>{t('examReports.attendanceByClassSubjectHint')}</CardDescription>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : filteredMatrix.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('examReports.noDataAvailable')}</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('examReports.className')}</TableHead>
                      <TableHead>{t('examReports.selectSubject')}</TableHead>
                      <TableHead className="text-center">{t('exams.attendance.enrolledStudents')}</TableHead>
                      <TableHead className="text-center">{t('exams.attendance.hallPresent')}</TableHead>
                      <TableHead className="text-center">{t('exams.attendance.hallAbsent')}</TableHead>
                      <TableHead className="text-center">{t('exams.attendance.hallUnmarked')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMatrix.map((row) => {
                      const active =
                        selectedUnit?.examClassId === row.examClassId &&
                        selectedUnit?.examSubjectId === row.examSubjectId;
                      return (
                        <TableRow
                          key={`${row.examClassId}-${row.examSubjectId}`}
                          className={cn('cursor-pointer', active && 'bg-muted/60')}
                          onClick={() => setSelectedUnit(row)}
                        >
                          <TableCell className="font-medium">{row.classLabel}</TableCell>
                          <TableCell>
                            <div className="space-y-0.5">
                              <div>{row.subjectName}</div>
                              {row.date && (
                                <div className="text-xs text-muted-foreground">
                                  {formatDate(row.date)}
                                  {row.startTime ? ` · ${row.startTime}` : ''}
                                  {row.endTime ? ` – ${row.endTime}` : ''}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{row.enrolled}</TableCell>
                          <TableCell className="text-center text-green-700">{row.present}</TableCell>
                          <TableCell className="text-center text-red-700">{row.absent}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={row.unmarked > 0 ? 'secondary' : 'outline'}>
                              {row.unmarked}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedUnit && (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>
              {selectedUnit.classLabel} · {selectedUnit.subjectName}
            </CardTitle>
            <CardDescription>
              {detail
                ? `${t('exams.attendance.hallPresent')}: ${detail.counts.present} · ${t('exams.attendance.hallAbsent')}: ${detail.counts.absent} · ${t('exams.attendance.hallUnmarked')}: ${detail.counts.unmarked}`
                : t('examReports.attendanceDetailLoading')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {detailLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : !detail || detail.students.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('examReports.noDataAvailable')}</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>{t('examReports.studentName')}</TableHead>
                      <TableHead>{t('examReports.fatherName')}</TableHead>
                      <TableHead>{t('exams.rollNumbers.rollNumber')}</TableHead>
                      <TableHead>{t('exams.admissionNo')}</TableHead>
                      <TableHead>{t('exams.attendance.status')}</TableHead>
                      <TableHead>{t('exams.attendance.seatNumber')}</TableHead>
                      <TableHead>{t('common.notes')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.students.map((student, index) => (
                      <TableRow key={student.studentId}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell className="font-medium">{student.studentName}</TableCell>
                        <TableCell>{student.fatherName}</TableCell>
                        <TableCell>{student.rollNumber}</TableCell>
                        <TableCell>{student.admissionNo}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              student.statusKey === 'present'
                                ? 'default'
                                : student.statusKey === 'absent'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                          >
                            {student.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{student.seatNumber}</TableCell>
                        <TableCell className="max-w-[12rem] truncate">{student.notes}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <ReportProgressDialog
        open={showReportProgress}
        onOpenChange={setShowReportProgress}
        status={status}
        progress={progress}
        downloadUrl={downloadUrl}
        error={reportError}
      />
    </div>
  );
}
