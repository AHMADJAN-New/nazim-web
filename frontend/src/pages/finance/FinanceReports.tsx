/**
 * Finance Reports Page - Various financial reports
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
} from '@/hooks/useFinance';
import { useLanguage } from '@/hooks/useLanguage';
import { LoadingSpinner } from '@/components/ui/loading';
import {
    FileText,
    TrendingUp,
    TrendingDown,
    FolderKanban,
    Users,
    Wallet,
    Download,
    Calendar,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
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
} from 'recharts';

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
        <div className="flex items-center gap-4 mb-6 p-4 bg-muted rounded-lg">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div className="flex items-center gap-2">
                <Label htmlFor="startDate">{t('common.from') || 'From'}</Label>
                <Input
                    id="startDate"
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                    className="w-auto"
                />
            </div>
            <div className="flex items-center gap-2">
                <Label htmlFor="endDate">{t('common.to') || 'To'}</Label>
                <Input
                    id="endDate"
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                    className="w-auto"
                />
            </div>
        </div>
    );

    // Daily Cashbook Tab
    const DailyCashbookTab = () => (
        <div className="space-y-4">
            <DateRangePicker />
            {cashbookLoading ? (
                <div className="flex items-center justify-center h-64">
                    <LoadingSpinner />
                </div>
            ) : cashbook && cashbook.cashbook.length > 0 ? (
                <>
                    {cashbook.cashbook.map((cb, idx) => {
                        // Combine income and expenses into a single entries array for display
                        const allEntries = [
                            ...cb.income.map(e => ({ ...e, type: 'income' as const, categoryName: e.incomeCategory?.name || '-' })),
                            ...cb.expenses.map(e => ({ ...e, type: 'expense' as const, categoryName: e.expenseCategory?.name || '-' })),
                        ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                        return (
                            <div key={cb.account.id} className="space-y-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>{cb.account.name} - {t('finance.dailyCashbook') || 'Daily Cashbook'}</CardTitle>
                                        <CardDescription>{formatDate(cashbook.date)}</CardDescription>
                                    </CardHeader>
                                </Card>

                                {/* Summary */}
                                <div className="grid gap-4 md:grid-cols-4">
                                    <Card>
                                        <CardContent className="pt-6">
                                            <div className="text-sm text-muted-foreground">{t('finance.openingBalance') || 'Opening Balance'}</div>
                                            <div className="text-2xl font-bold">{formatCurrency(cb.openingBalance)}</div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="pt-6">
                                            <div className="text-sm text-muted-foreground">{t('finance.totalIncome') || 'Total Income'}</div>
                                            <div className="text-2xl font-bold text-green-600">+{formatCurrency(cb.totalIncome)}</div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="pt-6">
                                            <div className="text-sm text-muted-foreground">{t('finance.totalExpenses') || 'Total Expenses'}</div>
                                            <div className="text-2xl font-bold text-red-600">-{formatCurrency(cb.totalExpense)}</div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="pt-6">
                                            <div className="text-sm text-muted-foreground">{t('finance.closingBalance') || 'Closing Balance'}</div>
                                            <div className="text-2xl font-bold">{formatCurrency(cb.closingBalance)}</div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Transactions */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>{t('finance.transactions') || 'Transactions'}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>{t('common.date') || 'Date'}</TableHead>
                                                    <TableHead>{t('common.type') || 'Type'}</TableHead>
                                                    <TableHead>{t('finance.category') || 'Category'}</TableHead>
                                                    <TableHead>{t('common.description') || 'Description'}</TableHead>
                                                    <TableHead className="text-right">{t('finance.amount') || 'Amount'}</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {allEntries.map((entry) => (
                                                    <TableRow key={entry.id}>
                                                        <TableCell>{formatDate(entry.date)}</TableCell>
                                                        <TableCell>
                                                            {entry.type === 'income' ? (
                                                                <span className="flex items-center gap-1 text-green-600">
                                                                    <TrendingUp className="h-4 w-4" />
                                                                    {t('finance.income') || 'Income'}
                                                                </span>
                                                            ) : (
                                                                <span className="flex items-center gap-1 text-red-600">
                                                                    <TrendingDown className="h-4 w-4" />
                                                                    {t('finance.expense') || 'Expense'}
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>{entry.categoryName}</TableCell>
                                                        <TableCell>{entry.description || '-'}</TableCell>
                                                        <TableCell className={`text-right font-medium ${entry.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                                            {entry.type === 'income' ? '+' : '-'}{formatCurrency(entry.amount)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                {allEntries.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                            {t('finance.noTransactions') || 'No transactions found'}
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </div>
                        );
                    })}
                </>
            ) : null}
        </div>
    );

    // Income vs Expense Tab
    const IncomeVsExpenseTab = () => {
        const chartData = useMemo(() => {
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

        return (
            <div className="space-y-4">
                <DateRangePicker />
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

                        {/* Charts */}
                        <div className="grid gap-4 md:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t('finance.incomeByCategory') || 'Income by Category'}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {incomeVsExpense.incomeByCategory.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={300}>
                                            <PieChart>
                                                <Pie
                                                    data={incomeVsExpense.incomeByCategory}
                                                    dataKey="total"
                                                    nameKey="name"
                                                    cx="50%"
                                                    cy="50%"
                                                    outerRadius={100}
                                                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                                >
                                                    {incomeVsExpense.incomeByCategory.map((_, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                                            {t('finance.noData') || 'No data available'}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t('finance.expenseByCategory') || 'Expenses by Category'}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {incomeVsExpense.expenseByCategory.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={300}>
                                            <PieChart>
                                                <Pie
                                                    data={incomeVsExpense.expenseByCategory}
                                                    dataKey="total"
                                                    nameKey="name"
                                                    cx="50%"
                                                    cy="50%"
                                                    outerRadius={100}
                                                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                                >
                                                    {incomeVsExpense.expenseByCategory.map((_, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                                            {t('finance.noData') || 'No data available'}
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
            <DateRangePicker />
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
                                <div className="text-2xl font-bold">{projectSummary.summary.totalProjects}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-sm text-muted-foreground">{t('finance.totalProjectIncome') || 'Total Income'}</div>
                                <div className="text-2xl font-bold text-green-600">{formatCurrency(projectSummary.summary.totalIncome)}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-sm text-muted-foreground">{t('finance.totalProjectExpense') || 'Total Expense'}</div>
                                <div className="text-2xl font-bold text-red-600">{formatCurrency(projectSummary.summary.totalExpense)}</div>
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
                                        <TableHead>{t('common.name') || 'Name'}</TableHead>
                                        <TableHead className="text-right">{t('finance.income') || 'Income'}</TableHead>
                                        <TableHead className="text-right">{t('finance.expense') || 'Expense'}</TableHead>
                                        <TableHead className="text-right">{t('finance.balance') || 'Balance'}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {projectSummary.projects.map((project) => (
                                        <TableRow key={project.id}>
                                            <TableCell className="font-medium">{project.name}</TableCell>
                                            <TableCell className="text-right text-green-600">
                                                {formatCurrency(project.totalIncome)}
                                            </TableCell>
                                            <TableCell className="text-right text-red-600">
                                                {formatCurrency(project.totalExpense)}
                                            </TableCell>
                                            <TableCell className={`text-right font-medium ${project.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {formatCurrency(project.balance)}
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
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={projectSummary.projects}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                    <Legend />
                                    <Bar dataKey="totalIncome" name={t('finance.income') || 'Income'} fill="#22c55e" />
                                    <Bar dataKey="totalExpense" name={t('finance.expense') || 'Expense'} fill="#ef4444" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
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
            <DateRangePicker />
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
                                <div className="text-2xl font-bold">{donorSummary.summary.totalDonors}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-sm text-muted-foreground">{t('finance.totalDonations') || 'Total Donations'}</div>
                                <div className="text-2xl font-bold text-green-600">{formatCurrency(donorSummary.summary.totalDonations)}</div>
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
                                        <TableHead>{t('common.name') || 'Name'}</TableHead>
                                        <TableHead>{t('common.type') || 'Type'}</TableHead>
                                        <TableHead className="text-right">{t('finance.donationCount') || 'Donations'}</TableHead>
                                        <TableHead className="text-right">{t('finance.totalAmount') || 'Total Amount'}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {donorSummary.donors.map((donor) => (
                                        <TableRow key={donor.id}>
                                            <TableCell className="font-medium">{donor.name}</TableCell>
                                            <TableCell>{donor.type === 'individual' ? t('finance.individual') || 'Individual' : t('finance.organization') || 'Organization'}</TableCell>
                                            <TableCell className="text-right">{donor.donationCount}</TableCell>
                                            <TableCell className="text-right font-medium text-green-600">
                                                {formatCurrency(donor.totalDonated)}
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
                                <BarChart data={donorSummary.donors.slice(0, 10)} layout="vertical">
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
                                        <TableHead>{t('common.name') || 'Name'}</TableHead>
                                        <TableHead>{t('common.type') || 'Type'}</TableHead>
                                        <TableHead className="text-right">{t('finance.openingBalance') || 'Opening Balance'}</TableHead>
                                        <TableHead className="text-right">{t('finance.currentBalance') || 'Current Balance'}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {accountBalances.accounts.map((account) => (
                                        <TableRow key={account.id}>
                                            <TableCell className="font-medium">{account.name}</TableCell>
                                            <TableCell>{account.type === 'cash' ? t('finance.cash') || 'Cash' : t('finance.fund') || 'Fund'}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(account.openingBalance)}</TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(account.currentBalance)}
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
                            <CardTitle>{t('finance.balanceDistribution') || 'Balance Distribution'}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={accountBalances.accounts}
                                        dataKey="currentBalance"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={100}
                                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                    >
                                        {accountBalances.accounts.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                </PieChart>
                            </ResponsiveContainer>
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
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold">
                    {t('finance.reports') || 'Finance Reports'}
                </h1>
                <p className="text-muted-foreground">
                    {t('finance.reportsDescription') || 'Generate and view financial reports'}
                </p>
            </div>

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
