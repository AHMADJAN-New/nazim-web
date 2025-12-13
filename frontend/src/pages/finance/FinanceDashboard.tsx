/**
 * Finance Dashboard - Overview of finance data
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

export default function FinanceDashboard() {
    const { t } = useLanguage();
    const { data: dashboard, isLoading, error } = useFinanceDashboard();

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

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold">
                        {t('finance.dashboard') || 'Finance Dashboard'}
                    </h1>
                    <p className="text-muted-foreground">
                        {t('finance.dashboardDescription') || 'Overview of your organization\'s finances'}
                    </p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Total Balance */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {t('finance.totalBalance') || 'Total Balance'}
                        </CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(dashboard.summary.totalBalance)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {t('finance.acrossAllAccounts') || 'Across all accounts'}
                        </p>
                    </CardContent>
                </Card>

                {/* Monthly Income */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {t('finance.monthlyIncome') || 'Monthly Income'}
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            +{formatCurrency(dashboard.summary.currentMonthIncome)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {t('finance.thisMonth') || 'This month'}
                        </p>
                    </CardContent>
                </Card>

                {/* Monthly Expenses */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {t('finance.monthlyExpenses') || 'Monthly Expenses'}
                        </CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            -{formatCurrency(dashboard.summary.currentMonthExpense)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {t('finance.thisMonth') || 'This month'}
                        </p>
                    </CardContent>
                </Card>

                {/* Net This Month */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {t('finance.netThisMonth') || 'Net This Month'}
                        </CardTitle>
                        {isPositive ? (
                            <ArrowUpRight className="h-4 w-4 text-green-500" />
                        ) : (
                            <ArrowDownRight className="h-4 w-4 text-red-500" />
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {isPositive ? '+' : ''}{formatCurrency(netThisMonth)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {isPositive
                                ? t('finance.surplus') || 'Surplus'
                                : t('finance.deficit') || 'Deficit'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {t('finance.activeProjects') || 'Active Projects'}
                        </CardTitle>
                        <FolderKanban className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{dashboard.summary.activeProjects}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {t('finance.activeDonors') || 'Active Donors'}
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{dashboard.summary.activeDonors}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Income by Category */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t('finance.incomeByCategory') || 'Income by Category'}</CardTitle>
                        <CardDescription>{t('finance.thisMonth') || 'This month'}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {dashboard.incomeByCategory.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={dashboard.incomeByCategory}
                                        dataKey="total"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                    >
                                        {dashboard.incomeByCategory.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                                {t('finance.noIncomeThisMonth') || 'No income this month'}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Expense by Category */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t('finance.expenseByCategory') || 'Expenses by Category'}</CardTitle>
                        <CardDescription>{t('finance.thisMonth') || 'This month'}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {dashboard.expenseByCategory.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={dashboard.expenseByCategory}
                                        dataKey="total"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                    >
                                        {dashboard.expenseByCategory.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                                {t('finance.noExpensesThisMonth') || 'No expenses this month'}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Account Balances */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('finance.accountBalances') || 'Account Balances'}</CardTitle>
                    <CardDescription>{t('finance.currentBalancesByAccount') || 'Current balances by account'}</CardDescription>
                </CardHeader>
                <CardContent>
                    {dashboard.accountBalances.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={dashboard.accountBalances}>
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                <Legend />
                                <Bar dataKey="currentBalance" name={t('finance.balance') || 'Balance'} fill="#0088FE" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                            {t('finance.noAccounts') || 'No accounts found'}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Recent Transactions */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Recent Income */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t('finance.recentIncome') || 'Recent Income'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {dashboard.recentIncome.length > 0 ? (
                            <div className="space-y-4">
                                {dashboard.recentIncome.map((entry) => (
                                    <div key={entry.id} className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium">
                                                {entry.incomeCategory?.name || 'Unknown'}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {entry.date.toLocaleDateString()}
                                                {entry.donor && ` • ${entry.donor.name}`}
                                            </p>
                                        </div>
                                        <div className="text-sm font-medium text-green-600">
                                            +{formatCurrency(entry.amount)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-4 text-muted-foreground">
                                {t('finance.noRecentIncome') || 'No recent income'}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Expenses */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t('finance.recentExpenses') || 'Recent Expenses'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {dashboard.recentExpenses.length > 0 ? (
                            <div className="space-y-4">
                                {dashboard.recentExpenses.map((entry) => (
                                    <div key={entry.id} className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium">
                                                {entry.expenseCategory?.name || 'Unknown'}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {entry.date.toLocaleDateString()}
                                                {entry.paidTo && ` • ${entry.paidTo}`}
                                            </p>
                                        </div>
                                        <div className="text-sm font-medium text-red-600">
                                            -{formatCurrency(entry.amount)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-4 text-muted-foreground">
                                {t('finance.noRecentExpenses') || 'No recent expenses'}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
