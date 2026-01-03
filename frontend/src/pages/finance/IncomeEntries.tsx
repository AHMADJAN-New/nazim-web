/**
 * Income Entries Page - View and manage income records
 */

import { Plus, Pencil, Trash2, TrendingUp, Search, Filter, Calendar, X, DollarSign } from 'lucide-react';
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
import { useCurrencies, useConvertCurrency } from '@/hooks/useCurrencies';
import {
    useIncomeEntries,
    useCreateIncomeEntry,
    useUpdateIncomeEntry,
    useDeleteIncomeEntry,
    useFinanceAccounts,
    useIncomeCategories,
    useFinanceProjects,
    useDonors,
    type IncomeEntry,
    type IncomeEntryFormData,
} from '@/hooks/useFinance';
import { useLanguage } from '@/hooks/useLanguage';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { PaymentMethod } from '@/types/domain/finance';

export default function IncomeEntries() {
    const { t } = useLanguage();
    const [searchParams, setSearchParams] = useSearchParams();
    const { data: entries, isLoading } = useIncomeEntries();
    const { data: accounts } = useFinanceAccounts();
    const { data: categories } = useIncomeCategories();
    const { data: projects } = useFinanceProjects();
    const { data: donors } = useDonors();
    const { data: currencies } = useCurrencies({ isActive: true });
    const createEntry = useCreateIncomeEntry();
    const updateEntry = useUpdateIncomeEntry();
    const deleteEntry = useDeleteIncomeEntry();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editEntry, setEditEntry] = useState<IncomeEntry | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [viewingEntry, setViewingEntry] = useState<IncomeEntry | null>(null);
    const [sidePanelOpen, setSidePanelOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [filterAccount, setFilterAccount] = useState<string>('all');
    const [dateFrom, setDateFrom] = useState<string>('');
    const [dateTo, setDateTo] = useState<string>('');

    const [formData, setFormData] = useState<IncomeEntryFormData>({
        accountId: '',
        incomeCategoryId: '',
        currencyId: null,
        projectId: null,
        donorId: null,
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        referenceNo: '',
        description: '',
        paymentMethod: 'cash',
    });

    const resetForm = () => {
        setFormData({
            accountId: '',
            incomeCategoryId: '',
            currencyId: null,
            projectId: null,
            donorId: null,
            amount: 0,
            date: new Date().toISOString().split('T')[0],
            referenceNo: '',
            description: '',
            paymentMethod: 'cash',
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

    const openEditDialog = (entry: IncomeEntry) => {
        setEditEntry(entry);
        setFormData({
            accountId: entry.accountId,
            incomeCategoryId: entry.incomeCategoryId,
            currencyId: entry.currencyId || null,
            projectId: entry.projectId || null,
            donorId: entry.donorId || null,
            amount: entry.amount,
            date: entry.date.toISOString().split('T')[0],
            referenceNo: entry.referenceNo || '',
            description: entry.description || '',
            paymentMethod: entry.paymentMethod || 'cash',
        });
    };

    const filteredEntries = useMemo(() => {
        if (!entries) return [];
        return entries.filter((entry) => {
            const matchesSearch = searchTerm === '' ||
                entry.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                entry.referenceNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                entry.incomeCategory?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                entry.donor?.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = filterCategory === 'all' || entry.incomeCategoryId === filterCategory;
            const matchesAccount = filterAccount === 'all' || entry.accountId === filterAccount;

            // Date range filter
            const entryDate = new Date(entry.date);
            const matchesDateFrom = !dateFrom || entryDate >= new Date(dateFrom);
            const matchesDateTo = !dateTo || entryDate <= new Date(dateTo);

            return matchesSearch && matchesCategory && matchesAccount && matchesDateFrom && matchesDateTo;
        });
    }, [entries, searchTerm, filterCategory, filterAccount, dateFrom, dateTo]);

    // Check for view query param and auto-open side panel
    useEffect(() => {
        const viewEntryId = searchParams.get('view');
        if (viewEntryId && entries && entries.length > 0) {
            const entry = entries.find(e => e.id === viewEntryId);
            if (entry) {
                setViewingEntry(entry);
                setSidePanelOpen(true);
                // Clean up URL
                setSearchParams({}, { replace: true });
            }
        }
    }, [searchParams, entries, setSearchParams]);

    const clearFilters = () => {
        setSearchTerm('');
        setFilterCategory('all');
        setFilterAccount('all');
        setDateFrom('');
        setDateTo('');
    };

    const hasActiveFilters = searchTerm || filterCategory !== 'all' || filterAccount !== 'all' || dateFrom || dateTo;

    const convertCurrency = useConvertCurrency();
    const [convertedTotals, setConvertedTotals] = useState<Record<string, number>>({});
    const [isConverting, setIsConverting] = useState(false);

    // Get base currency
    const baseCurrency = useMemo(() => {
        return currencies?.find(c => c.isBase) || null;
    }, [currencies]);

    // Filter active items (must be before conditional return)
    const activeAccounts = useMemo(() => accounts?.filter(a => a.isActive) || [], [accounts]);
    const activeCategories = useMemo(() => categories?.filter(c => c.isActive) || [], [categories]);
    const activeProjects = useMemo(() => projects?.filter(p => p.isActive) || [], [projects]);
    const activeDonors = useMemo(() => donors?.filter(d => d.isActive) || [], [donors]);

    // Auto-select currency based on selected account
    const selectedAccount = useMemo(() => {
        return activeAccounts.find(a => a.id === formData.accountId);
    }, [activeAccounts, formData.accountId]);

    // Get default currency for display (account's currency or base currency)
    const defaultCurrencyId = useMemo(() => {
        return selectedAccount?.currencyId || baseCurrency?.id || null;
    }, [selectedAccount, baseCurrency]);

    // Calculate totals per currency
    const totalsByCurrency = useMemo(() => {
        const totals: Record<string, { amount: number; currency: { id: string; code: string; name: string; symbol: string | null } }> = {};
        
        filteredEntries.forEach(entry => {
            const currencyId = entry.currencyId || baseCurrency?.id || 'unknown';
            const currency = entry.currency || baseCurrency || { id: currencyId, code: 'N/A', name: 'Unknown', symbol: null };
            
            if (!totals[currencyId]) {
                totals[currencyId] = {
                    amount: 0,
                    currency: {
                        id: currency.id,
                        code: currency.code,
                        name: currency.name,
                        symbol: currency.symbol,
                    },
                };
            }
            totals[currencyId].amount += entry.amount;
        });
        
        return totals;
    }, [filteredEntries, baseCurrency]);

    // Convert all currency totals to base currency
    useEffect(() => {
        if (!baseCurrency || Object.keys(totalsByCurrency).length === 0) {
            setConvertedTotals({});
            return;
        }

        let isCancelled = false;

        const convertAll = async () => {
            setIsConverting(true);
            const converted: Record<string, number> = {};
            
            // Get the most recent date from entries for conversion
            const mostRecentDate = filteredEntries.length > 0
                ? new Date(Math.max(...filteredEntries.map(e => new Date(e.date).getTime())))
                : new Date();
            const conversionDate = mostRecentDate.toISOString().split('T')[0];
            
            for (const [currencyId, data] of Object.entries(totalsByCurrency)) {
                if (isCancelled) break;
                
                // If currency is base currency or unknown, no conversion needed
                if (currencyId === baseCurrency.id || currencyId === 'unknown') {
                    converted[currencyId] = data.amount;
                } else {
                    try {
                        // Only convert if currencies are different
                        if (currencyId !== baseCurrency.id) {
                            const result = await convertCurrency.mutateAsync({
                                fromCurrencyId: currencyId,
                                toCurrencyId: baseCurrency.id,
                                amount: data.amount,
                                date: conversionDate,
                            });
                            converted[currencyId] = result.converted_amount || data.amount;
                        } else {
                            converted[currencyId] = data.amount;
                        }
                    } catch (error) {
                        // If conversion fails, use original amount
                        if (import.meta.env.DEV) {
                            console.warn(`Failed to convert ${currencyId} to base currency:`, error);
                        }
                        converted[currencyId] = data.amount;
                    }
                }
            }
            
            if (!isCancelled) {
                setConvertedTotals(converted);
                setIsConverting(false);
            }
        };

        convertAll();

        return () => {
            isCancelled = true;
        };
    }, [totalsByCurrency, baseCurrency?.id, filteredEntries.length]);

    // Calculate total in base currency
    const totalIncomeInBaseCurrency = useMemo(() => {
        return Object.values(convertedTotals).reduce((sum, amount) => sum + amount, 0);
    }, [convertedTotals]);

    // Format currency amount with symbol
    const formatCurrencyAmount = (amount: number, currency: { code: string; symbol: string | null } | null) => {
        if (!currency) {
            return formatCurrency(amount);
        }
        const symbol = currency.symbol || currency.code;
        return `${symbol} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // Auto-set currency when account is selected (only when creating new entry, not editing)
    useEffect(() => {
        if (editEntry) return; // Don't auto-set when editing
        
        const accountCurrencyId = selectedAccount?.currencyId;
        
        // Only set if we have a default currency and form is being created
        setFormData(prev => {
            // If currency is already set, don't change it
            if (prev.currencyId) return prev;
            
            // Set to account currency if available, otherwise base currency
            const newCurrencyId = accountCurrencyId || baseCurrency?.id || null;
            if (newCurrencyId && newCurrencyId !== prev.currencyId) {
                return { ...prev, currencyId: newCurrencyId };
            }
            return prev;
        });
    }, [selectedAccount?.currencyId, baseCurrency?.id, editEntry]); // Don't include formData.currencyId to avoid loop

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <LoadingSpinner />
            </div>
        );
    }

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
                    <Label htmlFor="accountId">{t('finance.account') || 'Account'} *</Label>
                    <Select
                        value={formData.accountId}
                        onValueChange={(value) => setFormData({ ...formData, accountId: value })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder={t('finance.selectAccount') || 'Select account'} />
                        </SelectTrigger>
                        <SelectContent>
                            {activeAccounts.map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                    {account.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="incomeCategoryId">{t('finance.category') || 'Category'} *</Label>
                    <Select
                        value={formData.incomeCategoryId}
                        onValueChange={(value) => setFormData({ ...formData, incomeCategoryId: value })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder={t('finance.selectCategory') || 'Select category'} />
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
                    <Label htmlFor="amount">{t('finance.amount') || 'Amount'} *</Label>
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
                    <Label htmlFor="date">{t('common.date') || 'Date'} *</Label>
                    <CalendarDatePicker date={formData.date ? new Date(formData.date) : undefined} onDateChange={(date) => setFormData(date ? date.toISOString().split("T")[0] : "")} />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="currencyId">{t('finance.currency') || 'Currency'}</Label>
                    <Select
                        value={formData.currencyId || defaultCurrencyId || 'none'}
                        onValueChange={(value) => setFormData({ ...formData, currencyId: value === 'none' ? null : value })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder={t('finance.selectCurrency') || 'Select currency'} />
                        </SelectTrigger>
                        <SelectContent>
                            {selectedAccount?.currencyId && (
                                <SelectItem value={selectedAccount.currencyId}>
                                    {currencies?.find(c => c.id === selectedAccount.currencyId)?.code || 'N/A'} - {currencies?.find(c => c.id === selectedAccount.currencyId)?.name || 'Account Currency'}
                                </SelectItem>
                            )}
                            {baseCurrency && (!selectedAccount?.currencyId || selectedAccount.currencyId !== baseCurrency.id) && (
                                <SelectItem value={baseCurrency.id}>
                                    {baseCurrency.code} - {baseCurrency.name} {t('finance.baseCurrency') || '(Base)'}
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
                    {selectedAccount?.currencyId && !formData.currencyId && (
                        <p className="text-xs text-muted-foreground">
                            {t('finance.accountCurrencyHint') || 'Default: Account currency'}
                        </p>
                    )}
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="projectId">{t('finance.project') || 'Project'}</Label>
                    <Select
                        value={formData.projectId || 'none'}
                        onValueChange={(value) => setFormData({ ...formData, projectId: value === 'none' ? null : value })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder={t('finance.selectProject') || 'Select project'} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">{t('common.none') || 'None'}</SelectItem>
                            {activeProjects.map((project) => (
                                <SelectItem key={project.id} value={project.id}>
                                    {project.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="donorId">{t('finance.donor') || 'Donor'}</Label>
                    <Select
                        value={formData.donorId || 'none'}
                        onValueChange={(value) => setFormData({ ...formData, donorId: value === 'none' ? null : value })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder={t('finance.selectDonor') || 'Select donor'} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">{t('common.none') || 'None'}</SelectItem>
                            {activeDonors.map((donor) => (
                                <SelectItem key={donor.id} value={donor.id}>
                                    {donor.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="referenceNo">{t('finance.referenceNo') || 'Reference No.'}</Label>
                    <Input
                        id="referenceNo"
                        value={formData.referenceNo || ''}
                        onChange={(e) => setFormData({ ...formData, referenceNo: e.target.value })}
                        placeholder={t('finance.referenceNoPlaceholder') || 'Receipt number...'}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="paymentMethod">{t('finance.paymentMethod') || 'Payment Method'}</Label>
                    <Select
                        value={formData.paymentMethod || 'cash'}
                        onValueChange={(value: PaymentMethod) => setFormData({ ...formData, paymentMethod: value })}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="cash">{t('finance.cash') || 'Cash'}</SelectItem>
                            <SelectItem value="cheque">{t('finance.cheque') || 'Cheque'}</SelectItem>
                            <SelectItem value="bank_transfer">{t('finance.bankTransfer') || 'Bank Transfer'}</SelectItem>
                            <SelectItem value="other">{t('finance.other') || 'Other'}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="description">{t('common.description') || 'Description'}</Label>
                <Textarea
                    id="description"
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={t('finance.incomeDescriptionPlaceholder') || 'e.g., Cash donation after Jumu\'ah'}
                />
            </div>
            <DialogFooter>
                <Button type="submit" disabled={loading || !formData.accountId || !formData.incomeCategoryId || formData.amount <= 0}>
                    {editEntry ? t('common.update') || 'Update' : t('common.create') || 'Create'}
                </Button>
            </DialogFooter>
        </form>
    );

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
            <PageHeader
                title={t('finance.incomeEntries') || 'Income Entries'}
                description={t('finance.incomeEntriesDescription') || 'Record and manage income'}
                icon={<TrendingUp className="h-5 w-5" />}
                primaryAction={{
                    label: t('finance.addIncome') || 'Add Income',
                    onClick: () => setIsCreateOpen(true),
                    icon: <Plus className="h-4 w-4" />,
                }}
                rightSlot={
                    <ReportExportButtons
                        data={filteredEntries}
                        columns={[
                            { key: 'date', label: t('common.date'), align: 'left' },
                            { key: 'categoryName', label: t('finance.category'), align: 'left' },
                            { key: 'accountName', label: t('finance.account'), align: 'left' },
                            { key: 'donorName', label: t('finance.donor'), align: 'left' },
                            { key: 'projectName', label: t('finance.project'), align: 'left' },
                            { key: 'currency', label: t('finance.currency'), align: 'left' },
                            { key: 'amount', label: t('finance.amount'), align: 'right' },
                            { key: 'paymentMethod', label: t('finance.paymentMethod'), align: 'left' },
                            { key: 'referenceNo', label: t('finance.referenceNo'), align: 'left' },
                        ]}
                        reportKey="income_entries"
                        title={t('finance.incomeEntries') || 'Income Entries'}
                        transformData={(data) =>
                            data.map((entry) => ({
                                date: formatDate(entry.date),
                                categoryName: entry.incomeCategory?.name || '-',
                                accountName: entry.account?.name || '-',
                                donorName: entry.donor?.name || '-',
                                projectName: entry.project?.name || '-',
                                currency: entry.currency?.code || baseCurrency?.code || '-',
                                amount: formatCurrency(entry.amount),
                                paymentMethod: entry.paymentMethod.replace('_', ' ').toUpperCase(),
                                referenceNo: entry.referenceNo || '-',
                            }))
                        }
                        buildFiltersSummary={() => {
                            const parts: string[] = [];
                            if (dateFrom) parts.push(`${t('common.from')}: ${dateFrom}`);
                            if (dateTo) parts.push(`${t('common.to')}: ${dateTo}`);
                            if (filterCategory !== 'all') {
                                const cat = categories?.find(c => c.id === filterCategory);
                                if (cat) parts.push(`${t('finance.category')}: ${cat.name}`);
                            }
                            if (filterAccount !== 'all') {
                                const acc = accounts?.find(a => a.id === filterAccount);
                                if (acc) parts.push(`${t('finance.account')}: ${acc.name}`);
                            }
                            if (searchTerm) parts.push(`${t('common.search')}: ${searchTerm}`);
                            return parts.join(' | ');
                        }}
                        templateType="income_entries"
                        disabled={isLoading || filteredEntries.length === 0}
                    />
                }
            />

            <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{t('finance.addIncome') || 'Add Income'}</DialogTitle>
                        <DialogDescription>
                            {t('finance.addIncomeDescription') || 'Record a new income entry'}
                        </DialogDescription>
                    </DialogHeader>
                    {renderEntryForm(handleCreate, createEntry.isPending)}
                </DialogContent>
            </Dialog>

            <FilterPanel title={t('common.filters') || 'Search & Filter'}>
                <div className="flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[200px]">
                        <Label className="text-xs text-muted-foreground mb-1 block">
                            {t('common.search') || 'Search'}
                        </Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t('common.search') || 'Search...'}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>
                    <div className="min-w-[150px]">
                        <Label className="text-xs text-muted-foreground mb-1 block">
                            <Calendar className="inline h-3 w-3 mr-1" />
                            {t('common.from') || 'From'}
                        </Label>
                        <CalendarDatePicker date={dateFrom ? new Date(dateFrom) : undefined} onDateChange={(date) => setDateFrom(date ? date.toISOString().split("T")[0] : "")} />
                    </div>
                    <div className="min-w-[150px]">
                        <Label className="text-xs text-muted-foreground mb-1 block">
                            <Calendar className="inline h-3 w-3 mr-1" />
                            {t('common.to') || 'To'}
                        </Label>
                        <CalendarDatePicker date={dateTo ? new Date(dateTo) : undefined} onDateChange={(date) => setDateTo(date ? date.toISOString().split("T")[0] : "")} />
                    </div>
                    <div className="min-w-[160px]">
                        <Label className="text-xs text-muted-foreground mb-1 block">
                            <Filter className="inline h-3 w-3 mr-1" />
                            {t('finance.category') || 'Category'}
                        </Label>
                        <Select value={filterCategory} onValueChange={setFilterCategory}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('common.all') || 'All'} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('common.all') || 'All'}</SelectItem>
                                {categories?.map((category) => (
                                    <SelectItem key={category.id} value={category.id}>
                                        {category.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="min-w-[160px]">
                        <Label className="text-xs text-muted-foreground mb-1 block">
                            {t('finance.account') || 'Account'}
                        </Label>
                        <Select value={filterAccount} onValueChange={setFilterAccount}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('common.all') || 'All'} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('common.all') || 'All'}</SelectItem>
                                {accounts?.map((account) => (
                                    <SelectItem key={account.id} value={account.id}>
                                        {account.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {hasActiveFilters && (
                        <Button variant="outline" size="sm" onClick={clearFilters}>
                            <X className="h-4 w-4 mr-1" />
                            {t('common.clearFilters') || 'Clear'}
                        </Button>
                    )}
                </div>
            </FilterPanel>

            {/* Currency Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(totalsByCurrency).map(([currencyId, data]) => (
                    <Card key={currencyId}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <DollarSign className="h-4 w-4" />
                                {data.currency.code}
                            </CardTitle>
                            <div className="mt-2">
                                <div className="text-2xl font-bold text-green-600">
                                    {formatCurrencyAmount(data.amount, data.currency)}
                                </div>
                                {baseCurrency && currencyId !== baseCurrency.id && convertedTotals[currencyId] && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                        ≈ {formatCurrencyAmount(convertedTotals[currencyId], baseCurrency)}
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                    </Card>
                ))}
            </div>

            {/* Total in Base Currency */}
            {baseCurrency && (
                <Card>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-green-500" />
                                {t('finance.totalIncome') || 'Total Income'} ({baseCurrency.code})
                            </CardTitle>
                            <span className="text-2xl font-bold text-green-600">
                                {isConverting ? (
                                    <LoadingSpinner size="sm" />
                                ) : (
                                    formatCurrencyAmount(totalIncomeInBaseCurrency, baseCurrency)
                                )}
                            </span>
                        </div>
                        <CardDescription>
                            {filteredEntries.length} {t('finance.entriesFound') || 'entries found'}
                            {Object.keys(totalsByCurrency).length > 1 && (
                                <span className="ml-2">
                                    ({Object.keys(totalsByCurrency).length} {t('finance.currencies') || 'currencies'})
                                </span>
                            )}
                        </CardDescription>
                    </CardHeader>
                </Card>
            )}

            {/* Entries Table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('common.date') || 'Date'}</TableHead>
                                <TableHead>{t('finance.category') || 'Category'}</TableHead>
                                <TableHead>{t('finance.account') || 'Account'}</TableHead>
                                <TableHead>{t('finance.donor') || 'Donor'}</TableHead>
                                <TableHead>{t('finance.project') || 'Project'}</TableHead>
                                <TableHead>{t('finance.currency') || 'Currency'}</TableHead>
                                <TableHead className="text-right">{t('finance.amount') || 'Amount'}</TableHead>
                                <TableHead className="text-right">{t('common.actions') || 'Actions'}</TableHead>
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
                                            {entry.incomeCategory?.name || '-'}
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
                                        {entry.donor?.name ? (
                                            <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400">
                                                {entry.donor.name}
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
                                    <TableCell>
                                        <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400">
                                            {entry.currency?.code || baseCurrency?.code || 'N/A'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant="outline" className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 font-semibold">
                                            +{formatCurrencyAmount(entry.amount, entry.currency || baseCurrency)}
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
                                        {t('finance.noIncome') || 'No income entries found'}
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
                        <DialogTitle>{t('finance.editIncome') || 'Edit Income'}</DialogTitle>
                        <DialogDescription>
                            {t('finance.editIncomeDescription') || 'Update income entry details'}
                        </DialogDescription>
                    </DialogHeader>
                    {renderEntryForm(handleUpdate, updateEntry.isPending)}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('common.confirmDelete') || 'Confirm Delete'}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('finance.deleteEntryWarning') || 'Are you sure you want to delete this entry? This action cannot be undone.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel') || 'Cancel'}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                            {t('common.delete') || 'Delete'}
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
                                <SheetTitle>{t('finance.entryDetails') || 'Income Entry Details'}</SheetTitle>
                                <SheetDescription>
                                    {t('finance.viewEntryDetails') || 'View detailed information about this income entry'}
                                </SheetDescription>
                            </SheetHeader>

                            <div className="mt-6 space-y-6">
                                {/* Entry Information */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold">{t('finance.entryInformation') || 'Entry Information'}</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">{t('finance.amount') || 'Amount'}</p>
                                            <p className="text-lg font-semibold text-green-600">
                                                +{formatCurrencyAmount(viewingEntry.amount, viewingEntry.currency || baseCurrency)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">{t('common.date') || 'Date'}</p>
                                            <p className="text-sm font-medium">{formatDate(viewingEntry.date)}</p>
                                        </div>
                                        {viewingEntry.referenceNo && (
                                            <div>
                                                <p className="text-sm font-medium text-muted-foreground">{t('finance.referenceNo') || 'Reference No.'}</p>
                                                <p className="text-sm font-medium">{viewingEntry.referenceNo}</p>
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">{t('finance.paymentMethod') || 'Payment Method'}</p>
                                            <Badge variant="outline" className="mt-1">
                                                {viewingEntry.paymentMethod.replace('_', ' ').toUpperCase()}
                                            </Badge>
                                        </div>
                                    </div>
                                    {viewingEntry.description && (
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">{t('common.description') || 'Description'}</p>
                                            <p className="text-sm mt-1">{viewingEntry.description}</p>
                                        </div>
                                    )}
                                </div>

                                <Separator />

                                {/* Account Information */}
                                {viewingEntry.account && (
                                    <>
                                        <div className="space-y-4">
                                            <h3 className="text-lg font-semibold">{t('finance.accountInformation') || 'Account Information'}</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-sm font-medium text-muted-foreground">{t('finance.accountName') || 'Account Name'}</p>
                                                    <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 mt-1">
                                                        {viewingEntry.account.name}
                                                    </Badge>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-muted-foreground">{t('finance.accountType') || 'Account Type'}</p>
                                                    <Badge 
                                                        variant="outline"
                                                        className={
                                                            viewingEntry.account.type === 'cash'
                                                                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 mt-1'
                                                                : 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400 mt-1'
                                                        }
                                                    >
                                                        {viewingEntry.account.type === 'cash' ? t('finance.cash') || 'Cash' : t('finance.fund') || 'Fund'}
                                                    </Badge>
                                                </div>
                                                <div className="col-span-2">
                                                    <p className="text-sm font-medium text-muted-foreground">{t('finance.currentBalance') || 'Current Balance'}</p>
                                                    <p className="text-2xl font-bold text-emerald-600 mt-1">
                                                        {formatCurrencyAmount(viewingEntry.account.currentBalance, viewingEntry.account.currency || baseCurrency)}
                                                    </p>
                                                </div>
                                                {viewingEntry.account.code && (
                                                    <div>
                                                        <p className="text-sm font-medium text-muted-foreground">{t('finance.accountCode') || 'Account Code'}</p>
                                                        <p className="text-sm font-medium">{viewingEntry.account.code}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <Separator />
                                    </>
                                )}

                                {/* Category Information */}
                                {viewingEntry.incomeCategory && (
                                    <>
                                        <div className="space-y-4">
                                            <h3 className="text-lg font-semibold">{t('finance.categoryInformation') || 'Category Information'}</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-sm font-medium text-muted-foreground">{t('finance.category') || 'Category'}</p>
                                                    <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 mt-1">
                                                        {viewingEntry.incomeCategory.name}
                                                    </Badge>
                                                </div>
                                                {viewingEntry.incomeCategory.code && (
                                                    <div>
                                                        <p className="text-sm font-medium text-muted-foreground">{t('finance.categoryCode') || 'Category Code'}</p>
                                                        <p className="text-sm font-medium">{viewingEntry.incomeCategory.code}</p>
                                                    </div>
                                                )}
                                                {viewingEntry.incomeCategory.description && (
                                                    <div className="col-span-2">
                                                        <p className="text-sm font-medium text-muted-foreground">{t('common.description') || 'Description'}</p>
                                                        <p className="text-sm mt-1">{viewingEntry.incomeCategory.description}</p>
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
                                            <h3 className="text-lg font-semibold">{t('finance.projectInformation') || 'Project Information'}</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-sm font-medium text-muted-foreground">{t('finance.project') || 'Project'}</p>
                                                    <Badge variant="outline" className="bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400 mt-1">
                                                        {viewingEntry.project.name}
                                                    </Badge>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-muted-foreground">{t('common.status') || 'Status'}</p>
                                                    <Badge variant="outline" className="mt-1 capitalize">
                                                        {viewingEntry.project.status}
                                                    </Badge>
                                                </div>
                                                {viewingEntry.project.budgetAmount && (
                                                    <div>
                                                        <p className="text-sm font-medium text-muted-foreground">{t('finance.budgetAmount') || 'Budget Amount'}</p>
                                                        <p className="text-sm font-medium">
                                                            {formatCurrencyAmount(viewingEntry.project.budgetAmount, viewingEntry.project.currency || baseCurrency)}
                                                        </p>
                                                    </div>
                                                )}
                                                {viewingEntry.project.balance !== undefined && (
                                                    <div>
                                                        <p className="text-sm font-medium text-muted-foreground">{t('finance.projectBalance') || 'Project Balance'}</p>
                                                        <p className="text-sm font-medium">
                                                            {formatCurrencyAmount(viewingEntry.project.balance, viewingEntry.project.currency || baseCurrency)}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <Separator />
                                    </>
                                )}

                                {/* Donor Information */}
                                {viewingEntry.donor && (
                                    <>
                                        <div className="space-y-4">
                                            <h3 className="text-lg font-semibold">{t('finance.donorInformation') || 'Donor Information'}</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-sm font-medium text-muted-foreground">{t('finance.donor') || 'Donor'}</p>
                                                    <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400 mt-1">
                                                        {viewingEntry.donor.name}
                                                    </Badge>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-muted-foreground">{t('finance.donorType') || 'Donor Type'}</p>
                                                    <Badge variant="outline" className="mt-1 capitalize">
                                                        {viewingEntry.donor.type}
                                                    </Badge>
                                                </div>
                                                {viewingEntry.donor.phone && (
                                                    <div>
                                                        <p className="text-sm font-medium text-muted-foreground">{t('common.phone') || 'Phone'}</p>
                                                        <p className="text-sm font-medium">{viewingEntry.donor.phone}</p>
                                                    </div>
                                                )}
                                                {viewingEntry.donor.email && (
                                                    <div>
                                                        <p className="text-sm font-medium text-muted-foreground">{t('common.email') || 'Email'}</p>
                                                        <p className="text-sm font-medium">{viewingEntry.donor.email}</p>
                                                    </div>
                                                )}
                                                {viewingEntry.donor.totalDonated !== undefined && (
                                                    <div>
                                                        <p className="text-sm font-medium text-muted-foreground">{t('finance.totalDonated') || 'Total Donated'}</p>
                                                        <p className="text-sm font-medium">{formatCurrency(viewingEntry.donor.totalDonated)}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <Separator />
                                    </>
                                )}

                                {/* Currency Information */}
                                {(viewingEntry.currency || baseCurrency) && (
                                    <>
                                        <div className="space-y-4">
                                            <h3 className="text-lg font-semibold">{t('finance.currencyInformation') || 'Currency Information'}</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-sm font-medium text-muted-foreground">{t('finance.currency') || 'Currency'}</p>
                                                    <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 mt-1">
                                                        {(viewingEntry.currency || baseCurrency)?.code || 'N/A'}
                                                    </Badge>
                                                </div>
                                                {(viewingEntry.currency || baseCurrency)?.symbol && (
                                                    <div>
                                                        <p className="text-sm font-medium text-muted-foreground">{t('finance.currencySymbol') || 'Symbol'}</p>
                                                        <p className="text-sm font-medium">{(viewingEntry.currency || baseCurrency)?.symbol}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <Separator />
                                    </>
                                )}

                                {/* Metadata */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold">{t('common.metadata') || 'Metadata'}</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {viewingEntry.createdAt && (
                                            <div>
                                                <p className="text-sm font-medium text-muted-foreground">{t('common.createdAt') || 'Created At'}</p>
                                                <p className="text-sm">{formatDate(viewingEntry.createdAt)}</p>
                                            </div>
                                        )}
                                        {viewingEntry.updatedAt && (
                                            <div>
                                                <p className="text-sm font-medium text-muted-foreground">{t('common.updatedAt') || 'Updated At'}</p>
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

