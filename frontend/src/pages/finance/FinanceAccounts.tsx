/**
 * Finance Accounts Page - Manage cash locations
 */

import { Plus, Pencil, Trash2, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

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
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useCurrencies } from '@/hooks/useCurrencies';
import {
    useFinanceAccounts,
    useCreateFinanceAccount,
    useUpdateFinanceAccount,
    useDeleteFinanceAccount,
    useAccountTransactions,
    type FinanceAccount,
    type FinanceAccountFormData,
} from '@/hooks/useFinance';
import { useLanguage } from '@/hooks/useLanguage';
import { formatDate, formatCurrency } from '@/lib/utils';

export default function FinanceAccounts() {
    const { t } = useLanguage();
    const [searchParams, setSearchParams] = useSearchParams();
    const { data: accounts, isLoading } = useFinanceAccounts();
    const { data: currencies } = useCurrencies({ isActive: true });
    const createAccount = useCreateFinanceAccount();
    const updateAccount = useUpdateFinanceAccount();
    const deleteAccount = useDeleteFinanceAccount();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editAccount, setEditAccount] = useState<FinanceAccount | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [selectedAccount, setSelectedAccount] = useState<FinanceAccount | null>(null);
    const [sidePanelOpen, setSidePanelOpen] = useState(false);

    const [formData, setFormData] = useState<FinanceAccountFormData>({
        name: '',
        code: '',
        type: 'cash',
        currencyId: '',
        description: '',
        openingBalance: 0,
        isActive: true,
    });

    const resetForm = () => {
        setFormData({
            name: '',
            code: '',
            type: 'cash',
            currencyId: '',
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
            currencyId: account.currencyId || '',
            description: account.description || '',
            openingBalance: account.openingBalance,
            isActive: account.isActive,
        });
    };

    const handleRowClick = (account: FinanceAccount) => {
        setSelectedAccount(account);
        setSidePanelOpen(true);
    };

    // Check for view query param and auto-open side panel
    useEffect(() => {
        const viewAccountId = searchParams.get('view');
        if (viewAccountId && accounts && accounts.length > 0) {
            const account = accounts.find(a => a.id === viewAccountId);
            if (account) {
                setSelectedAccount(account);
                setSidePanelOpen(true);
                // Clean up URL
                setSearchParams({}, { replace: true });
            }
        }
    }, [searchParams, accounts, setSearchParams]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <LoadingSpinner />
            </div>
        );
    }

    const renderAccountForm = (onSubmit: () => void, loading: boolean) => (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                onSubmit();
            }}
            className="space-y-4"
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <Label htmlFor="currencyId">{t('finance.currency') || 'Currency'}</Label>
                    <Select
                        value={formData.currencyId || ''}
                        onValueChange={(value) => setFormData({ ...formData, currencyId: value })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder={t('finance.selectCurrency') || 'Select currency'} />
                        </SelectTrigger>
                        <SelectContent>
                            {currencies?.map((currency) => (
                                <SelectItem key={currency.id} value={currency.id}>
                                    {currency.code} - {currency.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <Button type="submit" disabled={loading || !formData.name.trim()}>
                    {editAccount ? t('common.update') || 'Update' : t('common.create') || 'Create'}
                </Button>
            </DialogFooter>
        </form>
    );

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
            <PageHeader
                title={t('finance.accounts') || 'Finance Accounts'}
                description={t('finance.accountsDescription') || 'Manage your cash locations and funds'}
                primaryAction={{
                    label: t('finance.addAccount') || 'Add Account',
                    onClick: () => setIsCreateOpen(true),
                    icon: <Plus className="h-4 w-4" />,
                }}
                rightSlot={
                    <ReportExportButtons
                        data={accounts || []}
                        columns={[
                            { key: 'name', label: t('common.name'), align: 'left' },
                            { key: 'code', label: t('common.code'), align: 'left' },
                            { key: 'type', label: t('common.type'), align: 'left' },
                            { key: 'openingBalance', label: t('finance.openingBalance'), align: 'right' },
                            { key: 'currentBalance', label: t('finance.currentBalance'), align: 'right' },
                            { key: 'isActive', label: t('common.status'), align: 'center' },
                        ]}
                        reportKey="finance_accounts"
                        title={t('finance.accounts') || 'Finance Accounts'}
                        transformData={(data) =>
                            data.map((account) => ({
                                name: account.name,
                                code: account.code || '-',
                                type: account.type === 'cash' ? t('finance.cash') || 'Cash' : t('finance.fund') || 'Fund',
                                openingBalance: formatCurrency(account.openingBalance),
                                currentBalance: formatCurrency(account.currentBalance),
                                isActive: account.isActive ? t('common.active') || 'Active' : t('common.inactive') || 'Inactive',
                            }))
                        }
                        templateType="finance_accounts"
                        disabled={isLoading || !accounts || accounts.length === 0}
                    />
                }
            />

            <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('finance.addAccount') || 'Add Account'}</DialogTitle>
                        <DialogDescription>
                            {t('finance.addAccountDescription') || 'Create a new cash location or fund'}
                        </DialogDescription>
                    </DialogHeader>
                    {renderAccountForm(handleCreate, createAccount.isPending)}
                </DialogContent>
            </Dialog>

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
                                <TableRow 
                                    key={account.id}
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => handleRowClick(account)}
                                >
                                    <TableCell className="font-medium">{account.name}</TableCell>
                                    <TableCell>
                                        {account.code ? (
                                            <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400">
                                                {account.code}
                                            </Badge>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge 
                                            variant="outline"
                                            className={
                                                account.type === 'cash' 
                                                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                                                    : 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400'
                                            }
                                        >
                                            {account.type === 'cash' ? t('finance.cash') || 'Cash' : t('finance.fund') || 'Fund'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant="outline" className="bg-slate-50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 font-medium">
                                            {formatCurrency(account.openingBalance)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Badge 
                                            variant="outline" 
                                            className={`font-semibold ${
                                                account.currentBalance >= 0
                                                    ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                                                    : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                                            }`}
                                        >
                                            {formatCurrency(account.currentBalance)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge 
                                            variant={account.isActive ? 'default' : 'secondary'}
                                            className={
                                                account.isActive
                                                    ? 'bg-green-500 hover:bg-green-600 text-white border-0'
                                                    : 'bg-gray-500 hover:bg-gray-600 text-white border-0'
                                            }
                                        >
                                            {account.isActive ? t('common.active') || 'Active' : t('common.inactive') || 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
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
                    {renderAccountForm(handleUpdate, updateAccount.isPending)}
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

            {/* Side Panel for Account Details */}
            <AccountDetailsPanel
                account={selectedAccount}
                open={sidePanelOpen}
                onOpenChange={setSidePanelOpen}
                onEdit={(account) => {
                    setSidePanelOpen(false);
                    openEditDialog(account);
                }}
                onDelete={(accountId) => {
                    setSidePanelOpen(false);
                    setDeleteId(accountId);
                }}
            />
        </div>
    );
}

// Account Details Panel Component
interface AccountDetailsPanelProps {
    account: FinanceAccount | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onEdit: (account: FinanceAccount) => void;
    onDelete: (accountId: string) => void;
}

function AccountDetailsPanel({ account, open, onOpenChange, onEdit, onDelete }: AccountDetailsPanelProps) {
    const { t } = useLanguage();
    const transactions = useAccountTransactions(account?.id);

    if (!account) return null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>{t('finance.accountDetails') || 'Account Details'}</SheetTitle>
                    <SheetDescription>
                        {t('finance.viewAccountDetails') || 'View detailed information about this account'}
                    </SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                    {/* Account Information */}
                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold">{t('finance.accountInformation') || 'Account Information'}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('common.name') || 'Name'}</p>
                                <p className="font-medium">{account.name}</p>
                            </div>
                            {account.code && (
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('common.code') || 'Code'}</p>
                                    <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400">
                                        {account.code}
                                    </Badge>
                                </div>
                            )}
                            <div>
                                <p className="text-sm text-muted-foreground">{t('common.type') || 'Type'}</p>
                                <Badge 
                                    variant="outline"
                                    className={
                                        account.type === 'cash' 
                                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                                            : 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400'
                                    }
                                >
                                    {account.type === 'cash' ? t('finance.cash') || 'Cash' : t('finance.fund') || 'Fund'}
                                </Badge>
                            </div>
                            {account.currency && (
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('finance.currency') || 'Currency'}</p>
                                    <p className="font-medium">{account.currency.code} - {account.currency.name}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-sm text-muted-foreground">{t('finance.openingBalance') || 'Opening Balance'}</p>
                                <p className="font-medium">{formatCurrency(account.openingBalance)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">{t('finance.currentBalance') || 'Current Balance'}</p>
                                <Badge 
                                    variant="outline" 
                                    className={`font-semibold ${
                                        account.currentBalance >= 0
                                            ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                                            : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                                    }`}
                                >
                                    {formatCurrency(account.currentBalance)}
                                </Badge>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">{t('common.status') || 'Status'}</p>
                                <Badge 
                                    variant={account.isActive ? 'default' : 'secondary'}
                                    className={
                                        account.isActive
                                            ? 'bg-green-500 hover:bg-green-600 text-white border-0'
                                            : 'bg-gray-500 hover:bg-gray-600 text-white border-0'
                                    }
                                >
                                    {account.isActive ? t('common.active') || 'Active' : t('common.inactive') || 'Inactive'}
                                </Badge>
                            </div>
                        </div>
                        {account.description && (
                            <div>
                                <p className="text-sm text-muted-foreground">{t('common.description') || 'Description'}</p>
                                <p className="text-sm">{account.description}</p>
                            </div>
                        )}
                    </div>

                    {/* Latest Transaction */}
                    {transactions.isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <LoadingSpinner />
                        </div>
                    ) : transactions.latestTransaction ? (
                        <div className="space-y-3">
                            <h3 className="text-lg font-semibold">{t('finance.latestTransaction') || 'Latest Transaction'}</h3>
                            <div className="border rounded-lg p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {transactions.latestTransaction.type === 'income' ? (
                                            <ArrowUpRight className="h-5 w-5 text-green-600" />
                                        ) : (
                                            <ArrowDownRight className="h-5 w-5 text-red-600" />
                                        )}
                                        <Badge
                                            variant="outline"
                                            className={
                                                transactions.latestTransaction.type === 'income'
                                                    ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                                                    : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                                            }
                                        >
                                            {transactions.latestTransaction.type === 'income' 
                                                ? t('finance.income') || 'Income' 
                                                : t('finance.expense') || 'Expense'}
                                        </Badge>
                                    </div>
                                    <p className="font-semibold text-lg">
                                        {transactions.latestTransaction.type === 'income' ? '+' : '-'}
                                        {formatCurrency(transactions.latestTransaction.amount)}
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-muted-foreground">{t('common.date') || 'Date'}</p>
                                        <p className="font-medium">
                                            {formatDate(transactions.latestTransaction.date)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">{t('finance.category') || 'Category'}</p>
                                        <p className="font-medium">{transactions.latestTransaction.category}</p>
                                    </div>
                                    {transactions.latestTransaction.referenceNo && (
                                        <div>
                                            <p className="text-muted-foreground">{t('finance.referenceNo') || 'Reference No.'}</p>
                                            <p className="font-medium">{transactions.latestTransaction.referenceNo}</p>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-muted-foreground">{t('finance.paymentMethod') || 'Payment Method'}</p>
                                        <p className="font-medium capitalize">{transactions.latestTransaction.paymentMethod.replace('_', ' ')}</p>
                                    </div>
                                </div>
                                {transactions.latestTransaction.description && (
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('common.description') || 'Description'}</p>
                                        <p className="text-sm">{transactions.latestTransaction.description}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <h3 className="text-lg font-semibold">{t('finance.latestTransaction') || 'Latest Transaction'}</h3>
                            <div className="border rounded-lg p-8 text-center text-muted-foreground">
                                {t('finance.noTransactions') || 'No transactions found'}
                            </div>
                        </div>
                    )}

                    {/* Transaction Summary */}
                    {!transactions.isLoading && (
                        <div className="space-y-3">
                            <h3 className="text-lg font-semibold">{t('finance.transactionSummary') || 'Transaction Summary'}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="border rounded-lg p-4">
                                    <p className="text-sm text-muted-foreground">{t('finance.totalIncome') || 'Total Income'}</p>
                                    <p className="text-lg font-semibold text-green-600">{formatCurrency(transactions.totalIncome)}</p>
                                </div>
                                <div className="border rounded-lg p-4">
                                    <p className="text-sm text-muted-foreground">{t('finance.totalExpense') || 'Total Expense'}</p>
                                    <p className="text-lg font-semibold text-red-600">{formatCurrency(transactions.totalExpense)}</p>
                                </div>
                                <div className="border rounded-lg p-4">
                                    <p className="text-sm text-muted-foreground">{t('finance.netBalance') || 'Net Balance'}</p>
                                    <p className={`text-lg font-semibold ${
                                        transactions.netBalance >= 0 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                        {formatCurrency(transactions.netBalance)}
                                    </p>
                                </div>
                                <div className="border rounded-lg p-4">
                                    <p className="text-sm text-muted-foreground">{t('finance.transactionCount') || 'Transaction Count'}</p>
                                    <p className="text-lg font-semibold">{transactions.transactionCount}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Recent Transactions */}
                    {!transactions.isLoading && transactions.recentTransactions.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-lg font-semibold">{t('finance.recentTransactions') || 'Recent Transactions'}</h3>
                            <div className="space-y-2">
                                {transactions.recentTransactions.map((transaction) => (
                                    <div key={transaction.id} className="border rounded-lg p-3 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            {transaction.type === 'income' ? (
                                                <ArrowUpRight className="h-4 w-4 text-green-600" />
                                            ) : (
                                                <ArrowDownRight className="h-4 w-4 text-red-600" />
                                            )}
                                            <div>
                                                <p className="font-medium text-sm">{transaction.category}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatDate(transaction.date)}
                                                    {transaction.referenceNo && ` • ${transaction.referenceNo}`}
                                                </p>
                                            </div>
                                        </div>
                                        <p className={`font-semibold ${
                                            transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                            {transaction.type === 'income' ? '+' : '-'}
                                            {formatCurrency(transaction.amount)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-4 border-t">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => {
                                onEdit(account);
                            }}
                        >
                            <Pencil className="h-4 w-4 mr-2" />
                            {t('common.edit') || 'Edit'}
                        </Button>
                        <Button
                            variant="outline"
                            className="flex-1 text-destructive hover:text-destructive"
                            onClick={() => {
                                onDelete(account.id);
                            }}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('common.delete') || 'Delete'}
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}

