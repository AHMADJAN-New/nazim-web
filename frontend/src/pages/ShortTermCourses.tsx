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
import { useShortTermCourses } from '@/hooks/useShortTermCourses';
import type { ShortTermCourse } from '@/types/domain/shortTermCourse';
import { CalendarRange, Filter, RefreshCw, School, Users } from 'lucide-react';

const statusTone: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200',
  open: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200',
  closed: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200',
  completed: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200',
};

const CourseRow = ({ course }: { course: ShortTermCourse }) => {
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
    </TableRow>
  );
};

const ShortTermCourses = () => {
  const [status, setStatus] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: courses, isLoading, pagination, setPage, setPageSize, page, pageSize, refetch } = useShortTermCourses(undefined, true);

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

  return (
    <div className="container mx-auto max-w-7xl p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold leading-tight">Short-term courses</h1>
          <p className="text-muted-foreground">Unified design with crisp pagination and filters for quick oversight.</p>
        </div>
        <div className="flex flex-wrap gap-2">
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
          <p className="text-sm text-muted-foreground">Aligned spacing, concise filters, and responsive columns.</p>
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCourses.length ? (
                      filteredCourses.map((course) => <CourseRow key={course.id} course={course} />)
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
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
    </div>
  );
};

export default ShortTermCourses;
