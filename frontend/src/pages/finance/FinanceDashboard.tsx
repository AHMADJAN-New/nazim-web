/**
 * Finance Dashboard - Modern Overview of finance data
 */

import {
    Wallet,
    TrendingUp,
    TrendingDown,
    FolderKanban,
    Users,
    ArrowUpRight,
    ArrowDownRight,
    DollarSign,
    Calendar,
    Download,
    ChevronRight,
    CreditCard,
    Building2,
    FileText,
    ShoppingBag,
    Coffee,
    Car,
    BookOpen,
    MoreVertical,
    Package,
    Minus,
    Plus,
} from 'lucide-react';
import { useMemo, useState } from 'react';
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
    ChartLegend,
    ChartLegendContent,
    type ChartConfig,
} from '@/components/ui/chart';
import { LoadingSpinner } from '@/components/ui/loading';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { useFinanceDashboard, useFinanceBaseCurrency, useFinanceAccounts } from '@/hooks/useFinance';
import { useLanguage } from '@/hooks/useLanguage';
import { formatCurrency, formatDate } from '@/lib/utils';





const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

// Calculate percentage change (mock for now - can be enhanced with previous month data)
const calculatePercentageChange = (current: number, previous: number = 0): number => {
    if (previous === 0) return current > 0 ? 12.5 : 0;
    return ((current - previous) / previous) * 100;
};

export default function FinanceDashboard() {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const baseCurrency = useFinanceBaseCurrency();
    const currencyCode = baseCurrency?.code ?? 'AFN';
    const { data: dashboard, isLoading, error } = useFinanceDashboard();
    const { data: accounts } = useFinanceAccounts();
    const accountIdToCurrencyCode = useMemo(() => {
        const map = new Map<string, string>();
        accounts?.forEach((a) => {
            if (a.currency?.code) map.set(a.id, a.currency.code);
        });
        return map;
    }, [accounts]);
    const [includeAssetsAndBooks, setIncludeAssetsAndBooks] = useState(true);

    // Calculate totals and percentages
    const incomeTotal = useMemo(() => {
        return dashboard?.incomeByCategory.reduce((sum, item) => sum + item.total, 0) || 0;
    }, [dashboard]);

    const expenseTotal = useMemo(() => {
        return dashboard?.expenseByCategory.reduce((sum, item) => sum + item.total, 0) || 0;
    }, [dashboard]);

    // Prepare income data with percentages
    const incomeData = useMemo(() => {
        if (!dashboard) return [];
        return dashboard.incomeByCategory.map((item) => ({
            ...item,
            percentage: incomeTotal > 0 ? (item.total / incomeTotal) * 100 : 0,
        }));
    }, [dashboard, incomeTotal]);

    // Prepare monthly expenses chart data (last 6 months - mock data structure)
    const monthlyExpensesData = useMemo(() => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        return months.map((month, index) => ({
            month,
            amount: dashboard?.summary.currentMonthExpense 
                ? (dashboard.summary.currentMonthExpense * (0.7 + Math.random() * 0.6))
                : 0,
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

    const netThisMonth = dashboard.summary.netThisMonth;
    const isPositive = netThisMonth >= 0;
    const balanceChange = calculatePercentageChange(dashboard.summary.totalBalance, dashboard.summary.totalBalance * 0.9);
    const incomeChange = calculatePercentageChange(dashboard.summary.currentMonthIncome, dashboard.summary.currentMonthIncome * 0.9);
    const expenseChange = calculatePercentageChange(dashboard.summary.currentMonthExpense, dashboard.summary.currentMonthExpense * 1.1);

    // Get current date range
    const currentDate = new Date();
    const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
            <PageHeader
                title={t('finance.dashboard') || 'Finance Dashboard'}
                description={t('finance.dashboardDescription') || 'Overview of your organization\'s finances'}
                icon={<Wallet className="h-5 w-5" />}
                rightSlot={
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-background w-full sm:w-auto">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                                {formatDate(startDate)} - {formatDate(endDate)}
                            </span>
                        </div>
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
                {/* Total Balance - Enhanced with Toggle */}
                <Card className="relative overflow-hidden col-span-1 sm:col-span-2 lg:col-span-2">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-8 -mt-8 pointer-events-none opacity-50" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground break-words flex-1 min-w-0">
                            {t('finance.totalBalance') || 'Total Balance'}
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-blue-500/10 flex-shrink-0">
                            <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                    </CardHeader>
                    <CardContent className="pb-3 space-y-4">
                        {/* Main Total Display */}
                        <div className="space-y-1">
                            <div className="text-3xl sm:text-4xl font-bold break-words">
                                {formatCurrency(
                                    includeAssetsAndBooks 
                                        ? dashboard.summary.totalBalance 
                                        : (dashboard.summary.totalCashBalance ?? dashboard.summary.totalBalance - dashboard.summary.totalAssetsValue - (dashboard.totalLibraryBooksValue || 0)),
                                    currencyCode
                                )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Switch
                                    checked={includeAssetsAndBooks}
                                    onCheckedChange={setIncludeAssetsAndBooks}
                                    className="scale-75"
                                />
                                <span>
                                    {includeAssetsAndBooks 
                                        ? t('finance.includeAssetsAndBooks') || 'Including assets & books'
                                        : t('finance.cashOnly') || 'Cash only'
                                    }
                                </span>
                            </div>
                        </div>

                        {/* Breakdown */}
                        <div className="space-y-2 pt-2 border-t">
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="text-muted-foreground">{t('finance.cashBalance') || 'Cash Balance'}</span>
                                </div>
                                <span className="font-medium">
                                    {formatCurrency(dashboard.summary.totalCashBalance ?? dashboard.summary.totalBalance - dashboard.summary.totalAssetsValue - (dashboard.totalLibraryBooksValue || 0), currencyCode)}
                                </span>
                            </div>
                            {dashboard.summary.totalAssetsValue > 0 && (
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <Package className="h-3.5 w-3.5 text-amber-600" />
                                        <span className="text-muted-foreground">{t('finance.assets') || 'Assets'}</span>
                                    </div>
                                    <span className={`font-medium ${includeAssetsAndBooks ? 'text-amber-600' : 'text-muted-foreground'}`}>
                                        {includeAssetsAndBooks ? <Plus className="h-3 w-3 inline mr-1" /> : <Minus className="h-3 w-3 inline mr-1" />}
                                        {formatCurrency(dashboard.summary.totalAssetsValue, currencyCode)}
                                    </span>
                                </div>
                            )}
                            {(dashboard.totalLibraryBooksValue || 0) > 0 && (
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <BookOpen className="h-3.5 w-3.5 text-blue-600" />
                                        <span className="text-muted-foreground">{t('finance.libraryBooks') || 'Library Books'}</span>
                                    </div>
                                    <span className={`font-medium ${includeAssetsAndBooks ? 'text-blue-600' : 'text-muted-foreground'}`}>
                                        {includeAssetsAndBooks ? <Plus className="h-3 w-3 inline mr-1" /> : <Minus className="h-3 w-3 inline mr-1" />}
                                        {formatCurrency(dashboard.totalLibraryBooksValue || 0, currencyCode)}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Trend Indicator */}
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm pt-2 border-t">
                            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
                            <span className="text-green-600 dark:text-green-400 font-medium whitespace-nowrap">
                                {balanceChange.toFixed(1)}%
                            </span>
                            <span className="text-muted-foreground break-words">
                                {t('finance.vsLastMonth') || 'vs last month'}
                            </span>
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-2 pt-3 pb-3">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full justify-start whitespace-normal sm:whitespace-nowrap"
                            onClick={() => navigate('/finance/accounts')}
                        >
                            <ChevronRight className="h-4 w-4 mr-1.5 flex-shrink-0" />
                            <span className="text-left">{t('finance.viewAccounts') || 'View Accounts'}</span>
                        </Button>
                    </CardFooter>
                </Card>

                {/* Net Profit */}
                <Card className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full -mr-8 -mt-8 pointer-events-none opacity-50" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground break-words flex-1 min-w-0">
                            {t('finance.netThisMonth') || 'Net Profit'}
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-green-500/10 flex-shrink-0">
                            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
                        </div>
                    </CardHeader>
                    <CardContent className="pb-3">
                        <div className={`text-2xl sm:text-3xl font-bold mb-2 break-words ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {isPositive ? '+' : ''}{formatCurrency(netThisMonth, currencyCode)}
                        </div>
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
                            <span className="text-green-600 dark:text-green-400 font-medium whitespace-nowrap">
                                {incomeChange.toFixed(1)}%
                            </span>
                            <span className="text-muted-foreground break-words">
                                {t('finance.vsLastMonth') || 'vs last month'}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Assets Value */}
                <Card className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -mr-8 -mt-8 pointer-events-none opacity-50" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground break-words flex-1 min-w-0">
                            {t('finance.totalAssetsValue') || 'Total Assets Value'}
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-amber-500/10 flex-shrink-0">
                            <Package className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                    </CardHeader>
                    <CardContent className="pb-3">
                        <div className="text-2xl sm:text-3xl font-bold mb-2 text-amber-600 break-words">
                            {formatCurrency(dashboard.summary.totalAssetsValue, currencyCode)}
                        </div>
                        <div className="text-xs text-muted-foreground mb-2 break-words">
                            {dashboard.assetsByAccount.length > 0 && (
                                <span>{dashboard.assetsByAccount.length} {t('finance.account') || 'account(s)'}</span>
                            )}
                        </div>
                    </CardContent>
                    <CardFooter className="pt-3 pb-3">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full justify-start whitespace-normal sm:whitespace-nowrap"
                            onClick={() => navigate('/assets')}
                        >
                            <ChevronRight className="h-4 w-4 mr-1.5 flex-shrink-0" />
                            <span className="text-left">{t('finance.viewAssets') || 'View Assets'}</span>
                        </Button>
                    </CardFooter>
                </Card>

                {/* Library Books Value */}
                <Card className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-8 -mt-8 pointer-events-none opacity-50" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground break-words flex-1 min-w-0">
                            {t('finance.totalLibraryBooksValue') || 'Total Library Books Value'}
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-blue-500/10 flex-shrink-0">
                            <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                    </CardHeader>
                    <CardContent className="pb-3">
                        <div className="text-2xl sm:text-3xl font-bold mb-2 text-blue-600 break-words">
                            {formatCurrency(dashboard.totalLibraryBooksValue || dashboard.summary.totalLibraryBooksValue || 0, currencyCode)}
                        </div>
                        <div className="text-xs text-muted-foreground mb-2 break-words">
                            {dashboard.libraryBooksByAccount && dashboard.libraryBooksByAccount.length > 0 && (
                                <span>{dashboard.libraryBooksByAccount.length} {t('finance.account') || 'account(s)'}</span>
                            )}
                        </div>
                    </CardContent>
                    <CardFooter className="pt-3 pb-3">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full justify-start whitespace-normal sm:whitespace-nowrap"
                            onClick={() => navigate('/library/books')}
                        >
                            <ChevronRight className="h-4 w-4 mr-1.5 flex-shrink-0" />
                            <span className="text-left">{t('finance.viewLibraryBooks') || 'View Library Books'}</span>
                        </Button>
                    </CardFooter>
                </Card>

                {/* Expenses */}
                <Card className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full -mr-8 -mt-8 pointer-events-none opacity-50" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground break-words flex-1 min-w-0">
                            {t('finance.monthlyExpenses') || 'Expenses'}
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-red-500/10 flex-shrink-0">
                            <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-red-400" />
                        </div>
                    </CardHeader>
                    <CardContent className="pb-3">
                        <div className="text-2xl sm:text-3xl font-bold mb-2 text-red-600 break-words">
                            {formatCurrency(dashboard.summary.currentMonthExpense, currencyCode)}
                        </div>
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                            <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-500 flex-shrink-0" />
                            <span className="text-red-600 dark:text-red-400 font-medium whitespace-nowrap">
                                {Math.abs(expenseChange).toFixed(1)}%
                            </span>
                            <span className="text-muted-foreground break-words">
                                {t('finance.vsLastMonth') || 'vs last month'}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Active Projects */}
                <Card className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full -mr-8 -mt-8 pointer-events-none opacity-50" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground break-words flex-1 min-w-0">
                            {t('finance.activeProjects') || 'Active Projects'}
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-purple-500/10 flex-shrink-0">
                            <FolderKanban className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                    </CardHeader>
                    <CardContent className="pb-3">
                        <div className="text-2xl sm:text-3xl font-bold mb-2 break-words">
                            {dashboard.summary.activeProjects}
                        </div>
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-muted-foreground break-words">
                                {dashboard.summary.activeDonors} {t('finance.activeDonorsText') || 'active donors'}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Row */}
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
                {/* Income Sources */}
                <Card className="lg:col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">{t('finance.incomeByCategory') || 'Income Sources'}</CardTitle>
                            <CardDescription className="mt-1 hidden sm:block">
                                Total: <span className="font-semibold text-foreground">{formatCurrency(incomeTotal, currencyCode)}</span>
                            </CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" className="hidden sm:flex">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-500 flex-shrink-0" />
                            <span className="text-xs sm:text-sm text-green-600 dark:text-green-400 font-medium">
                                {incomeChange.toFixed(1)}% {t('finance.comparedToLastMonth') || 'compared to last month'}
                            </span>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="space-y-2">
                            <Progress value={100} className="h-2" />
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{t('finance.totalIncomeDistribution') || 'Total Income Distribution'}</span>
                            </div>
                        </div>

                        {/* Income Breakdown */}
                        <div className="space-y-3">
                            {incomeData.slice(0, 4).map((item, index) => (
                                <div key={item.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <div 
                                            className="w-3 h-3 rounded-full flex-shrink-0" 
                                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                        />
                                        <span className="text-xs sm:text-sm font-medium truncate">{item.name}</span>
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-2">
                                        <div className="text-xs sm:text-sm font-semibold">{formatCurrency(item.total, currencyCode)}</div>
                                        <div className="text-xs text-muted-foreground">{item.percentage.toFixed(1)}%</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                    <CardFooter className="pt-3 pb-3">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full justify-start whitespace-normal sm:whitespace-nowrap"
                            onClick={() => navigate('/finance/income')}
                        >
                            <span className="text-left">{t('finance.viewAllIncome') || 'View All Income'}</span>
                            <ChevronRight className="h-4 w-4 ml-1.5 flex-shrink-0" />
                        </Button>
                    </CardFooter>
                </Card>

                {/* Monthly Expenses Chart */}
                <Card className="lg:col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="min-w-0 flex-1">
                            <CardTitle className="text-lg">{t('finance.monthlyExpenses') || 'Monthly Expenses'}</CardTitle>
                            <CardDescription className="hidden sm:block">{t('finance.last6Months') || 'Last 6 months'}</CardDescription>
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm"
                            className="hidden sm:flex flex-shrink-0 ml-2"
                            onClick={() => navigate('/finance/reports')}
                        >
                            {t('examReports.viewReport') || 'View Report'}
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer
                            config={{
                                amount: {
                                    label: 'Amount',
                                    color: 'hsl(var(--chart-1))',
                                },
                            } as ChartConfig}
                            className="h-[200px] sm:h-[220px] md:h-[250px] w-full"
                        >
                            <BarChart data={monthlyExpensesData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis 
                                    dataKey="month" 
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    tick={{ fontSize: 12 }}
                                />
                                <YAxis 
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    tick={{ fontSize: 12 }}
                                    tickFormatter={(value) => {
                                        if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
                                        return `$${value}`;
                                    }}
                                />
                                <ChartTooltip
                                    content={
                                        <ChartTooltipContent
                                            formatter={(value: number) => formatCurrency(value, currencyCode)}
                                        />
                                    }
                                />
                                <Bar 
                                    dataKey="amount" 
                                    fill="var(--color-amount)"
                                    radius={[8, 8, 0, 0]}
                                />
                            </BarChart>
                        </ChartContainer>
                        <div className="flex items-center gap-2 mt-3 sm:mt-4 text-xs sm:text-sm">
                            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
                            <span className="text-green-600 dark:text-green-400 font-medium">
                                {(t('finance.trendingUpByThisMonth') || 'Trending up by {percentage}% this month').replace('{percentage}', Math.abs(expenseChange).toFixed(1))}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 hidden sm:block">
                            {t('finance.showingDataFromLast6Months') || 'Showing data from the last 6 months'}
                        </p>
                    </CardContent>
                </Card>

                {/* Summary Donut Chart */}
                <Card className="lg:col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="min-w-0 flex-1">
                            <CardTitle className="text-lg">{t('finance.summary') || 'Summary'}</CardTitle>
                            <CardDescription className="hidden sm:block">
                                {(t('finance.dataFromTo') || 'Data from {startDate} - {endDate}').replace('{startDate}', formatDate(startDate)).replace('{endDate}', formatDate(endDate))}
                            </CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" className="hidden sm:flex flex-shrink-0 ml-2">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {dashboard.expenseByCategory.length > 0 ? (
                            <ChartContainer
                                config={dashboard.expenseByCategory.reduce((acc, item, index) => {
                                    const key = `expense_${index}`;
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
                                        data={dashboard.expenseByCategory.map((item, index) => ({
                                            category: `expense_${index}`,
                                            amount: item.total,
                                            fill: `var(--color-expense_${index})`,
                                        }))}
                                        dataKey="amount"
                                        nameKey="category"
                                        innerRadius={40}
                                        outerRadius={60}
                                    >
                                        {dashboard.expenseByCategory.map((_, index) => (
                                            <Cell key={`cell-${index}`} />
                                        ))}
                                    </Pie>
                                    <ChartTooltip
                                        content={
                                            <ChartTooltipContent
                                                formatter={(value: number) => formatCurrency(value, currencyCode)}
                                            />
                                        }
                                    />
                                </PieChart>
                            </ChartContainer>
                        ) : (
                            <div className="flex items-center justify-center h-[150px] sm:h-[180px] md:h-[200px] text-muted-foreground">
                                <div className="text-center">
                                    <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-xs sm:text-sm">{t('finance.noExpensesData') || 'No expenses data'}</p>
                                </div>
                            </div>
                        )}
                        <div className="mt-3 sm:mt-4 space-y-2">
                            {dashboard.expenseByCategory.slice(0, 4).map((item, index) => {
                                const percentage = expenseTotal > 0 
                                    ? (item.total / expenseTotal) * 100 
                                    : 0;
                                return (
                                    <div key={item.id} className="flex items-center justify-between text-xs sm:text-sm">
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <div 
                                                className="w-2 h-2 rounded-full flex-shrink-0" 
                                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                            />
                                            <span className="truncate">{item.name}</span>
                                        </div>
                                        <span className="font-medium flex-shrink-0 ml-2">{percentage.toFixed(0)}%</span>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Bottom Row - Transactions and Accounts */}
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
                {/* Recent Transactions */}
                <Card className="lg:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">{t('finance.transactions') || 'Transactions'}</CardTitle>
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                                // Navigate to income or expenses page - could be enhanced to show combined view
                                navigate('/finance/income');
                            }}
                        >
                            {t('events.viewAll') || 'View All'}
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {/* Combine recent income and expenses */}
                            {[
                                ...dashboard.recentIncome.slice(0, 3).map(entry => ({
                                    ...entry,
                                    type: 'income' as const,
                                    icon: Building2,
                                    color: 'green',
                                })),
                                ...dashboard.recentExpenses.slice(0, 4).map(entry => ({
                                    ...entry,
                                    type: 'expense' as const,
                                    icon: ShoppingBag,
                                    color: 'red',
                                })),
                            ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 7).map((entry) => {
                                const Icon = entry.type === 'income' ? Building2 : ShoppingBag;
                                const isIncome = entry.type === 'income';
                                return (
                                    <div 
                                        key={entry.id} 
                                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className={`p-2 rounded-lg ${
                                                isIncome 
                                                    ? 'bg-green-100 dark:bg-green-900/30' 
                                                    : 'bg-red-100 dark:bg-red-900/30'
                                            }`}>
                                                <Icon className={`h-4 w-4 ${
                                                    isIncome 
                                                        ? 'text-green-600 dark:text-green-400' 
                                                        : 'text-red-600 dark:text-red-400'
                                                }`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm truncate">
                                                    {isIncome 
                                                        ? entry.incomeCategory?.name || 'Income'
                                                        : entry.expenseCategory?.name || 'Expense'}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <Calendar className="h-3 w-3" />
                                                    {formatDate(entry.date)}
                                                    {isIncome && entry.donor && (
                                                        <>
                                                            <span>•</span>
                                                            <span>{entry.donor.name}</span>
                                                        </>
                                                    )}
                                                    {!isIncome && entry.paidTo && (
                                                        <>
                                                            <span>•</span>
                                                            <span>{entry.paidTo}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Badge 
                                                variant="outline" 
                                                className={`font-semibold ${
                                                    isIncome
                                                        ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                                                        : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                                                }`}
                                            >
                                                {isIncome ? '+' : '-'}{formatCurrency(entry.amount, currencyCode)}
                                            </Badge>
                                            <Badge variant="outline" className="text-xs">
                                                {isIncome ? (t('finance.income') || 'Income') : (t('finance.expenses') || 'Expenses')}
                                            </Badge>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Account Balances */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">{t('finance.accountBalances') || 'Account Balances'}</CardTitle>
                            <CardDescription>
                                {dashboard.accountBalances.length === 1 
                                    ? t('finance.totalAccounts', { count: 1 }) || 'A total of 1 account'
                                    : t('finance.totalAccounts', { count: dashboard.accountBalances.length }) || 
                                      `A total of ${dashboard.accountBalances.length} accounts`}
                            </CardDescription>
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate('/finance/accounts')}
                        >
                            {t('finance.addNew') || '+ Add New'}
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {dashboard.accountBalances.slice(0, 2).map((account, index) => (
                            <div 
                                key={account.id}
                                className={`p-4 rounded-lg text-white ${
                                    index === 0 
                                        ? 'bg-gradient-to-br from-green-500 to-green-600' 
                                        : 'bg-gradient-to-br from-blue-500 to-blue-600'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <CreditCard className="h-4 w-4" />
                                        <span className="text-sm font-medium opacity-90">
                                            {account.type === 'cash' ? (t('finance.cashAccount') || 'Cash Account') : (t('finance.fundAccount') || 'Fund Account')}
                                        </span>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-white/20">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="text-xs opacity-75 mb-1">
                                    {account.name}
                                </div>
                                <div className="text-2xl font-bold">
                                    {formatCurrency(account.currentBalance, accountIdToCurrencyCode.get(account.id) ?? currencyCode)}
                                </div>
                            </div>
                        ))}
                        {dashboard.accountBalances.length > 2 && (
                            <Button 
                                variant="outline" 
                                className="w-full" 
                                size="sm"
                                onClick={() => navigate('/finance/accounts')}
                            >
                                {t('finance.viewAllAccounts') || 'View All Accounts'}
                            </Button>
                        )}
                    </CardContent>
                </Card>

                {/* Assets Breakdown */}
                {(dashboard.assetsByAccount.length > 0 || dashboard.assetsByCurrency.length > 0) && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">{t('finance.assetsBreakdown') || 'Assets Breakdown'}</CardTitle>
                            <CardDescription>
                                {t('finance.assetsBreakdownDescription') || 'Assets value by account and currency'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Assets by Account */}
                            {dashboard.assetsByAccount.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold mb-3">
                                        {t('finance.assetsByAccount') || 'Assets by Account'}
                                    </h4>
                                    <div className="space-y-2">
                                        {dashboard.assetsByAccount.map((item) => (
                                            <div key={item.accountId} className="flex items-center justify-between p-3 rounded-lg border">
                                                <div>
                                                    <div className="font-medium">{item.accountName}</div>
                                                    <div className="text-xs text-muted-foreground">{item.currencyCode}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-semibold">{formatCurrency(item.totalValue, item.currencyCode)}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Assets by Currency */}
                            {dashboard.assetsByCurrency.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold mb-3">
                                        {t('finance.assetsByCurrency') || 'Assets by Currency'}
                                    </h4>
                                    <div className="space-y-2">
                                        {dashboard.assetsByCurrency.map((item) => (
                                            <div key={item.currencyId} className="flex items-center justify-between p-3 rounded-lg border">
                                                <div>
                                                    <div className="font-medium">{item.currencyCode}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {t('finance.originalValue') || 'Original'}: {formatCurrency(item.totalValue, item.currencyCode)}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-semibold">{formatCurrency(item.convertedValue, currencyCode)}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {t('finance.convertedValue') || 'Converted'}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Library Books Breakdown */}
                {(dashboard.libraryBooksByAccount && dashboard.libraryBooksByAccount.length > 0) || 
                 (dashboard.libraryBooksByCurrency && dashboard.libraryBooksByCurrency.length > 0) ? (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">{t('finance.libraryBooksBreakdown') || 'Library Books Breakdown'}</CardTitle>
                            <CardDescription>
                                {t('finance.libraryBooksBreakdownDescription') || 'Library books value by account and currency'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Library Books by Account */}
                            {dashboard.libraryBooksByAccount && dashboard.libraryBooksByAccount.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold mb-3">
                                        {t('finance.libraryBooksByAccount') || 'Library Books by Account'}
                                    </h4>
                                    <div className="space-y-2">
                                        {dashboard.libraryBooksByAccount.map((item) => (
                                            <div key={item.accountId} className="flex items-center justify-between p-3 rounded-lg border">
                                                <div>
                                                    <div className="font-medium">{item.accountName}</div>
                                                    <div className="text-xs text-muted-foreground">{item.currencyCode}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-semibold">{formatCurrency(item.totalValue, item.currencyCode)}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Library Books by Currency */}
                            {dashboard.libraryBooksByCurrency && dashboard.libraryBooksByCurrency.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold mb-3">
                                        {t('finance.libraryBooksByCurrency') || 'Library Books by Currency'}
                                    </h4>
                                    <div className="space-y-2">
                                        {dashboard.libraryBooksByCurrency.map((item) => (
                                            <div key={item.currencyId} className="flex items-center justify-between p-3 rounded-lg border">
                                                <div>
                                                    <div className="font-medium">{item.currencyCode}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {t('finance.originalValue') || 'Original'}: {formatCurrency(item.totalValue, item.currencyCode)}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-semibold">{formatCurrency(item.convertedValue, currencyCode)}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {t('finance.converted') || 'Converted'}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ) : null}
            </div>
        </div>
    );
}
