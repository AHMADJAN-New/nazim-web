import { useQuery } from '@tanstack/react-query';
import { ColumnDef, flexRender } from '@tanstack/react-table';
import { format } from 'date-fns';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Heart,
  Loader2,
  RefreshCw,
  School,
  TrendingUp,
  UserRound,
  Users,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { FilterPanel } from '@/components/layout/FilterPanel';
import { OfflineDisabled } from '@/components/layout/OfflineDisabled';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';
import { Combobox } from '@/components/ui/combobox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDataTable } from '@/hooks/use-data-table';
import { useAcademicYears } from '@/hooks/useAcademicYears';
import { useClasses } from '@/hooks/useClasses';
import { useDatePreference } from '@/hooks/useDatePreference';
import { useLanguage } from '@/hooks/useLanguage';
import { useProfile } from '@/hooks/useProfiles';
import { useSchools } from '@/hooks/useSchools';
import { useStudentAdmissions } from '@/hooks/useStudentAdmissions';
import { attendanceSessionsApi, apiClient } from '@/lib/api/client';
import {
  buildAttendanceReportParams,
  getAttendanceReportSummary,
  mapAttendanceReportRecord,
  type AttendanceReportRecord,
} from '@/lib/attendance/attendanceReportUtils';
import { dateToLocalYYYYMMDD, parseLocalDate } from '@/lib/dateUtils';
import { showToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import type * as AttendanceApi from '@/types/api/attendance';
import type { Student } from '@/types/domain/student';

interface AttendanceReportResponse {
  data: AttendanceReportRecord[];
  total: number;
  current_page: number;
  per_page: number;
  last_page: number;
  from: number;
  to: number;
}

const getStatusOptions = (t: ReturnType<typeof useLanguage>['t']) => [
  { value: 'present', label: t('attendancePage.statusPresent') || 'Present', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800' },
  { value: 'absent', label: t('attendancePage.statusAbsent') || 'Absent', className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800' },
  { value: 'late', label: t('attendancePage.statusLate') || 'Late', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800' },
  { value: 'excused', label: t('attendancePage.statusExcused') || 'Excused', className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800' },
  { value: 'sick', label: t('attendancePage.statusSick') || 'Sick', className: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800' },
  { value: 'leave', label: t('attendancePage.statusLeave') || 'Leave', className: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800' },
] as const;

const StatusBadge = ({
  status,
  t,
}: {
  status: AttendanceApi.AttendanceStatus;
  t: ReturnType<typeof useLanguage>['t'];
}) => {
  const option = getStatusOptions(t).find((item) => item.value === status);
  if (!option) return <Badge variant="outline">{status}</Badge>;
  return <Badge variant="outline" className={option.className}>{option.label}</Badge>;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

const formatAttendanceRound = (roundNumber: number, sessionLabel: string | null) => {
  const roundLabel = `Round ${roundNumber || 1}`;
  return sessionLabel ? `${roundLabel} - ${sessionLabel}` : roundLabel;
};

const getReportEndpoint = (downloadUrl: string): string => {
  const url = new URL(downloadUrl);
  let endpoint = url.pathname;

  if (endpoint.startsWith('/api/')) {
    endpoint = endpoint.slice(4);
  } else if (endpoint.startsWith('/api')) {
    endpoint = endpoint.slice(4);
  }

  return endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
};

export default function AttendanceReports() {
  const { t, language } = useLanguage();
  const { calendar } = useDatePreference();
  const { data: profile } = useProfile();
  const { data: schools } = useSchools(profile?.organization_id);
  const { data: classes } = useClasses(profile?.organization_id);
  const { data: academicYears } = useAcademicYears(profile?.organization_id);
  const { data: studentAdmissions } = useStudentAdmissions(profile?.organization_id, false, {
    enrollment_status: 'active',
  });
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [reportProgress, setReportProgress] = useState(0);
  const [reportStatus, setReportStatus] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [filters, setFilters] = useState(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return {
      studentId: '',
      classId: '',
      academicYearId: '',
      status: '',
      studentType: '' as '' | 'all' | 'boarders' | 'day_scholars',
      dateFrom: today,
      dateTo: today,
      page: 1,
      perPage: 25,
    };
  });

  const students: Student[] = useMemo(() => {
    if (!studentAdmissions || !Array.isArray(studentAdmissions)) return [];
    return studentAdmissions
      .map((admission) => admission.student)
      .filter((student): student is Student => Boolean(student));
  }, [studentAdmissions]);

  const currentSchool = useMemo(
    () => schools?.find((school) => school.id === profile?.default_school_id) ?? null,
    [profile?.default_school_id, schools]
  );

  const hasInvalidRange = useMemo(() => {
    if (!filters.dateFrom || !filters.dateTo) return false;
    return new Date(filters.dateFrom).getTime() > new Date(filters.dateTo).getTime();
  }, [filters.dateFrom, filters.dateTo]);

  const {
    data: reportData,
    isLoading,
    refetch,
  } = useQuery<AttendanceReportResponse>({
    queryKey: ['attendance-report', profile?.organization_id, profile?.default_school_id ?? null, filters],
    queryFn: async () => {
      if (!profile?.organization_id) {
        return { data: [], total: 0, current_page: 1, per_page: filters.perPage, last_page: 1, from: 0, to: 0 };
      }

      const response = await attendanceSessionsApi.report(
        buildAttendanceReportParams({
          organizationId: profile.organization_id,
          studentId: filters.studentId || undefined,
          classId: filters.classId || undefined,
          academicYearId: filters.academicYearId || undefined,
          status: (filters.status || undefined) as AttendanceApi.AttendanceStatus | undefined,
          studentType: (filters.studentType || undefined) as 'boarders' | 'day_scholars' | 'all' | undefined,
          dateFrom: filters.dateFrom || undefined,
          dateTo: filters.dateTo || undefined,
          page: filters.page,
          perPage: filters.perPage,
        })
      );

      const apiData = response as {
        data?: Array<AttendanceApi.AttendanceRecord & { session?: AttendanceApi.AttendanceSession }>;
        total?: number;
        current_page?: number;
        per_page?: number;
        last_page?: number;
        from?: number | null;
        to?: number | null;
      };

      return {
        data: (apiData.data ?? []).map((record) => mapAttendanceReportRecord(record)),
        total: apiData.total ?? 0,
        current_page: apiData.current_page ?? 1,
        per_page: apiData.per_page ?? filters.perPage,
        last_page: apiData.last_page ?? 1,
        from: apiData.from ?? 0,
        to: apiData.to ?? 0,
      };
    },
    enabled: !!profile?.organization_id && !!profile?.default_school_id && !hasInvalidRange,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const visibleData = useMemo(() => (hasInvalidRange ? [] : reportData?.data ?? []), [hasInvalidRange, reportData?.data]);
  const totalMatchingRecords = hasInvalidRange ? 0 : reportData?.total ?? 0;
  const visibleSummary = useMemo(() => getAttendanceReportSummary(visibleData), [visibleData]);

  const handleFilterChange = (key: keyof typeof filters, value: string | number) => {
    setFilters((previous) => ({
      ...previous,
      [key]: value,
      page: key === 'page' || key === 'perPage' ? previous.page : 1,
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      studentId: '',
      classId: '',
      academicYearId: '',
      status: '',
      studentType: '',
      dateFrom: '',
      dateTo: '',
      page: 1,
      perPage: 25,
    });
  };

  const handleGenerateReport = async (reportType: 'pdf' | 'excel') => {
    if (!totalMatchingRecords) {
      showToast.error(t('attendanceReports.noRecordsToExport') || 'No records to export');
      return;
    }

    if (!profile?.default_school_id) {
      showToast.error(t('attendanceReports.schoolRequired') || 'School is required for report generation');
      return;
    }

    try {
      const downloadReportWithAuth = async (downloadUrl: string, fallbackName: string) => {
        const endpoint = getReportEndpoint(downloadUrl);
        const { blob, filename } = await apiClient.requestFile(endpoint);

        const objectUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = filename || fallbackName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(objectUrl);
      };

      setIsGenerating(true);
      setShowProgressDialog(true);
      setReportProgress(0);
      setReportStatus('pending');

      const calendarPreference =
        calendar === 'gregorian' ? 'gregorian' : calendar === 'hijri_shamsi' ? 'jalali' : 'qamari';
      const languageCode = language === 'en' ? 'en' : language === 'ps' ? 'ps' : language === 'fa' ? 'fa' : 'ar';

      const response = await attendanceSessionsApi.generateReport({
        report_type: reportType,
        report_variant: 'daily',
        branding_id: profile.default_school_id,
        calendar_preference: calendarPreference,
        language: languageCode,
        student_id: filters.studentId || undefined,
        class_ids: filters.classId ? [filters.classId] : undefined,
        academic_year_id: filters.academicYearId || undefined,
        status: (filters.status || undefined) as AttendanceApi.AttendanceStatus | undefined,
        student_type: (filters.studentType || undefined) as 'boarders' | 'day_scholars' | 'all' | undefined,
        date_from: filters.dateFrom || undefined,
        date_to: filters.dateTo || undefined,
      });

      if (response.success && response.download_url) {
        await downloadReportWithAuth(response.download_url, `attendance-report.${reportType}`);
        setReportProgress(100);
        setReportStatus('completed');
        setShowProgressDialog(false);
        setIsGenerating(false);
        showToast.success(t('attendanceReports.reportExported') || 'Report generated successfully');
        return;
      }

      if (!response.success || !response.report_id) {
        throw new Error(response.error || 'Failed to generate report');
      }

      const pollStatus = async () => {
        try {
          const statusResponse = (await apiClient.get(`/reports/${response.report_id}/status`)) as {
            success?: boolean;
            error?: string;
            progress?: number;
            status?: string;
            download_url?: string | null;
            error_message?: string | null;
          };

          if (!statusResponse.success) throw new Error(statusResponse.error || 'Failed to get report status');

          setReportProgress(statusResponse.progress || 0);
          setReportStatus(statusResponse.status || 'processing');

          if (statusResponse.status === 'completed' && statusResponse.download_url) {
            await downloadReportWithAuth(statusResponse.download_url, `attendance-report.${reportType}`);
            setShowProgressDialog(false);
            setIsGenerating(false);
            showToast.success(t('attendanceReports.reportExported') || 'Report generated successfully');
            return;
          }

          if (statusResponse.status === 'failed') {
            setShowProgressDialog(false);
            setIsGenerating(false);
            showToast.error(
              statusResponse.error_message || t('attendanceReports.reportGenerationFailed') || 'Failed to generate report'
            );
            return;
          }

          setTimeout(() => { void pollStatus(); }, 1000);
        } catch (error: unknown) {
          setShowProgressDialog(false);
          setIsGenerating(false);
          showToast.error(getErrorMessage(error, t('attendanceReports.reportGenerationFailed') || 'Failed to check report status'));
        }
      };

      void pollStatus();
    } catch (error: unknown) {
      setShowProgressDialog(false);
      setIsGenerating(false);
      showToast.error(getErrorMessage(error, t('attendanceReports.reportGenerationFailed') || 'Failed to generate report'));
    }
  };

  const columns = useMemo<ColumnDef<AttendanceReportRecord>[]>(
    () => [
      {
        accessorKey: 'studentName',
        header: t('attendanceReports.student') || 'Student',
        cell: ({ row }) => (
          <div className="min-w-[200px]">
            <div className="font-medium text-sm">{row.original.studentName}</div>
            {row.original.fatherName && (
              <div className="text-xs text-muted-foreground mt-0.5">{row.original.fatherName}</div>
            )}
            <div className="text-xs text-muted-foreground/70 mt-0.5">
              {row.original.admissionNo}
              {row.original.cardNumber ? ` · ${row.original.cardNumber}` : ''}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'studentClassName',
        header: t('search.class') || 'Class',
        cell: ({ row }) => (
          <div className="text-sm">
            {row.original.studentClassName || '—'}
          </div>
        ),
      },
      {
        accessorKey: 'studentRoomName',
        header: t('attendanceTotalsReport.room') || 'Room',
        cell: ({ row }) => (
          <div className="text-sm">
            {row.original.studentRoomName || '—'}
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: t('attendancePage.statusHeader') || 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} t={t} />,
      },
      {
        accessorKey: 'sessionDate',
        header: t('events.date') || 'Date',
        cell: ({ row }) => (
          <div className="min-w-[120px]">
            <div className="text-sm font-medium">{format(row.original.sessionDate, 'MMM dd, yyyy')}</div>
            <div className="text-xs text-muted-foreground">{format(row.original.markedAt, 'HH:mm')}</div>
          </div>
        ),
      },
      {
        accessorKey: 'roundNumber',
        header: t('attendanceReports.round') || 'Round',
        cell: ({ row }) => (
          <Badge variant="outline" className="font-normal text-xs">
            {formatAttendanceRound(row.original.roundNumber, row.original.sessionLabel)}
          </Badge>
        ),
      },
      {
        accessorKey: 'entryMethod',
        header: t('attendanceReports.method') || 'Method',
        cell: ({ row }) => (
          <Badge variant="outline" className="capitalize font-normal text-xs">
            {row.original.entryMethod}
          </Badge>
        ),
      },
      {
        accessorKey: 'note',
        header: t('attendancePage.notesLabel') || 'Note',
        cell: ({ row }) => (
          <div className="max-w-[220px] text-sm text-muted-foreground truncate">
            {row.original.note || '—'}
          </div>
        ),
      },
    ],
    [t]
  );

  const paginationMeta = useMemo(() => {
    if (!reportData || hasInvalidRange) return null;
    return {
      current_page: reportData.current_page,
      per_page: reportData.per_page,
      total: reportData.total,
      last_page: reportData.last_page,
      from: reportData.from,
      to: reportData.to,
    };
  }, [hasInvalidRange, reportData]);

  const { table } = useDataTable<AttendanceReportRecord>({
    data: visibleData,
    columns,
    pageCount: hasInvalidRange ? 1 : reportData?.last_page || 1,
    paginationMeta,
    getRowId: (row) => row.id,
    initialState: {
      pagination: { pageIndex: filters.page - 1, pageSize: filters.perPage },
    },
    onPaginationChange: (pagination) => {
      setFilters((previous) => ({
        ...previous,
        page: pagination.pageIndex + 1,
        perPage: pagination.pageSize,
      }));
    },
  });

  const hasActiveFilters =
    filters.studentId || filters.classId || filters.academicYearId || filters.status ||
    filters.studentType || filters.dateFrom || filters.dateTo;

  const attendanceRate = visibleSummary.total > 0
    ? Math.round((visibleSummary.present / visibleSummary.total) * 100)
    : null;

  const exportDisabled = isGenerating || isLoading || hasInvalidRange || totalMatchingRecords === 0;

  const statusOptions = getStatusOptions(t);

  const studentTypeOptions = [
    { value: '' as const, label: t('attendancePage.studentTypeAll') || 'All Students', icon: Users },
    { value: 'boarders' as const, label: t('attendancePage.studentTypeBoarders') || 'Boarders', icon: School },
    { value: 'day_scholars' as const, label: t('attendancePage.studentTypeDayScholars') || 'Day Scholars', icon: GraduationCap },
  ];

  return (
    <div className="container mx-auto p-3 md:p-5 max-w-7xl space-y-4">

      {/* ── Header ── */}
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold text-base leading-tight">
                {t('nav.attendanceReports') || 'Attendance Reports'}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('attendanceReports.subtitle') || 'Review daily attendance records with the current school context.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {currentSchool && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground border rounded-lg px-2.5 py-1.5 bg-muted/30">
                <School className="h-3.5 w-3.5" />
                <span className="font-medium">{currentSchool.schoolName}</span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              className="rounded-xl h-8 gap-1.5 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {t('events.refresh') || 'Refresh'}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <OfflineDisabled reason="Report exports are generated server-side. Reconnect to download.">
                  <Button
                    size="sm"
                    disabled={exportDisabled}
                    className="rounded-xl h-8 gap-1.5 text-xs"
                  >
                    {isGenerating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    {t('events.export') || 'Export'}
                  </Button>
                </OfflineDisabled>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel className="text-xs">
                  {t('attendanceReports.exportDaily') || 'Export daily report'}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void handleGenerateReport('pdf')} disabled={isGenerating}>
                  <FileText className="mr-2 h-4 w-4" />
                  PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void handleGenerateReport('excel')} disabled={isGenerating}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* School context hint */}
        <div className="px-5 py-2 border-t bg-muted/20">
          <p className="text-xs text-muted-foreground">
            {t('attendanceReports.scopeHint') || 'This report follows the active school context. Switch schools from the main app header to review another campus.'}
          </p>
        </div>
      </div>

      {/* ── Invalid range warning ── */}
      {hasInvalidRange && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-destructive">
              {t('attendanceTotalsReport.invalidRange') || 'Invalid date range'}
            </p>
            <p className="text-xs text-destructive/80 mt-0.5">
              {t('attendanceTotalsReport.invalidRangeDetail') || 'Start date must be before the end date.'}
            </p>
          </div>
        </div>
      )}

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {/* Total records */}
        <div className="rounded-2xl border bg-card p-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground truncate">
              {t('attendanceTotalsReport.totalRecords') || 'Total Records'}
            </p>
            <p className="text-3xl font-bold mt-1 tabular-nums leading-none">
              {totalMatchingRecords.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1.5 hidden sm:block">
              {t('attendanceReports.matchingFilters') || 'Matching current filters'}
            </p>
          </div>
          <div className="p-2.5 rounded-xl shrink-0 bg-primary/10 text-primary">
            <FileText className="h-4 w-4" />
          </div>
        </div>

        {/* Present */}
        <div className="rounded-2xl border bg-card p-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground truncate">
              {t('attendancePage.statusPresent') || 'Present'}
            </p>
            <p className="text-3xl font-bold mt-1 tabular-nums leading-none">
              {visibleSummary.present.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1.5 hidden sm:block">
              {visibleSummary.total > 0
                ? `${Math.round((visibleSummary.present / visibleSummary.total) * 100)}% ${t('attendanceReports.ofCurrentPage') || 'of page'}`
                : '—'}
            </p>
          </div>
          <div className="p-2.5 rounded-xl shrink-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>

        {/* Absent */}
        <div className="rounded-2xl border bg-card p-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground truncate">
              {t('attendancePage.statusAbsent') || 'Absent'}
            </p>
            <p className="text-3xl font-bold mt-1 tabular-nums leading-none">
              {visibleSummary.absent.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1.5 hidden sm:block">
              {visibleSummary.total > 0
                ? `${Math.round((visibleSummary.absent / visibleSummary.total) * 100)}% ${t('attendanceReports.ofCurrentPage') || 'of page'}`
                : '—'}
            </p>
          </div>
          <div className="p-2.5 rounded-xl shrink-0 bg-red-500/10 text-red-600 dark:text-red-400">
            <XCircle className="h-4 w-4" />
          </div>
        </div>

        {/* Attendance rate */}
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground truncate">
                {t('attendanceTotalsReport.attendanceRate') || 'Attendance Rate'}
              </p>
              <p className="text-3xl font-bold mt-1 tabular-nums leading-none">
                {attendanceRate !== null ? `${attendanceRate}%` : '—'}
              </p>
            </div>
            <div className="p-2.5 rounded-xl shrink-0 bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          {attendanceRate !== null && (
            <div className="mt-3">
              <Progress
                value={attendanceRate}
                className="h-1.5"
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Filters ── */}
      <FilterPanel
        title={t('attendanceTotalsReport.filtersTitle') || 'Filters'}
        defaultOpenDesktop={true}
        defaultOpenMobile={false}
        className="rounded-2xl shadow-sm overflow-hidden"
        footer={hasActiveFilters ? (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-7 text-xs rounded-lg text-muted-foreground hover:text-foreground"
            >
              {t('events.reset') || 'Clear all'}
            </Button>
          </div>
        ) : null}
      >
        <div className="space-y-5">

          {/* Row 1: Student / Class / Academic Year */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                {t('attendanceReports.student') || 'Student'}
              </Label>
              <Combobox
                options={students.map((student) => ({
                  value: student.id,
                  label: `${student.fullName} (${student.admissionNumber || '-'})`,
                }))}
                value={filters.studentId}
                onValueChange={(value) => handleFilterChange('studentId', value)}
                placeholder={t('leave.allStudents') || 'All students'}
                searchPlaceholder={t('attendancePage.searchRosterPlaceholder') || 'Search students...'}
                emptyText={t('attendanceReports.noRecords') || 'No records found'}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                {t('search.class') || 'Class'}
              </Label>
              <Combobox
                options={(classes || []).map((c) => ({ value: c.id, label: c.name }))}
                value={filters.classId}
                onValueChange={(value) => handleFilterChange('classId', value)}
                placeholder={t('students.allClasses') || 'All classes'}
                searchPlaceholder={t('attendancePage.searchSessions') || 'Search classes...'}
                emptyText={t('attendanceReports.noRecords') || 'No records found'}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                {t('attendanceTotalsReport.academicYear') || 'Academic year'}
              </Label>
              <Combobox
                options={(academicYears || []).map((ay) => ({ value: ay.id, label: ay.name }))}
                value={filters.academicYearId}
                onValueChange={(value) => handleFilterChange('academicYearId', value)}
                placeholder={t('attendanceTotalsReport.allYears') || 'All years'}
                searchPlaceholder={t('attendanceTotalsReport.academicYear') || 'Academic year'}
                emptyText={t('attendanceReports.noRecords') || 'No records found'}
              />
            </div>
          </div>

          {/* Row 2: Status chips */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">
              {t('attendancePage.statusHeader') || 'Status'}
            </Label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleFilterChange('status', '')}
                className={cn(
                  'text-xs px-3 py-1.5 rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary font-medium',
                  !filters.status
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border hover:border-primary/50 hover:bg-muted'
                )}
              >
                {t('userManagement.allStatus') || 'All'}
              </button>
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleFilterChange('status', filters.status === opt.value ? '' : opt.value)}
                  className={cn(
                    'text-xs px-3 py-1.5 rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary font-medium',
                    filters.status === opt.value
                      ? opt.className
                      : 'bg-background border-border hover:border-primary/50 hover:bg-muted'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Row 3: Student type */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">
              {t('attendancePage.studentTypeLabel') || 'Student Type'}
            </Label>
            <div className="flex flex-wrap gap-2">
              {studentTypeOptions.map((opt) => {
                const Icon = opt.icon;
                const active = (filters.studentType || '') === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleFilterChange('studentType', opt.value)}
                    className={cn(
                      'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary font-medium',
                      active
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border hover:border-primary/50 hover:bg-muted'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 4: Date range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                {t('library.fromDate') || 'From date'}
              </Label>
              <CalendarDatePicker
                date={filters.dateFrom ? parseLocalDate(filters.dateFrom) : undefined}
                onDateChange={(date) => handleFilterChange('dateFrom', date ? dateToLocalYYYYMMDD(date) : '')}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                {t('library.toDate') || 'To date'}
              </Label>
              <CalendarDatePicker
                date={filters.dateTo ? parseLocalDate(filters.dateTo) : undefined}
                onDateChange={(date) => handleFilterChange('dateTo', date ? dateToLocalYYYYMMDD(date) : '')}
              />
            </div>
          </div>
        </div>
      </FilterPanel>

      {/* ── Results table ── */}
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b bg-muted/20 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">
              {t('attendanceReports.dailyRecords') || 'Daily attendance records'}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('attendanceReports.dailyRecordsHint') ||
                'All marked attendance entries for the active school, filtered by your selections above.'}
            </p>
          </div>
          <Badge variant="outline" className="shrink-0 text-xs">
            {totalMatchingRecords.toLocaleString()} {t('attendanceTotalsReport.records') || 'records'}
          </Badge>
        </div>

        {isLoading ? (
          <div className="py-16 flex items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id} className="bg-muted/30 hover:bg-muted/30">
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} className="text-xs font-semibold">
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.length > 0 ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id} className="hover:bg-muted/30 transition-colors">
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="py-3">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <UserRound className="h-8 w-8 text-muted-foreground/30" />
                          <p className="text-sm text-muted-foreground">
                            {hasInvalidRange
                              ? t('attendanceTotalsReport.invalidRangeDetail') || 'Fix the date range to load data.'
                              : t('attendanceReports.noRecords') || 'No attendance records found'}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {paginationMeta && totalMatchingRecords > 0 && (
              <div className="px-4 py-3 border-t bg-muted/10">
                <DataTablePagination
                  table={table}
                  paginationMeta={paginationMeta}
                  showPageSizeSelector={true}
                  showTotalCount={true}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Export progress dialog ── */}
      <Dialog
        open={showProgressDialog}
        onOpenChange={(open) => {
          if (!open && !isGenerating) setShowProgressDialog(false);
        }}
      >
        <DialogContent aria-describedby="attendance-report-progress-description">
          <DialogHeader>
            <DialogTitle>
              {t('attendanceReports.generatingReport') || 'Generating report'}
            </DialogTitle>
            <DialogDescription id="attendance-report-progress-description">
              {reportStatus === 'processing' || reportStatus === 'pending'
                ? t('attendanceReports.reportInProgress') || 'Please wait while the report is being generated.'
                : reportStatus === 'completed'
                  ? t('attendanceReports.reportReady') || 'Report is ready.'
                  : reportStatus === 'failed'
                    ? t('attendanceReports.reportFailed') || 'Report generation failed.'
                    : t('attendanceReports.reportStatus') || 'Report status'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Progress value={reportProgress} className="h-2" />
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span className="capitalize">{reportStatus || 'pending'}</span>
              <span className="font-medium tabular-nums">{reportProgress}%</span>
            </div>
            {isGenerating && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t('studentReportCard.generating') || 'Generating...'}</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
