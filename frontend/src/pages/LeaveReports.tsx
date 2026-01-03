import { useMemo, useState } from 'react';
import { formatDate, formatDateTime } from '@/lib/utils';
import { format } from 'date-fns';
import { BarChart3, CalendarRange, Download, Filter, Loader2, RefreshCcw, CheckCircle2, Clock, XCircle, AlertCircle, FileText, Calendar, TrendingUp } from 'lucide-react';
import { useLeaveRequests } from '@/hooks/useLeaveRequests';
import { useStudentAdmissions } from '@/hooks/useStudentAdmissions';
import type { Student } from '@/types/domain/student';
import { useClasses } from '@/hooks/useClasses';
import { useSchools } from '@/hooks/useSchools';
import { useProfile } from '@/hooks/useProfiles';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FilterPanel } from '@/components/layout/FilterPanel';
import { showToast } from '@/lib/toast';
import { useLanguage } from '@/hooks/useLanguage';
import { useDatePreference } from '@/hooks/useDatePreference';
import { leaveRequestsApi, apiClient } from '@/lib/api/client';
import type { LeaveRequest } from '@/types/domain/leave';
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

export default function LeaveReports() {
  const { t, isRTL, language } = useLanguage();
  const { data: profile } = useProfile();
  const { calendar } = useDatePreference();
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [reportType, setReportType] = useState<'pdf' | 'excel'>('pdf');
  const [reportProgress, setReportProgress] = useState(0);
  const [reportStatus, setReportStatus] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const statusChips: Array<{ value: LeaveRequest['status']; label: string; color: string }> = [
    { value: 'approved', label: t('leave.approved'), color: 'bg-emerald-100 text-emerald-700' },
    { value: 'pending', label: t('leave.pending'), color: 'bg-amber-100 text-amber-800' },
    { value: 'rejected', label: t('leave.rejected'), color: 'bg-rose-100 text-rose-800' },
    { value: 'cancelled', label: t('leave.cancelled'), color: 'bg-slate-100 text-slate-700' },
  ];
  const today = format(new Date(), 'yyyy-MM-dd');
  const [statusFilter, setStatusFilter] = useState<'all' | LeaveRequest['status']>('all');
  const [studentId, setStudentId] = useState<string>('');
  const [classId, setClassId] = useState<string>('');
  const [schoolId, setSchoolId] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const { requests, pagination, page, setPage, pageSize, setPageSize, isLoading } = useLeaveRequests({
    status: statusFilter === 'all' ? undefined : statusFilter,
    studentId: studentId || undefined,
    classId: classId || undefined,
    schoolId: schoolId || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  const { data: studentAdmissions } = useStudentAdmissions(profile?.organization_id, false, {
    enrollment_status: 'active',
  });
  // Extract students from admissions
  const students: Student[] = useMemo(() => {
    if (!studentAdmissions || !Array.isArray(studentAdmissions)) return [];
    return studentAdmissions
      .map(admission => admission.student)
      .filter((student): student is Student => student !== null && student !== undefined);
  }, [studentAdmissions]);
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

  const handleGenerateReport = async (variant: 'all' | 'pending' | 'approved' | 'rejected' | 'daily') => {
    if (!requests.length && variant !== 'daily') {
      showToast.error(t('leave.noRequestsToExport'));
      return;
    }

    if (!profile?.default_school_id) {
      showToast.error(t('leave.schoolRequired') || 'School is required for report generation');
      return;
    }

    try {
      setIsGenerating(true);
      setShowProgressDialog(true);
      setReportProgress(0);
      setReportStatus('pending');

      // Map calendar type to backend format
      const calendarPreference = calendar === 'gregorian' ? 'gregorian' : calendar === 'hijri_shamsi' ? 'jalali' : 'qamari';
      // Map language code
      const langCode = language === 'en' ? 'en' : language === 'ps' ? 'ps' : language === 'fa' ? 'fa' : 'ar';

      const response = await leaveRequestsApi.generateReport({
        report_type: reportType,
        report_variant: variant,
        branding_id: profile.default_school_id,
        calendar_preference: calendarPreference,
        language: langCode,
        student_id: studentId || undefined,
        class_id: classId || undefined,
        school_id: schoolId || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });

      if (response.success && response.download_url) {
        // Report completed synchronously
        window.open(response.download_url, '_blank');
        setShowProgressDialog(false);
        setIsGenerating(false);
        showToast.success(t('leave.reportExported') || 'Report generated successfully');
      } else if (response.success && response.report_id) {
        // Report is being generated asynchronously - poll for status
        const pollStatus = async () => {
          try {
                        const statusResponse = await apiClient.get(`/reports/${response.report_id}/status`) as any;
                        const statusData = statusResponse;
                        
                        if (!statusData.success) {
                          throw new Error(statusData.error || 'Failed to get report status');
                        }
                        
                        if (statusData.status === 'completed' && statusData.download_url) {
                          window.open(statusData.download_url, '_blank');
                          setShowProgressDialog(false);
                          setIsGenerating(false);
                          showToast.success(t('leave.reportExported') || 'Report generated successfully');
                        } else if (statusData.status === 'failed') {
                          setShowProgressDialog(false);
                          setIsGenerating(false);
                          showToast.error(statusData.error_message || t('leave.reportGenerationFailed') || 'Failed to generate report');
                        } else {
                          // Update progress
                          setReportProgress(statusData.progress || 0);
                          setReportStatus(statusData.status);
                          // Continue polling
                          setTimeout(pollStatus, 1000);
                        }
                        } catch (error: any) {
                          setShowProgressDialog(false);
                          setIsGenerating(false);
                          showToast.error(error.message || t('leave.reportGenerationFailed') || 'Failed to check report status');
                        }
        };
        pollStatus();
      } else {
        setIsGenerating(false);
        throw new Error(response.error || 'Failed to generate report');
      }
    } catch (error: any) {
      setShowProgressDialog(false);
      setIsGenerating(false);
      showToast.error(error.message || t('leave.reportGenerationFailed') || 'Failed to generate report');
    }
  };

  // Filter requests by status for tabs
  const pendingRequests = useMemo(() => requests.filter(r => r.status === 'pending'), [requests]);
  const approvedRequests = useMemo(() => requests.filter(r => r.status === 'approved'), [requests]);
  const rejectedRequests = useMemo(() => requests.filter(r => r.status === 'rejected'), [requests]);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <PageHeader
        title={t('leave.reportsTitle')}
        description={t('leave.reportsSubtitle')}
        icon={<FileText className="h-5 w-5" />}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('leave.totalRequests')}</CardDescription>
            <CardTitle className="text-3xl font-bold">{totals.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              {t('leave.approved')}
            </CardDescription>
            <CardTitle className="text-3xl font-bold text-emerald-600">{totals.approved}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Clock className="h-4 w-4 text-amber-600" />
              {t('leave.pending')}
            </CardDescription>
            <CardTitle className="text-3xl font-bold text-amber-600">{totals.pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <XCircle className="h-4 w-4 text-rose-600" />
              {t('leave.rejected')}
            </CardDescription>
            <CardTitle className="text-3xl font-bold text-rose-600">{totals.rejected}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters - Using FilterPanel */}
      <FilterPanel title={t('leave.reportFilters')} defaultOpenDesktop={true} defaultOpenMobile={false}>
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>{t('leave.status')}</Label>
                <Select value={statusFilter} onValueChange={val => setStatusFilter(val as any)}>
                  <SelectTrigger><SelectValue placeholder={t('leave.allStatuses')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('leave.allStatus')}</SelectItem>
                    {statusChips.map(status => (
                      <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('leave.student')}</Label>
                <Select value={studentId} onValueChange={setStudentId}>
                  <SelectTrigger><SelectValue placeholder={t('leave.anyStudent')} /></SelectTrigger>
                  <SelectContent>
                    {(students || []).map(student => (
                      <SelectItem key={student.id} value={student.id}>{student.fullName || student.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('leave.class')}</Label>
                <Select value={classId} onValueChange={setClassId}>
                  <SelectTrigger><SelectValue placeholder={t('leave.anyClass')} /></SelectTrigger>
                  <SelectContent>
                    {(classes || []).map(cls => (
                      <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('leave.school')}</Label>
                <Select value={schoolId} onValueChange={setSchoolId}>
                  <SelectTrigger><SelectValue placeholder={t('leave.anySchool')} /></SelectTrigger>
                  <SelectContent>
                    {(schools || []).map(school => (
                      <SelectItem key={school.id} value={school.id}>{school.schoolName || t('leave.school')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('leave.from')}</Label>
                <CalendarDatePicker date={dateFrom ? new Date(dateFrom) : undefined} onDateChange={(date) => setDateFrom(date ? date.toISOString().split("T")[0] : "")} placeholder="Select date" />
              </div>
              <div className="space-y-2">
                <Label>{t('leave.to')}</Label>
                <CalendarDatePicker date={dateTo ? new Date(dateTo) : undefined} onDateChange={(date) => setDateTo(date ? date.toISOString().split("T")[0] : "")} placeholder="Select date" />
              </div>
              <div className="space-y-2">
                <Label>{t('leave.rowsPerPage')}</Label>
                <Input type="number" min={10} max={100} value={pageSize} onChange={e => setPageSize(Number(e.target.value) || 10)} />
              </div>
              <div className="lg:col-span-3 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleQuickRange('today')} className={`flex-shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <CalendarRange className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                    <span className="hidden sm:inline">{t('leave.today')}</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleQuickRange('month')} className={`flex-shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Filter className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                    <span className="hidden sm:inline">{t('leave.thisMonth')}</span>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleQuickRange('clear')} className={`flex-shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <RefreshCcw className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                    <span className="hidden sm:inline">{t('leave.resetFilters')}</span>
                  </Button>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Select value={reportType} onValueChange={(v) => setReportType(v as 'pdf' | 'excel')}>
                    <SelectTrigger className="w-28 sm:w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="excel">Excel</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="secondary" size="sm" onClick={() => handleGenerateReport('all')} disabled={isGenerating} className={`flex-shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    {isGenerating ? (
                      <Loader2 className={`h-4 w-4 animate-spin ${isRTL ? 'ml-1' : 'mr-1'}`} />
                    ) : (
                      <Download className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                    )}
                    <span className="hidden sm:inline">{t('leave.export') || 'Export'}</span>
                  </Button>
                </div>
              </div>
        </div>
      </FilterPanel>

      {/* Tabs for different views */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="w-full overflow-x-auto">
          <TabsTrigger value="all" className={`flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <FileText className="h-4 w-4" />
            {t('leave.allRequests')}
            {requests.length > 0 && (
              <Badge variant="secondary" className={`text-xs ${isRTL ? 'mr-1' : 'ml-1'}`}>
                {requests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pending" className={`flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Clock className="h-4 w-4" />
            {t('leave.pending')}
            {pendingRequests.length > 0 && (
              <Badge variant="secondary" className={`text-xs ${isRTL ? 'mr-1' : 'ml-1'}`}>
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved" className={`flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <CheckCircle2 className="h-4 w-4" />
            {t('leave.approved')}
            {approvedRequests.length > 0 && (
              <Badge variant="secondary" className={`text-xs ${isRTL ? 'mr-1' : 'ml-1'}`}>
                {approvedRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="rejected" className={`flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <XCircle className="h-4 w-4" />
            {t('leave.rejected')}
            {rejectedRequests.length > 0 && (
              <Badge variant="secondary" className={`text-xs ${isRTL ? 'mr-1' : 'ml-1'}`}>
                {rejectedRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="daily" className={`flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Calendar className="h-4 w-4" />
            {t('leave.dailyBreakdown')}
          </TabsTrigger>
        </TabsList>

        {/* All Requests Tab */}
        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle>{t('leave.allLeaveRequests')}</CardTitle>
                  <CardDescription className="hidden md:block">{t('leave.completeListing')}</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2">
                  <Badge variant="outline" className="text-xs w-fit">{requests.length} {t('leave.entries')}</Badge>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Select value={reportType} onValueChange={(v) => setReportType(v as 'pdf' | 'excel')}>
                      <SelectTrigger className="w-28 sm:w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="excel">Excel</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={() => handleGenerateReport('all')} disabled={isGenerating} className={`flex-shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      {isGenerating ? (
                        <Loader2 className={`h-4 w-4 animate-spin ${isRTL ? 'ml-1' : 'mr-1'}`} />
                      ) : (
                        <Download className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                      )}
                      <span className="hidden sm:inline">{t('leave.export')}</span>
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('leave.student')}</TableHead>
                      <TableHead>{t('leave.dates')}</TableHead>
                      <TableHead>{t('leave.status')}</TableHead>
                      <TableHead>{t('leave.reason')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && (
                      <TableRow><TableCell colSpan={4} className="text-center py-6 text-slate-500"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />{t('leave.loading')}</TableCell></TableRow>
                    )}
                    {!isLoading && requests.map(req => (
                      <TableRow key={req.id}>
                        <TableCell>
                          <div className="font-semibold">{req.student?.fullName || t('leave.student')}</div>
                          <div className="text-xs text-slate-500">{req.student?.studentCode || req.student?.admissionNo || '—'} · {req.className || t('leave.class')}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{format(req.startDate, 'PP')} → {format(req.endDate, 'PP')}</div>
                          <div className="text-xs text-slate-500">{req.schoolName || t('leave.school')}</div>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{req.status}</Badge></TableCell>
                        <TableCell className="max-w-[280px]"><div className="line-clamp-2 text-sm">{req.reason}</div></TableCell>
                      </TableRow>
                    ))}
                    {!isLoading && !requests.length && (
                      <TableRow><TableCell colSpan={4} className="text-center py-6 text-slate-500">{t('leave.noRequestsMatchFilters')}</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {pagination && (
                <div className="flex justify-between items-center mt-3 text-sm text-slate-600">
                  <span>{t('leave.pageOf', { page, total: pagination.last_page })}</span>
                  <div className="space-x-2">
                    <Button size="sm" variant="outline" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>{t('leave.prev')}</Button>
                    <Button size="sm" variant="outline" onClick={() => setPage(page + 1)} disabled={page >= (pagination?.last_page || 1)}>{t('leave.next')}</Button>
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
                  <CardTitle>{t('leave.pendingRequests')}</CardTitle>
                  <CardDescription className="hidden md:block">{t('leave.awaitingApproval')}</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <Badge variant="outline" className="text-xs w-fit">{pendingRequests.length} {t('leave.entries')}</Badge>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Select value={reportType} onValueChange={(v) => setReportType(v as 'pdf' | 'excel')}>
                      <SelectTrigger className="w-28 sm:w-32 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="excel">Excel</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={() => handleGenerateReport('pending')} disabled={isGenerating} className={`flex-shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      {isGenerating ? (
                        <Loader2 className={`h-4 w-4 animate-spin ${isRTL ? 'ml-1' : 'mr-1'}`} />
                      ) : (
                        <Download className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                      )}
                      <span className="hidden sm:inline">{t('leave.export')}</span>
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('leave.student')}</TableHead>
                      <TableHead>{t('leave.dates')}</TableHead>
                      <TableHead>{t('leave.reason')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && (
                      <TableRow><TableCell colSpan={3} className="text-center py-6 text-slate-500"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />{t('leave.loading')}</TableCell></TableRow>
                    )}
                    {!isLoading && pendingRequests.map(req => (
                      <TableRow key={req.id}>
                        <TableCell>
                          <div className="font-semibold">{req.student?.fullName || t('leave.student')}</div>
                          <div className="text-xs text-slate-500">{req.student?.studentCode || req.student?.admissionNo || '—'} · {req.className || t('leave.class')}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{format(req.startDate, 'PP')} → {format(req.endDate, 'PP')}</div>
                        </TableCell>
                        <TableCell className="max-w-[280px]"><div className="line-clamp-2 text-sm">{req.reason}</div></TableCell>
                      </TableRow>
                    ))}
                    {!isLoading && !pendingRequests.length && (
                      <TableRow><TableCell colSpan={3} className="text-center py-6 text-slate-500">{t('leave.noPendingRequests')}</TableCell></TableRow>
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
                  <CardTitle>{t('leave.approvedRequests')}</CardTitle>
                  <CardDescription className="hidden md:block">{t('leave.approvedDescription')}</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <Badge variant="outline" className="text-xs w-fit">{approvedRequests.length} {t('leave.entries')}</Badge>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Select value={reportType} onValueChange={(v) => setReportType(v as 'pdf' | 'excel')}>
                      <SelectTrigger className="w-28 sm:w-32 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="excel">Excel</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={() => handleGenerateReport('approved')} disabled={isGenerating} className={`flex-shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      {isGenerating ? (
                        <Loader2 className={`h-4 w-4 animate-spin ${isRTL ? 'ml-1' : 'mr-1'}`} />
                      ) : (
                        <Download className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                      )}
                      <span className="hidden sm:inline">{t('leave.export')}</span>
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('leave.student')}</TableHead>
                      <TableHead>{t('leave.dates')}</TableHead>
                      <TableHead>{t('leave.reason')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && (
                      <TableRow><TableCell colSpan={3} className="text-center py-6 text-slate-500"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />{t('leave.loading')}</TableCell></TableRow>
                    )}
                    {!isLoading && approvedRequests.map(req => (
                      <TableRow key={req.id}>
                        <TableCell>
                          <div className="font-semibold">{req.student?.fullName || t('leave.student')}</div>
                          <div className="text-xs text-slate-500">{req.student?.studentCode || req.student?.admissionNo || '—'} · {req.className || t('leave.class')}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{format(req.startDate, 'PP')} → {format(req.endDate, 'PP')}</div>
                        </TableCell>
                        <TableCell className="max-w-[280px]"><div className="line-clamp-2 text-sm">{req.reason}</div></TableCell>
                      </TableRow>
                    ))}
                    {!isLoading && !approvedRequests.length && (
                      <TableRow><TableCell colSpan={3} className="text-center py-6 text-slate-500">{t('leave.noApprovedRequests')}</TableCell></TableRow>
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
                  <CardTitle>{t('leave.rejectedRequests')}</CardTitle>
                  <CardDescription className="hidden md:block">{t('leave.rejectedDescription')}</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <Badge variant="outline" className="text-xs w-fit">{rejectedRequests.length} {t('leave.entries')}</Badge>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Select value={reportType} onValueChange={(v) => setReportType(v as 'pdf' | 'excel')}>
                      <SelectTrigger className="w-28 sm:w-32 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="excel">Excel</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={() => handleGenerateReport('rejected')} disabled={isGenerating} className={`flex-shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      {isGenerating ? (
                        <Loader2 className={`h-4 w-4 animate-spin ${isRTL ? 'ml-1' : 'mr-1'}`} />
                      ) : (
                        <Download className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                      )}
                      <span className="hidden sm:inline">{t('leave.export')}</span>
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('leave.student')}</TableHead>
                      <TableHead>{t('leave.dates')}</TableHead>
                      <TableHead>{t('leave.reason')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && (
                      <TableRow><TableCell colSpan={3} className="text-center py-6 text-slate-500"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />{t('leave.loading')}</TableCell></TableRow>
                    )}
                    {!isLoading && rejectedRequests.map(req => (
                      <TableRow key={req.id}>
                        <TableCell>
                          <div className="font-semibold">{req.student?.fullName || t('leave.student')}</div>
                          <div className="text-xs text-slate-500">{req.student?.studentCode || req.student?.admissionNo || '—'} · {req.className || t('leave.class')}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{format(req.startDate, 'PP')} → {format(req.endDate, 'PP')}</div>
                        </TableCell>
                        <TableCell className="max-w-[280px]"><div className="line-clamp-2 text-sm">{req.reason}</div></TableCell>
                      </TableRow>
                    ))}
                    {!isLoading && !rejectedRequests.length && (
                      <TableRow><TableCell colSpan={3} className="text-center py-6 text-slate-500">{t('leave.noRejectedRequests')}</TableCell></TableRow>
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t('leave.dailyBreakdownTitle')}</CardTitle>
                  <CardDescription className="hidden md:block">{t('leave.dailyBreakdownDescription')}</CardDescription>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Select value={reportType} onValueChange={(v) => setReportType(v as 'pdf' | 'excel')}>
                    <SelectTrigger className="w-28 sm:w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="excel">Excel</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => handleGenerateReport('daily')} disabled={isGenerating} className={`flex-shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    {isGenerating ? (
                      <Loader2 className={`h-4 w-4 animate-spin ${isRTL ? 'ml-1' : 'mr-1'}`} />
                    ) : (
                      <Download className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                    )}
                    <span className="hidden sm:inline">{t('leave.export')}</span>
                  </Button>
                </div>
              </div>
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
                          <div className="font-semibold">{formatDate(group.date)}</div>
                          <Badge variant="outline" className="text-xs">{group.items.length} {t('leave.leaves')}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <Badge variant="outline" className="bg-emerald-100 text-emerald-700">{t('leave.approved')} {approved}</Badge>
                          <Badge variant="outline" className="bg-amber-100 text-amber-700">{t('leave.pending')} {pending}</Badge>
                          <Badge variant="outline" className="bg-rose-100 text-rose-700">{t('leave.rejected')} {rejected}</Badge>
                        </div>
                      </div>
                    );
                  })}
                  {!groupedByDate.length && (
                    <div className="text-center text-sm text-slate-500 py-8">{t('leave.noDailyRecords')}</div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Report Progress Dialog */}
      <Dialog open={showProgressDialog} onOpenChange={(open) => {
        if (!open && !isGenerating) {
          setShowProgressDialog(false);
        }
      }}>
        <DialogContent aria-describedby="leave-report-progress-description">
          <DialogHeader>
            <DialogTitle>{t('leave.generatingReport') || 'Generating Report'}</DialogTitle>
            <DialogDescription id="leave-report-progress-description">
              {reportStatus === 'processing' || reportStatus === 'pending' 
                ? t('leave.reportInProgress') || 'Please wait while the report is being generated...'
                : reportStatus === 'completed'
                ? t('leave.reportReady') || 'Report is ready!'
                : reportStatus === 'failed'
                ? t('leave.reportFailed') || 'Report generation failed.'
                : t('leave.reportStatus') || 'Report status'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Progress value={reportProgress} className="w-full" />
            <div className="text-sm text-muted-foreground text-center">
              {reportProgress}% {reportStatus && `(${reportStatus})`}
            </div>
            {reportStatus === 'completed' && (
              <Button onClick={() => {
                setShowProgressDialog(false);
                setIsGenerating(false);
              }} className="w-full">
                {t('common.close') || 'Close'}
              </Button>
            )}
            {reportStatus === 'failed' && (
              <Button onClick={() => {
                setShowProgressDialog(false);
                setIsGenerating(false);
              }} variant="destructive" className="w-full">
                {t('common.close') || 'Close'}
              </Button>
            )}
            {isGenerating && (reportStatus === 'pending' || reportStatus === 'processing') && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t('leave.generating') || 'Generating...'}</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
