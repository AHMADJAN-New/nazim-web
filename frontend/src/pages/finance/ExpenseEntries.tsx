/**
 * Expense Entries Page - View and manage expense records
 */

import { Plus, Pencil, Trash2, TrendingDown, Search, Filter, Calendar, X } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

import { FilterPanel } from '@/components/layout/FilterPanel';
import { PageHeader } from '@/components/layout/PageHeader';
import { ReportExportButtons } from '@/components/reports/ReportExportButtons';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { useCurrencies } from '@/hooks/useCurrencies';
import {
    useExpenseEntries,
    useCreateExpenseEntry,
    useUpdateExpenseEntry,
    useDeleteExpenseEntry,
    useFinanceAccounts,
    useExpenseCategories,
    useFinanceProjects,
    type ExpenseEntry,
    type ExpenseEntryFormData,
} from '@/hooks/useFinance';
import { useLanguage } from '@/hooks/useLanguage';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function ExpenseEntries() {
    const { t } = useLanguage();
    const [searchParams, setSearchParams] = useSearchParams();
    const { data: entries, isLoading } = useExpenseEntries();
    const { data: accounts } = useFinanceAccounts();
    const { data: categories } = useExpenseCategories();
    const { data: projects } = useFinanceProjects();
    const { data: currencies } = useCurrencies({ isActive: true });
    const createEntry = useCreateExpenseEntry();
    const updateEntry = useUpdateExpenseEntry();
    const deleteEntry = useDeleteExpenseEntry();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editEntry, setEditEntry] = useState<ExpenseEntry | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [viewingEntry, setViewingEntry] = useState<ExpenseEntry | null>(null);
    const [sidePanelOpen, setSidePanelOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [filterAccount, setFilterAccount] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [dateFrom, setDateFrom] = useState<string>('');
    const [dateTo, setDateTo] = useState<string>('');

    const [formData, setFormData] = useState<ExpenseEntryFormData>({
        accountId: '',
        expenseCategoryId: '',
        currencyId: null,
        projectId: null,
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        referenceNo: '',
        description: '',
        paidTo: '',
        paymentMethod: 'cash',
        status: 'approved',
    });

    const resetForm = () => {
        setFormData({
            accountId: '',
            expenseCategoryId: '',
            currencyId: null,
            projectId: null,
            amount: 0,
            date: new Date().toISOString().split('T')[0],
            referenceNo: '',
            description: '',
            paidTo: '',
            paymentMethod: 'cash',
            status: 'approved',
        });
    };

    const handleCreate = async () => {
        await createEntry.mutateAsync(formData);
        setIsCreateOpen(false);
        resetForm();
    };

    const handleUpdate = async () => {
        if (!editEntry) return;
        await updateEntry.mutateAsync({ id: editEntry.id, ...formData });
        setEditEntry(null);
        resetForm();
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        await deleteEntry.mutateAsync(deleteId);
        setDeleteId(null);
    };

    const openEditDialog = (entry: ExpenseEntry) => {
        setEditEntry(entry);
        setFormData({
            accountId: entry.accountId,
            expenseCategoryId: entry.expenseCategoryId,
            currencyId: entry.currencyId || null,
            projectId: entry.projectId || null,
            amount: entry.amount,
            date: entry.date.toISOString().split('T')[0],
            referenceNo: entry.referenceNo || '',
            description: entry.description || '',
            paidTo: entry.paidTo || '',
            status: entry.status,
        });
    };

    const filteredEntries = useMemo(() => {
        if (!entries) return [];
        return entries.filter((entry) => {
            const matchesSearch = searchTerm === '' ||
                entry.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                entry.referenceNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                entry.expenseCategory?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                entry.paidTo?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = filterCategory === 'all' || entry.expenseCategoryId === filterCategory;
            const matchesAccount = filterAccount === 'all' || entry.accountId === filterAccount;
            const matchesStatus = filterStatus === 'all' || entry.status === filterStatus;

            // Date range filter
            const entryDate = new Date(entry.date);
            const matchesDateFrom = !dateFrom || entryDate >= new Date(dateFrom);
            const matchesDateTo = !dateTo || entryDate <= new Date(dateTo);

            return matchesSearch && matchesCategory && matchesAccount && matchesStatus && matchesDateFrom && matchesDateTo;
        });
    }, [entries, searchTerm, filterCategory, filterAccount, filterStatus, dateFrom, dateTo]);

    const clearFilters = () => {
        setSearchTerm('');
        setFilterCategory('all');
        setFilterAccount('all');
        setFilterStatus('all');
        setDateFrom('');
        setDateTo('');
    };

    // Get base currency and selected account for currency selection
    const baseCurrency = useMemo(() => {
        return currencies?.find(c => c.isBase && c.isActive) || null;
    }, [currencies]);

    const selectedAccount = useMemo(() => {
        return accounts?.find(a => a.id === formData.accountId) || null;
    }, [accounts, formData.accountId]);

    const defaultCurrencyId = useMemo(() => {
        return selectedAccount?.currencyId || baseCurrency?.id || null;
    }, [selectedAccount, baseCurrency]);

    const hasActiveFilters = searchTerm || filterCategory !== 'all' || filterAccount !== 'all' || filterStatus !== 'all' || dateFrom || dateTo;

    const totalExpense = useMemo(() => {
        return filteredEntries
            .filter(e => e.status === 'approved')
            .reduce((sum, entry) => sum + entry.amount, 0);
    }, [filteredEntries]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <LoadingSpinner />
            </div>
        );
    }

    const activeAccounts = accounts?.filter(a => a.isActive) || [];
    const activeCategories = categories?.filter(c => c.isActive) || [];
    const activeProjects = projects?.filter(p => p.isActive) || [];

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return (
                    <Badge variant="outline" className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400">
                        {t('finance.approved')}
                    </Badge>
                );
            case 'pending':
                return (
                    <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400">
                        {t('finance.pending')}
                    </Badge>
                );
            case 'rejected':
                return (
                    <Badge variant="outline" className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
                        {t('finance.rejected')}
                    </Badge>
                );
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const renderEntryForm = (onSubmit: () => void, loading: boolean) => (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                onSubmit();
            }}
            className="space-y-4 max-h-[70vh] overflow-y-auto pr-2"
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="accountId">{t('finance.account')} *</Label>
                    <Select
                        value={formData.accountId}
                        onValueChange={(value) => setFormData({ ...formData, accountId: value })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder={t('finance.selectAccount')} />
                        </SelectTrigger>
                        <SelectContent>
                            {activeAccounts.map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                    {account.name} ({formatCurrency(account.currentBalance)})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="expenseCategoryId">{t('assets.category')} *</Label>
                    <Select
                        value={formData.expenseCategoryId}
                        onValueChange={(value) => setFormData({ ...formData, expenseCategoryId: value })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder={t('finance.selectCategory')} />
                        </SelectTrigger>
                        <SelectContent>
                            {activeCategories.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                    {category.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="amount">{t('finance.amount')} *</Label>
                    <Input
                        id="amount"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={formData.amount || ''}
                        onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="date">{t('events.date')} *</Label>
                    <CalendarDatePicker date={formData.date ? new Date(formData.date) : undefined} onDateChange={(date) => setFormData({ ...formData, date: date ? date.toISOString().split("T")[0] : "" })} />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="currencyId">{t('finance.currency')}</Label>
                    <Select
                        value={formData.currencyId || defaultCurrencyId || 'none'}
                        onValueChange={(value) => setFormData({ ...formData, currencyId: value === 'none' ? null : value })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder={t('finance.selectCurrency')} />
                        </SelectTrigger>
                        <SelectContent>
                            {selectedAccount?.currencyId && (
                                <SelectItem value={selectedAccount.currencyId}>
                                    {currencies?.find(c => c.id === selectedAccount.currencyId)?.code || t('common.notAvailable')} - {currencies?.find(c => c.id === selectedAccount.currencyId)?.name || t('finance.accountCurrency')}
                                </SelectItem>
                            )}
                            {baseCurrency && (!selectedAccount?.currencyId || selectedAccount.currencyId !== baseCurrency.id) && (
                                <SelectItem value={baseCurrency.id}>
                                    {baseCurrency.code} - {baseCurrency.name} {t('finance.baseCurrency')}
                                </SelectItem>
                            )}
                            {currencies?.filter(c => 
                                c.id !== selectedAccount?.currencyId && 
                                c.id !== baseCurrency?.id
                            ).map((currency) => (
                                <SelectItem key={currency.id} value={currency.id}>
                                    {currency.code} - {currency.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="projectId">{t('finance.project')}</Label>
                    <Select
                        value={formData.projectId || 'none'}
                        onValueChange={(value) => setFormData({ ...formData, projectId: value === 'none' ? null : value })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder={t('finance.selectProject')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">{t('common.none')}</SelectItem>
                            {activeProjects.map((project) => (
                                <SelectItem key={project.id} value={project.id}>
                                    {project.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="paidTo">{t('finance.paidTo')}</Label>
                    <Input
                        id="paidTo"
                        value={formData.paidTo || ''}
                        onChange={(e) => setFormData({ ...formData, paidTo: e.target.value })}
                        placeholder={t('finance.paidToPlaceholder')}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="paymentMethod">{t('finance.paymentMethod')}</Label>
                    <Select
                        value={formData.paymentMethod || 'cash'}
                        onValueChange={(value: 'cash' | 'bank_transfer' | 'cheque' | 'other') => setFormData({ ...formData, paymentMethod: value })}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="cash">{t('finance.cash')}</SelectItem>
                            <SelectItem value="bank_transfer">{t('finance.bankTransfer')}</SelectItem>
                            <SelectItem value="cheque">{t('finance.cheque')}</SelectItem>
                            <SelectItem value="other">{t('common.other')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="referenceNo">{t('finance.referenceNo')}</Label>
                    <Input
                        id="referenceNo"
                        value={formData.referenceNo || ''}
                        onChange={(e) => setFormData({ ...formData, referenceNo: e.target.value })}
                        placeholder={t('finance.voucherNoPlaceholder')}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="status">{t('common.status')}</Label>
                    <Select
                        value={formData.status}
                        onValueChange={(value: 'pending' | 'approved' | 'rejected') => setFormData({ ...formData, status: value })}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="approved">{t('finance.approved')}</SelectItem>
                            <SelectItem value="pending">{t('finance.pending')}</SelectItem>
                            <SelectItem value="rejected">{t('finance.rejected')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="description">{t('common.description')}</Label>
                <Textarea
                    id="description"
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={t('finance.expenseDescriptionPlaceholder')}
                />
            </div>
            <DialogFooter>
                <Button type="submit" disabled={loading || !formData.accountId || !formData.expenseCategoryId || formData.amount <= 0}>
                    {editEntry ? t('common.update') : t('common.create')}
                </Button>
            </DialogFooter>
        </form>
    );

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
            <PageHeader
                title={t('finance.expenseEntries')}
                description={t('finance.expenseEntriesDescription')}
                icon={<TrendingDown className="h-5 w-5" />}
                primaryAction={{
                    label: t('finance.addExpense'),
                    onClick: () => setIsCreateOpen(true),
                    icon: <Plus className="h-4 w-4" />,
                }}
                rightSlot={
                    <ReportExportButtons
                        data={filteredEntries}
                        columns={[
                            { key: 'date', label: t('common.date'), align: 'left' },
                            { key: 'categoryName', label: t('assets.category'), align: 'left' },
                            { key: 'accountName', label: t('finance.account'), align: 'left' },
                            { key: 'paidTo', label: t('finance.paidTo'), align: 'left' },
                            { key: 'projectName', label: t('finance.project'), align: 'left' },
                            { key: 'amount', label: t('finance.amount'), align: 'right' },
                            { key: 'paymentMethod', label: t('finance.paymentMethod'), align: 'left' },
                            { key: 'status', label: t('common.status'), align: 'center' },
                            { key: 'referenceNo', label: t('finance.referenceNo'), align: 'left' },
                        ]}
                        reportKey="expense_entries"
                        title={t('finance.expenseEntries')}
                        transformData={(data) =>
                            data.map((entry) => ({
                                date: formatDate(entry.date),
                                categoryName: entry.expenseCategory?.name || '-',
                                accountName: entry.account?.name || '-',
                                paidTo: entry.paidTo || '-',
                                projectName: entry.project?.name || '-',
                                amount: formatCurrency(entry.amount),
                                paymentMethod: entry.paymentMethod?.replace('_', ' ').toUpperCase() || '-',
                                status: entry.status.charAt(0).toUpperCase() + entry.status.slice(1),
                                referenceNo: entry.referenceNo || '-',
                            }))
                        }
                        buildFiltersSummary={() => {
                            const parts: string[] = [];
                            if (dateFrom) parts.push(`${t('common.from')}: ${dateFrom}`);
                            if (dateTo) parts.push(`${t('common.to')}: ${dateTo}`);
                            if (filterCategory !== 'all') {
                                const cat = categories?.find(c => c.id === filterCategory);
                                if (cat) parts.push(`${t('assets.category')}: ${cat.name}`);
                            }
                            if (filterAccount !== 'all') {
                                const acc = accounts?.find(a => a.id === filterAccount);
                                if (acc) parts.push(`${t('finance.account')}: ${acc.name}`);
                            }
                            if (filterStatus !== 'all') parts.push(`${t('common.status')}: ${filterStatus}`);
                            if (searchTerm) parts.push(`${t('common.search')}: ${searchTerm}`);
                            return parts.join(' | ');
                        }}
                        templateType="expense_entries"
                        disabled={isLoading || filteredEntries.length === 0}
                    />
                }
            />

            <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{t('finance.addExpense')}</DialogTitle>
                        <DialogDescription>
                            {t('finance.addExpenseDescription')}
                        </DialogDescription>
                    </DialogHeader>
                    {renderEntryForm(handleCreate, createEntry.isPending)}
                </DialogContent>
            </Dialog>

            <FilterPanel title={t('common.filters')}>
                <div className="flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[200px]">
                        <Label className="text-xs text-muted-foreground mb-1 block">
                            {t('common.search')}
                        </Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t('common.search')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>
                    <div className="min-w-[150px]">
                        <Label className="text-xs text-muted-foreground mb-1 block">
                            <Calendar className="inline h-3 w-3 mr-1" />
                            {t('common.from')}
                        </Label>
                        <CalendarDatePicker date={dateFrom ? new Date(dateFrom) : undefined} onDateChange={(date) => setDateFrom(date ? date.toISOString().split("T")[0] : "")} />
                    </div>
                    <div className="min-w-[150px]">
                        <Label className="text-xs text-muted-foreground mb-1 block">
                            <Calendar className="inline h-3 w-3 mr-1" />
                            {t('common.to')}
                        </Label>
                        <CalendarDatePicker date={dateTo ? new Date(dateTo) : undefined} onDateChange={(date) => setDateTo(date ? date.toISOString().split("T")[0] : "")} />
                    </div>
                    <div className="min-w-[140px]">
                        <Label className="text-xs text-muted-foreground mb-1 block">
                            <Filter className="inline h-3 w-3 mr-1" />
                            {t('assets.category')}
                        </Label>
                        <Select value={filterCategory} onValueChange={setFilterCategory}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('common.all')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('common.all')}</SelectItem>
                                {categories?.map((category) => (
                                    <SelectItem key={category.id} value={category.id}>
                                        {category.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="min-w-[140px]">
                        <Label className="text-xs text-muted-foreground mb-1 block">
                            {t('finance.account')}
                        </Label>
                        <Select value={filterAccount} onValueChange={setFilterAccount}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('common.all')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('common.all')}</SelectItem>
                                {accounts?.map((account) => (
                                    <SelectItem key={account.id} value={account.id}>
                                        {account.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="min-w-[120px]">
                        <Label className="text-xs text-muted-foreground mb-1 block">
                            {t('common.status')}
                        </Label>
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('common.all')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('common.all')}</SelectItem>
                                <SelectItem value="approved">{t('finance.approved')}</SelectItem>
                                <SelectItem value="pending">{t('finance.pending')}</SelectItem>
                                <SelectItem value="rejected">{t('finance.rejected')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {hasActiveFilters && (
                        <Button variant="outline" size="sm" onClick={clearFilters}>
                            <X className="h-4 w-4 mr-1" />
                            {t('common.clearFilters')}
                        </Button>
                    )}
                </div>
            </FilterPanel>

            {/* Summary Card */}
            <Card>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <TrendingDown className="h-5 w-5 text-red-500" />
                            {t('finance.totalExpenses')}
                        </CardTitle>
                        <span className="text-2xl font-bold text-red-600">
                            {formatCurrency(totalExpense)}
                        </span>
                    </div>
                    <CardDescription>
                        {filteredEntries.length} {t('finance.entriesFound')} ({t('finance.approvedOnly')})
                    </CardDescription>
                </CardHeader>
            </Card>

            {/* Entries Table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('common.date')}</TableHead>
                                <TableHead>{t('assets.category')}</TableHead>
                                <TableHead>{t('finance.account')}</TableHead>
                                <TableHead>{t('finance.paidTo')}</TableHead>
                                <TableHead>{t('finance.project')}</TableHead>
                                <TableHead>{t('common.status')}</TableHead>
                                <TableHead className="text-right">{t('finance.amount')}</TableHead>
                                <TableHead className="text-right">{t('common.actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredEntries.map((entry) => (
                                <TableRow 
                                    key={entry.id}
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => {
                                        setViewingEntry(entry);
                                        setSidePanelOpen(true);
                                    }}
                                >
                                    <TableCell>{formatDate(entry.date)}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400">
                                            {entry.expenseCategory?.name || '-'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {entry.account?.name ? (
                                            <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400">
                                                {entry.account.name}
                                            </Badge>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {entry.paidTo ? (
                                            <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400">
                                                {entry.paidTo}
                                            </Badge>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {entry.project?.name ? (
                                            <Badge variant="outline" className="bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400">
                                                {entry.project.name}
                                            </Badge>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>{getStatusBadge(entry.status)}</TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant="outline" className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 font-semibold">
                                            -{formatCurrency(entry.amount)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => openEditDialog(entry)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setDeleteId(entry.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredEntries.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                        {t('finance.noExpenses')}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={!!editEntry} onOpenChange={(open) => { if (!open) { setEditEntry(null); resetForm(); } }}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{t('finance.editExpense')}</DialogTitle>
                        <DialogDescription>
                            {t('finance.editExpenseDescription')}
                        </DialogDescription>
                    </DialogHeader>
                    {renderEntryForm(handleUpdate, updateEntry.isPending)}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('finance.deleteEntryWarning')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                            {t('common.delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Side Panel for Viewing Entry Details */}
            <Sheet open={sidePanelOpen} onOpenChange={setSidePanelOpen}>
                <SheetContent className="sm:max-w-2xl overflow-y-auto">
                    {viewingEntry && (
                        <>
                            <SheetHeader>
                                <SheetTitle>{t('finance.entryDetails')}</SheetTitle>
                                <SheetDescription>
                                    {t('finance.viewEntryDetails')}
                                </SheetDescription>
                            </SheetHeader>

                            <div className="mt-6 space-y-6">
                                {/* Entry Information */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold">{t('finance.entryInformation')}</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">{t('finance.amount')}</p>
                                            <p className="text-lg font-semibold text-red-600">
                                                -{formatCurrency(viewingEntry.amount)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">{t('common.date')}</p>
                                            <p className="text-sm font-medium">{formatDate(viewingEntry.date)}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">{t('common.status')}</p>
                                            <div className="mt-1">{getStatusBadge(viewingEntry.status)}</div>
                                        </div>
                                        {viewingEntry.referenceNo && (
                                            <div>
                                                <p className="text-sm font-medium text-muted-foreground">{t('finance.referenceNo')}</p>
                                                <p className="text-sm font-medium">{viewingEntry.referenceNo}</p>
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">{t('finance.paymentMethod')}</p>
                                            <Badge variant="outline" className="mt-1">
                                                {viewingEntry.paymentMethod.replace('_', ' ').toUpperCase()}
                                            </Badge>
                                        </div>
                                        {viewingEntry.paidTo && (
                                            <div>
                                                <p className="text-sm font-medium text-muted-foreground">{t('finance.paidTo')}</p>
                                                <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400 mt-1">
                                                    {viewingEntry.paidTo}
                                                </Badge>
                                            </div>
                                        )}
                                    </div>
                                    {viewingEntry.description && (
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">{t('common.description')}</p>
                                            <p className="text-sm mt-1">{viewingEntry.description}</p>
                                        </div>
                                    )}
                                </div>

                                <Separator />

                                {/* Account Information */}
                                {viewingEntry.account && (
                                    <>
                                        <div className="space-y-4">
                                            <h3 className="text-lg font-semibold">{t('finance.accountInformation')}</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-sm font-medium text-muted-foreground">{t('finance.accountName')}</p>
                                                    <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 mt-1">
                                                        {viewingEntry.account.name}
                                                    </Badge>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-muted-foreground">{t('finance.accountType')}</p>
                                                    <Badge 
                                                        variant="outline"
                                                        className={
                                                            viewingEntry.account.type === 'cash'
                                                                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 mt-1'
                                                                : 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400 mt-1'
                                                        }
                                                    >
                                                        {viewingEntry.account.type === 'cash' ? t('finance.cash') : t('finance.fund')}
                                                    </Badge>
                                                </div>
                                                <div className="col-span-2">
                                                    <p className="text-sm font-medium text-muted-foreground">{t('finance.currentBalance')}</p>
                                                    <p className="text-2xl font-bold text-emerald-600 mt-1">
                                                        {formatCurrency(viewingEntry.account.currentBalance)}
                                                    </p>
                                                </div>
                                                {viewingEntry.account.code && (
                                                    <div>
                                                        <p className="text-sm font-medium text-muted-foreground">{t('finance.accountCode')}</p>
                                                        <p className="text-sm font-medium">{viewingEntry.account.code}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <Separator />
                                    </>
                                )}

                                {/* Category Information */}
                                {viewingEntry.expenseCategory && (
                                    <>
                                        <div className="space-y-4">
                                            <h3 className="text-lg font-semibold">{t('finance.categoryInformation')}</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-sm font-medium text-muted-foreground">{t('assets.category')}</p>
                                                    <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 mt-1">
                                                        {viewingEntry.expenseCategory.name}
                                                    </Badge>
                                                </div>
                                                {viewingEntry.expenseCategory.code && (
                                                    <div>
                                                        <p className="text-sm font-medium text-muted-foreground">{t('assets.categoryCode')}</p>
                                                        <p className="text-sm font-medium">{viewingEntry.expenseCategory.code}</p>
                                                    </div>
                                                )}
                                                {viewingEntry.expenseCategory.description && (
                                                    <div className="col-span-2">
                                                        <p className="text-sm font-medium text-muted-foreground">{t('common.description')}</p>
                                                        <p className="text-sm mt-1">{viewingEntry.expenseCategory.description}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <Separator />
                                    </>
                                )}

                                {/* Project Information */}
                                {viewingEntry.project && (
                                    <>
                                        <div className="space-y-4">
                                            <h3 className="text-lg font-semibold">{t('finance.projectInformation')}</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-sm font-medium text-muted-foreground">{t('finance.project')}</p>
                                                    <Badge variant="outline" className="bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400 mt-1">
                                                        {viewingEntry.project.name}
                                                    </Badge>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-muted-foreground">{t('common.status')}</p>
                                                    <Badge variant="outline" className="mt-1 capitalize">
                                                        {viewingEntry.project.status}
                                                    </Badge>
                                                </div>
                                                {viewingEntry.project.budgetAmount && (
                                                    <div>
                                                        <p className="text-sm font-medium text-muted-foreground">{t('finance.budgetAmount')}</p>
                                                        <p className="text-sm font-medium">{formatCurrency(viewingEntry.project.budgetAmount)}</p>
                                                    </div>
                                                )}
                                                {viewingEntry.project.balance !== undefined && (
                                                    <div>
                                                        <p className="text-sm font-medium text-muted-foreground">{t('finance.projectBalance')}</p>
                                                        <p className="text-sm font-medium">{formatCurrency(viewingEntry.project.balance)}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <Separator />
                                    </>
                                )}

                                {/* Currency Information */}
                                {viewingEntry.currency && (
                                    <>
                                        <div className="space-y-4">
                                            <h3 className="text-lg font-semibold">{t('finance.currencyInformation')}</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-sm font-medium text-muted-foreground">{t('finance.currency')}</p>
                                                    <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 mt-1">
                                                        {viewingEntry.currency.code || t('common.notAvailable')}
                                                    </Badge>
                                                </div>
                                                {viewingEntry.currency.symbol && (
                                                    <div>
                                                        <p className="text-sm font-medium text-muted-foreground">{t('finance.currencySymbol')}</p>
                                                        <p className="text-sm font-medium">{viewingEntry.currency.symbol}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <Separator />
                                    </>
                                )}

                                {/* Metadata */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold">{t('common.metadata')}</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {viewingEntry.createdAt && (
                                            <div>
                                                <p className="text-sm font-medium text-muted-foreground">{t('common.createdAt')}</p>
                                                <p className="text-sm">{formatDate(viewingEntry.createdAt)}</p>
                                            </div>
                                        )}
                                        {viewingEntry.updatedAt && (
                                            <div>
                                                <p className="text-sm font-medium text-muted-foreground">{t('common.updatedAt')}</p>
                                                <p className="text-sm">{formatDate(viewingEntry.updatedAt)}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}

