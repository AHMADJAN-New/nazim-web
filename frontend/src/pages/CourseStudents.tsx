import { useMemo, useState, useEffect } from 'react';
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
} from 'lucide-react';

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
}

const StudentRow = ({
  student,
  onEdit,
  onDelete,
  onMarkCompleted,
  onMarkDropped,
  onIssueCertificate,
  onCopyToMain,
}: StudentRowProps) => {
  return (
    <TableRow>
      <TableCell>
        <div className="font-semibold leading-tight">{student.fullName}</div>
        {student.fatherName && (
          <div className="text-xs text-muted-foreground">S/O {student.fatherName}</div>
        )}
      </TableCell>
      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
        {student.admissionNo}
      </TableCell>
      <TableCell className="hidden md:table-cell text-sm">{student.registrationDate}</TableCell>
      <TableCell>
        <Badge variant="outline" className={statusBadge[student.completionStatus] || ''}>
          {student.completionStatus}
        </Badge>
        {student.certificateIssued && (
          <Badge variant="outline" className="ml-1 bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200">
            <Award className="h-3 w-3 mr-1" />
            Certified
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(student)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {student.completionStatus === 'enrolled' && (
              <>
                <DropdownMenuItem onClick={() => onMarkCompleted(student)}>
                  <CheckCircle className="mr-2 h-4 w-4 text-emerald-500" />
                  Mark Completed
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onMarkDropped(student)}>
                  <XCircle className="mr-2 h-4 w-4 text-amber-500" />
                  Mark Dropped
                </DropdownMenuItem>
              </>
            )}
            {student.completionStatus === 'completed' && !student.certificateIssued && (
              <DropdownMenuItem onClick={() => onIssueCertificate(student)}>
                <Award className="mr-2 h-4 w-4 text-purple-500" />
                Issue Certificate
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {!student.mainStudentId && (
              <DropdownMenuItem onClick={() => onCopyToMain(student)}>
                <Copy className="mr-2 h-4 w-4" />
                Copy to Main Students
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(student)} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};

const CourseStudents = () => {
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

  // Update selectedCourseId when URL param changes
  useEffect(() => {
    if (courseIdFromUrl) {
      setSelectedCourseId(courseIdFromUrl);
    }
  }, [courseIdFromUrl]);

  const effectiveCourseId = selectedCourseId === 'all' ? undefined : selectedCourseId;
  const { data: students, isLoading, pagination, page, pageSize, setPage, setPageSize, refetch } = useCourseStudents(effectiveCourseId, true);
  const { data: courses } = useShortTermCourses();

  const deleteMutation = useDeleteCourseStudent();
  const markCompletedMutation = useMarkCompleted();
  const markDroppedMutation = useMarkDropped();
  const issueCertificateMutation = useIssueCertificate();
  const copyToMainMutation = useCopyToMain();

  // Find the selected course object
  useEffect(() => {
    if (courses && selectedCourseId && selectedCourseId !== 'all') {
      const course = courses.find((c) => c.id === selectedCourseId);
      setSelectedCourse(course || null);
    } else {
      setSelectedCourse(null);
    }
  }, [courses, selectedCourseId]);

  const filtered = useMemo(() => {
    return (students || []).filter((student) => {
      const matchesStatus = status === 'all' || student.completionStatus === status;
      const matchesSearch =
        !search ||
        student.fullName.toLowerCase().includes(search.toLowerCase()) ||
        student.admissionNo.toLowerCase().includes(search.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [students, status, search]);

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

  const handleEnrollFromMain = () => {
    if (selectedCourse) {
      setEnrollDialogOpen(true);
    }
  };

  const openCourses = (courses || []).filter((c) => c.status === 'open' || c.status === 'draft');

  return (
    <div className="container mx-auto max-w-7xl p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold leading-tight">Course Students</h1>
          <p className="text-muted-foreground">
            Manage student enrollments, completions, and certificates.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Student
          </Button>
          {selectedCourse && selectedCourse.status === 'open' && (
            <Button variant="outline" onClick={handleEnrollFromMain}>
              <UserPlus className="mr-2 h-4 w-4" />
              Enroll from Main
            </Button>
          )}
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-bold">{summary.total}</div>
            <Users className="h-6 w-6 text-blue-500" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Enrolled</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-bold">{summary.enrolled}</div>
            <BookOpen className="h-6 w-6 text-slate-500" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-bold">{summary.completed}</div>
            <GraduationCap className="h-6 w-6 text-emerald-500" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Dropped</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-bold">{summary.dropped}</div>
            <AlertTriangle className="h-6 w-6 text-amber-500" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="space-y-1 pb-3">
          <CardTitle className="text-lg font-semibold">Student Roster</CardTitle>
          <p className="text-sm text-muted-foreground">
            Filter by course, status, or search by name/admission number.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Course</Label>
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder="All courses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {(courses || []).map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="enrolled">Enrolled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="dropped">Dropped</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Search</Label>
              <Input
                placeholder="Name or admission #"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <LoadingSpinner />
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden md:table-cell">Admission</TableHead>
                      <TableHead className="hidden md:table-cell">Registered</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right w-[50px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length ? (
                      filtered.map((student) => (
                        <StudentRow
                          key={student.id}
                          student={student}
                          onEdit={handleEdit}
                          onDelete={handleDeleteClick}
                          onMarkCompleted={handleMarkCompleted}
                          onMarkDropped={handleMarkDropped}
                          onIssueCertificate={handleIssueCertificate}
                          onCopyToMain={handleCopyClick}
                        />
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                          No course students found
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
            </>
          )}
        </CardContent>
      </Card>

      <CourseStudentFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        student={editingStudent}
        courseId={effectiveCourseId}
        onSuccess={() => refetch()}
      />

      {selectedCourse && (
        <EnrollFromMainDialog
          open={enrollDialogOpen}
          onOpenChange={setEnrollDialogOpen}
          course={selectedCourse}
          onSuccess={() => refetch()}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{studentToDelete?.fullName}"? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Copy to Main Students</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a new student record in the main students table based on "
              {studentToCopy?.fullName}". The course student will be linked to this new record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCopyConfirm}>Copy to Main</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CourseStudents;
