import { format, subDays, subMonths } from 'date-fns';
import {
    Activity,
    AlertTriangle,
    BarChart3,
    Calendar,
    CheckCircle2,
    FileText,
    Heart,
    RefreshCw,
    XCircle,
    Clock,
    GraduationCap,
    Building2,
    Download,
    Loader2,
    FileDown,
    FileSpreadsheet,
    ChevronRight,
} from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';

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
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/hooks/useLanguage';
import { useDatePreference } from '@/hooks/useDatePreference';
import { useProfile } from '@/hooks/useProfiles';
import { useSchools } from '@/hooks/useSchools';
import { useClasses } from '@/hooks/useClasses';
import { useAcademicYears } from '@/hooks/useAcademicYears';
import { useAttendanceTotalsReport } from '@/hooks/useAttendanceTotalsReport';
import { attendanceSessionsApi, apiClient } from '@/lib/api/client';
import { showToast } from '@/lib/toast';
import type { AttendanceTotalsReportFilters } from '@/types/domain/attendanceTotalsReport';
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

const attendanceStatusMeta = {
    present: { label: 'Present', icon: CheckCircle2, tone: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950' },
    absent: { label: 'Absent', icon: XCircle, tone: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950' },
    late: { label: 'Late', icon: Clock, tone: 'text-amber-600 bg-amber-50 dark:text-amber-300 dark:bg-amber-950' },
    excused: { label: 'Excused', icon: AlertTriangle, tone: 'text-blue-600 bg-blue-50 dark:text-blue-300 dark:bg-blue-950' },
    sick: { label: 'Sick', icon: Heart, tone: 'text-purple-600 bg-purple-50 dark:text-purple-300 dark:bg-purple-950' },
    leave: { label: 'Leave', icon: Calendar, tone: 'text-orange-600 bg-orange-50 dark:text-orange-300 dark:bg-orange-950' },
} as const;

const SummaryCard = ({
    label,
    value,
    helper,
    icon: Icon,
    tone = 'primary',
}: {
    label: string;
    value: string | number;
    helper?: string;
    icon: typeof BarChart3;
    tone?: 'primary' | 'success' | 'warning' | 'muted';
}) => {
    const toneClass =
        tone === 'primary'
            ? 'bg-primary/10 text-primary'
            : tone === 'success'
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                : tone === 'warning'
                    ? 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400'
                    : 'bg-muted text-muted-foreground';

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{label}</CardTitle>
                <div className={`rounded-md p-2 ${toneClass}`}>
                    <Icon className="h-4 w-4" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
            </CardContent>
        </Card>
    );
};

const formatPercent = (value?: number) => `${(value ?? 0).toFixed(1)}%`;

export default function AttendanceTotalsReports() {
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
    const { data: academicYears } = useAcademicYears(profile?.organization_id);

    const [filters, setFilters] = useState<AttendanceTotalsReportFilters>({
        organizationId: profile?.organization_id,
        schoolId: undefined,
        classId: undefined,
        academicYearId: undefined,
        status: undefined,
        dateFrom: undefined,
        dateTo: undefined,
    });
    const [sessionType, setSessionType] = useState<'class' | 'room'>('class');
    const [dateRangePreset, setDateRangePreset] = useState<'1week' | '1month' | '4months' | 'custom'>('1month');

    const hasInvalidRange = useMemo(() => {
        if (!filters.dateFrom || !filters.dateTo) return false;
        return new Date(filters.dateFrom).getTime() > new Date(filters.dateTo).getTime();
    }, [filters.dateFrom, filters.dateTo]);

    const normalizedFilters = useMemo(
        () => ({ ...filters, organizationId: filters.organizationId || profile?.organization_id }),
        [filters, profile?.organization_id]
    );

    const { data: report, isLoading, refetch } = useAttendanceTotalsReport(normalizedFilters, {
        enabled: !hasInvalidRange,
    });

    const handleFilterChange = (key: keyof AttendanceTotalsReportFilters, value: string | undefined) => {
        setFilters((prev) => ({
            ...prev,
            [key]: value === 'all' ? undefined : value,
        }));
    };

    const handleDateRangePreset = (preset: '1week' | '1month' | '4months' | 'custom') => {
        setDateRangePreset(preset);
        if (preset === 'custom') {
            return; // Keep existing dates
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

    // Initialize date range on mount
    useEffect(() => {
        if (!filters.dateFrom || !filters.dateTo) {
            handleDateRangePreset('1month');
        }
    }, []);

    const handleResetFilters = () => {
        setFilters({
            organizationId: profile?.organization_id,
            schoolId: undefined,
            classId: undefined,
            academicYearId: undefined,
            status: undefined,
            dateFrom: undefined,
            dateTo: undefined,
        });
    };

    const handleGenerateReport = async (variant: 'totals' | 'class_wise' | 'room_wise') => {
        if (!report) {
            showToast.error(t('events.noDataToExport') || 'No data to export');
            return;
        }

        if (!profile?.default_school_id) {
            showToast.error(t('attendanceTotalsReport.schoolRequired') || 'School is required for report generation');
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
                report_variant: variant,
                branding_id: profile.default_school_id,
                calendar_preference: calendarPreference,
                language: langCode,
                class_id: filters.classId || undefined,
                school_id: filters.schoolId || undefined,
                status: filters.status || undefined,
                date_from: filters.dateFrom || undefined,
                date_to: filters.dateTo || undefined,
                academic_year_id: filters.academicYearId || undefined,
            });

            if (response.success && response.download_url) {
                // Report completed synchronously
                window.open(response.download_url, '_blank');
                setShowProgressDialog(false);
                setIsGenerating(false);
                showToast.success(t('attendanceTotalsReport.reportExported') || 'Report generated successfully');
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
                            showToast.success(t('attendanceTotalsReport.reportExported') || 'Report generated successfully');
                        } else if (statusData.status === 'failed') {
                            setShowProgressDialog(false);
                            setIsGenerating(false);
                            showToast.error(statusData.error_message || t('attendanceTotalsReport.reportGenerationFailed') || 'Failed to generate report');
                        } else {
                            // Continue polling
                            setTimeout(pollStatus, 1000);
                        }
                    } catch (error: any) {
                        setShowProgressDialog(false);
                        setIsGenerating(false);
                        showToast.error(error.message || t('attendanceTotalsReport.reportGenerationFailed') || 'Failed to check report status');
                    }
                };
                pollStatus();
            } else {
                throw new Error(response.error || 'Failed to generate report');
            }
        } catch (error: any) {
            setShowProgressDialog(false);
            setIsGenerating(false);
            showToast.error(error.message || t('attendanceTotalsReport.reportGenerationFailed') || 'Failed to generate report');
        }
    };

    return (
        <div className="container mx-auto p-4 md:p-6 max-w-7xl space-y-6">
            <PageHeader
                title={t('nav.attendanceTotalsReport') || 'Attendance Totals Report'}
                description={t('attendanceTotalsReport.subtitle') || 'Analyze attendance performance across classes, rooms, and schools.'}
                icon={<Activity className="h-5 w-5" />}
                secondaryActions={[
                    {
                        label: t('events.refresh') || 'Refresh',
                        onClick: () => refetch(),
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
                                        <span className="hidden sm:inline">{t('attendanceTotalsReport.generating') || 'Generating...'}</span>
                                    </>
                                ) : (
                                    <>
                                        <Download className="h-4 w-4" />
                                        <span className="hidden sm:inline">{t('events.export') || 'Export'}</span>
                                    </>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>{t('attendanceTotalsReport.exportOptions') || 'Export Options'}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            
                            {/* Totals Reports */}
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                    <BarChart3 className="mr-2 h-4 w-4" />
                                    <span>{t('attendanceTotalsReport.totals') || 'Totals'}</span>
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setReportType('pdf');
                                            handleGenerateReport('totals');
                                        }}
                                        disabled={isGenerating}
                                    >
                                        <FileDown className="mr-2 h-4 w-4" />
                                        <span>PDF</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setReportType('excel');
                                            handleGenerateReport('totals');
                                        }}
                                        disabled={isGenerating}
                                    >
                                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                                        <span>Excel</span>
                                    </DropdownMenuItem>
                                </DropdownMenuSubContent>
                            </DropdownMenuSub>

                            {/* Class-wise Reports */}
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                    <GraduationCap className="mr-2 h-4 w-4" />
                                    <span>{t('attendanceTotalsReport.classWise') || 'Class-wise'}</span>
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setReportType('pdf');
                                            handleGenerateReport('class_wise');
                                        }}
                                        disabled={isGenerating}
                                    >
                                        <FileDown className="mr-2 h-4 w-4" />
                                        <span>PDF</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setReportType('excel');
                                            handleGenerateReport('class_wise');
                                        }}
                                        disabled={isGenerating}
                                    >
                                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                                        <span>Excel</span>
                                    </DropdownMenuItem>
                                </DropdownMenuSubContent>
                            </DropdownMenuSub>

                            {/* Room-wise Reports */}
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                    <Building2 className="mr-2 h-4 w-4" />
                                    <span>{t('attendanceTotalsReport.roomWise') || 'Room-wise'}</span>
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setReportType('pdf');
                                            handleGenerateReport('room_wise');
                                        }}
                                        disabled={isGenerating}
                                    >
                                        <FileDown className="mr-2 h-4 w-4" />
                                        <span>PDF</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setReportType('excel');
                                            handleGenerateReport('room_wise');
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

            {hasInvalidRange && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>{t('attendanceTotalsReport.invalidRange') || 'Invalid date range'}</AlertTitle>
                    <AlertDescription>
                        {t('attendanceTotalsReport.invalidRangeDetail') || 'Start date must be before the end date.'}
                    </AlertDescription>
                </Alert>
            )}

            <FilterPanel
                title={t('attendanceTotalsReport.filtersTitle') || 'Report filters'}
                footer={
                    <div className="flex justify-end">
                        <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                            {t('events.reset') || 'Reset'}
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        {t('attendanceTotalsReport.filtersDescription') || 'Choose a date range and optional class or school constraints.'}
                    </p>
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label>{t('attendanceTotalsReport.school') || 'School'}</Label>
                            <Combobox
                                options={(schools || []).map((school) => ({ label: school.schoolName, value: school.id }))}
                                value={filters.schoolId || ''}
                                onValueChange={(value) => handleFilterChange('schoolId', value || undefined)}
                                placeholder={t('leave.allSchools') || 'All schools'}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('search.class') || 'Class / Room'}</Label>
                            <Combobox
                                options={(classes || []).map((classItem) => ({ label: classItem.name, value: classItem.id }))}
                                value={filters.classId || ''}
                                onValueChange={(value) => handleFilterChange('classId', value || undefined)}
                                placeholder={t('students.allClasses') || 'All classes'}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('attendanceTotalsReport.academicYear') || 'Academic year'}</Label>
                            <Select
                                value={filters.academicYearId || 'all'}
                                onValueChange={(value) => handleFilterChange('academicYearId', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t('attendanceTotalsReport.allYears') || 'All years'} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('attendanceTotalsReport.allYears') || 'All years'}</SelectItem>
                                    {(academicYears || []).map((year) => (
                                        <SelectItem key={year.id} value={year.id}>
                                            {year.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('events.status') || 'Status'}</Label>
                            <Select value={filters.status || 'all'} onValueChange={(value) => handleFilterChange('status', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('subjects.all') || 'All'} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('subjects.all') || 'All'}</SelectItem>
                                    {Object.entries(attendanceStatusMeta).map(([key, meta]) => (
                                        <SelectItem key={key} value={key}>
                                            {meta.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('attendanceTotalsReport.dateRange') || 'Date Range'}</Label>
                            <Tabs value={dateRangePreset} onValueChange={(value) => handleDateRangePreset(value as typeof dateRangePreset)}>
                                <TabsList className="grid w-full grid-cols-4">
                                    <TabsTrigger value="1week">1 Week</TabsTrigger>
                                    <TabsTrigger value="1month">1 Month</TabsTrigger>
                                    <TabsTrigger value="4months">4 Months</TabsTrigger>
                                    <TabsTrigger value="custom">Custom</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                        {dateRangePreset === 'custom' && (
                            <>
                                <div className="space-y-2">
                                    <Label>{t('library.fromDate') || 'From date'}</Label>
                                    <CalendarDatePicker date={filters.dateFrom || '' ? new Date(filters.dateFrom || '') : undefined} onDateChange={(date) => handleFilterChange("dateFrom", date ? date.toISOString().split("T")[0] : "")} />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('library.toDate') || 'To date'}</Label>
                                    <CalendarDatePicker date={filters.dateTo || '' ? new Date(filters.dateTo || '') : undefined} onDateChange={(date) => handleFilterChange("dateTo", date ? date.toISOString().split("T")[0] : "")} />
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </FilterPanel>

            {isLoading && (
                <div className="flex items-center justify-center py-16">
                    <LoadingSpinner text={t('common.loading') || 'Loading attendance report...'} />
                </div>
            )}

            {!isLoading && report && (
                <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <SummaryCard
                            label={t('attendanceTotalsReport.totalSessions') || 'Sessions analyzed'}
                            value={report.totals.sessions.toLocaleString()}
                            icon={FileText}
                        />
                        <SummaryCard
                            label={t('attendanceTotalsReport.studentsMarked') || 'Students marked'}
                            value={report.totals.studentsMarked.toLocaleString()}
                            icon={Activity}
                        />
                        <SummaryCard
                            label={t('attendanceTotalsReport.attendanceRate') || 'Attendance rate'}
                            value={formatPercent(report.totals.attendanceRate)}
                            helper={t('attendanceTotalsReport.attendanceRateHelper') || 'Present vs total records'}
                            icon={BarChart3}
                            tone="success"
                        />
                        <SummaryCard
                            label={t('attendanceTotalsReport.absences') || 'Absences'}
                            value={report.totals.absent.toLocaleString()}
                            helper={t('attendanceTotalsReport.absenceHelper') || 'Across selected filters'}
                            icon={AlertTriangle}
                            tone="warning"
                        />
                    </div>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle>{t('attendanceTotalsReport.statusBreakdown') || 'Status breakdown'}</CardTitle>
                            <CardDescription>{t('attendanceTotalsReport.statusBreakdownHint') || 'Quick view of attendance statuses.'}</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
                            {Object.entries(attendanceStatusMeta).map(([key, meta]) => {
                                const total = report.statusBreakdown.find((item) => item.status === key)?.total || 0;
                                const Icon = meta.icon;
                                return (
                                    <div key={key} className="rounded-lg border p-3 space-y-1">
                                        <div className={`inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs font-medium ${meta.tone}`}>
                                            <Icon className="h-3.5 w-3.5" />
                                            {meta.label}
                                        </div>
                                        <div className="text-2xl font-semibold">{total}</div>
                                        <p className="text-xs text-muted-foreground">{t('attendanceTotalsReport.records') || 'records'}</p>
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>

                    {/* Session Type Tabs */}
                    <Tabs value={sessionType} onValueChange={(value) => setSessionType(value as 'class' | 'room')} className="space-y-4">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="class" className="flex items-center gap-2">
                                <GraduationCap className="h-4 w-4" />
                                Class Sessions
                            </TabsTrigger>
                            <TabsTrigger value="room" className="flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                Room Sessions
                            </TabsTrigger>
                        </TabsList>

                        {/* Class Sessions Tab */}
                        <TabsContent value="class" className="space-y-4">
                            <div className="grid gap-4 lg:grid-cols-2">
                                <Card className="h-full">
                                    <CardHeader>
                                        <CardTitle>{t('attendanceTotalsReport.classBreakdown') || 'Class performance'}</CardTitle>
                                        <CardDescription>
                                            {t('attendanceTotalsReport.classBreakdownHint') || 'Attendance quality grouped by assigned classes.'}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-3 overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>{t('search.class') || 'Class'}</TableHead>
                                                    <TableHead>{t('attendanceTotalsReport.school') || 'School'}</TableHead>
                                                    <TableHead className="text-right">{t('attendanceTotalsReport.attendanceRate') || 'Attendance rate'}</TableHead>
                                                    <TableHead className="text-right">{t('examReports.present') || 'Present'}</TableHead>
                                                    <TableHead className="text-right">{t('attendanceTotalsReport.absent') || 'Absent'}</TableHead>
                                                    <TableHead className="text-right">{t('attendanceTotalsReport.totalRecords') || 'Records'}</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {report.classBreakdown.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                                                            {t('attendanceTotalsReport.noClassData') || 'No class data available for this range.'}
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                                {report.classBreakdown.map((row) => (
                                                    <TableRow key={`${row.classId}-${row.className}`}>
                                                        <TableCell className="font-medium">{row.className}</TableCell>
                                                        <TableCell>{row.schoolName}</TableCell>
                                                        <TableCell className="text-right">{formatPercent(row.attendanceRate)}</TableCell>
                                                        <TableCell className="text-right">{row.present.toLocaleString()}</TableCell>
                                                        <TableCell className="text-right">{row.absent.toLocaleString()}</TableCell>
                                                        <TableCell className="text-right">{row.totalRecords.toLocaleString()}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>

                                <Card className="h-full">
                                    <CardHeader>
                                        <CardTitle>{t('attendanceTotalsReport.schoolBreakdown') || 'School breakdown'}</CardTitle>
                                        <CardDescription>
                                            {t('attendanceTotalsReport.schoolBreakdownHint') || 'Compare attendance patterns across schools and campuses.'}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-3 overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>{t('attendanceTotalsReport.school') || 'School'}</TableHead>
                                                    <TableHead className="text-right">{t('attendanceTotalsReport.attendanceRate') || 'Attendance rate'}</TableHead>
                                                    <TableHead className="text-right">{t('examReports.present') || 'Present'}</TableHead>
                                                    <TableHead className="text-right">{t('attendanceTotalsReport.absent') || 'Absent'}</TableHead>
                                                    <TableHead className="text-right">{t('attendanceTotalsReport.totalRecords') || 'Records'}</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {report.schoolBreakdown.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                                                            {t('attendanceTotalsReport.noSchoolData') || 'No school data available.'}
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                                {report.schoolBreakdown.map((row) => (
                                                    <TableRow key={`${row.schoolId}-${row.schoolName}`}>
                                                        <TableCell className="font-medium">{row.schoolName}</TableCell>
                                                        <TableCell className="text-right">{formatPercent(row.attendanceRate)}</TableCell>
                                                        <TableCell className="text-right">{row.present.toLocaleString()}</TableCell>
                                                        <TableCell className="text-right">{row.absent.toLocaleString()}</TableCell>
                                                        <TableCell className="text-right">{row.totalRecords.toLocaleString()}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </div>

                            <Card>
                                <CardHeader>
                                    <CardTitle>{t('attendanceTotalsReport.recentSessions') || 'Recent class attendance sessions'}</CardTitle>
                                    <CardDescription>
                                        {t('attendanceTotalsReport.recentSessionsHint') || 'Latest class sessions within the selected date range.'}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('events.date') || 'Date'}</TableHead>
                                                <TableHead>{t('search.class') || 'Class'}</TableHead>
                                                <TableHead>{t('attendanceTotalsReport.school') || 'School'}</TableHead>
                                                <TableHead className="text-right">{t('attendanceTotalsReport.attendanceRate') || 'Attendance rate'}</TableHead>
                                                <TableHead className="text-right">{t('examReports.present') || 'Present'}</TableHead>
                                                <TableHead className="text-right">{t('attendanceTotalsReport.absent') || 'Absent'}</TableHead>
                                                <TableHead className="text-right">{t('attendanceTotalsReport.totalRecords') || 'Records'}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {report.recentSessions.filter((s) => s.className).length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                                                        {t('attendanceTotalsReport.noRecentSessions') || 'No class sessions found for this range.'}
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                            {report.recentSessions
                                                .filter((s) => s.className)
                                                .map((session) => (
                                                    <TableRow key={session.id}>
                                                        <TableCell className="font-medium">
                                                            {session.sessionDate ? format(session.sessionDate, 'MMM dd, yyyy') : '—'}
                                                        </TableCell>
                                                        <TableCell>{session.className}</TableCell>
                                                        <TableCell>{session.schoolName || t('attendanceTotalsReport.noSchool') || 'No school'}</TableCell>
                                                        <TableCell className="text-right">{formatPercent(session.attendanceRate)}</TableCell>
                                                        <TableCell className="text-right">{session.totals.present.toLocaleString()}</TableCell>
                                                        <TableCell className="text-right">{session.totals.absent.toLocaleString()}</TableCell>
                                                        <TableCell className="text-right">{session.totals.records.toLocaleString()}</TableCell>
                                                    </TableRow>
                                                ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Room Sessions Tab */}
                        <TabsContent value="room" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t('attendanceTotalsReport.roomBreakdown') || 'Room performance'}</CardTitle>
                                    <CardDescription>
                                        {t('attendanceTotalsReport.roomBreakdownHint') || 'Attendance quality grouped by rooms (sessions without specific class assignment).'}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground text-center py-8">
                                        {t('attendanceTotalsReport.roomSessionsInfo') || 'Room-based attendance sessions will be displayed here. These are sessions not tied to a specific class.'}
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>{t('attendanceTotalsReport.recentRoomSessions') || 'Recent room attendance sessions'}</CardTitle>
                                    <CardDescription>
                                        {t('attendanceTotalsReport.recentRoomSessionsHint') || 'Latest room sessions within the selected date range.'}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('events.date') || 'Date'}</TableHead>
                                                <TableHead>{t('attendanceTotalsReport.room') || 'Room'}</TableHead>
                                                <TableHead>{t('attendanceTotalsReport.school') || 'School'}</TableHead>
                                                <TableHead className="text-right">{t('attendanceTotalsReport.attendanceRate') || 'Attendance rate'}</TableHead>
                                                <TableHead className="text-right">{t('examReports.present') || 'Present'}</TableHead>
                                                <TableHead className="text-right">{t('attendanceTotalsReport.absent') || 'Absent'}</TableHead>
                                                <TableHead className="text-right">{t('attendanceTotalsReport.totalRecords') || 'Records'}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {report.recentSessions.filter((s) => !s.className).length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                                                        {t('attendanceTotalsReport.noRecentRoomSessions') || 'No room sessions found for this range.'}
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                            {report.recentSessions
                                                .filter((s) => !s.className)
                                                .map((session) => (
                                                    <TableRow key={session.id}>
                                                        <TableCell className="font-medium">
                                                            {session.sessionDate ? format(session.sessionDate, 'MMM dd, yyyy') : '—'}
                                                        </TableCell>
                                                        <TableCell>{session.className || t('attendanceTotalsReport.generalRoom') || 'General Room'}</TableCell>
                                                        <TableCell>{session.schoolName || t('attendanceTotalsReport.noSchool') || 'No school'}</TableCell>
                                                        <TableCell className="text-right">{formatPercent(session.attendanceRate)}</TableCell>
                                                        <TableCell className="text-right">{session.totals.present.toLocaleString()}</TableCell>
                                                        <TableCell className="text-right">{session.totals.absent.toLocaleString()}</TableCell>
                                                        <TableCell className="text-right">{session.totals.records.toLocaleString()}</TableCell>
                                                    </TableRow>
                                                ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            )}

            {/* Report Progress Dialog */}
            <Dialog open={showProgressDialog} onOpenChange={(open) => {
                if (!open && !isGenerating) {
                    setShowProgressDialog(false);
                }
            }}>
                <DialogContent aria-describedby="attendance-totals-report-progress-description">
                    <DialogHeader>
                        <DialogTitle>{t('attendanceTotalsReport.generatingReport') || 'Generating Report'}</DialogTitle>
                        <DialogDescription id="attendance-totals-report-progress-description">
                            {reportStatus === 'processing' || reportStatus === 'pending' 
                                ? t('attendanceTotalsReport.reportInProgress') || 'Please wait while the report is being generated...'
                                : reportStatus === 'completed'
                                ? t('attendanceTotalsReport.reportReady') || 'Report is ready!'
                                : reportStatus === 'failed'
                                ? t('attendanceTotalsReport.reportFailed') || 'Report generation failed.'
                                : t('attendanceTotalsReport.reportStatus') || 'Report status'}
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


