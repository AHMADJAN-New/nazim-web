import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { BarChart3, CalendarRange, Download, Filter, Loader2, RefreshCcw, CheckCircle2, Clock, XCircle, AlertCircle, FileText, Calendar, TrendingUp } from 'lucide-react';
import { useLeaveRequests } from '@/hooks/useLeaveRequests';
import { useStudents } from '@/hooks/useStudents';
import { useClasses } from '@/hooks/useClasses';
import { useSchools } from '@/hooks/useSchools';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import type { LeaveRequest } from '@/types/domain/leave';

const statusChips: Array<{ value: LeaveRequest['status']; label: string; color: string }> = [
  { value: 'approved', label: 'Approved', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'pending', label: 'Pending', color: 'bg-amber-100 text-amber-800' },
  { value: 'rejected', label: 'Rejected', color: 'bg-rose-100 text-rose-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-slate-100 text-slate-700' },
];

export default function LeaveReports() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [statusFilter, setStatusFilter] = useState<'all' | LeaveRequest['status']>('all');
  const [studentId, setStudentId] = useState<string>('');
  const [classId, setClassId] = useState<string>('');
  const [schoolId, setSchoolId] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { requests, pagination, page, setPage, pageSize, setPageSize, isLoading } = useLeaveRequests({
    status: statusFilter === 'all' ? undefined : statusFilter,
    studentId: studentId || undefined,
    classId: classId || undefined,
    schoolId: schoolId || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  const { data: students } = useStudents(undefined, false);
  const { data: classes } = useClasses();
  const { data: schools } = useSchools();

  const totals = useMemo(() => {
    const base = {
      total: requests.length,
      approved: 0,
      pending: 0,
      rejected: 0,
      cancelled: 0,
    };
    requests.forEach(req => {
      base[req.status] = (base[req.status] || 0) + 1;
    });
    return base;
  }, [requests]);

  const groupedByDate = useMemo(() => {
    const map: Record<string, LeaveRequest[]> = {};
    requests.forEach(req => {
      const key = format(req.startDate, 'yyyy-MM-dd');
      map[key] = map[key] || [];
      map[key].push(req);
    });
    return Object.entries(map)
      .map(([date, items]) => ({ date, items }))
      .sort((a, b) => (a.date > b.date ? -1 : 1));
  }, [requests]);

  const handleQuickRange = (range: 'today' | 'month' | 'clear') => {
    if (range === 'today') {
      setDateFrom(today);
      setDateTo(today);
      return;
    }
    if (range === 'month') {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setDateFrom(format(start, 'yyyy-MM-dd'));
      setDateTo(format(end, 'yyyy-MM-dd'));
      return;
    }
    setDateFrom('');
    setDateTo('');
  };

  const handleExportCsv = () => {
    if (!requests.length) {
      toast.error('No leave requests to export for the selected filters');
      return;
    }

    const header = 'Student,Code,Class,Start,End,Status,Reason';
    const rows = requests.map(req => [
      req.student?.fullName || '—',
      req.student?.studentCode || req.student?.admissionNo || '—',
      req.className || '—',
      format(req.startDate, 'yyyy-MM-dd'),
      format(req.endDate, 'yyyy-MM-dd'),
      req.status,
      (req.reason || '').replace(/\n|\r/g, ' '),
    ].join(','));

    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leave-report-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported');
  };

  // Filter requests by status for tabs
  const pendingRequests = useMemo(() => requests.filter(r => r.status === 'pending'), [requests]);
  const approvedRequests = useMemo(() => requests.filter(r => r.status === 'approved'), [requests]);
  const rejectedRequests = useMemo(() => requests.filter(r => r.status === 'rejected'), [requests]);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="bg-gradient-to-r from-indigo-600 to-sky-500 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <BarChart3 className="h-5 w-5" /> Leave Reports
          </CardTitle>
          <CardDescription className="text-indigo-100">
            Build daily, status, or date-range reports for student leaves.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Requests</CardDescription>
            <CardTitle className="text-3xl font-bold">{totals.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Approved
            </CardDescription>
            <CardTitle className="text-3xl font-bold text-emerald-600">{totals.approved}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              Pending
            </CardDescription>
            <CardTitle className="text-3xl font-bold text-amber-600">{totals.pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-rose-600" />
              Rejected
            </CardDescription>
            <CardTitle className="text-3xl font-bold text-rose-600">{totals.rejected}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters - Collapsible */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Report Filters
                  </CardTitle>
                  <CardDescription>Filter by status, student, class, or a date range to generate focused reports.</CardDescription>
                </div>
                <Button variant="ghost" size="sm">
                  {filtersOpen ? 'Hide Filters' : 'Show Filters'}
                </Button>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={val => setStatusFilter(val as any)}>
                  <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {statusChips.map(status => (
                      <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Student</Label>
                <Select value={studentId} onValueChange={setStudentId}>
                  <SelectTrigger><SelectValue placeholder="Any student" /></SelectTrigger>
                  <SelectContent>
                    {(students || []).map(student => (
                      <SelectItem key={student.id} value={student.id}>{student.fullName || student.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Class</Label>
                <Select value={classId} onValueChange={setClassId}>
                  <SelectTrigger><SelectValue placeholder="Any class" /></SelectTrigger>
                  <SelectContent>
                    {(classes || []).map(cls => (
                      <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>School</Label>
                <Select value={schoolId} onValueChange={setSchoolId}>
                  <SelectTrigger><SelectValue placeholder="Any school" /></SelectTrigger>
                  <SelectContent>
                    {(schools || []).map(school => (
                      <SelectItem key={school.id} value={school.id}>{school.schoolName || 'School'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>From</Label>
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>To</Label>
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Rows per page</Label>
                <Input type="number" min={10} max={100} value={pageSize} onChange={e => setPageSize(Number(e.target.value) || 10)} />
              </div>
              <div className="md:col-span-3 flex flex-wrap gap-2 items-center justify-between">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleQuickRange('today')}><CalendarRange className="h-4 w-4 mr-1" />Today</Button>
                  <Button variant="outline" size="sm" onClick={() => handleQuickRange('month')}><Filter className="h-4 w-4 mr-1" />This month</Button>
                  <Button variant="ghost" size="sm" onClick={() => handleQuickRange('clear')}><RefreshCcw className="h-4 w-4 mr-1" />Reset</Button>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={handleExportCsv}><Download className="h-4 w-4 mr-1" />Export CSV</Button>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Tabs for different views */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            All Requests
            {requests.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {requests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending
            {pendingRequests.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Approved
            {approvedRequests.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {approvedRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Rejected
            {rejectedRequests.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {rejectedRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="daily" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Daily Breakdown
          </TabsTrigger>
        </TabsList>

        {/* All Requests Tab */}
        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle>All Leave Requests</CardTitle>
                  <CardDescription>Complete listing of all leave requests.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{requests.length} entries</Badge>
                  <Button variant="outline" size="sm" onClick={handleExportCsv}>
                    <Download className="h-4 w-4 mr-1" /> Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && (
                      <TableRow><TableCell colSpan={4} className="text-center py-6 text-slate-500"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading</TableCell></TableRow>
                    )}
                    {!isLoading && requests.map(req => (
                      <TableRow key={req.id}>
                        <TableCell>
                          <div className="font-semibold">{req.student?.fullName || 'Student'}</div>
                          <div className="text-xs text-slate-500">{req.student?.studentCode || req.student?.admissionNo || '—'} · {req.className || 'Class'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{format(req.startDate, 'PP')} → {format(req.endDate, 'PP')}</div>
                          <div className="text-xs text-slate-500">{req.schoolName || 'School'}</div>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{req.status}</Badge></TableCell>
                        <TableCell className="max-w-[280px]"><div className="line-clamp-2 text-sm">{req.reason}</div></TableCell>
                      </TableRow>
                    ))}
                    {!isLoading && !requests.length && (
                      <TableRow><TableCell colSpan={4} className="text-center py-6 text-slate-500">No leave requests match these filters.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {pagination && (
                <div className="flex justify-between items-center mt-3 text-sm text-slate-600">
                  <span>Page {page} of {pagination.last_page}</span>
                  <div className="space-x-2">
                    <Button size="sm" variant="outline" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>Prev</Button>
                    <Button size="sm" variant="outline" onClick={() => setPage(page + 1)} disabled={page >= (pagination?.last_page || 1)}>Next</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Requests Tab */}
        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle>Pending Requests</CardTitle>
                  <CardDescription>Leave requests awaiting approval.</CardDescription>
                </div>
                <Badge variant="outline" className="text-xs">{pendingRequests.length} entries</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && (
                      <TableRow><TableCell colSpan={3} className="text-center py-6 text-slate-500"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading</TableCell></TableRow>
                    )}
                    {!isLoading && pendingRequests.map(req => (
                      <TableRow key={req.id}>
                        <TableCell>
                          <div className="font-semibold">{req.student?.fullName || 'Student'}</div>
                          <div className="text-xs text-slate-500">{req.student?.studentCode || req.student?.admissionNo || '—'} · {req.className || 'Class'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{format(req.startDate, 'PP')} → {format(req.endDate, 'PP')}</div>
                        </TableCell>
                        <TableCell className="max-w-[280px]"><div className="line-clamp-2 text-sm">{req.reason}</div></TableCell>
                      </TableRow>
                    ))}
                    {!isLoading && !pendingRequests.length && (
                      <TableRow><TableCell colSpan={3} className="text-center py-6 text-slate-500">No pending requests.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Approved Requests Tab */}
        <TabsContent value="approved" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle>Approved Requests</CardTitle>
                  <CardDescription>Leave requests that have been approved.</CardDescription>
                </div>
                <Badge variant="outline" className="text-xs">{approvedRequests.length} entries</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && (
                      <TableRow><TableCell colSpan={3} className="text-center py-6 text-slate-500"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading</TableCell></TableRow>
                    )}
                    {!isLoading && approvedRequests.map(req => (
                      <TableRow key={req.id}>
                        <TableCell>
                          <div className="font-semibold">{req.student?.fullName || 'Student'}</div>
                          <div className="text-xs text-slate-500">{req.student?.studentCode || req.student?.admissionNo || '—'} · {req.className || 'Class'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{format(req.startDate, 'PP')} → {format(req.endDate, 'PP')}</div>
                        </TableCell>
                        <TableCell className="max-w-[280px]"><div className="line-clamp-2 text-sm">{req.reason}</div></TableCell>
                      </TableRow>
                    ))}
                    {!isLoading && !approvedRequests.length && (
                      <TableRow><TableCell colSpan={3} className="text-center py-6 text-slate-500">No approved requests.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rejected Requests Tab */}
        <TabsContent value="rejected" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle>Rejected Requests</CardTitle>
                  <CardDescription>Leave requests that have been rejected.</CardDescription>
                </div>
                <Badge variant="outline" className="text-xs">{rejectedRequests.length} entries</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && (
                      <TableRow><TableCell colSpan={3} className="text-center py-6 text-slate-500"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading</TableCell></TableRow>
                    )}
                    {!isLoading && rejectedRequests.map(req => (
                      <TableRow key={req.id}>
                        <TableCell>
                          <div className="font-semibold">{req.student?.fullName || 'Student'}</div>
                          <div className="text-xs text-slate-500">{req.student?.studentCode || req.student?.admissionNo || '—'} · {req.className || 'Class'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{format(req.startDate, 'PP')} → {format(req.endDate, 'PP')}</div>
                        </TableCell>
                        <TableCell className="max-w-[280px]"><div className="line-clamp-2 text-sm">{req.reason}</div></TableCell>
                      </TableRow>
                    ))}
                    {!isLoading && !rejectedRequests.length && (
                      <TableRow><TableCell colSpan={3} className="text-center py-6 text-slate-500">No rejected requests.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Daily Breakdown Tab */}
        <TabsContent value="daily" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Breakdown</CardTitle>
              <CardDescription>Each day with status distribution.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-2">
                <div className="space-y-3">
                  {groupedByDate.map(group => {
                    const approved = group.items.filter(i => i.status === 'approved').length;
                    const pending = group.items.filter(i => i.status === 'pending').length;
                    const rejected = group.items.filter(i => i.status === 'rejected').length;
                    return (
                      <div key={group.date} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-semibold">{format(new Date(group.date), 'PP')}</div>
                          <Badge variant="outline" className="text-xs">{group.items.length} leave(s)</Badge>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <Badge variant="outline" className="bg-emerald-100 text-emerald-700">Approved {approved}</Badge>
                          <Badge variant="outline" className="bg-amber-100 text-amber-700">Pending {pending}</Badge>
                          <Badge variant="outline" className="bg-rose-100 text-rose-700">Rejected {rejected}</Badge>
                        </div>
                      </div>
                    );
                  })}
                  {!groupedByDate.length && (
                    <div className="text-center text-sm text-slate-500 py-8">No daily records to show</div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
