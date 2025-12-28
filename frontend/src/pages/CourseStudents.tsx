import { useMemo, useState, useEffect } from 'react';
import { formatDate, formatDateTime } from '@/lib/utils';
import { useSearchParams } from 'react-router-dom';
import { useReactTable, getCoreRowModel, type PaginationState } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSpinner } from '@/components/ui/loading';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  useCourseStudents,
  useDeleteCourseStudent,
  useMarkCompleted,
  useMarkDropped,
  useIssueCertificate,
  useCopyToMain,
} from '@/hooks/useCourseStudents';
import { useShortTermCourses } from '@/hooks/useShortTermCourses';
import { CourseStudentFormDialog } from '@/components/short-term-courses/CourseStudentFormDialog';
import { EnrollFromMainDialog } from '@/components/short-term-courses/EnrollFromMainDialog';
import { CourseStudentDetailsPanel } from '@/components/short-term-courses/CourseStudentDetailsPanel';
import { AssignToCourseDialog } from '@/components/short-term-courses/AssignToCourseDialog';
import type { CourseStudent } from '@/types/domain/courseStudent';
import type { ShortTermCourse } from '@/types/domain/shortTermCourse';
import {
  AlertTriangle,
  GraduationCap,
  RefreshCw,
  Users,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  Award,
  Copy,
  UserPlus,
  BookOpen,
  Eye,
  ArrowRight,
} from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { CourseStudentPictureCell } from '@/components/short-term-courses/CourseStudentPictureCell';

const statusBadge: Record<string, string> = {
  enrolled: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200',
  dropped: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200',
  failed: 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-200',
};

interface StudentRowProps {
  student: CourseStudent;
  onEdit: (student: CourseStudent) => void;
  onDelete: (student: CourseStudent) => void;
  onMarkCompleted: (student: CourseStudent) => void;
  onMarkDropped: (student: CourseStudent) => void;
  onIssueCertificate: (student: CourseStudent) => void;
  onCopyToMain: (student: CourseStudent) => void;
  onViewDetails: (student: CourseStudent) => void;
}

const StudentRow = ({
  student,
  onEdit,
  onDelete,
  onMarkCompleted,
  onMarkDropped,
  onIssueCertificate,
  onCopyToMain,
  onViewDetails,
  courses,
  allStudents,
}: StudentRowProps & { courses?: ShortTermCourse[]; allStudents?: CourseStudent[] }) => {
  const { t } = useLanguage();
  const course = courses?.find((c) => c.id === student.courseId);
  
  // Find all courses this student is enrolled in (by main_student_id or matching name/father name)
  const studentCourses = useMemo(() => {
    if (!allStudents || !courses) return [];
    return allStudents
      .filter(s => 
        s.id !== student.id && 
        (s.mainStudentId === student.mainStudentId || 
         (s.mainStudentId && student.mainStudentId && s.mainStudentId === student.mainStudentId) ||
         (s.fullName === student.fullName && s.fatherName === student.fatherName))
      )
      .map(s => courses.find(c => c.id === s.courseId))
      .filter(Boolean) as ShortTermCourse[];
  }, [allStudents, courses, student]);
  
  return (
    <TableRow 
      key={`course-student-${student.id}`}
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => onViewDetails(student)}
    >
      <TableCell>
        <CourseStudentPictureCell student={student} size="md" />
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
        <div className="flex flex-col gap-1">
          {course?.name || '-'}
          {studentCourses.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {studentCourses.slice(0, 2).map((c, idx) => (
                <Badge key={`course-badge-${student.id}-${c.id}-${idx}`} variant="outline" className="text-xs">
                  {c.name}
                </Badge>
              ))}
              {studentCourses.length > 2 && (
                <Badge key={`course-badge-more-${student.id}`} variant="outline" className="text-xs">
                  +{studentCourses.length - 2} {t('common.more') || 'more'}
                </Badge>
              )}
            </div>
          )}
        </div>
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
        {student.certificateIssued && (
                          <Badge variant="outline" className="ml-1 bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200">
                            <Award className="h-3 w-3 mr-1" />
                            {t('courses.certified')}
                          </Badge>
        )}
      </TableCell>
      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onViewDetails(student)}>
              <Eye className="mr-2 h-4 w-4" />
              {t('courses.viewDetails')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onEdit(student)}>
              <Pencil className="mr-2 h-4 w-4" />
              {t('courses.edit')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {student.completionStatus === 'enrolled' && (
              <>
                <DropdownMenuItem onClick={() => onMarkCompleted(student)}>
                  <CheckCircle className="mr-2 h-4 w-4 text-emerald-500" />
                  {t('courses.markCompleted')} ({course?.name || t('courses.unknownCourse')})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onMarkDropped(student)}>
                  <XCircle className="mr-2 h-4 w-4 text-amber-500" />
                  {t('courses.markDropped')} ({course?.name || t('courses.unknownCourse')})
                </DropdownMenuItem>
              </>
            )}
            {student.completionStatus === 'completed' && !student.certificateIssued && (
              <DropdownMenuItem onClick={() => onIssueCertificate(student)}>
                <Award className="mr-2 h-4 w-4 text-purple-500" />
                {t('courses.issueCertificate')}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {!student.mainStudentId && (
              <DropdownMenuItem onClick={() => onCopyToMain(student)}>
                <Copy className="mr-2 h-4 w-4" />
                {t('courses.copyToMain')}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(student)} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              {t('courses.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};

const CourseStudents = () => {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const courseIdFromUrl = searchParams.get('courseId');

  const [status, setStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>(courseIdFromUrl || 'all');

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<CourseStudent | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<CourseStudent | null>(null);
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<ShortTermCourse | null>(null);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [studentToCopy, setStudentToCopy] = useState<CourseStudent | null>(null);
  const [detailsPanelOpen, setDetailsPanelOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<CourseStudent | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  // Update selectedCourseId when URL param changes
  useEffect(() => {
    if (courseIdFromUrl) {
      setSelectedCourseId(courseIdFromUrl);
    }
  }, [courseIdFromUrl]);

  const effectiveCourseId = selectedCourseId === 'all' ? undefined : selectedCourseId;
  const { data: students, isLoading, error, pagination, page, pageSize, setPage, setPageSize, refetch } = useCourseStudents(effectiveCourseId, true);
  const { data: courses } = useShortTermCourses();
  // Get all students (not filtered) to check for multiple course enrollments
  const { data: allStudents } = useCourseStudents(undefined, false);
  
  // Type assertions to ensure domain types
  const typedStudents = (students || []) as CourseStudent[];
  const typedCourses = (courses || []) as ShortTermCourse[];
  const typedAllStudents = (allStudents || []) as CourseStudent[];

  const deleteMutation = useDeleteCourseStudent();
  const markCompletedMutation = useMarkCompleted();
  const markDroppedMutation = useMarkDropped();
  const issueCertificateMutation = useIssueCertificate();
  const copyToMainMutation = useCopyToMain();

  // Find the selected course object
  useEffect(() => {
    if (typedCourses && selectedCourseId && selectedCourseId !== 'all') {
      const course = typedCourses.find((c) => c.id === selectedCourseId);
      setSelectedCourse(course || null);
    } else {
      setSelectedCourse(null);
    }
  }, [typedCourses, selectedCourseId]);

  const filtered = useMemo(() => {
    return typedStudents.filter((student) => {
      const matchesStatus = status === 'all' || student.completionStatus === status;
      const matchesSearch =
        !search ||
        student.fullName.toLowerCase().includes(search.toLowerCase()) ||
        student.admissionNo.toLowerCase().includes(search.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [typedStudents, status, search]);

  const summary = useMemo(() => {
    const total = filtered.length;
    const completed = filtered.filter((s) => s.completionStatus === 'completed').length;
    const enrolled = filtered.filter((s) => s.completionStatus === 'enrolled').length;
    const dropped = filtered.filter((s) => s.completionStatus === 'dropped').length;
    return { total, completed, enrolled, dropped };
  }, [filtered]);

  const paginationState: PaginationState = {
    pageIndex: page - 1,
    pageSize,
  };

  const table = useReactTable({
    data: filtered,
    columns: [{ id: 'name', header: t('students.name'), cell: () => null }],
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

  const handleCreate = () => {
    setEditingStudent(null);
    setFormDialogOpen(true);
  };

  const handleEdit = (student: CourseStudent) => {
    setEditingStudent(student);
    setFormDialogOpen(true);
  };

  const handleDeleteClick = (student: CourseStudent) => {
    setStudentToDelete(student);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (studentToDelete) {
      await deleteMutation.mutateAsync(studentToDelete.id);
      setDeleteDialogOpen(false);
      setStudentToDelete(null);
    }
  };

  const handleMarkCompleted = async (student: CourseStudent) => {
    await markCompletedMutation.mutateAsync({ id: student.id });
  };

  const handleMarkDropped = async (student: CourseStudent) => {
    await markDroppedMutation.mutateAsync(student.id);
  };

  const handleIssueCertificate = async (student: CourseStudent) => {
    await issueCertificateMutation.mutateAsync(student.id);
  };

  const handleCopyClick = (student: CourseStudent) => {
    setStudentToCopy(student);
    setCopyDialogOpen(true);
  };

  const handleCopyConfirm = async () => {
    if (studentToCopy) {
      await copyToMainMutation.mutateAsync({
        id: studentToCopy.id,
        data: { generate_new_admission: true, link_to_course_student: true },
      });
      setCopyDialogOpen(false);
      setStudentToCopy(null);
    }
  };

  const handleViewDetails = (student: CourseStudent) => {
    setSelectedStudent(student);
    setDetailsPanelOpen(true);
  };

  const handleEnrollFromMain = () => {
    // If no course is selected, show a message or allow course selection in dialog
    if (!selectedCourse || selectedCourseId === 'all') {
      // If viewing all courses, we need to select a course first
      // For now, we'll show the dialog and let user know they need to select a course
      // Or we can update the dialog to allow course selection
      if (openCourses.length > 0) {
        // Use first open course as default, or show course selector in dialog
        const firstCourse = openCourses[0];
        if (firstCourse) {
          setSelectedCourse(firstCourse);
          setSelectedCourseId(firstCourse.id);
          setEnrollDialogOpen(true);
        }
      } else {
        // Show message that no open courses are available
        alert(t('courses.noOpenCoursesMessage'));
      }
    } else {
      setEnrollDialogOpen(true);
    }
  };

  const openCourses = typedCourses.filter((c) => c.status === 'open' || c.status === 'draft');

  return (
    <div className="container mx-auto max-w-7xl p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold leading-tight">{t('courses.courseStudents')}</h1>
          <p className="text-muted-foreground">
            {t('courses.manageEnrollments')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            {t('courses.addStudent')}
          </Button>
          {openCourses.length > 0 && (
            <>
              <Button variant="outline" onClick={handleEnrollFromMain}>
                <UserPlus className="mr-2 h-4 w-4" />
                {t('courses.enrollFromMain')}
              </Button>
              <Button variant="outline" onClick={() => setAssignDialogOpen(true)}>
                <ArrowRight className="mr-2 h-4 w-4" />
                {t('courses.assignToNewCourse')}
              </Button>
            </>
          )}
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('common.refresh')}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('common.total')}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-bold">{summary.total}</div>
            <Users className="h-6 w-6 text-blue-500" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('courses.enrolled')}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-bold">{summary.enrolled}</div>
            <BookOpen className="h-6 w-6 text-slate-500" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('courses.completed')}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-bold">{summary.completed}</div>
            <GraduationCap className="h-6 w-6 text-emerald-500" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('courses.dropped')}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-bold">{summary.dropped}</div>
            <AlertTriangle className="h-6 w-6 text-amber-500" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="space-y-1 pb-3">
          <CardTitle className="text-lg font-semibold">{t('courses.studentRoster')}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t('courses.filterByCourseStatus')}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>{t('courses.course')}</Label>
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
              <Label>{t('courses.status')}</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder={t('courses.all')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('courses.all')}</SelectItem>
                  <SelectItem value="enrolled">{t('courses.enrolled')}</SelectItem>
                  <SelectItem value="completed">{t('courses.completed')}</SelectItem>
                  <SelectItem value="dropped">{t('courses.dropped')}</SelectItem>
                  <SelectItem value="failed">{t('courses.failed')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>{t('common.search')}</Label>
              <Input
                placeholder={t('courses.nameOrAdmission')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-2">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-destructive font-medium">{t('courses.errorLoadingStudents')}</p>
              <p className="text-xs text-muted-foreground">{error instanceof Error ? error.message : t('common.unexpectedError')}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('courses.retry')}
              </Button>
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead></TableHead>
                        <TableHead>{t('students.name')}</TableHead>
                        <TableHead>{t('students.fatherName')}</TableHead>
                        <TableHead>{t('students.admissionNo')}</TableHead>
                      <TableHead className="hidden lg:table-cell">{t('courses.course')}</TableHead>
                      <TableHead className="hidden lg:table-cell">{t('students.guardianName')}</TableHead>
                      <TableHead className="hidden lg:table-cell">{t('students.phone')}</TableHead>
                      <TableHead className="hidden md:table-cell">{t('students.birthYear')}</TableHead>
                      <TableHead className="hidden md:table-cell">{t('students.age')}</TableHead>
                      <TableHead className="hidden md:table-cell">{t('courses.registration')}</TableHead>
                      <TableHead>{t('courses.status')}</TableHead>
                      <TableHead className="text-right w-[50px]">{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length ? (
                      filtered.map((student) => (
                        <StudentRow
                          key={student.id}
                          student={student}
                          courses={typedCourses}
                          allStudents={typedAllStudents}
                          onEdit={handleEdit}
                          onDelete={handleDeleteClick}
                          onMarkCompleted={handleMarkCompleted}
                          onMarkDropped={handleMarkDropped}
                          onIssueCertificate={handleIssueCertificate}
                          onCopyToMain={handleCopyClick}
                          onViewDetails={handleViewDetails}
                        />
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={12} className="py-8 text-center text-muted-foreground">
                          {typedStudents.length === 0 
                            ? t('courses.noCourseStudentsFound')
                            : t('courses.noStudentsMatchFilters')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {pagination && pagination.total > 0 && (
                <DataTablePagination
                  table={table}
                  paginationMeta={pagination}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  showPageSizeSelector
                  showTotalCount
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      <CourseStudentFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        student={editingStudent}
        courseId={effectiveCourseId}
        onSuccess={() => {
          // Reset to page 1 to see newly created student (sorted by registration_date desc)
          setPage(1);
          refetch();
        }}
      />

      <EnrollFromMainDialog
        open={enrollDialogOpen}
        onOpenChange={setEnrollDialogOpen}
        course={selectedCourse || undefined}
        courses={openCourses}
        onSuccess={() => refetch()}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('students.deleteStudent')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('students.deleteConfirm')} "{studentToDelete?.fullName}"? {t('common.unexpectedError')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('courses.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('courses.copyToMain')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('courses.copyToMain')}: "{studentToCopy?.fullName}". {t('courses.manageEnrollments')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleCopyConfirm}>{t('courses.copyToMain')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CourseStudentDetailsPanel
        open={detailsPanelOpen}
        onOpenChange={setDetailsPanelOpen}
        student={selectedStudent}
      />

      <AssignToCourseDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        onSuccess={() => refetch()}
      />
    </div>
  );
};

export default CourseStudents;
