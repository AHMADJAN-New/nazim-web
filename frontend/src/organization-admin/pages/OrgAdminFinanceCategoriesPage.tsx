/**
 * Org Admin Finance Categories - Income & Expense categories (tabs)
 */

import { Plus, Pencil, Trash2, FileSpreadsheet, TrendingUp, TrendingDown, Search, X } from 'lucide-react';
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
import {
  useOrgFinanceIncomeCategories,
  useOrgFinanceExpenseCategories,
  useCreateOrgFinanceIncomeCategory,
  useUpdateOrgFinanceIncomeCategory,
  useDeleteOrgFinanceIncomeCategory,
  useCreateOrgFinanceExpenseCategory,
  useUpdateOrgFinanceExpenseCategory,
  useDeleteOrgFinanceExpenseCategory,
} from '@/hooks/useOrgFinance';
import { useLanguage } from '@/hooks/useLanguage';
import type { IncomeCategory, IncomeCategoryFormData, ExpenseCategory, ExpenseCategoryFormData } from '@/types/domain/finance';

export default function OrgAdminFinanceCategoriesPage() {
  const { t, tUnsafe } = useLanguage();
  const { data: incomeCategories = [], isLoading: incomeLoading } = useOrgFinanceIncomeCategories({ isActive: undefined });
  const { data: expenseCategories = [], isLoading: expenseLoading } = useOrgFinanceExpenseCategories({ isActive: undefined });

  const createIncome = useCreateOrgFinanceIncomeCategory();
  const updateIncome = useUpdateOrgFinanceIncomeCategory();
  const deleteIncome = useDeleteOrgFinanceIncomeCategory();
  const createExpense = useCreateOrgFinanceExpenseCategory();
  const updateExpense = useUpdateOrgFinanceExpenseCategory();
  const deleteExpense = useDeleteOrgFinanceExpenseCategory();

  const [incomeFormOpen, setIncomeFormOpen] = useState(false);
  const [editIncome, setEditIncome] = useState<IncomeCategory | null>(null);
  const [deleteIncomeId, setDeleteIncomeId] = useState<string | null>(null);
  const [incomeForm, setIncomeForm] = useState<IncomeCategoryFormData>({ name: '', code: '', description: '', isRestricted: false, isActive: true });

  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<ExpenseCategory | null>(null);
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);
  const [expenseForm, setExpenseForm] = useState<ExpenseCategoryFormData>({ name: '', code: '', description: '', isActive: true });

  const [incomeSearchTerm, setIncomeSearchTerm] = useState('');
  const [expenseSearchTerm, setExpenseSearchTerm] = useState('');

  const filteredIncomeCategories = useMemo(() => {
    if (!incomeSearchTerm.trim()) return incomeCategories;
    const q = incomeSearchTerm.toLowerCase().trim();
    return incomeCategories.filter(
      (c) =>
        (c.name ?? '').toLowerCase().includes(q) ||
        (c.code ?? '').toLowerCase().includes(q)
    );
  }, [incomeCategories, incomeSearchTerm]);

  const filteredExpenseCategories = useMemo(() => {
    if (!expenseSearchTerm.trim()) return expenseCategories;
    const q = expenseSearchTerm.toLowerCase().trim();
    return expenseCategories.filter(
      (c) =>
        (c.name ?? '').toLowerCase().includes(q) ||
        (c.code ?? '').toLowerCase().includes(q)
    );
  }, [expenseCategories, expenseSearchTerm]);

  const hasActiveFilters = !!incomeSearchTerm.trim() || !!expenseSearchTerm.trim();
  const clearFilters = () => {
    setIncomeSearchTerm('');
    setExpenseSearchTerm('');
  };

  const resetIncomeForm = () => {
    setIncomeForm({ name: '', code: '', description: '', isRestricted: false, isActive: true });
    setEditIncome(null);
  };
  const resetExpenseForm = () => {
    setExpenseForm({ name: '', code: '', description: '', isActive: true });
    setEditExpense(null);
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

  const isLoading = incomeLoading || expenseLoading;

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
        title={tUnsafe('organizationAdmin.financeCategories') ?? 'Categories'}
        description={tUnsafe('organizationAdmin.financeCategoriesDesc') ?? 'Income & expense categories'}
        icon={<FileSpreadsheet className="h-5 w-5" />}
      />

      <FilterPanel title={t('events.filters')} defaultOpenDesktop={true} defaultOpenMobile={false}>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs text-muted-foreground mb-1 block">
              {t('finance.incomeCategories')} — {t('events.search')}
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('events.search')}
                value={incomeSearchTerm}
                onChange={(e) => setIncomeSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs text-muted-foreground mb-1 block">
              {t('finance.expenseCategories')} — {t('events.search')}
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('events.search')}
                value={expenseSearchTerm}
                onChange={(e) => setExpenseSearchTerm(e.target.value)}
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

      <Tabs defaultValue="income" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="income" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">{t('finance.incomeCategories')}</span>
          </TabsTrigger>
          <TabsTrigger value="expense" className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            <span className="hidden sm:inline">{t('finance.expenseCategories')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="income" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t('finance.incomeCategories')}</CardTitle>
                <CardDescription>{t('finance.incomeCategoriesDescription')}</CardDescription>
              </div>
              <Button size="sm" onClick={() => setIncomeFormOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> {t('common.add')}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('organizationAdmin.name')}</TableHead>
                      <TableHead>{t('organizationAdmin.code')}</TableHead>
                      <TableHead className="text-center">{t('organizationAdmin.status')}</TableHead>
                      <TableHead className="w-[100px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIncomeCategories.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="h-16 text-center text-muted-foreground">{incomeSearchTerm.trim() ? (t('events.noResults') ?? 'No results') : t('organizationAdmin.noIncomeCategories')}</TableCell></TableRow>
                    ) : (
                      filteredIncomeCategories.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell>{c.code ?? '—'}</TableCell>
                          <TableCell className="text-center">{c.isActive ? t('common.active') : t('common.inactive')}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => { setEditIncome(c); setIncomeForm({ name: c.name, code: c.code ?? '', description: c.description ?? '', isRestricted: c.isRestricted ?? false, isActive: c.isActive ?? true }); }}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteIncomeId(c.id)}><Trash2 className="h-4 w-4" /></Button>
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

        <TabsContent value="expense" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t('finance.expenseCategories')}</CardTitle>
                <CardDescription>{t('finance.expenseCategoriesDescription')}</CardDescription>
              </div>
              <Button size="sm" onClick={() => setExpenseFormOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> {t('common.add')}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('organizationAdmin.name')}</TableHead>
                      <TableHead>{t('organizationAdmin.code')}</TableHead>
                      <TableHead className="text-center">{t('organizationAdmin.status')}</TableHead>
                      <TableHead className="w-[100px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenseCategories.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="h-16 text-center text-muted-foreground">{expenseSearchTerm.trim() ? (t('events.noResults') ?? 'No results') : t('organizationAdmin.noExpenseCategories')}</TableCell></TableRow>
                    ) : (
                      filteredExpenseCategories.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell>{c.code ?? '—'}</TableCell>
                          <TableCell className="text-center">{c.isActive ? t('common.active') : t('common.inactive')}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => { setEditExpense(c); setExpenseForm({ name: c.name, code: c.code ?? '', description: c.description ?? '', isActive: c.isActive ?? true }); }}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteExpenseId(c.id)}><Trash2 className="h-4 w-4" /></Button>
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

      <Dialog open={incomeFormOpen} onOpenChange={(o) => { setIncomeFormOpen(o); if (!o) resetIncomeForm(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('finance.addIncomeCategory')}</DialogTitle><DialogDescription>{t('finance.addIncomeCategoryDescription')}</DialogDescription></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleCreateIncome(); }} className="space-y-4">
            <div className="space-y-2"><Label>{t('organizationAdmin.name')} *</Label><Input value={incomeForm.name} onChange={(e) => setIncomeForm({ ...incomeForm, name: e.target.value })} placeholder={t('finance.categoryNamePlaceholder')} /></div>
            <div className="space-y-2"><Label>{t('organizationAdmin.code')}</Label><Input value={incomeForm.code ?? ''} onChange={(e) => setIncomeForm({ ...incomeForm, code: e.target.value })} placeholder={t('finance.categoryCodePlaceholder')} /></div>
            <div className="space-y-2"><Label>{t('organizationAdmin.description')}</Label><Textarea value={incomeForm.description ?? ''} onChange={(e) => setIncomeForm({ ...incomeForm, description: e.target.value })} placeholder={t('finance.categoryDescriptionPlaceholder')} /></div>
            <div className="flex items-center gap-2"><Switch checked={incomeForm.isActive ?? true} onCheckedChange={(c) => setIncomeForm({ ...incomeForm, isActive: c })} /><Label>{t('common.active')}</Label></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setIncomeFormOpen(false)}>{t('common.cancel')}</Button><Button type="submit" disabled={createIncome.isPending || !incomeForm.name.trim()}>{createIncome.isPending ? t('common.loading') : t('common.save')}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editIncome} onOpenChange={(o) => { if (!o) resetIncomeForm(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('finance.editCategory')}</DialogTitle><DialogDescription>{t('finance.editCategoryDescription')}</DialogDescription></DialogHeader>
          {editIncome && (
            <form onSubmit={(e) => { e.preventDefault(); handleUpdateIncome(); }} className="space-y-4">
              <div className="space-y-2"><Label>{t('organizationAdmin.name')} *</Label><Input value={incomeForm.name} onChange={(e) => setIncomeForm({ ...incomeForm, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>{t('organizationAdmin.code')}</Label><Input value={incomeForm.code ?? ''} onChange={(e) => setIncomeForm({ ...incomeForm, code: e.target.value })} /></div>
              <div className="space-y-2"><Label>{t('organizationAdmin.description')}</Label><Textarea value={incomeForm.description ?? ''} onChange={(e) => setIncomeForm({ ...incomeForm, description: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={incomeForm.isActive ?? true} onCheckedChange={(c) => setIncomeForm({ ...incomeForm, isActive: c })} /><Label>{t('common.active')}</Label></div>
              <DialogFooter><Button type="button" variant="outline" onClick={() => setEditIncome(null)}>{t('common.cancel')}</Button><Button type="submit" disabled={updateIncome.isPending || !incomeForm.name.trim()}>{updateIncome.isPending ? t('common.loading') : t('common.save')}</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={expenseFormOpen} onOpenChange={(o) => { setExpenseFormOpen(o); if (!o) resetExpenseForm(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('finance.addExpenseCategory')}</DialogTitle><DialogDescription>{t('finance.addExpenseCategoryDescription')}</DialogDescription></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleCreateExpense(); }} className="space-y-4">
            <div className="space-y-2"><Label>{t('organizationAdmin.name')} *</Label><Input value={expenseForm.name} onChange={(e) => setExpenseForm({ ...expenseForm, name: e.target.value })} placeholder={t('finance.categoryNamePlaceholder')} /></div>
            <div className="space-y-2"><Label>{t('organizationAdmin.code')}</Label><Input value={expenseForm.code ?? ''} onChange={(e) => setExpenseForm({ ...expenseForm, code: e.target.value })} placeholder={t('finance.categoryCodePlaceholder')} /></div>
            <div className="space-y-2"><Label>{t('organizationAdmin.description')}</Label><Textarea value={expenseForm.description ?? ''} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} placeholder={t('finance.categoryDescriptionPlaceholder')} /></div>
            <div className="flex items-center gap-2"><Switch checked={expenseForm.isActive ?? true} onCheckedChange={(c) => setExpenseForm({ ...expenseForm, isActive: c })} /><Label>{t('common.active')}</Label></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setExpenseFormOpen(false)}>{t('common.cancel')}</Button><Button type="submit" disabled={createExpense.isPending || !expenseForm.name.trim()}>{createExpense.isPending ? t('common.loading') : t('common.save')}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editExpense} onOpenChange={(o) => { if (!o) resetExpenseForm(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('finance.editCategory')}</DialogTitle><DialogDescription>{t('finance.editCategoryDescription')}</DialogDescription></DialogHeader>
          {editExpense && (
            <form onSubmit={(e) => { e.preventDefault(); handleUpdateExpense(); }} className="space-y-4">
              <div className="space-y-2"><Label>{t('organizationAdmin.name')} *</Label><Input value={expenseForm.name} onChange={(e) => setExpenseForm({ ...expenseForm, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>{t('organizationAdmin.code')}</Label><Input value={expenseForm.code ?? ''} onChange={(e) => setExpenseForm({ ...expenseForm, code: e.target.value })} /></div>
              <div className="space-y-2"><Label>{t('organizationAdmin.description')}</Label><Textarea value={expenseForm.description ?? ''} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={expenseForm.isActive ?? true} onCheckedChange={(c) => setExpenseForm({ ...expenseForm, isActive: c })} /><Label>{t('common.active')}</Label></div>
              <DialogFooter><Button type="button" variant="outline" onClick={() => setEditExpense(null)}>{t('common.cancel')}</Button><Button type="submit" disabled={updateExpense.isPending || !expenseForm.name.trim()}>{updateExpense.isPending ? t('common.loading') : t('common.save')}</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteIncomeId} onOpenChange={(o) => !o && setDeleteIncomeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{t('common.delete')}?</AlertDialogTitle><AlertDialogDescription>{t('finance.deleteCategoryWarning')}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={handleDeleteIncome} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t('common.delete')}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!deleteExpenseId} onOpenChange={(o) => !o && setDeleteExpenseId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{t('common.delete')}?</AlertDialogTitle><AlertDialogDescription>{t('finance.deleteCategoryWarning')}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={handleDeleteExpense} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t('common.delete')}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
