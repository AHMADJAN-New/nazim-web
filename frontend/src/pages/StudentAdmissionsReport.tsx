import { useMemo, useState } from 'react';
import { BarChart3, Filter, RefreshCw, UserCheck, Building2, CalendarRange, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useProfile } from '@/hooks/useProfiles';
import { useSchools } from '@/hooks/useSchools';
import { useAcademicYears } from '@/hooks/useAcademicYears';
import { useResidencyTypes } from '@/hooks/useResidencyTypes';
import { useStudentAdmissionReport } from '@/hooks/useStudentAdmissionReport';
import type { AdmissionStatus } from '@/types/domain/studentAdmission';
import type { StudentAdmissionReportFilters } from '@/types/domain/studentAdmissionReport';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSpinner } from '@/components/ui/loading';
import { Combobox } from '@/components/ui/combobox';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Link } from 'react-router-dom';

const statusOrder: AdmissionStatus[] = ['active', 'admitted', 'pending', 'inactive', 'suspended', 'withdrawn', 'graduated'];

const statusLabelMap = (
  t: ReturnType<typeof useLanguage>['t']
): Record<AdmissionStatus, string> => ({
  pending: t('admissions.pending') || 'Pending',
  admitted: t('admissions.admitted') || 'Admitted',
  active: t('admissions.active') || 'Active',
  inactive: t('admissions.inactive') || 'Inactive',
  suspended: t('admissions.suspended') || 'Suspended',
  withdrawn: t('admissions.withdrawn') || 'Withdrawn',
  graduated: t('admissions.graduated') || 'Graduated',
});

const formatNumber = (value?: number) => (value ?? 0).toLocaleString();

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">{message}</div>
);

const BreakdownTable = ({
  title,
  columns,
  rows,
  emptyMessage,
}: {
  title: string;
  columns: string[];
  rows: Array<(string | number | JSX.Element)[]>;
  emptyMessage?: string;
}) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="text-base font-semibold">{title}</CardTitle>
    </CardHeader>
    <CardContent className="pt-0">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column}>{column}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <EmptyState message={emptyMessage || 'No data available'} />
                </TableCell>
              </TableRow>
            )}
            {rows.map((row, index) => (
              <TableRow key={index}>
                {row.map((cell, cellIndex) => (
                  <TableCell key={`${index}-${cellIndex}`}>{cell}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </CardContent>
  </Card>
);

const SummaryCard = ({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof BarChart3;
  tone?: 'primary' | 'success' | 'warning' | 'muted';
}) => {
  const toneClass =
    tone === 'primary'
      ? 'text-primary'
      : tone === 'success'
        ? 'text-emerald-600'
        : tone === 'warning'
          ? 'text-amber-600'
          : 'text-muted-foreground';

  return (
    <Card>
      <CardContent className="flex items-center justify-between py-5">
        <div>
          <p className="text-xs uppercase text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold">{formatNumber(value)}</p>
        </div>
        <div className={`rounded-full bg-muted p-3 ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
};

const StudentAdmissionsReport = () => {
  const { t } = useLanguage();
  const { data: profile } = useProfile();
  const { data: schools } = useSchools(profile?.organization_id);
  const { data: academicYears } = useAcademicYears(profile?.organization_id);
  const { data: residencyTypes } = useResidencyTypes(profile?.organization_id);

  const [filters, setFilters] = useState<StudentAdmissionReportFilters>({
    organizationId: profile?.organization_id,
    fromDate: undefined,
    toDate: undefined,
  });

  const hasInvalidRange = useMemo(() => {
    if (!filters.fromDate || !filters.toDate) return false;
    return new Date(filters.fromDate).getTime() > new Date(filters.toDate).getTime();
  }, [filters.fromDate, filters.toDate]);

  const { data: report, isLoading, refetch, isError, error } = useStudentAdmissionReport(filters, {
    enabled: !hasInvalidRange,
  });

  const statusLabels = useMemo(() => statusLabelMap(t), [t]);

  const handleFilterChange = (key: keyof StudentAdmissionReportFilters, value: string | boolean | undefined) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === 'all' ? undefined : value,
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      organizationId: profile?.organization_id,
      fromDate: undefined,
      toDate: undefined,
      schoolId: undefined,
      academicYearId: undefined,
      residencyTypeId: undefined,
      enrollmentStatus: undefined,
      isBoarder: undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm text-muted-foreground">{t('admissions.reportSubtitle') || 'Analyze admissions performance across schools and years.'}</p>
          <h1 className="text-3xl font-bold tracking-tight">{t('admissions.reportTitle') || 'Admissions Report'}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('common.refresh') || 'Refresh'}
          </Button>
          <Button variant="ghost" onClick={handleResetFilters}>
            {t('admissions.resetFilters') || 'Reset filters'}
          </Button>
          <Button asChild>
            <Link to="/admissions">
              <UserCheck className="mr-2 h-4 w-4" />
              {t('admissions.list') || 'Admissions'}
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="h-4 w-4" />
            {t('admissions.filtersTitle') || 'Filters'}
          </div>
          <CardTitle className="text-xl">{t('admissions.reportFilters') || 'Report filters'}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>{t('admissions.school') || 'School'}</Label>
            <Combobox
              options={(schools || []).map((school) => ({ label: school.schoolName, value: school.id }))}
              value={filters.schoolId || ''}
              onChange={(value) => handleFilterChange('schoolId', value)}
              allowReset
              placeholder={t('admissions.allSchools') || 'All schools'}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('admissions.academicYear') || 'Academic Year'}</Label>
            <Select
              value={filters.academicYearId || 'all'}
              onValueChange={(value) => handleFilterChange('academicYearId', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('admissions.selectAcademicYear') || 'Select year'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all') || 'All'}</SelectItem>
                {(academicYears || []).map((year) => (
                  <SelectItem key={year.id} value={year.id}>
                    {year.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('admissions.residency') || 'Residency'}</Label>
            <Select
              value={filters.residencyTypeId || 'all'}
              onValueChange={(value) => handleFilterChange('residencyTypeId', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('admissions.allResidency') || 'All residency'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all') || 'All'}</SelectItem>
                {(residencyTypes || []).map((residency) => (
                  <SelectItem key={residency.id} value={residency.id}>
                    {residency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('admissions.status') || 'Status'}</Label>
            <Select
              value={filters.enrollmentStatus || 'all'}
              onValueChange={(value) => handleFilterChange('enrollmentStatus', value as AdmissionStatus | 'all')}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('admissions.allStatus') || 'All status'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all') || 'All'}</SelectItem>
                {statusOrder.map((status) => (
                  <SelectItem key={status} value={status}>
                    {statusLabels[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('admissions.fromDate') || 'From date'}</Label>
            <div className="flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={filters.fromDate || ''}
                onChange={(e) => handleFilterChange('fromDate', e.target.value || undefined)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('admissions.toDate') || 'To date'}</Label>
            <div className="flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={filters.toDate || ''}
                onChange={(e) => handleFilterChange('toDate', e.target.value || undefined)}
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border px-4 py-3 md:col-span-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">{t('admissions.boarderOnly') || 'Boarders only'}</p>
              <p className="text-xs text-muted-foreground">{t('admissions.boarderOnlyHint') || 'Show only boarding students'}</p>
            </div>
            <Switch
              checked={!!filters.isBoarder}
              onCheckedChange={(checked) => handleFilterChange('isBoarder', checked ? true : undefined)}
            />
          </div>
        </CardContent>
      </Card>

      {hasInvalidRange && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('admissions.invalidDateRangeTitle') || 'Invalid date range'}</AlertTitle>
          <AlertDescription>
            {t('admissions.invalidDateRangeDescription') || 'The start date must be before the end date.'}
          </AlertDescription>
        </Alert>
      )}

      {isLoading && (
        <div className="flex justify-center py-10">
          <LoadingSpinner />
        </div>
      )}

      {!isLoading && isError && !hasInvalidRange && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('common.error') || 'Error'}</AlertTitle>
          <AlertDescription>{(error as Error)?.message || t('common.unexpectedError') || 'Could not load report.'}</AlertDescription>
        </Alert>
      )}

      {!isLoading && !isError && report && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label={t('admissions.totalAdmissions') || 'Total admissions'} value={report.totals.total} icon={BarChart3} tone="primary" />
            <SummaryCard label={t('admissions.active') || 'Active'} value={report.totals.active} icon={BarChart3} tone="success" />
            <SummaryCard label={t('admissions.pending') || 'Pending'} value={report.totals.pending} icon={BarChart3} tone="warning" />
            <SummaryCard label={t('admissions.boarder') || 'Boarders'} value={report.totals.boarders} icon={Building2} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <BreakdownTable
              title={t('admissions.statusBreakdown') || 'Status breakdown'}
              columns={[t('admissions.status') || 'Status', t('admissions.totalAdmissions') || 'Admissions']}
              emptyMessage={t('admissions.noDataFound') || 'No data found'}
              rows={report.statusBreakdown
                .slice()
                .sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status))
                .map((item) => [
                  <div className="flex items-center gap-2" key={item.status}>
                    <Badge variant="outline">{statusLabels[item.status]}</Badge>
                  </div>,
                  formatNumber(item.count),
                ])}
            />

            <BreakdownTable
              title={t('admissions.schoolBreakdown') || 'By school'}
              columns={[t('admissions.school') || 'School', t('admissions.active') || 'Active', t('admissions.boarder') || 'Boarders', t('admissions.totalAdmissions') || 'Total']}
              emptyMessage={t('admissions.noDataFound') || 'No data found'}
              rows={(report.schoolBreakdown || []).map((item) => [
                item.schoolName,
                formatNumber(item.active),
                formatNumber(item.boarders),
                formatNumber(item.total),
              ])}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <BreakdownTable
              title={t('admissions.academicYearBreakdown') || 'By academic year'}
              columns={[t('admissions.academicYear') || 'Academic Year', t('admissions.active') || 'Active', t('admissions.boarder') || 'Boarders', t('admissions.totalAdmissions') || 'Total']}
              emptyMessage={t('admissions.noDataFound') || 'No data found'}
              rows={(report.academicYearBreakdown || []).map((item) => [
                item.academicYearName,
                formatNumber(item.active),
                formatNumber(item.boarders),
                formatNumber(item.total),
              ])}
            />

            <BreakdownTable
              title={t('admissions.residencyBreakdown') || 'Residency breakdown'}
              columns={[t('admissions.residencyType') || 'Residency type', t('admissions.active') || 'Active', t('admissions.boarder') || 'Boarders', t('admissions.totalAdmissions') || 'Total']}
              emptyMessage={t('admissions.noDataFound') || 'No data found'}
              rows={(report.residencyBreakdown || []).map((item) => [
                item.residencyTypeName,
                formatNumber(item.active),
                formatNumber(item.boarders),
                formatNumber(item.total),
              ])}
            />
          </div>

          <Card>
            <CardHeader className="flex flex-col gap-1 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <BarChart3 className="h-4 w-4" />
                  {t('admissions.recentAdmissions') || 'Recent admissions'}
                </div>
                <CardTitle className="text-xl">{t('admissions.recentAdmissionsSubtitle') || 'Latest 15 admissions'}</CardTitle>
              </div>
              <Badge variant="outline">{formatNumber(report.recentAdmissions.length)} {t('admissions.records') || 'records'}</Badge>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[220px]">{t('students.name') || 'Student'}</TableHead>
                      <TableHead className="min-w-[140px]">{t('admissions.admissionDetails') || 'Admission'}</TableHead>
                      <TableHead className="min-w-[180px]">{t('admissions.schoolClass') || 'School / Class'}</TableHead>
                      <TableHead className="min-w-[160px]">{t('admissions.residency') || 'Residency'}</TableHead>
                      <TableHead className="min-w-[170px]">{t('admissions.guardian') || 'Guardian'}</TableHead>
                      <TableHead className="min-w-[150px]">{t('admissions.contact') || 'Contact'}</TableHead>
                      <TableHead className="min-w-[120px]">{t('admissions.status') || 'Status'}</TableHead>
                      <TableHead className="min-w-[150px]">{t('admissions.admissionDate') || 'Admission date'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.recentAdmissions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8}>
                          <EmptyState message={t('admissions.noDataFound') || 'No admissions found'} />
                        </TableCell>
                      </TableRow>
                    )}
                    {report.recentAdmissions.map((admission) => (
                      <TableRow key={admission.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="font-semibold leading-tight">{admission.student?.fullName || t('students.notAvailable')}</div>
                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                              {admission.student?.admissionNumber ? (
                                <Badge variant="outline" className="text-[11px]">
                                  {t('admissions.admissionNo') || 'Adm'}: {admission.student.admissionNumber}
                                </Badge>
                              ) : null}
                              {admission.student?.cardNumber ? (
                                <Badge variant="secondary" className="text-[11px]">
                                  {t('admissions.cardNumber') || 'Card'}: {admission.student.cardNumber}
                                </Badge>
                              ) : null}
                              {admission.student?.admissionYear ? (
                                <span>{(t('admissions.year') || 'Year') + ': ' + admission.student.admissionYear}</span>
                              ) : null}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="text-sm font-medium text-primary">{admission.admissionYear || '—'}</div>
                            <div className="text-xs text-muted-foreground">
                              {admission.student?.fatherName ? (
                                <span>{admission.student.fatherName}</span>
                              ) : (
                                <span className="text-muted-foreground/80">{t('students.notAvailable')}</span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">{admission.school?.schoolName || '—'}</span>
                            <span className="text-xs text-muted-foreground">
                              {admission.class?.name || '—'}
                              {admission.classAcademicYear?.sectionName ? ` · ${admission.classAcademicYear.sectionName}` : ''}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-2">
                            <Badge variant="outline" className="w-fit text-xs">
                              {admission.residencyType?.name || t('admissions.residency') || 'Residency'}
                            </Badge>
                            <Badge variant={admission.isBoarder ? 'default' : 'secondary'} className="w-fit text-xs">
                              {admission.isBoarder ? t('admissions.boarderYes') || 'Boarder' : t('admissions.boarderNo') || 'Day'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">{admission.student?.guardianName || t('students.notAvailable')}</span>
                            {admission.student?.guardianPhone ? (
                              <span className="text-xs text-muted-foreground">{t('admissions.guardianPhone') || 'Phone'}: {admission.student.guardianPhone}</span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          {admission.student?.guardianPhone ? (
                            <Button variant="ghost" size="sm" className="text-xs" asChild>
                              <a href={`tel:${admission.student.guardianPhone}`}>
                                {t('admissions.callGuardian') || 'Call'}
                              </a>
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">{t('students.notAvailable')}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {statusLabels[admission.enrollmentStatus]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {admission.admissionDate
                            ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(admission.admissionDate)
                            : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default StudentAdmissionsReport;
