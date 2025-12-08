import { useMemo, useState, useEffect } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Eye, FileSpreadsheet, FileText, Download, Search, Filter, X, User } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useProfile } from '@/hooks/useProfiles';
import { useSchools } from '@/hooks/useSchools';
import { useStudents } from '@/hooks/useStudents';
import type { Student } from '@/types/domain/student';
import { studentsApi } from '@/lib/api/client';
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
import { Separator } from '@/components/ui/separator';
import { showToast } from '@/lib/toast';
import { format } from 'date-fns';

const statusBadgeVariant = (status?: string) => {
  switch (status) {
    case 'active':
      return 'default';
    case 'admitted':
      return 'secondary';
    case 'applied':
      return 'outline';
    case 'withdrawn':
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

const StudentReport = () => {
  const { t, isRTL } = useLanguage();
  const { data: profile } = useProfile();
  const orgIdForQuery = profile?.organization_id;
  const { data: studentsData, isLoading } = useStudents(orgIdForQuery);
  const { data: schools } = useSchools(orgIdForQuery);

  // Ensure students is always an array of domain Student type
  const students: Student[] = useMemo(() => {
    if (!studentsData) return [];
    if (Array.isArray(studentsData)) {
      // TypeScript should infer this is Student[] from useStudents hook
      return studentsData as Student[];
    }
    // If it's a paginated response, extract the data
    if (typeof studentsData === 'object' && 'data' in studentsData) {
      return ((studentsData as any).data || []) as Student[];
    }
    return [];
  }, [studentsData]);

  const [statusFilter, setStatusFilter] = useState<'all' | string>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [schoolFilter, setSchoolFilter] = useState<'all' | string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const filteredStudents = useMemo((): Student[] => {
    const list: Student[] = students || [];
    const query = searchQuery.toLowerCase();

    return list.filter((student: Student) => {
      if (statusFilter !== 'all' && student.status !== statusFilter) return false;
      if (genderFilter !== 'all' && student.gender !== genderFilter) return false;
      if (schoolFilter !== 'all' && student.schoolId !== schoolFilter) return false;

      if (!query) return true;

      return (
        (student.fullName || '').toLowerCase().includes(query) ||
        (student.admissionNumber || '').toLowerCase().includes(query) ||
        (student.fatherName || '').toLowerCase().includes(query) ||
        (student.guardianPhone || '').toLowerCase().includes(query) ||
        (student.cardNumber || '').toLowerCase().includes(query)
      );
    });
  }, [students, statusFilter, genderFilter, schoolFilter, searchQuery]);

  // Pagination
  const paginatedStudents = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filteredStudents.slice(start, end);
  }, [filteredStudents, page, pageSize]);

  const totalPages = Math.ceil(filteredStudents.length / pageSize);

  const handleViewDetails = (student: Student) => {
    setSelectedStudent(student);
    setIsSheetOpen(true);
  };

  const handleExport = async (format: 'csv' | 'pdf' | 'xlsx') => {
    const exportSchool = schoolFilter !== 'all' 
      ? schools?.find(s => s.id === schoolFilter) 
      : schools?.[0];

    if (!exportSchool) {
      showToast.error(t('studentReport.schoolRequired') || 'A school is required to export the report.');
      return;
    }

    try {
      const { blob, filename } = await studentsApi.exportReport({
        format: format === 'xlsx' ? 'xlsx' : format,
        school_id: exportSchool.id,
        student_status: statusFilter !== 'all' ? statusFilter : undefined,
        gender: genderFilter !== 'all' ? genderFilter : undefined,
        search: searchQuery || undefined,
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `student-registration-report.${format === 'pdf' ? 'pdf' : format === 'xlsx' ? 'xlsx' : 'csv'}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showToast.success(t('studentReport.reportExported') || `Report exported as ${format.toUpperCase()}`);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error(error);
      }
      showToast.error(t('studentReport.exportFailed') || 'Failed to export the report. Please try again.');
    }
  };

  const columns: ColumnDef<Student, any>[] = useMemo(() => [
    {
      id: 'avatar',
      header: '',
      cell: ({ row }) => {
        const student = row.original;
        return (
          <div className="flex items-center justify-center">
            {student.picturePath ? (
              <img
                src={`/api/students/${student.id}/picture`}
                alt={student.fullName}
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
              className={`w-10 h-10 rounded-full bg-muted flex items-center justify-center border-2 border-border ${student.picturePath ? 'hidden' : 'flex'}`}
            >
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'studentCode',
      header: t('studentReport.studentId') || 'ID',
      cell: ({ row }) => (
        <div className="font-mono text-sm font-medium">
          {row.original.studentCode || row.original.admissionNumber || '—'}
        </div>
      ),
    },
    {
      accessorKey: 'admissionNumber',
      header: t('students.admissionNo') || 'Admission #',
      cell: ({ row }) => (
        <div className="font-medium">{row.original.admissionNumber || '—'}</div>
      ),
    },
    {
      accessorKey: 'fullName',
      header: t('studentReport.fullName') || 'Name',
      cell: ({ row }) => (
        <div className="font-semibold">{row.original.fullName}</div>
      ),
    },
    {
      accessorKey: 'cardNumber',
      header: t('attendancePage.cardHeader') || 'Card #',
      cell: ({ row }) => (
        <div className="text-sm">{row.original.cardNumber || '—'}</div>
      ),
    },
    {
      accessorKey: 'originLocation',
      header: t('studentReport.originLocation') || 'Origin Location',
      cell: ({ row }) => (
        <div className="text-sm">
          {buildLocation(row.original.origProvince, row.original.origDistrict, row.original.origVillage)}
        </div>
      ),
    },
    {
      accessorKey: 'birthYear',
      header: t('studentReport.birthYear') || 'Birth Year',
      cell: ({ row }) => (
        <div className="text-sm">{row.original.birthYear || '—'}</div>
      ),
    },
    {
      accessorKey: 'status',
      header: t('studentReport.status') || 'Status',
      cell: ({ row }) => (
        <Badge variant={statusBadgeVariant(row.original.status)} className="capitalize">
          {formatStatus(row.original.status)}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: t('common.actions') || 'Actions',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleViewDetails(row.original)}
          className="h-8 w-8 p-0"
        >
          <Eye className="h-4 w-4" />
          <span className="sr-only">{t('common.view') || 'View details'}</span>
        </Button>
      ),
    },
  ], [t]);

  const { table } = useDataTable<Student>({
    data: paginatedStudents,
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
    total: filteredStudents.length,
    last_page: totalPages,
    from: (page - 1) * pageSize + 1,
    to: Math.min(page * pageSize, filteredStudents.length),
  }), [page, pageSize, filteredStudents.length, totalPages]);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold leading-tight">{t('studentReport.title') || 'Student Registration Report'}</h1>
          <p className="text-muted-foreground">
            {t('studentReport.subtitle') || 'View and export student registration data with detailed information'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => handleExport('csv')}
            disabled={filteredStudents.length === 0}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExport('xlsx')}
            disabled={filteredStudents.length === 0}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Button
            variant="default"
            onClick={() => handleExport('pdf')}
            disabled={filteredStudents.length === 0}
          >
            <FileText className="mr-2 h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t('studentReport.filters') || 'Filters'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('studentReport.searchPlaceholder') || 'Search by name, admission number...'}
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
                <SelectValue placeholder={t('studentReport.allSchools') || 'All Schools'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('studentReport.allSchools') || 'All Schools'}</SelectItem>
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
                <SelectValue placeholder={t('studentReport.allStatus') || 'All Status'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('studentReport.allStatus') || 'All Status'}</SelectItem>
                <SelectItem value="applied">{t('studentReport.applied') || 'Applied'}</SelectItem>
                <SelectItem value="admitted">{t('studentReport.admitted') || 'Admitted'}</SelectItem>
                <SelectItem value="active">{t('studentReport.active') || 'Active'}</SelectItem>
                <SelectItem value="withdrawn">{t('studentReport.withdrawn') || 'Withdrawn'}</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={genderFilter}
              onValueChange={(value) => {
                setGenderFilter(value as typeof genderFilter);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('studentReport.allGenders') || 'All Genders'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('studentReport.allGenders') || 'All Genders'}</SelectItem>
                <SelectItem value="male">{t('studentReport.male') || 'Male'}</SelectItem>
                <SelectItem value="female">{t('studentReport.female') || 'Female'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('studentReport.students') || 'Students'} ({filteredStudents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 flex justify-center">
              <LoadingSpinner text={t('studentReport.loadingStudents') || 'Loading students...'} />
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
                          {t('studentReport.noStudentsFound') || 'No students found.'}
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
          {selectedStudent && (
            <>
              <SheetHeader className="pb-4 border-b">
                <div className="flex items-start gap-4">
                  {/* Student Image */}
                  <div className="relative">
                    {selectedStudent.picturePath ? (
                      <img
                        src={`/api/students/${selectedStudent.id}/picture`}
                        alt={selectedStudent.fullName}
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
                      className={`w-20 h-20 rounded-full bg-muted flex items-center justify-center border-2 border-border ${selectedStudent.picturePath ? 'hidden' : 'flex'}`}
                    >
                      <User className="h-10 w-10 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <SheetTitle className="text-2xl mb-1">{selectedStudent.fullName}</SheetTitle>
                    <SheetDescription className="text-base">
                      {selectedStudent.studentCode && (
                        <span className="font-mono font-medium">{t('studentReport.idLabel')}: {selectedStudent.studentCode}</span>
                      )}
                      {selectedStudent.studentCode && selectedStudent.admissionNumber && ' • '}
                      {selectedStudent.admissionNumber && `${t('studentReport.admissionLabel')}${selectedStudent.admissionNumber}`}
                      {selectedStudent.cardNumber && ` • ${t('studentReport.cardLabel')}${selectedStudent.cardNumber}`}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-12rem)] mt-6">
                <div className={`space-y-6 ${isRTL ? 'pl-4' : 'pr-4'}`}>
                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">{t('studentReport.personalInformation') || 'Personal Information'}</h3>
                    <div className="space-y-3">
                      {selectedStudent.studentCode && (
                        <div className="flex items-center justify-between py-2 border-b">
                          <span className="text-sm font-medium text-muted-foreground">{t('studentReport.studentId') || 'Student ID'}</span>
                          <span className="text-sm font-mono font-medium">{selectedStudent.studentCode}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">{t('studentReport.fullName') || 'Full Name'}</span>
                        <span className="text-sm font-medium">{selectedStudent.fullName}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">{t('studentReport.fatherName') || 'Father Name'}</span>
                        <span className="text-sm">{selectedStudent.fatherName || '—'}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">{t('studentReport.gender') || 'Gender'}</span>
                        <Badge variant="outline" className="capitalize">
                          {selectedStudent.gender === 'male' ? (t('studentReport.male') || 'Male') : (t('studentReport.female') || 'Female')}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">{t('studentReport.age') || 'Age'}</span>
                        <span className="text-sm">{selectedStudent.age ?? '—'}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">{t('studentReport.birthDate') || 'Birth Date'}</span>
                        <span className="text-sm">{formatDate(selectedStudent.dateOfBirth ?? selectedStudent.birthDate)}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">{t('studentReport.nationality') || 'Nationality'}</span>
                        <span className="text-sm">{selectedStudent.nationality || '—'}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">{t('studentReport.status') || 'Status'}</span>
                        <Badge variant={statusBadgeVariant(selectedStudent.status)} className="capitalize">
                          {formatStatus(selectedStudent.status)}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Guardian Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">{t('studentReport.guardianInformation') || 'Guardian Information'}</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">{t('studentReport.guardianName') || 'Guardian Name'}</span>
                        <span className="text-sm">{selectedStudent.guardianName || selectedStudent.fatherName || '—'}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">{t('studentReport.relation') || 'Relation'}</span>
                        <span className="text-sm">{selectedStudent.guardianRelation || '—'}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">{t('studentReport.guardianPhone') || 'Guardian Phone'}</span>
                        <span className="text-sm">{selectedStudent.guardianPhone || '—'}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">{t('studentReport.contactPhone') || 'Contact Phone'}</span>
                        <span className="text-sm">{selectedStudent.phone || '—'}</span>
                      </div>
                      <div className="flex items-start justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">{t('studentReport.homeAddress') || 'Home Address'}</span>
                        <span className="text-sm text-right max-w-[60%]">{selectedStudent.homeAddress || selectedStudent.address?.street || '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Academic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">{t('studentReport.academicInformation') || 'Academic Information'}</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">{t('studentReport.school') || 'School'}</span>
                        <span className="text-sm">{selectedStudent.school?.schoolName || '—'}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">{t('studentReport.applyingGrade') || 'Applying Grade'}</span>
                        <span className="text-sm">{selectedStudent.applyingGrade || '—'}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">{t('studentReport.admissionYear') || 'Admission Year'}</span>
                        <span className="text-sm">{selectedStudent.admissionYear || '—'}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">{t('studentReport.admissionFeeStatus') || 'Admission Fee Status'}</span>
                        <Badge variant="outline">{formatStatus(selectedStudent.admissionFeeStatus)}</Badge>
                      </div>
                      <div className="flex items-start justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">{t('studentReport.previousSchool') || 'Previous School'}</span>
                        <span className="text-sm text-right max-w-[60%]">{selectedStudent.previousSchool || '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Location Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">{t('studentReport.locationInformation') || 'Location Information'}</h3>
                    <div className="space-y-3">
                      <div className="flex items-start justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">{t('studentReport.originLocation') || 'Origin Location'}</span>
                        <span className="text-sm text-right max-w-[60%]">
                          {buildLocation(selectedStudent.origProvince, selectedStudent.origDistrict, selectedStudent.origVillage)}
                        </span>
                      </div>
                      <div className="flex items-start justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">{t('studentReport.currentLocation') || 'Current Location'}</span>
                        <span className="text-sm text-right max-w-[60%]">
                          {buildLocation(selectedStudent.currProvince, selectedStudent.currDistrict, selectedStudent.currVillage)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Additional Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">{t('studentReport.additionalInformation') || 'Additional Information'}</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">{t('studentReport.isOrphan') || 'Is Orphan'}</span>
                        <Badge variant={selectedStudent.isOrphan ? 'secondary' : 'outline'}>
                          {selectedStudent.isOrphan ? (t('studentReport.yes') || 'Yes') : (t('studentReport.no') || 'No')}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">{t('studentReport.disabilityStatus') || 'Disability Status'}</span>
                        <span className="text-sm">{selectedStudent.disabilityStatus || '—'}</span>
                      </div>
                      <div className="flex items-start justify-between py-2 border-b">
                        <span className="text-sm font-medium text-muted-foreground">{t('studentReport.emergencyContact') || 'Emergency Contact'}</span>
                        <span className="text-sm text-right max-w-[60%]">
                          {selectedStudent.emergencyContactName || selectedStudent.emergencyContactPhone
                            ? `${selectedStudent.emergencyContactName || ''} ${selectedStudent.emergencyContactPhone || ''}`.trim()
                            : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default StudentReport;
