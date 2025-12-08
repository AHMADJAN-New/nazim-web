/**
 * Expense Entries Page - View and manage expense records
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
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
import { LoadingSpinner } from '@/components/ui/loading';
import { Plus, Pencil, Trash2, TrendingDown, Search, Filter } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function ExpenseEntries() {
    const { t } = useLanguage();
    const { data: entries, isLoading } = useExpenseEntries();
    const { data: accounts } = useFinanceAccounts();
    const { data: categories } = useExpenseCategories();
    const { data: projects } = useFinanceProjects();
    const createEntry = useCreateExpenseEntry();
    const updateEntry = useUpdateExpenseEntry();
    const deleteEntry = useDeleteExpenseEntry();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editEntry, setEditEntry] = useState<ExpenseEntry | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');

    const [formData, setFormData] = useState<ExpenseEntryFormData>({
        accountId: '',
        expenseCategoryId: '',
        projectId: null,
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        referenceNo: '',
        description: '',
        paidTo: '',
        status: 'approved',
    });

    const resetForm = () => {
        setFormData({
            accountId: '',
            expenseCategoryId: '',
            projectId: null,
            amount: 0,
            date: new Date().toISOString().split('T')[0],
            referenceNo: '',
            description: '',
            paidTo: '',
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
            const matchesStatus = filterStatus === 'all' || entry.status === filterStatus;
            return matchesSearch && matchesCategory && matchesStatus;
        });
    }, [entries, searchTerm, filterCategory, filterStatus]);

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
                return <Badge variant="default">{t('finance.approved') || 'Approved'}</Badge>;
            case 'pending':
                return <Badge variant="secondary">{t('finance.pending') || 'Pending'}</Badge>;
            case 'rejected':
                return <Badge variant="destructive">{t('finance.rejected') || 'Rejected'}</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const EntryForm = ({ onSubmit, isLoading: loading }: { onSubmit: () => void; isLoading: boolean }) => (
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
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
                                    {account.name} ({formatCurrency(account.currentBalance)})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="expenseCategoryId">{t('finance.category') || 'Category'} *</Label>
                    <Select
                        value={formData.expenseCategoryId}
                        onValueChange={(value) => setFormData({ ...formData, expenseCategoryId: value })}
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
            <div className="grid grid-cols-2 gap-4">
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
                    <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
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
                    <Label htmlFor="paidTo">{t('finance.paidTo') || 'Paid To'}</Label>
                    <Input
                        id="paidTo"
                        value={formData.paidTo || ''}
                        onChange={(e) => setFormData({ ...formData, paidTo: e.target.value })}
                        placeholder={t('finance.paidToPlaceholder') || 'Person or vendor name...'}
                    />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="referenceNo">{t('finance.referenceNo') || 'Reference No.'}</Label>
                    <Input
                        id="referenceNo"
                        value={formData.referenceNo || ''}
                        onChange={(e) => setFormData({ ...formData, referenceNo: e.target.value })}
                        placeholder={t('finance.voucherNoPlaceholder') || 'Voucher/Bill number...'}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="status">{t('common.status') || 'Status'}</Label>
                    <Select
                        value={formData.status}
                        onValueChange={(value: 'pending' | 'approved' | 'rejected') => setFormData({ ...formData, status: value })}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="approved">{t('finance.approved') || 'Approved'}</SelectItem>
                            <SelectItem value="pending">{t('finance.pending') || 'Pending'}</SelectItem>
                            <SelectItem value="rejected">{t('finance.rejected') || 'Rejected'}</SelectItem>
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
                    placeholder={t('finance.expenseDescriptionPlaceholder') || 'e.g., Monthly electricity bill'}
                />
            </div>
            <DialogFooter>
                <Button onClick={onSubmit} disabled={loading || !formData.accountId || !formData.expenseCategoryId || formData.amount <= 0}>
                    {loading ? <LoadingSpinner className="mr-2 h-4 w-4" /> : null}
                    {editEntry ? t('common.update') || 'Update' : t('common.create') || 'Create'}
                </Button>
            </DialogFooter>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {t('finance.expenseEntries') || 'Expense Entries'}
                    </h1>
                    <p className="text-muted-foreground">
                        {t('finance.expenseEntriesDescription') || 'Record and manage expenses'}
                    </p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            {t('finance.addExpense') || 'Add Expense'}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>{t('finance.addExpense') || 'Add Expense'}</DialogTitle>
                            <DialogDescription>
                                {t('finance.addExpenseDescription') || 'Record a new expense entry'}
                            </DialogDescription>
                        </DialogHeader>
                        <EntryForm onSubmit={handleCreate} isLoading={createEntry.isPending} />
                    </DialogContent>
                </Dialog>
            </div>

            {/* Filters */}
            <div className="flex gap-4 items-center flex-wrap">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t('common.search') || 'Search...'}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder={t('finance.filterByCategory') || 'Filter by category'} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('common.all') || 'All Categories'}</SelectItem>
                            {categories?.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                    {category.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder={t('finance.filterByStatus') || 'Filter by status'} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('common.all') || 'All Statuses'}</SelectItem>
                            <SelectItem value="approved">{t('finance.approved') || 'Approved'}</SelectItem>
                            <SelectItem value="pending">{t('finance.pending') || 'Pending'}</SelectItem>
                            <SelectItem value="rejected">{t('finance.rejected') || 'Rejected'}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Summary Card */}
            <Card>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <TrendingDown className="h-5 w-5 text-red-500" />
                            {t('finance.totalExpenses') || 'Total Expenses'}
                        </CardTitle>
                        <span className="text-2xl font-bold text-red-600">
                            {formatCurrency(totalExpense)}
                        </span>
                    </div>
                    <CardDescription>
                        {filteredEntries.length} {t('finance.entriesFound') || 'entries found'} ({t('finance.approvedOnly') || 'approved only'})
                    </CardDescription>
                </CardHeader>
            </Card>

            {/* Entries Table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('common.date') || 'Date'}</TableHead>
                                <TableHead>{t('finance.category') || 'Category'}</TableHead>
                                <TableHead>{t('finance.account') || 'Account'}</TableHead>
                                <TableHead>{t('finance.paidTo') || 'Paid To'}</TableHead>
                                <TableHead>{t('finance.project') || 'Project'}</TableHead>
                                <TableHead>{t('common.status') || 'Status'}</TableHead>
                                <TableHead className="text-right">{t('finance.amount') || 'Amount'}</TableHead>
                                <TableHead className="text-right">{t('common.actions') || 'Actions'}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredEntries.map((entry) => (
                                <TableRow key={entry.id}>
                                    <TableCell>{formatDate(entry.date)}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">
                                            {entry.expenseCategory?.name || '-'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{entry.account?.name || '-'}</TableCell>
                                    <TableCell>{entry.paidTo || '-'}</TableCell>
                                    <TableCell>{entry.project?.name || '-'}</TableCell>
                                    <TableCell>{getStatusBadge(entry.status)}</TableCell>
                                    <TableCell className="text-right font-medium text-red-600">
                                        -{formatCurrency(entry.amount)}
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
                                        {t('finance.noExpenses') || 'No expense entries found'}
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
                        <DialogTitle>{t('finance.editExpense') || 'Edit Expense'}</DialogTitle>
                        <DialogDescription>
                            {t('finance.editExpenseDescription') || 'Update expense entry details'}
                        </DialogDescription>
                    </DialogHeader>
                    <EntryForm onSubmit={handleUpdate} isLoading={updateEntry.isPending} />
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
        </div>
    );
}
