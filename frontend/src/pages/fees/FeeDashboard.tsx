/**
 * Fee Dashboard - Modern Overview of fee collection and management
 */

import {
    Banknote,
    TrendingUp,
    TrendingDown,
    Users,
    AlertTriangle,
    CheckCircle,
    Clock,
    Download,
    ChevronRight,
    Calendar,
    CreditCard,
    BarChart3,
    PieChart as PieChartIcon,
    FileText,
    Receipt,
    User,
    GraduationCap,
    Shield,
    DollarSign,
    ArrowUpRight,
    ArrowDownRight,
    NotebookPen,
} from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, ChartSkeleton } from '@/components/charts/LazyChart';
import { Suspense } from 'react';

import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart';
import { LoadingSpinner } from '@/components/ui/loading';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAcademicYears, useCurrentAcademicYear } from '@/hooks/useAcademicYears';
import { useClassAcademicYears } from '@/hooks/useClasses';
import { useFeeReportDashboard } from '@/hooks/useFees';
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

const EXCEPTION_COLORS: Record<string, string> = {
    discount_percentage: '#3b82f6',
    discount_fixed: '#8b5cf6',
    waiver: '#ef4444',
    custom: '#6b7280',
};

export default function FeeDashboard() {
    const { t } = useLanguage();
    const navigate = useNavigate();

    const [filterAcademicYear, setFilterAcademicYear] = useState<string>('');
    const [filterClassAy, setFilterClassAy] = useState<string>('all');

    const { data: academicYears = [], isLoading: academicYearsLoading } = useAcademicYears();
    const { data: currentAcademicYear, isLoading: currentAcademicYearLoading } = useCurrentAcademicYear();
    const { data: classAcademicYears = [] } = useClassAcademicYears(filterAcademicYear || undefined);

    // Auto-select current academic year
    useEffect(() => {
        if (academicYearsLoading || currentAcademicYearLoading) {
            return;
        }

        if (filterAcademicYear === '' && academicYears.length > 0) {
            const currentYearFromList = academicYears.find(ay => ay.isCurrent === true);
            
            if (currentYearFromList) {
                setFilterAcademicYear(currentYearFromList.id);
                return;
            }

            if (currentAcademicYear) {
                setFilterAcademicYear(currentAcademicYear.id);
                return;
            }

            setFilterAcademicYear(academicYears[0].id);
        }
    }, [academicYears, academicYearsLoading, currentAcademicYear, currentAcademicYearLoading, filterAcademicYear]);

    const { data: dashboard, isLoading, error } = useFeeReportDashboard({
        academicYearId: filterAcademicYear || undefined,
        classAcademicYearId: filterClassAy === 'all' ? undefined : filterClassAy,
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

    // Prepare exception data for pie chart
    const exceptionData = useMemo(() => {
        if (!dashboard?.exceptions) return [];
        const { byType } = dashboard.exceptions;
        return [
            { name: 'Discount %', value: byType.discount_percentage.count, fill: EXCEPTION_COLORS.discount_percentage },
            { name: 'Discount Fixed', value: byType.discount_fixed.count, fill: EXCEPTION_COLORS.discount_fixed },
            { name: 'Waiver', value: byType.waiver.count, fill: EXCEPTION_COLORS.waiver },
            { name: 'Custom', value: byType.custom.count, fill: EXCEPTION_COLORS.custom },
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

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <LoadingSpinner />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-8 text-destructive">
                {t('events.error') || 'An error occurred'}: {(error as Error).message}
            </div>
        );
    }

    if (!dashboard) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                {t('events.noData') || 'No data available'}
            </div>
        );
    }

    const collectionRate = dashboard.summary.collectionRate;
    const exceptionReduction = dashboard.exceptions?.impactOnCollection.exceptionReduction || 0;
    const originalTotal = dashboard.exceptions?.impactOnCollection.originalTotal || dashboard.summary.totalAssigned;

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
            <PageHeader
                title={t('fees.dashboard') || 'Fee Dashboard'}
                description={t('fees.dashboardDescription') || 'Overview of fee collection and management'}
                icon={<Banknote className="h-5 w-5" />}
                rightSlot={
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">
                        <Select
                            value={filterAcademicYear || ''}
                            onValueChange={setFilterAcademicYear}
                        >
                            <SelectTrigger className="w-full sm:w-[200px]">
                                <SelectValue placeholder={t('fees.selectAcademicYear')} />
                            </SelectTrigger>
                            <SelectContent>
                                {academicYears.map((ay) => (
                                    <SelectItem key={ay.id} value={ay.id}>
                                        {ay.name} {ay.isCurrent && `(${t('academic.academicYears.current')})`}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            variant="outline"
                            size="icon"
                            className="self-start sm:self-auto"
                            aria-label={t('events.download') || 'Download'}
                        >
                            <Download className="h-4 w-4" />
                        </Button>
                    </div>
                }
            />

            {/* Summary Cards Row */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
                {/* Total Assigned */}
                <Card className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-8 -mt-8 opacity-50 pointer-events-none" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground break-words flex-1 min-w-0">
                            {t('fees.totalAssigned') || 'Total Assigned'}
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-blue-500/10 flex-shrink-0">
                            <Banknote className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                    </CardHeader>
                    <CardContent className="pb-3">
                        <div className="text-2xl sm:text-3xl font-bold mb-2 break-words">
                            {formatCurrency(dashboard.summary.totalAssigned)}
                        </div>
                        <div className="text-xs text-muted-foreground mb-2 break-words line-clamp-2">
                            {dashboard.summary.totalAssignments} {t('fees.assignments') || 'assignments'}
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-2 pt-3 pb-3">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full justify-start whitespace-normal sm:whitespace-nowrap"
                            onClick={() => navigate('/finance/fees/assignments')}
                        >
                            <ArrowUpRight className="h-4 w-4 mr-1.5 flex-shrink-0" />
                            <span className="text-left">{t('fees.viewAssignments') || 'View Assignments'}</span>
                        </Button>
                    </CardFooter>
                </Card>

                {/* Total Paid */}
                <Card className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full -mr-8 -mt-8 opacity-50 pointer-events-none" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground break-words flex-1 min-w-0">
                            {t('fees.totalPaid') || 'Total Paid'}
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-green-500/10 flex-shrink-0">
                            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
                        </div>
                    </CardHeader>
                    <CardContent className="pb-3">
                        <div className="text-2xl sm:text-3xl font-bold mb-2 text-green-600 break-words">
                            {formatCurrency(dashboard.summary.totalPaid)}
                        </div>
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                            <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
                            <span className="text-green-600 dark:text-green-400 font-medium whitespace-nowrap">
                                {collectionRate.toFixed(1)}%
                            </span>
                            <span className="text-muted-foreground break-words">
                                {t('fees.collectionRate') || 'collection rate'}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Total Remaining */}
                <Card className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full -mr-8 -mt-8 opacity-50 pointer-events-none" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground break-words flex-1 min-w-0">
                            {t('fees.totalRemaining') || 'Total Remaining'}
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-red-500/10 flex-shrink-0">
                            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-red-400" />
                        </div>
                    </CardHeader>
                    <CardContent className="pb-3">
                        <div className="text-2xl sm:text-3xl font-bold mb-2 text-red-600 break-words">
                            {formatCurrency(dashboard.summary.totalRemaining)}
                        </div>
                        <div className="text-xs text-muted-foreground mb-2 break-words">
                            {dashboard.summary.totalStudents} {t('table.students') || 'students'}
                        </div>
                    </CardContent>
                    <CardFooter className="pt-3 pb-3">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full justify-start whitespace-normal sm:whitespace-nowrap"
                            onClick={() => navigate('/finance/fees/reports')}
                        >
                            <ChevronRight className="h-4 w-4 mr-1.5 flex-shrink-0" />
                            <span className="text-left">{t('dashboard.viewReports') || 'View Reports'}</span>
                        </Button>
                    </CardFooter>
                </Card>

                {/* Exceptions */}
                <Card className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full -mr-8 -mt-8 opacity-50 pointer-events-none" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground break-words flex-1 min-w-0">
                            {t('fees.exceptions') || 'Exceptions'}
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-purple-500/10 flex-shrink-0">
                            <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                    </CardHeader>
                    <CardContent className="pb-3">
                        <div className="text-2xl sm:text-3xl font-bold mb-2 break-words">
                            {dashboard.exceptions?.totalCount || 0}
                        </div>
                        <div className="text-xs text-muted-foreground mb-2 break-words">
                            {formatCurrency(dashboard.exceptions?.totalAmount || 0)} {t('fees.totalValue') || 'total value'}
                        </div>
                        {exceptionReduction > 0 && (
                            <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                                <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-orange-500 flex-shrink-0" />
                                <span className="text-orange-600 dark:text-orange-400 font-medium whitespace-nowrap">
                                    -{formatCurrency(exceptionReduction)}
                                </span>
                                <span className="text-muted-foreground break-words">
                                    {t('fees.reduction') || 'reduction'}
                                </span>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="pt-3 pb-3">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full justify-start whitespace-normal sm:whitespace-nowrap"
                            onClick={() => navigate('/finance/fees/exceptions')}
                        >
                            <ChevronRight className="h-4 w-4 mr-1.5 flex-shrink-0" />
                            <span className="text-left">{t('fees.viewExceptions') || 'View Exceptions'}</span>
                        </Button>
                    </CardFooter>
                </Card>

                {/* Collection Rate */}
                <Card className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full -mr-8 -mt-8 opacity-50 pointer-events-none" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground break-words flex-1 min-w-0">
                            {t('fees.collectionRate') || 'Collection Rate'}
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-teal-500/10 flex-shrink-0">
                            <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-teal-600 dark:text-teal-400" />
                        </div>
                    </CardHeader>
                    <CardContent className="pb-3">
                        <div className="text-2xl sm:text-3xl font-bold mb-2 text-teal-600 break-words">
                            {collectionRate.toFixed(1)}%
                        </div>
                        <Progress value={collectionRate} className="h-2 mt-2" />
                        <div className="text-xs text-muted-foreground mt-2 break-words">
                            {t('fees.ofTotalAssigned') || 'of total assigned'}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Row */}
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
                {/* Status Distribution */}
                <Card className="lg:col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">{t('fees.statusDistribution') || 'Status Distribution'}</CardTitle>
                            <CardDescription className="mt-1 hidden md:block">
                                {t('fees.assignmentStatus') || 'Fee assignment status breakdown'}
                            </CardDescription>
                        </div>
                        <Button variant="ghost" size="icon">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {statusData.length > 0 ? (
                            <>
                                <ChartContainer
                                    config={{
                                        value: {
                                            label: 'Count',
                                            color: 'hsl(var(--chart-1))',
                                        },
                                    } as ChartConfig}
                                    className="mx-auto aspect-square max-h-[150px] sm:max-h-[180px] md:max-h-[200px] w-full"
                                >
                                    <PieChart>
                                        <Pie
                                            data={statusData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                            innerRadius={40}
                                            outerRadius={60}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {statusData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <ChartTooltip
                                            content={
                                                <ChartTooltipContent
                                                    formatter={(value: number) => [value, t('fees.assignments') || 'Assignments']}
                                                />
                                            }
                                        />
                                    </PieChart>
                                </ChartContainer>
                                <div className="space-y-2">
                                    {statusData.map((item) => (
                                        <div key={item.name} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div 
                                                    className="w-3 h-3 rounded-full" 
                                                    style={{ backgroundColor: item.fill }}
                                                />
                                                <span className="text-sm font-medium">{item.name}</span>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-semibold">{item.value}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                {t('events.noData') || 'No data available'}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Class-wise Collection */}
                <Card className="lg:col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">{t('fees.collectionByClass') || 'Collection by Class'}</CardTitle>
                            <CardDescription className="hidden md:block">Top 8 classes</CardDescription>
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate('/finance/fees/reports')}
                        >
                            {t('examReports.viewReport') || 'View Report'}
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {classCollectionData.length > 0 ? (
                            <ChartContainer
                                config={{
                                    collected: {
                                        label: 'Collected',
                                        color: 'hsl(var(--chart-1))',
                                    },
                                    remaining: {
                                        label: 'Remaining',
                                        color: 'hsl(var(--chart-2))',
                                    },
                                } as ChartConfig}
                                className="h-[200px] sm:h-[220px] md:h-[250px] w-full"
                            >
                                <BarChart data={classCollectionData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis 
                                        dataKey="name" 
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={8}
                                        angle={-45}
                                        textAnchor="end"
                                        height={80}
                                        className="text-xs sm:text-sm"
                                    />
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
                                        content={
                                            <ChartTooltipContent
                                                formatter={(value: number) => formatCurrency(value)}
                                            />
                                        }
                                    />
                                    <Bar 
                                        dataKey="collected" 
                                        fill="var(--color-collected)"
                                        radius={[8, 8, 0, 0]}
                                    />
                                    <Bar 
                                        dataKey="remaining" 
                                        fill="var(--color-remaining)"
                                        radius={[8, 8, 0, 0]}
                                    />
                                </BarChart>
                            </ChartContainer>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                {t('events.noData') || 'No data available'}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Exception Breakdown */}
                <Card className="lg:col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">{t('fees.exceptionBreakdown') || 'Exception Breakdown'}</CardTitle>
                            <CardDescription className="mt-1 hidden md:block">
                                {dashboard.exceptions?.totalCount || 0} {t('fees.activeExceptions') || 'active exceptions'}
                            </CardDescription>
                        </div>
                        <Button variant="ghost" size="icon">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {dashboard.exceptions && dashboard.exceptions.totalCount > 0 ? (
                            <>
                                {exceptionData.length > 0 && (
                                    <ChartContainer
                                        config={{
                                            value: {
                                                label: 'Count',
                                                color: 'hsl(var(--chart-1))',
                                            },
                                        } as ChartConfig}
                                        className="mx-auto aspect-square max-h-[120px] sm:max-h-[150px] md:max-h-[180px] w-full"
                                    >
                                        <PieChart>
                                            <Pie
                                                data={exceptionData}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                                innerRadius={30}
                                                outerRadius={50}
                                                fill="#8884d8"
                                                dataKey="value"
                                            >
                                                {exceptionData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))}
                                            </Pie>
                                            <ChartTooltip
                                                content={
                                                    <ChartTooltipContent
                                                        formatter={(value: number) => [value, t('fees.exceptions') || 'Exceptions']}
                                                    />
                                                }
                                            />
                                        </PieChart>
                                    </ChartContainer>
                                )}
                                <div className="space-y-3">
                                    {Object.entries(dashboard.exceptions.byType).map(([type, data]) => {
                                        if (data.count === 0) return null;
                                        const typeLabels: Record<string, string> = {
                                            discount_percentage: t('fees.exceptionTypes.discount_percentage') || 'Discount (%)',
                                            discount_fixed: t('fees.exceptionTypes.discount_fixed') || 'Discount (Fixed)',
                                            waiver: t('fees.exceptionTypes.waiver') || 'Waiver',
                                            custom: t('fees.exceptionTypes.custom') || 'Custom',
                                        };
                                        return (
                                            <div key={type} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                                                <div className="flex items-center gap-2">
                                                    <div 
                                                        className="w-3 h-3 rounded-full" 
                                                        style={{ backgroundColor: EXCEPTION_COLORS[type] || '#6b7280' }}
                                                    />
                                                    <span className="text-sm font-medium">{typeLabels[type] || type}</span>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm font-semibold">{data.count}</div>
                                                    <div className="text-xs text-muted-foreground">{formatCurrency(data.amount)}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                {dashboard.exceptions.impactOnCollection.exceptionReduction > 0 && (
                                    <div className="pt-3 border-t space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium text-muted-foreground">{t('fees.originalTotal') || 'Original Total'}</span>
                                            <span className="font-semibold">{formatCurrency(dashboard.exceptions.impactOnCollection.originalTotal)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium text-muted-foreground">{t('fees.exceptionReduction') || 'Exception Reduction'}</span>
                                            <span className="font-semibold text-orange-600">-{formatCurrency(dashboard.exceptions.impactOnCollection.exceptionReduction)}</span>
                                        </div>
                                        <div className="flex justify-between items-center border-t pt-2">
                                            <span className="text-sm font-medium">{t('fees.adjustedTotal') || 'Adjusted Total'}</span>
                                            <span className="font-bold">{formatCurrency(dashboard.exceptions.impactOnCollection.adjustedTotal)}</span>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                {t('fees.noExceptions') || 'No active exceptions'}
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="pt-3 pb-3">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full justify-start whitespace-normal sm:whitespace-nowrap"
                            onClick={() => navigate('/finance/fees/exceptions')}
                        >
                            <span className="text-left">{t('fees.viewAllExceptions') || 'View All Exceptions'}</span>
                            <ChevronRight className="h-4 w-4 ml-1.5 flex-shrink-0" />
                        </Button>
                    </CardFooter>
                </Card>
            </div>

            {/* Recent Payments & Quick Actions */}
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                {/* Recent Payments */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">{t('fees.recentPayments') || 'Recent Payments'}</CardTitle>
                            <CardDescription className="hidden md:block">Last 10 payments</CardDescription>
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate('/finance/fees/payments')}
                        >
                            {t('events.viewAll') || 'View All'}
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {dashboard.recentPayments.length > 0 ? (
                            <div className="space-y-3">
                                {dashboard.recentPayments.slice(0, 5).map((payment) => (
                                    <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg border">
                                        <div className="flex-1">
                                            <div className="font-medium text-sm">{payment.studentName || payment.studentRegistration || 'Unknown'}</div>
                                            <div className="text-xs text-muted-foreground">{payment.feeStructureName || '-'}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-semibold text-green-600">{formatCurrency(payment.amount)}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {payment.paymentDate ? formatDate(new Date(payment.paymentDate)) : '-'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                {t('fees.noRecentPayments') || 'No recent payments'}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">{t('dashboard.quickActions') || 'Quick Actions'}</CardTitle>
                        <CardDescription className="hidden md:block">{t('fees.manageFees') || 'Manage fees and assignments'}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Button 
                            variant="outline" 
                            className="w-full justify-start"
                            onClick={() => navigate('/finance/fees/structures')}
                        >
                            <FileText className="h-4 w-4 mr-2" />
                            {t('fees.structures') || 'Fee Structures'}
                        </Button>
                        <Button 
                            variant="outline" 
                            className="w-full justify-start"
                            onClick={() => navigate('/finance/fees/assignments')}
                        >
                            <NotebookPen className="h-4 w-4 mr-2" />
                            {t('fees.assignments') || 'Fee Assignments'}
                        </Button>
                        <Button 
                            variant="outline" 
                            className="w-full justify-start"
                            onClick={() => navigate('/finance/fees/payments')}
                        >
                            <CreditCard className="h-4 w-4 mr-2" />
                            {t('fees.payments') || 'Fee Payments'}
                        </Button>
                        <Button 
                            variant="outline" 
                            className="w-full justify-start"
                            onClick={() => navigate('/finance/fees/exceptions')}
                        >
                            <Shield className="h-4 w-4 mr-2" />
                            {t('fees.exceptions') || 'Fee Exceptions'}
                        </Button>
                        <Button 
                            variant="outline" 
                            className="w-full justify-start"
                            onClick={() => navigate('/finance/fees/reports')}
                        >
                            <BarChart3 className="h-4 w-4 mr-2" />
                            {t('nav.reports') || 'Fee Reports'}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

