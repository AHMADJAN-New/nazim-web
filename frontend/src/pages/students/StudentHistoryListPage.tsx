import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { 
  History, 
  Eye, 
  Search
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PictureCell } from '@/components/shared/PictureCell';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { LoadingSpinner } from '@/components/ui/loading';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { useLanguage } from '@/hooks/useLanguage';
import { useStudents } from '@/hooks/useStudents';
import { useProfile } from '@/hooks/useProfiles';
import { useDataTable } from '@/hooks/use-data-table';
import type { Student } from '@/types/domain/student';
import { formatDate } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

export default function StudentHistoryListPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { data: profile } = useProfile();
  const orgIdForQuery = profile?.organization_id;

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | Student['status']>('all');

  const { 
    data: students, 
    isLoading, 
    error,
    pagination,
    page,
    pageSize,
    setPage,
    setPageSize,
  } = useStudents(orgIdForQuery, true);

  // Client-side filtering for search and status
  const filteredStudents = useMemo(() => {
    const list = students || [];
    const searchLower = (searchQuery || '').toLowerCase().trim();
    
    return list
      .filter((student) => {
        // Apply status filter
        if (statusFilter !== 'all' && student.status !== statusFilter) return false;
        
        // Apply search filter
        if (searchLower) {
          const matchesName = student.fullName?.toLowerCase().includes(searchLower);
          const matchesAdmission = student.admissionNumber?.toLowerCase().includes(searchLower);
          const matchesFather = student.fatherName?.toLowerCase().includes(searchLower);
          const matchesClass = student.currentClass?.name?.toLowerCase().includes(searchLower);
          
          if (!matchesName && !matchesAdmission && !matchesFather && !matchesClass) {
            return false;
          }
        }
        
        return true;
      });
  }, [students, searchQuery, statusFilter]);

  const statusBadgeVariant = (status: Student['status']): 'success' | 'info' | 'warning' | 'outline' | 'destructive' | 'secondary' => {
    switch (status) {
      case 'active':
        return 'success';
      case 'admitted':
        return 'info';
      case 'applied':
        return 'warning';
      case 'withdrawn':
        return 'destructive';
      case 'inactive':
        return 'warning';
      case 'graduated':
        return 'success';
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status: Student['status']) => {
    switch (status) {
      case 'active': return t('events.active') ?? 'Active';
      case 'admitted': return t('students.admitted') ?? 'Admitted';
      case 'applied': return t('students.applied') ?? 'Applied';
      case 'withdrawn': return t('students.withdrawn') ?? 'Withdrawn';
      case 'inactive': return t('events.inactive') ?? 'Inactive';
      case 'graduated': return t('students.graduated') ?? 'Graduated';
      default: return status ?? '—';
    }
  };

  // Define columns for the table
  const columns: ColumnDef<Student>[] = [
    {
      accessorKey: 'picturePath',
      header: '',
      cell: ({ row }) => (
        <PictureCell
          type="student"
          entityId={row.original.id}
          picturePath={row.original.picturePath}
          alt={row.original.fullName}
          size="sm"
        />
      ),
    },
    {
      accessorKey: 'fullName',
      header: t('students.fullName') || 'Full Name',
      cell: ({ row }) => (
        <div className="font-medium">{row.original.fullName}</div>
      ),
    },
    {
      accessorKey: 'admissionNumber',
      header: t('students.admissionNumber') || 'Admission #',
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground">{row.original.admissionNumber}</div>
      ),
    },
    {
      accessorKey: 'currentClass',
      header: t('students.class') || 'Class',
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.currentClass?.name || '-'}
          {row.original.currentClass?.section && ` (${row.original.currentClass.section})`}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: t('students.statusOptions.label') ?? t('students.status') ?? 'Status',
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <Badge variant={statusBadgeVariant(status)} className="shrink-0">
            {getStatusLabel(status)}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'dateOfBirth',
      header: t('students.dateOfBirth') || 'Date of Birth',
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.dateOfBirth ? formatDate(row.original.dateOfBirth) : '-'}
        </div>
      ),
    },
    {
      id: 'actions',
      header: t('common.actions') || 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center justify-end">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent row click
                    navigate(`/students/${row.original.id}/history`);
                  }}
                  className="h-8 w-8 p-0"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{t('students.viewHistory') || 'View History'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ),
    },
  ];

  // Use DataTable hook for pagination
  const { table } = useDataTable({
    data: filteredStudents,
    columns,
    pageCount: pagination?.last_page,
    paginationMeta: pagination ?? null,
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

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {error.message || t('common.errorLoading') || 'Failed to load students'}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      {/* Page Header */}
      <PageHeader
        title={t('studentHistory.lifetimeHistory') || 'Student Lifetime History'}
        description={t('studentHistory.description') || 'View and manage student lifetime history records'}
        icon={<History className="h-5 w-5" />}
      />

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t('common.searchAndFilters') || 'Search & Filters'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('students.searchPlaceholder') || 'Search by name, admission number...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | Student['status'])}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="all">{t('common.allStatuses') || 'All Statuses'}</option>
                <option value="active">{t('students.statusOptions.active') ?? 'Active'}</option>
                <option value="inactive">{t('students.statusOptions.inactive') ?? 'Inactive'}</option>
                <option value="graduated">{t('students.statusOptions.graduated') ?? 'Graduated'}</option>
                <option value="withdrawn">{t('students.statusOptions.withdrawn') ?? 'Withdrawn'}</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t('students.title') || 'Students'} 
            {pagination && ` (${pagination.total} ${t('common.total') || 'total'})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : typeof header.column.columnDef.header === 'string'
                          ? header.column.columnDef.header
                          : header.column.columnDef.header}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && 'selected'}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/students/${row.original.id}/history`)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {typeof cell.column.columnDef.cell === 'function'
                            ? cell.column.columnDef.cell({ row, getValue: () => cell.getValue() })
                            : cell.getValue() as React.ReactNode}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      {t('common.noResults') || 'No results.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {pagination && (
            <div className="mt-4">
              <DataTablePagination table={table} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

