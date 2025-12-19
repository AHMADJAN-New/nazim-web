/**
 * Fee Reports Page - Dashboard for fee collection tracking
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFeeReportDashboard, useStudentFees, useFeeDefaulters } from '@/hooks/useFees';
import { useAcademicYears } from '@/hooks/useAcademicYears';
import { useClassAcademicYears } from '@/hooks/useClasses';
import { useLanguage } from '@/hooks/useLanguage';
import { LoadingSpinner } from '@/components/ui/loading';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import {
  Banknote,
  TrendingUp,
  TrendingDown,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  Download,
  ChevronRight,
  Calendar,
  CreditCard,
  BarChart3,
  PieChart as PieChartIcon,
} from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts';
import { useEffect } from 'react';

const COLORS = ['#22c55e', '#eab308', '#f97316', '#ef4444', '#6b7280'];
const STATUS_COLORS: Record<string, string> = {
  paid: '#22c55e',
  partial: '#eab308',
  pending: '#f97316',
  overdue: '#ef4444',
  waived: '#6b7280',
};

export default function FeeReportsPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [filterAcademicYear, setFilterAcademicYear] = useState<string | undefined>(undefined);
  const [filterClassAy, setFilterClassAy] = useState<string | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const { data: academicYears = [] } = useAcademicYears();
  const { data: classAcademicYears = [] } = useClassAcademicYears(filterAcademicYear);

  // Auto-select first academic year
  useEffect(() => {
    if (!filterAcademicYear && academicYears.length > 0) {
      setFilterAcademicYear(academicYears[0].id);
    }
  }, [academicYears, filterAcademicYear]);

  const { data: dashboard, isLoading: dashboardLoading } = useFeeReportDashboard({
    academicYearId: filterAcademicYear,
    classAcademicYearId: filterClassAy,
  });

  const { data: studentFeesData, isLoading: studentFeesLoading } = useStudentFees({
    academicYearId: filterAcademicYear,
    classAcademicYearId: filterClassAy,
    status: filterStatus,
    search: searchQuery || undefined,
    page: currentPage,
    perPage: 15,
  });

  const { data: defaultersData } = useFeeDefaulters({
    academicYearId: filterAcademicYear,
    classAcademicYearId: filterClassAy,
  });

  // Prepare status distribution data for pie chart
  const statusData = useMemo(() => {
    if (!dashboard) return [];
    const { statusCounts } = dashboard.summary;
    return [
      { name: 'Paid', value: statusCounts.paid, fill: STATUS_COLORS.paid },
      { name: 'Partial', value: statusCounts.partial, fill: STATUS_COLORS.partial },
      { name: 'Pending', value: statusCounts.pending, fill: STATUS_COLORS.pending },
      { name: 'Overdue', value: statusCounts.overdue, fill: STATUS_COLORS.overdue },
      { name: 'Waived', value: statusCounts.waived, fill: STATUS_COLORS.waived },
    ].filter(item => item.value > 0);
  }, [dashboard]);

  // Prepare class-wise collection data
  const classCollectionData = useMemo(() => {
    if (!dashboard) return [];
    return dashboard.byClass.slice(0, 8).map((item, index) => ({
      name: item.className,
      collected: item.totalPaid,
      remaining: item.totalRemaining,
      fill: COLORS[index % COLORS.length],
    }));
  }, [dashboard]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      paid: 'default',
      partial: 'secondary',
      pending: 'outline',
      overdue: 'destructive',
    };
    const colors: Record<string, string> = {
      paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      partial: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      pending: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return (
      <Badge className={colors[status] || ''} variant={variants[status] || 'outline'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (dashboardLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('fees.reports') || 'Fee Reports'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('fees.reportsDescription') || 'Track fee collection and student payment status'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            {t('common.export') || 'Export'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t('fees.filters') || 'Filters'}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">{t('fees.academicYear') || 'Academic Year'}</label>
            <Select
              value={filterAcademicYear || ''}
              onValueChange={(val) => {
                setFilterAcademicYear(val || undefined);
                setFilterClassAy(undefined);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('fees.selectAcademicYear') || 'Select Academic Year'} />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((ay) => (
                  <SelectItem key={ay.id} value={ay.id}>
                    {ay.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">{t('fees.class') || 'Class'}</label>
            <Select
              value={filterClassAy || ''}
              onValueChange={(val) => {
                setFilterClassAy(val || undefined);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('fees.allClasses') || 'All Classes'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Classes</SelectItem>
                {classAcademicYears.map((cay) => (
                  <SelectItem key={cay.id} value={cay.id}>
                    {cay.class?.name ?? cay.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">{t('fees.status') || 'Status'}</label>
            <Select
              value={filterStatus || ''}
              onValueChange={(val) => {
                setFilterStatus(val || undefined);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('fees.allStatuses') || 'All Statuses'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Fees */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('fees.totalAssigned') || 'Total Fees'}
            </CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Banknote className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">
              {formatCurrency(dashboard?.summary.totalAssigned || 0)}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {dashboard?.summary.totalStudents || 0} students
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Collected */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full -mr-16 -mt-16" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('fees.totalPaid') || 'Collected'}
            </CardTitle>
            <div className="p-2 rounded-lg bg-green-500/10">
              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2 text-green-600">
              {formatCurrency(dashboard?.summary.totalPaid || 0)}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-green-600 dark:text-green-400 font-medium">
                {dashboard?.summary.collectionRate.toFixed(1) || 0}% collected
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Remaining */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full -mr-16 -mt-16" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('fees.remaining') || 'Remaining'}
            </CardTitle>
            <div className="p-2 rounded-lg bg-orange-500/10">
              <TrendingDown className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2 text-orange-600">
              {formatCurrency(dashboard?.summary.totalRemaining || 0)}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-orange-500" />
              <span className="text-muted-foreground">
                {dashboard?.summary.statusCounts.pending || 0} pending
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Overdue */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full -mr-16 -mt-16" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('fees.overdue') || 'Overdue'}
            </CardTitle>
            <div className="p-2 rounded-lg bg-red-500/10">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2 text-red-600">
              {dashboard?.summary.statusCounts.overdue || 0}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">
                {defaultersData?.summary.totalOutstanding
                  ? formatCurrency(defaultersData.summary.totalOutstanding)
                  : '$0'} outstanding
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Collection Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('fees.collectionProgress') || 'Collection Progress'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {formatCurrency(dashboard?.summary.totalPaid || 0)} of {formatCurrency(dashboard?.summary.totalAssigned || 0)}
              </span>
              <span className="font-medium">{dashboard?.summary.collectionRate.toFixed(1) || 0}%</span>
            </div>
            <Progress value={dashboard?.summary.collectionRate || 0} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              {t('fees.statusDistribution') || 'Status Distribution'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ChartContainer
                config={statusData.reduce((acc, item, index) => {
                  const key = `status_${index}`;
                  acc[key] = {
                    label: item.name,
                    color: item.fill,
                  };
                  return acc;
                }, {} as ChartConfig)}
                className="mx-auto aspect-square max-h-[250px]"
              >
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                  />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                <p>No data available</p>
              </div>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2">
              {statusData.map((item, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }} />
                  <span>{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Collection by Class */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {t('fees.collectionByClass') || 'Collection by Class'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {classCollectionData.length > 0 ? (
              <ChartContainer
                config={{
                  collected: { label: 'Collected', color: '#22c55e' },
                  remaining: { label: 'Remaining', color: '#f97316' },
                }}
                className="h-[250px] w-full"
              >
                <BarChart data={classCollectionData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => {
                      if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
                      return `$${value}`;
                    }}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent formatter={(value: number) => formatCurrency(value)} />}
                  />
                  <Bar dataKey="collected" fill="#22c55e" radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar dataKey="remaining" fill="#f97316" radius={[4, 4, 0, 0]} stackId="a" />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                <p>No data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Student List and Recent Payments */}
      <Tabs defaultValue="students" className="space-y-4">
        <TabsList>
          <TabsTrigger value="students">{t('fees.studentFees') || 'Student Fees'}</TabsTrigger>
          <TabsTrigger value="payments">{t('fees.recentPayments') || 'Recent Payments'}</TabsTrigger>
          <TabsTrigger value="defaulters">{t('fees.defaulters') || 'Defaulters'}</TabsTrigger>
        </TabsList>

        {/* Students Tab */}
        <TabsContent value="students">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t('fees.studentFeeStatus') || 'Student Fee Status'}</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('common.search') || 'Search students...'}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent>
              {studentFeesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('fees.student') || 'Student'}</TableHead>
                        <TableHead>{t('fees.class') || 'Class'}</TableHead>
                        <TableHead className="text-right">{t('fees.assigned') || 'Assigned'}</TableHead>
                        <TableHead className="text-right">{t('fees.paid') || 'Paid'}</TableHead>
                        <TableHead className="text-right">{t('fees.remaining') || 'Remaining'}</TableHead>
                        <TableHead>{t('fees.status') || 'Status'}</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentFeesData?.data.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {student.firstName} {student.lastName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {student.registrationNumber}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{student.className}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(student.totalAssigned)}
                          </TableCell>
                          <TableCell className="text-right text-green-600">
                            {formatCurrency(student.totalPaid)}
                          </TableCell>
                          <TableCell className="text-right text-orange-600">
                            {formatCurrency(student.totalRemaining)}
                          </TableCell>
                          <TableCell>{getStatusBadge(student.overallStatus)}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/students/${student.id}/fees`)}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {studentFeesData && studentFeesData.pagination.lastPage > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-muted-foreground">
                        Showing {((currentPage - 1) * studentFeesData.pagination.perPage) + 1} to{' '}
                        {Math.min(currentPage * studentFeesData.pagination.perPage, studentFeesData.pagination.total)} of{' '}
                        {studentFeesData.pagination.total} students
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(studentFeesData.pagination.lastPage, p + 1))}
                          disabled={currentPage >= studentFeesData.pagination.lastPage}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recent Payments Tab */}
        <TabsContent value="payments">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t('fees.recentPayments') || 'Recent Payments'}</CardTitle>
              <Button variant="outline" size="sm" onClick={() => navigate('/finance/fees/payments')}>
                {t('common.viewAll') || 'View All'}
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('fees.student') || 'Student'}</TableHead>
                    <TableHead>{t('fees.feeStructure') || 'Fee Structure'}</TableHead>
                    <TableHead>{t('fees.paymentDate') || 'Date'}</TableHead>
                    <TableHead>{t('fees.method') || 'Method'}</TableHead>
                    <TableHead className="text-right">{t('fees.amount') || 'Amount'}</TableHead>
                    <TableHead>{t('fees.reference') || 'Reference'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboard?.recentPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{payment.studentName || '-'}</div>
                          <div className="text-sm text-muted-foreground">
                            {payment.studentRegistration || '-'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{payment.feeStructureName || '-'}</TableCell>
                      <TableCell>{formatDate(new Date(payment.paymentDate))}</TableCell>
                      <TableCell className="capitalize">{payment.paymentMethod}</TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>{payment.referenceNo || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Defaulters Tab */}
        <TabsContent value="defaulters">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t('fees.defaulters') || 'Fee Defaulters'}</CardTitle>
                  <CardDescription className="mt-1">
                    Students with pending or overdue fees
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge variant="destructive">
                    {defaultersData?.summary.totalDefaulters || 0} Students
                  </Badge>
                  <Badge variant="outline">
                    {formatCurrency(defaultersData?.summary.totalOutstanding || 0)} Outstanding
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('fees.student') || 'Student'}</TableHead>
                    <TableHead>{t('fees.class') || 'Class'}</TableHead>
                    <TableHead>{t('fees.feeStructure') || 'Fee'}</TableHead>
                    <TableHead className="text-right">{t('fees.remaining') || 'Remaining'}</TableHead>
                    <TableHead>{t('fees.dueDate') || 'Due Date'}</TableHead>
                    <TableHead>{t('fees.status') || 'Status'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {defaultersData?.defaulters.slice(0, 15).map((defaulter) => (
                    <TableRow key={defaulter.assignmentId}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {defaulter.firstName} {defaulter.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {defaulter.registrationNumber}
                          </div>
                          {defaulter.phone && (
                            <div className="text-xs text-muted-foreground">
                              {defaulter.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{defaulter.className}</TableCell>
                      <TableCell>{defaulter.feeStructureName}</TableCell>
                      <TableCell className="text-right font-medium text-red-600">
                        {formatCurrency(defaulter.remainingAmount)}
                      </TableCell>
                      <TableCell>
                        {defaulter.dueDate ? formatDate(new Date(defaulter.dueDate)) : '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(defaulter.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Class-wise Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('fees.classWiseSummary') || 'Class-wise Summary'}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('fees.class') || 'Class'}</TableHead>
                <TableHead className="text-right">{t('fees.students') || 'Students'}</TableHead>
                <TableHead className="text-right">{t('fees.totalAssigned') || 'Total Assigned'}</TableHead>
                <TableHead className="text-right">{t('fees.collected') || 'Collected'}</TableHead>
                <TableHead className="text-right">{t('fees.remaining') || 'Remaining'}</TableHead>
                <TableHead className="text-right">{t('fees.collectionRate') || 'Rate'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dashboard?.byClass.map((classData) => (
                <TableRow key={classData.classAcademicYearId}>
                  <TableCell className="font-medium">{classData.className}</TableCell>
                  <TableCell className="text-right">{classData.studentCount}</TableCell>
                  <TableCell className="text-right">{formatCurrency(classData.totalAssigned)}</TableCell>
                  <TableCell className="text-right text-green-600">
                    {formatCurrency(classData.totalPaid)}
                  </TableCell>
                  <TableCell className="text-right text-orange-600">
                    {formatCurrency(classData.totalRemaining)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Progress value={classData.collectionPercentage} className="w-16 h-2" />
                      <span className="text-sm">{classData.collectionPercentage.toFixed(0)}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
