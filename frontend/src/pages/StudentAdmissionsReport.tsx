import { BarChart3, RefreshCw, UserCheck, Building2, AlertTriangle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { FilterPanel } from '@/components/layout/FilterPanel';
import { PageHeader } from '@/components/layout/PageHeader';
import { ReportExportButtons } from '@/components/reports/ReportExportButtons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSchoolContext } from '@/contexts/SchoolContext';
import { useAcademicYears } from '@/hooks/useAcademicYears';
import { useLanguage } from '@/hooks/useLanguage';
import { useProfile } from '@/hooks/useProfiles';
import { useResidencyTypes } from '@/hooks/useResidencyTypes';
import { useSchools } from '@/hooks/useSchools';
import { useStudentAdmissionReport } from '@/hooks/useStudentAdmissionReport';
import type { AdmissionStatus } from '@/types/domain/studentAdmission';
import type { StudentAdmission } from '@/types/domain/studentAdmission';
import type { StudentAdmissionReportFilters } from '@/types/domain/studentAdmissionReport';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSpinner } from '@/components/ui/loading';
import { Combobox } from '@/components/ui/combobox';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';

const statusOrder: AdmissionStatus[] = ['active', 'admitted', 'pending', 'inactive', 'suspended', 'withdrawn', 'graduated'];

const statusLabelMap = (
  t: ReturnType<typeof useLanguage>['t']
): Record<AdmissionStatus, string> => ({
  pending: t('admissions.pending') || 'Pending',
  admitted: t('admissions.admitted') || 'Admitted',
  active: t('events.active') || 'Active',
  inactive: t('events.inactive') || 'Inactive',
  suspended: t('students.suspended') || 'Suspended',
  withdrawn: t('admissions.withdrawn') || 'Withdrawn',
  graduated: t('students.graduated') || 'Graduated',
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
  const { t, language: currentLanguage } = useLanguage();
  const { data: profile } = useProfile();
  const { selectedSchoolId } = useSchoolContext();
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

  // Transform admissions to report format
  const transformAdmissionData = (admissions: StudentAdmission[]) => {
    return admissions.map((admission) => ({
      student_name: admission.student?.fullName || '—',
      admission_no: admission.student?.admissionNumber || '—',
      card_number: admission.student?.cardNumber || '—',
      school: admission.school?.schoolName || '—',
      class: admission.class?.name || '—',
      section: admission.classAcademicYear?.sectionName || '—',
      academic_year: admission.academicYear?.name || '—',
      residency_type: admission.residencyType?.name || '—',
      is_boarder: admission.isBoarder ? (currentLanguage === 'ps' ? 'هو' : (currentLanguage === 'fa' ? 'بله' : (currentLanguage === 'ar' ? 'نعم' : 'Yes'))) : (currentLanguage === 'ps' ? 'نه' : (currentLanguage === 'fa' ? 'خیر' : (currentLanguage === 'ar' ? 'لا' : 'No'))),
      room: admission.room?.roomNumber || '—',
      guardian_name: admission.student?.guardianName || '—',
      guardian_phone: admission.student?.guardianPhone || '—',
      enrollment_status: admission.enrollmentStatus || '—',
      admission_date: admission.admissionDate ? new Date(admission.admissionDate).toISOString().split('T')[0] : '—',
    }));
  };

  // Build filters summary
  const buildFiltersSummary = () => {
    const filterParts: string[] = [];
    if (filters.schoolId) {
      const schoolName = schools?.find(s => s.id === filters.schoolId)?.schoolName;
      if (schoolName) {
        filterParts.push(`School: ${schoolName}`);
      }
    }
    if (filters.academicYearId) {
      const yearName = academicYears?.find(y => y.id === filters.academicYearId)?.name;
      if (yearName) {
        filterParts.push(`Academic Year: ${yearName}`);
      }
    }
    if (filters.enrollmentStatus) {
      filterParts.push(`Status: ${filters.enrollmentStatus}`);
    }
    if (filters.residencyTypeId) {
      const residencyName = residencyTypes?.find(r => r.id === filters.residencyTypeId)?.name;
      if (residencyName) {
        filterParts.push(`Residency: ${residencyName}`);
      }
    }
    if (filters.isBoarder !== undefined) {
      filterParts.push(`Boarder: ${filters.isBoarder ? 'Yes' : 'No'}`);
    }
    if (filters.fromDate && filters.toDate) {
      filterParts.push(`Date Range: ${filters.fromDate} to ${filters.toDate}`);
    }
    return filterParts.join(' | ');
  };

  // Get current school for export
  const currentSchoolId = selectedSchoolId || profile?.default_school_id;

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

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 max-w-7xl w-full overflow-x-hidden min-w-0">
      <PageHeader
        title={t('admissions.reportTitle') || 'Admissions Report'}
        description={t('admissions.reportSubtitle') || 'Analyze admissions performance across schools and years.'}
        icon={<BarChart3 className="h-5 w-5" />}
        primaryAction={{
          label: t('admissions.list') || 'Admissions',
          href: '/admissions',
          icon: <UserCheck className="h-4 w-4" />,
        }}
        secondaryActions={[
          {
            label: t('events.refresh') || 'Refresh',
            onClick: () => refetch(),
            icon: <RefreshCw className="h-4 w-4" />,
            variant: 'outline',
          },
        ]}
        rightSlot={
          report && report.recentAdmissions.length > 0 ? (
            <ReportExportButtons
              data={report.recentAdmissions}
              columns={[
                { key: 'student_name', label: t('events.name') || 'Student Name' },
                { key: 'admission_no', label: t('examReports.admissionNo') || 'Admission #' },
                { key: 'card_number', label: t('attendanceReports.cardNumber') || 'Card #' },
                { key: 'school', label: t('admissions.school') || 'School' },
                { key: 'class', label: t('search.class') || 'Class' },
                { key: 'section', label: t('events.section') || 'Section' },
                { key: 'academic_year', label: t('admissions.academicYear') || 'Academic Year' },
                { key: 'residency_type', label: t('admissions.residency') || 'Residency Type' },
                { key: 'is_boarder', label: t('admissions.boarder') || 'Boarder' },
                { key: 'room', label: t('admissions.room') || 'Room' },
                { key: 'guardian_name', label: t('admissions.guardian') || 'Guardian Name' },
                { key: 'guardian_phone', label: t('admissions.guardianPhone') || 'Guardian Phone' },
                { key: 'enrollment_status', label: t('events.status') || 'Enrollment Status' },
                { key: 'admission_date', label: t('studentReportCard.admissionDate') || 'Admission Date' },
              ]}
              reportKey="student_admissions"
              title={t('admissions.reportTitle') || 'Student Admissions Report'}
              transformData={transformAdmissionData}
              buildFiltersSummary={buildFiltersSummary}
              schoolId={currentSchoolId}
              templateType="student_admissions"
              disabled={!report || report.recentAdmissions.length === 0 || isLoading}
              errorNoSchool={t('admissions.schoolRequiredForExport') || 'A school is required to export the report.'}
              errorNoData={t('events.noDataToExport') || 'No data to export'}
              successPdf={t('admissions.reportExported') || 'PDF report generated successfully'}
              successExcel={t('admissions.reportExported') || 'Excel report generated successfully'}
              errorPdf={t('admissions.exportFailed') || 'Failed to generate PDF report'}
              errorExcel={t('admissions.exportFailed') || 'Failed to generate Excel report'}
              parameters={{
                academic_year_id: filters.academicYearId || undefined,
                enrollment_status: filters.enrollmentStatus !== 'all' ? filters.enrollmentStatus : undefined,
                residency_type_id: filters.residencyTypeId || undefined,
                is_boarder: filters.isBoarder || undefined,
                from_date: filters.fromDate || undefined,
                to_date: filters.toDate || undefined,
              }}
            />
          ) : null
        }
      />

      <FilterPanel
        title={t('admissions.reportFilters') || 'Report filters'}
        footer={
          hasActiveFilters ? (
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                {t('admissions.resetFilters') || 'Reset'}
              </Button>
            </div>
          ) : null
        }
      >
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>{t('admissions.school') || 'School'}</Label>
            <Combobox
              options={(schools || []).map((school) => ({ label: school.schoolName, value: school.id }))}
              value={filters.schoolId || ''}
              onValueChange={(value) => handleFilterChange('schoolId', value || undefined)}
              placeholder={t('leave.allSchools') || 'All schools'}
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
                <SelectItem value="all">{t('subjects.all') || 'All'}</SelectItem>
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
                <SelectItem value="all">{t('subjects.all') || 'All'}</SelectItem>
                {(residencyTypes || []).map((residency) => (
                  <SelectItem key={residency.id} value={residency.id}>
                    {residency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('events.status') || 'Status'}</Label>
            <Select
              value={filters.enrollmentStatus || 'all'}
              onValueChange={(value) => handleFilterChange('enrollmentStatus', value as AdmissionStatus | 'all')}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('userManagement.allStatus') || 'All status'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('subjects.all') || 'All'}</SelectItem>
                {statusOrder.map((status) => (
                  <SelectItem key={status} value={status}>
                    {statusLabels[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('library.fromDate') || 'From date'}</Label>
            <CalendarDatePicker date={filters.fromDate || '' ? new Date(filters.fromDate || '') : undefined} onDateChange={(date) => handleFilterChange("fromDate", date ? date.toISOString().split("T")[0] : "")} />
          </div>
          <div className="space-y-2">
            <Label>{t('library.toDate') || 'To date'}</Label>
            <CalendarDatePicker date={filters.toDate || '' ? new Date(filters.toDate || '') : undefined} onDateChange={(date) => handleFilterChange("toDate", date ? date.toISOString().split("T")[0] : "")} />
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
      </FilterPanel>

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
          <AlertTitle>{t('events.error') || 'Error'}</AlertTitle>
          <AlertDescription>{(error as Error)?.message || t('events.unexpectedError') || 'Could not load report.'}</AlertDescription>
        </Alert>
      )}

      {/* Report Content */}
      {!isLoading && !isError && report && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label={t('admissions.totalAdmissions') || 'Total admissions'} value={report.totals.total} icon={BarChart3} tone="primary" />
            <SummaryCard label={t('events.active') || 'Active'} value={report.totals.active} icon={BarChart3} tone="success" />
            <SummaryCard label={t('admissions.pending') || 'Pending'} value={report.totals.pending} icon={BarChart3} tone="warning" />
            <SummaryCard label={t('admissions.boarder') || 'Boarders'} value={report.totals.boarders} icon={Building2} />
          </div>

          {/* Breakdown Tables - Compact Grid */}
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('admissions.statusBreakdown') || 'Status breakdown'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto -mx-4 sm:mx-0">
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('events.status') || 'Status'}</TableHead>
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
                <div className="rounded-md border overflow-x-auto -mx-4 sm:mx-0">
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('admissions.school') || 'School'}</TableHead>
                        <TableHead className="text-right hidden sm:table-cell">{t('events.active') || 'Active'}</TableHead>
                        <TableHead className="text-right hidden md:table-cell">{t('admissions.boarder') || 'Boarders'}</TableHead>
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
                            <TableCell className="font-medium min-w-0 break-words">{item.schoolName}</TableCell>
                            <TableCell className="text-right hidden sm:table-cell">{formatNumber(item.active)}</TableCell>
                            <TableCell className="text-right hidden md:table-cell">{formatNumber(item.boarders)}</TableCell>
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
                <div className="rounded-md border overflow-x-auto -mx-4 sm:mx-0">
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('admissions.academicYear') || 'Year'}</TableHead>
                        <TableHead className="text-right hidden sm:table-cell">{t('events.active') || 'Active'}</TableHead>
                        <TableHead className="text-right hidden md:table-cell">{t('admissions.boarder') || 'Boarders'}</TableHead>
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
                            <TableCell className="font-medium min-w-0 break-words">{item.academicYearName}</TableCell>
                            <TableCell className="text-right hidden sm:table-cell">{formatNumber(item.active)}</TableCell>
                            <TableCell className="text-right hidden md:table-cell">{formatNumber(item.boarders)}</TableCell>
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
                <div className="rounded-md border overflow-x-auto -mx-4 sm:mx-0">
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('admissions.residencyType') || 'Type'}</TableHead>
                        <TableHead className="text-right hidden sm:table-cell">{t('events.active') || 'Active'}</TableHead>
                        <TableHead className="text-right hidden md:table-cell">{t('admissions.boarder') || 'Boarders'}</TableHead>
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
                            <TableCell className="font-medium min-w-0 break-words">{item.residencyTypeName}</TableCell>
                            <TableCell className="text-right hidden sm:table-cell">{formatNumber(item.active)}</TableCell>
                            <TableCell className="text-right hidden md:table-cell">{formatNumber(item.boarders)}</TableCell>
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
                      ? `${t('library.showing') || 'Showing'} ${report.pagination.from} ${t('events.to') || 'to'} ${report.pagination.to} ${t('events.of') || 'of'} ${formatNumber(report.pagination.total)} ${t('pagination.entries') || 'entries'}`
                      : t('admissions.noDataFound') || 'No admissions found'}
                  </p>
                </div>
                {report.pagination.total > 0 && (
                  <Badge variant="outline">{formatNumber(report.pagination.total)} {t('admissions.records') || 'records'}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto -mx-4 sm:mx-0">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('events.name') || 'Student'}</TableHead>
                      <TableHead className="hidden md:table-cell">{t('admissions.schoolClass') || 'School / Class'}</TableHead>
                      <TableHead className="hidden lg:table-cell">{t('admissions.residency') || 'Residency'}</TableHead>
                      <TableHead className="hidden lg:table-cell">{t('admissions.guardian') || 'Guardian'}</TableHead>
                      <TableHead>{t('events.status') || 'Status'}</TableHead>
                      <TableHead className="hidden sm:table-cell">{t('studentReportCard.admissionDate') || 'Date'}</TableHead>
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
                            <div className="space-y-1 min-w-0">
                              <div className="font-semibold break-words">{admission.student?.fullName || t('events.notAvailable')}</div>
                              <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                                {admission.student?.admissionNumber && (
                                  <Badge variant="outline" className="text-xs">
                                    {t('examReports.admissionNo') || 'Adm'}: {admission.student.admissionNumber}
                                  </Badge>
                                )}
                                {admission.student?.cardNumber && (
                                  <Badge variant="secondary" className="text-xs">
                                    {t('attendanceReports.cardNumber') || 'Card'}: {admission.student.cardNumber}
                                  </Badge>
                                )}
                              </div>
                              {/* Show school/class on mobile since column is hidden */}
                              <div className="md:hidden text-xs text-muted-foreground mt-1">
                                {admission.school?.schoolName && <div>{admission.school.schoolName}</div>}
                                {admission.class?.name && (
                                  <div>
                                    {admission.class.name}
                                    {admission.classAcademicYear?.sectionName ? ` · ${admission.classAcademicYear.sectionName}` : ''}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="space-y-0.5 min-w-0">
                              <div className="font-medium break-words">{admission.school?.schoolName || '—'}</div>
                              <div className="text-sm text-muted-foreground">
                                {admission.class?.name || '—'}
                                {admission.classAcademicYear?.sectionName ? ` · ${admission.classAcademicYear.sectionName}` : ''}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
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
                          <TableCell className="hidden lg:table-cell">
                            <div className="space-y-0.5 min-w-0">
                              <div className="font-medium break-words">{admission.student?.guardianName || t('events.notAvailable')}</div>
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
                          <TableCell className="text-muted-foreground hidden sm:table-cell">
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
