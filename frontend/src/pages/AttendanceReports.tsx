import { useQuery } from '@tanstack/react-query';
import { ColumnDef, flexRender } from '@tanstack/react-table';
import { format } from 'date-fns';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  RefreshCw,
  School,
  UserRound,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { StatsCard } from '@/components/dashboard/StatsCard';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { FilterPanel } from '@/components/layout/FilterPanel';
import { PageHeader } from '@/components/layout/PageHeader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  { value: 'present', label: t('attendancePage.statusPresent') || 'Present', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'absent', label: t('attendancePage.statusAbsent') || 'Absent', className: 'bg-red-50 text-red-700 border-red-200' },
  { value: 'late', label: t('attendancePage.statusLate') || 'Late', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'excused', label: t('attendancePage.statusExcused') || 'Excused', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'sick', label: t('attendancePage.statusSick') || 'Sick', className: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'leave', label: t('attendancePage.statusLeave') || 'Leave', className: 'bg-orange-50 text-orange-700 border-orange-200' },
] as const;

const StatusBadge = ({
  status,
  t,
}: {
  status: AttendanceApi.AttendanceStatus;
  t: ReturnType<typeof useLanguage>['t'];
}) => {
  const option = getStatusOptions(t).find((item) => item.value === status);

  if (!option) {
    return <Badge variant="outline">{status}</Badge>;
  }

  return (
    <Badge variant="outline" className={option.className}>
      {option.label}
    </Badge>
  );
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
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
  const [filters, setFilters] = useState({
    studentId: '',
    classId: '',
    academicYearId: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    page: 1,
    perPage: 25,
  });

  const students: Student[] = useMemo(() => {
    if (!studentAdmissions || !Array.isArray(studentAdmissions)) {
      return [];
    }

    return studentAdmissions
      .map((admission) => admission.student)
      .filter((student): student is Student => Boolean(student));
  }, [studentAdmissions]);

  const currentSchool = useMemo(
    () => schools?.find((school) => school.id === profile?.default_school_id) ?? null,
    [profile?.default_school_id, schools]
  );

  const hasInvalidRange = useMemo(() => {
    if (!filters.dateFrom || !filters.dateTo) {
      return false;
    }

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
        return {
          data: [],
          total: 0,
          current_page: 1,
          per_page: filters.perPage,
          last_page: 1,
          from: 0,
          to: 0,
        };
      }

      const response = await attendanceSessionsApi.report(
        buildAttendanceReportParams({
          organizationId: profile.organization_id,
          studentId: filters.studentId || undefined,
          classId: filters.classId || undefined,
          academicYearId: filters.academicYearId || undefined,
          status: (filters.status || undefined) as AttendanceApi.AttendanceStatus | undefined,
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
        date_from: filters.dateFrom || undefined,
        date_to: filters.dateTo || undefined,
      });

      if (response.success && response.download_url) {
        window.open(response.download_url, '_blank');
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

          if (!statusResponse.success) {
            throw new Error(statusResponse.error || 'Failed to get report status');
          }

          setReportProgress(statusResponse.progress || 0);
          setReportStatus(statusResponse.status || 'processing');

          if (statusResponse.status === 'completed' && statusResponse.download_url) {
            window.open(statusResponse.download_url, '_blank');
            setShowProgressDialog(false);
            setIsGenerating(false);
            showToast.success(t('attendanceReports.reportExported') || 'Report generated successfully');
            return;
          }

          if (statusResponse.status === 'failed') {
            setShowProgressDialog(false);
            setIsGenerating(false);
            showToast.error(
              statusResponse.error_message ||
                t('attendanceReports.reportGenerationFailed') ||
                'Failed to generate report'
            );
            return;
          }

          setTimeout(() => {
            void pollStatus();
          }, 1000);
        } catch (error: unknown) {
          setShowProgressDialog(false);
          setIsGenerating(false);
          showToast.error(
            getErrorMessage(error, t('attendanceReports.reportGenerationFailed') || 'Failed to check report status')
          );
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
          <div className="min-w-[220px]">
            <div className="font-medium">{row.original.studentName}</div>
            <div className="text-xs text-muted-foreground">
              {row.original.admissionNo}
              {row.original.cardNumber ? ` � ${row.original.cardNumber}` : ''}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'className',
        header: t('search.class') || 'Class',
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1.5">
            {row.original.classNames.length > 0 ? (
              row.original.classNames.map((className) => (
                <Badge key={`${row.original.id}-${className}`} variant="outline" className="font-normal">
                  {className}
                </Badge>
              ))
            ) : (
              <Badge variant="outline">{row.original.className}</Badge>
            )}
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
          <div className="min-w-[140px]">
            <div className="text-sm font-medium">{format(row.original.sessionDate, 'MMM dd, yyyy')}</div>
            <div className="text-xs text-muted-foreground">{format(row.original.markedAt, 'HH:mm')}</div>
          </div>
        ),
      },
      {
        accessorKey: 'entryMethod',
        header: t('attendanceReports.method') || 'Method',
        cell: ({ row }) => (
          <Badge variant="outline" className="capitalize font-normal">
            {row.original.entryMethod}
          </Badge>
        ),
      },
      {
        accessorKey: 'note',
        header: t('attendancePage.notesLabel') || 'Note',
        cell: ({ row }) => (
          <div className="max-w-[260px] text-sm text-muted-foreground">
            {row.original.note || '-'}
          </div>
        ),
      },
    ],
    [t]
  );

  const paginationMeta = useMemo(() => {
    if (!reportData || hasInvalidRange) {
      return null;
    }

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
      pagination: {
        pageIndex: filters.page - 1,
        pageSize: filters.perPage,
      },
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
    filters.studentId || filters.classId || filters.academicYearId || filters.status || filters.dateFrom || filters.dateTo;

  const exportDisabled = isGenerating || isLoading || hasInvalidRange || totalMatchingRecords === 0;

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl space-y-6">
      <PageHeader
        title={t('nav.attendanceReports') || 'Attendance Reports'}
        description={
          t('attendanceReports.subtitle') || 'Review daily attendance records with the current school context.'
        }
        icon={<FileText className="h-5 w-5" />}
        secondaryActions={[
          {
            label: t('events.refresh') || 'Refresh',
            onClick: () => {
              void refetch();
            },
            icon: <RefreshCw className="h-4 w-4" />,
            variant: 'outline',
          },
        ]}
        rightSlot={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={exportDisabled}>
                {isGenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                {t('events.export') || 'Export'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>{t('attendanceReports.exportDaily') || 'Export daily report'}</DropdownMenuLabel>
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
        }
      />

      <Alert>
        <School className="h-4 w-4" />
        <AlertTitle>{currentSchool?.schoolName || (t('attendanceReports.school') || 'Current school')}</AlertTitle>
        <AlertDescription>
          {t('attendanceReports.scopeHint') ||
            'This report follows the active school context. Switch schools from the main app header to review another campus.'}
        </AlertDescription>
      </Alert>

      {hasInvalidRange && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('attendanceTotalsReport.invalidRange') || 'Invalid date range'}</AlertTitle>
          <AlertDescription>
            {t('attendanceTotalsReport.invalidRangeDetail') || 'Start date must be before the end date.'}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title={t('attendanceReports.school') || 'School'}
          value={currentSchool?.schoolName || '-'}
          description={t('attendanceReports.currentScope') || 'Active school scope'}
          icon={School}
          color="blue"
        />
        <StatsCard
          title={t('attendanceTotalsReport.totalRecords') || 'Records'}
          value={totalMatchingRecords.toLocaleString()}
          description={t('attendanceReports.matchingFilters') || 'Matching the current filters'}
          icon={FileText}
          color="primary"
        />
        <StatsCard
          title={t('attendanceReports.visibleStudents') || 'Visible students'}
          value={visibleSummary.uniqueStudents.toLocaleString()}
          description={t('attendanceReports.currentPage') || 'Current page only'}
          icon={UserRound}
          color="green"
        />
        <StatsCard
          title={t('attendancePage.statusPresent') || 'Present'}
          value={visibleSummary.present.toLocaleString()}
          description={t('attendanceReports.currentPage') || 'Current page only'}
          icon={CheckCircle2}
          color="emerald"
        />
      </div>

      <FilterPanel
        title={t('attendanceTotalsReport.filtersTitle') || 'Report filters'}
        footer={
          hasActiveFilters ? (
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                {t('events.reset') || 'Reset'}
              </Button>
            </div>
          ) : null
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-2">
            <Label>{t('attendanceReports.student') || 'Student'}</Label>
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

          <div className="space-y-2">
            <Label>{t('search.class') || 'Class'}</Label>
            <Combobox
              options={(classes || []).map((classItem) => ({ value: classItem.id, label: classItem.name }))}
              value={filters.classId}
              onValueChange={(value) => handleFilterChange('classId', value)}
              placeholder={t('students.allClasses') || 'All classes'}
              searchPlaceholder={t('attendancePage.searchSessions') || 'Search classes...'}
              emptyText={t('attendanceReports.noRecords') || 'No records found'}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('attendanceTotalsReport.academicYear') || 'Academic year'}</Label>
            <Combobox
              options={(academicYears || []).map((academicYear) => ({
                value: academicYear.id,
                label: academicYear.name,
              }))}
              value={filters.academicYearId}
              onValueChange={(value) => handleFilterChange('academicYearId', value)}
              placeholder={t('attendanceTotalsReport.allYears') || 'All years'}
              searchPlaceholder={t('attendanceTotalsReport.academicYear') || 'Academic year'}
              emptyText={t('attendanceReports.noRecords') || 'No records found'}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('attendancePage.statusHeader') || 'Status'}</Label>
            <Select
              value={filters.status || 'all'}
              onValueChange={(value) => handleFilterChange('status', value === 'all' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('userManagement.allStatus') || 'All status'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('userManagement.allStatus') || 'All status'}</SelectItem>
                {getStatusOptions(t).map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('library.fromDate') || 'From date'}</Label>
            <CalendarDatePicker
              date={filters.dateFrom ? parseLocalDate(filters.dateFrom) : undefined}
              onDateChange={(date) => handleFilterChange('dateFrom', date ? dateToLocalYYYYMMDD(date) : '')}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('library.toDate') || 'To date'}</Label>
            <CalendarDatePicker
              date={filters.dateTo ? parseLocalDate(filters.dateTo) : undefined}
              onDateChange={(date) => handleFilterChange('dateTo', date ? dateToLocalYYYYMMDD(date) : '')}
            />
          </div>
        </div>
      </FilterPanel>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>{t('attendanceReports.dailyRecords') || 'Daily attendance records'}</CardTitle>
              <CardDescription>
                {t('attendanceReports.dailyRecordsHint') ||
                  'All marked attendance entries for the active school, filtered by student, class, year, status, and date range.'}
              </CardDescription>
            </div>
            <Badge variant="outline">
              {totalMatchingRecords.toLocaleString()} {t('attendanceTotalsReport.records') || 'records'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <LoadingSpinner />
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id}>
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
                        <TableRow key={row.id}>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="py-10 text-center text-muted-foreground">
                          {hasInvalidRange
                            ? t('attendanceTotalsReport.invalidRangeDetail') || 'Fix the date range to load data.'
                            : t('attendanceReports.noRecords') || 'No attendance records found'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {paginationMeta && totalMatchingRecords > 0 ? (
                <DataTablePagination
                  table={table}
                  paginationMeta={paginationMeta}
                  showPageSizeSelector={true}
                  showTotalCount={true}
                />
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={showProgressDialog}
        onOpenChange={(open) => {
          if (!open && !isGenerating) {
            setShowProgressDialog(false);
          }
        }}
      >
        <DialogContent aria-describedby="attendance-report-progress-description">
          <DialogHeader>
            <DialogTitle>{t('attendanceReports.generatingReport') || 'Generating report'}</DialogTitle>
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
          <div className="space-y-4">
            <Progress value={reportProgress} className="w-full" />
            <div className="text-center text-sm text-muted-foreground">
              {reportProgress}% {reportStatus ? `(${reportStatus})` : ''}
            </div>
            {isGenerating ? (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t('studentReportCard.generating') || 'Generating...'}</span>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}





