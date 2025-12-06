import { useMemo, useState } from 'react';
import { useReactTable, getCoreRowModel, type PaginationState } from '@tanstack/react-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { LoadingSpinner } from '@/components/ui/loading';
import { useCourseStudents } from '@/hooks/useCourseStudents';
import { AlertTriangle, CheckCircle2, FileBadge2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CourseStudentReports = () => {
  const [tab, setTab] = useState<'enrollment' | 'completion' | 'discipline'>('enrollment');
  const { data: students, isLoading, pagination, page, pageSize, setPage, setPageSize, refetch } = useCourseStudents(undefined, true);

  const stats = useMemo(() => {
    const total = students?.length || 0;
    const completed = students?.filter((s) => s.completionStatus === 'completed').length || 0;
    const dropped = students?.filter((s) => s.completionStatus === 'dropped').length || 0;
    const enrolled = students?.filter((s) => s.completionStatus === 'enrolled').length || 0;
    return { total, completed, dropped, enrolled };
  }, [students]);

  const filtered = useMemo(() => {
    if (!students) return [];
    if (tab === 'completion') {
      return students.filter((s) => s.completionStatus === 'completed');
    }
    if (tab === 'discipline') {
      return students.filter((s) => s.completionStatus === 'dropped' || s.completionStatus === 'failed');
    }
    return students;
  }, [students, tab]);

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

  return (
    <div className="container mx-auto max-w-7xl p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold leading-tight">Course student reports</h1>
          <p className="text-muted-foreground">Tabbed reporting for consistent sizing, pagination, and UX clarity.</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Enrolled</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-bold">{stats.enrolled}</div>
            <Badge variant="secondary">Live</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-bold">{stats.completed}</div>
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Dropped/Failed</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-bold">{stats.dropped}</div>
            <AlertTriangle className="h-6 w-6 text-amber-500" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-bold">{stats.total}</div>
            <FileBadge2 className="h-6 w-6 text-indigo-500" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg font-semibold">Reports</CardTitle>
              <p className="text-sm text-muted-foreground">Segmented tabs keep the layout consistent across queries.</p>
            </div>
            {pagination && (
              <div className="text-sm text-muted-foreground">
                Page {page} of {pagination.last_page}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(value) => setTab(value as any)}>
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="enrollment">Enrollment</TabsTrigger>
              <TabsTrigger value="completion">Completion</TabsTrigger>
              <TabsTrigger value="discipline">Discipline</TabsTrigger>
            </TabsList>

            {isLoading ? (
              <div className="flex justify-center py-10">
                <LoadingSpinner />
              </div>
            ) : (
              <TabsContent value={tab} className="space-y-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead className="hidden md:table-cell">Admission</TableHead>
                        <TableHead className="hidden md:table-cell">Registered</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.length ? (
                        filtered.map((student) => (
                          <TableRow key={student.id}>
                            <TableCell>
                              <div className="font-semibold leading-tight">{student.fullName}</div>
                              {student.homeAddress && (
                                <div className="text-xs text-muted-foreground">{student.homeAddress}</div>
                              )}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                              {student.admissionNo}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm">{student.registrationDate}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{student.completionStatus}</Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                            No students in this segment
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
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default CourseStudentReports;
