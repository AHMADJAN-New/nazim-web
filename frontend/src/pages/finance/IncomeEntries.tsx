/**
 * Income Entries Page - View and manage income records
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
import { LoadingSpinner } from '@/components/ui/loading';
import { Plus, Pencil, Trash2, TrendingUp, Search, Filter } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function IncomeEntries() {
    const { t } = useLanguage();
    const { data: entries, isLoading } = useIncomeEntries();
    const { data: accounts } = useFinanceAccounts();
    const { data: categories } = useIncomeCategories();
    const { data: projects } = useFinanceProjects();
    const { data: donors } = useDonors();
    const createEntry = useCreateIncomeEntry();
    const updateEntry = useUpdateIncomeEntry();
    const deleteEntry = useDeleteIncomeEntry();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editEntry, setEditEntry] = useState<IncomeEntry | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('all');

    const [formData, setFormData] = useState<IncomeEntryFormData>({
        accountId: '',
        incomeCategoryId: '',
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
            return matchesSearch && matchesCategory;
        });
    }, [entries, searchTerm, filterCategory]);

    const totalIncome = useMemo(() => {
        return filteredEntries.reduce((sum, entry) => sum + entry.amount, 0);
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
    const activeDonors = donors?.filter(d => d.isActive) || [];

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
            <div className="grid grid-cols-2 gap-4">
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
                        onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
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
                <Button onClick={onSubmit} disabled={loading || !formData.accountId || !formData.incomeCategoryId || formData.amount <= 0}>
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
                        {t('finance.incomeEntries') || 'Income Entries'}
                    </h1>
                    <p className="text-muted-foreground">
                        {t('finance.incomeEntriesDescription') || 'Record and manage income'}
                    </p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            {t('finance.addIncome') || 'Add Income'}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>{t('finance.addIncome') || 'Add Income'}</DialogTitle>
                            <DialogDescription>
                                {t('finance.addIncomeDescription') || 'Record a new income entry'}
                            </DialogDescription>
                        </DialogHeader>
                        <EntryForm onSubmit={handleCreate} isLoading={createEntry.isPending} />
                    </DialogContent>
                </Dialog>
            </div>

            {/* Filters */}
            <div className="flex gap-4 items-center">
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
                </div>
            </div>

            {/* Summary Card */}
            <Card>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-green-500" />
                            {t('finance.totalIncome') || 'Total Income'}
                        </CardTitle>
                        <span className="text-2xl font-bold text-green-600">
                            {formatCurrency(totalIncome)}
                        </span>
                    </div>
                    <CardDescription>
                        {filteredEntries.length} {t('finance.entriesFound') || 'entries found'}
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
                                <TableHead>{t('finance.donor') || 'Donor'}</TableHead>
                                <TableHead>{t('finance.project') || 'Project'}</TableHead>
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
                                            {entry.incomeCategory?.name || '-'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{entry.account?.name || '-'}</TableCell>
                                    <TableCell>{entry.donor?.name || '-'}</TableCell>
                                    <TableCell>{entry.project?.name || '-'}</TableCell>
                                    <TableCell className="text-right font-medium text-green-600">
                                        +{formatCurrency(entry.amount)}
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
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
