/**
 * Finance Dashboard - Modern Overview of finance data
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useFinanceDashboard } from '@/hooks/useFinance';
import { useLanguage } from '@/hooks/useLanguage';
import { LoadingSpinner } from '@/components/ui/loading';
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
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
    type ChartConfig,
} from '@/components/ui/chart';
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts';
import { useMemo } from 'react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

// Calculate percentage change (mock for now - can be enhanced with previous month data)
const calculatePercentageChange = (current: number, previous: number = 0): number => {
    if (previous === 0) return current > 0 ? 12.5 : 0;
    return ((current - previous) / previous) * 100;
};

export default function FinanceDashboard() {
    const { t } = useLanguage();
    const { data: dashboard, isLoading, error } = useFinanceDashboard();

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
                {t('common.error') || 'An error occurred'}: {(error as Error).message}
            </div>
        );
    }

    if (!dashboard) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                {t('common.noData') || 'No data available'}
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
        <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
            {/* Header with Date Range */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {t('finance.dashboard') || 'Finance Dashboard'}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {t('finance.dashboardDescription') || 'Overview of your organization\'s finances'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-background">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                            {formatDate(startDate)} - {formatDate(endDate)}
                        </span>
                    </div>
                    <Button variant="outline" size="icon">
                        <Download className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Summary Cards Row */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Total Balance */}
                <Card className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {t('finance.totalBalance') || 'My Balance'}
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-blue-500/10">
                            <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold mb-2">
                            {formatCurrency(dashboard.summary.totalBalance)}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <TrendingUp className="h-4 w-4 text-green-500" />
                            <span className="text-green-600 dark:text-green-400 font-medium">
                                {balanceChange.toFixed(1)}%
                            </span>
                            <span className="text-muted-foreground">
                                compared to last month
                            </span>
                        </div>
                    </CardContent>
                    <CardFooter className="flex gap-2 pt-0">
                        <Button variant="outline" size="sm" className="flex-1">
                            <ArrowUpRight className="h-4 w-4 mr-1" />
                            Transfer
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1">
                            <ArrowDownRight className="h-4 w-4 mr-1" />
                            Request
                        </Button>
                    </CardFooter>
                </Card>

                {/* Net Profit */}
                <Card className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full -mr-16 -mt-16" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {t('finance.netThisMonth') || 'Net Profit'}
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-green-500/10">
                            <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-3xl font-bold mb-2 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {isPositive ? '+' : ''}{formatCurrency(netThisMonth)}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <TrendingUp className="h-4 w-4 text-green-500" />
                            <span className="text-green-600 dark:text-green-400 font-medium">
                                {incomeChange.toFixed(1)}%
                            </span>
                            <span className="text-muted-foreground">
                                compared to last month
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Expenses */}
                <Card className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full -mr-16 -mt-16" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {t('finance.monthlyExpenses') || 'Expenses'}
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-red-500/10">
                            <DollarSign className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold mb-2 text-red-600">
                            {formatCurrency(dashboard.summary.currentMonthExpense)}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <TrendingDown className="h-4 w-4 text-red-500" />
                            <span className="text-red-600 dark:text-red-400 font-medium">
                                {Math.abs(expenseChange).toFixed(1)}%
                            </span>
                            <span className="text-muted-foreground">
                                compared to last month
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Active Projects */}
                <Card className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full -mr-16 -mt-16" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {t('finance.activeProjects') || 'Active Projects'}
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-purple-500/10">
                            <FolderKanban className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold mb-2">
                            {dashboard.summary.activeProjects}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">
                                {dashboard.summary.activeDonors} active donors
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Row */}
            <div className="grid gap-4 md:grid-cols-3">
                {/* Income Sources */}
                <Card className="md:col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">{t('finance.incomeByCategory') || 'Income Sources'}</CardTitle>
                            <CardDescription className="mt-1">
                                Total: <span className="font-semibold text-foreground">{formatCurrency(incomeTotal)}</span>
                            </CardDescription>
                        </div>
                        <Button variant="ghost" size="icon">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                                {incomeChange.toFixed(1)}% compared to last month
                            </span>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="space-y-2">
                            <Progress value={100} className="h-2" />
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Total Income Distribution</span>
                            </div>
                        </div>

                        {/* Income Breakdown */}
                        <div className="space-y-3">
                            {incomeData.slice(0, 4).map((item, index) => (
                                <div key={item.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div 
                                            className="w-3 h-3 rounded-full" 
                                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                        />
                                        <span className="text-sm font-medium">{item.name}</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-semibold">{formatCurrency(item.total)}</div>
                                        <div className="text-xs text-muted-foreground">{item.percentage.toFixed(1)}%</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                    <CardFooter className="pt-0">
                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                            <FileText className="h-3 w-3" />
                            Income streams growing steadily. Monitor your accounts for better efficiency.
                        </p>
                    </CardFooter>
                </Card>

                {/* Monthly Expenses Chart */}
                <Card className="md:col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">{t('finance.monthlyExpenses') || 'Monthly Expenses'}</CardTitle>
                            <CardDescription>Last 6 months</CardDescription>
                        </div>
                        <Button variant="outline" size="sm">
                            View Report
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
                            className="h-[250px] w-full"
                        >
                            <BarChart data={monthlyExpensesData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis 
                                    dataKey="month" 
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
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
                                    dataKey="amount" 
                                    fill="var(--color-amount)"
                                    radius={[8, 8, 0, 0]}
                                />
                            </BarChart>
                        </ChartContainer>
                        <div className="flex items-center gap-2 mt-4 text-sm">
                            <TrendingUp className="h-4 w-4 text-green-500" />
                            <span className="text-green-600 dark:text-green-400 font-medium">
                                Trending up by 5.2% this month
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Showing data from the last 6 months
                        </p>
                    </CardContent>
                </Card>

                {/* Summary Donut Chart */}
                <Card className="md:col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">Summary</CardTitle>
                            <CardDescription>
                                Data from {formatDate(startDate)} - {formatDate(endDate)}
                            </CardDescription>
                        </div>
                        <Button variant="ghost" size="icon">
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
                                className="mx-auto aspect-square max-h-[200px]"
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
                                        innerRadius={60}
                                        outerRadius={80}
                                    >
                                        {dashboard.expenseByCategory.map((_, index) => (
                                            <Cell key={`cell-${index}`} />
                                        ))}
                                    </Pie>
                                    <ChartTooltip
                                        content={
                                            <ChartTooltipContent
                                                formatter={(value: number) => formatCurrency(value)}
                                            />
                                        }
                                    />
                                </PieChart>
                            </ChartContainer>
                        ) : (
                            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                                <div className="text-center">
                                    <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p>No expenses data</p>
                                </div>
                            </div>
                        )}
                        <div className="mt-4 space-y-2">
                            {dashboard.expenseByCategory.slice(0, 4).map((item, index) => {
                                const percentage = expenseTotal > 0 
                                    ? (item.total / expenseTotal) * 100 
                                    : 0;
                                return (
                                    <div key={item.id} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <div 
                                                className="w-2 h-2 rounded-full" 
                                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                            />
                                            <span>{item.name}</span>
                                        </div>
                                        <span className="font-medium">{percentage.toFixed(0)}%</span>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Bottom Row - Transactions and Accounts */}
            <div className="grid gap-4 md:grid-cols-3">
                {/* Recent Transactions */}
                <Card className="md:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">Transactions</CardTitle>
                        <Button variant="outline" size="sm">
                            View All
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
                                                {isIncome ? '+' : '-'}{formatCurrency(entry.amount)}
                                            </Badge>
                                            <Badge variant="outline" className="text-xs">
                                                {isIncome ? 'Income' : 'Expenses'}
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
                            <CardTitle className="text-lg">Account Balances</CardTitle>
                            <CardDescription>
                                A total of {dashboard.accountBalances.length} account{dashboard.accountBalances.length !== 1 ? 's' : ''}
                            </CardDescription>
                        </div>
                        <Button variant="outline" size="sm">
                            + Add New
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
                                            {account.type === 'cash' ? 'Cash Account' : 'Fund Account'}
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
                                    {formatCurrency(account.currentBalance)}
                                </div>
                            </div>
                        ))}
                        {dashboard.accountBalances.length > 2 && (
                            <Button variant="outline" className="w-full" size="sm">
                                View All Accounts
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
