import { useMemo, useState } from 'react';
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
  useShortTermCourses,
  useDeleteShortTermCourse,
  useCloseCourse,
  useReopenCourse,
} from '@/hooks/useShortTermCourses';
import { ShortTermCourseFormDialog } from '@/components/short-term-courses/ShortTermCourseFormDialog';
import type { ShortTermCourse } from '@/types/domain/shortTermCourse';
import {
  CalendarRange,
  Filter,
  RefreshCw,
  School,
  Users,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Lock,
  Unlock,
  Eye,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const statusTone: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200',
  open: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200',
  closed: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200',
  completed: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200',
};

interface CourseRowProps {
  course: ShortTermCourse;
  onEdit: (course: ShortTermCourse) => void;
  onDelete: (course: ShortTermCourse) => void;
  onClose: (course: ShortTermCourse) => void;
  onReopen: (course: ShortTermCourse) => void;
  onViewStudents: (course: ShortTermCourse) => void;
}

const CourseRow = ({ course, onEdit, onDelete, onClose, onReopen, onViewStudents }: CourseRowProps) => {
  const tone = statusTone[course.status] || 'bg-muted text-muted-foreground';
  return (
    <TableRow>
      <TableCell>
        <div className="flex flex-col gap-1">
          <div className="font-semibold leading-tight">{course.name}</div>
          {course.location && <span className="text-xs text-muted-foreground">{course.location}</span>}
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell">{course.instructorName || '—'}</TableCell>
      <TableCell className="hidden md:table-cell">
        <div className="text-sm">{course.startDate || '—'} → {course.endDate || '—'}</div>
        {course.durationDays && <div className="text-xs text-muted-foreground">{course.durationDays} days</div>}
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={tone}>
          {course.status}
        </Badge>
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
            <DropdownMenuItem onClick={() => onViewStudents(course)}>
              <Eye className="mr-2 h-4 w-4" />
              View Students
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(course)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {course.status !== 'closed' && course.status !== 'completed' && (
              <DropdownMenuItem onClick={() => onClose(course)}>
                <Lock className="mr-2 h-4 w-4" />
                Close Course
              </DropdownMenuItem>
            )}
            {course.status === 'closed' && (
              <DropdownMenuItem onClick={() => onReopen(course)}>
                <Unlock className="mr-2 h-4 w-4" />
                Reopen Course
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(course)} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};

const ShortTermCourses = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<ShortTermCourse | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<ShortTermCourse | null>(null);

  const { data: courses, isLoading, pagination, setPage, setPageSize, page, pageSize, refetch } = useShortTermCourses(undefined, true);

  const deleteMutation = useDeleteShortTermCourse();
  const closeMutation = useCloseCourse();
  const reopenMutation = useReopenCourse();

  const filteredCourses = useMemo(() => {
    return (courses || []).filter((course) => {
      const matchesStatus = status === 'all' || course.status === status;
      const start = dateFrom ? new Date(dateFrom).getTime() : null;
      const end = dateTo ? new Date(dateTo).getTime() : null;
      const courseStart = course.startDate ? new Date(course.startDate).getTime() : null;
      const withinRange =
        (!start || (courseStart && courseStart >= start)) &&
        (!end || (courseStart && courseStart <= end));
      return matchesStatus && withinRange;
    });
  }, [courses, status, dateFrom, dateTo]);

  const summary = useMemo(() => {
    const total = filteredCourses.length;
    const open = filteredCourses.filter((c) => c.status === 'open').length;
    const draft = filteredCourses.filter((c) => c.status === 'draft').length;
    const closed = filteredCourses.filter((c) => c.status === 'closed').length;
    const completed = filteredCourses.filter((c) => c.status === 'completed').length;
    return { total, open, draft, closed, completed };
  }, [filteredCourses]);

  const paginationState: PaginationState = {
    pageIndex: page - 1,
    pageSize,
  };

  const table = useReactTable({
    data: filteredCourses,
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
    setEditingCourse(null);
    setFormDialogOpen(true);
  };

  const handleEdit = (course: ShortTermCourse) => {
    setEditingCourse(course);
    setFormDialogOpen(true);
  };

  const handleDeleteClick = (course: ShortTermCourse) => {
    setCourseToDelete(course);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (courseToDelete) {
      await deleteMutation.mutateAsync(courseToDelete.id);
      setDeleteDialogOpen(false);
      setCourseToDelete(null);
    }
  };

  const handleClose = async (course: ShortTermCourse) => {
    await closeMutation.mutateAsync(course.id);
  };

  const handleReopen = async (course: ShortTermCourse) => {
    await reopenMutation.mutateAsync(course.id);
  };

  const handleViewStudents = (course: ShortTermCourse) => {
    navigate(`/course-students?courseId=${course.id}`);
  };

  return (
    <div className="container mx-auto max-w-7xl p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold leading-tight">Short-term courses</h1>
          <p className="text-muted-foreground">Manage short-term courses, enrollments, and completions.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New Course
          </Button>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-bold">{summary.open}</div>
            <School className="h-6 w-6 text-emerald-500" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Draft</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-bold">{summary.draft}</div>
            <Filter className="h-6 w-6 text-slate-500" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Closed</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-bold">{summary.closed}</div>
            <CalendarRange className="h-6 w-6 text-amber-500" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-bold">{summary.completed}</div>
            <Users className="h-6 w-6 text-indigo-500" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="space-y-1 pb-3">
          <CardTitle className="text-lg font-semibold">Course list</CardTitle>
          <p className="text-sm text-muted-foreground">All short-term courses with filters and actions.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start from</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Start to</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button variant="outline" className="w-full" onClick={() => {
                setStatus('all');
                setDateFrom('');
                setDateTo('');
              }}>
                Clear filters
              </Button>
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
                      <TableHead>Course</TableHead>
                      <TableHead className="hidden md:table-cell">Instructor</TableHead>
                      <TableHead className="hidden md:table-cell">Dates</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right w-[50px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCourses.length ? (
                      filteredCourses.map((course) => (
                        <CourseRow
                          key={course.id}
                          course={course}
                          onEdit={handleEdit}
                          onDelete={handleDeleteClick}
                          onClose={handleClose}
                          onReopen={handleReopen}
                          onViewStudents={handleViewStudents}
                        />
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                          No courses found
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

      <ShortTermCourseFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        course={editingCourse}
        onSuccess={() => refetch()}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{courseToDelete?.name}"? This action cannot be undone
              and will remove all associated student enrollments.
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
    </div>
  );
};

export default ShortTermCourses;
