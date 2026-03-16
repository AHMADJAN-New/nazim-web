import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, FileSpreadsheet, Play, Plus, Receipt, ShieldCheck, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import { PageHeader } from '@/components/layout/PageHeader';
import { LoadingSpinner } from '@/components/ui/loading';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  useCalculateOrgHrPayrollRun,
  useCreateOrgHrCompensation,
  useCreateOrgHrPayrollPeriod,
  useCreateOrgHrPayrollRun,
  useDeleteOrgHrCompensation,
  useFinalizeOrgHrPayrollRun,
  useMarkOrgHrPayrollRunPaid,
  useOrgHrCompensation,
  useOrgHrPayrollPeriods,
  useOrgHrPayrollRun,
  useOrgHrPayrollRuns,
  useOrgHrStaff,
  useUpdateOrgHrCompensation,
  type OrgHrCompensationProfile,
  type OrgHrPayrollRun,
} from '@/hooks/orgHr/useOrgHr';
import { useOrgFinanceAccounts, useOrgFinanceExpenseCategories } from '@/hooks/useOrgFinance';
import { useHasPermission } from '@/hooks/usePermissions';
import { useLanguage } from '@/hooks/useLanguage';
import {
  orgHrCompensationCreateSchema,
  orgHrPayrollPeriodCreateSchema,
  orgHrPayrollRunCreateSchema,
  type OrgHrCompensationCreateFormData,
  type OrgHrPayrollPeriodCreateFormData,
  type OrgHrPayrollRunCreateFormData,
} from '@/lib/validations/orgHr';
import { formatDate } from '@/lib/utils';

const numberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

const runStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'paid':
      return 'default';
    case 'finalized':
      return 'secondary';
    case 'processing':
      return 'outline';
    default:
      return 'outline';
  }
};

function formatStaffName(profile: Pick<OrgHrCompensationProfile, 'staffFirstName' | 'staffFatherName' | 'staffId'>): string {
  const name = [profile.staffFirstName, profile.staffFatherName].filter(Boolean).join(' ').trim();
  return name || profile.staffId.slice(0, 8);
}

function formatRunName(run: OrgHrPayrollRun): string {
  return run.runName || `${run.payrollPeriodName} Run`;
}

export default function OrganizationHrPayrollPage() {
  const { t, tUnsafe } = useLanguage();
  const [activeTab, setActiveTab] = useState('runs');
  const [compDialogOpen, setCompDialogOpen] = useState(false);
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false);
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [editingComp, setEditingComp] = useState<OrgHrCompensationProfile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OrgHrCompensationProfile | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [markPaidRun, setMarkPaidRun] = useState<OrgHrPayrollRun | null>(null);
  const [markPaidAccountId, setMarkPaidAccountId] = useState<string>('');
  const [markPaidCategoryId, setMarkPaidCategoryId] = useState<string>('');

  const hasPayrollRead = useHasPermission('hr_payroll.read');
  const hasPayrollCreate = useHasPermission('hr_payroll.create');
  const hasPayrollRun = useHasPermission('hr_payroll.run');
  const hasPayrollApprove = useHasPermission('hr_payroll.approve');

  const { data: staffList } = useOrgHrStaff({ perPage: 150, status: 'active' });
  const { data: orgFinanceAccounts = [] } = useOrgFinanceAccounts({ isActive: true });
  const { data: orgExpenseCategories = [] } = useOrgFinanceExpenseCategories({ isActive: true });
  const { data: compensation, isLoading: compLoading } = useOrgHrCompensation();
  const { data: periods, isLoading: periodsLoading } = useOrgHrPayrollPeriods();
  const { data: runsData, isLoading: runsLoading } = useOrgHrPayrollRuns();
  const { data: runDetail, isLoading: runDetailLoading } = useOrgHrPayrollRun(selectedRunId);

  const createCompMutation = useCreateOrgHrCompensation();
  const updateCompMutation = useUpdateOrgHrCompensation();
  const deleteCompMutation = useDeleteOrgHrCompensation();
  const createPeriodMutation = useCreateOrgHrPayrollPeriod();
  const createRunMutation = useCreateOrgHrPayrollRun();
  const calculateRunMutation = useCalculateOrgHrPayrollRun();
  const finalizeRunMutation = useFinalizeOrgHrPayrollRun();
  const markPaidMutation = useMarkOrgHrPayrollRunPaid();

  const compensationProfiles = useMemo(() => compensation?.data ?? [], [compensation]);
  const payrollPeriods = useMemo(() => periods ?? [], [periods]);
  const payrollRuns = useMemo(() => runsData?.data ?? [], [runsData]);
  const staffOptions = useMemo(() => staffList?.data ?? [], [staffList]);

  const availableRunPeriods = useMemo(() => {
    const usedPeriodIds = new Set(payrollRuns.map((run) => run.payrollPeriodId));
    return payrollPeriods.filter((period) => !usedPeriodIds.has(period.id));
  }, [payrollPeriods, payrollRuns]);

  const compForm = useForm<OrgHrCompensationCreateFormData>({
    resolver: zodResolver(orgHrCompensationCreateSchema),
    defaultValues: {
      staff_id: '',
      base_salary: 0,
      pay_frequency: 'monthly',
      currency: 'AFN',
      grade: '',
      step: '',
      effective_from: new Date().toISOString().slice(0, 10),
      effective_to: null,
      status: 'active',
      legacy_salary_notes: '',
    },
  });

  const periodForm = useForm<OrgHrPayrollPeriodCreateFormData>({
    resolver: zodResolver(orgHrPayrollPeriodCreateSchema),
    defaultValues: {
      name: '',
      period_start: new Date().toISOString().slice(0, 10),
      period_end: new Date().toISOString().slice(0, 10),
      pay_date: null,
    },
  });

  const runForm = useForm<OrgHrPayrollRunCreateFormData>({
    resolver: zodResolver(orgHrPayrollRunCreateSchema),
    defaultValues: {
      payroll_period_id: '',
      run_name: '',
    },
  });

  useEffect(() => {
    if (!compDialogOpen) {
      return;
    }

    if (editingComp) {
      compForm.reset({
        staff_id: editingComp.staffId,
        base_salary: editingComp.baseSalary,
        pay_frequency: editingComp.payFrequency as OrgHrCompensationCreateFormData['pay_frequency'],
        currency: editingComp.currency,
        grade: editingComp.grade ?? '',
        step: editingComp.step ?? '',
        effective_from: editingComp.effectiveFrom,
        effective_to: editingComp.effectiveTo,
        status: editingComp.status === 'inactive' ? 'inactive' : 'active',
        legacy_salary_notes: '',
      });
      return;
    }

    compForm.reset({
      staff_id: '',
      base_salary: 0,
      pay_frequency: 'monthly',
      currency: 'AFN',
      grade: '',
      step: '',
      effective_from: new Date().toISOString().slice(0, 10),
      effective_to: null,
      status: 'active',
      legacy_salary_notes: '',
    });
  }, [compDialogOpen, compForm, editingComp]);

  const openCreateCompDialog = () => {
    setEditingComp(null);
    setCompDialogOpen(true);
  };

  const handleCompSubmit = (values: OrgHrCompensationCreateFormData) => {
    const payload = {
      staff_id: values.staff_id,
      base_salary: values.base_salary,
      pay_frequency: values.pay_frequency,
      currency: values.currency.toUpperCase(),
      grade: values.grade || null,
      step: values.step || null,
      effective_from: values.effective_from,
      effective_to: values.effective_to || null,
      status: values.status,
      legacy_salary_notes: values.legacy_salary_notes || null,
    };

    if (editingComp) {
      updateCompMutation.mutate(
        {
          id: editingComp.id,
          ...payload,
        },
        {
          onSuccess: () => {
            setCompDialogOpen(false);
            setEditingComp(null);
          },
        },
      );
      return;
    }

    createCompMutation.mutate(payload, {
      onSuccess: () => {
        setCompDialogOpen(false);
      },
    });
  };

  const handlePeriodSubmit = (values: OrgHrPayrollPeriodCreateFormData) => {
    createPeriodMutation.mutate(
      {
        name: values.name,
        period_start: values.period_start,
        period_end: values.period_end,
        pay_date: values.pay_date || null,
      },
      {
        onSuccess: () => {
          setPeriodDialogOpen(false);
          periodForm.reset({
            name: '',
            period_start: new Date().toISOString().slice(0, 10),
            period_end: new Date().toISOString().slice(0, 10),
            pay_date: null,
          });
        },
      },
    );
  };

  const handleRunSubmit = (values: OrgHrPayrollRunCreateFormData) => {
    createRunMutation.mutate(
      {
        payroll_period_id: values.payroll_period_id,
        run_name: values.run_name || null,
      },
      {
        onSuccess: () => {
          setRunDialogOpen(false);
          runForm.reset({ payroll_period_id: '', run_name: '' });
        },
      },
    );
  };

  const isLoading = !hasPayrollRead || compLoading || periodsLoading || runsLoading;

  return (
    <div className="container mx-auto max-w-7xl space-y-6 overflow-x-hidden p-4 md:p-6">
      <PageHeader
        title={t('organizationHr.payroll')}
        description={t('organizationHr.payrollPageDesc')}
        icon={<FileSpreadsheet className="h-5 w-5" />}
        breadcrumbs={[
          { label: t('organizationHr.hubTitle'), href: '/org-admin/hr' },
          { label: t('organizationHr.payroll') },
        ]}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid h-auto w-full grid-cols-3">
            <TabsTrigger value="runs">{tUnsafe('organizationHr.payrollRuns', {}) || 'Payroll Runs'}</TabsTrigger>
            <TabsTrigger value="periods">{t('organizationHr.payrollPeriods')}</TabsTrigger>
            <TabsTrigger value="compensation">{t('organizationHr.compensationProfiles')}</TabsTrigger>
          </TabsList>

          <TabsContent value="runs" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base">{tUnsafe('organizationHr.payrollRuns', {}) || 'Payroll Runs'}</CardTitle>
                  <CardDescription>
                    {tUnsafe('organizationHr.payrollRunsDesc', {}) || 'Create a run for a payroll period, calculate staff pay, then finalize and mark it paid.'}
                  </CardDescription>
                </div>
                {hasPayrollCreate && (
                  <Button size="sm" onClick={() => setRunDialogOpen(true)} disabled={availableRunPeriods.length === 0}>
                    <Plus className="mr-2 h-4 w-4" />
                    {tUnsafe('organizationHr.createPayrollRun', {}) || 'Create run'}
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{tUnsafe('organizationHr.runName', {}) || 'Run'}</TableHead>
                        <TableHead>{t('organizationHr.periodRange')}</TableHead>
                        <TableHead>{tUnsafe('organizationHr.staffCount', {}) || 'Staff'}</TableHead>
                        <TableHead>{t('organizationHr.totalNet')}</TableHead>
                        <TableHead>{t('organizationHr.status')}</TableHead>
                        <TableHead className="w-[260px]">{tUnsafe('common.actions') || 'Actions'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payrollRuns.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">
                            {tUnsafe('organizationHr.noPayrollRuns', {}) || 'No payroll runs created yet'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        payrollRuns.map((run) => (
                          <TableRow key={run.id}>
                            <TableCell className="font-medium">
                              <div>{formatRunName(run)}</div>
                              <div className="text-xs text-muted-foreground">{run.payrollPeriodName}</div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatDate(run.periodStart)} - {formatDate(run.periodEnd)}
                            </TableCell>
                            <TableCell>{run.itemCount}</TableCell>
                            <TableCell className="font-medium">{numberFormatter.format(run.totalNet)} AFN</TableCell>
                            <TableCell>
                              <Badge variant={runStatusVariant(run.status)}>{run.status}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-2">
                                <Button variant="outline" size="sm" onClick={() => setSelectedRunId(run.id)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  {tUnsafe('organizationHr.viewRun', {}) || 'View'}
                                </Button>
                                {hasPayrollRun && run.status !== 'finalized' && run.status !== 'paid' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => calculateRunMutation.mutate(run.id)}
                                    disabled={calculateRunMutation.isPending}
                                  >
                                    <Play className="mr-2 h-4 w-4" />
                                    {tUnsafe('organizationHr.calculateRun', {}) || 'Calculate'}
                                  </Button>
                                )}
                                {hasPayrollApprove && run.status === 'processing' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => finalizeRunMutation.mutate(run.id)}
                                    disabled={finalizeRunMutation.isPending}
                                  >
                                    <ShieldCheck className="mr-2 h-4 w-4" />
                                    {tUnsafe('organizationHr.finalizeRun', {}) || 'Finalize'}
                                  </Button>
                                )}
                                {hasPayrollApprove && run.status === 'finalized' && (
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setMarkPaidRun(run);
                                      setMarkPaidAccountId('');
                                      setMarkPaidCategoryId(
                                        orgExpenseCategories.find((c) => c.name?.toLowerCase() === 'payroll')?.id ?? ''
                                      );
                                    }}
                                    disabled={markPaidMutation.isPending}
                                  >
                                    <Receipt className="mr-2 h-4 w-4" />
                                    {tUnsafe('organizationHr.markPaid', {}) || 'Mark paid'}
                                  </Button>
                                )}
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

          <TabsContent value="periods" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base">{t('organizationHr.payrollPeriods')}</CardTitle>
                  <CardDescription>{t('organizationHr.payrollPeriodsDesc')}</CardDescription>
                </div>
                {hasPayrollCreate && (
                  <Button size="sm" onClick={() => setPeriodDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    {tUnsafe('organizationHr.addPayrollPeriod', {}) || 'Add period'}
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('organizationHr.name')}</TableHead>
                        <TableHead>{t('organizationHr.periodRange')}</TableHead>
                        <TableHead>{tUnsafe('organizationHr.payDate', {}) || 'Pay date'}</TableHead>
                        <TableHead>{t('organizationHr.status')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payrollPeriods.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                            {t('organizationHr.noPayrollPeriods')}
                          </TableCell>
                        </TableRow>
                      ) : (
                        payrollPeriods.map((period) => (
                          <TableRow key={period.id}>
                            <TableCell className="font-medium">{period.name}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatDate(period.periodStart)} - {formatDate(period.periodEnd)}
                            </TableCell>
                            <TableCell>{period.payDate ? formatDate(period.payDate) : '—'}</TableCell>
                            <TableCell>
                              <Badge variant={runStatusVariant(period.status)}>{period.status}</Badge>
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

          <TabsContent value="compensation" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base">{t('organizationHr.compensationProfiles')}</CardTitle>
                  <CardDescription>{t('organizationHr.compensationProfilesDesc')}</CardDescription>
                </div>
                {hasPayrollCreate && (
                  <Button size="sm" onClick={openCreateCompDialog}>
                    <Plus className="mr-2 h-4 w-4" />
                    {tUnsafe('organizationHr.addCompensationProfile', {}) || 'Add profile'}
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('organizationHr.staffMember')}</TableHead>
                        <TableHead>{t('organizationHr.baseSalary')}</TableHead>
                        <TableHead>{tUnsafe('organizationHr.payFrequency', {}) || 'Frequency'}</TableHead>
                        <TableHead>{t('organizationHr.effectiveFrom')}</TableHead>
                        <TableHead>{t('organizationHr.status')}</TableHead>
                        <TableHead className="w-[170px]">{tUnsafe('common.actions') || 'Actions'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {compensationProfiles.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">
                            {t('organizationHr.noCompensationProfiles')}
                          </TableCell>
                        </TableRow>
                      ) : (
                        compensationProfiles.map((profile) => (
                          <TableRow key={profile.id}>
                            <TableCell className="font-medium">
                              <div>{formatStaffName(profile)}</div>
                              <div className="text-xs text-muted-foreground">{profile.employeeId || profile.staffId.slice(0, 8)}</div>
                            </TableCell>
                            <TableCell>{numberFormatter.format(profile.baseSalary)} {profile.currency}</TableCell>
                            <TableCell className="capitalize">{profile.payFrequency.replace('_', ' ')}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatDate(profile.effectiveFrom)}
                              {profile.effectiveTo ? ` - ${formatDate(profile.effectiveTo)}` : ''}
                            </TableCell>
                            <TableCell>
                              <Badge variant={profile.status === 'active' ? 'default' : 'secondary'}>{profile.status}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {hasPayrollCreate && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setEditingComp(profile);
                                      setCompDialogOpen(true);
                                    }}
                                  >
                                    {tUnsafe('common.edit') || 'Edit'}
                                  </Button>
                                )}
                                {hasPayrollCreate && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-destructive"
                                    onClick={() => setDeleteTarget(profile)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
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
      )}

      <Dialog open={compDialogOpen} onOpenChange={(open) => {
        setCompDialogOpen(open);
        if (!open) {
          setEditingComp(null);
        }
      }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingComp ? (tUnsafe('organizationHr.editCompensationProfile', {}) || 'Edit compensation profile') : (tUnsafe('organizationHr.addCompensationProfile', {}) || 'Add compensation profile')}</DialogTitle>
          </DialogHeader>
          <Form {...compForm}>
            <form onSubmit={compForm.handleSubmit(handleCompSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={compForm.control}
                  name="staff_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('organizationHr.staffMember')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!!editingComp}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('organizationHr.staffMember')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {staffOptions.map((staff) => (
                            <SelectItem key={staff.id} value={staff.id}>
                              {[staff.firstName, staff.fatherName].filter(Boolean).join(' ')} ({staff.employeeId})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={compForm.control}
                  name="base_salary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('organizationHr.baseSalary')}</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" {...field} onChange={(event) => field.onChange(Number(event.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={compForm.control}
                  name="pay_frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tUnsafe('organizationHr.payFrequency', {}) || 'Pay frequency'}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="semi_monthly">Semi-monthly</SelectItem>
                          <SelectItem value="biweekly">Biweekly</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="annually">Annually</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={compForm.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tUnsafe('organizationHr.currency', {}) || 'Currency'}</FormLabel>
                      <FormControl>
                        <Input maxLength={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={compForm.control}
                  name="effective_from"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('organizationHr.effectiveFrom')}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={compForm.control}
                  name="effective_to"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tUnsafe('organizationHr.effectiveTo', {}) || 'Effective to'}</FormLabel>
                      <FormControl>
                        <Input type="date" value={field.value ?? ''} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={compForm.control}
                  name="grade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tUnsafe('organizationHr.grade', {}) || 'Grade'}</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={compForm.control}
                  name="step"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tUnsafe('organizationHr.step', {}) || 'Step'}</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={compForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('organizationHr.status')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">{t('organizationHr.statusActive')}</SelectItem>
                          <SelectItem value="inactive">{t('organizationHr.statusInactive')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={compForm.control}
                name="legacy_salary_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('organizationHr.notes')}</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value ?? ''} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={createCompMutation.isPending || updateCompMutation.isPending}>
                  {editingComp ? (tUnsafe('common.save') || 'Save') : (tUnsafe('common.create') || 'Create')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={periodDialogOpen} onOpenChange={setPeriodDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{tUnsafe('organizationHr.addPayrollPeriod', {}) || 'Add payroll period'}</DialogTitle>
          </DialogHeader>
          <Form {...periodForm}>
            <form onSubmit={periodForm.handleSubmit(handlePeriodSubmit)} className="space-y-4">
              <FormField
                control={periodForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('organizationHr.name')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={periodForm.control}
                  name="period_start"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tUnsafe('organizationHr.periodStart', {}) || 'Period start'}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={periodForm.control}
                  name="period_end"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tUnsafe('organizationHr.periodEnd', {}) || 'Period end'}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={periodForm.control}
                name="pay_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tUnsafe('organizationHr.payDate', {}) || 'Pay date'}</FormLabel>
                    <FormControl>
                      <Input type="date" value={field.value ?? ''} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={createPeriodMutation.isPending}>
                  {tUnsafe('common.create') || 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={runDialogOpen} onOpenChange={setRunDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{tUnsafe('organizationHr.createPayrollRun', {}) || 'Create payroll run'}</DialogTitle>
          </DialogHeader>
          <Form {...runForm}>
            <form onSubmit={runForm.handleSubmit(handleRunSubmit)} className="space-y-4">
              <FormField
                control={runForm.control}
                name="payroll_period_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tUnsafe('organizationHr.selectPayrollPeriod', {}) || 'Payroll period'}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('organizationHr.payrollPeriods')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableRunPeriods.map((period) => (
                          <SelectItem key={period.id} value={period.id}>
                            {period.name} ({formatDate(period.periodStart)} - {formatDate(period.periodEnd)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={runForm.control}
                name="run_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tUnsafe('organizationHr.runName', {}) || 'Run name'}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={createRunMutation.isPending || availableRunPeriods.length === 0}>
                  {tUnsafe('common.create') || 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedRunId} onOpenChange={(open) => !open && setSelectedRunId(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>{tUnsafe('organizationHr.payrollRunDetails', {}) || 'Payroll run details'}</DialogTitle>
          </DialogHeader>
          {runDetailLoading ? (
            <div className="flex items-center justify-center py-10">
              <LoadingSpinner />
            </div>
          ) : runDetail ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>{tUnsafe('organizationHr.runName', {}) || 'Run'}</CardDescription>
                    <CardTitle className="text-sm">{formatRunName(runDetail.run)}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>{t('organizationHr.status')}</CardDescription>
                    <CardTitle className="text-sm">
                      <Badge variant={runStatusVariant(runDetail.run.status)}>{runDetail.run.status}</Badge>
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>{tUnsafe('organizationHr.staffCount', {}) || 'Staff count'}</CardDescription>
                    <CardTitle className="text-sm">{runDetail.run.itemCount}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>{t('organizationHr.totalNet')}</CardDescription>
                    <CardTitle className="text-sm">{numberFormatter.format(runDetail.run.totalNet)} AFN</CardTitle>
                  </CardHeader>
                </Card>
              </div>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('organizationHr.staffMember')}</TableHead>
                      <TableHead>{tUnsafe('organizationHr.grossAmount', {}) || 'Gross'}</TableHead>
                      <TableHead>{tUnsafe('organizationHr.deductionAmount', {}) || 'Deductions'}</TableHead>
                      <TableHead>{t('organizationHr.totalNet')}</TableHead>
                      <TableHead>{tUnsafe('organizationHr.payslip', {}) || 'Payslip'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runDetail.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          <div>{[item.staffFirstName, item.staffFatherName].filter(Boolean).join(' ') || item.staffId.slice(0, 8)}</div>
                          <div className="text-xs text-muted-foreground">{item.employeeId || item.staffId.slice(0, 8)}</div>
                        </TableCell>
                        <TableCell>{numberFormatter.format(item.grossAmount)} AFN</TableCell>
                        <TableCell>{numberFormatter.format(item.deductionAmount)} AFN</TableCell>
                        <TableCell className="font-medium">{numberFormatter.format(item.netAmount)} AFN</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {item.payslipNumber ? `${item.payslipNumber} (${item.payslipStatus || 'generated'})` : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!markPaidRun} onOpenChange={(open) => !open && setMarkPaidRun(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{tUnsafe('organizationHr.markPaid', {}) || 'Mark paid'}</DialogTitle>
          </DialogHeader>
          {markPaidRun && (
            <>
              <p className="text-sm text-muted-foreground">
                {formatRunName(markPaidRun)} — {numberFormatter.format(markPaidRun.totalNet)} total. Select org finance account and optional expense category.
              </p>
              <div className="grid gap-4 py-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Account (required)</label>
                  <Select value={markPaidAccountId} onValueChange={setMarkPaidAccountId} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {orgFinanceAccounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.name} {acc.code ? `(${acc.code})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Expense category (optional, default: Payroll)</label>
                  <Select value={markPaidCategoryId} onValueChange={setMarkPaidCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {orgExpenseCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setMarkPaidRun(null)}>
                  {t('common.cancel') || 'Cancel'}
                </Button>
                <Button
                  disabled={!markPaidAccountId || markPaidMutation.isPending}
                  onClick={() => {
                    if (!markPaidRun || !markPaidAccountId) return;
                    markPaidMutation.mutate(
                      {
                        runId: markPaidRun.id,
                        account_id: markPaidAccountId,
                        expense_category_id: markPaidCategoryId || undefined,
                      },
                      { onSuccess: () => setMarkPaidRun(null) }
                    );
                  }}
                >
                  {markPaidMutation.isPending ? (t('common.loading') || 'Loading...') : (tUnsafe('organizationHr.markPaid', {}) || 'Mark paid')}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tUnsafe('organizationHr.deleteCompensationProfile', {}) || 'Delete compensation profile?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {tUnsafe('organizationHr.deleteCompensationProfileDesc', {}) || 'This removes the profile from active management. Historical payroll runs stay unchanged.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tUnsafe('common.cancel') || 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteTarget) return;
                deleteCompMutation.mutate(deleteTarget.id, {
                  onSuccess: () => setDeleteTarget(null),
                });
              }}
            >
              {tUnsafe('common.delete') || 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
