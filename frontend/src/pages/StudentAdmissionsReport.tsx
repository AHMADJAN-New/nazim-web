import { useMemo, useState } from 'react';
import { BarChart3, Filter, RefreshCw, UserCheck, Building2, AlertTriangle, X } from 'lucide-react';
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
import { DataTablePagination } from '@/components/data-table/data-table-pagination';

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
      ? 'bg-primary/10 text-primary'
      : tone === 'success'
        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
        : tone === 'warning'
          ? 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400'
          : 'bg-muted text-muted-foreground';

  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="space-y-0.5">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-xl font-bold">{formatNumber(value)}</p>
      </div>
      <div className={`rounded-lg p-2 ${toneClass}`}>
        <Icon className="h-4 w-4" />
      </div>
    </div>
  );
};

const StudentAdmissionsReport = () => {
  const { t } = useLanguage();
  const { data: profile } = useProfile();
  const { data: schools } = useSchools(profile?.organization_id);
  const { data: academicYears } = useAcademicYears(profile?.organization_id);
  const { data: residencyTypes } = useResidencyTypes(profile?.organization_id);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [filters, setFilters] = useState<StudentAdmissionReportFilters>({
    organizationId: profile?.organization_id,
    fromDate: undefined,
    toDate: undefined,
    page: 1,
    perPage: 25,
  });

  const [showFilters, setShowFilters] = useState(false);

  const hasInvalidRange = useMemo(() => {
    if (!filters.fromDate || !filters.toDate) return false;
    return new Date(filters.fromDate).getTime() > new Date(filters.toDate).getTime();
  }, [filters.fromDate, filters.toDate]);

  const filtersWithPagination = useMemo(() => ({
    ...filters,
    page,
    perPage: pageSize,
  }), [filters, page, pageSize]);

  const { data: report, isLoading, refetch, isError, error } = useStudentAdmissionReport(filtersWithPagination, {
    enabled: !hasInvalidRange,
  });

  const statusLabels = useMemo(() => statusLabelMap(t), [t]);

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
      page: 1,
      perPage: 25,
    });
    setPage(1);
    setPageSize(25);
  };

  const handleFilterChange = (key: keyof StudentAdmissionReportFilters, value: string | boolean | undefined) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === 'all' ? undefined : value,
    }));
    // Reset to first page when filters change
    setPage(1);
  };

  const hasActiveFilters = useMemo(() => {
    return !!(
      filters.schoolId ||
      filters.academicYearId ||
      filters.residencyTypeId ||
      filters.enrollmentStatus ||
      filters.isBoarder ||
      filters.fromDate ||
      filters.toDate
    );
  }, [filters]);

  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter(v => v !== undefined && v !== profile?.organization_id).length;
  }, [filters, profile?.organization_id]);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold leading-tight">{t('admissions.reportTitle') || 'Admissions Report'}</h1>
          <p className="text-muted-foreground">
            {t('admissions.reportSubtitle') || 'Analyze admissions performance across schools and years.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('common.refresh') || 'Refresh'}
          </Button>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="mr-2 h-4 w-4" />
            {t('admissions.filtersTitle') || 'Filters'}
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
          <Button asChild>
            <Link to="/admissions">
              <UserCheck className="mr-2 h-4 w-4" />
              {t('admissions.list') || 'Admissions'}
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>{t('admissions.reportFilters') || 'Report filters'}</CardTitle>
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                    {t('admissions.resetFilters') || 'Reset'}
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setShowFilters(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>{t('admissions.school') || 'School'}</Label>
                <Combobox
                  options={(schools || []).map((school) => ({ label: school.schoolName, value: school.id }))}
                  value={filters.schoolId || ''}
                  onValueChange={(value) => handleFilterChange('schoolId', value || undefined)}
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
                <Input
                  type="date"
                  value={filters.fromDate || ''}
                  onChange={(e) => handleFilterChange('fromDate', e.target.value || undefined)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('admissions.toDate') || 'To date'}</Label>
                <Input
                  type="date"
                  value={filters.toDate || ''}
                  onChange={(e) => handleFilterChange('toDate', e.target.value || undefined)}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border px-4 py-3 md:col-span-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{t('admissions.boarderOnly') || 'Boarders only'}</p>
                  <p className="text-xs text-muted-foreground">{t('admissions.boarderOnlyHint') || 'Show only boarding students'}</p>
                </div>
                <Switch
                  checked={!!filters.isBoarder}
                  onCheckedChange={(checked) => handleFilterChange('isBoarder', checked ? true : undefined)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error States */}
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
        <div className="py-12 flex justify-center">
          <LoadingSpinner text="Loading report..." />
        </div>
      )}

      {!isLoading && isError && !hasInvalidRange && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('common.error') || 'Error'}</AlertTitle>
          <AlertDescription>{(error as Error)?.message || t('common.unexpectedError') || 'Could not load report.'}</AlertDescription>
        </Alert>
      )}

      {/* Report Content */}
      {!isLoading && !isError && report && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label={t('admissions.totalAdmissions') || 'Total admissions'} value={report.totals.total} icon={BarChart3} tone="primary" />
            <SummaryCard label={t('admissions.active') || 'Active'} value={report.totals.active} icon={BarChart3} tone="success" />
            <SummaryCard label={t('admissions.pending') || 'Pending'} value={report.totals.pending} icon={BarChart3} tone="warning" />
            <SummaryCard label={t('admissions.boarder') || 'Boarders'} value={report.totals.boarders} icon={Building2} />
          </div>

          {/* Breakdown Tables - Compact Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('admissions.statusBreakdown') || 'Status breakdown'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('admissions.status') || 'Status'}</TableHead>
                        <TableHead className="text-right">{t('admissions.totalAdmissions') || 'Count'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.statusBreakdown.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                            {t('admissions.noDataFound') || 'No data found'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        report.statusBreakdown
                          .slice()
                          .sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status))
                          .map((item) => (
                            <TableRow key={item.status}>
                              <TableCell>
                                <Badge variant="outline">{statusLabels[item.status]}</Badge>
                              </TableCell>
                              <TableCell className="text-right font-medium">{formatNumber(item.count)}</TableCell>
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('admissions.schoolBreakdown') || 'By school'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('admissions.school') || 'School'}</TableHead>
                        <TableHead className="text-right">{t('admissions.active') || 'Active'}</TableHead>
                        <TableHead className="text-right">{t('admissions.boarder') || 'Boarders'}</TableHead>
                        <TableHead className="text-right">{t('admissions.totalAdmissions') || 'Total'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.schoolBreakdown.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                            {t('admissions.noDataFound') || 'No data found'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        report.schoolBreakdown.map((item) => (
                          <TableRow key={item.schoolId || 'none'}>
                            <TableCell className="font-medium">{item.schoolName}</TableCell>
                            <TableCell className="text-right">{formatNumber(item.active)}</TableCell>
                            <TableCell className="text-right">{formatNumber(item.boarders)}</TableCell>
                            <TableCell className="text-right font-semibold">{formatNumber(item.total)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('admissions.academicYearBreakdown') || 'By academic year'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('admissions.academicYear') || 'Year'}</TableHead>
                        <TableHead className="text-right">{t('admissions.active') || 'Active'}</TableHead>
                        <TableHead className="text-right">{t('admissions.boarder') || 'Boarders'}</TableHead>
                        <TableHead className="text-right">{t('admissions.totalAdmissions') || 'Total'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.academicYearBreakdown.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                            {t('admissions.noDataFound') || 'No data found'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        report.academicYearBreakdown.map((item) => (
                          <TableRow key={item.academicYearId || 'none'}>
                            <TableCell className="font-medium">{item.academicYearName}</TableCell>
                            <TableCell className="text-right">{formatNumber(item.active)}</TableCell>
                            <TableCell className="text-right">{formatNumber(item.boarders)}</TableCell>
                            <TableCell className="text-right font-semibold">{formatNumber(item.total)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('admissions.residencyBreakdown') || 'Residency breakdown'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('admissions.residencyType') || 'Type'}</TableHead>
                        <TableHead className="text-right">{t('admissions.active') || 'Active'}</TableHead>
                        <TableHead className="text-right">{t('admissions.boarder') || 'Boarders'}</TableHead>
                        <TableHead className="text-right">{t('admissions.totalAdmissions') || 'Total'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.residencyBreakdown.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                            {t('admissions.noDataFound') || 'No data found'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        report.residencyBreakdown.map((item) => (
                          <TableRow key={item.residencyTypeId || 'none'}>
                            <TableCell className="font-medium">{item.residencyTypeName}</TableCell>
                            <TableCell className="text-right">{formatNumber(item.active)}</TableCell>
                            <TableCell className="text-right">{formatNumber(item.boarders)}</TableCell>
                            <TableCell className="text-right font-semibold">{formatNumber(item.total)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Admissions Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t('admissions.recentAdmissions') || 'Admissions'}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {report.pagination.total > 0
                      ? `${t('pagination.showing') || 'Showing'} ${report.pagination.from} ${t('pagination.to') || 'to'} ${report.pagination.to} ${t('pagination.of') || 'of'} ${formatNumber(report.pagination.total)} ${t('pagination.entries') || 'entries'}`
                      : t('admissions.noDataFound') || 'No admissions found'}
                  </p>
                </div>
                {report.pagination.total > 0 && (
                  <Badge variant="outline">{formatNumber(report.pagination.total)} {t('admissions.records') || 'records'}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('students.name') || 'Student'}</TableHead>
                      <TableHead>{t('admissions.schoolClass') || 'School / Class'}</TableHead>
                      <TableHead>{t('admissions.residency') || 'Residency'}</TableHead>
                      <TableHead>{t('admissions.guardian') || 'Guardian'}</TableHead>
                      <TableHead>{t('admissions.status') || 'Status'}</TableHead>
                      <TableHead>{t('admissions.admissionDate') || 'Date'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.recentAdmissions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          {t('admissions.noDataFound') || 'No admissions found'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      report.recentAdmissions.map((admission) => (
                        <TableRow key={admission.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-semibold">{admission.student?.fullName || t('students.notAvailable')}</div>
                              <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                                {admission.student?.admissionNumber && (
                                  <Badge variant="outline" className="text-xs">
                                    {t('admissions.admissionNo') || 'Adm'}: {admission.student.admissionNumber}
                                  </Badge>
                                )}
                                {admission.student?.cardNumber && (
                                  <Badge variant="secondary" className="text-xs">
                                    {t('admissions.cardNumber') || 'Card'}: {admission.student.cardNumber}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5">
                              <div className="font-medium">{admission.school?.schoolName || '—'}</div>
                              <div className="text-sm text-muted-foreground">
                                {admission.class?.name || '—'}
                                {admission.classAcademicYear?.sectionName ? ` · ${admission.classAcademicYear.sectionName}` : ''}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Badge variant="outline" className="text-xs">
                                {admission.residencyType?.name || '—'}
                              </Badge>
                              <div>
                                <Badge variant={admission.isBoarder ? 'default' : 'secondary'} className="text-xs">
                                  {admission.isBoarder ? t('admissions.boarderYes') || 'Boarder' : t('admissions.boarderNo') || 'Day'}
                                </Badge>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5">
                              <div className="font-medium">{admission.student?.guardianName || t('students.notAvailable')}</div>
                              {admission.student?.guardianPhone && (
                                <Button variant="ghost" size="sm" className="h-6 text-xs px-2" asChild>
                                  <a href={`tel:${admission.student.guardianPhone}`}>
                                    {admission.student.guardianPhone}
                                  </a>
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="capitalize">
                              {statusLabels[admission.enrollmentStatus]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {admission.admissionDate
                              ? new Intl.DateTimeFormat(undefined, { dateStyle: 'short' }).format(admission.admissionDate)
                              : '—'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {report.pagination.total > 0 && (
                <DataTablePagination
                  table={{
                    getState: () => ({ pagination: { pageIndex: page - 1, pageSize } }),
                    setPageIndex: () => {},
                    setPageSize: () => {},
                    getPageCount: () => report.pagination.lastPage,
                  } as any}
                  paginationMeta={{
                    current_page: report.pagination.currentPage,
                    per_page: report.pagination.perPage,
                    total: report.pagination.total,
                    last_page: report.pagination.lastPage,
                    from: report.pagination.from,
                    to: report.pagination.to,
                  }}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  showPageSizeSelector={true}
                  showTotalCount={true}
                />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default StudentAdmissionsReport;
