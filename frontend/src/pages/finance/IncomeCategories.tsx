/**
 * Income Categories Page - Manage income category types
 */

import { Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { useState, useMemo } from 'react';

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
import { Switch } from '@/components/ui/switch';
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
    useIncomeCategories,
    useCreateIncomeCategory,
    useUpdateIncomeCategory,
    useDeleteIncomeCategory,
    type IncomeCategory,
    type IncomeCategoryFormData,
} from '@/hooks/useFinance';
import { useLanguage } from '@/hooks/useLanguage';

export default function IncomeCategories() {
    const { t } = useLanguage();
    const { data: categories, isLoading } = useIncomeCategories();
    const createCategory = useCreateIncomeCategory();
    const updateCategory = useUpdateIncomeCategory();
    const deleteCategory = useDeleteIncomeCategory();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editCategory, setEditCategory] = useState<IncomeCategory | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const [formData, setFormData] = useState<IncomeCategoryFormData>({
        name: '',
        code: '',
        description: '',
        isRestricted: false,
        isActive: true,
    });

    const resetForm = () => {
        setFormData({
            name: '',
            code: '',
            description: '',
            isRestricted: false,
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

    const openEditDialog = (category: IncomeCategory) => {
        setEditCategory(category);
        setFormData({
            name: category.name,
            code: category.code || '',
            description: category.description || '',
            isRestricted: category.isRestricted,
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
            <PageHeader
                title={t('finance.incomeCategories') || 'Income Categories'}
                description={t('finance.incomeCategoriesDescription') || 'Manage types of income'}
                icon={<Tag className="h-5 w-5" />}
                primaryAction={{
                    label: t('finance.addCategory') || 'Add Category',
                    onClick: () => setIsCreateOpen(true),
                    icon: <Plus className="h-4 w-4" />,
                }}
                rightSlot={
                    <ReportExportButtons
                        data={categories || []}
                        columns={[
                            { key: 'name', label: t('common.name'), align: 'left' },
                            { key: 'code', label: t('common.code'), align: 'left' },
                            { key: 'description', label: t('common.description'), align: 'left' },
                            { key: 'isRestricted', label: t('finance.restricted'), align: 'center' },
                            { key: 'isActive', label: t('common.status'), align: 'center' },
                        ]}
                        reportKey="income_categories"
                        title={t('finance.incomeCategories') || 'Income Categories'}
                        transformData={(data) =>
                            data.map((category) => ({
                                name: category.name,
                                code: category.code || '-',
                                description: category.description || '-',
                                isRestricted: category.isRestricted ? t('common.yes') || 'Yes' : t('common.no') || 'No',
                                isActive: category.isActive ? t('common.active') || 'Active' : t('common.inactive') || 'Inactive',
                            }))
                        }
                        templateType="income_categories"
                        disabled={isLoading || !categories || categories.length === 0}
                    />
                }
            />

            <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('finance.addIncomeCategory') || 'Add Income Category'}</DialogTitle>
                        <DialogDescription>
                            {t('finance.addIncomeCategoryDescription') || 'Create a new income category'}
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleCreate();
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
                                    placeholder={t('finance.categoryNamePlaceholder') || 'e.g., General Donation'}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="code">{t('common.code') || 'Code'}</Label>
                                <Input
                                    id="code"
                                    value={formData.code || ''}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    placeholder={t('finance.categoryCodePlaceholder') || 'e.g., GEN_DON'}
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
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="isRestricted"
                                    checked={formData.isRestricted}
                                    onCheckedChange={(checked) => setFormData({ ...formData, isRestricted: checked })}
                                />
                                <Label htmlFor="isRestricted">{t('finance.restricted') || 'Restricted (e.g., Zakat, Waqf)'}</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="isActive"
                                    checked={formData.isActive}
                                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                                />
                                <Label htmlFor="isActive">{t('common.active') || 'Active'}</Label>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={createCategory.isPending || !formData.name.trim()}>
                                {t('common.create') || 'Create'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Categories Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Tag className="h-5 w-5" />
                        {t('finance.allIncomeCategories') || 'All Income Categories'}
                    </CardTitle>
                    <CardDescription>
                        {categories?.length || 0} {t('finance.categoriesFound') || 'categories found'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('common.name') || 'Name'}</TableHead>
                                <TableHead>{t('common.code') || 'Code'}</TableHead>
                                <TableHead>{t('common.description') || 'Description'}</TableHead>
                                <TableHead>{t('finance.restricted') || 'Restricted'}</TableHead>
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
                                        {category.isRestricted ? (
                                            <Badge variant="secondary">{t('common.yes') || 'Yes'}</Badge>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
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
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        {t('finance.noCategories') || 'No categories found'}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                    </div>
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-name">{t('common.name') || 'Name'} *</Label>
                                <Input
                                    id="edit-name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder={t('finance.categoryNamePlaceholder') || 'e.g., General Donation'}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-code">{t('common.code') || 'Code'}</Label>
                                <Input
                                    id="edit-code"
                                    value={formData.code || ''}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    placeholder={t('finance.categoryCodePlaceholder') || 'e.g., GEN_DON'}
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
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="edit-isRestricted"
                                    checked={formData.isRestricted}
                                    onCheckedChange={(checked) => setFormData({ ...formData, isRestricted: checked })}
                                />
                                <Label htmlFor="edit-isRestricted">{t('finance.restricted') || 'Restricted (e.g., Zakat, Waqf)'}</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="edit-isActive"
                                    checked={formData.isActive}
                                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                                />
                                <Label htmlFor="edit-isActive">{t('common.active') || 'Active'}</Label>
                            </div>
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

