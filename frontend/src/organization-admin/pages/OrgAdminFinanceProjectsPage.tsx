/**
 * Org Admin Finance Projects - Card grid design matching school finance projects
 */

import {
  Plus,
  Pencil,
  Trash2,
  FolderKanban,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
} from 'lucide-react';
import { useState } from 'react';

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
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  useOrgFinanceProjects,
  useOrgFinanceCurrencies,
  useCreateOrgFinanceProject,
  useUpdateOrgFinanceProject,
  useDeleteOrgFinanceProject,
} from '@/hooks/useOrgFinance';
import { useLanguage } from '@/hooks/useLanguage';
import { formatCurrency, formatDate } from '@/lib/utils';
import { dateToLocalYYYYMMDD, parseLocalDate } from '@/lib/dateUtils';
import type { FinanceProject, FinanceProjectFormData } from '@/types/domain/finance';

export default function OrgAdminFinanceProjectsPage() {
  const { t, tUnsafe } = useLanguage();
  const { data: projects = [], isLoading } = useOrgFinanceProjects();
  const { data: currencies = [] } = useOrgFinanceCurrencies({ isActive: true });
  const createProject = useCreateOrgFinanceProject();
  const updateProject = useUpdateOrgFinanceProject();
  const deleteProject = useDeleteOrgFinanceProject();

  const currencyList = Array.isArray(currencies) ? currencies : [];
  const projectCurrencyCode = (p: FinanceProject) =>
    (currencyList as { id: string; code?: string }[]).find((c) => c.id === p.currencyId)?.code ??
    (currencyList[0] as { code?: string } | undefined)?.code ??
    'USD';

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editProject, setEditProject] = useState<FinanceProject | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FinanceProjectFormData>({
    name: '',
    code: '',
    description: '',
    currencyId: null,
    startDate: null,
    endDate: null,
    budgetAmount: null,
    isActive: true,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      currencyId: null,
      startDate: null,
      endDate: null,
      budgetAmount: null,
      isActive: true,
    });
    setEditProject(null);
  };

  const handleCreate = async () => {
    await createProject.mutateAsync(formData);
    setIsCreateOpen(false);
    resetForm();
  };

  const handleUpdate = async () => {
    if (!editProject) return;
    await updateProject.mutateAsync({ id: editProject.id, ...formData });
    resetForm();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteProject.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const openEdit = (project: FinanceProject) => {
    setEditProject(project);
    setFormData({
      name: project.name,
      code: project.code ?? '',
      description: project.description ?? '',
      currencyId: project.currencyId ?? null,
      startDate: project.startDate ? dateToLocalYYYYMMDD(project.startDate) : null,
      endDate: project.endDate ? dateToLocalYYYYMMDD(project.endDate) : null,
      budgetAmount: project.budgetAmount ?? null,
      isActive: project.isActive ?? true,
    });
  };

  const calculateProgress = (project: FinanceProject) => {
    if (!project.budgetAmount || project.budgetAmount === 0) return null;
    return Math.min((project.totalIncome / project.budgetAmount) * 100, 100);
  };

  const renderProjectForm = (onSubmit: () => void, loading: boolean) => (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t('organizationAdmin.name')} *</Label>
          <Input
            value={formData.name ?? ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder={t('finance.projectNamePlaceholder')}
          />
        </div>
        <div className="space-y-2">
          <Label>{t('organizationAdmin.code')}</Label>
          <Input
            value={formData.code ?? ''}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            placeholder={t('finance.categoryCodePlaceholder')}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>{t('organizationAdmin.description')}</Label>
        <Textarea
          value={formData.description ?? ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder={t('finance.projectDescriptionPlaceholder')}
          rows={3}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t('organizationAdmin.startDate')}</Label>
          <CalendarDatePicker
            date={formData.startDate ? parseLocalDate(formData.startDate) : undefined}
            onDateChange={(date) =>
              setFormData({ ...formData, startDate: date ? dateToLocalYYYYMMDD(date) : null })
            }
            placeholder={t('organizationAdmin.startDate')}
          />
        </div>
        <div className="space-y-2">
          <Label>{t('organizationAdmin.endDate')}</Label>
          <CalendarDatePicker
            date={formData.endDate ? parseLocalDate(formData.endDate) : undefined}
            onDateChange={(date) =>
              setFormData({ ...formData, endDate: date ? dateToLocalYYYYMMDD(date) : null })
            }
            placeholder={t('organizationAdmin.endDate')}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t('finance.currency')}</Label>
          <Select
            value={formData.currencyId ?? 'none'}
            onValueChange={(v) => setFormData({ ...formData, currencyId: v === 'none' ? null : v })}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('finance.selectCurrency')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('events.none')}</SelectItem>
              {currencyList.map((c: { id: string; code?: string; name?: string }) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.code ?? c.id} {c.name ? `- ${c.name}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t('finance.budgetAmount')}</Label>
          <Input
            type="number"
            min={0}
            step={0.01}
            value={formData.budgetAmount ?? ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                budgetAmount: e.target.value ? parseFloat(e.target.value) : null,
              })
            }
            placeholder={t('finance.budgetAmountPlaceholder')}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={formData.isActive ?? true}
          onCheckedChange={(c) => setFormData({ ...formData, isActive: c })}
        />
        <Label>{t('common.active')}</Label>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => (editProject ? resetForm() : setIsCreateOpen(false))}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={loading || !(formData.name ?? '').trim()}>
          {editProject ? t('events.update') : t('events.create')}
        </Button>
      </DialogFooter>
    </form>
  );

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
        title={tUnsafe('organizationAdmin.financeProjects') ?? t('finance.projects')}
        description={tUnsafe('organizationAdmin.financeProjectsDesc') ?? t('finance.projectsDescription')}
        icon={<FolderKanban className="h-5 w-5" />}
        primaryAction={{
          label: t('finance.addProject'),
          onClick: () => setIsCreateOpen(true),
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      <Dialog open={isCreateOpen} onOpenChange={(o) => { setIsCreateOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('finance.addProject')}</DialogTitle>
            <DialogDescription>{t('finance.addProjectDescription')}</DialogDescription>
          </DialogHeader>
          {renderProjectForm(handleCreate, createProject.isPending)}
        </DialogContent>
      </Dialog>

      {projects.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          {projects.map((project) => {
            const progress = calculateProgress(project);
            const netBalance = project.totalIncome - project.totalExpense;
            const code = projectCurrencyCode(project);

            return (
              <Card key={project.id} className="relative flex h-full flex-col overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <FolderKanban className="h-6 w-6 flex-shrink-0 text-muted-foreground" />
                      <CardTitle className="truncate text-xl font-semibold">{project.name}</CardTitle>
                    </div>
                    <Badge variant={project.isActive ? 'default' : 'secondary'} className="flex-shrink-0">
                      {project.isActive ? t('common.active') : t('common.inactive')}
                    </Badge>
                  </div>
                  {project.description && (
                    <CardDescription className="mt-2 line-clamp-2">{project.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex flex-1 flex-col space-y-5">
                  {(project.startDate || project.endDate) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {project.startDate && formatDate(project.startDate)}
                      {project.startDate && project.endDate && ' - '}
                      {project.endDate && formatDate(project.endDate)}
                    </div>
                  )}

                  {progress !== null && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{t('finance.fundingProgress')}</span>
                        <span>{progress.toFixed(0)}%</span>
                      </div>
                      <Progress value={progress} />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{formatCurrency(project.totalIncome, code)}</span>
                        <span>
                          {t('events.of')} {formatCurrency(project.budgetAmount!, code)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-3 border-t pt-3">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                        <span className="text-xs font-medium text-muted-foreground">{t('finance.income')}</span>
                      </div>
                      <Badge
                        variant="outline"
                        className="border-green-200 bg-green-50 px-3 py-1.5 text-sm font-semibold text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400"
                      >
                        {formatCurrency(project.totalIncome, code)}
                      </Badge>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <TrendingDown className="h-3.5 w-3.5 text-red-600" />
                        <span className="text-xs font-medium text-muted-foreground">{t('finance.expense')}</span>
                      </div>
                      <Badge
                        variant="outline"
                        className="border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
                      >
                        {formatCurrency(project.totalExpense, code)}
                      </Badge>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="h-3.5 w-3.5 text-blue-600" />
                        <span className="text-xs font-medium text-muted-foreground">{t('finance.balance')}</span>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          netBalance >= 0
                            ? 'border-green-200 bg-green-50 px-3 py-1.5 text-sm font-semibold text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400'
                            : 'border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400'
                        }
                      >
                        {formatCurrency(netBalance, code)}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(project)}>
                      <Pencil className="mr-1 h-4 w-4" />
                      {t('events.edit')}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteId(project.id)} className="text-destructive hover:text-destructive">
                      <Trash2 className="mr-1 h-4 w-4" />
                      {t('events.delete')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FolderKanban className="mb-4 h-12 w-12" />
            <p>{t('organizationAdmin.noProjects')}</p>
            <p className="text-sm">{t('finance.createFirstProject')}</p>
            <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('finance.addProject')}
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!editProject} onOpenChange={(o) => { if (!o) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('finance.editProject')}</DialogTitle>
            <DialogDescription>{t('finance.editProjectDescription')}</DialogDescription>
          </DialogHeader>
          {editProject && renderProjectForm(handleUpdate, updateProject.isPending)}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('events.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>{t('finance.deleteProjectWarning')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
