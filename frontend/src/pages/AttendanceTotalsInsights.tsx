import { format, subDays, subMonths } from 'date-fns';
import {
  Activity,
  AlertTriangle,
  Building2,
  Calendar,
  Clock,
  ExternalLink,
  GraduationCap,
  Heart,
  RefreshCw,
  School,
  Users,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { FilterPanel } from '@/components/layout/FilterPanel';
import { PageHeader } from '@/components/layout/PageHeader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { dateToLocalYYYYMMDD, parseLocalDate } from '@/lib/dateUtils';
import { cn, formatDate as formatCalendarDate } from '@/lib/utils';
import { useAcademicYears, useCurrentAcademicYear } from '@/hooks/useAcademicYears';
import { useAttendanceTotalsReport } from '@/hooks/useAttendanceTotalsReport';
import { useClasses } from '@/hooks/useClasses';
import { useLanguage } from '@/hooks/useLanguage';
import { useProfile } from '@/hooks/useProfiles';
import { useSchools } from '@/hooks/useSchools';
import { useStudentAdmissions } from '@/hooks/useStudentAdmissions';
import type { AttendanceSessionOverview, AttendanceTotalsReportFilters } from '@/types/domain/attendanceTotalsReport';

type BreakdownSums = {
  totalRecords: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  sick: number;
  leave: number;
};

const emptySums = (): BreakdownSums => ({
  totalRecords: 0,
  present: 0,
  absent: 0,
  late: 0,
  excused: 0,
  sick: 0,
  leave: 0,
});

const sumBreakdownRows = (
  rows: Array<{
    totalRecords: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    sick: number;
    leave: number;
  }>
): BreakdownSums =>
  rows.reduce(
    (acc, r) => ({
      totalRecords: acc.totalRecords + r.totalRecords,
      present: acc.present + r.present,
      absent: acc.absent + r.absent,
      late: acc.late + r.late,
      excused: acc.excused + r.excused,
      sick: acc.sick + r.sick,
      leave: acc.leave + r.leave,
    }),
    emptySums()
  );

const rateFromSums = (sums: BreakdownSums) =>
  sums.totalRecords > 0 ? (sums.present / sums.totalRecords) * 100 : null;

const formatPercent = (value?: number | null) =>
  value === null || value === undefined ? '—' : `${value.toFixed(1)}%`;

const STATUS_KEYS = ['present', 'absent', 'late', 'excused', 'sick', 'leave'] as const;

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

export default function AttendanceTotalsInsights() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: profile } = useProfile();
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
  const [sessionType, setSessionType] = useState<'class' | 'room'>('class');
  const [dateRangePreset, setDateRangePreset] = useState<'1week' | '1month' | '4months' | 'custom'>('1week');

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
    if (defaultAcademicYearAppliedRef.current || !currentAcademicYear?.id || filters.academicYearId) return;
    defaultAcademicYearAppliedRef.current = true;
    setFilters((prev) => ({ ...prev, academicYearId: currentAcademicYear.id }));
  }, [currentAcademicYear?.id, filters.academicYearId]);

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
    }),
    [profile?.organization_id, filters]
  );

  const { data: report, isLoading, refetch } = useAttendanceTotalsReport(hookFilters, {
    enabled: !!profile?.organization_id && !!profile?.default_school_id && !hasInvalidRange,
  });

  const classSessions = useMemo(
    () =>
      (report?.recentSessions ?? []).filter(
        (session) => !!session.className && session.className !== '—' && session.className !== 'Unassigned'
      ),
    [report?.recentSessions]
  );

  const roomSessions = useMemo(
    () =>
      (report?.recentSessions ?? []).filter(
        (session) => !session.className || session.className === '—' || session.className === 'Unassigned'
      ),
    [report?.recentSessions]
  );

  const goToDailyReportForSession = (session: AttendanceSessionOverview) => {
    const qs = new URLSearchParams();
    qs.set('attendance_session_id', session.id);
    if (session.sessionDate) {
      const day = format(session.sessionDate, 'yyyy-MM-dd');
      qs.set('date_from', day);
      qs.set('date_to', day);
    }
    navigate(`/attendance/reports?${qs.toString()}`);
  };

  const classFooter = useMemo(() => sumBreakdownRows(report?.classBreakdown ?? []), [report?.classBreakdown]);
  const schoolFooter = useMemo(() => sumBreakdownRows(report?.schoolBreakdown ?? []), [report?.schoolBreakdown]);
  const roomFooter = useMemo(() => sumBreakdownRows(report?.roomBreakdown ?? []), [report?.roomBreakdown]);

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
    if (preset === 'custom') return;
    const today = new Date();
    let dateFrom: string;
    const dateTo = format(today, 'yyyy-MM-dd');
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
    if (!filters.dateFrom || !filters.dateTo) handleDateRangePreset('1week');
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const studentTypeOptions = [
    { value: undefined as undefined, label: t('attendancePage.studentTypeAll'), icon: Users },
    { value: 'boarders' as const, label: t('attendancePage.studentTypeBoarders'), icon: School },
    { value: 'day_scholars' as const, label: t('attendancePage.studentTypeDayScholars'), icon: GraduationCap },
  ];

  const breakdownTableHeadClass = 'text-right whitespace-nowrap';
  const backParams = buildTotalsInsightsSearchParams(filters);
  const calendarLocale =
    language === 'fa' ? 'fa-AF' : language === 'ps' ? 'ps-AF' : language === 'ar' ? 'ar-SA' : 'en-US';

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl space-y-6 overflow-x-hidden">
      <PageHeader
        title={t('attendanceTotalsReport.insightsTitle')}
        description={t('attendanceTotalsReport.insightsSubtitle')}
        icon={<Activity className="h-5 w-5" />}
        secondaryActions={[
          {
            label: t('attendanceTotalsReport.backToTotals'),
            onClick: () => navigate(`/attendance/reports/totals?${backParams.toString()}`),
            icon: <GraduationCap className="h-4 w-4" />,
            variant: 'outline',
          },
          {
            label: t('events.refresh'),
            onClick: () => void refetch(),
            icon: <RefreshCw className="h-4 w-4" />,
            variant: 'outline',
          },
        ]}
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
                onValueChange={(value) => setFilters((prev) => ({ ...prev, academicYearId: value || undefined }))}
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
              <Select value={filters.status ?? 'all'} onValueChange={(value) => handleFilterChange('status', value)}>
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
                  const active = (opt.value === undefined && !filters.studentType) || filters.studentType === opt.value;
                  return (
                    <button
                      key={opt.value ?? 'all'}
                      type="button"
                      aria-label={opt.label}
                      aria-pressed={active}
                      onClick={() => setStudentTypeFilter(opt.value)}
                      className={cn(
                        'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        active ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:bg-muted'
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
            <Tabs value={dateRangePreset} onValueChange={(value) => handleDateRangePreset(value as typeof dateRangePreset)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="1week" className="flex items-center gap-2"><Calendar className="h-4 w-4" /><span className="hidden sm:inline">{t('attendanceTotalsReport.dateRange.1week')}</span></TabsTrigger>
                <TabsTrigger value="1month" className="flex items-center gap-2"><Calendar className="h-4 w-4" /><span className="hidden sm:inline">{t('attendanceTotalsReport.dateRange.1month')}</span></TabsTrigger>
                <TabsTrigger value="4months" className="flex items-center gap-2"><Calendar className="h-4 w-4" /><span className="hidden sm:inline">{t('attendanceTotalsReport.dateRange.4months')}</span></TabsTrigger>
                <TabsTrigger value="custom" className="flex items-center gap-2"><Calendar className="h-4 w-4" /><span className="hidden sm:inline">{t('attendanceTotalsReport.dateRange.custom')}</span></TabsTrigger>
              </TabsList>
            </Tabs>
            {dateRangePreset === 'custom' && (
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 pt-2">
                <div className="space-y-2">
                  <Label>{t('library.fromDate')}</Label>
                  <CalendarDatePicker date={filters.dateFrom ? parseLocalDate(filters.dateFrom) : undefined} onDateChange={(date) => handleFilterChange('dateFrom', date ? dateToLocalYYYYMMDD(date) : undefined)} />
                </div>
                <div className="space-y-2">
                  <Label>{t('library.toDate')}</Label>
                  <CalendarDatePicker date={filters.dateTo ? parseLocalDate(filters.dateTo) : undefined} onDateChange={(date) => handleFilterChange('dateTo', date ? dateToLocalYYYYMMDD(date) : undefined)} />
                </div>
              </div>
            )}
          </div>
        </div>
      </FilterPanel>

      {isLoading && <div className="flex items-center justify-center py-16"><LoadingSpinner text={t('common.loading')} /></div>}

      {!isLoading && report && (
        <div className="space-y-4">
          <FilterPanel title={t('attendanceTotalsReport.statusBreakdown')} defaultOpenDesktop defaultOpenMobile={false}>
            <Card className="border-0 shadow-none">
              <CardHeader className="px-0 pt-0 pb-2">
                <CardDescription>{t('attendanceTotalsReport.statusBreakdownHint')}</CardDescription>
              </CardHeader>
              <CardContent className="px-0 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
                {STATUS_KEYS.map((key) => {
                  const meta = attendanceStatusMeta[key];
                  const total = report.statusBreakdown.find((item) => item.status === key)?.total || 0;
                  const Icon = meta.icon;
                  return (
                    <div key={key} className="rounded-lg border p-3 space-y-1">
                      <div className={`inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs font-medium ${meta.tone}`}>
                        <Icon className="h-3.5 w-3.5" />
                        {meta.label}
                      </div>
                      <div className="text-2xl font-semibold">{total}</div>
                      <p className="text-xs text-muted-foreground">{t('attendanceTotalsReport.records')}</p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </FilterPanel>

          <FilterPanel title={t('attendanceTotalsReport.recentSessions')} defaultOpenDesktop defaultOpenMobile={false}>
            <Tabs value={sessionType} onValueChange={(value) => setSessionType(value as 'class' | 'room')} className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="class" className="flex items-center gap-2"><GraduationCap className="h-4 w-4" /><span className="hidden sm:inline">{t('attendanceTotalsReport.classSessions')}</span></TabsTrigger>
                <TabsTrigger value="room" className="flex items-center gap-2"><Building2 className="h-4 w-4" /><span className="hidden sm:inline">{t('attendanceTotalsReport.roomSessions')}</span></TabsTrigger>
              </TabsList>

              <TabsContent value="class" className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  <Card className="h-full overflow-hidden">
                    <CardHeader>
                      <CardTitle>{t('attendanceTotalsReport.classBreakdown')}</CardTitle>
                      <CardDescription>{t('attendanceTotalsReport.classBreakdownHint')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 overflow-x-auto">
                      <Table>
                        <TableHeader><TableRow><TableHead>{t('search.class')}</TableHead><TableHead>{t('attendanceTotalsReport.school')}</TableHead><TableHead className={breakdownTableHeadClass}>{t('attendanceTotalsReport.attendanceRate')}</TableHead><TableHead className={breakdownTableHeadClass}>{t('examReports.present')}</TableHead><TableHead className={breakdownTableHeadClass}>{t('attendanceTotalsReport.absent')}</TableHead><TableHead className={breakdownTableHeadClass}>{t('attendancePage.statusLate')}</TableHead><TableHead className={breakdownTableHeadClass}>{t('attendancePage.statusExcused')}</TableHead><TableHead className={breakdownTableHeadClass}>{t('attendancePage.statusSick')}</TableHead><TableHead className={breakdownTableHeadClass}>{t('attendancePage.statusLeave')}</TableHead><TableHead className={breakdownTableHeadClass}>{t('attendanceTotalsReport.totalRecords')}</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {report.classBreakdown.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">{t('attendanceTotalsReport.noClassData')}</TableCell></TableRow>}
                          {report.classBreakdown.map((row) => <TableRow key={`${row.classId}-${row.className}`}><TableCell className="font-medium">{row.className}</TableCell><TableCell>{row.schoolName}</TableCell><TableCell className="text-right">{formatPercent(row.attendanceRate)}</TableCell><TableCell className="text-right">{row.present.toLocaleString()}</TableCell><TableCell className="text-right">{row.absent.toLocaleString()}</TableCell><TableCell className="text-right">{row.late.toLocaleString()}</TableCell><TableCell className="text-right">{row.excused.toLocaleString()}</TableCell><TableCell className="text-right">{row.sick.toLocaleString()}</TableCell><TableCell className="text-right">{row.leave.toLocaleString()}</TableCell><TableCell className="text-right">{row.totalRecords.toLocaleString()}</TableCell></TableRow>)}
                          {report.classBreakdown.length > 0 && <TableRow className="bg-muted/50 font-medium"><TableCell colSpan={2}>{t('attendanceTotalsReport.tableFooterTotal')}</TableCell><TableCell className="text-right">{formatPercent(rateFromSums(classFooter))}</TableCell><TableCell className="text-right">{classFooter.present.toLocaleString()}</TableCell><TableCell className="text-right">{classFooter.absent.toLocaleString()}</TableCell><TableCell className="text-right">{classFooter.late.toLocaleString()}</TableCell><TableCell className="text-right">{classFooter.excused.toLocaleString()}</TableCell><TableCell className="text-right">{classFooter.sick.toLocaleString()}</TableCell><TableCell className="text-right">{classFooter.leave.toLocaleString()}</TableCell><TableCell className="text-right">{classFooter.totalRecords.toLocaleString()}</TableCell></TableRow>}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                  <Card className="h-full overflow-hidden">
                    <CardHeader><CardTitle>{t('attendanceTotalsReport.schoolBreakdown')}</CardTitle><CardDescription>{t('attendanceTotalsReport.schoolBreakdownHint')}</CardDescription></CardHeader>
                    <CardContent className="space-y-3 overflow-x-auto">
                      <Table>
                        <TableHeader><TableRow><TableHead>{t('attendanceTotalsReport.school')}</TableHead><TableHead className={breakdownTableHeadClass}>{t('attendanceTotalsReport.attendanceRate')}</TableHead><TableHead className={breakdownTableHeadClass}>{t('examReports.present')}</TableHead><TableHead className={breakdownTableHeadClass}>{t('attendanceTotalsReport.absent')}</TableHead><TableHead className={breakdownTableHeadClass}>{t('attendancePage.statusLate')}</TableHead><TableHead className={breakdownTableHeadClass}>{t('attendancePage.statusExcused')}</TableHead><TableHead className={breakdownTableHeadClass}>{t('attendancePage.statusSick')}</TableHead><TableHead className={breakdownTableHeadClass}>{t('attendancePage.statusLeave')}</TableHead><TableHead className={breakdownTableHeadClass}>{t('attendanceTotalsReport.totalRecords')}</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {report.schoolBreakdown.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">{t('attendanceTotalsReport.noSchoolData')}</TableCell></TableRow>}
                          {report.schoolBreakdown.map((row) => <TableRow key={`${row.schoolId}-${row.schoolName}`}><TableCell className="font-medium">{row.schoolName}</TableCell><TableCell className="text-right">{formatPercent(row.attendanceRate)}</TableCell><TableCell className="text-right">{row.present.toLocaleString()}</TableCell><TableCell className="text-right">{row.absent.toLocaleString()}</TableCell><TableCell className="text-right">{row.late.toLocaleString()}</TableCell><TableCell className="text-right">{row.excused.toLocaleString()}</TableCell><TableCell className="text-right">{row.sick.toLocaleString()}</TableCell><TableCell className="text-right">{row.leave.toLocaleString()}</TableCell><TableCell className="text-right">{row.totalRecords.toLocaleString()}</TableCell></TableRow>)}
                          {report.schoolBreakdown.length > 0 && <TableRow className="bg-muted/50 font-medium"><TableCell>{t('attendanceTotalsReport.tableFooterTotal')}</TableCell><TableCell className="text-right">{formatPercent(rateFromSums(schoolFooter))}</TableCell><TableCell className="text-right">{schoolFooter.present.toLocaleString()}</TableCell><TableCell className="text-right">{schoolFooter.absent.toLocaleString()}</TableCell><TableCell className="text-right">{schoolFooter.late.toLocaleString()}</TableCell><TableCell className="text-right">{schoolFooter.excused.toLocaleString()}</TableCell><TableCell className="text-right">{schoolFooter.sick.toLocaleString()}</TableCell><TableCell className="text-right">{schoolFooter.leave.toLocaleString()}</TableCell><TableCell className="text-right">{schoolFooter.totalRecords.toLocaleString()}</TableCell></TableRow>}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>

                <Card className="overflow-hidden">
                  <CardHeader><CardTitle>{t('attendanceTotalsReport.recentSessions')}</CardTitle><CardDescription>{t('attendanceTotalsReport.recentSessionsHint')}</CardDescription></CardHeader>
                  <CardContent className="overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow><TableHead>{t('events.date')}</TableHead><TableHead>{t('search.class')}</TableHead><TableHead>{t('attendanceTotalsReport.school')}</TableHead><TableHead className={breakdownTableHeadClass}>{t('attendanceTotalsReport.attendanceRate')}</TableHead><TableHead className={breakdownTableHeadClass}>{t('examReports.present')}</TableHead><TableHead className={breakdownTableHeadClass}>{t('attendanceTotalsReport.absent')}</TableHead><TableHead className={breakdownTableHeadClass}>{t('attendanceTotalsReport.totalRecords')}</TableHead><TableHead className="w-[52px] text-center">{t('events.actions')}</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {classSessions.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">{t('attendanceTotalsReport.noRecentSessions')}</TableCell></TableRow>}
                        {classSessions.map((session) => <TableRow key={session.id}><TableCell className="font-medium">{session.sessionDate ? formatCalendarDate(session.sessionDate, calendarLocale) : '—'}</TableCell><TableCell>{session.className}</TableCell><TableCell>{session.schoolName || t('attendanceTotalsReport.noSchool')}</TableCell><TableCell className="text-right">{formatPercent(session.attendanceRate)}</TableCell><TableCell className="text-right">{session.totals.present.toLocaleString()}</TableCell><TableCell className="text-right">{session.totals.absent.toLocaleString()}</TableCell><TableCell className="text-right">{session.totals.records.toLocaleString()}</TableCell><TableCell className="text-center p-1"><Button type="button" variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" aria-label={t('attendanceTotalsReport.openSessionInDailyReport')} onClick={() => goToDailyReportForSession(session)}><ExternalLink className="h-4 w-4" /></Button></TableCell></TableRow>)}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="room" className="space-y-4">
                <Card className="overflow-hidden">
                  <CardHeader><CardTitle>{t('attendanceTotalsReport.roomBreakdown')}</CardTitle><CardDescription>{t('attendanceTotalsReport.roomBreakdownHint')}</CardDescription></CardHeader>
                  <CardContent className="overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow><TableHead>{t('attendanceTotalsReport.room')}</TableHead><TableHead>{t('attendanceTotalsReport.school')}</TableHead><TableHead className={breakdownTableHeadClass}>{t('attendanceTotalsReport.attendanceRate')}</TableHead><TableHead className={breakdownTableHeadClass}>{t('examReports.present')}</TableHead><TableHead className={breakdownTableHeadClass}>{t('attendanceTotalsReport.absent')}</TableHead><TableHead className={breakdownTableHeadClass}>{t('attendancePage.statusLate')}</TableHead><TableHead className={breakdownTableHeadClass}>{t('attendancePage.statusExcused')}</TableHead><TableHead className={breakdownTableHeadClass}>{t('attendancePage.statusSick')}</TableHead><TableHead className={breakdownTableHeadClass}>{t('attendancePage.statusLeave')}</TableHead><TableHead className={breakdownTableHeadClass}>{t('attendanceTotalsReport.totalRecords')}</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {(report.roomBreakdown?.length ?? 0) === 0 && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">{t('attendanceTotalsReport.noRoomData')}</TableCell></TableRow>}
                        {(report.roomBreakdown ?? []).map((row) => <TableRow key={`${row.roomName}-${row.schoolName}`}><TableCell className="font-medium">{row.roomName}</TableCell><TableCell>{row.schoolName}</TableCell><TableCell className="text-right">{formatPercent(row.attendanceRate)}</TableCell><TableCell className="text-right">{row.present.toLocaleString()}</TableCell><TableCell className="text-right">{row.absent.toLocaleString()}</TableCell><TableCell className="text-right">{row.late.toLocaleString()}</TableCell><TableCell className="text-right">{row.excused.toLocaleString()}</TableCell><TableCell className="text-right">{row.sick.toLocaleString()}</TableCell><TableCell className="text-right">{row.leave.toLocaleString()}</TableCell><TableCell className="text-right">{row.totalRecords.toLocaleString()}</TableCell></TableRow>)}
                        {(report.roomBreakdown?.length ?? 0) > 0 && <TableRow className="bg-muted/50 font-medium"><TableCell colSpan={2}>{t('attendanceTotalsReport.tableFooterTotal')}</TableCell><TableCell className="text-right">{formatPercent(rateFromSums(roomFooter))}</TableCell><TableCell className="text-right">{roomFooter.present.toLocaleString()}</TableCell><TableCell className="text-right">{roomFooter.absent.toLocaleString()}</TableCell><TableCell className="text-right">{roomFooter.late.toLocaleString()}</TableCell><TableCell className="text-right">{roomFooter.excused.toLocaleString()}</TableCell><TableCell className="text-right">{roomFooter.sick.toLocaleString()}</TableCell><TableCell className="text-right">{roomFooter.leave.toLocaleString()}</TableCell><TableCell className="text-right">{roomFooter.totalRecords.toLocaleString()}</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden">
                  <CardHeader><CardTitle>{t('attendanceTotalsReport.recentRoomSessions')}</CardTitle><CardDescription>{t('attendanceTotalsReport.recentRoomSessionsHint')}</CardDescription></CardHeader>
                  <CardContent className="overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow><TableHead>{t('events.date')}</TableHead><TableHead>{t('attendanceTotalsReport.room')}</TableHead><TableHead>{t('attendanceTotalsReport.school')}</TableHead><TableHead className={breakdownTableHeadClass}>{t('attendanceTotalsReport.attendanceRate')}</TableHead><TableHead className={breakdownTableHeadClass}>{t('examReports.present')}</TableHead><TableHead className={breakdownTableHeadClass}>{t('attendanceTotalsReport.absent')}</TableHead><TableHead className={breakdownTableHeadClass}>{t('attendanceTotalsReport.totalRecords')}</TableHead><TableHead className="w-[52px] text-center">{t('events.actions')}</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {roomSessions.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">{t('attendanceTotalsReport.noRecentRoomSessions')}</TableCell></TableRow>}
                        {roomSessions.map((session) => <TableRow key={session.id}><TableCell className="font-medium">{session.sessionDate ? formatCalendarDate(session.sessionDate, calendarLocale) : '—'}</TableCell><TableCell>{session.className && session.className !== '—' ? session.className : t('attendanceTotalsReport.generalRoom')}</TableCell><TableCell>{session.schoolName || t('attendanceTotalsReport.noSchool')}</TableCell><TableCell className="text-right">{formatPercent(session.attendanceRate)}</TableCell><TableCell className="text-right">{session.totals.present.toLocaleString()}</TableCell><TableCell className="text-right">{session.totals.absent.toLocaleString()}</TableCell><TableCell className="text-right">{session.totals.records.toLocaleString()}</TableCell><TableCell className="text-center p-1"><Button type="button" variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" aria-label={t('attendanceTotalsReport.openSessionInDailyReport')} onClick={() => goToDailyReportForSession(session)}><ExternalLink className="h-4 w-4" /></Button></TableCell></TableRow>)}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </FilterPanel>
        </div>
      )}
    </div>
  );
}
