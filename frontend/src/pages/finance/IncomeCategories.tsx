/**
 * Income Categories Page - Manage income category types
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
    useIncomeCategories,
    useCreateIncomeCategory,
    useUpdateIncomeCategory,
    useDeleteIncomeCategory,
    type IncomeCategory,
    type IncomeCategoryFormData,
} from '@/hooks/useFinance';
import { useLanguage } from '@/hooks/useLanguage';
import { LoadingSpinner } from '@/components/ui/loading';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';

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

    const CategoryForm = ({ onSubmit, isLoading: loading }: { onSubmit: () => void; isLoading: boolean }) => (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="name">{t('common.name') || 'Name'} *</Label>
                    <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder={t('finance.categoryNamePlaceholder') || 'e.g., General Donation'}
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
                <Button onClick={onSubmit} disabled={loading || !formData.name}>
                    {loading ? <LoadingSpinner className="mr-2 h-4 w-4" /> : null}
                    {editCategory ? t('common.update') || 'Update' : t('common.create') || 'Create'}
                </Button>
            </DialogFooter>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {t('finance.incomeCategories') || 'Income Categories'}
                    </h1>
                    <p className="text-muted-foreground">
                        {t('finance.incomeCategoriesDescription') || 'Manage types of income'}
                    </p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            {t('finance.addCategory') || 'Add Category'}
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t('finance.addIncomeCategory') || 'Add Income Category'}</DialogTitle>
                            <DialogDescription>
                                {t('finance.addIncomeCategoryDescription') || 'Create a new income category'}
                            </DialogDescription>
                        </DialogHeader>
                        <CategoryForm onSubmit={handleCreate} isLoading={createCategory.isPending} />
                    </DialogContent>
                </Dialog>
            </div>

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
                    <CategoryForm onSubmit={handleUpdate} isLoading={updateCategory.isPending} />
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
