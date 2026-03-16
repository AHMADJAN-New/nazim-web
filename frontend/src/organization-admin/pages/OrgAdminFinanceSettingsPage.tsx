/**
 * Org Admin Finance Settings - Currencies, Income/Expense categories, Exchange rates (single page, 4 tabs).
 * Mirrors school Finance Settings layout.
 */

import {
  ArrowRightLeft,
  Coins,
  Plus,
  Pencil,
  Settings,
  Star,
  Tag,
  Tags,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import {
  useOrgFinanceCurrencies,
  useOrgFinanceExchangeRates,
  useCreateOrgFinanceCurrency,
  useUpdateOrgFinanceCurrency,
  useDeleteOrgFinanceCurrency,
  useCreateOrgFinanceExchangeRate,
  useUpdateOrgFinanceExchangeRate,
  useDeleteOrgFinanceExchangeRate,
  useOrgFinanceIncomeCategories,
  useOrgFinanceExpenseCategories,
  useCreateOrgFinanceIncomeCategory,
  useUpdateOrgFinanceIncomeCategory,
  useDeleteOrgFinanceIncomeCategory,
  useCreateOrgFinanceExpenseCategory,
  useUpdateOrgFinanceExpenseCategory,
  useDeleteOrgFinanceExpenseCategory,
} from '@/hooks/useOrgFinance';
import type { Currency, CurrencyFormData, ExchangeRate, ExchangeRateFormData } from '@/types/domain/currency';
import type {
  IncomeCategory,
  IncomeCategoryFormData,
  ExpenseCategory,
  ExpenseCategoryFormData,
} from '@/types/domain/finance';
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
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { formatDate } from '@/lib/utils';

export default function OrgAdminFinanceSettingsPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('currencies');

  // Currencies
  const { data: currencies = [], isLoading: currenciesLoading } = useOrgFinanceCurrencies();
  const createCurrency = useCreateOrgFinanceCurrency();
  const updateCurrency = useUpdateOrgFinanceCurrency();
  const deleteCurrency = useDeleteOrgFinanceCurrency();
  const [currencyFormOpen, setCurrencyFormOpen] = useState(false);
  const [editCurrency, setEditCurrency] = useState<Currency | null>(null);
  const [deleteCurrencyId, setDeleteCurrencyId] = useState<string | null>(null);
  const [currencyForm, setCurrencyForm] = useState<CurrencyFormData>({
    code: '',
    name: '',
    symbol: '',
    decimalPlaces: 2,
    isBase: false,
    isActive: true,
  });

  // Exchange rates
  const { data: exchangeRates = [], isLoading: ratesLoading } = useOrgFinanceExchangeRates();
  const { data: currenciesForRates = [] } = useOrgFinanceCurrencies({ isActive: true });
  const createRate = useCreateOrgFinanceExchangeRate();
  const updateRate = useUpdateOrgFinanceExchangeRate();
  const deleteRate = useDeleteOrgFinanceExchangeRate();
  const [rateFormOpen, setRateFormOpen] = useState(false);
  const [editRate, setEditRate] = useState<ExchangeRate | null>(null);
  const [deleteRateId, setDeleteRateId] = useState<string | null>(null);
  const [rateForm, setRateForm] = useState<ExchangeRateFormData>({
    fromCurrencyId: '',
    toCurrencyId: '',
    rate: 0,
    effectiveDate: dateToLocalYYYYMMDD(new Date()),
    notes: '',
    isActive: true,
  });

  // Income categories
  const { data: incomeCategories = [], isLoading: incomeLoading } = useOrgFinanceIncomeCategories({ isActive: undefined });
  const createIncome = useCreateOrgFinanceIncomeCategory();
  const updateIncome = useUpdateOrgFinanceIncomeCategory();
  const deleteIncome = useDeleteOrgFinanceIncomeCategory();
  const [incomeFormOpen, setIncomeFormOpen] = useState(false);
  const [editIncome, setEditIncome] = useState<IncomeCategory | null>(null);
  const [deleteIncomeId, setDeleteIncomeId] = useState<string | null>(null);
  const [incomeForm, setIncomeForm] = useState<IncomeCategoryFormData>({
    name: '',
    code: '',
    description: '',
    isRestricted: false,
    isActive: true,
  });

  // Expense categories
  const { data: expenseCategories = [], isLoading: expenseLoading } = useOrgFinanceExpenseCategories({ isActive: undefined });
  const createExpense = useCreateOrgFinanceExpenseCategory();
  const updateExpense = useUpdateOrgFinanceExpenseCategory();
  const deleteExpense = useDeleteOrgFinanceExpenseCategory();
  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<ExpenseCategory | null>(null);
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);
  const [expenseForm, setExpenseForm] = useState<ExpenseCategoryFormData>({
    name: '',
    code: '',
    description: '',
    isActive: true,
  });

  const resetCurrencyForm = () => {
    setCurrencyForm({
      code: '',
      name: '',
      symbol: '',
      decimalPlaces: 2,
      isBase: false,
      isActive: true,
    });
    setEditCurrency(null);
  };
  const resetRateForm = () => {
    setRateForm({
      fromCurrencyId: '',
      toCurrencyId: '',
      rate: 0,
      effectiveDate: dateToLocalYYYYMMDD(new Date()),
      notes: '',
      isActive: true,
    });
    setEditRate(null);
  };
  const resetIncomeForm = () => {
    setIncomeForm({ name: '', code: '', description: '', isRestricted: false, isActive: true });
    setEditIncome(null);
  };
  const resetExpenseForm = () => {
    setExpenseForm({ name: '', code: '', description: '', isActive: true });
    setEditExpense(null);
  };

  const handleCreateCurrency = async () => {
    if (!currencyForm.code || !currencyForm.name) return;
    await createCurrency.mutateAsync(currencyForm);
    setCurrencyFormOpen(false);
    resetCurrencyForm();
  };
  const handleUpdateCurrency = async () => {
    if (!editCurrency) return;
    await updateCurrency.mutateAsync({ id: editCurrency.id, ...currencyForm });
    resetCurrencyForm();
  };
  const handleDeleteCurrency = async () => {
    if (!deleteCurrencyId) return;
    await deleteCurrency.mutateAsync(deleteCurrencyId);
    setDeleteCurrencyId(null);
  };

  const handleCreateRate = async () => {
    if (!rateForm.fromCurrencyId || !rateForm.toCurrencyId || rateForm.rate <= 0) return;
    await createRate.mutateAsync(rateForm);
    setRateFormOpen(false);
    resetRateForm();
  };
  const handleUpdateRate = async () => {
    if (!editRate) return;
    await updateRate.mutateAsync({ id: editRate.id, ...rateForm });
    resetRateForm();
  };
  const handleDeleteRate = async () => {
    if (!deleteRateId) return;
    await deleteRate.mutateAsync(deleteRateId);
    setDeleteRateId(null);
  };

  const handleCreateIncome = async () => {
    await createIncome.mutateAsync(incomeForm);
    setIncomeFormOpen(false);
    resetIncomeForm();
  };
  const handleUpdateIncome = async () => {
    if (!editIncome) return;
    await updateIncome.mutateAsync({ id: editIncome.id, ...incomeForm });
    resetIncomeForm();
  };
  const handleDeleteIncome = async () => {
    if (!deleteIncomeId) return;
    await deleteIncome.mutateAsync(deleteIncomeId);
    setDeleteIncomeId(null);
  };
  const handleCreateExpense = async () => {
    await createExpense.mutateAsync(expenseForm);
    setExpenseFormOpen(false);
    resetExpenseForm();
  };
  const handleUpdateExpense = async () => {
    if (!editExpense) return;
    await updateExpense.mutateAsync({ id: editExpense.id, ...expenseForm });
    resetExpenseForm();
  };
  const handleDeleteExpense = async () => {
    if (!deleteExpenseId) return;
    await deleteExpense.mutateAsync(deleteExpenseId);
    setDeleteExpenseId(null);
  };

  const isLoading = currenciesLoading || ratesLoading || incomeLoading || expenseLoading;

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
        title={t('finance.settings') ?? 'Finance Settings'}
        description={t('finance.settingsDescription') ?? 'Manage currencies, categories, and exchange rates'}
        icon={<Settings className="h-5 w-5" />}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full flex flex-wrap gap-1">
          <TabsTrigger value="currencies" className="flex items-center gap-2 flex-shrink-0">
            <Coins className="h-4 w-4" />
            <span className="hidden sm:inline">{t('finance.currencies') ?? 'Currencies'}</span>
          </TabsTrigger>
          <TabsTrigger value="income-categories" className="flex items-center gap-2 flex-shrink-0">
            <Tag className="h-4 w-4" />
            <span className="hidden sm:inline">{t('finance.incomeCategories') ?? 'Income categories'}</span>
          </TabsTrigger>
          <TabsTrigger value="expense-categories" className="flex items-center gap-2 flex-shrink-0">
            <Tags className="h-4 w-4" />
            <span className="hidden sm:inline">{t('finance.expenseCategories') ?? 'Expense categories'}</span>
          </TabsTrigger>
          <TabsTrigger value="exchange-rates" className="flex items-center gap-2 flex-shrink-0">
            <ArrowRightLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{t('finance.exchangeRates') ?? 'Exchange rates'}</span>
          </TabsTrigger>
        </TabsList>

        {/* Currencies tab */}
        <TabsContent value="currencies" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="h-5 w-5" />
                  {t('finance.currencies') ?? 'Currencies'}
                </CardTitle>
                <CardDescription>
                  {currencies.length} {t('finance.currenciesFound') ?? 'currencies'}
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => setCurrencyFormOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> {t('finance.addCurrency') ?? 'Add currency'}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('finance.currencyCode') ?? 'Code'}</TableHead>
                      <TableHead>{t('events.name') ?? 'Name'}</TableHead>
                      <TableHead>{t('finance.currencySymbol') ?? 'Symbol'}</TableHead>
                      <TableHead>{t('finance.decimalPlaces') ?? 'Decimals'}</TableHead>
                      <TableHead>{t('finance.baseCurrency') ?? 'Base'}</TableHead>
                      <TableHead>{t('events.status') ?? 'Status'}</TableHead>
                      <TableHead className="w-[100px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currencies.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-16 text-center text-muted-foreground">
                          {t('finance.noCurrencies') ?? 'No currencies yet'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      currencies.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.code}</TableCell>
                          <TableCell>{c.name}</TableCell>
                          <TableCell>{c.symbol ?? '—'}</TableCell>
                          <TableCell>{c.decimalPlaces}</TableCell>
                          <TableCell>
                            {c.isBase ? (
                              <Badge variant="default" className="gap-1">
                                <Star className="h-3 w-3" /> {t('events.yes') ?? 'Yes'}
                              </Badge>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={c.isActive ? 'default' : 'secondary'}>
                              {c.isActive ? (t('events.active') ?? 'Active') : (t('events.inactive') ?? 'Inactive')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditCurrency(c);
                                  setCurrencyForm({
                                    code: c.code,
                                    name: c.name,
                                    symbol: c.symbol ?? '',
                                    decimalPlaces: c.decimalPlaces,
                                    isBase: c.isBase,
                                    isActive: c.isActive,
                                  });
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                disabled={c.isBase}
                                onClick={() => setDeleteCurrencyId(c.id)}
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
        </TabsContent>

        {/* Income categories tab */}
        <TabsContent value="income-categories" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t('finance.incomeCategories') ?? 'Income categories'}</CardTitle>
                <CardDescription>{t('finance.orgLevelIncomeCategoryDesc') ?? 'Org-level income categories'}</CardDescription>
              </div>
              <Button size="sm" onClick={() => setIncomeFormOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> {t('common.add') ?? 'Add'}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('common.name') ?? 'Name'}</TableHead>
                      <TableHead>{t('common.code') ?? 'Code'}</TableHead>
                      <TableHead className="text-center">{t('events.status') ?? 'Status'}</TableHead>
                      <TableHead className="w-[100px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incomeCategories.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-16 text-center text-muted-foreground">
                          {t('organizationAdmin.noIncomeCategories') ?? 'No income categories yet'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      incomeCategories.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell>{c.code ?? '—'}</TableCell>
                          <TableCell className="text-center">{c.isActive ? (t('events.active') ?? 'Active') : (t('events.inactive') ?? 'Inactive')}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditIncome(c);
                                  setIncomeForm({
                                    name: c.name,
                                    code: c.code ?? '',
                                    description: c.description ?? '',
                                    isRestricted: c.isRestricted ?? false,
                                    isActive: c.isActive ?? true,
                                  });
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setDeleteIncomeId(c.id)}
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
        </TabsContent>

        {/* Expense categories tab */}
        <TabsContent value="expense-categories" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t('finance.expenseCategories') ?? 'Expense categories'}</CardTitle>
                <CardDescription>{t('finance.orgLevelExpenseCategoryDesc') ?? 'Org-level expense categories'}</CardDescription>
              </div>
              <Button size="sm" onClick={() => setExpenseFormOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> {t('common.add') ?? 'Add'}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('common.name') ?? 'Name'}</TableHead>
                      <TableHead>{t('common.code') ?? 'Code'}</TableHead>
                      <TableHead className="text-center">{t('events.status') ?? 'Status'}</TableHead>
                      <TableHead className="w-[100px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenseCategories.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-16 text-center text-muted-foreground">
                          {t('organizationAdmin.noExpenseCategories') ?? 'No expense categories yet'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      expenseCategories.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell>{c.code ?? '—'}</TableCell>
                          <TableCell className="text-center">{c.isActive ? (t('events.active') ?? 'Active') : (t('events.inactive') ?? 'Inactive')}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditExpense(c);
                                  setExpenseForm({
                                    name: c.name,
                                    code: c.code ?? '',
                                    description: c.description ?? '',
                                    isActive: c.isActive ?? true,
                                  });
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setDeleteExpenseId(c.id)}
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
        </TabsContent>

        {/* Exchange rates tab */}
        <TabsContent value="exchange-rates" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5" />
                  {t('finance.exchangeRates') ?? 'Exchange rates'}
                </CardTitle>
                <CardDescription>
                  {exchangeRates.length} {t('finance.ratesFound') ?? 'rates'}
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => setRateFormOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> {t('finance.addExchangeRate') ?? 'Add rate'}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('finance.fromCurrency') ?? 'From'}</TableHead>
                      <TableHead>{t('finance.toCurrency') ?? 'To'}</TableHead>
                      <TableHead>{t('finance.exchangeRate') ?? 'Rate'}</TableHead>
                      <TableHead>{t('finance.effectiveDate') ?? 'Effective date'}</TableHead>
                      <TableHead>{t('events.status') ?? 'Status'}</TableHead>
                      <TableHead className="w-[100px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exchangeRates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-16 text-center text-muted-foreground">
                          {t('finance.noExchangeRates') ?? 'No exchange rates yet'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      exchangeRates.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>{r.fromCurrency?.code ?? r.fromCurrencyId}</TableCell>
                          <TableCell>{r.toCurrency?.code ?? r.toCurrencyId}</TableCell>
                          <TableCell className="font-medium">{r.rate.toFixed(4)}</TableCell>
                          <TableCell>{formatDate(r.effectiveDate)}</TableCell>
                          <TableCell>
                            <Badge variant={r.isActive ? 'default' : 'secondary'}>
                              {r.isActive ? (t('events.active') ?? 'Active') : (t('events.inactive') ?? 'Inactive')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditRate(r);
                                  setRateForm({
                                    fromCurrencyId: r.fromCurrencyId,
                                    toCurrencyId: r.toCurrencyId,
                                    rate: r.rate,
                                    effectiveDate:
                                      r.effectiveDate instanceof Date
                                        ? dateToLocalYYYYMMDD(r.effectiveDate)
                                        : dateToLocalYYYYMMDD(new Date(r.effectiveDate)),
                                    notes: r.notes ?? '',
                                    isActive: r.isActive,
                                  });
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setDeleteRateId(r.id)}
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
        </TabsContent>
      </Tabs>

      {/* Currency create dialog */}
      <Dialog open={currencyFormOpen} onOpenChange={(o) => { setCurrencyFormOpen(o); if (!o) resetCurrencyForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('finance.addCurrency') ?? 'Add currency'}</DialogTitle>
            <DialogDescription>{t('finance.addCurrencyDescription') ?? 'Create a new currency'}</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreateCurrency();
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('finance.currencyCode') ?? 'Code'} *</Label>
                <Input
                  value={currencyForm.code}
                  onChange={(e) => setCurrencyForm({ ...currencyForm, code: e.target.value.toUpperCase() })}
                  placeholder="USD"
                  maxLength={3}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('events.name') ?? 'Name'} *</Label>
                <Input
                  value={currencyForm.name}
                  onChange={(e) => setCurrencyForm({ ...currencyForm, name: e.target.value })}
                  placeholder="US Dollar"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('finance.currencySymbol') ?? 'Symbol'}</Label>
                <Input
                  value={currencyForm.symbol ?? ''}
                  onChange={(e) => setCurrencyForm({ ...currencyForm, symbol: e.target.value })}
                  placeholder="$"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('finance.decimalPlaces') ?? 'Decimal places'}</Label>
                <Input
                  type="number"
                  min={0}
                  max={6}
                  value={currencyForm.decimalPlaces}
                  onChange={(e) =>
                    setCurrencyForm({
                      ...currencyForm,
                      decimalPlaces: Number.parseInt(e.target.value, 10) || 2,
                    })
                  }
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={currencyForm.isBase}
                  onCheckedChange={(c) => setCurrencyForm({ ...currencyForm, isBase: c })}
                />
                <Label>{t('finance.baseCurrency') ?? 'Base currency'}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={currencyForm.isActive}
                  onCheckedChange={(c) => setCurrencyForm({ ...currencyForm, isActive: c })}
                />
                <Label>{t('events.active') ?? 'Active'}</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createCurrency.isPending || !currencyForm.code || !currencyForm.name}>
                {t('events.create') ?? 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Currency edit dialog */}
      <Dialog open={!!editCurrency} onOpenChange={(o) => { if (!o) resetCurrencyForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('finance.editCurrency') ?? 'Edit currency'}</DialogTitle>
          </DialogHeader>
          {editCurrency && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdateCurrency();
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('finance.currencyCode') ?? 'Code'}</Label>
                  <Input value={currencyForm.code} disabled />
                </div>
                <div className="space-y-2">
                  <Label>{t('events.name') ?? 'Name'} *</Label>
                  <Input
                    value={currencyForm.name}
                    onChange={(e) => setCurrencyForm({ ...currencyForm, name: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('finance.currencySymbol') ?? 'Symbol'}</Label>
                  <Input
                    value={currencyForm.symbol ?? ''}
                    onChange={(e) => setCurrencyForm({ ...currencyForm, symbol: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('finance.decimalPlaces') ?? 'Decimal places'}</Label>
                  <Input
                    type="number"
                    min={0}
                    max={6}
                    value={currencyForm.decimalPlaces}
                    onChange={(e) =>
                      setCurrencyForm({ ...currencyForm, decimalPlaces: Number.parseInt(e.target.value, 10) || 2 })
                    }
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={currencyForm.isBase}
                    onCheckedChange={(c) => setCurrencyForm({ ...currencyForm, isBase: c })}
                  />
                  <Label>{t('finance.baseCurrency') ?? 'Base currency'}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={currencyForm.isActive}
                    onCheckedChange={(c) => setCurrencyForm({ ...currencyForm, isActive: c })}
                  />
                  <Label>{t('events.active') ?? 'Active'}</Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={updateCurrency.isPending || !currencyForm.name}>
                  {t('events.update') ?? 'Update'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Exchange rate create dialog */}
      <Dialog open={rateFormOpen} onOpenChange={(o) => { setRateFormOpen(o); if (!o) resetRateForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('finance.addExchangeRate') ?? 'Add exchange rate'}</DialogTitle>
            <DialogDescription>{t('finance.addExchangeRateDescription') ?? 'Create a new exchange rate'}</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreateRate();
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('finance.fromCurrency') ?? 'From currency'} *</Label>
                <Select
                  value={rateForm.fromCurrencyId}
                  onValueChange={(v) => setRateForm({ ...rateForm, fromCurrencyId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('finance.selectCurrency') ?? 'Select'} />
                  </SelectTrigger>
                  <SelectContent>
                    {currenciesForRates
                      .filter((c) => c.id !== rateForm.toCurrencyId)
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.code} – {c.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('finance.toCurrency') ?? 'To currency'} *</Label>
                <Select
                  value={rateForm.toCurrencyId}
                  onValueChange={(v) => setRateForm({ ...rateForm, toCurrencyId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('finance.selectCurrency') ?? 'Select'} />
                  </SelectTrigger>
                  <SelectContent>
                    {currenciesForRates
                      .filter((c) => c.id !== rateForm.fromCurrencyId)
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.code} – {c.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('finance.exchangeRate') ?? 'Rate'} *</Label>
                <Input
                  type="number"
                  min={0.000001}
                  step={0.000001}
                  value={rateForm.rate || ''}
                  onChange={(e) => setRateForm({ ...rateForm, rate: parseFloat(e.target.value) || 0 })}
                  placeholder="1.0"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('finance.effectiveDate') ?? 'Effective date'}</Label>
                <CalendarDatePicker
                  date={rateForm.effectiveDate ? parseLocalDate(rateForm.effectiveDate) : undefined}
                  onDateChange={(d) =>
                    setRateForm({ ...rateForm, effectiveDate: d ? dateToLocalYYYYMMDD(d) : '' })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('events.notes') ?? 'Notes'}</Label>
              <Textarea
                value={rateForm.notes ?? ''}
                onChange={(e) => setRateForm({ ...rateForm, notes: e.target.value })}
                rows={2}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={rateForm.isActive}
                onCheckedChange={(c) => setRateForm({ ...rateForm, isActive: c })}
              />
              <Label>{t('events.active') ?? 'Active'}</Label>
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={
                  createRate.isPending ||
                  !rateForm.fromCurrencyId ||
                  !rateForm.toCurrencyId ||
                  rateForm.rate <= 0
                }
              >
                {t('events.create') ?? 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Exchange rate edit dialog */}
      <Dialog open={!!editRate} onOpenChange={(o) => { if (!o) resetRateForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('finance.editExchangeRate') ?? 'Edit exchange rate'}</DialogTitle>
          </DialogHeader>
          {editRate && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdateRate();
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('finance.fromCurrency') ?? 'From'} *</Label>
                  <Select
                    value={rateForm.fromCurrencyId}
                    onValueChange={(v) => setRateForm({ ...rateForm, fromCurrencyId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currenciesForRates
                        .filter((c) => c.id !== rateForm.toCurrencyId)
                        .map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.code} – {c.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('finance.toCurrency') ?? 'To'} *</Label>
                  <Select
                    value={rateForm.toCurrencyId}
                    onValueChange={(v) => setRateForm({ ...rateForm, toCurrencyId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currenciesForRates
                        .filter((c) => c.id !== rateForm.fromCurrencyId)
                        .map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.code} – {c.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('finance.exchangeRate') ?? 'Rate'} *</Label>
                  <Input
                    type="number"
                    min={0.000001}
                    value={rateForm.rate || ''}
                    onChange={(e) => setRateForm({ ...rateForm, rate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('finance.effectiveDate') ?? 'Effective date'}</Label>
                  <CalendarDatePicker
                    date={rateForm.effectiveDate ? parseLocalDate(rateForm.effectiveDate) : undefined}
                    onDateChange={(d) =>
                      setRateForm({ ...rateForm, effectiveDate: d ? dateToLocalYYYYMMDD(d) : '' })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('events.notes') ?? 'Notes'}</Label>
                <Textarea
                  value={rateForm.notes ?? ''}
                  onChange={(e) => setRateForm({ ...rateForm, notes: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={rateForm.isActive}
                  onCheckedChange={(c) => setRateForm({ ...rateForm, isActive: c })}
                />
                <Label>{t('events.active') ?? 'Active'}</Label>
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={
                    updateRate.isPending ||
                    !rateForm.fromCurrencyId ||
                    !rateForm.toCurrencyId ||
                    rateForm.rate <= 0
                  }
                >
                  {t('events.update') ?? 'Update'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Income category dialogs */}
      <Dialog open={incomeFormOpen} onOpenChange={(o) => { setIncomeFormOpen(o); if (!o) resetIncomeForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('finance.addIncomeCategory') ?? 'Add income category'}</DialogTitle>
            <DialogDescription>{t('finance.orgLevelIncomeCategoryDesc') ?? 'Org-level income category'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleCreateIncome(); }} className="space-y-4">
            <div className="space-y-2"><Label>{t('common.name') ?? 'Name'} *</Label><Input value={incomeForm.name} onChange={(e) => setIncomeForm({ ...incomeForm, name: e.target.value })} placeholder={t('finance.categoryNamePlaceholder')} /></div>
            <div className="space-y-2"><Label>{t('common.code') ?? 'Code'}</Label><Input value={incomeForm.code ?? ''} onChange={(e) => setIncomeForm({ ...incomeForm, code: e.target.value })} placeholder={t('finance.categoryCodePlaceholder')} /></div>
            <div className="space-y-2"><Label>{t('common.description') ?? 'Description'}</Label><Textarea value={incomeForm.description ?? ''} onChange={(e) => setIncomeForm({ ...incomeForm, description: e.target.value })} placeholder={t('finance.categoryDescriptionPlaceholder')} /></div>
            <div className="flex items-center gap-2"><Switch checked={incomeForm.isActive ?? true} onCheckedChange={(c) => setIncomeForm({ ...incomeForm, isActive: c })} /><Label>{t('events.active') ?? 'Active'}</Label></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setIncomeFormOpen(false)}>{t('common.cancel') ?? 'Cancel'}</Button><Button type="submit" disabled={createIncome.isPending || !incomeForm.name.trim()}>{createIncome.isPending ? (t('common.loading') ?? 'Saving...') : (t('common.save') ?? 'Save')}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={!!editIncome} onOpenChange={(o) => { if (!o) resetIncomeForm(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('finance.editIncomeCategory') ?? 'Edit income category'}</DialogTitle></DialogHeader>
          {editIncome && (
            <form onSubmit={(e) => { e.preventDefault(); handleUpdateIncome(); }} className="space-y-4">
              <div className="space-y-2"><Label>{t('common.name') ?? 'Name'} *</Label><Input value={incomeForm.name} onChange={(e) => setIncomeForm({ ...incomeForm, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>{t('common.code') ?? 'Code'}</Label><Input value={incomeForm.code ?? ''} onChange={(e) => setIncomeForm({ ...incomeForm, code: e.target.value })} /></div>
              <div className="space-y-2"><Label>{t('common.description') ?? 'Description'}</Label><Textarea value={incomeForm.description ?? ''} onChange={(e) => setIncomeForm({ ...incomeForm, description: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={incomeForm.isActive ?? true} onCheckedChange={(c) => setIncomeForm({ ...incomeForm, isActive: c })} /><Label>{t('events.active') ?? 'Active'}</Label></div>
              <DialogFooter><Button type="button" variant="outline" onClick={() => setEditIncome(null)}>{t('common.cancel') ?? 'Cancel'}</Button><Button type="submit" disabled={updateIncome.isPending || !incomeForm.name.trim()}>{updateIncome.isPending ? (t('common.loading') ?? 'Saving...') : (t('common.save') ?? 'Save')}</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Expense category dialogs */}
      <Dialog open={expenseFormOpen} onOpenChange={(o) => { setExpenseFormOpen(o); if (!o) resetExpenseForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('finance.addExpenseCategory') ?? 'Add expense category'}</DialogTitle>
            <DialogDescription>{t('finance.orgLevelExpenseCategoryDesc') ?? 'Org-level expense category'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleCreateExpense(); }} className="space-y-4">
            <div className="space-y-2"><Label>{t('common.name') ?? 'Name'} *</Label><Input value={expenseForm.name} onChange={(e) => setExpenseForm({ ...expenseForm, name: e.target.value })} placeholder={t('finance.categoryNamePlaceholder')} /></div>
            <div className="space-y-2"><Label>{t('common.code') ?? 'Code'}</Label><Input value={expenseForm.code ?? ''} onChange={(e) => setExpenseForm({ ...expenseForm, code: e.target.value })} placeholder={t('finance.categoryCodePlaceholder')} /></div>
            <div className="space-y-2"><Label>{t('common.description') ?? 'Description'}</Label><Textarea value={expenseForm.description ?? ''} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} placeholder={t('finance.categoryDescriptionPlaceholder')} /></div>
            <div className="flex items-center gap-2"><Switch checked={expenseForm.isActive ?? true} onCheckedChange={(c) => setExpenseForm({ ...expenseForm, isActive: c })} /><Label>{t('events.active') ?? 'Active'}</Label></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setExpenseFormOpen(false)}>{t('common.cancel') ?? 'Cancel'}</Button><Button type="submit" disabled={createExpense.isPending || !expenseForm.name.trim()}>{createExpense.isPending ? (t('common.loading') ?? 'Saving...') : (t('common.save') ?? 'Save')}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={!!editExpense} onOpenChange={(o) => { if (!o) resetExpenseForm(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('finance.editExpenseCategory') ?? 'Edit expense category'}</DialogTitle></DialogHeader>
          {editExpense && (
            <form onSubmit={(e) => { e.preventDefault(); handleUpdateExpense(); }} className="space-y-4">
              <div className="space-y-2"><Label>{t('common.name') ?? 'Name'} *</Label><Input value={expenseForm.name} onChange={(e) => setExpenseForm({ ...expenseForm, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>{t('common.code') ?? 'Code'}</Label><Input value={expenseForm.code ?? ''} onChange={(e) => setExpenseForm({ ...expenseForm, code: e.target.value })} /></div>
              <div className="space-y-2"><Label>{t('common.description') ?? 'Description'}</Label><Textarea value={expenseForm.description ?? ''} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={expenseForm.isActive ?? true} onCheckedChange={(c) => setExpenseForm({ ...expenseForm, isActive: c })} /><Label>{t('events.active') ?? 'Active'}</Label></div>
              <DialogFooter><Button type="button" variant="outline" onClick={() => setEditExpense(null)}>{t('common.cancel') ?? 'Cancel'}</Button><Button type="submit" disabled={updateExpense.isPending || !expenseForm.name.trim()}>{updateExpense.isPending ? (t('common.loading') ?? 'Saving...') : (t('common.save') ?? 'Save')}</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmations */}
      <AlertDialog open={!!deleteCurrencyId} onOpenChange={(o) => !o && setDeleteCurrencyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('events.confirmDelete') ?? 'Confirm delete'}</AlertDialogTitle>
            <AlertDialogDescription>{t('finance.deleteCurrencyWarning') ?? 'Delete this currency? This cannot be undone.'}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('events.cancel') ?? 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCurrency} className="bg-destructive text-destructive-foreground">
              {t('events.delete') ?? 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!deleteRateId} onOpenChange={(o) => !o && setDeleteRateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('events.confirmDelete') ?? 'Confirm delete'}</AlertDialogTitle>
            <AlertDialogDescription>{t('finance.deleteExchangeRateWarning') ?? 'Delete this exchange rate? This cannot be undone.'}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('events.cancel') ?? 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRate} className="bg-destructive text-destructive-foreground">
              {t('events.delete') ?? 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!deleteIncomeId} onOpenChange={(o) => !o && setDeleteIncomeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete income category?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel') ?? 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteIncome} className="bg-destructive text-destructive-foreground">
              {t('common.delete') ?? 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!deleteExpenseId} onOpenChange={(o) => !o && setDeleteExpenseId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('finance.deleteExpenseCategoryConfirm') ?? 'Delete expense category?'}</AlertDialogTitle>
            <AlertDialogDescription>{t('library.cannotUndo') ?? 'This cannot be undone.'}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel') ?? 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteExpense} className="bg-destructive text-destructive-foreground">
              {t('common.delete') ?? 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
