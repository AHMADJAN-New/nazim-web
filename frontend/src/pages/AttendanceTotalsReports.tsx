import { useMemo, useState } from 'react';
import {
    Activity,
    AlertTriangle,
    BarChart3,
    Calendar,
    CheckCircle2,
    FileText,
    Filter,
    Heart,
    RefreshCw,
    XCircle,
    Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/hooks/useLanguage';
import { useProfile } from '@/hooks/useProfiles';
import { useSchools } from '@/hooks/useSchools';
import { useClasses } from '@/hooks/useClasses';
import { useAcademicYears } from '@/hooks/useAcademicYears';
import { useAttendanceTotalsReport } from '@/hooks/useAttendanceTotalsReport';
import type { AttendanceTotalsReportFilters } from '@/types/domain/attendanceTotalsReport';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading';

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
    const { t } = useLanguage();
    const { data: profile } = useProfile();
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
    const [showFilters, setShowFilters] = useState(false);

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

    const activeFilterCount = useMemo(() => {
        return Object.values(filters).filter((value) => !!value && value !== profile?.organization_id).length;
    }, [filters, profile?.organization_id]);

    return (
        <div className="container mx-auto p-4 md:p-6 max-w-7xl space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold leading-tight">
                        {t('attendanceTotalsReport.title') || 'Attendance Totals Report'}
                    </h1>
                    <p className="text-muted-foreground">
                        {t('attendanceTotalsReport.subtitle') || 'Analyze attendance performance across classes, rooms, and schools.'}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        {t('common.refresh') || 'Refresh'}
                    </Button>
                    <Button variant="outline" onClick={() => setShowFilters((prev) => !prev)}>
                        <Filter className="mr-2 h-4 w-4" />
                        {t('attendanceTotalsReport.filters') || 'Filters'}
                        {activeFilterCount > 0 && <Badge className="ml-2" variant="secondary">{activeFilterCount}</Badge>}
                    </Button>
                </div>
            </div>

            {hasInvalidRange && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>{t('attendanceTotalsReport.invalidRange') || 'Invalid date range'}</AlertTitle>
                    <AlertDescription>
                        {t('attendanceTotalsReport.invalidRangeDetail') || 'Start date must be before the end date.'}
                    </AlertDescription>
                </Alert>
            )}

            {showFilters && (
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>{t('attendanceTotalsReport.filtersTitle') || 'Report filters'}</CardTitle>
                                <CardDescription>
                                    {t('attendanceTotalsReport.filtersDescription') || 'Choose a date range and optional class or school constraints.'}
                                </CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                                    {t('attendanceTotalsReport.reset') || 'Reset'}
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setShowFilters(false)}>
                                    ×
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                                <Label>{t('attendanceTotalsReport.school') || 'School'}</Label>
                                <Combobox
                                    options={(schools || []).map((school) => ({ label: school.schoolName, value: school.id }))}
                                    value={filters.schoolId || ''}
                                    onValueChange={(value) => handleFilterChange('schoolId', value || undefined)}
                                    placeholder={t('attendanceTotalsReport.allSchools') || 'All schools'}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('attendanceTotalsReport.class') || 'Class / Room'}</Label>
                                <Combobox
                                    options={(classes || []).map((classItem) => ({ label: classItem.name, value: classItem.id }))}
                                    value={filters.classId || ''}
                                    onValueChange={(value) => handleFilterChange('classId', value || undefined)}
                                    placeholder={t('attendanceTotalsReport.allClasses') || 'All classes'}
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
                                <Label>{t('attendanceTotalsReport.status') || 'Status'}</Label>
                                <Select value={filters.status || 'all'} onValueChange={(value) => handleFilterChange('status', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('common.all') || 'All'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('common.all') || 'All'}</SelectItem>
                                        {Object.entries(attendanceStatusMeta).map(([key, meta]) => (
                                            <SelectItem key={key} value={key}>
                                                {meta.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>{t('attendanceTotalsReport.fromDate') || 'From date'}</Label>
                                <Input
                                    type="date"
                                    value={filters.dateFrom || ''}
                                    onChange={(e) => handleFilterChange('dateFrom', e.target.value || undefined)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('attendanceTotalsReport.toDate') || 'To date'}</Label>
                                <Input
                                    type="date"
                                    value={filters.dateTo || ''}
                                    onChange={(e) => handleFilterChange('dateTo', e.target.value || undefined)}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {isLoading && (
                <div className="flex items-center justify-center py-16">
                    <LoadingSpinner text={t('attendanceTotalsReport.loading') || 'Loading attendance report...'} />
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
                                        <div className="text-2xl font-semibold">{total.toLocaleString()}</div>
                                        <p className="text-xs text-muted-foreground">{t('attendanceTotalsReport.records') || 'records'}</p>
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>

                    <div className="grid gap-4 lg:grid-cols-2">
                        <Card className="h-full">
                            <CardHeader>
                                <CardTitle>{t('attendanceTotalsReport.classBreakdown') || 'Class & room performance'}</CardTitle>
                                <CardDescription>
                                    {t('attendanceTotalsReport.classBreakdownHint') || 'Attendance quality grouped by assigned classes/rooms.'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3 overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('attendanceTotalsReport.class') || 'Class'}</TableHead>
                                            <TableHead>{t('attendanceTotalsReport.school') || 'School'}</TableHead>
                                            <TableHead className="text-right">{t('attendanceTotalsReport.attendanceRate') || 'Attendance rate'}</TableHead>
                                            <TableHead className="text-right">{t('attendanceTotalsReport.present') || 'Present'}</TableHead>
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
                                            <TableHead className="text-right">{t('attendanceTotalsReport.present') || 'Present'}</TableHead>
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
                            <CardTitle>{t('attendanceTotalsReport.recentSessions') || 'Recent attendance sessions'}</CardTitle>
                            <CardDescription>
                                {t('attendanceTotalsReport.recentSessionsHint') || 'Latest sessions within the selected date range.'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('attendanceTotalsReport.date') || 'Date'}</TableHead>
                                        <TableHead>{t('attendanceTotalsReport.class') || 'Class / Room'}</TableHead>
                                        <TableHead>{t('attendanceTotalsReport.school') || 'School'}</TableHead>
                                        <TableHead className="text-right">{t('attendanceTotalsReport.attendanceRate') || 'Attendance rate'}</TableHead>
                                        <TableHead className="text-right">{t('attendanceTotalsReport.present') || 'Present'}</TableHead>
                                        <TableHead className="text-right">{t('attendanceTotalsReport.absent') || 'Absent'}</TableHead>
                                        <TableHead className="text-right">{t('attendanceTotalsReport.totalRecords') || 'Records'}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {report.recentSessions.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center text-muted-foreground">
                                                {t('attendanceTotalsReport.noRecentSessions') || 'No sessions found for this range.'}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {report.recentSessions.map((session) => (
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
                </div>
            )}
        </div>
    );
}

