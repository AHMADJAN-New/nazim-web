import { useReactTable, getCoreRowModel, type PaginationState } from '@tanstack/react-table';
import { format } from 'date-fns';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCourseStudents, useMarkCompleted, useMarkDropped } from '@/hooks/useCourseStudents';
import { useShortTermCourses } from '@/hooks/useShortTermCourses';
import { AlertTriangle, CheckCircle2, FileBadge2, RefreshCw, Download, MoreHorizontal, XCircle, CheckCircle } from 'lucide-react';
import { useMemo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';

import { toast } from 'sonner';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';

import { ReportExportButtons } from '@/components/reports/ReportExportButtons';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { formatDate, formatDateTime } from '@/lib/utils';
import type { CourseStudent } from '@/types/domain/courseStudent';

const statusBadge: Record<string, string> = {
  enrolled: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200',
  dropped: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200',
  failed: 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-200',
};

type CompletionStatus = 'enrolled' | 'completed' | 'dropped' | 'failed';

const CourseStudentReports = () => {
  const { t } = useLanguage();
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [bulkCompleteDialogOpen, setBulkCompleteDialogOpen] = useState(false);
  const [bulkDropDialogOpen, setBulkDropDialogOpen] = useState(false);

  const effectiveCourseId = selectedCourseId === 'all' ? undefined : selectedCourseId;
  const { data: students, isLoading, pagination, page, pageSize, setPage, setPageSize, refetch } = useCourseStudents(effectiveCourseId, true);
  const { data: courses } = useShortTermCourses();
  const markCompleted = useMarkCompleted();
  const markDropped = useMarkDropped();

  const stats = useMemo(() => {
    const total = students?.length || 0;
    const completed = students?.filter((s) => s.completionStatus === 'completed').length || 0;
    const dropped = students?.filter((s) => s.completionStatus === 'dropped' || s.completionStatus === 'failed').length || 0;
    const enrolled = students?.filter((s) => s.completionStatus === 'enrolled').length || 0;
    return { total, completed, dropped, enrolled };
  }, [students]);

  const filtered = useMemo(() => {
    if (!students) return [];
    let result = students;

    // Filter by status
    if (statusFilter !== 'all') {
      if (statusFilter === 'dropped') {
        result = result.filter((s) => s.completionStatus === 'dropped' || s.completionStatus === 'failed');
      } else {
        result = result.filter((s) => s.completionStatus === statusFilter);
      }
    }

    // Filter by search
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.fullName?.toLowerCase().includes(searchLower) ||
          s.admissionNo?.toLowerCase().includes(searchLower) ||
          s.fatherName?.toLowerCase().includes(searchLower) ||
          s.guardianName?.toLowerCase().includes(searchLower)
      );
    }

    return result;
  }, [students, statusFilter, search]);

  const selectedStudents = useMemo(() => {
    return filtered.filter((s) => selectedStudentIds.has(s.id));
  }, [filtered, selectedStudentIds]);

  const handleSelectAll = () => {
    if (selectedStudentIds.size === filtered.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(filtered.map((s) => s.id)));
    }
  };

  const handleToggleStudent = (studentId: string) => {
    const newSet = new Set(selectedStudentIds);
    if (newSet.has(studentId)) {
      newSet.delete(studentId);
    } else {
      newSet.add(studentId);
    }
    setSelectedStudentIds(newSet);
  };

  const handleBulkComplete = async () => {
    if (selectedStudents.length === 0) return;
    try {
      await Promise.all(selectedStudents.map((student) => markCompleted.mutateAsync({ id: student.id })));
      setSelectedStudentIds(new Set());
      setBulkCompleteDialogOpen(false);
      toast.success(`${selectedStudents.length} student(s) marked as completed`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete students');
    }
  };

  const handleBulkDrop = async () => {
    if (selectedStudents.length === 0) return;
    try {
      await Promise.all(selectedStudents.map((student) => markDropped.mutateAsync(student.id)));
      setSelectedStudentIds(new Set());
      setBulkDropDialogOpen(false);
      toast.success(`${selectedStudents.length} student(s) marked as dropped`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to drop students');
    }
  };

  const { profile } = useAuth();

  // Report export columns
  const reportColumns = useMemo(() => [
    { key: 'student_name', label: t('events.name') || 'Student' },
    { key: 'father_name', label: t('examReports.fatherName') || 'Father Name' },
    { key: 'admission_no', label: t('examReports.admissionNo') || 'Admission No' },
    { key: 'guardian_name', label: t('students.guardianName') || 'Guardian Name' },
    { key: 'guardian_phone', label: t('events.phone') || 'Phone' },
    { key: 'birth_year', label: t('students.birthYear') || 'Birth Year' },
    { key: 'age', label: t('students.age') || 'Age' },
    { key: 'registration_date', label: t('courses.registration') || 'Registered' },
    { key: 'status', label: t('events.statusLabel') || 'Status' },
    { key: 'course_name', label: t('courses.courseName') || 'Course' },
  ], [t]);

  // Transform data for report
  const transformCourseStudentData = useCallback((students: typeof filtered) => {
    return students.map((student) => {
      const course = courses?.find((c) => c.id === student.courseId);
      return {
        student_name: student.fullName || '-',
        father_name: student.fatherName || '-',
        admission_no: student.admissionNo || '-',
        guardian_name: student.guardianName || '-',
        guardian_phone: student.guardianPhone || '-',
        birth_year: student.birthYear?.toString() || '-',
        age: student.age?.toString() || '-',
        registration_date: student.registrationDate ? formatDate(student.registrationDate) : '-',
        status: student.completionStatus || '-',
        course_name: course?.name || '-',
      };
    });
  }, [courses]);

  // Build filters summary
  const buildFiltersSummary = useCallback(() => {
    const filters: string[] = [];
    if (selectedCourseId && selectedCourseId !== 'all') {
      const course = courses?.find((c) => c.id === selectedCourseId);
      if (course) filters.push(`${t('courses.courseName') || 'Course'}: ${course.name}`);
    }
    if (statusFilter !== 'all') {
      filters.push(`${t('events.statusLabel') || 'Status'}: ${statusFilter}`);
    }
    if (search) {
      filters.push(`${t('events.search') || 'Search'}: ${search}`);
    }
    return filters.join(', ');
  }, [selectedCourseId, statusFilter, search, courses, t]);

  const paginationState: PaginationState = {
    pageIndex: page - 1,
    pageSize,
  };

  const table = useReactTable({
    data: filtered,
    columns: [{ id: 'name', header: 'Name', cell: () => null }],
    state: { pagination: paginationState },
    manualPagination: true,
    pageCount: pagination?.last_page ?? 1,
    getCoreRowModel: getCoreRowModel(),
    onPaginationChange: (updater) => {
      const next = typeof updater === 'function' ? updater(paginationState) : updater;
      setPage(next.pageIndex + 1);
      setPageSize(next.pageSize);
    },
  });

  const allSelected = filtered.length > 0 && selectedStudentIds.size === filtered.length;
  const someSelected = selectedStudentIds.size > 0 && selectedStudentIds.size < filtered.length;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">{t('courses.courseReports')}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1 hidden md:block">
                View, filter, and manage course students with bulk operations.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <ReportExportButtons
                data={filtered}
                columns={reportColumns}
                reportKey="short_term_course_students"
                title={t('courses.courseReports') || 'Short-term Course Students Report'}
                transformData={transformCourseStudentData}
                buildFiltersSummary={buildFiltersSummary}
                schoolId={profile?.default_school_id}
                templateType="course_students"
                disabled={isLoading || filtered.length === 0}
              />
              <Button variant="outline" onClick={() => refetch()} className="w-full sm:w-auto">
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">{t('events.refresh')}</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Enrolled"
          value={stats.enrolled}
          icon={CheckCircle}
          description="Live"
          color="blue"
        />
        <StatsCard
          title={t('courses.completed')}
          value={stats.completed}
          icon={CheckCircle2}
          description={t('courses.completedStudents') || 'Completed students'}
          color="green"
        />
        <StatsCard
          title="Dropped/Failed"
          value={stats.dropped}
          icon={AlertTriangle}
          description={t('courses.droppedStudents') || 'Dropped students'}
          color="amber"
        />
        <StatsCard
          title={t('events.total')}
          value={stats.total}
          icon={FileBadge2}
          description={t('courses.totalStudents') || 'Total students'}
          color="purple"
        />
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg font-semibold">{t('nav.studentReports') || 'Student Reports'}</CardTitle>
              <p className="text-sm text-muted-foreground">{t('courses.courseReportsDescription') || 'Filter and manage course students.'}</p>
            </div>
            {pagination && (
              <div className="text-sm text-muted-foreground">
                {t('library.showing')} {page} {t('events.of')} {pagination.last_page}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>{t('courses.courseName')}</Label>
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('courses.allCourses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('courses.allCourses')}</SelectItem>
                  {(courses || []).map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('events.status')}</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="enrolled">Enrolled</SelectItem>
                  <SelectItem value="completed">{t('courses.completed')}</SelectItem>
                  <SelectItem value="dropped">Dropped/Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>{t('events.search')}</Label>
              <Input
                placeholder="Search by name, admission #, father name, or guardian..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedStudentIds.size > 0 && (
            <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {selectedStudentIds.size} student{selectedStudentIds.size !== 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreHorizontal className="h-4 w-4 mr-2" />
                      Bulk Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => setBulkCompleteDialogOpen(true)}
                      disabled={selectedStudents.some((s) => s.completionStatus === 'completed')}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Mark as Completed
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setBulkDropDialogOpen(true)}
                      disabled={selectedStudents.some((s) => s.completionStatus === 'dropped' || s.completionStatus === 'failed')}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Mark as Dropped
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" size="sm" onClick={() => setSelectedStudentIds(new Set())}>
                  Clear Selection
                </Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-10">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={handleSelectAll}
                          aria-label="Select all"
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Father Name</TableHead>
                      <TableHead>Admission No</TableHead>
                      <TableHead className="hidden lg:table-cell">Guardian Name</TableHead>
                      <TableHead className="hidden lg:table-cell">Phone</TableHead>
                      <TableHead className="hidden md:table-cell">Birth Year</TableHead>
                      <TableHead className="hidden md:table-cell">Age</TableHead>
                      <TableHead className="hidden md:table-cell">Registered</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">Course</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length ? (
                      filtered.map((student) => {
                        const course = courses?.find((c) => c.id === student.courseId);
                        const isSelected = selectedStudentIds.has(student.id);
                        return (
                          <TableRow key={student.id} className={isSelected ? 'bg-primary/5' : ''}>
                            <TableCell>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleToggleStudent(student.id)}
                                aria-label={`Select ${student.fullName}`}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="font-semibold leading-tight">{student.fullName || '-'}</div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {student.fatherName || '-'}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {student.admissionNo || '-'}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-sm">
                              {student.guardianName || '-'}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-sm">
                              {student.guardianPhone || '-'}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm">
                              {student.birthYear || '-'}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm">
                              {student.age || '-'}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm">
                              {student.registrationDate
                                ? formatDate(student.registrationDate)
                                : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={statusBadge[student.completionStatus] || ''}>
                                {student.completionStatus}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm">
                              {course?.name || '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={11} className="py-8 text-center text-muted-foreground">
                          No students found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {pagination && (
                <DataTablePagination
                  table={table}
                  paginationMeta={pagination}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  showPageSizeSelector
                  showTotalCount
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Complete Dialog */}
      <AlertDialog open={bulkCompleteDialogOpen} onOpenChange={setBulkCompleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Students as Completed</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark {selectedStudents.length} student{selectedStudents.length !== 1 ? 's' : ''} as completed?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkComplete} disabled={markCompleted.isPending}>
              {markCompleted.isPending ? 'Completing...' : 'Mark as Completed'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Drop Dialog */}
      <AlertDialog open={bulkDropDialogOpen} onOpenChange={setBulkDropDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Students as Dropped</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark {selectedStudents.length} student{selectedStudents.length !== 1 ? 's' : ''} as dropped?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDrop} disabled={markDropped.isPending}>
              {markDropped.isPending ? 'Dropping...' : 'Mark as Dropped'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
};

export default CourseStudentReports;
