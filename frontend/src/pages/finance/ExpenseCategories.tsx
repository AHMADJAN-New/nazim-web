/**
 * Expense Categories Page - Manage expense category types
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
    useExpenseCategories,
    useCreateExpenseCategory,
    useUpdateExpenseCategory,
    useDeleteExpenseCategory,
    type ExpenseCategory,
    type ExpenseCategoryFormData,
} from '@/hooks/useFinance';
import { useLanguage } from '@/hooks/useLanguage';
import { LoadingSpinner } from '@/components/ui/loading';
import { Plus, Pencil, Trash2, Tags } from 'lucide-react';
import { ReportExportButtons } from '@/components/reports/ReportExportButtons';

export default function ExpenseCategories() {
    const { t } = useLanguage();
    const { data: categories, isLoading } = useExpenseCategories();
    const createCategory = useCreateExpenseCategory();
    const updateCategory = useUpdateExpenseCategory();
    const deleteCategory = useDeleteExpenseCategory();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editCategory, setEditCategory] = useState<ExpenseCategory | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const [formData, setFormData] = useState<ExpenseCategoryFormData>({
        name: '',
        code: '',
        description: '',
        isActive: true,
    });

    const resetForm = () => {
        setFormData({
            name: '',
            code: '',
            description: '',
            isActive: true,
        });
    };

    const handleCreate = async () => {
        await createCategory.mutateAsync(formData);
        setIsCreateOpen(false);
        resetForm();
    };

    const handleUpdate = async () => {
        if (!editCategory) return;
        await updateCategory.mutateAsync({ id: editCategory.id, ...formData });
        setEditCategory(null);
        resetForm();
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        await deleteCategory.mutateAsync(deleteId);
        setDeleteId(null);
    };

    const openEditDialog = (category: ExpenseCategory) => {
        setEditCategory(category);
        setFormData({
            name: category.name,
            code: category.code || '',
            description: category.description || '',
            isActive: category.isActive,
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <LoadingSpinner />
            </div>
        );
    }


    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold">
                        {t('finance.expenseCategories') || 'Expense Categories'}
                    </h1>
                    <p className="text-muted-foreground">
                        {t('finance.expenseCategoriesDescription') || 'Manage types of expenses'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <ReportExportButtons
                        data={categories || []}
                        columns={[
                            { key: 'name', label: t('common.name'), align: 'left' },
                            { key: 'code', label: t('common.code'), align: 'left' },
                            { key: 'description', label: t('common.description'), align: 'left' },
                            { key: 'isActive', label: t('common.status'), align: 'center' },
                        ]}
                        reportKey="expense_categories"
                        title={t('finance.expenseCategories') || 'Expense Categories'}
                        transformData={(data) =>
                            data.map((category) => ({
                                name: category.name,
                                code: category.code || '-',
                                description: category.description || '-',
                                isActive: category.isActive ? t('common.active') || 'Active' : t('common.inactive') || 'Inactive',
                            }))
                        }
                        templateType="expense_categories"
                        disabled={isLoading || !categories || categories.length === 0}
                    />
                    <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            {t('finance.addCategory') || 'Add Category'}
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t('finance.addExpenseCategory') || 'Add Expense Category'}</DialogTitle>
                            <DialogDescription>
                                {t('finance.addExpenseCategoryDescription') || 'Create a new expense category'}
                            </DialogDescription>
                        </DialogHeader>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleCreate();
                            }}
                            className="space-y-4"
                        >
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">{t('common.name') || 'Name'} *</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder={t('finance.categoryNamePlaceholder') || 'e.g., Salaries'}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="code">{t('common.code') || 'Code'}</Label>
                                    <Input
                                        id="code"
                                        value={formData.code || ''}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                        placeholder={t('finance.categoryCodePlaceholder') || 'e.g., SAL'}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">{t('common.description') || 'Description'}</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description || ''}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder={t('finance.categoryDescriptionPlaceholder') || 'Description of this category...'}
                                    rows={4}
                                    className="resize-y min-h-[100px]"
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
                                <Button type="submit" disabled={createCategory.isPending || !formData.name.trim()}>
                                    {t('common.create') || 'Create'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
            </div>

            {/* Categories Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Tags className="h-5 w-5" />
                        {t('finance.allExpenseCategories') || 'All Expense Categories'}
                    </CardTitle>
                    <CardDescription>
                        {categories?.length || 0} {t('finance.categoriesFound') || 'categories found'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('common.name') || 'Name'}</TableHead>
                                <TableHead>{t('common.code') || 'Code'}</TableHead>
                                <TableHead>{t('common.description') || 'Description'}</TableHead>
                                <TableHead>{t('common.status') || 'Status'}</TableHead>
                                <TableHead className="text-right">{t('common.actions') || 'Actions'}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {categories?.map((category) => (
                                <TableRow key={category.id}>
                                    <TableCell className="font-medium">{category.name}</TableCell>
                                    <TableCell>{category.code || '-'}</TableCell>
                                    <TableCell className="max-w-xs truncate">{category.description || '-'}</TableCell>
                                    <TableCell>
                                        <Badge variant={category.isActive ? 'default' : 'secondary'}>
                                            {category.isActive ? t('common.active') || 'Active' : t('common.inactive') || 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => openEditDialog(category)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setDeleteId(category.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {(!categories || categories.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        {t('finance.noCategories') || 'No categories found'}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={!!editCategory} onOpenChange={(open) => { if (!open) { setEditCategory(null); resetForm(); } }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('finance.editCategory') || 'Edit Category'}</DialogTitle>
                        <DialogDescription>
                            {t('finance.editCategoryDescription') || 'Update category details'}
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleUpdate();
                        }}
                        className="space-y-4"
                    >
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-name">{t('common.name') || 'Name'} *</Label>
                                <Input
                                    id="edit-name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder={t('finance.categoryNamePlaceholder') || 'e.g., Salaries'}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-code">{t('common.code') || 'Code'}</Label>
                                <Input
                                    id="edit-code"
                                    value={formData.code || ''}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    placeholder={t('finance.categoryCodePlaceholder') || 'e.g., SAL'}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-description">{t('common.description') || 'Description'}</Label>
                            <Textarea
                                id="edit-description"
                                value={formData.description || ''}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder={t('finance.categoryDescriptionPlaceholder') || 'Description of this category...'}
                                rows={4}
                                className="resize-y min-h-[100px]"
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="edit-isActive"
                                checked={formData.isActive}
                                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                            />
                            <Label htmlFor="edit-isActive">{t('common.active') || 'Active'}</Label>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={updateCategory.isPending || !formData.name.trim()}>
                                {t('common.update') || 'Update'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('common.confirmDelete') || 'Confirm Delete'}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('finance.deleteCategoryWarning') || 'Are you sure you want to delete this category? This action cannot be undone.'}
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
