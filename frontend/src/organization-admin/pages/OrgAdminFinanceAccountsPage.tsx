/**
 * Org Admin Finance Accounts - Full CRUD for organization-level accounts
 */

import { Plus, Pencil, Trash2, Wallet, ArrowUpRight, ArrowDownRight, Search, X } from 'lucide-react';
import { useState, useMemo } from 'react';

import { FilterPanel } from '@/components/layout/FilterPanel';
import { PageHeader } from '@/components/layout/PageHeader';
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
import {
  useOrgFinanceAccounts,
  useOrgFinanceCurrencies,
  useCreateOrgFinanceAccount,
  useUpdateOrgFinanceAccount,
  useDeleteOrgFinanceAccount,
  useOrgAccountTransactions,
} from '@/hooks/useOrgFinance';
import type { FinanceAccount, FinanceAccountFormData } from '@/types/domain/finance';
import { useLanguage } from '@/hooks/useLanguage';
import { formatDate, formatCurrency, getAccountCurrencyCode } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const numberFormatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function OrgAdminFinanceAccountsPage() {
  const { t, tUnsafe } = useLanguage();
  const { data: accounts = [], isLoading } = useOrgFinanceAccounts({ isActive: undefined });
  const { data: currencies = [] } = useOrgFinanceCurrencies({ isActive: true });
  const createAccount = useCreateOrgFinanceAccount();
  const updateAccount = useUpdateOrgFinanceAccount();
  const deleteAccount = useDeleteOrgFinanceAccount();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<FinanceAccount | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<FinanceAccount | null>(null);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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
    setEditAccount(null);
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

  const openEdit = (account: FinanceAccount) => {
    setEditAccount(account);
    setFormData({
      name: account.name,
      code: account.code ?? '',
      type: account.type,
      currencyId: account.currencyId ?? '',
      description: account.description ?? '',
      openingBalance: account.openingBalance ?? 0,
      isActive: account.isActive ?? true,
    });
  };

  const handleRowClick = (account: FinanceAccount) => {
    setSelectedAccount(account);
    setSidePanelOpen(true);
  };

  const currencyList = Array.isArray(currencies) ? currencies : [];
  const baseCode = (currencyList[0] as { code?: string } | undefined)?.code ?? 'USD';

  const filteredAccounts = useMemo(() => {
    if (!searchTerm.trim()) return accounts;
    const q = searchTerm.toLowerCase().trim();
    return accounts.filter(
      (acc) =>
        acc.name.toLowerCase().includes(q) ||
        (acc.code ?? '').toLowerCase().includes(q)
    );
  }, [accounts, searchTerm]);

  const clearFilters = () => setSearchTerm('');
  const hasActiveFilters = !!searchTerm.trim();

  if (isLoading) {
    return (
      <div className="container mx-auto flex max-w-7xl items-center justify-center overflow-x-hidden p-4 md:p-6">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl space-y-6 overflow-x-hidden p-4 md:p-6">
      <PageHeader
        title={tUnsafe('organizationAdmin.financeAccounts') ?? 'Accounts'}
        description={tUnsafe('organizationAdmin.financeAccountsDesc') ?? 'Organization-level finance accounts'}
        icon={<Wallet className="h-5 w-5" />}
        primaryAction={{
          label: t('finance.addAccount'),
          onClick: () => setIsCreateOpen(true),
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      <FilterPanel title={t('events.filters')} defaultOpenDesktop={true} defaultOpenMobile={false}>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs text-muted-foreground mb-1 block">{t('events.search')}</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('events.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              {t('events.clearFilters')}
            </Button>
          )}
        </div>
      </FilterPanel>

      <Card>
        <CardHeader>
          <CardTitle>{tUnsafe('organizationAdmin.financeAccounts') ?? 'Accounts'}</CardTitle>
          <CardDescription>{tUnsafe('organizationAdmin.financeAccountsDesc') ?? 'Org finance accounts'}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('organizationAdmin.name')}</TableHead>
                  <TableHead>{t('organizationAdmin.code')}</TableHead>
                  <TableHead>{t('finance.accountType')}</TableHead>
                  <TableHead className="text-right">{t('organizationAdmin.balance')}</TableHead>
                  <TableHead>{t('organizationAdmin.status')}</TableHead>
                  <TableHead className="text-right">{t('events.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-16 text-center text-muted-foreground py-8">
                      {hasActiveFilters ? t('events.noResults') ?? 'No results' : (tUnsafe('organizationAdmin.noAccounts') ?? 'No accounts yet')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAccounts.map((acc) => (
                    <TableRow key={acc.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleRowClick(acc)}>
                      <TableCell className="font-medium">{acc.name}</TableCell>
                      <TableCell>
                        {acc.code ? (
                          <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400">
                            {acc.code}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            acc.type === 'cash'
                              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                              : 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400'
                          }
                        >
                          {acc.type === 'cash' ? t('finance.cash') : t('finance.fund')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={
                            (acc.currentBalance ?? 0) >= 0
                              ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 font-semibold'
                              : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 font-semibold'
                          }
                        >
                          {numberFormatter.format(acc.currentBalance ?? 0)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={acc.isActive ? 'default' : 'secondary'} className={acc.isActive ? 'bg-green-500 hover:bg-green-600 text-white border-0' : 'bg-gray-500 hover:bg-gray-600 text-white border-0'}>
                          {acc.isActive ? t('common.active') : t('common.inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(acc)} aria-label={t('finance.editAccount')}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(acc.id)}
                            aria-label={t('common.delete')}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={(o) => { setIsCreateOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('finance.addAccount')}</DialogTitle>
            <DialogDescription>{t('finance.addAccountDescription')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('organizationAdmin.name')} *</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder={t('finance.accountNamePlaceholder')} />
              </div>
              <div className="space-y-2">
                <Label>{t('organizationAdmin.code')}</Label>
                <Input value={formData.code ?? ''} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder={t('finance.accountCodePlaceholder')} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('finance.accountType')}</Label>
                <Select value={formData.type} onValueChange={(v: 'cash' | 'fund') => setFormData({ ...formData, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">{t('finance.cash')}</SelectItem>
                    <SelectItem value="fund">{t('finance.fund')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('finance.currency')}</Label>
                <Select value={formData.currencyId ?? ''} onValueChange={(v) => setFormData({ ...formData, currencyId: v })}>
                  <SelectTrigger><SelectValue placeholder={t('finance.allCurrencies')} /></SelectTrigger>
                  <SelectContent>
                    {currencyList.map((c: { id: string; code?: string; name?: string }) => (
                      <SelectItem key={c.id} value={c.id}>{c.code ?? c.id} {c.name ? `- ${c.name}` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('finance.openingBalance')}</Label>
              <Input type="number" step="0.01" value={formData.openingBalance ?? 0} onChange={(e) => setFormData({ ...formData, openingBalance: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>{t('organizationAdmin.description')}</Label>
              <Textarea value={formData.description ?? ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder={t('finance.accountDescriptionPlaceholder')} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formData.isActive ?? true} onCheckedChange={(c) => setFormData({ ...formData, isActive: c })} />
              <Label>{t('common.active')}</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={createAccount.isPending || !formData.name.trim()}>{createAccount.isPending ? t('common.loading') : t('common.save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editAccount} onOpenChange={(o) => { if (!o) resetForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('finance.editAccount')}</DialogTitle>
            <DialogDescription>{t('finance.editAccountDescription')}</DialogDescription>
          </DialogHeader>
          {editAccount && (
            <form onSubmit={(e) => { e.preventDefault(); handleUpdate(); }} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('organizationAdmin.name')} *</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t('organizationAdmin.code')}</Label>
                  <Input value={formData.code ?? ''} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('finance.accountType')}</Label>
                  <Select value={formData.type} onValueChange={(v: 'cash' | 'fund') => setFormData({ ...formData, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">{t('finance.cash')}</SelectItem>
                      <SelectItem value="fund">{t('finance.fund')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('finance.currency')}</Label>
                  <Select value={formData.currencyId ?? ''} onValueChange={(v) => setFormData({ ...formData, currencyId: v })}>
                    <SelectTrigger><SelectValue placeholder={t('finance.allCurrencies')} /></SelectTrigger>
                    <SelectContent>
                      {currencyList.map((c: { id: string; code?: string; name?: string }) => (
                        <SelectItem key={c.id} value={c.id}>{c.code ?? c.id}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('organizationAdmin.description')}</Label>
                <Textarea value={formData.description ?? ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={formData.isActive ?? true} onCheckedChange={(c) => setFormData({ ...formData, isActive: c })} />
                <Label>{t('common.active')}</Label>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditAccount(null)}>{t('common.cancel')}</Button>
                <Button type="submit" disabled={updateAccount.isPending || !formData.name.trim()}>{updateAccount.isPending ? t('common.loading') : t('common.save')}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.delete')}?</AlertDialogTitle>
            <AlertDialogDescription>{t('finance.deleteAccountWarning')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <OrgAccountDetailsPanel
        account={selectedAccount}
        baseCode={baseCode}
        open={sidePanelOpen}
        onOpenChange={setSidePanelOpen}
        onEdit={(account) => {
          setSidePanelOpen(false);
          openEdit(account);
        }}
        onDelete={(accountId) => {
          setSidePanelOpen(false);
          setDeleteId(accountId);
        }}
      />
    </div>
  );
}

function OrgAccountDetailsPanel({
  account,
  baseCode,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: {
  account: FinanceAccount | null;
  baseCode: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (account: FinanceAccount) => void;
  onDelete: (accountId: string) => void;
}) {
  const { t } = useLanguage();
  const transactions = useOrgAccountTransactions(account?.id);

  if (!account) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('finance.accountDetails')}</SheetTitle>
          <SheetDescription>{t('finance.viewAccountDetails')}</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">{t('finance.accountInformation')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('organizationAdmin.name')}</p>
                <p className="font-medium">{account.name}</p>
              </div>
              {account.code && (
                <div>
                  <p className="text-sm text-muted-foreground">{t('organizationAdmin.code')}</p>
                  <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400">
                    {account.code}
                  </Badge>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">{t('finance.accountType')}</p>
                <Badge
                  variant="outline"
                  className={
                    account.type === 'cash'
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                      : 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400'
                  }
                >
                  {account.type === 'cash' ? t('finance.cash') : t('finance.fund')}
                </Badge>
              </div>
              {account.currency && (
                <div>
                  <p className="text-sm text-muted-foreground">{t('finance.currency')}</p>
                  <p className="font-medium">{account.currency.code} - {account.currency.name}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">{t('finance.openingBalance')}</p>
                <p className="font-medium">{formatCurrency(account.openingBalance, getAccountCurrencyCode(account, baseCode))}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('finance.currentBalance')}</p>
                <Badge
                  variant="outline"
                  className={`font-semibold ${
                    (account.currentBalance ?? 0) >= 0
                      ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                      : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                  }`}
                >
                  {formatCurrency(account.currentBalance ?? 0, getAccountCurrencyCode(account, baseCode))}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('organizationAdmin.status')}</p>
                <Badge variant={account.isActive ? 'default' : 'secondary'} className={account.isActive ? 'bg-green-500 hover:bg-green-600 text-white border-0' : 'bg-gray-500 hover:bg-gray-600 text-white border-0'}>
                  {account.isActive ? t('common.active') : t('common.inactive')}
                </Badge>
              </div>
            </div>
            {account.description && (
              <div>
                <p className="text-sm text-muted-foreground">{t('organizationAdmin.description')}</p>
                <p className="text-sm">{account.description}</p>
              </div>
            )}
          </div>

          {transactions.isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : transactions.latestTransaction ? (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">{t('finance.latestTransaction')}</h3>
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {transactions.latestTransaction.type === 'income' ? (
                      <ArrowUpRight className="h-5 w-5 text-green-600" />
                    ) : (
                      <ArrowDownRight className="h-5 w-5 text-red-600" />
                    )}
                    <Badge variant="outline" className={transactions.latestTransaction.type === 'income' ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'}>
                      {transactions.latestTransaction.type === 'income' ? t('finance.income') : t('finance.expense')}
                    </Badge>
                  </div>
                  <p className="font-semibold text-lg">
                    {transactions.latestTransaction.type === 'income' ? '+' : '-'}
                    {formatCurrency(transactions.latestTransaction.amount, getAccountCurrencyCode(account, baseCode))}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">{t('organizationAdmin.date')}</p>
                    <p className="font-medium">{formatDate(transactions.latestTransaction.date)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('finance.category')}</p>
                    <p className="font-medium">{transactions.latestTransaction.category}</p>
                  </div>
                  {transactions.latestTransaction.referenceNo && (
                    <div>
                      <p className="text-muted-foreground">{t('finance.referenceNo')}</p>
                      <p className="font-medium">{transactions.latestTransaction.referenceNo}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground">{t('finance.paymentMethod')}</p>
                    <p className="font-medium capitalize">{(transactions.latestTransaction.paymentMethod ?? '').replace('_', ' ')}</p>
                  </div>
                </div>
                {transactions.latestTransaction.description && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t('organizationAdmin.description')}</p>
                    <p className="text-sm">{transactions.latestTransaction.description}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">{t('finance.latestTransaction')}</h3>
              <div className="border rounded-lg p-8 text-center text-muted-foreground">{t('finance.noTransactions')}</div>
            </div>
          )}

          {!transactions.isLoading && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">{t('finance.transactionSummary')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">{t('finance.totalIncome')}</p>
                  <p className="text-lg font-semibold text-green-600">{formatCurrency(transactions.totalIncome, getAccountCurrencyCode(account, baseCode))}</p>
                </div>
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">{t('finance.totalExpense')}</p>
                  <p className="text-lg font-semibold text-red-600">{formatCurrency(transactions.totalExpense, getAccountCurrencyCode(account, baseCode))}</p>
                </div>
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">{t('finance.netBalance')}</p>
                  <p className={`text-lg font-semibold ${transactions.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(transactions.netBalance, getAccountCurrencyCode(account, baseCode))}
                  </p>
                </div>
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">{t('finance.transactionCount')}</p>
                  <p className="text-lg font-semibold">{transactions.transactionCount}</p>
                </div>
              </div>
            </div>
          )}

          {!transactions.isLoading && transactions.recentTransactions.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">{t('finance.recentTransactions')}</h3>
              <div className="space-y-2">
                {transactions.recentTransactions.map((tx) => (
                  <div key={tx.id} className="border rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {tx.type === 'income' ? <ArrowUpRight className="h-4 w-4 text-green-600" /> : <ArrowDownRight className="h-4 w-4 text-red-600" />}
                      <div>
                        <p className="font-medium text-sm">{tx.category}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(tx.date)}
                          {tx.referenceNo ? ` • ${tx.referenceNo}` : ''}
                        </p>
                      </div>
                    </div>
                    <p className={`font-semibold ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, getAccountCurrencyCode(account, baseCode))}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" className="flex-1" onClick={() => onEdit(account)}>
              <Pencil className="h-4 w-4 mr-2" />
              {t('common.edit')}
            </Button>
            <Button variant="outline" className="flex-1 text-destructive hover:text-destructive" onClick={() => onDelete(account.id)}>
              <Trash2 className="h-4 w-4 mr-2" />
              {t('common.delete')}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
