import { ColumnDef, flexRender } from '@tanstack/react-table';
import { format, subDays, subMonths } from 'date-fns';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Calendar,
  CheckCircle2,
  FileText,
  RefreshCw,
  XCircle,
  Clock,
  Heart,
  GraduationCap,
  Building2,
  Download,
  Loader2,
  FileDown,
  FileSpreadsheet,
  School,
  Users,
  UserRound,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { FilterPanel } from '@/components/layout/FilterPanel';
import { PageHeader } from '@/components/layout/PageHeader';
import { dateToLocalYYYYMMDD, parseLocalDate } from '@/lib/dateUtils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Combobox } from '@/components/ui/combobox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/hooks/useLanguage';
import { useDatePreference } from '@/hooks/useDatePreference';
import { useProfile } from '@/hooks/useProfiles';
import { useSchools } from '@/hooks/useSchools';
import { useClasses } from '@/hooks/useClasses';
import { useAcademicYears, useCurrentAcademicYear } from '@/hooks/useAcademicYears';
import { useStudentAdmissions } from '@/hooks/useStudentAdmissions';
import { useDataTable } from '@/hooks/use-data-table';
import { useAttendanceTotalsReport } from '@/hooks/useAttendanceTotalsReport';
import { attendanceSessionsApi, apiClient } from '@/lib/api/client';
import { showToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import type {
  AttendanceStudentSummary,
  AttendanceTotalsReportFilters,
} from '@/types/domain/attendanceTotalsReport';
import type { PaginationMeta } from '@/types/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSpinner } from '@/components/ui/loading';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const formatPercent = (value?: number | null) =>
  value === null || value === undefined ? '—' : `${value.toFixed(1)}%`;

const buildTotalsInsightsSearchParams = (filters: AttendanceTotalsReportFilters): URLSearchParams => {
  const params = new URLSearchParams();
  if (filters.academicYearId) params.set('academic_year_id', filters.academicYearId);
  if (filters.classId) params.set('class_id', filters.classId);
  if (filters.status) params.set('status', filters.status);
  if (filters.dateFrom) params.set('date_from', filters.dateFrom);
  if (filters.dateTo) params.set('date_to', filters.dateTo);
  if (filters.studentId) params.set('student_id', filters.studentId);
  if (filters.studentType) params.set('student_type', filters.studentType);
  return params;
};

const metricBadgeClass: Record<
  'present' | 'absent' | 'late' | 'excused' | 'sick' | 'leave' | 'total',
  string
> = {
  present: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  absent: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
  late: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
  excused: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
  sick: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800',
  leave: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800',
  total: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700',
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

const STATUS_KEYS = ['present', 'absent', 'late', 'excused', 'sick', 'leave'] as const;

export default function AttendanceTotalsReports() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { calendar } = useDatePreference();
  const { data: profile } = useProfile();
  const [reportType, setReportType] = useState<'pdf' | 'excel'>('pdf');
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [reportProgress, setReportProgress] = useState(0);
  const [reportStatus, setReportStatus] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { data: schools } = useSchools(profile?.organization_id);
  const { data: classes } = useClasses(profile?.organization_id);
  const { data: academicYears } = useAcademicYears(profile?.organization_id);
  const { data: currentAcademicYear } = useCurrentAcademicYear(profile?.organization_id);
  const defaultAcademicYearAppliedRef = useRef(false);

  const [filters, setFilters] = useState<AttendanceTotalsReportFilters>({
    classId: undefined,
    academicYearId: undefined,
    status: undefined,
    dateFrom: undefined,
    dateTo: undefined,
    studentId: undefined,
    studentType: undefined,
  });

  const [studentBreakdownPage, setStudentBreakdownPage] = useState(1);
  const [studentBreakdownPerPage, setStudentBreakdownPerPage] = useState(25);

  const [dateRangePreset, setDateRangePreset] = useState<'1week' | '1month' | '4months' | 'custom'>('1week');

  const studentAdmissionFilters = useMemo(
    () => ({
      enrollment_status: 'active' as const,
      school_id: profile?.default_school_id ?? undefined,
      ...(filters.academicYearId ? { academic_year_id: filters.academicYearId } : {}),
      ...(filters.classId ? { class_id: filters.classId } : {}),
    }),
    [filters.academicYearId, filters.classId, profile?.default_school_id]
  );

  const { data: studentAdmissions } = useStudentAdmissions(
    profile?.organization_id,
    false,
    studentAdmissionFilters
  );

  useEffect(() => {
    if (defaultAcademicYearAppliedRef.current || !currentAcademicYear?.id) {
      return;
    }
    defaultAcademicYearAppliedRef.current = true;
    setFilters((prev) => ({ ...prev, academicYearId: currentAcademicYear.id }));
  }, [currentAcademicYear?.id]);

  useEffect(() => {
    const paramsFilters: Partial<AttendanceTotalsReportFilters> = {
      academicYearId: searchParams.get('academic_year_id') || undefined,
      classId: searchParams.get('class_id') || undefined,
      status: (searchParams.get('status') as AttendanceTotalsReportFilters['status']) || undefined,
      dateFrom: searchParams.get('date_from') || undefined,
      dateTo: searchParams.get('date_to') || undefined,
      studentId: searchParams.get('student_id') || undefined,
      studentType:
        (searchParams.get('student_type') as AttendanceTotalsReportFilters['studentType']) || undefined,
    };
    if (Object.values(paramsFilters).some(Boolean)) {
      setFilters((prev) => ({ ...prev, ...paramsFilters }));
      if (paramsFilters.dateFrom || paramsFilters.dateTo) {
        setDateRangePreset('custom');
      }
    }
  }, [searchParams]);

  useEffect(() => {
    setStudentBreakdownPage(1);
  }, [
    filters.academicYearId,
    filters.classId,
    filters.status,
    filters.dateFrom,
    filters.dateTo,
    filters.studentId,
    filters.studentType,
  ]);

  const students = useMemo(() => {
    if (!studentAdmissions || !Array.isArray(studentAdmissions)) return [];
    return studentAdmissions.map((admission) => admission.student).filter(Boolean);
  }, [studentAdmissions]);

  const studentComboboxOptions = useMemo(
    () => [
      { value: '', label: t('attendanceReports.allStudentsOption') },
      ...students.map((student) => ({
        value: student!.id,
        label: `${student!.fullName} (${student!.admissionNumber || '-'})`,
      })),
    ],
    [students, t]
  );

  const currentSchool = useMemo(
    () => schools?.find((school) => school.id === profile?.default_school_id) ?? null,
    [profile?.default_school_id, schools]
  );

  const attendanceStatusMeta = useMemo(
    () =>
      ({
        present: {
          label: t('attendancePage.statusPresent'),
          icon: CheckCircle2,
          tone: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950',
        },
        absent: {
          label: t('attendancePage.statusAbsent'),
          icon: XCircle,
          tone: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950',
        },
        late: {
          label: t('attendancePage.statusLate'),
          icon: Clock,
          tone: 'text-amber-600 bg-amber-50 dark:text-amber-300 dark:bg-amber-950',
        },
        excused: {
          label: t('attendancePage.statusExcused'),
          icon: AlertTriangle,
          tone: 'text-blue-600 bg-blue-50 dark:text-blue-300 dark:bg-blue-950',
        },
        sick: {
          label: t('attendancePage.statusSick'),
          icon: Heart,
          tone: 'text-purple-600 bg-purple-50 dark:text-purple-300 dark:bg-purple-950',
        },
        leave: {
          label: t('attendancePage.statusLeave'),
          icon: Calendar,
          tone: 'text-orange-600 bg-orange-50 dark:text-orange-300 dark:bg-orange-950',
        },
      }) as const,
    [t]
  );

  const hasInvalidRange = useMemo(() => {
    if (!filters.dateFrom || !filters.dateTo) return false;
    return new Date(filters.dateFrom).getTime() > new Date(filters.dateTo).getTime();
  }, [filters.dateFrom, filters.dateTo]);

  const hookFilters = useMemo(
    (): AttendanceTotalsReportFilters => ({
      organizationId: profile?.organization_id,
      academicYearId: filters.academicYearId || undefined,
      classId: filters.classId || undefined,
      status: filters.status,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      studentId: filters.studentId || undefined,
      studentType:
        filters.studentType === 'boarders' || filters.studentType === 'day_scholars'
          ? filters.studentType
          : undefined,
      sessionsLimit: 80,
      studentBreakdownPage,
      studentBreakdownPerPage,
    }),
    [
      profile?.organization_id,
      filters.academicYearId,
      filters.classId,
      filters.status,
      filters.dateFrom,
      filters.dateTo,
      filters.studentId,
      filters.studentType,
      studentBreakdownPage,
      studentBreakdownPerPage,
    ]
  );

  const { data: report, isLoading, refetch } = useAttendanceTotalsReport(hookFilters, {
    enabled: !!profile?.organization_id && !!profile?.default_school_id && !hasInvalidRange,
  });

  const studentBreakdownPaginationApi = useMemo((): PaginationMeta | null => {
    const m = report?.studentBreakdownMeta;
    if (!m || m.total <= 0) return null;
    return {
      current_page: m.currentPage,
      per_page: m.perPage,
      total: m.total,
      last_page: m.lastPage,
      from: m.from,
      to: m.to,
    };
  }, [report?.studentBreakdownMeta]);

  const studentBreakdownColumns = useMemo<ColumnDef<AttendanceStudentSummary>[]>(
    () => [
      {
        id: 'studentInfo',
        header: t('attendanceReports.student'),
        cell: ({ row }) => (
          <div className="min-w-[240px] space-y-1.5 rounded-md border bg-muted/20 p-2.5">
            <p className="font-semibold leading-none">{row.original.studentName}</p>
            <p className="text-xs text-muted-foreground">{t('attendanceTotalsReport.columnFatherName')}: {row.original.fatherName ?? '—'}</p>
            <p className="text-xs text-muted-foreground">{t('attendanceTotalsReport.columnCardNumber')}: {row.original.cardNumber ?? '—'}</p>
            <p className="text-xs text-muted-foreground">{t('attendanceTotalsReport.columnAdmission')}: {row.original.admissionNo ?? '—'}</p>
          </div>
        ),
      },
      {
        id: 'residencyAndRoom',
        header: `${t('attendanceTotalsReport.columnResidency')} / ${t('attendanceTotalsReport.columnBuildingRoom')}`,
        cell: ({ row }) => (
          <div className="min-w-[190px] space-y-1.5 rounded-md border bg-muted/10 p-2.5">
            <p className="text-xs text-muted-foreground">{t('attendanceTotalsReport.columnResidency')}: {' '}
              <Badge variant="outline" className="h-5 px-2 align-middle">
                {row.original.residency === 'boarder'
                ? t('attendanceTotalsReport.residencyBoarder')
                : row.original.residency === 'day_scholar'
                  ? t('attendanceTotalsReport.residencyDayScholar')
                  : '—'}
              </Badge>
            </p>
            <p className="text-xs text-muted-foreground">{t('attendanceTotalsReport.columnBuildingRoom')}: {row.original.buildingRoom ?? '—'}</p>
          </div>
        ),
      },
      {
        id: 'attendanceRate',
        header: t('attendanceTotalsReport.attendanceRate'),
        cell: ({ row }) => (
          <Badge variant="outline" className="tabular-nums">
            {formatPercent(row.original.attendanceRate)}
          </Badge>
        ),
      },
      {
        id: 'present',
        header: t('examReports.present'),
        cell: ({ row }) => (
          <Badge variant="outline" className={cn('tabular-nums', metricBadgeClass.present)}>
            {row.original.present.toLocaleString()}
          </Badge>
        ),
      },
      {
        id: 'absent',
        header: t('attendanceTotalsReport.absent'),
        cell: ({ row }) => (
          <Badge variant="outline" className={cn('tabular-nums', metricBadgeClass.absent)}>
            {row.original.absent.toLocaleString()}
          </Badge>
        ),
      },
      {
        id: 'late',
        header: t('attendancePage.statusLate'),
        cell: ({ row }) => (
          <Badge variant="outline" className={cn('tabular-nums', metricBadgeClass.late)}>
            {row.original.late.toLocaleString()}
          </Badge>
        ),
      },
      {
        id: 'excused',
        header: t('attendancePage.statusExcused'),
        cell: ({ row }) => (
          <Badge variant="outline" className={cn('tabular-nums', metricBadgeClass.excused)}>
            {row.original.excused.toLocaleString()}
          </Badge>
        ),
      },
      {
        id: 'sick',
        header: t('attendancePage.statusSick'),
        cell: ({ row }) => (
          <Badge variant="outline" className={cn('tabular-nums', metricBadgeClass.sick)}>
            {row.original.sick.toLocaleString()}
          </Badge>
        ),
      },
      {
        id: 'leave',
        header: t('attendancePage.statusLeave'),
        cell: ({ row }) => (
          <Badge variant="outline" className={cn('tabular-nums', metricBadgeClass.leave)}>
            {row.original.leave.toLocaleString()}
          </Badge>
        ),
      },
      {
        id: 'totalRecords',
        header: t('attendanceTotalsReport.totalRecords'),
        cell: ({ row }) => (
          <Badge variant="outline" className={cn('tabular-nums', metricBadgeClass.total)}>
            {row.original.totalRecords.toLocaleString()}
          </Badge>
        ),
      },
    ],
    [t]
  );

  const { table: studentBreakdownTable } = useDataTable<AttendanceStudentSummary>({
    data: report?.studentBreakdown ?? [],
    columns: studentBreakdownColumns,
    pageCount: report?.studentBreakdownMeta?.lastPage ?? 1,
    paginationMeta: studentBreakdownPaginationApi,
    initialState: {
      pagination: { pageIndex: studentBreakdownPage - 1, pageSize: studentBreakdownPerPage },
    },
    onPaginationChange: (newPagination) => {
      setStudentBreakdownPage(newPagination.pageIndex + 1);
      setStudentBreakdownPerPage(newPagination.pageSize);
    },
  });

  const totalMarkedAggregates = useMemo(() => {
    if (!report?.totals) return 0;
    const row = report.totals;
    return row.present + row.absent + row.late + row.excused + row.sick + row.leave;
  }, [report?.totals]);

  const dateRangeSummary = useMemo(() => {
    if (!filters.dateFrom || !filters.dateTo) return null;
    const from = parseLocalDate(filters.dateFrom);
    const to = parseLocalDate(filters.dateTo);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
    const same = filters.dateFrom === filters.dateTo;
    return same
      ? format(from, 'MMM d, yyyy')
      : `${format(from, 'MMM d, yyyy')} — ${format(to, 'MMM d, yyyy')}`;
  }, [filters.dateFrom, filters.dateTo]);

  const selectedStudentLabel = useMemo(() => {
    if (!filters.studentId) return null;
    const opt = studentComboboxOptions.find((o) => o.value === filters.studentId);
    return opt?.label ?? null;
  }, [filters.studentId, studentComboboxOptions]);

  const studentTypeOptions = [
    { value: undefined as undefined, label: t('attendancePage.studentTypeAll'), icon: Users },
    { value: 'boarders' as const, label: t('attendancePage.studentTypeBoarders'), icon: School },
    { value: 'day_scholars' as const, label: t('attendancePage.studentTypeDayScholars'), icon: GraduationCap },
  ];

  const handleFilterChange = (key: keyof AttendanceTotalsReportFilters, value: string | undefined) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === 'all' || value === '' ? undefined : value,
    }));
  };

  const setStudentTypeFilter = (value: 'boarders' | 'day_scholars' | undefined) => {
    setFilters((prev) => ({ ...prev, studentType: value }));
  };

  const handleDateRangePreset = (preset: '1week' | '1month' | '4months' | 'custom') => {
    setDateRangePreset(preset);
    if (preset === 'custom') {
      return;
    }

    const today = new Date();
    let dateFrom: string;
    const dateTo: string = format(today, 'yyyy-MM-dd');

    switch (preset) {
      case '1week':
        dateFrom = format(subDays(today, 7), 'yyyy-MM-dd');
        break;
      case '1month':
        dateFrom = format(subMonths(today, 1), 'yyyy-MM-dd');
        break;
      case '4months':
        dateFrom = format(subMonths(today, 4), 'yyyy-MM-dd');
        break;
      default:
        return;
    }

    setFilters((prev) => ({ ...prev, dateFrom, dateTo }));
  };

  useEffect(() => {
    if (!filters.dateFrom || !filters.dateTo) {
      handleDateRangePreset('1week');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time default range on mount
  }, []);

  const handleResetFilters = () => {
    setDateRangePreset('1week');
    const today = new Date();
    const dateTo = format(today, 'yyyy-MM-dd');
    const dateFrom = format(subDays(today, 7), 'yyyy-MM-dd');
    setFilters({
      classId: undefined,
      academicYearId: currentAcademicYear?.id ?? undefined,
      status: undefined,
      dateFrom,
      dateTo,
      studentId: undefined,
      studentType: undefined,
    });
  };

  const handleGenerateReport = async (variant: 'totals' | 'class_wise' | 'room_wise') => {
    if (!report) {
      showToast.error(t('events.noDataToExport'));
      return;
    }

    if (!profile?.default_school_id) {
      showToast.error(t('attendanceTotalsReport.schoolRequired'));
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
      const langCode = language === 'en' ? 'en' : language === 'ps' ? 'ps' : language === 'fa' ? 'fa' : 'ar';

      const studentTypeParam =
        filters.studentType === 'boarders' || filters.studentType === 'day_scholars' || filters.studentType === 'all'
          ? filters.studentType
          : undefined;

      const response = (await attendanceSessionsApi.generateReport({
        report_type: reportType,
        report_variant: variant,
        branding_id: profile.default_school_id,
        calendar_preference: calendarPreference,
        language: langCode,
        class_id: filters.classId || undefined,
        status: filters.status || undefined,
        date_from: filters.dateFrom || undefined,
        date_to: filters.dateTo || undefined,
        academic_year_id: filters.academicYearId || undefined,
        student_id: filters.studentId || undefined,
        student_type: studentTypeParam,
      })) as {
        success?: boolean;
        download_url?: string;
        report_id?: string;
        error?: string;
      };

      if (response.success && response.download_url) {
        await downloadReportWithAuth(response.download_url, `attendance-totals-${variant}.${reportType}`);
        setShowProgressDialog(false);
        setIsGenerating(false);
        showToast.success(t('attendanceTotalsReport.reportExported'));
      } else if (response.success && response.report_id) {
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

            if (!statusResponse.success) {
              throw new Error(statusResponse.error || 'Failed to get report status');
            }

            setReportProgress(statusResponse.progress || 0);
            setReportStatus(statusResponse.status);

            if (statusResponse.status === 'completed' && statusResponse.download_url) {
              await downloadReportWithAuth(
                statusResponse.download_url,
                `attendance-totals-${variant}.${reportType}`
              );
              setShowProgressDialog(false);
              setIsGenerating(false);
              showToast.success(t('attendanceTotalsReport.reportExported'));
            } else if (statusResponse.status === 'failed') {
              setShowProgressDialog(false);
              setIsGenerating(false);
              showToast.error(
                statusResponse.error_message || t('attendanceTotalsReport.reportGenerationFailed')
              );
            } else {
              setTimeout(pollStatus, 1000);
            }
          } catch (error: unknown) {
            setShowProgressDialog(false);
            setIsGenerating(false);
            showToast.error(
              error instanceof Error ? error.message : t('attendanceTotalsReport.reportGenerationFailed')
            );
          }
        };
        pollStatus();
      } else {
        throw new Error(response.error || 'Failed to generate report');
      }
    } catch (error: unknown) {
      setShowProgressDialog(false);
      setIsGenerating(false);
      showToast.error(
        error instanceof Error ? error.message : t('attendanceTotalsReport.reportGenerationFailed')
      );
    }
  };

  const breakdownTableHeadClass = 'text-right whitespace-nowrap';
  const insightParams = buildTotalsInsightsSearchParams(filters);

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl space-y-6 overflow-x-hidden">
      <PageHeader
        title={t('nav.attendanceTotalsReport')}
        description={t('attendanceTotalsReport.subtitle')}
        icon={<Activity className="h-5 w-5" />}
        secondaryActions={[
          {
            label: t('attendanceTotalsReport.openInsights'),
            onClick: () => navigate(`/attendance/reports/totals/insights?${insightParams.toString()}`),
            icon: <BarChart3 className="h-4 w-4" />,
            variant: 'outline',
          },
          {
            label: t('events.refresh'),
            onClick: () => void refetch(),
            icon: <RefreshCw className="h-4 w-4" />,
            variant: 'outline',
          },
        ]}
        rightSlot={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={isLoading || !report || isGenerating}
                className="flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="hidden sm:inline">{t('attendanceTotalsReport.generating')}</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('events.export')}</span>
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{t('attendanceTotalsReport.exportOptions')}</DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  <span>{t('attendanceTotalsReport.totals')}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem
                    onClick={() => {
                      setReportType('pdf');
                      void handleGenerateReport('totals');
                    }}
                    disabled={isGenerating}
                  >
                    <FileDown className="mr-2 h-4 w-4" />
                    <span>PDF</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setReportType('excel');
                      void handleGenerateReport('totals');
                    }}
                    disabled={isGenerating}
                  >
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    <span>Excel</span>
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <GraduationCap className="mr-2 h-4 w-4" />
                  <span>{t('attendanceTotalsReport.classWise')}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem
                    onClick={() => {
                      setReportType('pdf');
                      void handleGenerateReport('class_wise');
                    }}
                    disabled={isGenerating}
                  >
                    <FileDown className="mr-2 h-4 w-4" />
                    <span>PDF</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setReportType('excel');
                      void handleGenerateReport('class_wise');
                    }}
                    disabled={isGenerating}
                  >
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    <span>Excel</span>
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Building2 className="mr-2 h-4 w-4" />
                  <span>{t('attendanceTotalsReport.roomWise')}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem
                    onClick={() => {
                      setReportType('pdf');
                      void handleGenerateReport('room_wise');
                    }}
                    disabled={isGenerating}
                  >
                    <FileDown className="mr-2 h-4 w-4" />
                    <span>PDF</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setReportType('excel');
                      void handleGenerateReport('room_wise');
                    }}
                    disabled={isGenerating}
                  >
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    <span>Excel</span>
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      {currentSchool && (
        <Alert>
          <School className="h-4 w-4" />
          <AlertTitle>{currentSchool.schoolName}</AlertTitle>
          <AlertDescription>{t('attendanceReports.scopeHint')}</AlertDescription>
        </Alert>
      )}

      {hasInvalidRange && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('attendanceTotalsReport.invalidRange')}</AlertTitle>
          <AlertDescription>{t('attendanceTotalsReport.invalidRangeDetail')}</AlertDescription>
        </Alert>
      )}

      <FilterPanel
        title={t('attendanceTotalsReport.filtersTitle')}
        defaultOpenDesktop
        defaultOpenMobile={false}
        footer={
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={handleResetFilters}>
              {t('events.reset')}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('attendanceTotalsReport.filtersDescription')}</p>

          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>{t('attendanceTotalsReport.academicYear')}</Label>
              <Combobox
                options={(academicYears || []).map((year) => ({ value: year.id, label: year.name }))}
                value={filters.academicYearId ?? ''}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, academicYearId: value || undefined }))
                }
                placeholder={t('attendanceTotalsReport.allYears')}
                searchPlaceholder={t('attendanceTotalsReport.academicYear')}
                emptyText={t('attendanceReports.noRecords')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('search.class')}</Label>
              <Combobox
                options={(classes || []).map((classItem) => ({ label: classItem.name, value: classItem.id }))}
                value={filters.classId ?? ''}
                onValueChange={(value) => handleFilterChange('classId', value)}
                placeholder={t('students.allClasses')}
                searchPlaceholder={t('attendancePage.searchSessions')}
                emptyText={t('attendanceReports.noRecords')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('attendanceReports.student')}</Label>
              <Combobox
                options={studentComboboxOptions}
                value={filters.studentId ?? ''}
                onValueChange={(value) => handleFilterChange('studentId', value)}
                placeholder={t('attendanceReports.allStudentsOption')}
                searchPlaceholder={t('attendancePage.searchRosterPlaceholder')}
                emptyText={t('attendanceReports.noRecords')}
              />
            </div>
          </div>

          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            <div className="space-y-2 rounded-lg border p-3">
              <Label>{t('events.status')}</Label>
              <Select
                value={filters.status ?? 'all'}
                onValueChange={(value) => handleFilterChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('subjects.all')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('subjects.all')}</SelectItem>
                  {STATUS_KEYS.map((key) => (
                    <SelectItem key={key} value={key}>
                      {attendanceStatusMeta[key].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 rounded-lg border p-3">
              <Label>{t('attendancePage.studentTypeLabel')}</Label>
              <div className="flex flex-wrap gap-2">
                {studentTypeOptions.map((opt) => {
                  const Icon = opt.icon;
                  const active =
                    (opt.value === undefined && !filters.studentType) || filters.studentType === opt.value;
                  return (
                    <button
                      key={opt.value ?? 'all'}
                      type="button"
                      aria-label={opt.label}
                      aria-pressed={active}
                      onClick={() => setStudentTypeFilter(opt.value)}
                      className={cn(
                        'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        active
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-border hover:bg-muted'
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('attendanceTotalsReport.dateRange')}</Label>
            <Tabs
              value={dateRangePreset}
              onValueChange={(value) => handleDateRangePreset(value as typeof dateRangePreset)}
            >
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="1week" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('attendanceTotalsReport.dateRange.1week')}</span>
                </TabsTrigger>
                <TabsTrigger value="1month" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('attendanceTotalsReport.dateRange.1month')}</span>
                </TabsTrigger>
                <TabsTrigger value="4months" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('attendanceTotalsReport.dateRange.4months')}</span>
                </TabsTrigger>
                <TabsTrigger value="custom" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('attendanceTotalsReport.dateRange.custom')}</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {dateRangePreset === 'custom' && (
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 pt-2">
                <div className="space-y-2">
                  <Label>{t('library.fromDate')}</Label>
                  <CalendarDatePicker
                    date={filters.dateFrom ? parseLocalDate(filters.dateFrom) : undefined}
                    onDateChange={(date) =>
                      handleFilterChange('dateFrom', date ? dateToLocalYYYYMMDD(date) : undefined)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('library.toDate')}</Label>
                  <CalendarDatePicker
                    date={filters.dateTo ? parseLocalDate(filters.dateTo) : undefined}
                    onDateChange={(date) =>
                      handleFilterChange('dateTo', date ? dateToLocalYYYYMMDD(date) : undefined)
                    }
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </FilterPanel>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner text={t('common.loading')} />
        </div>
      )}

      {!isLoading && report && (
        <div className="space-y-6">
          <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <StatsCard
              title={t('attendanceTotalsReport.totalMarkedRecords')}
              value={totalMarkedAggregates.toLocaleString()}
              icon={FileText}
              color="blue"
            />
            <StatsCard
              title={t('attendanceTotalsReport.totalSessions')}
              value={report.totals.sessions.toLocaleString()}
              icon={BarChart3}
              color="secondary"
            />
            <StatsCard
              title={t('attendanceTotalsReport.studentsMarked')}
              value={report.totals.studentsMarked.toLocaleString()}
              icon={Activity}
              color="purple"
            />
            <StatsCard
              title={t('attendancePage.statusPresent')}
              value={report.totals.present.toLocaleString()}
              icon={CheckCircle2}
              color="green"
            />
            <StatsCard
              title={t('attendancePage.statusAbsent')}
              value={report.totals.absent.toLocaleString()}
              icon={XCircle}
              color="red"
            />
            <StatsCard
              title={t('attendancePage.statusLate')}
              value={report.totals.late.toLocaleString()}
              icon={Clock}
              color="amber"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title={t('attendanceTotalsReport.attendanceRate')}
              value={formatPercent(report.totals.attendanceRate)}
              description={t('attendanceTotalsReport.attendanceRateHelper')}
              icon={BarChart3}
              color="green"
            />
            <StatsCard
              title={t('attendancePage.statusExcused')}
              value={report.totals.excused.toLocaleString()}
              icon={AlertTriangle}
              color="blue"
            />
            <StatsCard
              title={t('attendancePage.statusSick')}
              value={report.totals.sick.toLocaleString()}
              icon={Heart}
              color="purple"
            />
            <StatsCard
              title={t('attendancePage.statusLeave')}
              value={report.totals.leave.toLocaleString()}
              icon={Calendar}
              color="orange"
            />
          </div>

          {filters.studentId && selectedStudentLabel && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <UserRound className="h-4 w-4" />
                  {t('attendanceTotalsReport.selectedStudentRollup')}
                </CardTitle>
                <CardDescription>{t('attendanceTotalsReport.selectedStudentSummary')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-medium">{selectedStudentLabel}</p>
                {dateRangeSummary && (
                  <p className="text-muted-foreground">
                    {t('attendanceTotalsReport.dateRange')}: {dateRangeSummary}
                  </p>
                )}
                <div className="flex flex-wrap gap-3 pt-1">
                  <span>
                    {t('attendanceTotalsReport.totalMarkedRecords')}:{' '}
                    <strong>{totalMarkedAggregates.toLocaleString()}</strong>
                  </span>
                  <span>
                    {t('attendancePage.statusPresent')}: <strong>{report.totals.present.toLocaleString()}</strong>
                  </span>
                  <span>
                    {t('attendancePage.statusAbsent')}: <strong>{report.totals.absent.toLocaleString()}</strong>
                  </span>
                  <span>
                    {t('attendanceTotalsReport.attendanceRate')}:{' '}
                    <strong>{formatPercent(report.totals.attendanceRate)}</strong>
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {(report.studentBreakdownMeta?.total ?? 0) > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t('attendanceTotalsReport.studentBreakdownTitle')}</CardTitle>
                <CardDescription>{t('attendanceTotalsReport.studentBreakdownHint')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 overflow-x-auto">
                <Table>
                  <TableHeader>
                    {studentBreakdownTable.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => {
                          const columnId = header.column.id;
                          let thClass = '';
                          if (
                            columnId === 'attendanceRate' ||
                            columnId === 'present' ||
                            columnId === 'absent' ||
                            columnId === 'late' ||
                            columnId === 'excused' ||
                            columnId === 'sick' ||
                            columnId === 'leave' ||
                            columnId === 'totalRecords'
                          ) {
                            thClass = breakdownTableHeadClass;
                          }
                          return (
                            <TableHead key={header.id} className={cn(thClass, 'text-xs font-semibold')}>
                              {header.isPlaceholder
                                ? null
                                : flexRender(header.column.columnDef.header, header.getContext())}
                            </TableHead>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {studentBreakdownTable.getRowModel().rows.length > 0 ? (
                      studentBreakdownTable.getRowModel().rows.map((row) => (
                        <TableRow key={row.id}>
                          {row.getVisibleCells().map((cell) => {
                            const columnId = cell.column.id;
                            let tdClass = '';
                            if (
                              columnId === 'attendanceRate' ||
                              columnId === 'present' ||
                              columnId === 'absent' ||
                              columnId === 'late' ||
                              columnId === 'excused' ||
                              columnId === 'sick' ||
                              columnId === 'leave' ||
                              columnId === 'totalRecords'
                            ) {
                              tdClass = 'text-right tabular-nums';
                            }
                            return (
                              <TableCell key={cell.id} className={tdClass}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={studentBreakdownColumns.length} className="text-center text-muted-foreground">
                          {t('attendanceReports.noRecords')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                {studentBreakdownPaginationApi && (
                  <DataTablePagination
                    table={studentBreakdownTable}
                    paginationMeta={studentBreakdownPaginationApi}
                    showPageSizeSelector
                    showTotalCount
                  />
                )}
              </CardContent>
            </Card>
          )}

          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>{t('attendanceTotalsReport.insightsTitle')}</CardTitle>
              <CardDescription>{t('attendanceTotalsReport.insightsSubtitle')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                type="button"
                onClick={() => navigate(`/attendance/reports/totals/insights?${insightParams.toString()}`)}
                className="gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                {t('attendanceTotalsReport.openInsights')}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog
        open={showProgressDialog}
        onOpenChange={(open) => {
          if (!open && !isGenerating) {
            setShowProgressDialog(false);
          }
        }}
      >
        <DialogContent aria-describedby="attendance-totals-report-progress-description">
          <DialogHeader>
            <DialogTitle>{t('attendanceTotalsReport.generatingReport')}</DialogTitle>
            <DialogDescription id="attendance-totals-report-progress-description">
              {reportStatus === 'processing' || reportStatus === 'pending'
                ? t('attendanceTotalsReport.reportInProgress')
                : reportStatus === 'completed'
                  ? t('attendanceTotalsReport.reportReady')
                  : reportStatus === 'failed'
                    ? t('attendanceTotalsReport.reportFailed')
                    : t('attendanceTotalsReport.reportStatus')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Progress value={reportProgress} className="w-full" />
            <div className="text-sm text-muted-foreground text-center">
              {reportProgress}% {reportStatus && `(${reportStatus})`}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
