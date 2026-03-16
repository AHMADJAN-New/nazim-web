/**
 * Org Admin Finance Dashboard – same layout and design as school FinanceDashboard, org-scoped.
 */

import {
  Wallet,
  TrendingUp,
  TrendingDown,
  FolderKanban,
  Users,
  DollarSign,
  Calendar,
  ChevronRight,
  CreditCard,
  Building2,
  FileText,
} from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';
import {
  useOrgFinanceDashboard,
  useOrgFinanceAccounts,
  useOrgFinanceCurrencies,
} from '@/hooks/useOrgFinance';
import { formatCurrency, formatDate } from '@/lib/utils';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function OrgAdminFinancePage() {
  const { t, tUnsafe } = useLanguage();
  const navigate = useNavigate();
  const { data: dashboard, isLoading: dashboardLoading } = useOrgFinanceDashboard();
  const { data: accounts = [] } = useOrgFinanceAccounts({ isActive: true });
  const { data: currencies = [] } = useOrgFinanceCurrencies({ isActive: true, isBase: true });
  const baseCurrency = currencies[0];
  const currencyCode = baseCurrency?.code ?? 'AFN';

  const incomeTotal = useMemo(
    () => dashboard?.incomeByCategory.reduce((sum, item) => sum + item.total, 0) ?? 0,
    [dashboard]
  );
  const expenseTotal = useMemo(
    () => dashboard?.expenseByCategory.reduce((sum, item) => sum + item.total, 0) ?? 0,
    [dashboard]
  );
  const incomeData = useMemo(() => {
    if (!dashboard) return [];
    return dashboard.incomeByCategory.map((item) => ({
      ...item,
      percentage: incomeTotal > 0 ? (item.total / incomeTotal) * 100 : 0,
    }));
  }, [dashboard, incomeTotal]);

  const recentTransactions = useMemo(() => {
    if (!dashboard) return [];
    const income = (dashboard.recentIncome ?? []).map((e) => ({
      id: e.id,
      type: 'income' as const,
      amount: e.amount,
      date: e.date,
      category: e.incomeCategory?.name ?? '—',
      donor: e.donor?.name,
      paidTo: null as string | null,
    }));
    const expense = (dashboard.recentExpenses ?? []).map((e) => ({
      id: e.id,
      type: 'expense' as const,
      amount: e.amount,
      date: e.date,
      category: e.expenseCategory?.name ?? '—',
      donor: null,
      paidTo: e.paidTo ?? null,
    }));
    const merged = [...income, ...expense].sort((a, b) => {
      const ta = a.date instanceof Date ? a.date.getTime() : 0;
      const tb = b.date instanceof Date ? b.date.getTime() : 0;
      return tb - ta;
    });
    return merged.slice(0, 7);
  }, [dashboard]);

  const currentDate = new Date();
  const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

  if (dashboardLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="container mx-auto max-w-7xl space-y-6 overflow-x-hidden p-4 md:p-6">
        <PageHeader
          title={tUnsafe('organizationAdmin.finance') ?? 'Finance'}
          description={tUnsafe('organizationAdmin.financeDesc') ?? 'Organization-level accounts, income and expenses'}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <div className="text-center py-12 text-muted-foreground">
          {tUnsafe('organizationAdmin.noFinanceData') ?? 'No finance data available.'}
        </div>
      </div>
    );
  }

  const netThisMonth = dashboard.summary.netThisMonth;
  const isPositive = netThisMonth >= 0;

  return (
    <div className="container mx-auto max-w-7xl space-y-6 overflow-x-hidden p-4 md:p-6">
      <PageHeader
        title={tUnsafe('organizationAdmin.finance') ?? 'Finance'}
        description={tUnsafe('organizationAdmin.financeDesc') ?? 'Organization-level accounts, income and expenses'}
        icon={<Wallet className="h-5 w-5" />}
        rightSlot={
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-background">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {formatDate(startDate)} – {formatDate(endDate)}
            </span>
          </div>
        }
      />

      {/* Summary Cards – same layout as school FinanceDashboard */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="relative overflow-hidden col-span-1 sm:col-span-2 lg:col-span-2">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-8 -mt-8 pointer-events-none opacity-50" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex-1 min-w-0">
              {t('finance.totalBalance') ?? 'Total Balance'}
            </CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/10 flex-shrink-0">
              <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-3xl sm:text-4xl font-bold break-words">
              {formatCurrency(dashboard.summary.totalBalance, currencyCode)}
            </div>
            <div className="text-xs text-muted-foreground pt-2">
              {t('finance.cashBalance') ?? 'Cash balance'}:{' '}
              {formatCurrency(dashboard.summary.totalCashBalance ?? dashboard.summary.totalBalance, currencyCode)}
            </div>
          </CardContent>
          <CardFooter className="pt-3 pb-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => navigate('/org-admin/finance/accounts')}
            >
              <ChevronRight className="h-4 w-4 mr-1.5 flex-shrink-0" />
              {t('finance.viewAccounts') ?? 'View Accounts'}
            </Button>
          </CardFooter>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full -mr-8 -mt-8 pointer-events-none opacity-50" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex-1 min-w-0">
              {t('finance.netThisMonth') ?? 'Net This Month'}
            </CardTitle>
            <div className="p-2 rounded-lg bg-green-500/10 flex-shrink-0">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent className="pb-3">
            <div
              className={`text-2xl sm:text-3xl font-bold break-words ${isPositive ? 'text-green-600' : 'text-red-600'}`}
            >
              {isPositive ? '+' : ''}
              {formatCurrency(netThisMonth, currencyCode)}
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-8 -mt-8 pointer-events-none opacity-50" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex-1 min-w-0">
              {tUnsafe('organizationAdmin.financeMonthIncome') ?? 'This Month Income'}
            </CardTitle>
            <div className="p-2 rounded-lg bg-emerald-500/10 flex-shrink-0">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl sm:text-3xl font-bold text-emerald-600 break-words">
              {formatCurrency(dashboard.summary.currentMonthIncome, currencyCode)}
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full -mr-8 -mt-8 pointer-events-none opacity-50" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex-1 min-w-0">
              {t('finance.monthlyExpenses') ?? 'Expenses'}
            </CardTitle>
            <div className="p-2 rounded-lg bg-red-500/10 flex-shrink-0">
              <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-red-400" />
            </div>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl sm:text-3xl font-bold text-red-600 break-words">
              {formatCurrency(dashboard.summary.currentMonthExpense, currencyCode)}
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full -mr-8 -mt-8 pointer-events-none opacity-50" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex-1 min-w-0">
              {t('finance.activeProjects') ?? 'Active Projects'}
            </CardTitle>
            <div className="p-2 rounded-lg bg-purple-500/10 flex-shrink-0">
              <FolderKanban className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl sm:text-3xl font-bold break-words">{dashboard.summary.activeProjects}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              {dashboard.summary.activeDonors} {t('finance.activeDonorsText') ?? 'active donors'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Row: Income by category, Expense by category, Summary */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">{t('finance.incomeByCategory') ?? 'Income by Category'}</CardTitle>
              <CardDescription className="mt-1 hidden sm:block">
                Total: <span className="font-semibold text-foreground">{formatCurrency(incomeTotal, currencyCode)}</span>
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {incomeData.length === 0 ? (
              <p className="text-sm text-muted-foreground">{tUnsafe('finance.noIncomeData') ?? 'No income this month'}</p>
            ) : (
              incomeData.slice(0, 4).map((item, index) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm font-medium truncate">{item.name}</span>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <div className="text-sm font-semibold">{formatCurrency(item.total, currencyCode)}</div>
                    <div className="text-xs text-muted-foreground">{item.percentage.toFixed(1)}%</div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
          <CardFooter className="pt-3 pb-3">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => navigate('/org-admin/finance/income')}
            >
              <span className="text-left">{t('finance.viewAllIncome') ?? 'View All Income'}</span>
              <ChevronRight className="h-4 w-4 ml-1.5 flex-shrink-0" />
            </Button>
          </CardFooter>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">{t('finance.expenses') ?? 'Expenses by Category'}</CardTitle>
            <CardDescription className="hidden sm:block">
              Total: <span className="font-semibold text-foreground">{formatCurrency(expenseTotal, currencyCode)}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.expenseByCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('finance.noExpensesData') ?? 'No expenses this month'}</p>
            ) : (
              dashboard.expenseByCategory.slice(0, 4).map((item, index) => {
                const pct = expenseTotal > 0 ? (item.total / expenseTotal) * 100 : 0;
                return (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm font-medium truncate">{item.name}</span>
                    </div>
                    <span className="text-sm font-medium flex-shrink-0 ml-2">{pct.toFixed(0)}%</span>
                  </div>
                );
              })
            )}
          </CardContent>
          <CardFooter className="pt-3 pb-3">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => navigate('/org-admin/finance/expenses')}
            >
              <span className="text-left">{tUnsafe('finance.viewAllExpenses') ?? 'View All Expenses'}</span>
              <ChevronRight className="h-4 w-4 ml-1.5 flex-shrink-0" />
            </Button>
          </CardFooter>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">{t('finance.summary') ?? 'Summary'}</CardTitle>
            <CardDescription className="hidden sm:block">
              {formatDate(startDate)} – {formatDate(endDate)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('finance.income') ?? 'Income'}</span>
                <span className="font-semibold text-green-600">
                  {formatCurrency(dashboard.summary.currentMonthIncome, currencyCode)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('finance.expenses') ?? 'Expenses'}</span>
                <span className="font-semibold text-red-600">
                  {formatCurrency(dashboard.summary.currentMonthExpense, currencyCode)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="font-medium">{t('finance.netThisMonth') ?? 'Net'}</span>
                <span className={`font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {isPositive ? '+' : ''}
                  {formatCurrency(netThisMonth, currencyCode)}
                </span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-3 pb-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => navigate('/org-admin/finance/reports')}
            >
              <FileText className="h-4 w-4 mr-1.5 flex-shrink-0" />
              {tUnsafe('finance.viewReports') ?? 'View Reports'}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Bottom Row: Recent transactions + Account balances */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">{t('finance.transactions') ?? 'Recent Transactions'}</CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigate('/org-admin/finance/income')}>
              {t('events.viewAll') ?? 'View All'}
            </Button>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {tUnsafe('organizationAdmin.noExpenses') ?? 'No transactions yet'}
              </p>
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((entry) => {
                  const isIncome = entry.type === 'income';
                  return (
                    <div
                      key={`${entry.type}-${entry.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div
                          className={`p-2 rounded-lg ${
                            isIncome ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                          }`}
                        >
                          {isIncome ? (
                            <Building2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <DollarSign className="h-4 w-4 text-red-600 dark:text-red-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{entry.category}</div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {entry.date instanceof Date ? formatDate(entry.date) : '—'}
                            {entry.donor && <> • {entry.donor}</>}
                            {entry.paidTo && <> • {entry.paidTo}</>}
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`font-semibold ${
                          isIncome
                            ? 'bg-green-50 dark:bg-green-950/30 border-green-200 text-green-700 dark:text-green-400'
                            : 'bg-red-50 dark:bg-red-950/30 border-red-200 text-red-700 dark:text-red-400'
                        }`}
                      >
                        {isIncome ? '+' : '-'}
                        {formatCurrency(entry.amount, currencyCode)}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">{t('finance.accountBalances') ?? 'Account Balances'}</CardTitle>
              <CardDescription>
                {dashboard.accountBalances.length === 1
                  ? '1 account'
                  : `${dashboard.accountBalances.length} accounts`}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/org-admin/finance/accounts')}>
              {t('finance.addNew') ?? '+ Add'}
            </Button>
          </CardHeader>
          <CardContent>
            {dashboard.accountBalances.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {tUnsafe('organizationAdmin.noAccounts') ?? 'No accounts yet'}
              </p>
            ) : (
              <div className="space-y-3">
                {dashboard.accountBalances.slice(0, 4).map((account, index) => (
                  <div
                    key={account.id}
                    className={`p-4 rounded-lg text-white ${
                      index === 0
                        ? 'bg-gradient-to-br from-green-500 to-green-600'
                        : index === 1
                          ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                          : 'bg-gradient-to-br from-slate-600 to-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <CreditCard className="h-4 w-4 opacity-90" />
                      <span className="text-xs font-medium opacity-90 capitalize">{account.type}</span>
                    </div>
                    <div className="text-xs opacity-75 mb-1 truncate">{account.name}</div>
                    <div className="text-xl font-bold">
                      {formatCurrency(account.currentBalance, currencyCode)}
                    </div>
                  </div>
                ))}
                {dashboard.accountBalances.length > 4 && (
                  <Button
                    variant="outline"
                    className="w-full"
                    size="sm"
                    onClick={() => navigate('/org-admin/finance/accounts')}
                  >
                    {t('finance.viewAllAccounts') ?? 'View All Accounts'}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
