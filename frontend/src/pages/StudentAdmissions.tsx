import { ColumnDef } from '@tanstack/react-table';
import { Plus, UserCheck, MapPin, Shield, ClipboardList, Pencil, Trash2, Search, DollarSign, MoreVertical } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PictureCell } from '@/components/shared/PictureCell';

import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { FilterPanel } from '@/components/layout/FilterPanel';
import { PageHeader } from '@/components/layout/PageHeader';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/hooks/useLanguage';
import { useProfile } from '@/hooks/useProfiles';
import { useSchools } from '@/hooks/useSchools';
import { useAcademicYears } from '@/hooks/useAcademicYears';
import { useClassAcademicYears } from '@/hooks/useClasses';
import { useStudents } from '@/hooks/useStudents';
import { useStudentAutocomplete } from '@/hooks/useStudentAutocomplete';
import { useResidencyTypes } from '@/hooks/useResidencyTypes';
import { useRooms } from '@/hooks/useRooms';
import {
  useAdmissionStats,
  useDeleteStudentAdmission,
  useStudentAdmissions,
  useBulkUpdateAdmissionStatus,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const statusVariant = (status: AdmissionStatus): 'success' | 'info' | 'warning' | 'outline' | 'destructive' | 'secondary' => {
  switch (status) {
    case 'active':
      return 'success';
    case 'admitted':
    case 'pending':
      return 'info';
    case 'inactive':
    case 'suspended':
      return 'warning';
    case 'withdrawn':
      return 'destructive';
    case 'graduated':
      return 'success';
    default:
      return 'secondary';
  }
};

const isCurrentAdmissionStatus = (status: AdmissionStatus): boolean =>
  status === 'pending' || status === 'admitted' || status === 'active';

export function StudentAdmissions() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const orgIdForQuery = profile?.organization_id;

  const [statusFilter, setStatusFilter] = useState<'all' | AdmissionStatus>('all');
  const [residencyFilter, setResidencyFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [academicYearFilter, setAcademicYearFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [originalProvinceFilter, setOriginalProvinceFilter] = useState<string>('all');

  const selectedAcademicYearId = academicYearFilter !== 'all' ? academicYearFilter : undefined;
  const { data: academicYears = [] } = useAcademicYears(orgIdForQuery);
  const { data: classAcademicYears = [] } = useClassAcademicYears(selectedAcademicYearId, orgIdForQuery);
  const classOptions = useMemo(() => {
    const map = new Map<string, string>();
    classAcademicYears.forEach((entry) => {
      if (entry.classId && entry.class?.name) {
        map.set(entry.classId, entry.class.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [classAcademicYears]);

  const admissionFilters = useMemo(() => ({
    search: searchQuery.trim() || undefined,
    orig_province: originalProvinceFilter !== 'all' ? originalProvinceFilter : undefined,
    enrollment_status: statusFilter !== 'all' ? statusFilter : undefined,
    residency_type_id: residencyFilter !== 'all' ? residencyFilter : undefined,
    academic_year_id: selectedAcademicYearId,
    class_id: classFilter !== 'all' ? classFilter : undefined,
  }), [searchQuery, originalProvinceFilter, statusFilter, residencyFilter, selectedAcademicYearId, classFilter]);

  const { 
    admissions, 
    isLoading, 
    error: admissionsError,
    pagination,
    page,
    pageSize,
    setPage,
    setPageSize,
  } = useStudentAdmissions(orgIdForQuery, true, admissionFilters);
  
  // Debug logging
  useEffect(() => {
    if (import.meta.env.DEV && admissions) {
      console.log('[StudentAdmissions] Admissions data:', admissions.length, 'records');
      console.log('[StudentAdmissions] Sample admission:', admissions[0]);
    }
    if (import.meta.env.DEV && admissionsError) {
      console.error('[StudentAdmissions] Error:', admissionsError);
    }
  }, [admissions, admissionsError]);
  const { stats } = useAdmissionStats(orgIdForQuery);
  const { data: students } = useStudents(orgIdForQuery);
  const { data: studentAutocomplete } = useStudentAutocomplete();
  const { data: schools } = useSchools(orgIdForQuery);
  const { data: residencyTypes } = useResidencyTypes(orgIdForQuery);
  const { data: rooms } = useRooms(undefined, orgIdForQuery);

  const deleteAdmission = useDeleteStudentAdmission();
  const bulkStatusUpdate = useBulkUpdateAdmissionStatus();
  
  // Check subscription limits for students
  const studentUsage = useResourceUsage('students');
  const isLimitReached = !studentUsage.isUnlimited && studentUsage.remaining === 0;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState<StudentAdmission | null>(null);
  const [admissionToDelete, setAdmissionToDelete] = useState<StudentAdmission | null>(null);
  const [selectedAdmissionIds, setSelectedAdmissionIds] = useState<Set<string>>(new Set());
  const [isBulkStatusDialogOpen, setIsBulkStatusDialogOpen] = useState(false);
  const [bulkStatusValue, setBulkStatusValue] = useState<AdmissionStatus>('active');
  useEffect(() => {
    setClassFilter('all');
  }, [selectedAcademicYearId]);

  useEffect(() => {
    setPage(1);
    setSelectedAdmissionIds(new Set());
  }, [searchQuery, originalProvinceFilter, statusFilter, residencyFilter, selectedAcademicYearId, classFilter, setPage]);

  // Server-side filtering returns only matching records.
  const filteredAdmissions = useMemo(() => {
    return admissions || [];
  }, [admissions]);
  const filteredRecordsCount = pagination?.total ?? filteredAdmissions.length;
  const originalProvinceOptions = useMemo(() => {
    const options = new Set<string>();

    (studentAutocomplete?.origProvinces ?? []).forEach((province) => {
      if (province && province.trim()) {
        options.add(province.trim());
      }
    });

    (students ?? []).forEach((student) => {
      const province = student.origProvince;
      if (province && province.trim()) {
        options.add(province.trim());
      }
    });

    return Array.from(options).sort((a, b) => a.localeCompare(b));
  }, [studentAutocomplete?.origProvinces, students]);

  const getAdmissionStatusLabel = (status: AdmissionStatus) => {
    switch (status) {
      case 'pending':
        return t('admissions.pending') || 'Pending';
      case 'admitted':
        return t('admissions.admitted') || 'Admitted';
      case 'active':
        return t('events.active') || 'Active';
      case 'inactive':
        return t('events.inactive') || 'Inactive';
      case 'suspended':
        return t('students.suspended') || 'Suspended';
      case 'withdrawn':
        return t('admissions.withdrawn') || 'Withdrawn';
      case 'graduated':
        return t('students.graduated') || 'Graduated';
      default:
        return status;
    }
  };

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
      id: 'admissionNumber',
      accessorFn: (row) => row.student?.admissionNumber ?? row.student?.studentCode ?? '',
      header: t('admissions.admissionNumber') || 'Admission #',
      cell: ({ row }) => {
        const s = row.original.student;
        const primary = s?.admissionNumber || s?.studentCode || '—';
        const showSystemCode =
          !!s?.studentCode && !!s?.admissionNumber && s.studentCode !== s.admissionNumber;
        return (
          <div className="space-y-0.5">
            <div className="font-mono text-sm font-medium">{primary}</div>
            {showSystemCode && (
              <div className="text-xs text-muted-foreground font-normal font-mono">
                {t('students.studentCode')}: {s.studentCode}
              </div>
            )}
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
                  {getAdmissionStatusLabel(admission.enrollmentStatus)}
                </Badge>
              )}
              {admission.isBoarder && (
                <Badge variant="boarder" className="shrink-0 text-xs">
                  {t('admissions.boarder') || 'Boarder'}
                </Badge>
              )}
            </div>
            {admission.student?.cardNumber && (
              <div className="text-xs text-muted-foreground">
                {t('students.cardNumber') || 'Card Number'}: {admission.student.cardNumber}
              </div>
            )}
            {/* Show card number on mobile under student details */}
            <div className="text-xs text-muted-foreground sm:hidden space-y-0.5">
              <div className="font-mono">
                {t('students.cardNumber') || 'Card Number'}:{' '}
                {admission.student?.cardNumber || '—'}
              </div>
              {admission.student?.studentCode &&
                admission.student?.admissionNumber &&
                admission.student.studentCode !== admission.student.admissionNumber && (
                  <div className="font-mono">
                    {t('students.studentCode')}: {admission.student.studentCode}
                  </div>
                )}
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
                <Badge variant="muted" className="text-xs shrink-0">
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
        if (!row.original.isBoarder) return '—';
        const room = rooms?.find((r) => r.id === row.original.roomId);
        if (!room) return '—';
        return (
          <Badge variant="muted" className="text-xs shrink-0 font-mono">
            {room.roomNumber}
          </Badge>
        );
      },
      meta: {
        className: 'hidden lg:table-cell',
      },
    },
    {
      accessorKey: 'status',
      header: t('admissions.placementColumn'),
      cell: ({ row }) => {
        const admission = row.original;
        const isLatestAdmission = admission.isLatestAdmissionForStudent ?? false;
        const isCurrentAdmission = isLatestAdmission && isCurrentAdmissionStatus(admission.enrollmentStatus);
        const isAssignedToClass = isCurrentAdmission && Boolean(admission.classId || admission.classAcademicYearId);

        return (
          <div className="space-y-1">
            <Badge variant={isCurrentAdmission ? 'success' : isLatestAdmission ? 'warning' : 'secondary'}>
              {isCurrentAdmission
                ? t('admissions.placementCurrent')
                : isLatestAdmission
                  ? t('admissions.placementClosed')
                  : t('admissions.placementHistory')}
            </Badge>
            <div className="text-xs text-muted-foreground">
              {isAssignedToClass
                ? t('admissions.placementInClass')
                : isCurrentAdmission
                  ? t('admissions.placementNeedsClass')
                  : t('admissions.placementNotCurrent')}
            </div>
          </div>
        );
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
                    onClick={() => handleAssignIdCard(row.original)}
                  >
                    <UserCheck className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                    {t('idCards.assign') || 'Assign ID Card'}
                  </DropdownMenuItem>
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

  const handleAssignIdCard = (admission: StudentAdmission) => {
    const params = new URLSearchParams({
      studentType: 'regular',
      admissionId: admission.id,
    });

    if (admission.academicYearId) {
      params.set('academicYearId', admission.academicYearId);
    }
    if (admission.schoolId) {
      params.set('schoolId', admission.schoolId);
    }
    if (admission.classId) {
      params.set('classId', admission.classId);
    }
    if (admission.classAcademicYearId) {
      params.set('classAcademicYearId', admission.classAcademicYearId);
    }

    navigate(`/id-cards/assignment?${params.toString()}`);
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

  const handleBulkStatusUpdate = async () => {
    if (selectedAdmissionIds.size === 0) return;

    const admissionIds = Array.from(selectedAdmissionIds);
    await bulkStatusUpdate.mutateAsync(
      {
        admission_ids: admissionIds,
        enrollment_status: bulkStatusValue,
      },
      {
        onSuccess: () => {
          setSelectedAdmissionIds(new Set());
          setIsBulkStatusDialogOpen(false);
        },
      }
    );
  };

  const selectedCount = selectedAdmissionIds.size;
  const canBulkUpdateStatus = selectedCount > 0;

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
          canBulkUpdateStatus
            ? [
                {
                  label: t('admissions.bulkStatusAction', { count: selectedCount }),
                  onClick: () => setIsBulkStatusDialogOpen(true),
                  icon: <UserCheck className="h-4 w-4" />,
                  variant: 'outline',
                  disabled: bulkStatusUpdate.isPending,
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
        onSelectAdmission={(next) => setSelectedAdmission(next)}
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
              placeholder={t('admissions.searchStudent')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={academicYearFilter} onValueChange={setAcademicYearFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder={t('academic.academicYears.academicYear') || 'Academic Year'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.allYears') || 'All Years'}</SelectItem>
              {academicYears.map((year) => (
                <SelectItem key={year.id} value={year.id}>
                  {year.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={classFilter}
            onValueChange={setClassFilter}
            disabled={!selectedAcademicYearId || classOptions.length === 0}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder={t('search.class') || 'Class'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('students.allClasses') || 'All Classes'}</SelectItem>
              {classOptions.map((classOption) => (
                <SelectItem key={classOption.id} value={classOption.id}>
                  {classOption.name}
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
          <Select value={originalProvinceFilter} onValueChange={setOriginalProvinceFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder={t('students.originProvince') || 'Original Province'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {`${t('common.all') || 'All'} ${t('students.originProvince') || 'Provinces'}`}
              </SelectItem>
              {originalProvinceOptions.map((province) => (
                <SelectItem key={province} value={province}>
                  {province}
                </SelectItem>
              ))}
              {originalProvinceOptions.length === 0 ? (
                <SelectItem value="no-province-options" disabled>
                  {t('admissions.noDataFound') || 'No data found.'}
                </SelectItem>
              ) : null}
            </SelectContent>
          </Select>
        </div>
      </FilterPanel>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>{t('admissions.list') || 'Admissions'}</span>
            <Badge variant="outline" className="text-xs font-normal">
              {t('websitePublic.filteredResults') || 'Filtered Results'}: {filteredRecordsCount}
            </Badge>
          </CardTitle>
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
                          else if (columnId === 'admissionNumber') headerClassName = 'hidden sm:table-cell';
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
                            else if (columnId === 'admissionNumber') cellClassName = 'hidden sm:table-cell';
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

      <Dialog open={isBulkStatusDialogOpen} onOpenChange={setIsBulkStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admissions.bulkStatusTitle')}</DialogTitle>
            <DialogDescription>{t('admissions.bulkStatusDescription', { count: selectedCount })}</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="bulk-admission-status">{t('admissions.enrollmentStatus') || 'Enrollment Status'}</Label>
            <Select value={bulkStatusValue} onValueChange={(value) => setBulkStatusValue(value as AdmissionStatus)}>
              <SelectTrigger id="bulk-admission-status">
                <SelectValue placeholder={t('events.status') || 'Status'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">{getAdmissionStatusLabel('pending')}</SelectItem>
                <SelectItem value="admitted">{getAdmissionStatusLabel('admitted')}</SelectItem>
                <SelectItem value="active">{getAdmissionStatusLabel('active')}</SelectItem>
                <SelectItem value="inactive">{getAdmissionStatusLabel('inactive')}</SelectItem>
                <SelectItem value="suspended">{getAdmissionStatusLabel('suspended')}</SelectItem>
                <SelectItem value="withdrawn">{getAdmissionStatusLabel('withdrawn')}</SelectItem>
                <SelectItem value="graduated">{getAdmissionStatusLabel('graduated')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkStatusDialogOpen(false)} disabled={bulkStatusUpdate.isPending}>
              {t('events.cancel') || 'Cancel'}
            </Button>
            <Button onClick={handleBulkStatusUpdate} disabled={bulkStatusUpdate.isPending}>
              {bulkStatusUpdate.isPending ? (t('events.processing') || 'Processing...') : t('admissions.bulkStatusUpdate')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default StudentAdmissions;
