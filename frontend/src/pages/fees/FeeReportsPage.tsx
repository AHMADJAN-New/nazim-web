/**
 * Fee Reports Page - Dashboard for fee collection tracking
 */

import {
  Banknote,
  TrendingUp,
  TrendingDown,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  ChevronRight,
  Calendar,
  CreditCard,
  BarChart3,
  PieChart as PieChartIcon,
  FileText,
  Receipt,
  User,
  GraduationCap,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, ChartSkeleton } from '@/components/charts/LazyChart';
import { Suspense } from 'react';

import { FilterPanel } from '@/components/layout/FilterPanel';
import { PageHeader } from '@/components/layout/PageHeader';
import { ReportExportButtons } from '@/components/reports/ReportExportButtons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAcademicYears, useCurrentAcademicYear } from '@/hooks/useAcademicYears';
import { useFeeReportDashboard, useStudentFees, useFeeDefaulters, useFeeAssignments, useFeePayments, useFeeStructures, useFeeExceptions } from '@/hooks/useFees';
import { useClassAcademicYears } from '@/hooks/useClasses';
import { useLanguage } from '@/hooks/useLanguage';
import { formatCurrency, formatDate } from '@/lib/utils';


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
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const { data: academicYears = [], isLoading: academicYearsLoading } = useAcademicYears();
  const { data: currentAcademicYear, isLoading: currentAcademicYearLoading } = useCurrentAcademicYear();
  const { data: classAcademicYears = [] } = useClassAcademicYears(filterAcademicYear);

  // Auto-select current academic year, or fall back to first academic year
  useEffect(() => {
    // Only run if we're not loading and no academic year is selected
    if (academicYearsLoading || currentAcademicYearLoading) {
      return; // Wait for data to load
    }

    if (!filterAcademicYear && academicYears.length > 0) {
      // First, try to find current year from the list (most reliable)
      const currentYearFromList = academicYears.find(ay => ay.isCurrent === true);
      
      if (currentYearFromList) {
        // Use the current year from the list
        setFilterAcademicYear(currentYearFromList.id);
        return;
      }

      // Fall back to the hook result if available
      if (currentAcademicYear) {
        setFilterAcademicYear(currentAcademicYear.id);
        return;
      }

      // Finally, fall back to first academic year if no current year is set
      setFilterAcademicYear(academicYears[0].id);
    }
  }, [academicYears, academicYearsLoading, currentAcademicYear, currentAcademicYearLoading, filterAcademicYear]);

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

  // Fetch detailed data for selected student
  const { data: studentAssignments = [] } = useFeeAssignments({
    studentId: selectedStudentId || undefined,
    academicYearId: filterAcademicYear,
  });
  const { data: studentPayments = [] } = useFeePayments({
    studentId: selectedStudentId || undefined,
  });
  const { data: feeStructures = [] } = useFeeStructures({
    academicYearId: filterAcademicYear,
  });
  const { data: feeExceptions = [] } = useFeeExceptions({
    academicYearId: filterAcademicYear,
    classAcademicYearId: filterClassAy,
  });
  
  // Get exceptions for selected student
  const { data: studentFeeExceptions = [] } = useFeeExceptions({
    studentId: selectedStudentId || undefined,
    academicYearId: filterAcademicYear,
  });

  // Create a map of fee structure IDs to names
  const feeStructureMap = useMemo(() => {
    return new Map(feeStructures.map(s => [s.id, s.name]));
  }, [feeStructures]);

  // Get selected student from the list
  const selectedStudentData = useMemo(() => {
    if (!selectedStudentId || !studentFeesData) return null;
    return studentFeesData.data.find(s => s.id === selectedStudentId);
  }, [selectedStudentId, studentFeesData]);

  // Get selected class data
  const selectedClassData = useMemo(() => {
    if (!selectedClassId || !dashboard) return null;
    return dashboard.byClass.find(c => c.classAcademicYearId === selectedClassId);
  }, [selectedClassId, dashboard]);

  // Get students for selected class
  const { data: classStudentsData } = useStudentFees({
    academicYearId: filterAcademicYear,
    classAcademicYearId: selectedClassId || undefined,
  });

  // Prepare status distribution data for pie chart
  const statusData = useMemo(() => {
    if (!dashboard) return [];
    const { statusCounts } = dashboard.summary;
    return [
      { name: t('fees.paid'), value: statusCounts.paid, fill: STATUS_COLORS.paid },
      { name: t('fees.partial'), value: statusCounts.partial, fill: STATUS_COLORS.partial },
      { name: t('fees.pending'), value: statusCounts.pending, fill: STATUS_COLORS.pending },
      { name: t('fees.overdue'), value: statusCounts.overdue, fill: STATUS_COLORS.overdue },
      { name: t('fees.waived'), value: statusCounts.waived, fill: STATUS_COLORS.waived },
    ].filter(item => item.value > 0);
  }, [dashboard, t]);

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
        {t(`fees.${status}`)}
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
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <PageHeader
        title={t('nav.finance.fees.reports') || t('finance.fees.reports') || 'Fee Reports'}
        description={t('fees.reportsDescription') || 'Track fee collection and student payment status'}
        icon={<FileText className="h-5 w-5" />}
        rightSlot={
          <ReportExportButtons
            data={studentFeesData?.data || []}
            columns={[
              { key: 'firstName', label: t('events.firstName'), align: 'left' },
              { key: 'lastName', label: t('events.lastName'), align: 'left' },
              { key: 'registrationNumber', label: t('students.registrationNumber'), align: 'left' },
              { key: 'className', label: t('search.class'), align: 'left' },
              { key: 'totalAssigned', label: t('assets.assigned'), align: 'right' },
              { key: 'totalPaid', label: t('fees.paid'), align: 'right' },
              { key: 'totalRemaining', label: t('fees.remaining'), align: 'right' },
              { key: 'overallStatus', label: t('events.status'), align: 'center' },
            ]}
            reportKey="fee_student_summary"
            title={t('fees.studentWiseSummary') || 'Student-wise Fee Summary'}
            transformData={(data) =>
              data.map((student) => ({
                firstName: student.firstName,
                lastName: student.lastName,
                registrationNumber: student.registrationNumber,
                className: student.className,
                totalAssigned: formatCurrency(student.totalAssigned),
                totalPaid: formatCurrency(student.totalPaid),
                totalRemaining: formatCurrency(student.totalRemaining),
                overallStatus: student.overallStatus.charAt(0).toUpperCase() + student.overallStatus.slice(1),
              }))
            }
            buildFiltersSummary={() => {
              const parts: string[] = [];
              const ay = academicYears.find(a => a.id === filterAcademicYear);
              if (ay) parts.push(`${t('fees.academicYear')}: ${ay.name}`);
              if (filterClassAy) {
                const cay = classAcademicYears.find(c => c.id === filterClassAy);
                if (cay) parts.push(`${t('search.class')}: ${cay.class?.name || filterClassAy}`);
              }
              if (filterStatus) parts.push(`${t('events.status')}: ${filterStatus}`);
              return parts.join(' | ');
            }}
            templateType="fee_student_summary"
            disabled={dashboardLoading || !studentFeesData?.data || studentFeesData.data.length === 0}
          />
        }
      />

      <FilterPanel title={t('events.filters') || 'Filters'}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <label className="text-sm font-medium mb-2 block">{t('search.class') || 'Class'}</label>
            <Select
              value={filterClassAy || 'all'}
              onValueChange={(val) => {
                setFilterClassAy(val === 'all' ? undefined : val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('students.allClasses') || 'All Classes'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classAcademicYears.map((cay) => (
                  <SelectItem key={cay.id} value={cay.id}>
                    {cay.class?.name ?? cay.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">{t('events.status') || 'Status'}</label>
            <Select
              value={filterStatus || 'all'}
              onValueChange={(val) => {
                setFilterStatus(val === 'all' ? undefined : val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('fees.allStatuses') || 'All Statuses'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </FilterPanel>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Fees */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('fees.totalAssigned')}
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
                {dashboard?.summary.totalStudents || 0} {t('table.students')}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Collected */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full -mr-16 -mt-16" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('fees.collected')}
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
                {dashboard?.summary.collectionRate.toFixed(1) || 0}% {t('fees.collected').toLowerCase()}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Remaining */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full -mr-16 -mt-16" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('fees.remaining')}
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
                {dashboard?.summary.statusCounts.pending || 0} {t('fees.pending').toLowerCase()}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Overdue */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full -mr-16 -mt-16" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('fees.overdue')}
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
                  : formatCurrency(0)} {t('fees.totalRemaining').toLowerCase()}
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
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
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

      {/* Main Tabs: Student-wise and Class-wise Summary */}
      <Tabs defaultValue="student-wise" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="student-wise" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t('fees.studentWiseSummary') || 'Student-wise Summary'}
          </TabsTrigger>
          <TabsTrigger value="class-wise" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            {t('fees.classWiseSummary') || 'Class-wise Summary'}
          </TabsTrigger>
        </TabsList>

        {/* Student-wise Summary Tab */}
        <TabsContent value="student-wise" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t('fees.studentFeeStatus') || 'Student Fee Status'}</CardTitle>
                <CardDescription className="mt-1">
                  {t('fees.studentWiseSummaryDescription') || 'View fee status for all students with detailed breakdown'}
                </CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('events.search') || 'Search students...'}
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
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner />
                </div>
              ) : studentFeesData && studentFeesData.data.length > 0 ? (
                <>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[250px]">{t('fees.student') || 'Student'}</TableHead>
                          <TableHead>{t('search.class') || 'Class'}</TableHead>
                          <TableHead className="text-right">{t('assets.assigned') || 'Assigned'}</TableHead>
                          <TableHead className="text-right">{t('fees.paid') || 'Paid'}</TableHead>
                          <TableHead className="text-right">{t('fees.remaining') || 'Remaining'}</TableHead>
                          <TableHead className="w-[120px]">{t('events.status') || 'Status'}</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentFeesData.data.map((student) => (
                          <TableRow 
                            key={student.id} 
                            className="hover:bg-muted/50 cursor-pointer"
                            onClick={() => {
                              setSelectedStudentId(student.id);
                              setSelectedClassId(null);
                              setIsPanelOpen(true);
                            }}
                          >
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
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{student.className}</Badge>
                                {(() => {
                                  // Check if student has any exceptions
                                  const studentExceptions = feeExceptions.filter(
                                    (exception) => exception.studentId === student.id
                                  );
                                  if (studentExceptions.length > 0) {
                                    return (
                                      <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                                        {studentExceptions.length} {t('fees.exception') || 'Exception'}{studentExceptions.length > 1 ? 's' : ''}
                                      </Badge>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(student.totalAssigned)}
                            </TableCell>
                            <TableCell className="text-right font-medium text-green-600 dark:text-green-400">
                              {formatCurrency(student.totalPaid)}
                            </TableCell>
                            <TableCell className="text-right font-medium text-orange-600 dark:text-orange-400">
                              {formatCurrency(student.totalRemaining)}
                            </TableCell>
                            <TableCell>{getStatusBadge(student.overallStatus)}</TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/students/${student.id}/fees`)}
                                className="h-8 w-8 p-0"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {studentFeesData.pagination.lastPage > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        {t('library.showing') || 'Showing'} {((currentPage - 1) * studentFeesData.pagination.perPage) + 1} {t('events.to') || 'to'}{' '}
                        {Math.min(currentPage * studentFeesData.pagination.perPage, studentFeesData.pagination.total)} {t('events.of') || 'of'}{' '}
                        {studentFeesData.pagination.total} {t('table.students') || 'students'}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          {t('events.previous') || 'Previous'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(studentFeesData.pagination.lastPage, p + 1))}
                          disabled={currentPage >= studentFeesData.pagination.lastPage}
                        >
                          {t('events.next') || 'Next'}
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">{t('events.noData') || 'No students found'}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {searchQuery ? 'Try adjusting your search filters' : 'No student fee data available for the selected filters'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Class-wise Summary Tab */}
        <TabsContent value="class-wise" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t('fees.classWiseSummary') || 'Class-wise Summary'}</CardTitle>
                  <CardDescription className="mt-1">
                    {t('fees.classWiseSummaryDescription') || 'View fee collection statistics grouped by class'}
                  </CardDescription>
                </div>
                <ReportExportButtons
                  data={dashboard?.byClass || []}
                  columns={[
                    { key: 'className', label: t('search.class'), align: 'left' },
                    { key: 'studentCount', label: t('table.students'), align: 'right' },
                    { key: 'totalAssigned', label: t('fees.totalAssigned'), align: 'right' },
                    { key: 'totalPaid', label: t('fees.collected'), align: 'right' },
                    { key: 'totalRemaining', label: t('fees.remaining'), align: 'right' },
                    { key: 'collectionPercentage', label: t('fees.collectionRate'), align: 'right' },
                  ]}
                  reportKey="fee_class_summary"
                  title={t('fees.classWiseSummary') || 'Class-wise Fee Summary'}
                  transformData={(data) =>
                    data.map((classData) => ({
                      className: classData.className,
                      studentCount: classData.studentCount.toString(),
                      totalAssigned: formatCurrency(classData.totalAssigned),
                      totalPaid: formatCurrency(classData.totalPaid),
                      totalRemaining: formatCurrency(classData.totalRemaining),
                      collectionPercentage: `${classData.collectionPercentage.toFixed(1)}%`,
                    }))
                  }
                  buildFiltersSummary={() => {
                    const parts: string[] = [];
                    const ay = academicYears.find(a => a.id === filterAcademicYear);
                    if (ay) parts.push(`${t('fees.academicYear')}: ${ay.name}`);
                    return parts.join(' | ');
                  }}
                  templateType="fee_class_summary"
                  disabled={dashboardLoading || !dashboard || dashboard.byClass.length === 0}
                />
              </div>
            </CardHeader>
            <CardContent>
              {dashboardLoading ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner />
                </div>
              ) : dashboard && dashboard.byClass.length > 0 ? (
                <>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[200px]">{t('search.class') || 'Class'}</TableHead>
                          <TableHead className="text-right">{t('table.students') || 'Students'}</TableHead>
                          <TableHead className="text-right">{t('fees.totalAssigned') || 'Total Assigned'}</TableHead>
                          <TableHead className="text-right">{t('fees.collected') || 'Collected'}</TableHead>
                          <TableHead className="text-right">{t('fees.remaining') || 'Remaining'}</TableHead>
                          <TableHead className="text-right w-[200px]">{t('fees.collectionRate') || 'Collection Rate'}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dashboard.byClass.map((classData) => {
                          const collectionRate = classData.collectionPercentage;
                          return (
                            <TableRow 
                              key={classData.classAcademicYearId} 
                              className="hover:bg-muted/50 cursor-pointer"
                              onClick={() => {
                                setSelectedClassId(classData.classAcademicYearId);
                                setSelectedStudentId(null);
                                setIsPanelOpen(true);
                              }}
                            >
                              <TableCell>
                                <div className="font-medium">{classData.className}</div>
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge variant="secondary">{classData.studentCount}</Badge>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(classData.totalAssigned)}
                              </TableCell>
                              <TableCell className="text-right font-medium text-green-600 dark:text-green-400">
                                {formatCurrency(classData.totalPaid)}
                              </TableCell>
                              <TableCell className="text-right font-medium text-orange-600 dark:text-orange-400">
                                {formatCurrency(classData.totalRemaining)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-end gap-3">
                                  <Progress 
                                    value={collectionRate} 
                                    className="w-24 h-2"
                                  />
                                  <span className={`text-sm font-medium min-w-[45px] text-right ${
                                    collectionRate >= 80 ? 'text-green-600 dark:text-green-400' :
                                    collectionRate >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                                    'text-orange-600 dark:text-orange-400'
                                  }`}>
                                    {collectionRate.toFixed(1)}%
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Summary Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          {t('fees.totalClasses') || 'Total Classes'}
                        </div>
                        <div className="text-2xl font-bold">
                          {dashboard.byClass.length}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          {t('fees.averageCollectionRate') || 'Average Collection Rate'}
                        </div>
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {dashboard.byClass.length > 0
                            ? (dashboard.byClass.reduce((sum, c) => sum + c.collectionPercentage, 0) / dashboard.byClass.length).toFixed(1)
                            : 0}%
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          {t('students.totalStudents') || 'Total Students'}
                        </div>
                        <div className="text-2xl font-bold">
                          {dashboard.byClass.reduce((sum, c) => sum + c.studentCount, 0)}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">{t('events.noData') || 'No class data found'}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {t('fees.noClassData') || 'No class fee data available for the selected filters'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Details Side Panel */}
      <Sheet open={isPanelOpen} onOpenChange={setIsPanelOpen}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
          {selectedStudentData && (
            <>
              <SheetHeader>
                <SheetTitle className="text-2xl flex items-center gap-2">
                  <User className="h-6 w-6" />
                  {selectedStudentData.firstName} {selectedStudentData.lastName}
                </SheetTitle>
                <SheetDescription>
                  {t('fees.student') || 'Student'} • {selectedStudentData.registrationNumber} • {selectedStudentData.className}
                </SheetDescription>
              </SheetHeader>

              <Tabs defaultValue="summary" className="mt-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="summary">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    {t('examReports.summary') || 'Summary'}
                  </TabsTrigger>
                  <TabsTrigger value="assignments">
                    <FileText className="h-4 w-4 mr-2" />
                    {t('fees.assignments') || 'Assignments'} ({studentAssignments.length})
                  </TabsTrigger>
                  <TabsTrigger value="payments">
                    <Receipt className="h-4 w-4 mr-2" />
                    {t('fees.payments') || 'Payments'} ({studentPayments.length})
                  </TabsTrigger>
                </TabsList>

                {/* Summary Tab */}
                <TabsContent value="summary" className="space-y-4 mt-4">
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          {t('fees.totalAssigned') || 'Total Assigned'}
                        </div>
                        <div className="text-2xl font-bold">
                          {formatCurrency(selectedStudentData.totalAssigned)}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          {t('fees.paid') || 'Paid'}
                        </div>
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {formatCurrency(selectedStudentData.totalPaid)}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          {t('fees.remaining') || 'Remaining'}
                        </div>
                        <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                          {formatCurrency(selectedStudentData.totalRemaining)}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Fee Exceptions Summary */}
                  {studentFeeExceptions.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>{t('fees.exceptions') || 'Fee Exceptions'}</CardTitle>
                        <CardDescription>
                          {t('fees.exceptionsSummary') || 'Active fee exceptions for this student'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {studentFeeExceptions
                            .filter((ex) => ex.isActive)
                            .map((exception) => (
                              <div key={exception.id} className="flex items-center justify-between p-2 border rounded">
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant={
                                      exception.exceptionType === 'waiver'
                                        ? 'destructive'
                                        : exception.exceptionType === 'discount_percentage'
                                        ? 'default'
                                        : 'secondary'
                                    }
                                  >
                                    {exception.exceptionType.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                                  </Badge>
                                  <span className="text-sm text-muted-foreground">{exception.exceptionReason}</span>
                                </div>
                                <span className="font-semibold">{formatCurrency(exception.exceptionAmount)}</span>
                              </div>
                            ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardHeader>
                      <CardTitle>{t('events.status') || 'Status'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        {getStatusBadge(selectedStudentData.overallStatus)}
                        <div className="text-sm text-muted-foreground">
                          {selectedStudentData.totalRemaining === 0 
                            ? t('fees.fullyPaid') || 'Fully Paid'
                            : selectedStudentData.totalPaid > 0
                            ? t('fees.partiallyPaid') || 'Partially Paid'
                            : t('fees.notPaid') || 'Not Paid'}
                        </div>
                      </div>
                      {selectedStudentData.totalAssigned > 0 && (
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-muted-foreground">{t('fees.collectionRate') || 'Collection Rate'}</span>
                            <span className="font-medium">
                              {((selectedStudentData.totalPaid / selectedStudentData.totalAssigned) * 100).toFixed(1)}%
                            </span>
                          </div>
                          <Progress value={(selectedStudentData.totalPaid / selectedStudentData.totalAssigned) * 100} />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Assignments Tab */}
                <TabsContent value="assignments" className="space-y-4 mt-4">
                  <ScrollArea className="h-[500px]">
                    {studentAssignments.length > 0 ? (
                      <div className="space-y-3">
                        {studentAssignments.map((assignment) => (
                          <Card key={assignment.id}>
                            <CardContent className="pt-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="font-medium mb-2">{feeStructureMap.get(assignment.feeStructureId) || t('fees.feeStructure') || 'Fee Structure'}</div>
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <span className="text-muted-foreground">{t('assets.assigned') || 'Assigned'}: </span>
                                      <span className="font-medium">{formatCurrency(assignment.assignedAmount)}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">{t('fees.paid') || 'Paid'}: </span>
                                      <span className="font-medium text-green-600">{formatCurrency(assignment.paidAmount)}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">{t('fees.remaining') || 'Remaining'}: </span>
                                      <span className="font-medium text-orange-600">{formatCurrency(assignment.remainingAmount)}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">{t('fees.dueDate') || 'Due Date'}: </span>
                                      <span className="font-medium">{assignment.dueDate ? formatDate(new Date(assignment.dueDate)) : '-'}</span>
                                    </div>
                                  </div>
                                  {/* Fee Exceptions for this assignment */}
                                  {(() => {
                                    const assignmentExceptions = studentFeeExceptions.filter(
                                      (exception) => exception.feeAssignmentId === assignment.id
                                    );
                                    
                                    if (assignmentExceptions.length === 0) return null;
                                    
                                    return (
                                      <div className="mt-3 pt-3 border-t space-y-2">
                                        <div className="text-xs font-medium text-muted-foreground mb-2">
                                          {t('fees.exceptions')} ({assignmentExceptions.length})
                                        </div>
                                        {assignmentExceptions.map((exception) => (
                                          <div key={exception.id} className="text-xs bg-muted/50 rounded p-2 space-y-1">
                                            <div className="flex items-center justify-between">
                                              <Badge
                                                variant={
                                                  exception.exceptionType === 'waiver'
                                                    ? 'destructive'
                                                    : exception.exceptionType === 'discount_percentage'
                                                    ? 'default'
                                                    : 'secondary'
                                                }
                                                className="text-xs"
                                              >
                                                {t(`fees.exceptionTypes.${exception.exceptionType}`)}
                                              </Badge>
                                              <span className="font-medium">{formatCurrency(exception.exceptionAmount)}</span>
                                            </div>
                                            <p className="text-muted-foreground">{exception.exceptionReason}</p>
                                            {exception.isActive && (
                                              <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs">
                                                {t('common.active')}
                                              </Badge>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  })()}
                                </div>
                                <div className="ml-4">
                                  {getStatusBadge(assignment.status)}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium">{t('events.noData') || 'No assignments found'}</p>
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                {/* Payments Tab */}
                <TabsContent value="payments" className="space-y-4 mt-4">
                  <ScrollArea className="h-[500px]">
                    {studentPayments.length > 0 ? (
                      <div className="space-y-3">
                        {studentPayments.map((payment) => (
                          <Card key={payment.id}>
                            <CardContent className="pt-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="font-medium mb-2">{formatCurrency(payment.amount)}</div>
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <span className="text-muted-foreground">{t('fees.paymentDate') || 'Date'}: </span>
                                      <span className="font-medium">{formatDate(payment.paymentDate)}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">{t('fees.method') || 'Method'}: </span>
                                      <span className="font-medium capitalize">{payment.paymentMethod}</span>
                                    </div>
                                    {payment.referenceNo && (
                                      <div className="col-span-2">
                                        <span className="text-muted-foreground">{t('fees.reference') || 'Reference'}: </span>
                                        <span className="font-medium">{payment.referenceNo}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                    {t('fees.paid') || 'Paid'}
                                  </Badge>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium">{t('events.noData') || 'No payments found'}</p>
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </>
          )}

          {selectedClassData && (
            <>
              <SheetHeader>
                <SheetTitle className="text-2xl flex items-center gap-2">
                  <GraduationCap className="h-6 w-6" />
                  {selectedClassData.className}
                </SheetTitle>
                <SheetDescription>
                  {t('search.class') || 'Class'} • {selectedClassData.studentCount} {t('table.students') || 'students'}
                </SheetDescription>
              </SheetHeader>

              <Tabs defaultValue="summary" className="mt-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="summary">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    {t('examReports.summary') || 'Summary'}
                  </TabsTrigger>
                  <TabsTrigger value="students">
                    <Users className="h-4 w-4 mr-2" />
                    {t('table.students') || 'Students'} ({classStudentsData?.data.length || 0})
                  </TabsTrigger>
                </TabsList>

                {/* Summary Tab */}
                <TabsContent value="summary" className="space-y-4 mt-4">
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          {t('fees.totalAssigned') || 'Total Assigned'}
                        </div>
                        <div className="text-2xl font-bold">
                          {formatCurrency(selectedClassData.totalAssigned)}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          {t('fees.collected') || 'Collected'}
                        </div>
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {formatCurrency(selectedClassData.totalPaid)}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          {t('fees.remaining') || 'Remaining'}
                        </div>
                        <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                          {formatCurrency(selectedClassData.totalRemaining)}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>{t('fees.collectionRate') || 'Collection Rate'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {formatCurrency(selectedClassData.totalPaid)} of {formatCurrency(selectedClassData.totalAssigned)}
                          </span>
                          <span className="text-lg font-bold">
                            {selectedClassData.collectionPercentage.toFixed(1)}%
                          </span>
                        </div>
                        <Progress value={selectedClassData.collectionPercentage} className="h-3" />
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">{t('table.students') || 'Students'}: </span>
                            <span className="font-medium">{selectedClassData.studentCount}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{t('fees.assignments') || 'Assignments'}: </span>
                            <span className="font-medium">{selectedClassData.assignmentCount}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Students Tab */}
                <TabsContent value="students" className="space-y-4 mt-4">
                  <ScrollArea className="h-[500px]">
                    {classStudentsData && classStudentsData.data.length > 0 ? (
                      <div className="space-y-2">
                        {classStudentsData.data.map((student) => (
                          <Card key={student.id} className="cursor-pointer hover:bg-muted/50" onClick={() => {
                            setSelectedStudentId(student.id);
                            setSelectedClassId(null);
                          }}>
                            <CardContent className="pt-4">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="font-medium">{student.firstName} {student.lastName}</div>
                                  <div className="text-sm text-muted-foreground">{student.registrationNumber}</div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <div className="text-sm font-medium">{formatCurrency(student.totalPaid)}</div>
                                    <div className="text-xs text-muted-foreground">{t('fees.paid') || 'Paid'}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm font-medium text-orange-600">{formatCurrency(student.totalRemaining)}</div>
                                    <div className="text-xs text-muted-foreground">{t('fees.remaining') || 'Remaining'}</div>
                                  </div>
                                  {getStatusBadge(student.overallStatus)}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Users className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium">{t('events.noData') || 'No students found'}</p>
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
