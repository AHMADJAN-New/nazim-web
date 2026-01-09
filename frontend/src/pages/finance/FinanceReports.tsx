/**
 * Finance Reports Page - Various financial reports
 */

import {
    FileText,
    TrendingUp,
    TrendingDown,
    FolderKanban,
    Users,
    Wallet,
    Calendar,
    DollarSign,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area,
} from 'recharts';

import { FilterPanel } from '@/components/layout/FilterPanel';
import { PageHeader } from '@/components/layout/PageHeader';
import { ReportExportButtons } from '@/components/reports/ReportExportButtons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
    type ChartConfig,
} from '@/components/ui/chart';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    useDailyCashbook,
    useIncomeVsExpenseReport,
    useProjectSummaryReport,
    useDonorSummaryReport,
    useAccountBalancesReport,
    useIncomeEntries,
    useExpenseEntries,
} from '@/hooks/useFinance';
import { useLanguage } from '@/hooks/useLanguage';
import { formatCurrency, formatDate } from '@/lib/utils';


const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

export default function FinanceReports() {
    const { t } = useLanguage();
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [dateRange, setDateRange] = useState({
        startDate: firstDayOfMonth.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
    });

    const { data: cashbook, isLoading: cashbookLoading } = useDailyCashbook(dateRange.endDate);
    const { data: incomeVsExpense, isLoading: iveLoading } = useIncomeVsExpenseReport(dateRange.startDate, dateRange.endDate);
    const { data: projectSummary, isLoading: projectLoading } = useProjectSummaryReport();
    const { data: donorSummary, isLoading: donorLoading } = useDonorSummaryReport(dateRange.startDate, dateRange.endDate);
    const { data: accountBalances, isLoading: accountLoading } = useAccountBalancesReport();

    const DateRangePicker = () => (
        <FilterPanel title={t('events.filters') || 'Search & Filter'}>
            <div className="flex flex-col gap-4 md:flex-row md:items-end">
                <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <Label htmlFor="startDate">{t('events.from') || 'From'}</Label>
                    <CalendarDatePicker date={dateRange.startDate ? new Date(dateRange.startDate) : undefined} onDateChange={(date) => setDateRange(date ? date.toISOString().split("T")[0] : "")} />
                </div>
                <div className="flex items-center gap-2">
                    <Label htmlFor="endDate">{t('events.to') || 'To'}</Label>
                    <CalendarDatePicker date={dateRange.endDate ? new Date(dateRange.endDate) : undefined} onDateChange={(date) => setDateRange(date ? date.toISOString().split("T")[0] : "")} />
                </div>
            </div>
        </FilterPanel>
    );

    // Daily Cashbook Tab
    const DailyCashbookTab = () => {
        if (cashbookLoading) {
            return (
                <div className="flex items-center justify-center h-64">
                    <LoadingSpinner />
                </div>
            );
        }

        if (!cashbook || cashbook.cashbook.length === 0) {
            return (
                <div className="space-y-4">
                    <DateRangePicker />
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Wallet className="h-12 w-12 mb-4" />
                            <p>{t('finance.noCashbookData') || 'No cashbook data available for this date'}</p>
                        </CardContent>
                    </Card>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                <DateRangePicker />

                {/* Account Tabs */}
                <Tabs defaultValue={cashbook.cashbook[0]?.account.id || '0'} className="space-y-4">
                    <TabsList className="grid w-full grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 h-auto">
                        {cashbook.cashbook.map((cb, idx) => (
                            <TabsTrigger
                                key={cb.account.id}
                                value={cb.account.id}
                                className="flex flex-col items-start gap-1 p-3 h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                            >
                                <div className="flex items-center gap-2 w-full">
                                    <Wallet className="h-4 w-4" />
                                    <span className="font-semibold truncate">{cb.account.name}</span>
                                </div>
                                <span className="text-xs opacity-80">
                                    {formatCurrency(cb.closingBalance)}
                                </span>
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {cashbook.cashbook.map((cb) => {
                        // Combine income and expenses into a single entries array for display
                        const allEntries = [
                            ...cb.income.map(e => ({ ...e, type: 'income' as const, categoryName: e.incomeCategory?.name || '-' })),
                            ...cb.expenses.map(e => ({ ...e, type: 'expense' as const, categoryName: e.expenseCategory?.name || '-' })),
                        ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                        return (
                            <TabsContent key={cb.account.id} value={cb.account.id} className="space-y-4 mt-4">
                                {/* Account Header */}
                                <Card className="border-2">
                                    <CardHeader className="bg-muted/50">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-primary/10">
                                                    <Wallet className="h-6 w-6 text-primary" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-xl">{cb.account.name}</CardTitle>
                                                    <CardDescription className="flex items-center gap-2 mt-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {formatDate(cashbook.date)}
                                                    </CardDescription>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-lg px-4 py-2">
                                                {cb.account.type === 'cash' ? t('finance.cash') || 'Cash' : t('finance.fund') || 'Fund'}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                </Card>

                                {/* Summary Cards */}
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                    <Card className="border-l-4 border-l-slate-500">
                                        <CardContent className="pt-6">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-muted-foreground">
                                                    {t('finance.openingBalance') || 'Opening Balance'}
                                                </span>
                                                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                                                    <DollarSign className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                                                </div>
                                            </div>
                                            <div className="text-2xl font-bold">{formatCurrency(cb.openingBalance)}</div>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-l-4 border-l-green-500">
                                        <CardContent className="pt-6">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-muted-foreground">
                                                    {t('finance.totalIncome') || 'Total Income'}
                                                </span>
                                                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                                                    <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                                                </div>
                                            </div>
                                            <div className="text-2xl font-bold text-green-600">
                                                +{formatCurrency(cb.totalIncome)}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-l-4 border-l-red-500">
                                        <CardContent className="pt-6">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-muted-foreground">
                                                    {t('finance.totalExpenses') || 'Total Expenses'}
                                                </span>
                                                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                                                    <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                                                </div>
                                            </div>
                                            <div className="text-2xl font-bold text-red-600">
                                                -{formatCurrency(cb.totalExpense)}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-l-4 border-l-blue-500">
                                        <CardContent className="pt-6">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-muted-foreground">
                                                    {t('finance.closingBalance') || 'Closing Balance'}
                                                </span>
                                                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                                    <Wallet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                                </div>
                                            </div>
                                            <div className={`text-2xl font-bold ${cb.closingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {formatCurrency(cb.closingBalance)}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Transactions Table */}
                                <Card>
                                    <CardHeader>
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                                <CardTitle className="flex items-center gap-2">
                                                    <FileText className="h-5 w-5" />
                                                    {t('finance.transactions') || 'Transactions'}
                                                </CardTitle>
                                                <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 w-fit">
                                                    {allEntries.length} {t('finance.transactions') || 'transactions'}
                                                </Badge>
                                            </div>
                                            <ReportExportButtons
                                                data={allEntries}
                                                columns={[
                                                    { key: 'date', label: t('events.date'), align: 'left' },
                                                    { key: 'type', label: t('events.type'), align: 'left' },
                                                    { key: 'category', label: t('assets.category'), align: 'left' },
                                                    { key: 'description', label: t('events.description'), align: 'left' },
                                                    { key: 'amount', label: t('finance.amount'), align: 'right' },
                                                ]}
                                                reportKey="finance_daily_cashbook"
                                                title={`${t('finance.dailyCashbook') || 'Daily Cashbook'} - ${cb.account.name}`}
                                                transformData={(data) =>
                                                    data.map((entry) => ({
                                                        date: formatDate(entry.date),
                                                        type: entry.type === 'income'
                                                            ? (t('finance.income') || 'Income')
                                                            : (t('finance.expense') || 'Expense'),
                                                        category: entry.categoryName,
                                                        description: entry.description || '-',
                                                        amount: entry.type === 'income'
                                                            ? `+${formatCurrency(entry.amount)}`
                                                            : `-${formatCurrency(entry.amount)}`,
                                                    }))
                                                }
                                                buildFiltersSummary={() =>
                                                    `${t('events.date')}: ${formatDate(cashbook.date)} | ${t('finance.account')}: ${cb.account.name}`
                                                }
                                                templateType="finance_daily_cashbook"
                                                disabled={allEntries.length === 0}
                                            />
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="rounded-md border">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>{t('events.date') || 'Date'}</TableHead>
                                                        <TableHead>{t('events.type') || 'Type'}</TableHead>
                                                        <TableHead>{t('assets.category') || 'Category'}</TableHead>
                                                        <TableHead>{t('events.description') || 'Description'}</TableHead>
                                                        <TableHead className="text-right">{t('finance.amount') || 'Amount'}</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {allEntries.map((entry) => (
                                                        <TableRow key={entry.id} className="hover:bg-muted/50">
                                                            <TableCell className="font-medium">
                                                                {formatDate(entry.date)}
                                                            </TableCell>
                                                            <TableCell>
                                                                {entry.type === 'income' ? (
                                                                    <Badge variant="outline" className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400">
                                                                        <TrendingUp className="h-3 w-3 mr-1" />
                                                                        {t('finance.income') || 'Income'}
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="outline" className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
                                                                        <TrendingDown className="h-3 w-3 mr-1" />
                                                                        {t('finance.expense') || 'Expense'}
                                                                    </Badge>
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400">
                                                                    {entry.categoryName}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="max-w-[300px] truncate">
                                                                {entry.description || (
                                                                    <span className="text-muted-foreground italic">-</span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <Badge
                                                                    variant="outline"
                                                                    className={`font-semibold ${entry.type === 'income'
                                                                        ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                                                                        : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                                                                        }`}
                                                                >
                                                                    {entry.type === 'income' ? '+' : '-'}{formatCurrency(entry.amount)}
                                                                </Badge>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                    {allEntries.length === 0 && (
                                                        <TableRow>
                                                            <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                                                <div className="flex flex-col items-center gap-2">
                                                                    <FileText className="h-8 w-8 opacity-50" />
                                                                    <p>{t('finance.noTransactions') || 'No transactions found for this account'}</p>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        );
                    })}
                </Tabs>
            </div>
        );
    };

    // Income vs Expense Tab
    const IncomeVsExpenseTab = () => {
        const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

        // Fetch income and expense entries for time-series chart
        const { data: incomeEntries } = useIncomeEntries({
            dateFrom: dateRange.startDate,
            dateTo: dateRange.endDate,
        });
        const { data: expenseEntries } = useExpenseEntries({
            dateFrom: dateRange.startDate,
            dateTo: dateRange.endDate,
            status: 'approved',
        });

        // Aggregate entries by date for area chart
        const timeSeriesData = useMemo(() => {
            if (!incomeEntries || !expenseEntries) return [];

            // Create a map to aggregate by date
            const dateMap = new Map<string, { date: string; income: number; expense: number }>();

            // Process income entries
            incomeEntries.forEach(entry => {
                const dateKey = entry.date.toISOString().split('T')[0];
                const existing = dateMap.get(dateKey) || { date: dateKey, income: 0, expense: 0 };
                existing.income += entry.amount;
                dateMap.set(dateKey, existing);
            });

            // Process expense entries
            expenseEntries.forEach(entry => {
                const dateKey = entry.date.toISOString().split('T')[0];
                const existing = dateMap.get(dateKey) || { date: dateKey, income: 0, expense: 0 };
                existing.expense += entry.amount;
                dateMap.set(dateKey, existing);
            });

            // Convert to array and sort by date
            const data = Array.from(dateMap.values()).sort((a, b) =>
                new Date(a.date).getTime() - new Date(b.date).getTime()
            );

            // Filter by time range
            if (data.length === 0) return [];

            const referenceDate = new Date(data[data.length - 1].date);
            let daysToSubtract = 90;
            if (timeRange === '30d') {
                daysToSubtract = 30;
            } else if (timeRange === '7d') {
                daysToSubtract = 7;
            }

            const startDate = new Date(referenceDate);
            startDate.setDate(startDate.getDate() - daysToSubtract);

            return data.filter(item => {
                const itemDate = new Date(item.date);
                return itemDate >= startDate;
            });
        }, [incomeEntries, expenseEntries, timeRange]);

        const chartConfig = {
            income: {
                label: t('finance.income') || 'Income',
                color: 'hsl(142, 76%, 36%)', // green-600
            },
            expense: {
                label: t('finance.expense') || 'Expense',
                color: 'hsl(0, 84%, 60%)', // red-500
            },
        } satisfies ChartConfig;

        const categoryChartData = useMemo(() => {
            if (!incomeVsExpense) return [];
            const combined: { category: string; income?: number; expense?: number }[] = [];

            incomeVsExpense.incomeByCategory.forEach(item => {
                combined.push({ category: item.name, income: item.total });
            });

            incomeVsExpense.expenseByCategory.forEach(item => {
                const existing = combined.find(c => c.category === item.name);
                if (existing) {
                    existing.expense = item.total;
                } else {
                    combined.push({ category: item.name, expense: item.total });
                }
            });

            return combined;
        }, [incomeVsExpense]);

        // Prepare data for export - Income summary with categories
        const incomeExportData = useMemo(() => {
            if (!incomeVsExpense) return [];
            return incomeVsExpense.incomeByCategory.map((item) => ({
                category: item.name,
                type: t('finance.income') || 'Income',
                amount: item.total,
            }));
        }, [incomeVsExpense, t]);

        // Prepare data for export - Expense summary with categories
        const expenseExportData = useMemo(() => {
            if (!incomeVsExpense) return [];
            return incomeVsExpense.expenseByCategory.map((item) => ({
                category: item.name,
                type: t('finance.expense') || 'Expense',
                amount: item.total,
            }));
        }, [incomeVsExpense, t]);

        // Combined export data
        const combinedExportData = useMemo(() => {
            return [...incomeExportData, ...expenseExportData];
        }, [incomeExportData, expenseExportData]);

        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <DateRangePicker />
                    <ReportExportButtons
                        data={combinedExportData}
                        columns={[
                            { key: 'type', label: t('events.type'), align: 'left' },
                            { key: 'category', label: t('assets.category'), align: 'left' },
                            { key: 'amount', label: t('finance.amount'), align: 'right' },
                        ]}
                        reportKey="finance_income_expense_summary"
                        title={t('finance.incomeVsExpense') || 'Income vs Expense Summary'}
                        transformData={(data) =>
                            data.map((item) => ({
                                type: item.type,
                                category: item.category,
                                amount: formatCurrency(item.amount),
                            }))
                        }
                        buildFiltersSummary={() => `${dateRange.startDate} - ${dateRange.endDate}`}
                        templateType="finance_income_expense_summary"
                        disabled={iveLoading || !incomeVsExpense || combinedExportData.length === 0}
                    />
                </div>
                {iveLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <LoadingSpinner />
                    </div>
                ) : incomeVsExpense ? (
                    <>
                        {/* Summary */}
                        <div className="grid gap-4 md:grid-cols-3">
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-sm text-muted-foreground">{t('finance.totalIncome') || 'Total Income'}</div>
                                    <div className="text-2xl font-bold text-green-600">{formatCurrency(incomeVsExpense.summary.totalIncome)}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-sm text-muted-foreground">{t('finance.totalExpenses') || 'Total Expenses'}</div>
                                    <div className="text-2xl font-bold text-red-600">{formatCurrency(incomeVsExpense.summary.totalExpense)}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-sm text-muted-foreground">{t('finance.netBalance') || 'Net Balance'}</div>
                                    <div className={`text-2xl font-bold ${incomeVsExpense.summary.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatCurrency(incomeVsExpense.summary.net)}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Interactive Area Chart */}
                        <Card className="pt-0">
                            <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
                                <div className="grid flex-1 gap-1">
                                    <CardTitle>{t('finance.incomeVsExpenseTrend') || 'Income vs Expense Trend'}</CardTitle>
                                    <CardDescription>
                                        {t('finance.showingTrendsForPeriod') || 'Showing income and expense trends over time'}
                                    </CardDescription>
                                </div>
                                <Select value={timeRange} onValueChange={(value: '7d' | '30d' | '90d') => setTimeRange(value)}>
                                    <SelectTrigger
                                        className="hidden w-[160px] rounded-lg sm:ml-auto sm:flex"
                                        aria-label="Select time range"
                                    >
                                        <SelectValue placeholder={t('finance.selectTimeRange') || 'Select time range'} />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="7d" className="rounded-lg">
                                            {t('finance.last7Days') || 'Last 7 days'}
                                        </SelectItem>
                                        <SelectItem value="30d" className="rounded-lg">
                                            {t('finance.last30Days') || 'Last 30 days'}
                                        </SelectItem>
                                        <SelectItem value="90d" className="rounded-lg">
                                            {t('finance.last90Days') || 'Last 90 days'}
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </CardHeader>
                            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                                {timeSeriesData.length > 0 ? (
                                    <ChartContainer
                                        config={chartConfig}
                                        className="aspect-auto h-[300px] w-full"
                                    >
                                        <AreaChart data={timeSeriesData}>
                                            <defs>
                                                <linearGradient id="fillIncome" x1="0" y1="0" x2="0" y2="1">
                                                    <stop
                                                        offset="5%"
                                                        stopColor="var(--color-income)"
                                                        stopOpacity={0.8}
                                                    />
                                                    <stop
                                                        offset="95%"
                                                        stopColor="var(--color-income)"
                                                        stopOpacity={0.1}
                                                    />
                                                </linearGradient>
                                                <linearGradient id="fillExpense" x1="0" y1="0" x2="0" y2="1">
                                                    <stop
                                                        offset="5%"
                                                        stopColor="var(--color-expense)"
                                                        stopOpacity={0.8}
                                                    />
                                                    <stop
                                                        offset="95%"
                                                        stopColor="var(--color-expense)"
                                                        stopOpacity={0.1}
                                                    />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid vertical={false} />
                                            <XAxis
                                                dataKey="date"
                                                tickLine={false}
                                                axisLine={false}
                                                tickMargin={8}
                                                minTickGap={32}
                                                tickFormatter={(value) => {
                                                    const date = new Date(value);
                                                    return date.toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                    });
                                                }}
                                            />
                                            <ChartTooltip
                                                cursor={false}
                                                content={
                                                    <ChartTooltipContent
                                                        labelFormatter={(value) => {
                                                            return new Date(value).toLocaleDateString('en-US', {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                year: 'numeric',
                                                            });
                                                        }}
                                                        indicator="dot"
                                                        formatter={(value: number) => formatCurrency(value)}
                                                    />
                                                }
                                            />
                                            <Area
                                                dataKey="income"
                                                type="natural"
                                                fill="url(#fillIncome)"
                                                stroke="var(--color-income)"
                                                stackId="a"
                                            />
                                            <Area
                                                dataKey="expense"
                                                type="natural"
                                                fill="url(#fillExpense)"
                                                stroke="var(--color-expense)"
                                                stackId="a"
                                            />
                                            <ChartLegend content={<ChartLegendContent />} />
                                        </AreaChart>
                                    </ChartContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                                        {t('events.noData') || 'No data available for the selected period'}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Category Charts */}
                        <div className="grid gap-4 md:grid-cols-2">
                            <Card className="flex flex-col">
                                <CardHeader className="items-center pb-0">
                                    <CardTitle>{t('finance.incomeByCategory') || 'Income by Category'}</CardTitle>
                                    <CardDescription>
                                        {formatDate(new Date(dateRange.startDate))} - {formatDate(new Date(dateRange.endDate))}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1 pb-0">
                                    {incomeVsExpense.incomeByCategory.length > 0 ? (
                                        <ChartContainer
                                            config={incomeVsExpense.incomeByCategory.reduce((acc, item, index) => {
                                                const key = `income_${index}`;
                                                acc[key] = {
                                                    label: item.name,
                                                    color: COLORS[index % COLORS.length],
                                                };
                                                return acc;
                                            }, {} as ChartConfig)}
                                            className="mx-auto aspect-square max-h-[300px]"
                                        >
                                            <PieChart>
                                                <Pie
                                                    data={incomeVsExpense.incomeByCategory.map((item, index) => ({
                                                        category: `income_${index}`,
                                                        amount: item.total,
                                                        fill: `var(--color-income_${index})`,
                                                    }))}
                                                    dataKey="amount"
                                                    nameKey="category"
                                                />
                                                <ChartTooltip
                                                    content={
                                                        <ChartTooltipContent
                                                            formatter={(value: number) => formatCurrency(value)}
                                                        />
                                                    }
                                                />
                                                <ChartLegend
                                                    content={<ChartLegendContent nameKey="category" />}
                                                    className="-translate-y-2 flex-wrap gap-2 *:basis-1/4 *:justify-center"
                                                />
                                            </PieChart>
                                        </ChartContainer>
                                    ) : (
                                        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                                            {t('events.noData') || 'No data available'}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                            <Card className="flex flex-col">
                                <CardHeader className="items-center pb-0">
                                    <CardTitle>{t('finance.expenseByCategory') || 'Expenses by Category'}</CardTitle>
                                    <CardDescription>
                                        {formatDate(new Date(dateRange.startDate))} - {formatDate(new Date(dateRange.endDate))}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1 pb-0">
                                    {incomeVsExpense.expenseByCategory.length > 0 ? (
                                        <ChartContainer
                                            config={incomeVsExpense.expenseByCategory.reduce((acc, item, index) => {
                                                const key = `expense_${index}`;
                                                acc[key] = {
                                                    label: item.name,
                                                    color: COLORS[index % COLORS.length],
                                                };
                                                return acc;
                                            }, {} as ChartConfig)}
                                            className="mx-auto aspect-square max-h-[300px]"
                                        >
                                            <PieChart>
                                                <Pie
                                                    data={incomeVsExpense.expenseByCategory.map((item, index) => ({
                                                        category: `expense_${index}`,
                                                        amount: item.total,
                                                        fill: `var(--color-expense_${index})`,
                                                    }))}
                                                    dataKey="amount"
                                                    nameKey="category"
                                                />
                                                <ChartTooltip
                                                    content={
                                                        <ChartTooltipContent
                                                            formatter={(value: number) => formatCurrency(value)}
                                                        />
                                                    }
                                                />
                                                <ChartLegend
                                                    content={<ChartLegendContent nameKey="category" />}
                                                    className="-translate-y-2 flex-wrap gap-2 *:basis-1/4 *:justify-center"
                                                />
                                            </PieChart>
                                        </ChartContainer>
                                    ) : (
                                        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                                            {t('events.noData') || 'No data available'}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </>
                ) : null}
            </div>
        );
    };

    // Project Summary Tab
    const ProjectSummaryTab = () => (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <DateRangePicker />
                <ReportExportButtons
                    data={projectSummary?.projects || []}
                    columns={[
                        { key: 'name', label: t('events.name'), align: 'left' },
                        { key: 'income', label: t('finance.income'), align: 'right' },
                        { key: 'expense', label: t('finance.expense'), align: 'right' },
                        { key: 'balance', label: t('finance.balance'), align: 'right' },
                    ]}
                    reportKey="finance_project_summary"
                    title={t('finance.projectSummary') || 'Project Summary Report'}
                    transformData={(data) =>
                        data.map((item) => ({
                            name: item.project.name,
                            income: formatCurrency(item.totalIncome),
                            expense: formatCurrency(item.totalExpense),
                            balance: formatCurrency(item.balance),
                        }))
                    }
                    buildFiltersSummary={() => `${dateRange.startDate} - ${dateRange.endDate}`}
                    templateType="finance_project_summary"
                    disabled={projectLoading || !projectSummary || projectSummary.projects.length === 0}
                />
            </div>
            {projectLoading ? (
                <div className="flex items-center justify-center h-64">
                    <LoadingSpinner />
                </div>
            ) : projectSummary && projectSummary.projects.length > 0 ? (
                <>
                    {/* Summary */}
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-sm text-muted-foreground">{t('finance.totalProjects') || 'Total Projects'}</div>
                                <div className="text-2xl font-bold">{projectSummary.projects.length}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-sm text-muted-foreground">{t('finance.totalProjectIncome') || 'Total Income'}</div>
                                <div className="text-2xl font-bold text-green-600">
                                    {formatCurrency(projectSummary.projects.reduce((sum, p) => sum + p.totalIncome, 0))}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-sm text-muted-foreground">{t('finance.totalProjectExpense') || 'Total Expense'}</div>
                                <div className="text-2xl font-bold text-red-600">
                                    {formatCurrency(projectSummary.projects.reduce((sum, p) => sum + p.totalExpense, 0))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Project Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('finance.projectDetails') || 'Project Details'}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('events.name') || 'Name'}</TableHead>
                                        <TableHead className="text-right">{t('finance.income') || 'Income'}</TableHead>
                                        <TableHead className="text-right">{t('finance.expense') || 'Expense'}</TableHead>
                                        <TableHead className="text-right">{t('finance.balance') || 'Balance'}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {projectSummary.projects.map((item) => (
                                        <TableRow key={item.project.id}>
                                            <TableCell className="font-medium">{item.project.name}</TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant="outline" className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 font-semibold">
                                                    {formatCurrency(item.totalIncome)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant="outline" className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 font-semibold">
                                                    {formatCurrency(item.totalExpense)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge
                                                    variant="outline"
                                                    className={`font-semibold ${item.balance >= 0
                                                        ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                                                        : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                                                        }`}
                                                >
                                                    {formatCurrency(item.balance)}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Chart */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('finance.projectComparison') || 'Project Comparison'}</CardTitle>
                            <CardDescription>
                                {t('finance.showingProjectIncomeExpense') || 'Showing income and expense across all projects'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer
                                config={{
                                    income: {
                                        label: t('finance.income') || 'Income',
                                        color: 'hsl(142, 76%, 36%)', // green-600
                                    },
                                    expense: {
                                        label: t('finance.expense') || 'Expense',
                                        color: 'hsl(0, 84%, 60%)', // red-500
                                    },
                                } satisfies ChartConfig}
                                className="h-[300px] w-full"
                            >
                                <BarChart
                                    accessibilityLayer
                                    data={projectSummary.projects.map(item => ({
                                        project: item.project.name,
                                        income: item.totalIncome,
                                        expense: item.totalExpense,
                                    }))}
                                    margin={{
                                        left: -20,
                                        right: 12,
                                        top: 12,
                                        bottom: 12,
                                    }}
                                >
                                    <CartesianGrid vertical={false} />
                                    <XAxis
                                        dataKey="project"
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={8}
                                        tickFormatter={(value) => value.length > 10 ? value.slice(0, 10) + '...' : value}
                                    />
                                    <YAxis
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={8}
                                        tickCount={5}
                                        tickFormatter={(value) => {
                                            if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                                            if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                                            return value.toString();
                                        }}
                                    />
                                    <ChartTooltip
                                        cursor={false}
                                        content={
                                            <ChartTooltipContent
                                                formatter={(value: number) => formatCurrency(value)}
                                            />
                                        }
                                    />
                                    <Bar
                                        dataKey="expense"
                                        fill="var(--color-expense)"
                                        radius={[4, 4, 0, 0]}
                                        stackId="a"
                                    />
                                    <Bar
                                        dataKey="income"
                                        fill="var(--color-income)"
                                        radius={[4, 4, 0, 0]}
                                        stackId="a"
                                    />
                                </BarChart>
                            </ChartContainer>
                        </CardContent>
                        <CardFooter>
                            <div className="flex w-full items-start gap-2 text-sm">
                                <div className="grid gap-2">
                                    <div className="flex items-center gap-2 leading-none font-medium">
                                        {t('finance.totalProjects') || 'Total Projects'}: {projectSummary.projects.length}
                                        <FolderKanban className="h-4 w-4" />
                                    </div>
                                    <div className="text-muted-foreground flex items-center gap-2 leading-none">
                                        {formatDate(new Date(dateRange.startDate))} - {formatDate(new Date(dateRange.endDate))}
                                    </div>
                                </div>
                            </div>
                        </CardFooter>
                    </Card>
                </>
            ) : (
                <Card>
                    <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
                        <FolderKanban className="h-8 w-8 mr-2" />
                        {t('finance.noProjectData') || 'No project data available for this period'}
                    </CardContent>
                </Card>
            )}
        </div>
    );

    // Donor Summary Tab
    const DonorSummaryTab = () => (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <DateRangePicker />
                <ReportExportButtons
                    data={donorSummary?.donors || []}
                    columns={[
                        { key: 'name', label: t('events.name'), align: 'left' },
                        { key: 'type', label: t('events.type'), align: 'left' },
                        { key: 'donationCount', label: t('finance.donationCount'), align: 'right' },
                        { key: 'totalDonated', label: t('finance.totalDonated'), align: 'right' },
                    ]}
                    reportKey="finance_donor_summary"
                    title={t('finance.donorSummary') || 'Donor Summary Report'}
                    transformData={(data) =>
                        data.map((item) => ({
                            name: item.donor.name,
                            type: item.donor.type === 'individual' ? t('finance.individual') || 'Individual' : t('students.organization') || 'Organization',
                            donationCount: item.donationCount.toString(),
                            totalDonated: formatCurrency(item.totalDonated),
                        }))
                    }
                    buildFiltersSummary={() => `${dateRange.startDate} - ${dateRange.endDate}`}
                    templateType="finance_donor_summary"
                    disabled={donorLoading || !donorSummary || donorSummary.donors.length === 0}
                />
            </div>
            {donorLoading ? (
                <div className="flex items-center justify-center h-64">
                    <LoadingSpinner />
                </div>
            ) : donorSummary && donorSummary.donors.length > 0 ? (
                <>
                    {/* Summary */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-sm text-muted-foreground">{t('finance.totalDonors') || 'Total Donors'}</div>
                                <div className="text-2xl font-bold">{donorSummary.donors.length}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-sm text-muted-foreground">{t('finance.totalDonations') || 'Total Donations'}</div>
                                <div className="text-2xl font-bold text-green-600">
                                    {formatCurrency(donorSummary.donors.reduce((sum, d) => sum + d.totalDonated, 0))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Donor Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('finance.donorContributions') || 'Donor Contributions'}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('events.name') || 'Name'}</TableHead>
                                        <TableHead>{t('events.type') || 'Type'}</TableHead>
                                        <TableHead className="text-right">{t('finance.donationCount') || 'Donations'}</TableHead>
                                        <TableHead className="text-right">{t('finance.totalAmount') || 'Total Amount'}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {donorSummary.donors.map((item) => (
                                        <TableRow key={item.donor.id}>
                                            <TableCell className="font-medium">{item.donor.name}</TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        item.donor.type === 'individual'
                                                            ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400'
                                                            : 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400'
                                                    }
                                                >
                                                    {item.donor.type === 'individual' ? t('finance.individual') || 'Individual' : t('students.organization') || 'Organization'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400">
                                                    {item.donationCount}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant="outline" className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 font-semibold">
                                                    {formatCurrency(item.totalDonated)}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Top Donors Chart */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('finance.topDonors') || 'Top Donors'}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={donorSummary.donors.slice(0, 10).map(item => ({ name: item.donor.name, totalDonated: item.totalDonated }))} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" />
                                    <YAxis dataKey="name" type="category" width={150} />
                                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                    <Bar dataKey="totalDonated" name={t('finance.donated') || 'Donated'} fill="#22c55e" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </>
            ) : (
                <Card>
                    <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
                        <Users className="h-8 w-8 mr-2" />
                        {t('finance.noDonorData') || 'No donor data available for this period'}
                    </CardContent>
                </Card>
            )}
        </div>
    );

    // Account Balances Tab
    const AccountBalancesTab = () => (
        <div className="space-y-4">
            <div className="flex justify-end">
                <ReportExportButtons
                    data={accountBalances?.accounts || []}
                    columns={[
                        { key: 'name', label: t('events.name'), align: 'left' },
                        { key: 'type', label: t('events.type'), align: 'left' },
                        { key: 'openingBalance', label: t('finance.openingBalance'), align: 'right' },
                        { key: 'currentBalance', label: t('finance.currentBalance'), align: 'right' },
                    ]}
                    reportKey="finance_account_balances"
                    title={t('finance.accountBalances') || 'Account Balances Report'}
                    transformData={(data) =>
                        data.map((item) => ({
                            name: item.account.name,
                            type: item.account.type === 'cash' ? t('finance.cash') || 'Cash' : t('finance.fund') || 'Fund',
                            openingBalance: formatCurrency(item.openingBalance),
                            currentBalance: formatCurrency(item.currentBalance),
                        }))
                    }
                    templateType="finance_account_balances"
                    disabled={accountLoading || !accountBalances || accountBalances.accounts.length === 0}
                />
            </div>
            {accountLoading ? (
                <div className="flex items-center justify-center h-64">
                    <LoadingSpinner />
                </div>
            ) : accountBalances && accountBalances.accounts.length > 0 ? (
                <>
                    {/* Summary */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>{t('finance.totalBalance') || 'Total Balance'}</CardTitle>
                                <span className="text-3xl font-bold">{formatCurrency(accountBalances.totalBalance)}</span>
                            </div>
                        </CardHeader>
                    </Card>

                    {/* Account Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('finance.accountDetails') || 'Account Details'}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('events.name') || 'Name'}</TableHead>
                                        <TableHead>{t('events.type') || 'Type'}</TableHead>
                                        <TableHead className="text-right">{t('finance.openingBalance') || 'Opening Balance'}</TableHead>
                                        <TableHead className="text-right">{t('finance.currentBalance') || 'Current Balance'}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {accountBalances.accounts.map((item) => (
                                        <TableRow key={item.account.id}>
                                            <TableCell className="font-medium">{item.account.name}</TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        item.account.type === 'cash'
                                                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                                                            : 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400'
                                                    }
                                                >
                                                    {item.account.type === 'cash' ? t('finance.cash') || 'Cash' : t('finance.fund') || 'Fund'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant="outline" className="bg-slate-50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 font-medium">
                                                    {formatCurrency(item.openingBalance)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge
                                                    variant="outline"
                                                    className={`font-semibold ${item.currentBalance >= 0
                                                        ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                                                        : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                                                        }`}
                                                >
                                                    {formatCurrency(item.currentBalance)}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Chart */}
                    <Card className="flex flex-col">
                        <CardHeader className="items-center pb-0">
                            <CardTitle>{t('finance.balanceDistribution') || 'Balance Distribution'}</CardTitle>
                            <CardDescription>
                                {t('finance.accountBalances') || 'Current account balances'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 pb-0">
                            <ChartContainer
                                config={accountBalances.accounts.reduce((acc, item, index) => {
                                    const key = `account_${index}`;
                                    acc[key] = {
                                        label: item.account.name,
                                        color: COLORS[index % COLORS.length],
                                    };
                                    return acc;
                                }, {} as ChartConfig)}
                                className="mx-auto aspect-square max-h-[300px]"
                            >
                                <PieChart>
                                    <Pie
                                        data={accountBalances.accounts.map((item, index) => ({
                                            account: `account_${index}`,
                                            balance: item.currentBalance,
                                            fill: `var(--color-account_${index})`,
                                        }))}
                                        dataKey="balance"
                                        nameKey="account"
                                    />
                                    <ChartTooltip
                                        content={
                                            <ChartTooltipContent
                                                formatter={(value: number) => formatCurrency(value)}
                                            />
                                        }
                                    />
                                    <ChartLegend
                                        content={<ChartLegendContent nameKey="account" />}
                                        className="-translate-y-2 flex-wrap gap-2 *:basis-1/4 *:justify-center"
                                    />
                                </PieChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                </>
            ) : (
                <Card>
                    <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
                        <Wallet className="h-8 w-8 mr-2" />
                        {t('finance.noAccountData') || 'No account data available'}
                    </CardContent>
                </Card>
            )}
        </div>
    );

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
            <PageHeader
                title={t('nav.reports') || 'Finance Reports'}
                description={t('finance.reportsDescription') || 'Generate and view financial reports'}
                icon={<FileText className="h-5 w-5" />}
            />

            {/* Tabs */}
            <Tabs defaultValue="cashbook" className="space-y-4">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="cashbook" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="hidden sm:inline">{t('finance.dailyCashbook') || 'Cashbook'}</span>
                    </TabsTrigger>
                    <TabsTrigger value="income-expense" className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        <span className="hidden sm:inline">{t('finance.incomeVsExpense') || 'Income/Expense'}</span>
                    </TabsTrigger>
                    <TabsTrigger value="projects" className="flex items-center gap-2">
                        <FolderKanban className="h-4 w-4" />
                        <span className="hidden sm:inline">{t('finance.projectSummary') || 'Projects'}</span>
                    </TabsTrigger>
                    <TabsTrigger value="donors" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span className="hidden sm:inline">{t('finance.donorSummary') || 'Donors'}</span>
                    </TabsTrigger>
                    <TabsTrigger value="accounts" className="flex items-center gap-2">
                        <Wallet className="h-4 w-4" />
                        <span className="hidden sm:inline">{t('finance.accountBalances') || 'Balances'}</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="cashbook">
                    <DailyCashbookTab />
                </TabsContent>
                <TabsContent value="income-expense">
                    <IncomeVsExpenseTab />
                </TabsContent>
                <TabsContent value="projects">
                    <ProjectSummaryTab />
                </TabsContent>
                <TabsContent value="donors">
                    <DonorSummaryTab />
                </TabsContent>
                <TabsContent value="accounts">
                    <AccountBalancesTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}
