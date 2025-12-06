import { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Download, Search, Filter, X, CheckCircle2, XCircle, Clock, AlertCircle, Heart, Calendar, FileText } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useProfile } from '@/hooks/useProfiles';
import { useSchools } from '@/hooks/useSchools';
import { useClasses } from '@/hooks/useClasses';
import { useStudents } from '@/hooks/useStudents';
import { attendanceSessionsApi } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { useDataTable } from '@/hooks/use-data-table';
import { LoadingSpinner } from '@/components/ui/loading';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import type { AttendanceRecord } from '@/types/domain/attendance';
import { mapAttendanceRecordApiToDomain } from '@/mappers/attendanceMapper';
import type * as AttendanceApi from '@/types/api/attendance';

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

const statusOptions = [
  { value: 'present', label: 'Present', icon: CheckCircle2, color: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-400' },
  { value: 'absent', label: 'Absent', icon: XCircle, color: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-400' },
  { value: 'late', label: 'Late', icon: Clock, color: 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-400' },
  { value: 'excused', label: 'Excused', icon: AlertCircle, color: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-400' },
  { value: 'sick', label: 'Sick', icon: Heart, color: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950 dark:text-purple-400' },
  { value: 'leave', label: 'Leave', icon: Calendar, color: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950 dark:text-orange-400' },
];

const StatusBadge = ({ status }: { status: string }) => {
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
  const { t } = useLanguage();
  const { data: profile } = useProfile();
  const { data: schools } = useSchools(profile?.organization_id);
  const { data: classes } = useClasses(profile?.organization_id);
  const { data: students } = useStudents(profile?.organization_id);

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
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  const handleExport = async () => {
    try {
      toast.info('Export feature coming soon');
    } catch (error: any) {
      toast.error(error.message || 'Failed to export');
    }
  };

  const columns: ColumnDef<AttendanceReportRecord>[] = [
    {
      accessorKey: 'studentName',
      header: 'Student',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.studentName}</div>
          <div className="text-xs text-muted-foreground">{row.original.admissionNo}</div>
        </div>
      ),
    },
    {
      accessorKey: 'cardNumber',
      header: 'Card #',
      cell: ({ row }) => <div className="text-sm">{row.original.cardNumber || '—'}</div>,
    },
    {
      accessorKey: 'className',
      header: 'Class',
      cell: ({ row }) => <div className="text-sm">{row.original.className}</div>,
    },
    {
      accessorKey: 'schoolName',
      header: 'School',
      cell: ({ row }) => <div className="text-sm">{row.original.schoolName || '—'}</div>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'sessionDate',
      header: 'Date',
      cell: ({ row }) => (
        <div className="text-sm">
          <div>{format(row.original.sessionDate, 'MMM dd, yyyy')}</div>
          <div className="text-xs text-muted-foreground">{format(row.original.markedAt, 'HH:mm')}</div>
        </div>
      ),
    },
    {
      accessorKey: 'entryMethod',
      header: 'Method',
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
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Attendance Reports</CardTitle>
              <CardDescription className="text-sm">View and analyze student attendance records</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <div className="flex items-center justify-between">
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="ml-2">
                      {Object.values(filters).filter(v => v && typeof v === 'string').length}
                    </Badge>
                  )}
                </Button>
              </CollapsibleTrigger>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              )}
            </div>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Student</label>
                  <Select value={filters.studentId || 'all'} onValueChange={(v) => handleFilterChange('studentId', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Students" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Students</SelectItem>
                      {(students || []).map(student => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.fullName} ({student.admissionNumber})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Class</label>
                  <Select value={filters.classId || 'all'} onValueChange={(v) => handleFilterChange('classId', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Classes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classes</SelectItem>
                      {(classes || []).map(cls => (
                        <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">School</label>
                  <Select value={filters.schoolId || 'all'} onValueChange={(v) => handleFilterChange('schoolId', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Schools" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Schools</SelectItem>
                      {(schools || []).map(school => (
                        <SelectItem key={school.id} value={school.id}>{school.schoolName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={filters.status || 'all'} onValueChange={(v) => handleFilterChange('status', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      {statusOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">From Date</label>
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">To Date</label>
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

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
                                  : header.column.columnDef.header}
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
                          No attendance records found
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
    </div>
  );
}

