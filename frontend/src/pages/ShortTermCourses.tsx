import { useReactTable, getCoreRowModel, type PaginationState } from '@tanstack/react-table';
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
import { useMemo, useState } from 'react';

import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { ShortTermCourseFormDialog } from '@/components/short-term-courses/ShortTermCourseFormDialog';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCourseStudents } from '@/hooks/useCourseStudents';
import { useLanguage } from '@/hooks/useLanguage';
import {
  useShortTermCourses,
  useDeleteShortTermCourse,
  useCloseCourse,
  useReopenCourse,
} from '@/hooks/useShortTermCourses';
import { formatDate, formatDateTime, formatCurrency } from '@/lib/utils';
import type { CourseStudent } from '@/types/domain/courseStudent';
import type { ShortTermCourse } from '@/types/domain/shortTermCourse';

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
  const { t } = useLanguage();
  const tone = statusTone[course.status] || 'bg-muted text-muted-foreground';
  const statusLabels: Record<string, string> = {
    draft: t('status.draft'),
    open: t('common.open'),
    closed: t('courses.closed'),
    completed: t('courses.completed'),
  };
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
        <div className="text-sm">
          {course.startDate 
            ? formatDate(course.startDate)
            : '—'
          } → {
          course.endDate 
            ? formatDate(course.endDate)
            : '—'
          }
        </div>
        {course.durationDays && <div className="text-xs text-muted-foreground">{course.durationDays} {t('events.days')}</div>}
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={tone}>
          {statusLabels[course.status] || course.status}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" aria-label={t('events.actions')}>
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">{t('events.actions')}</span>
              </Button>
            </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onViewStudents(course)}>
              <Eye className="mr-2 h-4 w-4" />
              {t('courses.viewStudents')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(course)}>
              <Pencil className="mr-2 h-4 w-4" />
              {t('events.edit')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {course.status !== 'closed' && course.status !== 'completed' && (
              <DropdownMenuItem onClick={() => onClose(course)}>
                <Lock className="mr-2 h-4 w-4" />
                {t('courses.closeCourse')}
              </DropdownMenuItem>
            )}
            {course.status === 'closed' && (
              <DropdownMenuItem onClick={() => onReopen(course)}>
                <Unlock className="mr-2 h-4 w-4" />
                {t('courses.reopenCourse')}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(course)} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              {t('events.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
};

const ShortTermCourses = () => {
  const { t } = useLanguage();
  const [status, setStatus] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<ShortTermCourse | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<ShortTermCourse | null>(null);
  const [studentsPanelOpen, setStudentsPanelOpen] = useState(false);
  const [selectedCourseForStudents, setSelectedCourseForStudents] = useState<ShortTermCourse | null>(null);

  const { data: courses, isLoading, pagination, setPage, setPageSize, page, pageSize, refetch } = useShortTermCourses(undefined, true);

  const deleteMutation = useDeleteShortTermCourse();
  const closeMutation = useCloseCourse();
  const reopenMutation = useReopenCourse();

  // Fetch students for the selected course when panel is open
  const { data: courseStudents = [], isLoading: studentsLoading } = useCourseStudents(
    selectedCourseForStudents?.id,
    false
  );

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
    columns: [{ id: 'name', header: t('courses.courseName'), cell: () => null }],
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
    setSelectedCourseForStudents(course);
    setStudentsPanelOpen(true);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">{t('events.title')}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1 hidden md:block">
                {t('hostel.subtitle')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Button onClick={handleCreate} className="w-full sm:w-auto">
                <Plus className="h-4 w-4" />
                <span className="ml-2">{t('courses.createCourse')}</span>
              </Button>
              <Button variant="outline" onClick={() => refetch()} className="w-full sm:w-auto">
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">{t('events.refresh')}</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('common.open')}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-bold">{summary.open}</div>
            <School className="h-6 w-6 text-emerald-500" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('status.draft')}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-bold">{summary.draft}</div>
            <Filter className="h-6 w-6 text-slate-500" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('courses.closed')}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-bold">{summary.closed}</div>
            <CalendarRange className="h-6 w-6 text-amber-500" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('courses.completed')}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-bold">{summary.completed}</div>
            <Users className="h-6 w-6 text-indigo-500" />
          </CardContent>
        </Card>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1 pb-3">
          <CardTitle className="text-lg font-semibold">{t('courses.courseList')}</CardTitle>
          <p className="text-sm text-muted-foreground hidden md:block">{t('hostel.subtitle')}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>{t('events.status')}</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder={t('courses.allStatuses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('subjects.all')}</SelectItem>
                  <SelectItem value="open">{t('common.open')}</SelectItem>
                  <SelectItem value="draft">{t('status.draft')}</SelectItem>
                  <SelectItem value="closed">{t('courses.closed')}</SelectItem>
                  <SelectItem value="completed">{t('courses.completed')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('courses.startFrom')}</Label>
              <CalendarDatePicker date={dateFrom ? new Date(dateFrom) : undefined} onDateChange={(date) => setDateFrom(date ? date.toISOString().split("T")[0] : "")} />
            </div>
            <div className="space-y-2">
              <Label>{t('courses.startTo')}</Label>
              <CalendarDatePicker date={dateTo ? new Date(dateTo) : undefined} onDateChange={(date) => setDateTo(date ? date.toISOString().split("T")[0] : "")} />
            </div>
            <div className="flex items-end">
              <Button variant="outline" className="w-full" onClick={() => {
                setStatus('all');
                setDateFrom('');
                setDateTo('');
              }}>
                {t('events.clearFilters')}
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <LoadingSpinner />
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('courses.courseName')}</TableHead>
                      <TableHead className="hidden md:table-cell">{t('courses.instructorName')}</TableHead>
                      <TableHead className="hidden md:table-cell">{t('events.dates')}</TableHead>
                      <TableHead>{t('events.status')}</TableHead>
                      <TableHead className="w-[50px]">{t('events.actions')}</TableHead>
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
                          {t('courses.noCoursesFound')}
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
        onSuccess={() => {
          // Reset to page 1 to see the newly created course
          if (!editingCourse) {
            setPage(1);
          }
          refetch();
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('courses.deleteCourse')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('assets.deleteConfirm')} "{courseToDelete?.name}"? This action cannot be undone
              and will remove all associated student enrollments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('events.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('events.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Students Side Panel */}
      <Sheet open={studentsPanelOpen} onOpenChange={setStudentsPanelOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle className="text-xl font-bold">
              {selectedCourseForStudents ? selectedCourseForStudents.name : t('courses.courseStudents')}
            </SheetTitle>
            {selectedCourseForStudents && (
              <SheetDescription className="mt-2">
                {t('courses.viewManageStudents')}
              </SheetDescription>
            )}
          </SheetHeader>

          {/* Course Info & Stats */}
          {selectedCourseForStudents && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg border">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('students.totalStudents')}</p>
                  <p className="text-lg font-semibold">{courseStudents.length}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('courses.enrolled')}</p>
                  <p className="text-lg font-semibold text-blue-600">
                    {courseStudents.filter(s => s.completionStatus === 'enrolled').length}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('courses.completed')}</p>
                  <p className="text-lg font-semibold text-emerald-600">
                    {courseStudents.filter(s => s.completionStatus === 'completed').length}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('studentReportCard.certificates')}</p>
                  <p className="text-lg font-semibold text-purple-600">
                    {courseStudents.filter(s => s.certificateIssued).length}
                  </p>
                </div>
              </div>
              {selectedCourseForStudents.startDate && selectedCourseForStudents.endDate && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-muted-foreground">
                    {t('courses.coursePeriod')}: {formatDate(selectedCourseForStudents.startDate)} → {formatDate(selectedCourseForStudents.endDate)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Students List */}
          <div className="mt-6 space-y-4">
            {studentsLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <LoadingSpinner />
                <p className="mt-4 text-sm text-muted-foreground">{t('courses.loadingStudents')}</p>
              </div>
            ) : courseStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-6 mb-4">
                  <Users className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{t('courses.noStudentsEnrolled')}</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  {t('courses.noStudentsEnrolledMessage')}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {courseStudents.map((student: CourseStudent) => {
                  const statusColors: Record<string, { bg: string; text: string }> = {
                    enrolled: { bg: 'bg-blue-50 dark:bg-blue-950', text: 'text-blue-700 dark:text-blue-300' },
                    completed: { bg: 'bg-emerald-50 dark:bg-emerald-950', text: 'text-emerald-700 dark:text-emerald-300' },
                    dropped: { bg: 'bg-red-50 dark:bg-red-950', text: 'text-red-700 dark:text-red-300' },
                    failed: { bg: 'bg-amber-50 dark:bg-amber-950', text: 'text-amber-700 dark:text-amber-300' },
                  };

                  const statusStyle = statusColors[student.completionStatus] || { bg: 'bg-muted', text: 'text-muted-foreground' };

                  return (
                    <Card key={student.id} className="overflow-hidden hover:shadow-md transition-shadow">
                      <div className={`${statusStyle.bg} px-4 py-3 border-b`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-base truncate">{student.fullName}</h4>
                            {student.fatherName && (
                              <p className="text-sm text-muted-foreground mt-0.5">{t('courses.father')} {student.fatherName}</p>
                            )}
                          </div>
                          <div className="ml-4 flex flex-col gap-1.5 items-end">
                            <Badge
                              variant="outline"
                              className={`${statusStyle.text} border-current font-medium`}
                            >
                              {student.completionStatus.charAt(0).toUpperCase() + student.completionStatus.slice(1)}
                            </Badge>
                            {student.certificateIssued && (
                              <Badge variant="outline" className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200 border-purple-300 dark:border-purple-700">
                                <span className="flex items-center gap-1">
                                  <span>✓</span> Certificate
                                </span>
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {/* Student Details Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-muted-foreground">{t('examReports.admissionNo')}</span>
                              <span className="ml-2 font-medium">{student.admissionNo}</span>
                            </div>
                            {student.registrationDate && (
                              <div>
                                <span className="text-muted-foreground">{t('courses.registered')}</span>
                                <span className="ml-2 font-medium">
                                  {formatDate(student.registrationDate)}
                                </span>
                              </div>
                            )}
                            {student.completionDate && (
                              <div>
                                <span className="text-muted-foreground">{t('courses.completedLabel')}</span>
                                <span className="ml-2 font-medium">
                                  {formatDate(student.completionDate)}
                                </span>
                              </div>
                            )}
                            {student.grade && (
                              <div>
                                <span className="text-muted-foreground">{t('studentReportCard.grade')}</span>
                                <span className="ml-2 font-medium">{student.grade}</span>
                              </div>
                            )}
                          </div>

                          {/* Guardian Info */}
                          {student.guardianName && (
                            <div className="pt-2 border-t">
                              <p className="text-sm">
                                <span className="text-muted-foreground">{t('courses.guardian')}</span>
                                <span className="ml-2 font-medium">{student.guardianName}</span>
                                {student.guardianRelation && (
                                  <span className="text-muted-foreground ml-2">({student.guardianRelation})</span>
                                )}
                                {student.guardianPhone && (
                                  <span className="text-muted-foreground ml-2">• {student.guardianPhone}</span>
                                )}
                              </p>
                            </div>
                          )}

                          {/* Fee Information */}
                          {student.feePaid && student.feeAmount && (
                            <div className="pt-2 border-t">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">{t('courses.feePayment')}</span>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700">
                                    {t('courses.paid')}
                                  </Badge>
                                  <span className="text-sm font-semibold">
                                    {formatCurrency(student.feeAmount)} AFN
                                  </span>
                                </div>
                              </div>
                              {student.feePaidDate && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {t('courses.paidOn')} {formatDate(student.feePaidDate)}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default ShortTermCourses;
