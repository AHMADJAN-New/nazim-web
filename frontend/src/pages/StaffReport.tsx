import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { Eye, User, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { FilterPanel } from '@/components/layout/FilterPanel';
import { PageHeader } from '@/components/layout/PageHeader';
import { ReportExportButtons } from '@/components/reports/ReportExportButtons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useSchoolContext } from '@/contexts/SchoolContext';
import { useLanguage } from '@/hooks/useLanguage';
import { useProfile } from '@/hooks/useProfiles';
import { useSchools } from '@/hooks/useSchools';
import { useStaff, useStaffTypes } from '@/hooks/useStaff';
import type { Staff } from '@/types/domain/staff';
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useDataTable } from '@/hooks/use-data-table';
import { LoadingSpinner } from '@/components/ui/loading';
import { ScrollArea } from '@/components/ui/scroll-area';



const statusBadgeVariant = (status?: string) => {
  switch (status) {
    case 'active':
      return 'default';
    case 'inactive':
      return 'secondary';
    case 'on_leave':
      return 'outline';
    case 'terminated':
      return 'destructive';
    case 'suspended':
      return 'destructive';
    default:
      return 'outline';
  }
};

const formatStatus = (value?: string) => {
  if (!value) return '—';
  const words = value.replace(/_/g, ' ').split(' ');
  return words
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const formatDate = (date?: Date | string | null) => {
  if (!date) return '—';
  try {
    const parsed = typeof date === 'string' ? new Date(date) : date;
    if (Number.isNaN(parsed.getTime())) return '—';
    return format(parsed, 'yyyy-MM-dd');
  } catch {
    return '—';
  }
};

const buildLocation = (province?: string | null, district?: string | null, village?: string | null) => {
  const parts = [province, district, village].filter(Boolean);
  return parts.length ? parts.join(', ') : '—';
};

const StaffReport = () => {
  const { t, isRTL } = useLanguage();
  const { data: profile } = useProfile();
  const { selectedSchoolId } = useSchoolContext();
  const orgIdForQuery = profile?.organization_id;
  const { data: staffData, isLoading } = useStaff(orgIdForQuery, false);
  const { data: schools } = useSchools(orgIdForQuery);
  const { data: staffTypes } = useStaffTypes(orgIdForQuery);

  // Ensure staff is always an array of domain Staff type
  const staff: Staff[] = useMemo(() => {
    if (!staffData) return [];
    if (Array.isArray(staffData)) {
      return staffData as Staff[];
    }
    // If it's a paginated response, extract the data
    if (typeof staffData === 'object' && 'data' in staffData) {
      return ((staffData as any).data || []) as Staff[];
    }
    return [];
  }, [staffData]);

  const [statusFilter, setStatusFilter] = useState<'all' | string>('all');
  const [staffTypeFilter, setStaffTypeFilter] = useState<'all' | string>('all');
  const [schoolFilter, setSchoolFilter] = useState<'all' | string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const filteredStaff = useMemo((): Staff[] => {
    const list: Staff[] = staff || [];
    const query = searchQuery.toLowerCase();

    return list.filter((staffMember: Staff) => {
      if (statusFilter !== 'all' && staffMember.status !== statusFilter) return false;
      if (staffTypeFilter !== 'all' && staffMember.staffTypeId !== staffTypeFilter) return false;
      if (schoolFilter !== 'all' && staffMember.schoolId !== schoolFilter) return false;

      if (!query) return true;

      return (
        (staffMember.fullName || '').toLowerCase().includes(query) ||
        (staffMember.employeeId || '').toLowerCase().includes(query) ||
        (staffMember.staffCode || '').toLowerCase().includes(query) ||
        (staffMember.fatherName || '').toLowerCase().includes(query) ||
        (staffMember.phoneNumber || '').toLowerCase().includes(query) ||
        (staffMember.email || '').toLowerCase().includes(query)
      );
    });
  }, [staff, statusFilter, staffTypeFilter, schoolFilter, searchQuery]);

  // Pagination
  const paginatedStaff = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filteredStaff.slice(start, end);
  }, [filteredStaff, page, pageSize]);

  const totalPages = Math.ceil(filteredStaff.length / pageSize);

  const handleViewDetails = (staffMember: Staff) => {
    setSelectedStaff(staffMember);
    setIsSheetOpen(true);
  };

  // Transform filtered staff to report format
  const transformStaffData = (staff: Staff[]) => {
    return staff.map((member) => {
      const fullName = [member.firstName, member.fatherName, member.grandfatherName]
        .filter(Boolean)
        .join(' ');
      
      return {
        staff_code: member.staffCode || '—',
        employee_id: member.employeeId || '—',
        status: member.status || '—',
        full_name: fullName || '—',
        first_name: member.firstName || '—',
        father_name: member.fatherName || '—',
        grandfather_name: member.grandfatherName || '—',
        tazkira_number: member.tazkiraNumber || '—',
        birth_date: member.birthDate ? new Date(member.birthDate).toISOString().split('T')[0] : '—',
        birth_year: member.birthYear || '—',
        phone_number: member.phoneNumber || '—',
        email: member.email || '—',
        home_address: member.homeAddress || '—',
        staff_type: member.staffType?.name || member.staffType || '—',
        position: member.position || '—',
        duty: member.duty || '—',
        salary: member.salary || '—',
        teaching_section: member.teachingSection || '—',
        school: schools?.find(s => s.id === member.schoolId)?.schoolName || '—',
        organization: member.organization?.name || '—',
        origin_location: buildLocation(member.originProvince, member.originDistrict, member.originVillage),
        current_location: buildLocation(member.currentProvince, member.currentDistrict, member.currentVillage),
        religious_education: member.religiousEducation || '—',
        religious_institution: member.religiousUniversity || '—',
        religious_graduation_year: member.religiousGraduationYear || '—',
        religious_department: member.religiousDepartment || '—',
        modern_education: member.modernEducation || '—',
        modern_institution: member.modernSchoolUniversity || '—',
        modern_graduation_year: member.modernGraduationYear || '—',
        modern_department: member.modernDepartment || '—',
        notes: member.notes || '—',
      };
    });
  };

  // Build filters summary
  const buildFiltersSummary = () => {
    const filters: string[] = [];
    if (statusFilter !== 'all') {
      filters.push(`Status: ${statusFilter}`);
    }
    if (staffTypeFilter !== 'all') {
      const staffTypeName = staffTypes?.find(st => st.id === staffTypeFilter)?.name;
      if (staffTypeName) {
        filters.push(`Staff Type: ${staffTypeName}`);
      }
    }
    if (schoolFilter !== 'all') {
      const schoolName = schools?.find(s => s.id === schoolFilter)?.schoolName;
      if (schoolName) {
        filters.push(`School: ${schoolName}`);
      }
    }
    if (searchQuery) {
      filters.push(`Search: ${searchQuery}`);
    }
    return filters.join(' | ');
  };

  // Get current school for export
  const currentSchoolId = schoolFilter !== 'all' ? schoolFilter : selectedSchoolId || profile?.default_school_id;

  const columns: ColumnDef<Staff, any>[] = [
    {
      id: 'avatar',
      header: '',
      cell: ({ row }) => {
        const staffMember = row.original;
        return (
          <div className="flex items-center justify-center">
            {staffMember.pictureUrl ? (
              <img
                src={`/api/staff/${staffMember.id}/picture`}
                alt={staffMember.fullName}
                className="w-10 h-10 rounded-full object-cover border-2 border-border"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  if (target.nextElementSibling) {
                    (target.nextElementSibling as HTMLElement).style.display = 'flex';
                  }
                }}
              />
            ) : null}
            <div 
              className={`w-10 h-10 rounded-full bg-muted flex items-center justify-center border-2 border-border ${staffMember.pictureUrl ? 'hidden' : 'flex'}`}
            >
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'staffCode',
      header: t('staff.staffCode'),
      cell: ({ row }) => (
        <div className="font-mono text-sm font-medium">
          {row.original.staffCode || row.original.employeeId || '—'}
        </div>
      ),
    },
    {
      accessorKey: 'employeeId',
      header: t('staff.employeeId'),
      cell: ({ row }) => (
        <div className="font-medium">{row.original.employeeId || '—'}</div>
      ),
    },
    {
      accessorKey: 'fullName',
      header: t('staff.name'),
      cell: ({ row }) => (
        <div className="font-semibold">{row.original.fullName}</div>
      ),
    },
    {
      accessorKey: 'staffType',
      header: t('staff.staffType'),
      cell: ({ row }) => (
        <div className="text-sm">{row.original.staffTypeRelation?.name || row.original.staffType || '—'}</div>
      ),
    },
    {
      accessorKey: 'position',
      header: t('staff.position'),
      cell: ({ row }) => (
        <div className="text-sm">{row.original.position || '—'}</div>
      ),
    },
    {
      accessorKey: 'status',
      header: t('staff.status'),
      cell: ({ row }) => (
        <Badge variant={statusBadgeVariant(row.original.status)} className="capitalize">
          {formatStatus(row.original.status)}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: t('staff.actions'),
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleViewDetails(row.original)}
          className="h-8 w-8 p-0"
        >
          <Eye className="h-4 w-4" />
          <span className="sr-only">{t('staff.viewDetails')}</span>
        </Button>
      ),
    },
  ];

  const { table } = useDataTable<Staff>({
    data: paginatedStaff,
    columns,
    pageCount: totalPages,
    initialState: {
      pagination: {
        pageIndex: page - 1,
        pageSize,
      },
    },
    onPaginationChange: (newPagination) => {
      setPage(newPagination.pageIndex + 1);
      setPageSize(newPagination.pageSize);
    },
  });

  const paginationMeta = useMemo(() => ({
    current_page: page,
    per_page: pageSize,
    total: filteredStaff.length,
    last_page: totalPages,
    from: (page - 1) * pageSize + 1,
    to: Math.min(page * pageSize, filteredStaff.length),
  }), [page, pageSize, filteredStaff.length, totalPages]);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
      <PageHeader
        title={t('staff.staffRegistrationReport')}
        description={t('staff.staffRegistrationReportDescription')}
        icon={<User className="h-5 w-5" />}
        rightSlot={
          <ReportExportButtons
            data={filteredStaff}
            columns={[
              { key: 'staff_code', label: t('staff.staffCode') || 'Staff Code' },
              { key: 'employee_id', label: t('staff.employeeId') || 'Employee ID' },
              { key: 'status', label: t('staff.status') || 'Status' },
              { key: 'full_name', label: t('staff.fullName') || 'Full Name' },
              { key: 'first_name', label: t('staff.firstName') || 'First Name' },
              { key: 'father_name', label: t('staff.fatherName') || 'Father Name' },
              { key: 'grandfather_name', label: t('staff.grandfatherName') || 'Grandfather Name' },
              { key: 'tazkira_number', label: t('staff.tazkiraNumber') || 'Tazkira Number' },
              { key: 'birth_date', label: t('staff.birthDate') || 'Birth Date' },
              { key: 'birth_year', label: t('staff.birthYear') || 'Birth Year' },
              { key: 'phone_number', label: t('staff.phoneNumber') || 'Phone Number' },
              { key: 'email', label: t('staff.email') || 'Email' },
              { key: 'home_address', label: t('staff.homeAddress') || 'Home Address' },
              { key: 'staff_type', label: t('staff.staffType') || 'Staff Type' },
              { key: 'position', label: t('staff.position') || 'Position' },
              { key: 'duty', label: t('staff.duty') || 'Duty' },
              { key: 'salary', label: t('staff.salary') || 'Salary', type: 'numeric' },
              { key: 'teaching_section', label: t('staff.teachingSection') || 'Teaching Section' },
              { key: 'school', label: t('staff.school') || 'School' },
              { key: 'organization', label: t('staff.organization') || 'Organization' },
              { key: 'origin_location', label: t('staff.originLocation') || 'Origin Location' },
              { key: 'current_location', label: t('staff.currentLocation') || 'Current Location' },
              { key: 'religious_education', label: t('staff.religiousEducation') || 'Religious Education' },
              { key: 'religious_institution', label: t('staff.religiousInstitution') || 'Religious Institution' },
              { key: 'religious_graduation_year', label: t('staff.religiousGraduationYear') || 'Religious Graduation Year' },
              { key: 'religious_department', label: t('staff.religiousDepartment') || 'Religious Department' },
              { key: 'modern_education', label: t('staff.modernEducation') || 'Modern Education' },
              { key: 'modern_institution', label: t('staff.modernInstitution') || 'Modern Institution' },
              { key: 'modern_graduation_year', label: t('staff.modernGraduationYear') || 'Modern Graduation Year' },
              { key: 'modern_department', label: t('staff.modernDepartment') || 'Modern Department' },
              { key: 'notes', label: t('staff.notes') || 'Notes' },
            ]}
            reportKey="staff_list"
            title={t('staff.reportTitle') || 'Staff Report'}
            transformData={transformStaffData}
            buildFiltersSummary={buildFiltersSummary}
            schoolId={currentSchoolId}
            templateType="staff_list"
            disabled={filteredStaff.length === 0 || isLoading}
            errorNoSchool={t('staff.schoolRequiredForExport') || 'A school is required to export the report.'}
            errorNoData={t('staff.noDataToExport') || 'No data to export'}
            successPdf={t('staff.reportExportedAs') || 'PDF report generated successfully'}
            successExcel={t('staff.reportExportedAs') || 'Excel report generated successfully'}
            errorPdf={t('staff.failedToExport') || 'Failed to generate PDF report'}
            errorExcel={t('staff.failedToExport') || 'Failed to generate Excel report'}
          />
        }
      />

      <FilterPanel title={t('staff.filters')}>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('staff.searchByNamePlaceholder')}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="pl-10"
            />
          </div>
          <Select
            value={schoolFilter}
            onValueChange={(value) => {
              setSchoolFilter(value as typeof schoolFilter);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('staff.allSchools')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('staff.allSchools')}</SelectItem>
              {schools?.map((school) => (
                <SelectItem key={school.id} value={school.id}>
                  {school.schoolName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value as typeof statusFilter);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('staff.allStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('staff.allStatus')}</SelectItem>
              <SelectItem value="active">{t('staff.statusActive')}</SelectItem>
              <SelectItem value="inactive">{t('staff.statusInactive')}</SelectItem>
              <SelectItem value="on_leave">{t('staff.statusOnLeave')}</SelectItem>
              <SelectItem value="terminated">{t('staff.statusTerminated')}</SelectItem>
              <SelectItem value="suspended">{t('staff.statusSuspended')}</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={staffTypeFilter}
            onValueChange={(value) => {
              setStaffTypeFilter(value as typeof staffTypeFilter);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('staff.allStaffTypes')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('staff.allStaffTypes')}</SelectItem>
              {staffTypes?.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FilterPanel>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('staff.management')} ({filteredStaff.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 flex justify-center">
              <LoadingSpinner text={t('staff.loadingStaff')} />
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                          {headerGroup.headers.map((header) => {
                            const headerContent = header.isPlaceholder
                              ? null
                              : typeof header.column.columnDef.header === 'string'
                              ? header.column.columnDef.header
                              : typeof header.column.columnDef.header === 'function'
                              ? header.column.columnDef.header(header.getContext())
                              : header.column.columnDef.header;
                            return (
                              <TableHead key={header.id}>
                                {headerContent}
                              </TableHead>
                            );
                          })}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow
                          key={row.id}
                          data-state={row.getIsSelected() && 'selected'}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {typeof cell.column.columnDef.cell === 'function'
                                ? cell.column.columnDef.cell(cell.getContext())
                                : cell.getValue() as React.ReactNode}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length}
                          className="h-24 text-center"
                        >
                          {t('staff.noStaffFound')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <DataTablePagination
                table={table}
                paginationMeta={paginationMeta}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                showPageSizeSelector={true}
                showTotalCount={true}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent 
          className={`w-full sm:max-w-2xl overflow-y-auto ${isRTL ? 'rtl' : 'ltr'}`}
          side={isRTL ? 'left' : 'right'}
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          {selectedStaff && (
            <>
              <SheetHeader className="pb-4 border-b">
                <div className="flex items-start gap-4">
                  {/* Staff Image */}
                  <div className="relative">
                    {selectedStaff.pictureUrl ? (
                      <img
                        src={`/api/staff/${selectedStaff.id}/picture`}
                        alt={selectedStaff.fullName}
                        className="w-20 h-20 rounded-full object-cover border-2 border-border"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          if (target.nextElementSibling) {
                            (target.nextElementSibling as HTMLElement).style.display = 'flex';
                          }
                        }}
                      />
                    ) : null}
                    <div 
                      className={`w-20 h-20 rounded-full bg-muted flex items-center justify-center border-2 border-border ${selectedStaff.pictureUrl ? 'hidden' : 'flex'}`}
                    >
                      <User className="h-10 w-10 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <SheetTitle className="text-2xl mb-1">{selectedStaff.fullName}</SheetTitle>
                    <SheetDescription className="text-base">
                      {selectedStaff.staffCode && (
                        <span className="font-mono font-medium">{t('staff.code')}: {selectedStaff.staffCode}</span>
                      )}
                      {selectedStaff.staffCode && selectedStaff.employeeId && ' • '}
                      {selectedStaff.employeeId && `${t('staff.employeeId')}: ${selectedStaff.employeeId}`}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-12rem)] mt-6">
                <div className={`space-y-6 ${isRTL ? 'pl-4' : 'pr-4'}`}>
                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">{t('staff.personalInformation')}</h3>
                    <div className="space-y-3">
                      {selectedStaff.staffCode && (
                        <div className="flex items-center justify-between py-2 border-b">
                          <span className="text-sm font-medium text-muted-foreground">{t('staff.staffCode')}</span>
                          <span className="text-sm font-mono font-medium">{selectedStaff.staffCode}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">{t('staff.employeeId')}</span>
                        <span className="text-sm font-mono font-medium">{selectedStaff.employeeId || '—'}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">{t('staff.fullName')}</span>
                        <span className="text-sm font-medium">{selectedStaff.fullName}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">{t('staff.fatherName')}</span>
                        <span className="text-sm">{selectedStaff.fatherName || '—'}</span>
                      </div>
                      {selectedStaff.grandfatherName && (
                        <div className="flex items-center justify-between py-2 border-b">
                          <span className="text-sm font-medium text-muted-foreground">{t('staff.grandfatherName')}</span>
                          <span className="text-sm">{selectedStaff.grandfatherName}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">{t('staff.birthDate')}</span>
                        <span className="text-sm">{formatDate(selectedStaff.dateOfBirth ?? selectedStaff.birthDate)}</span>
                      </div>
                      {selectedStaff.birthYear && (
                        <div className="flex items-center justify-between py-2 border-b">
                          <span className="text-sm font-medium text-muted-foreground">{t('staff.birthYear')}</span>
                          <span className="text-sm">{selectedStaff.birthYear}</span>
                        </div>
                      )}
                      {selectedStaff.tazkiraNumber && (
                        <div className="flex items-center justify-between py-2 border-b">
                          <span className="text-sm font-medium text-muted-foreground">{t('staff.tazkiraNumber')}</span>
                          <span className="text-sm font-mono">{selectedStaff.tazkiraNumber}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">{t('staff.status')}</span>
                        <Badge variant={statusBadgeVariant(selectedStaff.status)} className="capitalize">
                          {formatStatus(selectedStaff.status)}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">{t('staff.contactInformation')}</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">{t('staff.phoneNumber')}</span>
                        <span className="text-sm">{selectedStaff.phoneNumber || '—'}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">{t('staff.email')}</span>
                        <span className="text-sm">{selectedStaff.email || '—'}</span>
                      </div>
                      <div className="flex items-start justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">{t('staff.homeAddress')}</span>
                        <span className="text-sm text-right max-w-[60%]">{selectedStaff.homeAddress || selectedStaff.address?.street || '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Location Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">{t('staff.locationInformation')}</h3>
                    <div className="space-y-3">
                      <div className="flex items-start justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">{t('staff.originLocation')}</span>
                        <span className="text-sm text-right max-w-[60%]">
                          {buildLocation(selectedStaff.originLocation?.province, selectedStaff.originLocation?.district, selectedStaff.originLocation?.village)}
                        </span>
                      </div>
                      <div className="flex items-start justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">{t('staff.currentLocation')}</span>
                        <span className="text-sm text-right max-w-[60%]">
                          {buildLocation(selectedStaff.currentLocation?.province, selectedStaff.currentLocation?.district, selectedStaff.currentLocation?.village)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Education Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">{t('staff.educationInformation')}</h3>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">{t('staff.religiousEducationSection')}</h4>
                        <div className="space-y-2 pl-4">
                          <div className="flex items-center justify-between py-1 border-b">
                            <span className="text-xs text-muted-foreground">{t('staff.educationLevel')}</span>
                            <span className="text-xs">{selectedStaff.religiousEducation?.level || '—'}</span>
                          </div>
                          <div className="flex items-center justify-between py-1 border-b">
                            <span className="text-xs text-muted-foreground">{t('staff.universityInstitution')}</span>
                            <span className="text-xs">{selectedStaff.religiousEducation?.institution || '—'}</span>
                          </div>
                          <div className="flex items-center justify-between py-1 border-b">
                            <span className="text-xs text-muted-foreground">{t('staff.graduationYear')}</span>
                            <span className="text-xs">{selectedStaff.religiousEducation?.graduationYear || '—'}</span>
                          </div>
                          <div className="flex items-center justify-between py-1 border-b">
                            <span className="text-xs text-muted-foreground">{t('staff.department')}</span>
                            <span className="text-xs">{selectedStaff.religiousEducation?.department || '—'}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-2">{t('staff.modernEducationSection')}</h4>
                        <div className="space-y-2 pl-4">
                          <div className="flex items-center justify-between py-1 border-b">
                            <span className="text-xs text-muted-foreground">{t('staff.educationLevel')}</span>
                            <span className="text-xs">{selectedStaff.modernEducation?.level || '—'}</span>
                          </div>
                          <div className="flex items-center justify-between py-1 border-b">
                            <span className="text-xs text-muted-foreground">{t('staff.universityInstitution')}</span>
                            <span className="text-xs">{selectedStaff.modernEducation?.institution || '—'}</span>
                          </div>
                          <div className="flex items-center justify-between py-1 border-b">
                            <span className="text-xs text-muted-foreground">{t('staff.graduationYear')}</span>
                            <span className="text-xs">{selectedStaff.modernEducation?.graduationYear || '—'}</span>
                          </div>
                          <div className="flex items-center justify-between py-1 border-b">
                            <span className="text-xs text-muted-foreground">{t('staff.department')}</span>
                            <span className="text-xs">{selectedStaff.modernEducation?.department || '—'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Professional Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">{t('staff.employmentInformation')}</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">{t('staff.staffType')}</span>
                        <span className="text-sm">{selectedStaff.staffTypeRelation?.name || selectedStaff.staffType || '—'}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">Position</span>
                        <span className="text-sm">{selectedStaff.position || '—'}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">{t('staff.duty')}</span>
                        <span className="text-sm">{selectedStaff.duty || '—'}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">{t('staff.salary')}</span>
                        <span className="text-sm">{selectedStaff.salary || '—'}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">{t('staff.school')}</span>
                        <span className="text-sm">{selectedStaff.school?.schoolName || '—'}</span>
                      </div>
                      {selectedStaff.teachingSection && (
                        <div className="flex items-center justify-between py-2 border-b">
                          <span className="text-sm font-medium text-muted-foreground">{t('staff.teachingSection')}</span>
                          <span className="text-sm">{selectedStaff.teachingSection}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Additional Information */}
                  {selectedStaff.notes && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">{t('staff.additionalInformation')}</h3>
                      <div className="space-y-3">
                        <div className="flex items-start justify-between py-2 border-b">
                          <span className="text-sm font-medium text-muted-foreground">{t('staff.notes')}</span>
                          <span className="text-sm text-right max-w-[60%]">{selectedStaff.notes}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default StaffReport;

