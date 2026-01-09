import { useQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { Download, X, CheckCircle2, XCircle, Clock, AlertCircle, Heart, Calendar, FileText, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { FilterPanel } from '@/components/layout/FilterPanel';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useClasses } from '@/hooks/useClasses';
import { useDatePreference } from '@/hooks/useDatePreference';
import { useLanguage } from '@/hooks/useLanguage';
import { useProfile } from '@/hooks/useProfiles';
import { useSchools } from '@/hooks/useSchools';
import { useStudentAdmissions } from '@/hooks/useStudentAdmissions';
import { attendanceSessionsApi, apiClient } from '@/lib/api/client';
import { showToast } from '@/lib/toast';
import type { Student } from '@/types/domain/student';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDataTable } from '@/hooks/use-data-table';
import { LoadingSpinner } from '@/components/ui/loading';
import type { AttendanceRecord } from '@/types/domain/attendance';
import { mapAttendanceRecordApiToDomain } from '@/mappers/attendanceMapper';
import type * as AttendanceApi from '@/types/api/attendance';
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

interface AttendanceReportRecord {
  id: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  cardNumber: string | null;
  status: string;
  sessionDate: Date;
  className: string;
  schoolName: string | null;
  markedAt: Date;
  entryMethod: string;
  note: string | null;
}

const getStatusOptions = (t: ReturnType<typeof useLanguage>['t']) => [
  { value: 'present', label: t('attendancePage.statusPresent') || 'Present', icon: CheckCircle2, color: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-400' },
  { value: 'absent', label: t('attendancePage.statusAbsent') || 'Absent', icon: XCircle, color: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-400' },
  { value: 'late', label: t('attendancePage.statusLate') || 'Late', icon: Clock, color: 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-400' },
  { value: 'excused', label: t('attendancePage.statusExcused') || 'Excused', icon: AlertCircle, color: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-400' },
  { value: 'sick', label: t('attendancePage.statusSick') || 'Sick', icon: Heart, color: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950 dark:text-purple-400' },
  { value: 'leave', label: t('attendancePage.statusLeave') || 'Leave', icon: Calendar, color: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950 dark:text-orange-400' },
];

const StatusBadge = ({ status, t }: { status: string; t: ReturnType<typeof useLanguage>['t'] }) => {
  const statusOptions = getStatusOptions(t);
  const option = statusOptions.find(opt => opt.value === status);
  if (!option) return <Badge variant="outline">{status}</Badge>;
  const Icon = option.icon;
  return (
    <Badge variant="outline" className={`${option.color} flex items-center gap-1.5 font-medium w-fit`}>
      <Icon className="h-3.5 w-3.5" />
      {option.label}
    </Badge>
  );
};

export default function AttendanceReports() {
  const { t, language } = useLanguage();
  const { calendar } = useDatePreference();
  const { data: profile } = useProfile();
  const [reportType, setReportType] = useState<'pdf' | 'excel'>('pdf');
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [reportProgress, setReportProgress] = useState(0);
  const [reportStatus, setReportStatus] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { data: schools } = useSchools(profile?.organization_id);
  const { data: classes } = useClasses(profile?.organization_id);
  const { data: studentAdmissions } = useStudentAdmissions(profile?.organization_id, false, {
    enrollment_status: 'active',
  });
  // Extract students from admissions
  const students: Student[] = useMemo(() => {
    if (!studentAdmissions || !Array.isArray(studentAdmissions)) return [];
    return studentAdmissions
      .map(admission => admission.student)
      .filter((student): student is Student => student !== null && student !== undefined);
  }, [studentAdmissions]);

  const [filters, setFilters] = useState({
    studentId: '',
    classId: '',
    schoolId: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    page: 1,
    perPage: 25,
  });

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['attendance-report', profile?.organization_id, filters],
    queryFn: async () => {
      if (!profile?.organization_id) return { data: [], total: 0, current_page: 1, per_page: 25, last_page: 1 };

      const params: Record<string, any> = {
        organization_id: profile.organization_id,
        page: filters.page,
        per_page: filters.perPage,
      };

      if (filters.studentId) params.student_id = filters.studentId;
      if (filters.classId) params.class_id = filters.classId;
      if (filters.schoolId) params.school_id = filters.schoolId;
      if (filters.status) params.status = filters.status;
      if (filters.dateFrom) params.date_from = filters.dateFrom;
      if (filters.dateTo) params.date_to = filters.dateTo;

      const response = await attendanceSessionsApi.report(params);
      const apiData = response as any;

      const records: AttendanceReportRecord[] = (apiData.data || []).map((record: AttendanceApi.AttendanceRecord) => {
        const domainRecord = mapAttendanceRecordApiToDomain(record);
        return {
          id: domainRecord.id,
          studentId: domainRecord.studentId,
          studentName: domainRecord.student?.fullName || 'Unknown',
          admissionNo: domainRecord.student?.admissionNo || '—',
          cardNumber: domainRecord.student?.cardNumber || null,
          status: domainRecord.status,
          sessionDate: (record as any).session?.session_date ? new Date((record as any).session.session_date) : domainRecord.markedAt,
          className: (record as any).session?.class_model?.name ||
            ((record as any).session?.classes?.[0]?.name) ||
            '—',
          schoolName: (record as any).session?.school?.school_name || null,
          markedAt: domainRecord.markedAt,
          entryMethod: domainRecord.entryMethod,
          note: domainRecord.note,
        };
      });

      return {
        data: records,
        total: apiData.total || 0,
        current_page: apiData.current_page || 1,
        per_page: apiData.per_page || 25,
        last_page: apiData.last_page || 1,
        from: apiData.from || 0,
        to: apiData.to || 0,
      };
    },
    enabled: !!profile?.organization_id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? '' : value,
      page: 1, // Reset to first page on filter change
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      studentId: '',
      classId: '',
      schoolId: '',
      status: '',
      dateFrom: '',
      dateTo: '',
      page: 1,
      perPage: 25,
    });
  };

  const handleGenerateReport = async () => {
    if (!reportData?.data?.length) {
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

      // Map calendar type to backend format
      const calendarPreference = calendar === 'gregorian' ? 'gregorian' : calendar === 'hijri_shamsi' ? 'jalali' : 'qamari';
      // Map language code
      const langCode = language === 'en' ? 'en' : language === 'ps' ? 'ps' : language === 'fa' ? 'fa' : 'ar';

      const response = await attendanceSessionsApi.generateReport({
        report_type: reportType,
        report_variant: 'daily',
        branding_id: profile.default_school_id,
        calendar_preference: calendarPreference,
        language: langCode,
        student_id: filters.studentId || undefined,
        class_id: filters.classId || undefined,
        school_id: filters.schoolId || undefined,
        status: filters.status || undefined,
        date_from: filters.dateFrom || undefined,
        date_to: filters.dateTo || undefined,
      });

      if (response.success && response.download_url) {
        // Report completed synchronously
        window.open(response.download_url, '_blank');
        setShowProgressDialog(false);
        setIsGenerating(false);
        showToast.success(t('attendanceReports.reportExported') || 'Report generated successfully');
      } else if (response.success && response.report_id) {
        // Report is being generated asynchronously - poll for status
        const pollStatus = async () => {
          try {
                        const statusResponse = await apiClient.get(`/reports/${response.report_id}/status`) as any;
                        const statusData = statusResponse;
                        
                        if (!statusData.success) {
                          throw new Error(statusData.error || 'Failed to get report status');
                        }
                        
                        setReportProgress(statusData.progress || 0);
                        setReportStatus(statusData.status);
                        
                        if (statusData.status === 'completed' && statusData.download_url) {
                          window.open(statusData.download_url, '_blank');
                          setShowProgressDialog(false);
                          setIsGenerating(false);
                          showToast.success(t('attendanceReports.reportExported') || 'Report generated successfully');
                        } else if (statusData.status === 'failed') {
                          setShowProgressDialog(false);
                          setIsGenerating(false);
                          showToast.error(statusData.error_message || t('attendanceReports.reportGenerationFailed') || 'Failed to generate report');
                        } else {
                          // Continue polling
                          setTimeout(pollStatus, 1000);
                        }
                    } catch (error: any) {
                      setShowProgressDialog(false);
                      setIsGenerating(false);
                      showToast.error(error.message || t('attendanceReports.reportGenerationFailed') || 'Failed to check report status');
                    }
        };
        pollStatus();
      } else {
        throw new Error(response.error || 'Failed to generate report');
      }
    } catch (error: any) {
      setShowProgressDialog(false);
      setIsGenerating(false);
      showToast.error(error.message || t('attendanceReports.reportGenerationFailed') || 'Failed to generate report');
    }
  };

  const columns: ColumnDef<AttendanceReportRecord>[] = [
    {
      accessorKey: 'studentName',
      header: t('attendanceReports.student') || 'Student',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.studentName}</div>
          <div className="text-xs text-muted-foreground">{row.original.admissionNo}</div>
        </div>
      ),
    },
    {
      accessorKey: 'cardNumber',
      header: t('attendancePage.cardHeader') || 'Card #',
      cell: ({ row }) => <div className="text-sm">{row.original.cardNumber || '—'}</div>,
    },
    {
      accessorKey: 'className',
      header: t('search.class') || 'Class',
      cell: ({ row }) => <div className="text-sm">{row.original.className}</div>,
    },
    {
      accessorKey: 'schoolName',
      header: t('attendanceReports.school') || 'School',
      cell: ({ row }) => <div className="text-sm">{row.original.schoolName || '—'}</div>,
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
        <div className="text-sm">
          <div>{format(row.original.sessionDate, 'MMM dd, yyyy')}</div>
          <div className="text-xs text-muted-foreground">{format(row.original.markedAt, 'HH:mm')}</div>
        </div>
      ),
    },
    {
      accessorKey: 'entryMethod',
      header: t('attendanceReports.method') || 'Method',
      cell: ({ row }) => (
        <Badge variant="outline" className="text-xs capitalize">
          {row.original.entryMethod}
        </Badge>
      ),
    },
  ];

  const paginationMeta = useMemo(() => {
    if (!reportData) return null;
    return {
      current_page: reportData.current_page,
      per_page: reportData.per_page,
      total: reportData.total,
      last_page: reportData.last_page,
      from: reportData.from,
      to: reportData.to,
    };
  }, [reportData?.current_page, reportData?.per_page, reportData?.total, reportData?.last_page, reportData?.from, reportData?.to]);

  const { table } = useDataTable<AttendanceReportRecord>({
    data: reportData?.data || [],
    columns,
    pageCount: reportData?.last_page || 1,
    paginationMeta,
    initialState: {
      pagination: {
        pageIndex: filters.page - 1,
        pageSize: filters.perPage,
      },
    },
    onPaginationChange: (newPagination) => {
      setFilters(prev => ({
        ...prev,
        page: newPagination.pageIndex + 1,
        perPage: newPagination.pageSize,
      }));
    },
  });

  const hasActiveFilters = filters.studentId || filters.classId || filters.schoolId || filters.status || filters.dateFrom || filters.dateTo;

  return (
    <div className="container mx-auto py-4 space-y-4 max-w-7xl px-4">
      <PageHeader
        title={t('events.title') || 'Attendance Reports'}
        description={t('hostel.subtitle') || 'View and analyze student attendance records'}
        icon={<FileText className="h-5 w-5" />}
        rightSlot={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setReportType('pdf');
                handleGenerateReport();
              }}
              disabled={isGenerating}
            >
              {isGenerating && reportType === 'pdf' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setReportType('excel');
                handleGenerateReport();
              }}
              disabled={isGenerating}
            >
              {isGenerating && reportType === 'excel' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Excel
            </Button>
          </div>
        }
      />

      <FilterPanel
        title={t('events.filters') || 'Filters'}
        footer={
          hasActiveFilters ? (
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                <X className="h-4 w-4 mr-2" />
                {t('events.reset') || 'Reset'}
              </Button>
            </div>
          ) : null
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('attendanceReports.student') || 'Student'}</label>
            <Select value={filters.studentId || 'all'} onValueChange={(v) => handleFilterChange('studentId', v)}>
              <SelectTrigger>
                <SelectValue placeholder={t('leave.allStudents') || 'All Students'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('leave.allStudents') || 'All Students'}</SelectItem>
                {(students || []).map(student => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.fullName} ({student.admissionNumber})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('search.class') || 'Class'}</label>
            <Select value={filters.classId || 'all'} onValueChange={(v) => handleFilterChange('classId', v)}>
              <SelectTrigger>
                <SelectValue placeholder={t('students.allClasses') || 'All Classes'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('students.allClasses') || 'All Classes'}</SelectItem>
                {(classes || []).map(cls => (
                  <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('attendanceReports.school') || 'School'}</label>
            <Select value={filters.schoolId || 'all'} onValueChange={(v) => handleFilterChange('schoolId', v)}>
              <SelectTrigger>
                <SelectValue placeholder={t('leave.allSchools') || 'All Schools'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('leave.allSchools') || 'All Schools'}</SelectItem>
                {(schools || []).map(school => (
                  <SelectItem key={school.id} value={school.id}>{school.schoolName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('attendancePage.statusHeader') || 'Status'}</label>
            <Select value={filters.status || 'all'} onValueChange={(v) => handleFilterChange('status', v)}>
              <SelectTrigger>
                <SelectValue placeholder={t('userManagement.allStatus') || 'All Status'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('userManagement.allStatus') || 'All Status'}</SelectItem>
                {getStatusOptions(t).map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('library.fromDate') || 'From Date'}</label>
            <CalendarDatePicker date={filters.dateFrom ? new Date(filters.dateFrom) : undefined} onDateChange={(date) => handleFilterChange('dateFrom', date ? date.toISOString().split("T")[0] : "")} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('library.toDate') || 'To Date'}</label>
            <CalendarDatePicker date={filters.dateTo ? new Date(filters.dateTo) : undefined} onDateChange={(date) => handleFilterChange('dateTo', date ? date.toISOString().split("T")[0] : "")} />
          </div>
        </div>
      </FilterPanel>

      <Card>
        <CardHeader>
          <CardTitle>{t('events.title') || 'Attendance Reports'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <LoadingSpinner />
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map(headerGroup => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map(header => (
                          <TableHead key={header.id}>
                            {header.isPlaceholder ? null : (
                              <div className="flex items-center">
                                {typeof header.column.columnDef.header === 'string'
                                  ? header.column.columnDef.header
                                  : typeof header.column.columnDef.header === 'function'
                                    ? header.column.columnDef.header(header.getContext())
                                    : null}
                              </div>
                            )}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows.length > 0 ? (
                      table.getRowModel().rows.map(row => (
                        <TableRow key={row.id}>
                          {row.getVisibleCells().map(cell => (
                            <TableCell key={cell.id}>
                              {typeof cell.column.columnDef.cell === 'function'
                                ? cell.column.columnDef.cell(cell.getContext())
                                : cell.getValue() as string}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-8">
                          {t('attendanceReports.noRecords') || 'No attendance records found'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {reportData && reportData.total > 0 && (
                <DataTablePagination
                  table={table}
                  paginationMeta={{
                    current_page: reportData.current_page,
                    per_page: reportData.per_page,
                    total: reportData.total,
                    last_page: reportData.last_page,
                    from: reportData.from,
                    to: reportData.to,
                  }}
                  showPageSizeSelector={true}
                  showTotalCount={true}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Report Progress Dialog */}
      <Dialog open={showProgressDialog} onOpenChange={(open) => {
        if (!open && !isGenerating) {
          setShowProgressDialog(false);
        }
      }}>
        <DialogContent aria-describedby="attendance-report-progress-description">
          <DialogHeader>
            <DialogTitle>{t('attendanceReports.generatingReport') || 'Generating Report'}</DialogTitle>
            <DialogDescription id="attendance-report-progress-description">
              {reportStatus === 'processing' || reportStatus === 'pending' 
                ? t('attendanceReports.reportInProgress') || 'Please wait while the report is being generated...'
                : reportStatus === 'completed'
                ? t('attendanceReports.reportReady') || 'Report is ready!'
                : reportStatus === 'failed'
                ? t('attendanceReports.reportFailed') || 'Report generation failed.'
                : t('attendanceReports.reportStatus') || 'Report status'}
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
