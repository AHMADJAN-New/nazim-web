/**
 * Finance Accounts Page - Manage cash locations
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
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
    useFinanceAccounts,
    useCreateFinanceAccount,
    useUpdateFinanceAccount,
    useDeleteFinanceAccount,
    type FinanceAccount,
    type FinanceAccountFormData,
} from '@/hooks/useFinance';
import { useLanguage } from '@/hooks/useLanguage';
import { LoadingSpinner } from '@/components/ui/loading';
import { Plus, Pencil, Trash2, Wallet } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function FinanceAccounts() {
    const { t } = useLanguage();
    const { data: accounts, isLoading } = useFinanceAccounts();
    const createAccount = useCreateFinanceAccount();
    const updateAccount = useUpdateFinanceAccount();
    const deleteAccount = useDeleteFinanceAccount();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editAccount, setEditAccount] = useState<FinanceAccount | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const [formData, setFormData] = useState<FinanceAccountFormData>({
        name: '',
        code: '',
        type: 'cash',
        description: '',
        openingBalance: 0,
        isActive: true,
    });

    const resetForm = () => {
        setFormData({
            name: '',
            code: '',
            type: 'cash',
            description: '',
            openingBalance: 0,
            isActive: true,
        });
    };

    const handleCreate = async () => {
        await createAccount.mutateAsync(formData);
        setIsCreateOpen(false);
        resetForm();
    };

    const handleUpdate = async () => {
        if (!editAccount) return;
        await updateAccount.mutateAsync({ id: editAccount.id, ...formData });
        setEditAccount(null);
        resetForm();
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        await deleteAccount.mutateAsync(deleteId);
        setDeleteId(null);
    };

    const openEditDialog = (account: FinanceAccount) => {
        setEditAccount(account);
        setFormData({
            name: account.name,
            code: account.code || '',
            type: account.type,
            description: account.description || '',
            openingBalance: account.openingBalance,
            isActive: account.isActive,
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <LoadingSpinner />
            </div>
        );
    }

    const AccountForm = ({ onSubmit, isLoading: loading }: { onSubmit: () => void; isLoading: boolean }) => (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="name">{t('common.name') || 'Name'} *</Label>
                    <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder={t('finance.accountNamePlaceholder') || 'e.g., Main Cash Box'}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="code">{t('common.code') || 'Code'}</Label>
                    <Input
                        id="code"
                        value={formData.code || ''}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        placeholder={t('finance.accountCodePlaceholder') || 'e.g., MAIN_CASH'}
                    />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="type">{t('common.type') || 'Type'}</Label>
                    <Select
                        value={formData.type}
                        onValueChange={(value: 'cash' | 'fund') => setFormData({ ...formData, type: value })}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="cash">{t('finance.cash') || 'Cash'}</SelectItem>
                            <SelectItem value="fund">{t('finance.fund') || 'Fund'}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="openingBalance">{t('finance.openingBalance') || 'Opening Balance'}</Label>
                    <Input
                        id="openingBalance"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.openingBalance}
                        onChange={(e) => setFormData({ ...formData, openingBalance: parseFloat(e.target.value) || 0 })}
                    />
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="description">{t('common.description') || 'Description'}</Label>
                <Textarea
                    id="description"
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={t('finance.accountDescriptionPlaceholder') || 'Description of this account...'}
                />
            </div>
            <div className="flex items-center space-x-2">
                <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">{t('common.active') || 'Active'}</Label>
            </div>
            <DialogFooter>
                <Button onClick={onSubmit} disabled={loading || !formData.name}>
                    {loading ? <LoadingSpinner className="mr-2 h-4 w-4" /> : null}
                    {editAccount ? t('common.update') || 'Update' : t('common.create') || 'Create'}
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
                        {t('finance.accounts') || 'Finance Accounts'}
                    </h1>
                    <p className="text-muted-foreground">
                        {t('finance.accountsDescription') || 'Manage your cash locations and funds'}
                    </p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            {t('finance.addAccount') || 'Add Account'}
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t('finance.addAccount') || 'Add Account'}</DialogTitle>
                            <DialogDescription>
                                {t('finance.addAccountDescription') || 'Create a new cash location or fund'}
                            </DialogDescription>
                        </DialogHeader>
                        <AccountForm onSubmit={handleCreate} isLoading={createAccount.isPending} />
                    </DialogContent>
                </Dialog>
            </div>

            {/* Accounts Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Wallet className="h-5 w-5" />
                        {t('finance.allAccounts') || 'All Accounts'}
                    </CardTitle>
                    <CardDescription>
                        {accounts?.length || 0} {t('finance.accountsFound') || 'accounts found'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('common.name') || 'Name'}</TableHead>
                                <TableHead>{t('common.code') || 'Code'}</TableHead>
                                <TableHead>{t('common.type') || 'Type'}</TableHead>
                                <TableHead className="text-right">{t('finance.openingBalance') || 'Opening Balance'}</TableHead>
                                <TableHead className="text-right">{t('finance.currentBalance') || 'Current Balance'}</TableHead>
                                <TableHead>{t('common.status') || 'Status'}</TableHead>
                                <TableHead className="text-right">{t('common.actions') || 'Actions'}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {accounts?.map((account) => (
                                <TableRow key={account.id}>
                                    <TableCell className="font-medium">{account.name}</TableCell>
                                    <TableCell>{account.code || '-'}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">
                                            {account.type === 'cash' ? t('finance.cash') || 'Cash' : t('finance.fund') || 'Fund'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">{formatCurrency(account.openingBalance)}</TableCell>
                                    <TableCell className="text-right font-medium">
                                        {formatCurrency(account.currentBalance)}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={account.isActive ? 'default' : 'secondary'}>
                                            {account.isActive ? t('common.active') || 'Active' : t('common.inactive') || 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => openEditDialog(account)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setDeleteId(account.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {(!accounts || accounts.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        {t('finance.noAccounts') || 'No accounts found'}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={!!editAccount} onOpenChange={(open) => { if (!open) { setEditAccount(null); resetForm(); } }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('finance.editAccount') || 'Edit Account'}</DialogTitle>
                        <DialogDescription>
                            {t('finance.editAccountDescription') || 'Update account details'}
                        </DialogDescription>
                    </DialogHeader>
                    <AccountForm onSubmit={handleUpdate} isLoading={updateAccount.isPending} />
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('common.confirmDelete') || 'Confirm Delete'}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('finance.deleteAccountWarning') || 'Are you sure you want to delete this account? This action cannot be undone.'}
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
