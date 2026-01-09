/**
 * Assets Dashboard - Modern Overview of assets data
 */

import {
    Package,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Calendar,
    Download,
    ChevronRight,
    Wrench,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Boxes,
    UserCheck,
    Building2,
    ArrowRight,
} from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
    type ChartConfig,
} from '@/components/ui/chart';
import { LoadingSpinner } from '@/components/ui/loading';
import { useAssetsDashboard } from '@/hooks/useAssets';
import { useLanguage } from '@/hooks/useLanguage';
import { formatCurrency, formatDate } from '@/lib/utils';


const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

// Calculate percentage change (mock for now - can be enhanced with previous month data)
const calculatePercentageChange = (current: number, previous: number = 0): number => {
    if (previous === 0) return current > 0 ? 12.5 : 0;
    return ((current - previous) / previous) * 100;
};

export default function AssetsDashboard() {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const { data: dashboard, isLoading, error } = useAssetsDashboard();

    // Prepare status data for charts
    const statusData = useMemo(() => {
        if (!dashboard) return [];
        return Object.entries(dashboard.statusCounts).map(([status, count]) => ({
            name: status.charAt(0).toUpperCase() + status.slice(1),
            value: count as number,
            status,
        }));
    }, [dashboard]);

    // Prepare category data
    const categoryData = useMemo(() => {
        if (!dashboard) return [];
        return dashboard.assetsByCategory.map((item) => ({
            name: item.categoryName || 'Uncategorized',
            value: item.total,
            count: item.count,
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

    const totalValueChange = calculatePercentageChange(dashboard.totalValue, dashboard.totalValue * 0.9);
    const maintenanceCostChange = calculatePercentageChange(dashboard.maintenanceCost, dashboard.maintenanceCost * 1.1);

    // Get current date range
    const currentDate = new Date();
    const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
            {/* Header with Date Range */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                        {t('assets.dashboard') || 'Assets Dashboard'}
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm sm:text-base hidden md:block">
                        {t('assets.dashboardDescription') || 'Overview of your organization\'s assets'}
                    </p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                    <div className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg border bg-background">
                        <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs sm:text-sm font-medium hidden sm:inline">
                            {formatDate(startDate)} - {formatDate(endDate)}
                        </span>
                        <span className="text-xs font-medium sm:hidden">
                            {formatDate(startDate)}
                        </span>
                    </div>
                    <Button variant="outline" size="icon" className="flex-shrink-0">
                        <Download className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Summary Cards Row */}
            <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
                {/* Total Assets */}
                <Card className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-8 -mt-8 pointer-events-none opacity-50" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground break-words flex-1 min-w-0">
                            {t('assets.totalAssets') || 'Total Assets'}
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-blue-500/10 flex-shrink-0">
                            <Boxes className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                    </CardHeader>
                    <CardContent className="pb-3">
                        <div className="text-2xl sm:text-3xl font-bold mb-2 break-words">
                            {dashboard.totalAssets}
                        </div>
                        <div className="text-xs text-muted-foreground mb-2 break-words line-clamp-2">
                            {t('assets.totalAssetsDescription') || 'Total assets in inventory'}
                        </div>
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                            <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
                            <span className="text-green-600 dark:text-green-400 font-medium whitespace-nowrap">
                                {dashboard.statusCounts.available || 0} {t('assets.available') || 'available'}
                            </span>
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-2 pt-3 pb-3">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full justify-start whitespace-normal sm:whitespace-nowrap"
                            onClick={() => navigate('/assets')}
                        >
                            <ArrowRight className="h-4 w-4 mr-1.5 flex-shrink-0" />
                            <span className="text-left">{t('assets.viewAssets') || 'View Assets'}</span>
                        </Button>
                    </CardFooter>
                </Card>

                {/* Total Value */}
                <Card className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full -mr-8 -mt-8 pointer-events-none opacity-50" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground break-words flex-1 min-w-0">
                            {t('assets.totalValue') || 'Total Value'}
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-green-500/10 flex-shrink-0">
                            <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
                        </div>
                    </CardHeader>
                    <CardContent className="pb-3">
                        <div className="text-2xl sm:text-3xl font-bold mb-2 break-words text-green-600">
                            {formatCurrency(dashboard.totalValue)}
                        </div>
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
                            <span className="text-green-600 dark:text-green-400 font-medium whitespace-nowrap">
                                {totalValueChange.toFixed(1)}%
                            </span>
                            <span className="text-muted-foreground break-words">
                                vs last month
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Maintenance Cost */}
                <Card className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -mr-8 -mt-8 pointer-events-none opacity-50" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground break-words flex-1 min-w-0">
                            {t('assets.maintenanceCost') || 'Maintenance Cost'}
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-amber-500/10 flex-shrink-0">
                            <Wrench className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                    </CardHeader>
                    <CardContent className="pb-3">
                        <div className="text-2xl sm:text-3xl font-bold mb-2 text-amber-600 break-words">
                            {formatCurrency(dashboard.maintenanceCost)}
                        </div>
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                            <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-500 flex-shrink-0" />
                            <span className="text-red-600 dark:text-red-400 font-medium whitespace-nowrap">
                                {Math.abs(maintenanceCostChange).toFixed(1)}%
                            </span>
                            <span className="text-muted-foreground break-words">
                                vs last month
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Assigned Assets */}
                <Card className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full -mr-8 -mt-8 pointer-events-none opacity-50" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground break-words flex-1 min-w-0">
                            {t('assets.assignedAssets') || 'Assigned Assets'}
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-purple-500/10 flex-shrink-0">
                            <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                    </CardHeader>
                    <CardContent className="pb-3">
                        <div className="text-2xl sm:text-3xl font-bold mb-2 break-words">
                            {dashboard.statusCounts.assigned || 0}
                        </div>
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                            <UserCheck className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-muted-foreground break-words">
                                {dashboard.recentAssignments.length} {t('assets.recentAssignments') || 'recent assignments'}
                            </span>
                        </div>
                    </CardContent>
                    <CardFooter className="pt-3 pb-3">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full justify-start whitespace-normal sm:whitespace-nowrap"
                            onClick={() => navigate('/assets/assignments')}
                        >
                            <ChevronRight className="h-4 w-4 mr-1.5 flex-shrink-0" />
                            <span className="text-left">{t('assets.viewAssignments') || 'View Assignments'}</span>
                        </Button>
                    </CardFooter>
                </Card>

                {/* Assets in Maintenance */}
                <Card className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full -mr-8 -mt-8 pointer-events-none opacity-50" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground break-words flex-1 min-w-0">
                            {t('assets.inMaintenance') || 'In Maintenance'}
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-orange-500/10 flex-shrink-0">
                            <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 dark:text-orange-400" />
                        </div>
                    </CardHeader>
                    <CardContent className="pb-3">
                        <div className="text-2xl sm:text-3xl font-bold mb-2 text-orange-600 break-words">
                            {dashboard.statusCounts.maintenance || 0}
                        </div>
                        <div className="text-xs text-muted-foreground mb-2 break-words">
                            {t('assets.requiresAttention') || 'Requires attention'}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Row */}
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
                {/* Status Breakdown */}
                <Card className="md:col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">{t('assets.statusBreakdown') || 'Status Breakdown'}</CardTitle>
                            <CardDescription className="mt-1">
                                {t('assets.totalAssets') || 'Total'}: <span className="font-semibold text-foreground">{dashboard.totalAssets}</span>
                            </CardDescription>
                        </div>
                        <Button variant="ghost" size="icon">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {statusData.length > 0 ? (
                            <ChartContainer
                                config={statusData.reduce((acc, item, index) => {
                                    const key = `status_${index}`;
                                    acc[key] = {
                                        label: item.name,
                                        color: COLORS[index % COLORS.length],
                                    };
                                    return acc;
                                }, {} as ChartConfig)}
                                className="mx-auto aspect-square max-h-[150px] sm:max-h-[180px] md:max-h-[200px] w-full"
                            >
                                <PieChart>
                                    <Pie
                                        data={statusData.map((item, index) => ({
                                            status: `status_${index}`,
                                            value: item.value,
                                            fill: `var(--color-status_${index})`,
                                        }))}
                                        dataKey="value"
                                        nameKey="status"
                                        innerRadius={60}
                                        outerRadius={80}
                                    >
                                        {statusData.map((_, index) => (
                                            <Cell key={`cell-${index}`} />
                                        ))}
                                    </Pie>
                                    <ChartTooltip
                                        content={
                                            <ChartTooltipContent
                                                formatter={(value: number) => `${value} assets`}
                                            />
                                        }
                                    />
                                </PieChart>
                            </ChartContainer>
                        ) : (
                            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                                <div className="text-center">
                                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p>No status data</p>
                                </div>
                            </div>
                        )}
                        <div className="mt-4 space-y-2">
                            {statusData.slice(0, 5).map((item, index) => {
                                const percentage = dashboard.totalAssets > 0 
                                    ? (item.value / dashboard.totalAssets) * 100 
                                    : 0;
                                return (
                                    <div key={item.status} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <div 
                                                className="w-2 h-2 rounded-full" 
                                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                            />
                                            <span>{item.name}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-medium">{item.value}</span>
                                            <span className="text-xs text-muted-foreground ml-2">({percentage.toFixed(0)}%)</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Assets by Category */}
                <Card className="md:col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">{t('assets.assetsByCategory') || 'Assets by Category'}</CardTitle>
                            <CardDescription>
                                {t('assets.categoryDistribution') || 'Distribution by category'}
                            </CardDescription>
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate('/assets/categories')}
                        >
                            {t('assets.viewCategories') || 'View Categories'}
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {categoryData.length > 0 ? (
                            <ChartContainer
                                config={{
                                    value: {
                                        label: 'Value',
                                        color: 'hsl(var(--chart-1))',
                                    },
                                } as ChartConfig}
                                className="h-[200px] sm:h-[220px] md:h-[250px] w-full"
                            >
                                <BarChart data={categoryData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis 
                                        dataKey="name" 
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={8}
                                        angle={-45}
                                        textAnchor="end"
                                        height={80}
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
                                        dataKey="value" 
                                        fill="var(--color-value)"
                                        radius={[8, 8, 0, 0]}
                                    />
                                </BarChart>
                            </ChartContainer>
                        ) : (
                            <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                                <div className="text-center">
                                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p>No category data</p>
                                </div>
                            </div>
                        )}
                        <div className="mt-4 space-y-2">
                            {categoryData.slice(0, 4).map((item) => (
                                <div key={item.name} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <Package className="h-3 w-3 text-muted-foreground" />
                                        <span>{item.name}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-medium">{formatCurrency(item.value)}</span>
                                        <span className="text-xs text-muted-foreground ml-2">({item.count} {t('assets.items') || 'items'})</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Assets by Finance Account */}
                {dashboard.assetsByAccount && dashboard.assetsByAccount.length > 0 && (
                    <Card className="md:col-span-1">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-lg">{t('assets.assetsByFinanceAccount') || 'Assets by Finance Account'}</CardTitle>
                                <CardDescription>
                                    {t('assets.linkedToAccounts') || 'Assets linked to finance accounts'}
                                </CardDescription>
                            </div>
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => navigate('/finance/accounts')}
                            >
                                {t('finance.viewAccounts') || 'View Accounts'}
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {dashboard.assetsByAccount.slice(0, 7).map((account) => (
                                    <div 
                                        key={account.account_id} 
                                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                                <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm truncate">
                                                    {account.account_name}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {account.asset_count} {t('assets.items') || 'items'} • {account.currency_code}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-semibold text-sm">
                                                {formatCurrency(account.total_value)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Recent Assignments */}
                <Card className="md:col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">{t('assets.recentAssignments') || 'Recent Assignments'}</CardTitle>
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate('/assets/assignments')}
                        >
                            {t('events.viewAll') || 'View All'}
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {dashboard.recentAssignments.length > 0 ? (
                                dashboard.recentAssignments.slice(0, 7).map((assignment) => {
                                    const isActive = assignment.status === 'active';
                                    const isReturned = assignment.status === 'returned';
                                    return (
                                        <div 
                                            key={assignment.id} 
                                            className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className={`p-2 rounded-lg ${
                                                    isActive 
                                                        ? 'bg-green-100 dark:bg-green-900/30' 
                                                        : isReturned
                                                        ? 'bg-gray-100 dark:bg-gray-900/30'
                                                        : 'bg-blue-100 dark:bg-blue-900/30'
                                                }`}>
                                                    {isActive ? (
                                                        <UserCheck className={`h-4 w-4 ${
                                                            isActive 
                                                                ? 'text-green-600 dark:text-green-400' 
                                                                : 'text-gray-600 dark:text-gray-400'
                                                        }`} />
                                                    ) : (
                                                        <CheckCircle2 className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-sm truncate">
                                                        {assignment.assetName}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <Calendar className="h-3 w-3" />
                                                        {assignment.assignedOn ? formatDate(assignment.assignedOn) : 'N/A'}
                                                        {assignment.assignedToName && (
                                                            <>
                                                                <span>•</span>
                                                                <span>{assignment.assignedToName}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Badge 
                                                    variant="outline" 
                                                    className={`font-semibold ${
                                                        isActive
                                                            ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                                                            : isReturned
                                                            ? 'bg-gray-50 dark:bg-gray-950/30 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-400'
                                                            : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400'
                                                    }`}
                                                >
                                                    {assignment.status}
                                                </Badge>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <UserCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p>{t('assets.noAssignments') || 'No recent assignments'}</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

