/**
 * Org Admin Finance Reports - Same report types as school finance, for organization-level data.
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
  ResponsiveContainer,
  PieChart,
  Pie,
  AreaChart,
  Area,
} from 'recharts';

import { FilterPanel } from '@/components/layout/FilterPanel';
import { PageHeader } from '@/components/layout/PageHeader';
import { ReportExportButtons } from '@/components/reports/ReportExportButtons';
import { Badge } from '@/components/ui/badge';
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
  useOrgFinanceDailyCashbook,
  useOrgFinanceIncomeVsExpenseReport,
  useOrgFinanceProjectSummaryReport,
  useOrgFinanceDonorSummaryReport,
  useOrgFinanceAccountBalancesReport,
  useOrgFinanceIncomeEntries,
  useOrgFinanceExpenseEntries,
  useOrgFinanceAccounts,
  useOrgFinanceCurrencies,
} from '@/hooks/useOrgFinance';
import { useLanguage } from '@/hooks/useLanguage';
import { formatCurrency, formatDate, getAccountCurrencyCode } from '@/lib/utils';
import { dateToLocalYYYYMMDD, parseLocalDate } from '@/lib/dateUtils';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

export default function OrgAdminFinanceReportsPage() {
  const { t, tUnsafe } = useLanguage();
  const { data: accounts = [] } = useOrgFinanceAccounts({ isActive: true });
  const { data: currencies = [] } = useOrgFinanceCurrencies({ isActive: true });
  const baseCurrency = useMemo(
    () => (Array.isArray(currencies) ? currencies.find((c) => c.isBase) ?? currencies[0] : null),
    [currencies]
  );
  const currencyCode = (baseCurrency as { code?: string } | undefined)?.code ?? 'AFN';
  const accountIdToCurrencyCode = useMemo(() => {
    const map = new Map<string, string>();
    accounts?.forEach((a) => {
      if ((a as { currency?: { code?: string } }).currency?.code)
        map.set(a.id, (a as { currency: { code: string } }).currency.code);
    });
    return map;
  }, [accounts]);

  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [dateRange, setDateRange] = useState({
    startDate: dateToLocalYYYYMMDD(firstDayOfMonth),
    endDate: dateToLocalYYYYMMDD(today),
  });

  const { data: cashbook, isLoading: cashbookLoading } = useOrgFinanceDailyCashbook(dateRange.endDate);
  const { data: incomeVsExpense, isLoading: iveLoading } = useOrgFinanceIncomeVsExpenseReport(
    dateRange.startDate,
    dateRange.endDate
  );
  const { data: projectSummary, isLoading: projectLoading } = useOrgFinanceProjectSummaryReport();
  const { data: donorSummary, isLoading: donorLoading } = useOrgFinanceDonorSummaryReport(
    dateRange.startDate,
    dateRange.endDate
  );
  const { data: accountBalances, isLoading: accountLoading } = useOrgFinanceAccountBalancesReport();

  const { data: incomeEntries } = useOrgFinanceIncomeEntries({
    dateFrom: dateRange.startDate,
    dateTo: dateRange.endDate,
  });
  const { data: expenseEntries } = useOrgFinanceExpenseEntries({
    dateFrom: dateRange.startDate,
    dateTo: dateRange.endDate,
    status: 'approved',
  });

  const DateRangePicker = () => (
    <FilterPanel title={t('events.filters')} defaultOpenDesktop={true} defaultOpenMobile={false}>
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        <div className="flex flex-col gap-2">
          <Label htmlFor="date-from">{t('events.from')}</Label>
          <CalendarDatePicker
            date={dateRange.startDate ? parseLocalDate(dateRange.startDate) : undefined}
            onDateChange={(date) =>
              setDateRange((prev) => ({ ...prev, startDate: date ? dateToLocalYYYYMMDD(date) : '' }))
            }
            placeholder={t('events.from')}
            className="max-w-[200px]"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="date-to">{t('events.to')}</Label>
          <CalendarDatePicker
            date={dateRange.endDate ? parseLocalDate(dateRange.endDate) : undefined}
            onDateChange={(date) =>
              setDateRange((prev) => ({ ...prev, endDate: date ? dateToLocalYYYYMMDD(date) : '' }))
            }
            placeholder={t('events.to')}
            className="max-w-[200px]"
          />
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
    if (!cashbook || !cashbook.cashbook?.length) {
      return (
        <div className="space-y-4">
          <DateRangePicker />
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Wallet className="h-12 w-12 mb-4" />
              <p>{t('finance.noCashbookData') ?? 'No cashbook data available for this date'}</p>
            </CardContent>
          </Card>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <DateRangePicker />
        <Tabs defaultValue={cashbook.cashbook[0]?.account?.id ?? '0'} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 h-auto">
            {cashbook.cashbook.map((cb) => (
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
                  {formatCurrency(cb.closingBalance, accountIdToCurrencyCode.get(cb.account.id) ?? currencyCode)}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
          {cashbook.cashbook.map((cb) => {
            const accountCurrencyCode = accountIdToCurrencyCode.get(cb.account.id) ?? currencyCode;
            const allEntries = [
              ...(cb.income ?? []).map((e) => ({
                ...e,
                type: 'income' as const,
                categoryName: (e as { incomeCategory?: { name?: string } }).incomeCategory?.name ?? '-',
              })),
              ...(cb.expenses ?? []).map((e) => ({
                ...e,
                type: 'expense' as const,
                categoryName: (e as { expenseCategory?: { name?: string } }).expenseCategory?.name ?? '-',
              })),
            ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            return (
              <TabsContent key={cb.account.id} value={cb.account.id} className="space-y-4 mt-4">
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
                        {(cb.account as { type?: string }).type === 'cash'
                          ? t('finance.cash')
                          : t('finance.fund')}
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card className="border-l-4 border-l-slate-500">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-muted-foreground">
                          {t('finance.openingBalance')}
                        </span>
                        <DollarSign className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                      </div>
                      <div className="text-2xl font-bold">
                        {formatCurrency(cb.openingBalance, accountCurrencyCode)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-green-500">
                    <CardContent className="pt-6">
                      <div className="text-sm font-medium text-muted-foreground">
                        {t('finance.totalIncome')}
                      </div>
                      <div className="text-2xl font-bold text-green-600">
                        +{formatCurrency(cb.totalIncome, accountCurrencyCode)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-red-500">
                    <CardContent className="pt-6">
                      <div className="text-sm font-medium text-muted-foreground">
                        {t('finance.totalExpenses')}
                      </div>
                      <div className="text-2xl font-bold text-red-600">
                        -{formatCurrency(cb.totalExpense, accountCurrencyCode)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-6">
                      <div className="text-sm font-medium text-muted-foreground">
                        {t('finance.closingBalance')}
                      </div>
                      <div
                        className={`text-2xl font-bold ${cb.closingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {formatCurrency(cb.closingBalance, accountCurrencyCode)}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        {t('finance.transactions')}
                      </CardTitle>
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
                        title={`${t('finance.dailyCashbook')} - ${cb.account.name}`}
                        transformData={(data) =>
                          data.map((entry: { date: string; type: string; categoryName: string; description?: string; amount: number }) => ({
                            date: formatDate(entry.date),
                            type: entry.type === 'income' ? t('finance.income') : t('finance.expense'),
                            category: entry.categoryName,
                            description: entry.description ?? '-',
                            amount:
                              entry.type === 'income'
                                ? `+${formatCurrency(entry.amount, accountCurrencyCode)}`
                                : `-${formatCurrency(entry.amount, accountCurrencyCode)}`,
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
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('events.date')}</TableHead>
                            <TableHead>{t('events.type')}</TableHead>
                            <TableHead>{t('assets.category')}</TableHead>
                            <TableHead>{t('events.description')}</TableHead>
                            <TableHead className="text-right">{t('finance.amount')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {allEntries.map((entry) => (
                            <TableRow key={entry.id} className="hover:bg-muted/50">
                              <TableCell className="font-medium">{formatDate(entry.date)}</TableCell>
                              <TableCell>
                                {entry.type === 'income' ? (
                                  <Badge variant="outline" className="bg-green-50 dark:bg-green-950/30 border-green-200 text-green-700">
                                    <TrendingUp className="h-3 w-3 mr-1" />
                                    {t('finance.income')}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-red-50 dark:bg-red-950/30 border-red-200 text-red-700">
                                    <TrendingDown className="h-3 w-3 mr-1" />
                                    {t('finance.expense')}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 text-blue-700">
                                  {(entry as { categoryName?: string }).categoryName}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-[300px] truncate">
                                {entry.description ?? <span className="text-muted-foreground italic">-</span>}
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge
                                  variant="outline"
                                  className={`font-semibold ${
                                    entry.type === 'income'
                                      ? 'bg-green-50 dark:bg-green-950/30 border-green-200 text-green-700'
                                      : 'bg-red-50 dark:bg-red-950/30 border-red-200 text-red-700'
                                  }`}
                                >
                                  {entry.type === 'income' ? '+' : '-'}
                                  {formatCurrency(entry.amount, accountCurrencyCode)}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                          {allEntries.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                {t('finance.noTransactions')}
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
    const timeSeriesData = useMemo(() => {
      if (!incomeEntries || !expenseEntries) return [];
      const dateMap = new Map<string, { date: string; income: number; expense: number }>();
      incomeEntries.forEach((entry) => {
        const dateKey =
          entry.date instanceof Date
            ? entry.date.toISOString().split('T')[0]
            : String(entry.date).split('T')[0];
        const existing = dateMap.get(dateKey) || { date: dateKey, income: 0, expense: 0 };
        existing.income += entry.amount;
        dateMap.set(dateKey, existing);
      });
      expenseEntries.forEach((entry) => {
        const dateKey =
          entry.date instanceof Date
            ? entry.date.toISOString().split('T')[0]
            : String(entry.date).split('T')[0];
        const existing = dateMap.get(dateKey) || { date: dateKey, income: 0, expense: 0 };
        existing.expense += entry.amount;
        dateMap.set(dateKey, existing);
      });
      const data = Array.from(dateMap.values()).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      if (data.length === 0) return [];
      const referenceDate = new Date(data[data.length - 1].date);
      const daysToSubtract = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date(referenceDate);
      startDate.setDate(startDate.getDate() - daysToSubtract);
      return data.filter((item) => new Date(item.date) >= startDate);
    }, [incomeEntries, expenseEntries, timeRange]);

    const chartConfig = {
      income: { label: t('finance.income'), color: 'hsl(142, 76%, 36%)' },
      expense: { label: t('finance.expense'), color: 'hsl(0, 84%, 60%)' },
    } satisfies ChartConfig;

    const incomeExportData = useMemo(
      () =>
        incomeVsExpense?.incomeByCategory?.map((item) => ({
          category: item.name,
          type: t('finance.income'),
          amount: item.total,
        })) ?? [],
      [incomeVsExpense, t]
    );
    const expenseExportData = useMemo(
      () =>
        incomeVsExpense?.expenseByCategory?.map((item) => ({
          category: item.name,
          type: t('finance.expense'),
          amount: item.total,
        })) ?? [],
      [incomeVsExpense, t]
    );
    const combinedExportData = useMemo(
      () => [...incomeExportData, ...expenseExportData],
      [incomeExportData, expenseExportData]
    );

    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <DateRangePicker />
          <ReportExportButtons
            data={combinedExportData}
            columns={[
              { key: 'type', label: t('events.type'), align: 'left' },
              { key: 'category', label: t('assets.category'), align: 'left' },
              { key: 'amount', label: t('finance.amount'), align: 'right' },
            ]}
            reportKey="finance_income_expense_summary"
            title={t('finance.incomeVsExpense')}
            transformData={(data) =>
              data.map((item: { type: string; category: string; amount: number }) => ({
                type: item.type,
                category: item.category,
                amount: formatCurrency(item.amount, currencyCode),
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
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">{t('finance.totalIncome')}</div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(incomeVsExpense.summary.totalIncome, currencyCode)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">{t('finance.totalExpenses')}</div>
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(incomeVsExpense.summary.totalExpense, currencyCode)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">{t('finance.netBalance')}</div>
                  <div
                    className={`text-2xl font-bold ${incomeVsExpense.summary.net >= 0 ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {formatCurrency(incomeVsExpense.summary.net, currencyCode)}
                  </div>
                </CardContent>
              </Card>
            </div>
            <Card className="pt-0">
              <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
                <div className="grid flex-1 gap-1">
                  <CardTitle>{t('finance.incomeVsExpenseTrend')}</CardTitle>
                  <CardDescription>{t('finance.showingTrendsForPeriod')}</CardDescription>
                </div>
                <Select value={timeRange} onValueChange={(v: '7d' | '30d' | '90d') => setTimeRange(v)}>
                  <SelectTrigger className="w-[160px] rounded-lg" aria-label="Select time range">
                    <SelectValue placeholder={t('finance.selectTimeRange')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">{t('finance.last7Days')}</SelectItem>
                    <SelectItem value="30d">{t('finance.last30Days')}</SelectItem>
                    <SelectItem value="90d">{t('finance.last90Days')}</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                {timeSeriesData.length > 0 ? (
                  <ChartContainer config={chartConfig} className="aspect-auto h-[200px] sm:h-[250px] md:h-[300px] w-full">
                    <AreaChart data={timeSeriesData}>
                      <defs>
                        <linearGradient id="fillIncomeOrg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-income)" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="var(--color-income)" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="fillExpenseOrg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-expense)" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="var(--color-expense)" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        minTickGap={32}
                        tickFormatter={(value) =>
                          new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        }
                      />
                      <ChartTooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            labelFormatter={(value) =>
                              new Date(value).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            }
                            indicator="dot"
                            formatter={(value: number) => formatCurrency(value, currencyCode)}
                          />
                        }
                      />
                      <Area dataKey="income" type="natural" fill="url(#fillIncomeOrg)" stroke="var(--color-income)" stackId="a" />
                      <Area dataKey="expense" type="natural" fill="url(#fillExpenseOrg)" stroke="var(--color-expense)" stackId="a" />
                      <ChartLegend content={<ChartLegendContent />} />
                    </AreaChart>
                  </ChartContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    {t('events.noData')}
                  </div>
                )}
              </CardContent>
            </Card>
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="flex flex-col">
                <CardHeader className="items-center pb-0">
                  <CardTitle>{t('finance.incomeByCategory')}</CardTitle>
                  <CardDescription>
                    {formatDate(new Date(dateRange.startDate))} - {formatDate(new Date(dateRange.endDate))}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 pb-0">
                  {incomeVsExpense.incomeByCategory?.length > 0 ? (
                    <ChartContainer
                      config={
                        incomeVsExpense.incomeByCategory.reduce(
                          (acc, item, index) => {
                            acc[`income_${index}`] = {
                              label: item.name,
                              color: COLORS[index % COLORS.length],
                            };
                            return acc;
                          },
                          {} as ChartConfig
                        )
                      }
                      className="mx-auto aspect-square max-h-[200px] sm:max-h-[250px] md:max-h-[300px] w-full"
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
                        <ChartTooltip content={<ChartTooltipContent formatter={(v: number) => formatCurrency(v, currencyCode)} />} />
                        <ChartLegend content={<ChartLegendContent nameKey="category" />} className="-translate-y-2 flex-wrap gap-2" />
                      </PieChart>
                    </ChartContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                      {t('events.noData')}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card className="flex flex-col">
                <CardHeader className="items-center pb-0">
                  <CardTitle>{t('finance.expenseByCategory')}</CardTitle>
                  <CardDescription>
                    {formatDate(new Date(dateRange.startDate))} - {formatDate(new Date(dateRange.endDate))}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 pb-0">
                  {incomeVsExpense.expenseByCategory?.length > 0 ? (
                    <ChartContainer
                      config={
                        incomeVsExpense.expenseByCategory.reduce(
                          (acc, item, index) => {
                            acc[`expense_${index}`] = {
                              label: item.name,
                              color: COLORS[index % COLORS.length],
                            };
                            return acc;
                          },
                          {} as ChartConfig
                        )
                      }
                      className="mx-auto aspect-square max-h-[200px] sm:max-h-[250px] md:max-h-[300px] w-full"
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
                        <ChartTooltip content={<ChartTooltipContent formatter={(v: number) => formatCurrency(v, currencyCode)} />} />
                        <ChartLegend content={<ChartLegendContent nameKey="category" />} className="-translate-y-2 flex-wrap gap-2" />
                      </PieChart>
                    </ChartContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                      {t('events.noData')}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
              {t('events.noData')}
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // Project Summary Tab
  const ProjectSummaryTab = () => (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <DateRangePicker />
        <ReportExportButtons
          data={projectSummary?.projects ?? []}
          columns={[
            { key: 'name', label: t('events.name'), align: 'left' },
            { key: 'income', label: t('finance.income'), align: 'right' },
            { key: 'expense', label: t('finance.expense'), align: 'right' },
            { key: 'balance', label: t('finance.balance'), align: 'right' },
          ]}
          reportKey="finance_project_summary"
          title={t('finance.projectSummary')}
          transformData={(data) =>
            data.map((item: { project: { name: string }; totalIncome: number; totalExpense: number; balance: number }) => ({
              name: item.project.name,
              income: formatCurrency(item.totalIncome, currencyCode),
              expense: formatCurrency(item.totalExpense, currencyCode),
              balance: formatCurrency(item.balance, currencyCode),
            }))
          }
          buildFiltersSummary={() => `${dateRange.startDate} - ${dateRange.endDate}`}
          templateType="finance_project_summary"
          disabled={projectLoading || !projectSummary || (projectSummary.projects?.length ?? 0) === 0}
        />
      </div>
      {projectLoading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      ) : projectSummary && (projectSummary.projects?.length ?? 0) > 0 ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">{t('finance.totalProjects')}</div>
                <div className="text-2xl font-bold">{projectSummary.projects.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">{t('finance.totalProjectIncome')}</div>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(
                    projectSummary.projects.reduce((sum, p) => sum + p.totalIncome, 0),
                    currencyCode
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">{t('finance.totalProjectExpense')}</div>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(
                    projectSummary.projects.reduce((sum, p) => sum + p.totalExpense, 0),
                    currencyCode
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>{t('finance.projectDetails')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('events.name')}</TableHead>
                      <TableHead className="text-right">{t('finance.income')}</TableHead>
                      <TableHead className="text-right">{t('finance.expense')}</TableHead>
                      <TableHead className="text-right">{t('finance.balance')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectSummary.projects.map((item) => (
                      <TableRow key={item.project.id}>
                        <TableCell className="font-medium">{item.project.name}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="bg-green-50 dark:bg-green-950/30 border-green-200 text-green-700 font-semibold">
                            {formatCurrency(item.totalIncome, currencyCode)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="bg-red-50 dark:bg-red-950/30 border-red-200 text-red-700 font-semibold">
                            {formatCurrency(item.totalExpense, currencyCode)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="outline"
                            className={`font-semibold ${
                              item.balance >= 0
                                ? 'bg-green-50 dark:bg-green-950/30 border-green-200 text-green-700'
                                : 'bg-red-50 dark:bg-red-950/30 border-red-200 text-red-700'
                            }`}
                          >
                            {formatCurrency(item.balance, currencyCode)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t('finance.projectComparison')}</CardTitle>
              <CardDescription>{t('finance.showingProjectIncomeExpense')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  income: { label: t('finance.income'), color: 'hsl(142, 76%, 36%)' },
                  expense: { label: t('finance.expense'), color: 'hsl(0, 84%, 60%)' },
                } satisfies ChartConfig}
                className="h-[200px] sm:h-[250px] md:h-[300px] w-full"
              >
                <BarChart
                  accessibilityLayer
                  data={projectSummary.projects.map((item) => ({
                    project: item.project.name,
                    income: item.totalIncome,
                    expense: item.totalExpense,
                  }))}
                  margin={{ left: -20, right: 12, top: 12, bottom: 12 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="project"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => (value.length > 10 ? value.slice(0, 10) + '...' : value)}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickCount={5}
                    tickFormatter={(value) => {
                      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                      if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                      return String(value);
                    }}
                  />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={(v: number) => formatCurrency(v, currencyCode)} />} />
                  <Bar dataKey="expense" fill="var(--color-expense)" radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} stackId="a" />
                </BarChart>
              </ChartContainer>
            </CardContent>
            <CardFooter>
              <div className="flex w-full items-start gap-2 text-sm">
                <div className="flex items-center gap-2 font-medium">
                  {t('finance.totalProjects')}: {projectSummary.projects.length}
                  <FolderKanban className="h-4 w-4" />
                </div>
              </div>
            </CardFooter>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
            <FolderKanban className="h-8 w-8 mr-2" />
            {t('finance.noProjectData')}
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Donor Summary Tab
  const DonorSummaryTab = () => (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <DateRangePicker />
        <ReportExportButtons
          data={donorSummary?.donors ?? []}
          columns={[
            { key: 'name', label: t('events.name'), align: 'left' },
            { key: 'type', label: t('events.type'), align: 'left' },
            { key: 'donationCount', label: t('finance.donationCount'), align: 'right' },
            { key: 'totalDonated', label: t('finance.totalDonated'), align: 'right' },
          ]}
          reportKey="finance_donor_summary"
          title={t('finance.donorSummary')}
          transformData={(data) =>
            data.map((item: { donor: { name: string; type: string }; donationCount: number; totalDonated: number }) => ({
              name: item.donor.name,
              type:
                item.donor.type === 'individual' ? t('finance.individual') : t('students.organization'),
              donationCount: String(item.donationCount),
              totalDonated: formatCurrency(item.totalDonated, currencyCode),
            }))
          }
          buildFiltersSummary={() => `${dateRange.startDate} - ${dateRange.endDate}`}
          templateType="finance_donor_summary"
          disabled={donorLoading || !donorSummary || (donorSummary.donors?.length ?? 0) === 0}
        />
      </div>
      {donorLoading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      ) : donorSummary && (donorSummary.donors?.length ?? 0) > 0 ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">{t('finance.totalDonors')}</div>
                <div className="text-2xl font-bold">{donorSummary.donors.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">{t('finance.totalDonations')}</div>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(
                    donorSummary.donors.reduce((sum, d) => sum + d.totalDonated, 0),
                    currencyCode
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>{t('finance.donorContributions')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('events.name')}</TableHead>
                      <TableHead>{t('events.type')}</TableHead>
                      <TableHead className="text-right">{t('finance.donationCount')}</TableHead>
                      <TableHead className="text-right">{t('finance.totalAmount')}</TableHead>
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
                                ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 text-purple-700'
                                : 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 text-indigo-700'
                            }
                          >
                            {item.donor.type === 'individual'
                              ? t('finance.individual')
                              : t('students.organization')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 text-blue-700">
                            {item.donationCount}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="bg-green-50 dark:bg-green-950/30 border-green-200 text-green-700 font-semibold">
                            {formatCurrency(item.totalDonated, currencyCode)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t('finance.topDonors')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={donorSummary.donors.slice(0, 10).map((item) => ({
                    name: item.donor.name,
                    totalDonated: item.totalDonated,
                  }))}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} />
                  <Tooltip formatter={(value: number) => formatCurrency(value, currencyCode)} />
                  <Bar dataKey="totalDonated" name={t('finance.donated')} fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
            <Users className="h-8 w-8 mr-2" />
            {t('finance.noDonorData')}
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
          data={accountBalances?.accounts ?? []}
          columns={[
            { key: 'name', label: t('events.name'), align: 'left' },
            { key: 'type', label: t('events.type'), align: 'left' },
            { key: 'openingBalance', label: t('finance.openingBalance'), align: 'right' },
            { key: 'currentBalance', label: t('finance.currentBalance'), align: 'right' },
          ]}
          reportKey="finance_account_balances"
          title={t('finance.accountBalances')}
          transformData={(data) =>
            data.map((item: { account: { name: string; type: string }; openingBalance: number; currentBalance: number }) => ({
              name: item.account.name,
              type: (item.account as { type?: string }).type === 'cash' ? t('finance.cash') : t('finance.fund'),
              openingBalance: formatCurrency(
                item.openingBalance,
                getAccountCurrencyCode(item.account, currencyCode)
              ),
              currentBalance: formatCurrency(
                item.currentBalance,
                getAccountCurrencyCode(item.account, currencyCode)
              ),
            }))
          }
          templateType="finance_account_balances"
          disabled={accountLoading || !accountBalances || (accountBalances.accounts?.length ?? 0) === 0}
        />
      </div>
      {accountLoading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      ) : accountBalances && (accountBalances.accounts?.length ?? 0) > 0 ? (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t('finance.totalBalance')}</CardTitle>
                <span className="text-2xl sm:text-3xl font-bold">
                  {formatCurrency(accountBalances.totalBalance, currencyCode)}
                </span>
              </div>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t('finance.accountDetails')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('events.name')}</TableHead>
                      <TableHead>{t('events.type')}</TableHead>
                      <TableHead className="text-right">{t('finance.openingBalance')}</TableHead>
                      <TableHead className="text-right">{t('finance.currentBalance')}</TableHead>
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
                              (item.account as { type?: string }).type === 'cash'
                                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 text-emerald-700'
                                : 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 text-purple-700'
                            }
                          >
                            {(item.account as { type?: string }).type === 'cash'
                              ? t('finance.cash')
                              : t('finance.fund')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="bg-slate-50 dark:bg-slate-950/30 border-slate-200 text-slate-700 font-medium">
                            {formatCurrency(item.openingBalance, getAccountCurrencyCode(item.account, currencyCode))}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="outline"
                            className={`font-semibold ${
                              item.currentBalance >= 0
                                ? 'bg-green-50 dark:bg-green-950/30 border-green-200 text-green-700'
                                : 'bg-red-50 dark:bg-red-950/30 border-red-200 text-red-700'
                            }`}
                          >
                            {formatCurrency(item.currentBalance, getAccountCurrencyCode(item.account, currencyCode))}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          <Card className="flex flex-col">
            <CardHeader className="items-center pb-0">
              <CardTitle>{t('finance.balanceDistribution')}</CardTitle>
              <CardDescription>{t('finance.accountBalances')}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
              <ChartContainer
                config={
                  accountBalances.accounts.reduce(
                    (acc, item, index) => {
                      acc[`account_${index}`] = {
                        label: item.account.name,
                        color: COLORS[index % COLORS.length],
                      };
                      return acc;
                    },
                    {} as ChartConfig
                  )
                }
                className="mx-auto aspect-square max-h-[200px] sm:max-h-[250px] md:max-h-[300px] w-full"
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
                    content={<ChartTooltipContent formatter={(v: number) => formatCurrency(v, currencyCode)} />}
                  />
                  <ChartLegend content={<ChartLegendContent nameKey="account" />} className="-translate-y-2 flex-wrap gap-2" />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
            <Wallet className="h-8 w-8 mr-2" />
            {t('finance.noAccountData')}
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="container mx-auto max-w-7xl space-y-6 overflow-x-hidden p-4 md:p-6">
      <PageHeader
        title={tUnsafe('organizationAdmin.financeReports') ?? t('finance.reports')}
        description={tUnsafe('organizationAdmin.financeReportsDesc') ?? t('finance.reportsDescription')}
        icon={<FileText className="h-5 w-5" />}
      />

      <Tabs defaultValue="cashbook" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 h-auto">
          <TabsTrigger value="cashbook" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">{t('finance.dailyCashbook')}</span>
          </TabsTrigger>
          <TabsTrigger value="income-expense" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">{t('finance.incomeVsExpense')}</span>
          </TabsTrigger>
          <TabsTrigger value="projects" className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4" />
            <span className="hidden sm:inline">{t('finance.projectSummary')}</span>
          </TabsTrigger>
          <TabsTrigger value="donors" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">{t('finance.donorSummary')}</span>
          </TabsTrigger>
          <TabsTrigger value="accounts" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">{t('finance.accountBalances')}</span>
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
