import { ColumnDef } from '@tanstack/react-table';
import { Plus, UserCheck, MapPin, Shield, ClipboardList, Pencil, Trash2, Search, DollarSign, X, MoreVertical } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PictureCell } from '@/components/shared/PictureCell';

import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { FilterPanel } from '@/components/layout/FilterPanel';
import { PageHeader } from '@/components/layout/PageHeader';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/hooks/useLanguage';
import { useProfile } from '@/hooks/useProfiles';
import { useSchools } from '@/hooks/useSchools';
import { useStudents } from '@/hooks/useStudents';
import { useResidencyTypes } from '@/hooks/useResidencyTypes';
import { useRooms } from '@/hooks/useRooms';
import {
  useAdmissionStats,
  useDeleteStudentAdmission,
  useStudentAdmissions,
  useBulkDeactivateAdmissions,
  type StudentAdmission,
  type AdmissionStatus,
} from '@/hooks/useStudentAdmissions';
import { useResourceUsage } from '@/hooks/useSubscription';
import { showToast } from '@/lib/toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSpinner } from '@/components/ui/loading';
import { useDataTable } from '@/hooks/use-data-table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AdmissionFormDialog } from '@/components/admissions/AdmissionFormDialog';
import { AdmissionDetailsPanel } from '@/components/admissions/AdmissionDetailsPanel';

const statusVariant = (status: AdmissionStatus) => {
  switch (status) {
    case 'active':
      return 'default';
    case 'admitted':
    case 'pending':
      return 'secondary';
    case 'inactive':
    case 'suspended':
      return 'outline';
    case 'withdrawn':
      return 'destructive';
    case 'graduated':
      return 'default';
    default:
      return 'secondary';
  }
};

export function StudentAdmissions() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const orgIdForQuery = profile?.organization_id;

  const { 
    admissions, 
    isLoading, 
    error: admissionsError,
    pagination,
    page,
    pageSize,
    setPage,
    setPageSize,
  } = useStudentAdmissions(orgIdForQuery, true);
  
  // Debug logging
  useEffect(() => {
    if (admissions) {
      console.log('[StudentAdmissions] Admissions data:', admissions.length, 'records');
      console.log('[StudentAdmissions] Sample admission:', admissions[0]);
    }
    if (admissionsError) {
      console.error('[StudentAdmissions] Error:', admissionsError);
    }
  }, [admissions, admissionsError]);
  const { stats } = useAdmissionStats(orgIdForQuery);
  const { data: students } = useStudents(orgIdForQuery);
  const { data: schools } = useSchools(orgIdForQuery);
  const { data: residencyTypes } = useResidencyTypes(orgIdForQuery);
  const { data: rooms } = useRooms(undefined, orgIdForQuery);

  const deleteAdmission = useDeleteStudentAdmission();
  const bulkDeactivate = useBulkDeactivateAdmissions();
  
  // Check subscription limits for students
  const studentUsage = useResourceUsage('students');
  const isLimitReached = !studentUsage.isUnlimited && studentUsage.remaining === 0;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState<StudentAdmission | null>(null);
  const [admissionToDelete, setAdmissionToDelete] = useState<StudentAdmission | null>(null);
  const [selectedAdmissionIds, setSelectedAdmissionIds] = useState<Set<string>>(new Set());
  const [isBulkDeactivateDialogOpen, setIsBulkDeactivateDialogOpen] = useState(false);
  const [schoolFilter, setSchoolFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | AdmissionStatus>('all');
  const [residencyFilter, setResidencyFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Client-side filtering for search
  const filteredAdmissions = useMemo(() => {
    const list = admissions || [];
    const searchLower = (searchQuery || '').toLowerCase().trim();
    
    return list
      .filter((admission) => {
        // Apply filters
        if (schoolFilter !== 'all' && admission.schoolId !== schoolFilter) return false;
        if (statusFilter !== 'all' && admission.enrollmentStatus !== statusFilter) return false;
        if (residencyFilter !== 'all' && admission.residencyTypeId !== residencyFilter) return false;
        
        // Apply search query
        if (searchLower) {
          const matchesStudentName = admission.student?.fullName?.toLowerCase().includes(searchLower);
          const matchesAdmissionNo = admission.student?.admissionNumber?.toLowerCase().includes(searchLower);
          const matchesAdmissionYear = admission.admissionYear?.toLowerCase().includes(searchLower);
          const matchesClass = admission.class?.name?.toLowerCase().includes(searchLower);
          const matchesSection = admission.classAcademicYear?.sectionName?.toLowerCase().includes(searchLower);
          
          if (!matchesStudentName && !matchesAdmissionNo && !matchesAdmissionYear && !matchesClass && !matchesSection) {
            return false;
          }
        }
        
        return true;
      })
      .sort((a, b) => {
        // Sort by student name
        const nameA = a.student?.fullName || '';
        const nameB = b.student?.fullName || '';
        return nameA.localeCompare(nameB);
      });
  }, [admissions, schoolFilter, statusFilter, residencyFilter, searchQuery]);

  // Component for displaying student picture in admission table cell
  // Uses centralized PictureCell component with image caching
  const AdmissionPictureCell = ({ admission }: { admission: StudentAdmission }) => {
    const student = admission.student;
    return (
      <PictureCell
        type="student"
        entityId={student?.id}
        picturePath={student?.picturePath}
        alt={student?.fullName || 'Student'}
        size="md"
      />
    );
  };

  // Define columns for DataTable
  const columns: ColumnDef<StudentAdmission>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => {
            table.toggleAllPageRowsSelected(!!value);
            if (value) {
              const allIds = new Set(filteredAdmissions.map((adm) => adm.id));
              setSelectedAdmissionIds(allIds);
            } else {
              setSelectedAdmissionIds(new Set());
            }
          }}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedAdmissionIds.has(row.original.id)}
          onCheckedChange={(checked) => {
            const newSet = new Set(selectedAdmissionIds);
            if (checked) {
              newSet.add(row.original.id);
            } else {
              newSet.delete(row.original.id);
            }
            setSelectedAdmissionIds(newSet);
            row.toggleSelected(!!checked);
          }}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: 'picture',
      header: t('students.picture') || 'Picture',
      cell: ({ row }) => <AdmissionPictureCell admission={row.original} />,
      meta: {
        className: 'w-[60px]',
      },
    },
    {
      accessorKey: 'studentCode',
      header: 'ID',
      cell: ({ row }) => {
        const admission = row.original;
        return (
          <div className="font-mono text-sm font-medium">
            {admission.student?.studentCode || admission.student?.admissionNumber || '—'}
          </div>
        );
      },
      meta: {
        className: 'hidden sm:table-cell',
      },
    },
    {
      accessorKey: 'student',
      header: t('admissions.student') || 'Student',
      cell: ({ row }) => {
        const admission = row.original;
        return (
          <div className="space-y-1 min-w-0 sm:min-w-[200px]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold break-words min-w-0">{admission.student?.fullName || t('hostel.unassigned')}</span>
              {admission.enrollmentStatus && (
                <Badge variant={statusVariant(admission.enrollmentStatus)} className="shrink-0 text-xs">
                  {admission.enrollmentStatus === 'pending' ? t('admissions.pending') :
                   admission.enrollmentStatus === 'admitted' ? t('admissions.admitted') :
                   admission.enrollmentStatus === 'active' ? t('events.active') :
                   admission.enrollmentStatus === 'inactive' ? t('events.inactive') :
                   admission.enrollmentStatus === 'suspended' ? t('students.suspended') :
                   admission.enrollmentStatus === 'withdrawn' ? t('admissions.withdrawn') :
                   admission.enrollmentStatus === 'graduated' ? t('students.graduated') :
                   admission.enrollmentStatus}
                </Badge>
              )}
              {admission.isBoarder && (
                <Badge variant="secondary" className="shrink-0 text-xs">
                  {t('admissions.boarder') || 'Boarder'}
                </Badge>
              )}
            </div>
            {admission.student?.admissionNumber && (
              <div className="text-xs text-muted-foreground">
                {t('admissions.admissionNumber') || 'Admission #'}: {admission.student.admissionNumber}
              </div>
            )}
            {/* Show ID on mobile since ID column is hidden */}
            <div className="text-xs text-muted-foreground sm:hidden font-mono">
              ID: {admission.student?.studentCode || admission.student?.admissionNumber || '—'}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'school',
      header: t('admissions.school') || 'School',
      cell: ({ row }) => {
        const school = schools?.find((s) => s.id === row.original.schoolId);
        return school?.schoolName || '—';
      },
      meta: {
        className: 'hidden md:table-cell',
      },
    },
    {
      accessorKey: 'class',
      header: t('search.class') || 'Class / Shift',
      cell: ({ row }) => {
        const admission = row.original;
        const classInfo = admission.classAcademicYear;
        if (classInfo) {
          return (
            <div className="space-y-1 min-w-0 sm:min-w-[150px]">
              <div className="font-medium break-words">{admission.class?.name || t('events.unknown')}</div>
              {classInfo.sectionName && (
                <Badge variant="outline" className="text-xs shrink-0">
                  {classInfo.sectionName}
                </Badge>
              )}
              {admission.shift && (
                <div className="text-xs text-muted-foreground">{admission.shift}</div>
              )}
            </div>
          );
        }
        return '—';
      },
    },
    {
      accessorKey: 'residency',
      header: t('admissions.residency') || 'Residency',
      cell: ({ row }) => {
        const type = residencyTypes?.find((t) => t.id === row.original.residencyTypeId);
        return type ? type.name : '—';
      },
      meta: {
        className: 'hidden lg:table-cell',
      },
    },
    {
      accessorKey: 'room',
      header: t('admissions.room') || 'Room',
      cell: ({ row }) => {
        const room = rooms?.find((r) => r.id === row.original.roomId);
        return room ? room.roomNumber : '—';
      },
      meta: {
        className: 'hidden lg:table-cell',
      },
    },
    {
      accessorKey: 'status',
      header: t('events.status') || 'Status',
      cell: ({ row }) => {
        const status = row.original.enrollmentStatus;
        return status ? (
          <Badge variant={statusVariant(status)}>
            {status === 'pending' ? t('admissions.pending') :
             status === 'admitted' ? t('admissions.admitted') :
             status === 'active' ? t('events.active') :
             status === 'inactive' ? t('events.inactive') :
             status === 'suspended' ? t('students.suspended') :
             status === 'withdrawn' ? t('admissions.withdrawn') :
             status === 'graduated' ? t('students.graduated') :
             status}
          </Badge>
        ) : '—';
      },
    },
    {
      id: 'actions',
      header: () => <div className="text-right">{t('events.actions') || 'Actions'}</div>,
      cell: ({ row }) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">{t('events.actions') || 'Actions'}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {row.original.studentId && (
                <>
                  <DropdownMenuItem
                    onClick={() => navigate(`/students/${row.original.studentId}/fees`)}
                  >
                    <DollarSign className="h-4 w-4 mr-2 text-green-600 dark:text-green-400" />
                    {t('fees.studentFeeAssignments') || 'Fee Assignments'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem
                onClick={() => handleEdit(row.original)}
              >
                <Pencil className="h-4 w-4 mr-2" />
                {t('events.edit') || 'Edit'}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDelete(row.original)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('events.delete') || 'Delete'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
      meta: {
        className: 'text-right w-[60px]',
      },
    },
  ];

  // Use DataTable hook for pagination integration
  const { table } = useDataTable({
    data: filteredAdmissions,
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

  const handleRowClick = (admission: StudentAdmission) => {
    setSelectedAdmission(admission);
    setIsPanelOpen(true);
  };

  const handleEdit = (admission: StudentAdmission) => {
    setSelectedAdmission(admission);
    setIsDialogOpen(true);
  };

  const handleDelete = (admission: StudentAdmission) => {
    setAdmissionToDelete(admission);
  };

  const confirmDelete = () => {
    if (admissionToDelete) {
      deleteAdmission.mutate(admissionToDelete.id, {
        onSuccess: () => setAdmissionToDelete(null),
      });
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedAdmissionIds.size === 0) return;
    
    const admissionIds = Array.from(selectedAdmissionIds);
    await bulkDeactivate.mutateAsync(admissionIds, {
      onSuccess: () => {
        setSelectedAdmissionIds(new Set());
        setIsBulkDeactivateDialogOpen(false);
      },
    });
  };

  const selectedCount = selectedAdmissionIds.size;
  const canBulkDeactivate = selectedCount > 0 && filteredAdmissions.some(
    (adm) => selectedAdmissionIds.has(adm.id) && adm.enrollmentStatus === 'active'
  );

  const handleOpenCreateDialog = () => {
    if (isLimitReached) {
      showToast.error(
        t('admissions.limitReached') || 
        `Student limit reached (${studentUsage.current}/${studentUsage.limit}). Please disable an old admission record first or upgrade your plan.`
      );
      return;
    }

    setSelectedAdmission(null);
    setIsDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 max-w-7xl w-full overflow-x-hidden min-w-0">
      <PageHeader
        title={t('nav.admissions') || 'Student Admissions'}
        description={t('admissions.listDescription') || 'Overview of class placements and residency tracking.'}
        primaryAction={{
          label: t('events.add') || 'Admit Student',
          onClick: handleOpenCreateDialog,
          icon: <Plus className="h-4 w-4" />,
          disabled: isLimitReached,
        }}
        secondaryActions={
          canBulkDeactivate
            ? [
                {
                  label: t('admissions.bulkDeactivate') || `Deactivate (${selectedCount})`,
                  onClick: () => setIsBulkDeactivateDialogOpen(true),
                  icon: <X className="h-4 w-4" />,
                  variant: 'outline',
                  disabled: bulkDeactivate.isPending,
                },
              ]
            : []
        }
      />

      <AdmissionFormDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setSelectedAdmission(null);
          }
        }}
        admission={selectedAdmission}
        admissions={admissions || []}
      />

      <AdmissionDetailsPanel
        open={isPanelOpen}
        onOpenChange={setIsPanelOpen}
        admission={selectedAdmission}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title={t('admissions.totalAdmissionsLabel')}
          value={stats.total}
          icon={UserCheck}
          description={t('admissions.acrossAllResidencyTypes')}
          color="blue"
        />
        <StatsCard
          title={t('admissions.activeStudents')}
          value={stats.active}
          icon={Shield}
          description={t('admissions.currentlyStudying')}
          color="green"
        />
        <StatsCard
          title={t('admissions.pendingAdmitted')}
          value={stats.pending}
          icon={ClipboardList}
          description={t('admissions.awaitingActivation')}
          color="amber"
        />
        <StatsCard
          title={t('hostel.boardersLabel')}
          value={stats.boarders}
          icon={MapPin}
          description={t('admissions.studentsWithAccommodation')}
          color="purple"
        />
      </div>

      <FilterPanel title={t('admissions.filtersTitle')}>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('events.search') || 'Search by student name, admission number, class...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={schoolFilter} onValueChange={setSchoolFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder={t('admissions.school') || 'School'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('leave.allSchools') || 'All Schools'}</SelectItem>
              {schools?.map((school) => (
                <SelectItem key={school.id} value={school.id}>
                  {school.school_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as AdmissionStatus | 'all')}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder={t('events.status') || 'Status'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('userManagement.allStatus') || 'All Status'}</SelectItem>
              <SelectItem value="pending">{t('admissions.pending') || 'Pending'}</SelectItem>
              <SelectItem value="admitted">{t('admissions.admitted') || 'Admitted'}</SelectItem>
              <SelectItem value="active">{t('events.active') || 'Active'}</SelectItem>
              <SelectItem value="inactive">{t('events.inactive') || 'Inactive'}</SelectItem>
              <SelectItem value="suspended">{t('students.suspended') || 'Suspended'}</SelectItem>
              <SelectItem value="withdrawn">{t('admissions.withdrawn') || 'Withdrawn'}</SelectItem>
              <SelectItem value="graduated">{t('students.graduated') || 'Graduated'}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={residencyFilter} onValueChange={(value) => setResidencyFilter(value)}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder={t('admissions.residency') || 'Residency'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admissions.allResidency') || 'All Residency'}</SelectItem>
              {residencyTypes?.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FilterPanel>

      <Card>
        <CardHeader>
          <CardTitle>{t('admissions.list') || 'Admissions'}</CardTitle>
          <CardDescription>{t('admissions.listDescription') || 'Overview of class placements and residency tracking.'}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : admissionsError ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-2">
              <p className="text-destructive font-medium">Error loading admissions</p>
              <p className="text-sm text-muted-foreground">
                {admissionsError instanceof Error ? admissionsError.message : t('events.unexpectedError')}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Please ensure the migration <code className="bg-muted px-1 rounded">20250205000034_fix_student_admissions_rls_policies.sql</code> has been applied.
              </p>
            </div>
          ) : (
            <div className="space-y-4 overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <div className="border rounded-lg overflow-x-auto -mx-4 sm:mx-0">
                <Table className="w-full">
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => {
                          const columnId = header.column.id;
                          let headerClassName = '';
                          if (columnId === 'picture') headerClassName = 'w-[60px]';
                          else if (columnId === 'studentCode') headerClassName = 'hidden sm:table-cell';
                          else if (columnId === 'school') headerClassName = 'hidden md:table-cell';
                          else if (columnId === 'residency') headerClassName = 'hidden lg:table-cell';
                          else if (columnId === 'room') headerClassName = 'hidden lg:table-cell';
                          else if (columnId === 'actions') headerClassName = 'text-right w-[100px]';
                          
                          return (
                            <TableHead key={header.id} className={headerClassName}>
                              {header.isPlaceholder
                                ? null
                                : typeof header.column.columnDef.header === 'function'
                                ? header.column.columnDef.header({ column: header.column, header, table })
                                : header.column.columnDef.header}
                            </TableHead>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="h-24 text-center">
                          {t('admissions.noDataFound') || 'No data found.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      table.getRowModel().rows.map((row) => (
                        <TableRow 
                          key={row.id} 
                          data-state={row.getIsSelected() && 'selected'}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleRowClick(row.original)}
                        >
                          {row.getVisibleCells().map((cell) => {
                            const columnId = cell.column.id;
                            let cellClassName = '';
                            if (columnId === 'picture') cellClassName = 'w-[60px]';
                            else if (columnId === 'studentCode') cellClassName = 'hidden sm:table-cell';
                            else if (columnId === 'school') cellClassName = 'hidden md:table-cell';
                            else if (columnId === 'residency') cellClassName = 'hidden lg:table-cell';
                            else if (columnId === 'room') cellClassName = 'hidden lg:table-cell';
                            else if (columnId === 'actions') cellClassName = 'text-right w-[100px]';
                            
                            return (
                              <TableCell key={cell.id} className={cellClassName}>
                                {cell.column.columnDef.cell
                                  ? typeof cell.column.columnDef.cell === 'function'
                                    ? cell.column.columnDef.cell(cell.getContext())
                                    : cell.column.columnDef.cell
                                  : null}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <DataTablePagination
                table={table}
                paginationMeta={pagination ?? null}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                showPageSizeSelector={true}
                showTotalCount={true}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!admissionToDelete} onOpenChange={(open) => !open && setAdmissionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admissions.removeAdmission')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admissions.removeAdmissionDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('events.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>{t('events.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isBulkDeactivateDialogOpen} onOpenChange={setIsBulkDeactivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admissions.bulkDeactivateTitle') || 'Deactivate Students'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admissions.bulkDeactivateDescription') || 
                `Are you sure you want to deactivate ${selectedCount} selected student admission(s)? This will set their enrollment status to inactive.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeactivate.isPending}>
              {t('events.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDeactivate}
              disabled={bulkDeactivate.isPending}
            >
              {bulkDeactivate.isPending 
                ? (t('events.processing') || 'Processing...') 
                : (t('admissions.deactivate') || 'Deactivate')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default StudentAdmissions;
