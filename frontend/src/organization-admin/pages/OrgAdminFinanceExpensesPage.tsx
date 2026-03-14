/**
 * Org Admin Finance Expenses - Full CRUD for organization-level expense entries
 */

import { Plus, Pencil, Trash2, TrendingDown, Search, X, Calendar, Filter } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

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
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { dateToLocalYYYYMMDD, parseLocalDate } from '@/lib/dateUtils';
import { useLanguage } from '@/hooks/useLanguage';
import {
  useOrgFinanceExpenseEntries,
  useOrgFinanceAccounts,
  useOrgFinanceExpenseCategories,
  useOrgFinanceProjects,
  useCreateOrgFinanceExpenseEntry,
  useUpdateOrgFinanceExpenseEntry,
  useDeleteOrgFinanceExpenseEntry,
} from '@/hooks/useOrgFinance';
import { useOrgFacilities } from '@/hooks/useOrgFacilities';
import type { ExpenseEntry, ExpenseEntryFormData, ExpenseStatus } from '@/types/domain/finance';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';

const numberFormatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PAYMENT_METHODS = [
  { value: 'cash', labelKey: 'finance.cash' },
  { value: 'bank_transfer', labelKey: 'finance.bankTransfer' },
  { value: 'cheque', labelKey: 'finance.cheque' },
  { value: 'other', labelKey: 'finance.other' },
] as const;

const STATUS_OPTIONS: { value: ExpenseStatus; labelKey: string }[] = [
  { value: 'approved', labelKey: 'status.approved' },
  { value: 'pending', labelKey: 'finance.pending' },
  { value: 'rejected', labelKey: 'finance.rejected' },
];

function getStatusBadge(status: string, t: (key: string) => string) {
  switch (status) {
    case 'approved':
      return (
        <Badge variant="outline" className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400">
          {t('status.approved')}
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
}

export default function OrgAdminFinanceExpensesPage() {
  const { t, tUnsafe } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filterFacility, setFilterFacility] = useState<string>('all');
  const { data: entries = [], isLoading } = useOrgFinanceExpenseEntries({
    perPage: 100,
    facilityId: filterFacility === 'all' ? undefined : filterFacility,
  });
  const { data: accounts = [] } = useOrgFinanceAccounts({ isActive: true });
  const { data: categories = [] } = useOrgFinanceExpenseCategories({ isActive: true });
  const { data: projects = [] } = useOrgFinanceProjects({ isActive: true });
  const { data: facilities = [] } = useOrgFacilities({ isActive: true });
  const createEntry = useCreateOrgFinanceExpenseEntry();
  const updateEntry = useUpdateOrgFinanceExpenseEntry();
  const deleteEntry = useDeleteOrgFinanceExpenseEntry();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<ExpenseEntry | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewingEntry, setViewingEntry] = useState<ExpenseEntry | null>(null);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [formData, setFormData] = useState<ExpenseEntryFormData>({
    accountId: '',
    expenseCategoryId: '',
    currencyId: null,
    projectId: null,
    facilityId: null,
    amount: 0,
    date: dateToLocalYYYYMMDD(new Date()),
    referenceNo: '',
    description: '',
    paidTo: '',
    paymentMethod: 'cash',
    status: 'approved',
  });

  useEffect(() => {
    const facilityId = searchParams.get('facility_id');
    const accountId = searchParams.get('account_id');
    if (facilityId || accountId) {
      setFormData((prev) => ({
        ...prev,
        ...(accountId ? { accountId } : {}),
        ...(facilityId ? { facilityId } : {}),
      }));
      setIsCreateOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const resetForm = () => {
    setFormData({
      accountId: '',
      expenseCategoryId: '',
      currencyId: null,
      projectId: null,
      facilityId: null,
      amount: 0,
      date: dateToLocalYYYYMMDD(new Date()),
      referenceNo: '',
      description: '',
      paidTo: '',
      paymentMethod: 'cash',
      status: 'approved',
    });
    setEditEntry(null);
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

  const openEdit = (entry: ExpenseEntry) => {
    setEditEntry(entry);
    setFormData({
      accountId: entry.accountId,
      expenseCategoryId: entry.expenseCategoryId,
      currencyId: entry.currencyId ?? null,
      projectId: entry.projectId ?? null,
      facilityId: entry.facilityId ?? null,
      amount: entry.amount,
      date: dateToLocalYYYYMMDD(entry.date),
      referenceNo: entry.referenceNo ?? '',
      description: entry.description ?? '',
      paidTo: entry.paidTo ?? '',
      paymentMethod: entry.paymentMethod ?? 'cash',
      status: entry.status ?? 'approved',
    });
  };

  const accountList = Array.isArray(accounts) ? accounts : [];
  const categoryList = Array.isArray(categories) ? categories : [];
  const projectList = Array.isArray(projects) ? projects : [];

  const filteredEntries = useMemo(() => {
    let list = entries;
    const q = searchTerm.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (e) =>
          (e.description ?? '').toLowerCase().includes(q) ||
          (e.referenceNo ?? '').toLowerCase().includes(q) ||
          (e.expenseCategory?.name ?? '').toLowerCase().includes(q) ||
          (e.account?.name ?? '').toLowerCase().includes(q) ||
          (e.paidTo ?? '').toLowerCase().includes(q)
      );
    }
    if (filterCategory !== 'all') list = list.filter((e) => e.expenseCategoryId === filterCategory);
    if (filterAccount !== 'all') list = list.filter((e) => e.accountId === filterAccount);
    if (filterStatus !== 'all') list = list.filter((e) => (e.status ?? 'approved') === filterStatus);
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      list = list.filter((e) => new Date(e.date).getTime() >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      list = list.filter((e) => new Date(e.date).getTime() <= to.getTime());
    }
    return list;
  }, [entries, searchTerm, filterCategory, filterAccount, filterStatus, dateFrom, dateTo]);

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    filterCategory !== 'all' ||
    filterAccount !== 'all' ||
    filterStatus !== 'all' ||
    filterFacility !== 'all' ||
    !!dateFrom ||
    !!dateTo;

  const clearFilters = () => {
    setSearchTerm('');
    setFilterCategory('all');
    setFilterAccount('all');
    setFilterStatus('all');
    setFilterFacility('all');
    setDateFrom('');
    setDateTo('');
  };

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
        title={tUnsafe('organizationAdmin.financeExpenses') ?? t('finance.expenses')}
        description={tUnsafe('organizationAdmin.financeExpensesDesc') ?? ''}
        icon={<TrendingDown className="h-5 w-5" />}
        primaryAction={{
          label: t('finance.addExpense'),
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
          <div className="min-w-[150px]">
            <Label className="text-xs text-muted-foreground mb-1 block">
              <Calendar className="inline h-3 w-3 mr-1" />
              {t('events.from')}
            </Label>
            <CalendarDatePicker
              date={dateFrom ? parseLocalDate(dateFrom) : undefined}
              onDateChange={(d) => setDateFrom(d ? dateToLocalYYYYMMDD(d) : '')}
            />
          </div>
          <div className="min-w-[150px]">
            <Label className="text-xs text-muted-foreground mb-1 block">
              <Calendar className="inline h-3 w-3 mr-1" />
              {t('events.to')}
            </Label>
            <CalendarDatePicker
              date={dateTo ? parseLocalDate(dateTo) : undefined}
              onDateChange={(d) => setDateTo(d ? dateToLocalYYYYMMDD(d) : '')}
            />
          </div>
          <div className="min-w-[160px]">
            <Label className="text-xs text-muted-foreground mb-1 block">
              <Filter className="inline h-3 w-3 mr-1" />
              {t('assets.category')}
            </Label>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger>
                <SelectValue placeholder={t('subjects.all')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('subjects.all')}</SelectItem>
                {categoryList.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[160px]">
            <Label className="text-xs text-muted-foreground mb-1 block">{t('finance.account')}</Label>
            <Select value={filterAccount} onValueChange={setFilterAccount}>
              <SelectTrigger>
                <SelectValue placeholder={t('subjects.all')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('subjects.all')}</SelectItem>
                {accountList.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[140px]">
            <Label className="text-xs text-muted-foreground mb-1 block">{t('events.status')}</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder={t('subjects.all')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('subjects.all')}</SelectItem>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{t(o.labelKey)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[160px]">
            <Label className="text-xs text-muted-foreground mb-1 block">{t('organizationAdmin.facility') ?? 'Facility'}</Label>
            <Select value={filterFacility} onValueChange={setFilterFacility}>
              <SelectTrigger>
                <SelectValue placeholder={t('subjects.all')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('subjects.all')}</SelectItem>
                {facilities.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <CardTitle>{tUnsafe('organizationAdmin.financeExpenses') ?? t('finance.expenses')}</CardTitle>
          <CardDescription>{tUnsafe('organizationAdmin.financeExpensesDesc') ?? ''}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('organizationAdmin.date')}</TableHead>
                  <TableHead>{t('assets.category')}</TableHead>
                  <TableHead>{t('finance.account')}</TableHead>
                  <TableHead>{t('finance.paidTo')}</TableHead>
                  <TableHead>{t('finance.project')}</TableHead>
                  <TableHead>{t('organizationAdmin.status')}</TableHead>
                  <TableHead className="text-right">{t('finance.amount')}</TableHead>
                  <TableHead className="text-right">{t('events.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-16 text-center text-muted-foreground py-8">
                      {hasActiveFilters ? (t('events.noResults') ?? 'No results') : (tUnsafe('organizationAdmin.noExpenses') ?? t('finance.noExpenses'))}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntries.map((entry) => (
                    <TableRow
                      key={entry.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setViewingEntry(entry);
                        setSidePanelOpen(true);
                      }}
                    >
                      <TableCell className="text-muted-foreground">
                        {entry.date ? formatDate(entry.date) : '—'}
                      </TableCell>
                      <TableCell>
                        {entry.expenseCategory?.name ? (
                          <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400">
                            {entry.expenseCategory.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {entry.account?.name ? (
                          <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400">
                            {entry.account.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {entry.paidTo ? (
                          <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400">
                            {entry.paidTo}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {entry.project?.name ? (
                          <Badge variant="outline" className="bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400">
                            {entry.project.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(entry.status ?? 'approved', t)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 font-semibold">
                          -{formatCurrency(entry.amount ?? 0, entry.currency?.code ?? entry.account?.currency?.code ?? 'USD')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(entry)}
                            aria-label={t('finance.editExpense')}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(entry.id)}
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

      {/* Create dialog */}
      <Dialog open={isCreateOpen} onOpenChange={(o) => { setIsCreateOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('finance.addExpense')}</DialogTitle>
            <DialogDescription>{t('finance.addExpenseDescription')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); void handleCreate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label>{t('finance.account')} *</Label>
              <Select value={formData.accountId} onValueChange={(v) => setFormData({ ...formData, accountId: v })} required>
                <SelectTrigger><SelectValue placeholder={t('finance.allAccounts')} /></SelectTrigger>
                <SelectContent>
                  {accountList.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name} {a.code ? `(${a.code})` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('finance.category')} *</Label>
              <Select value={formData.expenseCategoryId} onValueChange={(v) => setFormData({ ...formData, expenseCategoryId: v })} required>
                <SelectTrigger><SelectValue placeholder={t('finance.allExpenseCategories')} /></SelectTrigger>
                <SelectContent>
                  {categoryList.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('organizationAdmin.facility') ?? 'Facility'}</Label>
              <Select value={formData.facilityId ?? 'none'} onValueChange={(v) => setFormData({ ...formData, facilityId: v === 'none' ? null : v })}>
                <SelectTrigger><SelectValue placeholder={t('organizationAdmin.selectFacility') ?? 'Select facility'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {facilities.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('finance.amount')} *</Label>
                <Input type="number" step="0.01" min="0.01" value={formData.amount || ''} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} required />
              </div>
              <div className="space-y-2">
                <Label>{t('finance.referenceNo')}</Label>
                <Input value={formData.referenceNo ?? ''} onChange={(e) => setFormData({ ...formData, referenceNo: e.target.value })} placeholder={t('finance.referenceNoPlaceholder')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('organizationAdmin.date')}</Label>
              <CalendarDatePicker
                date={formData.date ? parseLocalDate(formData.date) : undefined}
                onDateChange={(date) => setFormData({ ...formData, date: date ? dateToLocalYYYYMMDD(date) : '' })}
                placeholder={t('organizationAdmin.date')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('finance.paidTo')}</Label>
              <Input value={formData.paidTo ?? ''} onChange={(e) => setFormData({ ...formData, paidTo: e.target.value })} placeholder={t('finance.paidToPlaceholder')} />
            </div>
            <div className="space-y-2">
              <Label>{t('organizationAdmin.description')}</Label>
              <Textarea value={formData.description ?? ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder={t('finance.expenseDescriptionPlaceholder')} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('finance.paymentMethod')}</Label>
                <Select value={formData.paymentMethod ?? 'cash'} onValueChange={(v: ExpenseEntryFormData['paymentMethod']) => setFormData({ ...formData, paymentMethod: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((pm) => (
                      <SelectItem key={pm.value} value={pm.value}>{t(pm.labelKey)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('organizationAdmin.status')}</Label>
                <Select value={formData.status ?? 'approved'} onValueChange={(v: ExpenseStatus) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{t(s.labelKey)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('finance.project')}</Label>
              <Select value={formData.projectId ?? ''} onValueChange={(v) => setFormData({ ...formData, projectId: v || null })}>
                <SelectTrigger><SelectValue placeholder={t('finance.projects')} /></SelectTrigger>
                <SelectContent>
                  {projectList.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={createEntry.isPending || !formData.accountId || !formData.expenseCategoryId || formData.amount <= 0}>
                {createEntry.isPending ? t('common.loading') : t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editEntry} onOpenChange={(o) => { if (!o) resetForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('finance.editExpense')}</DialogTitle>
            <DialogDescription>{t('finance.editExpenseDescription')}</DialogDescription>
          </DialogHeader>
          {editEntry && (
            <form onSubmit={(e) => { e.preventDefault(); void handleUpdate(); }} className="space-y-4">
              <div className="space-y-2">
                <Label>{t('finance.account')} *</Label>
                <Select value={formData.accountId} onValueChange={(v) => setFormData({ ...formData, accountId: v })} required>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {accountList.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('finance.category')} *</Label>
                <Select value={formData.expenseCategoryId} onValueChange={(v) => setFormData({ ...formData, expenseCategoryId: v })} required>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categoryList.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('finance.amount')} *</Label>
                  <Input type="number" step="0.01" min="0.01" value={formData.amount || ''} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} required />
                </div>
                <div className="space-y-2">
                  <Label>{t('finance.referenceNo')}</Label>
                  <Input value={formData.referenceNo ?? ''} onChange={(e) => setFormData({ ...formData, referenceNo: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('organizationAdmin.date')}</Label>
                <CalendarDatePicker
                  date={formData.date ? parseLocalDate(formData.date) : undefined}
                  onDateChange={(date) => setFormData({ ...formData, date: date ? dateToLocalYYYYMMDD(date) : '' })}
                  placeholder={t('organizationAdmin.date')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('finance.paidTo')}</Label>
                <Input value={formData.paidTo ?? ''} onChange={(e) => setFormData({ ...formData, paidTo: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t('organizationAdmin.description')}</Label>
                <Textarea value={formData.description ?? ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('finance.paymentMethod')}</Label>
                  <Select value={formData.paymentMethod ?? 'cash'} onValueChange={(v: ExpenseEntryFormData['paymentMethod']) => setFormData({ ...formData, paymentMethod: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((pm) => (
                        <SelectItem key={pm.value} value={pm.value}>{t(pm.labelKey)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('organizationAdmin.status')}</Label>
                  <Select value={formData.status ?? 'approved'} onValueChange={(v: ExpenseStatus) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{t(s.labelKey)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditEntry(null)}>{t('common.cancel')}</Button>
                <Button type="submit" disabled={updateEntry.isPending || !formData.accountId || !formData.expenseCategoryId || formData.amount <= 0}>
                  {updateEntry.isPending ? t('common.loading') : t('common.save')}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.delete')}?</AlertDialogTitle>
            <AlertDialogDescription>{t('finance.deleteEntryWarning')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={sidePanelOpen} onOpenChange={setSidePanelOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          {viewingEntry && (
            <>
              <SheetHeader>
                <SheetTitle>{t('finance.entryDetails')}</SheetTitle>
                <SheetDescription>{t('finance.viewEntryDetails')}</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">{t('finance.entryInformation')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('finance.amount')}</p>
                      <p className="text-lg font-semibold text-red-600">
                        -{formatCurrency(viewingEntry.amount, viewingEntry.currency?.code ?? viewingEntry.account?.currency?.code ?? 'USD')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('organizationAdmin.date')}</p>
                      <p className="text-sm font-medium">{viewingEntry.date ? formatDate(viewingEntry.date) : '—'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('organizationAdmin.status')}</p>
                      <div className="mt-1">
                        {viewingEntry.status === 'approved' && (
                          <Badge variant="outline" className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400">
                            {t('finance.approved')}
                          </Badge>
                        )}
                        {viewingEntry.status === 'pending' && (
                          <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400">
                            {t('finance.pending')}
                          </Badge>
                        )}
                        {viewingEntry.status === 'rejected' && (
                          <Badge variant="outline" className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
                            {t('finance.rejected')}
                          </Badge>
                        )}
                      </div>
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
                        {(viewingEntry.paymentMethod ?? 'cash').replace('_', ' ').toUpperCase()}
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
                      <p className="text-sm font-medium text-muted-foreground">{t('organizationAdmin.description')}</p>
                      <p className="text-sm mt-1">{viewingEntry.description}</p>
                    </div>
                  )}
                </div>
                {viewingEntry.account && (
                  <>
                    <Separator />
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
                          <Badge variant="outline" className={viewingEntry.account.type === 'cash' ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 mt-1' : 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400 mt-1'}>
                            {viewingEntry.account.type === 'cash' ? t('finance.cash') : t('finance.fund')}
                          </Badge>
                        </div>
                        <div className="col-span-2">
                          <p className="text-sm font-medium text-muted-foreground">{t('finance.currentBalance')}</p>
                          <p className="text-2xl font-bold text-emerald-600 mt-1">
                            {formatCurrency(viewingEntry.account.currentBalance ?? 0, viewingEntry.account.currency?.code ?? 'USD')}
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
                {viewingEntry.expenseCategory && (
                  <>
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">{t('finance.categoryInformation')}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">{t('finance.category')}</p>
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
                            <p className="text-sm font-medium text-muted-foreground">{t('organizationAdmin.description')}</p>
                            <p className="text-sm mt-1">{viewingEntry.expenseCategory.description}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <Separator />
                  </>
                )}
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
                          <p className="text-sm font-medium text-muted-foreground">{t('organizationAdmin.status')}</p>
                          <Badge variant="outline" className="mt-1 capitalize">{viewingEntry.project.status}</Badge>
                        </div>
                        {viewingEntry.project.budgetAmount != null && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">{t('finance.budgetAmount')}</p>
                            <p className="text-sm font-medium">
                              {formatCurrency(viewingEntry.project.budgetAmount, (currencies as { id: string; code?: string }[] | undefined)?.find(c => c.id === viewingEntry.project?.currencyId)?.code ?? 'USD')}
                            </p>
                          </div>
                        )}
                        {viewingEntry.project.balance !== undefined && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">{t('finance.projectBalance')}</p>
                            <p className="text-sm font-medium">
                              {formatCurrency(viewingEntry.project.balance, (currencies as { id: string; code?: string }[] | undefined)?.find(c => c.id === viewingEntry.project?.currencyId)?.code ?? 'USD')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <Separator />
                  </>
                )}
                {viewingEntry.currency && (
                  <>
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">{t('finance.currencyInformation')}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">{t('finance.currency')}</p>
                          <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 mt-1">
                            {viewingEntry.currency.code ?? 'N/A'}
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
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">{t('events.metadata')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {viewingEntry.createdAt && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{t('events.createdAt')}</p>
                        <p className="text-sm">{formatDate(viewingEntry.createdAt)}</p>
                      </div>
                    )}
                    {viewingEntry.updatedAt && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{t('events.updatedAt')}</p>
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
