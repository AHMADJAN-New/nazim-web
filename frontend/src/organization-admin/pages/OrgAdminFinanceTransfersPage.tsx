import { useState, useMemo } from 'react';
import { ArrowRightLeft, History, Send } from 'lucide-react';

import { PageHeader } from '@/components/layout/PageHeader';
import { FilterPanel } from '@/components/layout/FilterPanel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';
import { LoadingSpinner } from '@/components/ui/loading';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useSchools } from '@/hooks/useSchools';
import {
  useOrgFinanceAccounts,
  useOrgFinanceExpenseCategories,
  useOrgFinanceTransfers,
  useCreateOrgFinanceTransfer,
  useSchoolFinanceAccounts,
  useSchoolIncomeCategories,
} from '@/hooks/useOrgFinance';
import type { OrgSchoolTransferRow } from '@/hooks/useOrgFinance';
import { dateToLocalYYYYMMDD, parseLocalDate } from '@/lib/dateUtils';
import { formatDate } from '@/lib/utils';

const numberFormatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function OrgAdminFinanceTransfersPage() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('new');

  // Create form state
  const [schoolId, setSchoolId] = useState<string>('');
  const [orgAccountId, setOrgAccountId] = useState<string>('');
  const [schoolAccountId, setSchoolAccountId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [transferDate, setTransferDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [orgExpenseCategoryId, setOrgExpenseCategoryId] = useState<string>('');
  const [schoolIncomeCategoryId, setSchoolIncomeCategoryId] = useState<string>('');
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // History filters
  const [filterSchoolId, setFilterSchoolId] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [appliedSchoolId, setAppliedSchoolId] = useState<string>('');
  const [appliedDateFrom, setAppliedDateFrom] = useState<string>('');
  const [appliedDateTo, setAppliedDateTo] = useState<string>('');

  const { data: schools = [] } = useSchools(profile?.organization_id ?? undefined);
  const { data: orgAccounts = [] } = useOrgFinanceAccounts({ isActive: true });
  const { data: orgExpenseCategories = [] } = useOrgFinanceExpenseCategories({ isActive: true });
  const { data: schoolAccounts = [] } = useSchoolFinanceAccounts(schoolId || null);
  const { data: schoolIncomeCategories = [] } = useSchoolIncomeCategories(schoolId || null);
  const { data: transfers = [], isLoading: transfersLoading } = useOrgFinanceTransfers({
    schoolId: appliedSchoolId || undefined,
    dateFrom: appliedDateFrom || undefined,
    dateTo: appliedDateTo || undefined,
    perPage: 100,
  });
  const createTransfer = useCreateOrgFinanceTransfer();

  const resetForm = () => {
    setSchoolId('');
    setSchoolAccountId('');
    setOrgAccountId('');
    setAmount('');
    setTransferDate(new Date().toISOString().slice(0, 10));
    setOrgExpenseCategoryId('');
    setSchoolIncomeCategoryId('');
    setReferenceNo('');
    setNotes('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId || !orgAccountId || !schoolAccountId || !amount || !transferDate || !orgExpenseCategoryId || !schoolIncomeCategoryId) return;
    const num = parseFloat(amount);
    if (Number.isNaN(num) || num <= 0) return;
    createTransfer.mutate(
      {
        school_id: schoolId,
        org_account_id: orgAccountId,
        school_account_id: schoolAccountId,
        amount: num,
        transfer_date: transferDate,
        org_expense_category_id: orgExpenseCategoryId,
        school_income_category_id: schoolIncomeCategoryId,
        reference_no: referenceNo || undefined,
        notes: notes || undefined,
      },
      { onSuccess: () => { resetForm(); setActiveTab('history'); } }
    );
  };

  const canSubmit =
    schoolId &&
    orgAccountId &&
    schoolAccountId &&
    amount &&
    parseFloat(amount) > 0 &&
    transferDate &&
    orgExpenseCategoryId &&
    schoolIncomeCategoryId;

  const applyFilters = () => {
    setAppliedSchoolId(filterSchoolId);
    setAppliedDateFrom(filterDateFrom);
    setAppliedDateTo(filterDateTo);
  };

  const clearFilters = () => {
    setFilterSchoolId('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setAppliedSchoolId('');
    setAppliedDateFrom('');
    setAppliedDateTo('');
  };

  const hasActiveFilters = appliedSchoolId || appliedDateFrom || appliedDateTo;
  const totalAmount = useMemo(() => {
    return transfers.reduce((sum, tr) => sum + (typeof tr.amount === 'string' ? parseFloat(tr.amount) : tr.amount), 0);
  }, [transfers]);

  return (
    <div className="container mx-auto max-w-7xl space-y-6 overflow-x-hidden p-4 md:p-6">
      <PageHeader
        title={t('organizationAdmin.financeTransferToSchool')}
        description={t('organizationAdmin.financeTransferDesc')}
        icon={<ArrowRightLeft className="h-5 w-5" />}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="new" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">{t('organizationAdmin.newTransfer')}</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">{t('organizationAdmin.transferHistoryAndReport')}</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: New transfer */}
        <TabsContent value="new" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('organizationAdmin.newTransfer')}</CardTitle>
              <CardDescription>
                {t('organizationAdmin.transferCreatesOrgExpenseAndSchoolIncome')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label>{t('organizationAdmin.schoolDestination')}</Label>
                    <Select value={schoolId} onValueChange={(v) => { setSchoolId(v); setSchoolAccountId(''); setSchoolIncomeCategoryId(''); }}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('organizationAdmin.selectSchool')} />
                      </SelectTrigger>
                      <SelectContent>
                        {schools.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.schoolName ?? s.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('organizationAdmin.orgAccountSource')}</Label>
                    <Select value={orgAccountId} onValueChange={setOrgAccountId}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('organizationAdmin.selectOrgAccount')} />
                      </SelectTrigger>
                      <SelectContent>
                        {orgAccounts.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name} {a.code ? `(${a.code})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('organizationAdmin.schoolAccountDestination')}</Label>
                    <Select value={schoolAccountId} onValueChange={setSchoolAccountId} disabled={!schoolId}>
                      <SelectTrigger>
                        <SelectValue placeholder={schoolId ? t('organizationAdmin.selectSchoolAccount') : t('organizationAdmin.selectSchoolFirst')} />
                      </SelectTrigger>
                      <SelectContent>
                        {(Array.isArray(schoolAccounts) ? schoolAccounts : []).map((a: { id: string; name: string; code?: string | null }) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name} {a.code ? `(${a.code})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('finance.amount')}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('organizationAdmin.transferDate')}</Label>
                    <CalendarDatePicker
                      date={transferDate ? parseLocalDate(transferDate) : undefined}
                      onDateChange={(date) => setTransferDate(date ? dateToLocalYYYYMMDD(date) : '')}
                      placeholder={t('organizationAdmin.transferDate')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('organizationAdmin.orgExpenseCategory')}</Label>
                    <Select value={orgExpenseCategoryId} onValueChange={setOrgExpenseCategoryId}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('finance.selectCategory')} />
                      </SelectTrigger>
                      <SelectContent>
                        {orgExpenseCategories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                    <Label>{t('organizationAdmin.schoolIncomeCategory')}</Label>
                    <Select value={schoolIncomeCategoryId} onValueChange={setSchoolIncomeCategoryId} disabled={!schoolId}>
                      <SelectTrigger>
                        <SelectValue placeholder={schoolId ? t('finance.selectCategory') : t('organizationAdmin.selectSchoolFirst')} />
                      </SelectTrigger>
                      <SelectContent>
                        {(Array.isArray(schoolIncomeCategories) ? schoolIncomeCategories : []).map((c: { id: string; name: string }) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('organizationAdmin.referenceOptional')}</Label>
                    <Input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder={t('organizationAdmin.referenceTransferPlaceholder')} />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>{t('organizationAdmin.notesOptional')}</Label>
                    <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('finance.notesPlaceholder')} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={!canSubmit || createTransfer.isPending}>
                    {createTransfer.isPending ? t('common.loading') : t('organizationAdmin.createTransfer')}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    {t('common.reset')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: History & report */}
        <TabsContent value="history" className="mt-6 space-y-4">
          <FilterPanel
            title={t('organizationAdmin.transferFilters')}
            defaultOpenDesktop={true}
            defaultOpenMobile={false}
            footer={
              <div className="flex flex-wrap gap-2 pt-2">
                <Button size="sm" onClick={applyFilters}>
                  {t('organizationAdmin.applyFilters')}
                </Button>
                {hasActiveFilters && (
                  <Button size="sm" variant="outline" onClick={clearFilters}>
                    {t('organizationAdmin.clearFilters')}
                  </Button>
                )}
              </div>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-muted-foreground">{t('organizationAdmin.filterBySchool')}</Label>
                <Select
                  value={filterSchoolId === '' ? '__all__' : filterSchoolId}
                  onValueChange={(v) => setFilterSchoolId(v === '__all__' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('organizationAdmin.allSchools')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">{t('organizationAdmin.allSchools')}</SelectItem>
                    {schools.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.schoolName ?? s.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">{t('organizationAdmin.dateFrom')}</Label>
                <CalendarDatePicker
                  date={filterDateFrom ? parseLocalDate(filterDateFrom) : undefined}
                  onDateChange={(d) => setFilterDateFrom(d ? dateToLocalYYYYMMDD(d) : '')}
                  placeholder={t('organizationAdmin.dateFrom')}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">{t('organizationAdmin.dateTo')}</Label>
                <CalendarDatePicker
                  date={filterDateTo ? parseLocalDate(filterDateTo) : undefined}
                  onDateChange={(d) => setFilterDateTo(d ? dateToLocalYYYYMMDD(d) : '')}
                  placeholder={t('organizationAdmin.dateTo')}
                />
              </div>
            </div>
          </FilterPanel>

          <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>{t('organizationAdmin.pastTransfers')}</CardTitle>
                <CardDescription>
                  {t('organizationAdmin.transferTableDescription')}
                  {hasActiveFilters && (
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {appliedDateFrom && `${t('organizationAdmin.dateFrom')}: ${formatDate(parseLocalDate(appliedDateFrom))}`}
                      {appliedDateFrom && appliedDateTo && ' · '}
                      {appliedDateTo && `${t('organizationAdmin.dateTo')}: ${formatDate(parseLocalDate(appliedDateTo))}`}
                    </span>
                  )}
                </CardDescription>
              </div>
              {transfers.length > 0 && (
                <div className="text-sm font-medium text-muted-foreground">
                  Total: {numberFormatter.format(totalAmount)}
                  {transfers[0]?.currency?.code ? ` ${transfers[0].currency.code}` : ''}
                </div>
              )}
            </CardHeader>
            <CardContent>
              {transfersLoading ? (
                <div className="flex h-40 items-center justify-center">
                  <LoadingSpinner />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('organizationAdmin.date')}</TableHead>
                        <TableHead>{t('organizationAdmin.school')}</TableHead>
                        <TableHead className="hidden md:table-cell">{t('organizationAdmin.fromOrg')}</TableHead>
                        <TableHead className="hidden lg:table-cell">{t('organizationAdmin.toSchool')}</TableHead>
                        <TableHead className="text-right">{t('organizationAdmin.amount')}</TableHead>
                        <TableHead className="hidden sm:table-cell">{t('organizationAdmin.ref')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transfers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                            {t('organizationAdmin.noTransfersYet')}
                          </TableCell>
                        </TableRow>
                      ) : (
                        transfers.map((row: OrgSchoolTransferRow) => (
                          <TableRow key={row.id}>
                            <TableCell className="whitespace-nowrap font-medium">
                              {row.transfer_date ? formatDate(row.transfer_date) : '—'}
                            </TableCell>
                            <TableCell>{row.school?.name ?? row.school_id}</TableCell>
                            <TableCell className="hidden md:table-cell">{row.org_account?.name ?? row.org_account_id}</TableCell>
                            <TableCell className="hidden lg:table-cell">{row.school_account?.name ?? row.school_account_id}</TableCell>
                            <TableCell className="text-right font-medium">
                              {numberFormatter.format(typeof row.amount === 'string' ? parseFloat(row.amount) : row.amount)}
                              {row.currency?.code ? ` ${row.currency.code}` : ''}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-muted-foreground">{row.reference_no ?? '—'}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
