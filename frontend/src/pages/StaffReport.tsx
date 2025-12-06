import { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Eye, FileSpreadsheet, FileText, User } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useProfile } from '@/hooks/useProfiles';
import { useSchools } from '@/hooks/useSchools';
import { useStaff, useStaffTypes } from '@/hooks/useStaff';
import type { Staff } from '@/types/domain/staff';
import { staffApi } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { useDataTable } from '@/hooks/use-data-table';
import { LoadingSpinner } from '@/components/ui/loading';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Search } from 'lucide-react';

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

  const handleExport = async (format: 'csv' | 'pdf' | 'xlsx') => {
    const exportSchool = schoolFilter !== 'all' 
      ? schools?.find(s => s.id === schoolFilter) 
      : schools?.[0];

    if (!exportSchool) {
      toast.error('A school is required to export the report.');
      return;
    }

    try {
      const { blob, filename } = await staffApi.exportReport({
        format: format === 'xlsx' ? 'xlsx' : format,
        school_id: exportSchool.id,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        staff_type_id: staffTypeFilter !== 'all' ? staffTypeFilter : undefined,
        search: searchQuery || undefined,
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `staff-registration-report.${format === 'pdf' ? 'pdf' : format === 'xlsx' ? 'xlsx' : 'csv'}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error(error);
      }
      toast.error('Failed to export the report. Please try again.');
    }
  };

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
      header: 'Staff Code',
      cell: ({ row }) => (
        <div className="font-mono text-sm font-medium">
          {row.original.staffCode || row.original.employeeId || '—'}
        </div>
      ),
    },
    {
      accessorKey: 'employeeId',
      header: 'Employee ID',
      cell: ({ row }) => (
        <div className="font-medium">{row.original.employeeId || '—'}</div>
      ),
    },
    {
      accessorKey: 'fullName',
      header: 'Name',
      cell: ({ row }) => (
        <div className="font-semibold">{row.original.fullName}</div>
      ),
    },
    {
      accessorKey: 'staffType',
      header: 'Staff Type',
      cell: ({ row }) => (
        <div className="text-sm">{row.original.staffTypeRelation?.name || row.original.staffType || '—'}</div>
      ),
    },
    {
      accessorKey: 'position',
      header: 'Position',
      cell: ({ row }) => (
        <div className="text-sm">{row.original.position || '—'}</div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={statusBadgeVariant(row.original.status)} className="capitalize">
          {formatStatus(row.original.status)}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleViewDetails(row.original)}
          className="h-8 w-8 p-0"
        >
          <Eye className="h-4 w-4" />
          <span className="sr-only">View details</span>
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
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold leading-tight">Staff Registration Report</h1>
          <p className="text-muted-foreground">
            View and export staff registration data with detailed information
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => handleExport('csv')}
            disabled={filteredStaff.length === 0}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExport('xlsx')}
            disabled={filteredStaff.length === 0}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Button
            variant="default"
            onClick={() => handleExport('pdf')}
            disabled={filteredStaff.length === 0}
          >
            <FileText className="mr-2 h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, employee ID, staff code..."
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
                <SelectValue placeholder="All Schools" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Schools</SelectItem>
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
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="on_leave">On Leave</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
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
                <SelectValue placeholder="All Staff Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Staff Types</SelectItem>
                {staffTypes?.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Staff ({filteredStaff.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 flex justify-center">
              <LoadingSpinner text="Loading staff..." />
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
                          No staff found.
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
                        <span className="font-mono font-medium">Code: {selectedStaff.staffCode}</span>
                      )}
                      {selectedStaff.staffCode && selectedStaff.employeeId && ' • '}
                      {selectedStaff.employeeId && `Employee ID: ${selectedStaff.employeeId}`}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-12rem)] mt-6">
                <div className={`space-y-6 ${isRTL ? 'pl-4' : 'pr-4'}`}>
                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Personal Information</h3>
                    <div className="space-y-3">
                      {selectedStaff.staffCode && (
                        <div className="flex items-center justify-between py-2 border-b">
                          <span className="text-sm font-medium text-muted-foreground">Staff Code</span>
                          <span className="text-sm font-mono font-medium">{selectedStaff.staffCode}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">Employee ID</span>
                        <span className="text-sm font-mono font-medium">{selectedStaff.employeeId || '—'}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">Full Name</span>
                        <span className="text-sm font-medium">{selectedStaff.fullName}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">Father Name</span>
                        <span className="text-sm">{selectedStaff.fatherName || '—'}</span>
                      </div>
                      {selectedStaff.grandfatherName && (
                        <div className="flex items-center justify-between py-2 border-b">
                          <span className="text-sm font-medium text-muted-foreground">Grandfather Name</span>
                          <span className="text-sm">{selectedStaff.grandfatherName}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">Birth Date</span>
                        <span className="text-sm">{formatDate(selectedStaff.dateOfBirth ?? selectedStaff.birthDate)}</span>
                      </div>
                      {selectedStaff.birthYear && (
                        <div className="flex items-center justify-between py-2 border-b">
                          <span className="text-sm font-medium text-muted-foreground">Birth Year</span>
                          <span className="text-sm">{selectedStaff.birthYear}</span>
                        </div>
                      )}
                      {selectedStaff.tazkiraNumber && (
                        <div className="flex items-center justify-between py-2 border-b">
                          <span className="text-sm font-medium text-muted-foreground">Tazkira Number</span>
                          <span className="text-sm font-mono">{selectedStaff.tazkiraNumber}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">Status</span>
                        <Badge variant={statusBadgeVariant(selectedStaff.status)} className="capitalize">
                          {formatStatus(selectedStaff.status)}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Contact Information</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">Phone Number</span>
                        <span className="text-sm">{selectedStaff.phoneNumber || '—'}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">Email</span>
                        <span className="text-sm">{selectedStaff.email || '—'}</span>
                      </div>
                      <div className="flex items-start justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">Home Address</span>
                        <span className="text-sm text-right max-w-[60%]">{selectedStaff.homeAddress || selectedStaff.address?.street || '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Location Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Location Information</h3>
                    <div className="space-y-3">
                      <div className="flex items-start justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">Origin Location</span>
                        <span className="text-sm text-right max-w-[60%]">
                          {buildLocation(selectedStaff.originLocation?.province, selectedStaff.originLocation?.district, selectedStaff.originLocation?.village)}
                        </span>
                      </div>
                      <div className="flex items-start justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">Current Location</span>
                        <span className="text-sm text-right max-w-[60%]">
                          {buildLocation(selectedStaff.currentLocation?.province, selectedStaff.currentLocation?.district, selectedStaff.currentLocation?.village)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Education Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Education Information</h3>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Religious Education</h4>
                        <div className="space-y-2 pl-4">
                          <div className="flex items-center justify-between py-1 border-b">
                            <span className="text-xs text-muted-foreground">Level</span>
                            <span className="text-xs">{selectedStaff.religiousEducation?.level || '—'}</span>
                          </div>
                          <div className="flex items-center justify-between py-1 border-b">
                            <span className="text-xs text-muted-foreground">Institution</span>
                            <span className="text-xs">{selectedStaff.religiousEducation?.institution || '—'}</span>
                          </div>
                          <div className="flex items-center justify-between py-1 border-b">
                            <span className="text-xs text-muted-foreground">Graduation Year</span>
                            <span className="text-xs">{selectedStaff.religiousEducation?.graduationYear || '—'}</span>
                          </div>
                          <div className="flex items-center justify-between py-1 border-b">
                            <span className="text-xs text-muted-foreground">Department</span>
                            <span className="text-xs">{selectedStaff.religiousEducation?.department || '—'}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-2">Modern Education</h4>
                        <div className="space-y-2 pl-4">
                          <div className="flex items-center justify-between py-1 border-b">
                            <span className="text-xs text-muted-foreground">Level</span>
                            <span className="text-xs">{selectedStaff.modernEducation?.level || '—'}</span>
                          </div>
                          <div className="flex items-center justify-between py-1 border-b">
                            <span className="text-xs text-muted-foreground">Institution</span>
                            <span className="text-xs">{selectedStaff.modernEducation?.institution || '—'}</span>
                          </div>
                          <div className="flex items-center justify-between py-1 border-b">
                            <span className="text-xs text-muted-foreground">Graduation Year</span>
                            <span className="text-xs">{selectedStaff.modernEducation?.graduationYear || '—'}</span>
                          </div>
                          <div className="flex items-center justify-between py-1 border-b">
                            <span className="text-xs text-muted-foreground">Department</span>
                            <span className="text-xs">{selectedStaff.modernEducation?.department || '—'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Professional Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Professional Information</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">Staff Type</span>
                        <span className="text-sm">{selectedStaff.staffTypeRelation?.name || selectedStaff.staffType || '—'}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">Position</span>
                        <span className="text-sm">{selectedStaff.position || '—'}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">Duty</span>
                        <span className="text-sm">{selectedStaff.duty || '—'}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">Salary</span>
                        <span className="text-sm">{selectedStaff.salary || '—'}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">School</span>
                        <span className="text-sm">{selectedStaff.school?.schoolName || '—'}</span>
                      </div>
                      {selectedStaff.teachingSection && (
                        <div className="flex items-center justify-between py-2 border-b">
                          <span className="text-sm font-medium text-muted-foreground">Teaching Section</span>
                          <span className="text-sm">{selectedStaff.teachingSection}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Additional Information */}
                  {selectedStaff.notes && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Additional Information</h3>
                      <div className="space-y-3">
                        <div className="flex items-start justify-between py-2 border-b">
                          <span className="text-sm font-medium text-muted-foreground">Notes</span>
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

