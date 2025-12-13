/**
 * Finance Projects Page - Manage projects and funds
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
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
    useFinanceProjects,
    useCreateFinanceProject,
    useUpdateFinanceProject,
    useDeleteFinanceProject,
    type FinanceProject,
    type FinanceProjectFormData,
} from '@/hooks/useFinance';
import { useCurrencies } from '@/hooks/useCurrencies';
import { useLanguage } from '@/hooks/useLanguage';
import { LoadingSpinner } from '@/components/ui/loading';
import { Plus, Pencil, Trash2, FolderKanban, TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function FinanceProjects() {
    const { t } = useLanguage();
    const { data: projects, isLoading } = useFinanceProjects();
    const { data: currencies } = useCurrencies({ isActive: true });
    const createProject = useCreateFinanceProject();
    const updateProject = useUpdateFinanceProject();
    const deleteProject = useDeleteFinanceProject();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editProject, setEditProject] = useState<FinanceProject | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const [formData, setFormData] = useState<FinanceProjectFormData>({
        name: '',
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
            description: '',
            currencyId: null,
            startDate: null,
            endDate: null,
            budgetAmount: null,
            isActive: true,
        });
    };

    const handleCreate = async () => {
        await createProject.mutateAsync(formData);
        setIsCreateOpen(false);
        resetForm();
    };

    const handleUpdate = async () => {
        if (!editProject) return;
        await updateProject.mutateAsync({ id: editProject.id, ...formData });
        setEditProject(null);
        resetForm();
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        await deleteProject.mutateAsync(deleteId);
        setDeleteId(null);
    };

    const openEditDialog = (project: FinanceProject) => {
        setEditProject(project);
        setFormData({
            name: project.name,
            description: project.description || '',
            currencyId: project.currencyId || null,
            startDate: project.startDate ? project.startDate.toISOString().split('T')[0] : null,
            endDate: project.endDate ? project.endDate.toISOString().split('T')[0] : null,
            budgetAmount: project.budgetAmount,
            isActive: project.isActive,
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <LoadingSpinner />
            </div>
        );
    }

    const ProjectForm = ({ onSubmit, isLoading: loading }: { onSubmit: () => void; isLoading: boolean }) => (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="name">{t('common.name') || 'Name'} *</Label>
                <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t('finance.projectNamePlaceholder') || 'e.g., Ramadan Iftar Project'}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="description">{t('common.description') || 'Description'}</Label>
                <Textarea
                    id="description"
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={t('finance.projectDescriptionPlaceholder') || 'Description of this project...'}
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="startDate">{t('common.startDate') || 'Start Date'}</Label>
                    <Input
                        id="startDate"
                        type="date"
                        value={formData.startDate || ''}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value || null })}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="endDate">{t('common.endDate') || 'End Date'}</Label>
                    <Input
                        id="endDate"
                        type="date"
                        value={formData.endDate || ''}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value || null })}
                    />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="currencyId">{t('finance.currency') || 'Currency'}</Label>
                    <Select
                        value={formData.currencyId || ''}
                        onValueChange={(value) => setFormData({ ...formData, currencyId: value || null })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder={t('finance.selectCurrency') || 'Select currency'} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">{t('common.none') || 'None'}</SelectItem>
                            {currencies?.map((currency) => (
                                <SelectItem key={currency.id} value={currency.id}>
                                    {currency.code} - {currency.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="budgetAmount">{t('finance.budgetAmount') || 'Budget Amount'}</Label>
                    <Input
                        id="budgetAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.budgetAmount || ''}
                        onChange={(e) => setFormData({ ...formData, budgetAmount: e.target.value ? parseFloat(e.target.value) : null })}
                        placeholder={t('finance.budgetAmountPlaceholder') || 'Optional budget amount...'}
                    />
                </div>
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
                    {editProject ? t('common.update') || 'Update' : t('common.create') || 'Create'}
                </Button>
            </DialogFooter>
        </div>
    );

    const calculateProgress = (project: FinanceProject) => {
        if (!project.budgetAmount || project.budgetAmount === 0) return null;
        return Math.min((project.totalIncome / project.budgetAmount) * 100, 100);
    };

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold">
                        {t('finance.projects') || 'Projects & Funds'}
                    </h1>
                    <p className="text-muted-foreground">
                        {t('finance.projectsDescription') || 'Manage your projects and track funds'}
                    </p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            {t('finance.addProject') || 'Add Project'}
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t('finance.addProject') || 'Add Project'}</DialogTitle>
                            <DialogDescription>
                                {t('finance.addProjectDescription') || 'Create a new project or fund'}
                            </DialogDescription>
                        </DialogHeader>
                        <ProjectForm onSubmit={handleCreate} isLoading={createProject.isPending} />
                    </DialogContent>
                </Dialog>
            </div>

            {/* Projects Grid */}
            {projects && projects.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {projects.map((project) => {
                        const progress = calculateProgress(project);
                        const netBalance = project.totalIncome - project.totalExpense;

                        return (
                            <Card key={project.id} className="relative">
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2">
                                            <FolderKanban className="h-5 w-5 text-muted-foreground" />
                                            <CardTitle className="text-lg">{project.name}</CardTitle>
                                        </div>
                                        <Badge variant={project.isActive ? 'default' : 'secondary'}>
                                            {project.isActive ? t('common.active') || 'Active' : t('common.inactive') || 'Inactive'}
                                        </Badge>
                                    </div>
                                    {project.description && (
                                        <CardDescription className="mt-1">{project.description}</CardDescription>
                                    )}
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Date Range */}
                                    {(project.startDate || project.endDate) && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Calendar className="h-4 w-4" />
                                            {project.startDate && formatDate(project.startDate)}
                                            {project.startDate && project.endDate && ' - '}
                                            {project.endDate && formatDate(project.endDate)}
                                        </div>
                                    )}

                                    {/* Progress Bar */}
                                    {progress !== null && (
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-sm">
                                                <span>{t('finance.fundingProgress') || 'Funding Progress'}</span>
                                                <span>{progress.toFixed(0)}%</span>
                                            </div>
                                            <Progress value={progress} />
                                            <div className="flex justify-between text-xs text-muted-foreground">
                                                <span>{formatCurrency(project.totalIncome)}</span>
                                                <span>{t('finance.of') || 'of'} {formatCurrency(project.budgetAmount!)}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Financial Summary */}
                                    <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                                        <div className="text-center">
                                            <div className="flex items-center justify-center gap-1 text-green-600">
                                                <TrendingUp className="h-3 w-3" />
                                                <span className="text-xs">{t('finance.income') || 'Income'}</span>
                                            </div>
                                            <p className="text-sm font-medium text-green-600">
                                                {formatCurrency(project.totalIncome)}
                                            </p>
                                        </div>
                                        <div className="text-center">
                                            <div className="flex items-center justify-center gap-1 text-red-600">
                                                <TrendingDown className="h-3 w-3" />
                                                <span className="text-xs">{t('finance.expense') || 'Expense'}</span>
                                            </div>
                                            <p className="text-sm font-medium text-red-600">
                                                {formatCurrency(project.totalExpense)}
                                            </p>
                                        </div>
                                        <div className="text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <DollarSign className="h-3 w-3" />
                                                <span className="text-xs">{t('finance.balance') || 'Balance'}</span>
                                            </div>
                                            <p className={`text-sm font-medium ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {formatCurrency(netBalance)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex justify-end gap-2 pt-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openEditDialog(project)}
                                        >
                                            <Pencil className="h-4 w-4 mr-1" />
                                            {t('common.edit') || 'Edit'}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setDeleteId(project.id)}
                                        >
                                            <Trash2 className="h-4 w-4 mr-1" />
                                            {t('common.delete') || 'Delete'}
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
                        <FolderKanban className="h-12 w-12 mb-4" />
                        <p>{t('finance.noProjects') || 'No projects found'}</p>
                        <p className="text-sm">{t('finance.createFirstProject') || 'Create your first project to get started'}</p>
                    </CardContent>
                </Card>
            )}

            {/* Edit Dialog */}
            <Dialog open={!!editProject} onOpenChange={(open) => { if (!open) { setEditProject(null); resetForm(); } }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('finance.editProject') || 'Edit Project'}</DialogTitle>
                        <DialogDescription>
                            {t('finance.editProjectDescription') || 'Update project details'}
                        </DialogDescription>
                    </DialogHeader>
                    <ProjectForm onSubmit={handleUpdate} isLoading={updateProject.isPending} />
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('common.confirmDelete') || 'Confirm Delete'}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('finance.deleteProjectWarning') || 'Are you sure you want to delete this project? This action cannot be undone.'}
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
