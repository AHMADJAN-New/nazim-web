import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Pencil, Trash2, Search, Package } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAssetCategories, useCreateAssetCategory, useUpdateAssetCategory, useDeleteAssetCategory } from '@/hooks/useAssetCategories';
import type { AssetCategory } from '@/hooks/useAssetCategories';
import { useProfile } from '@/hooks/useProfiles';
import { useHasPermission } from '@/hooks/usePermissions';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/hooks/useLanguage';
import { LoadingSpinner } from '@/components/ui/loading';

const categorySchema = z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
    code: z.string().max(50, 'Code must be 50 characters or less').optional().nullable(),
    description: z.string().max(500, 'Description must be 500 characters or less').optional().nullable(),
    display_order: z.number().int().min(0).default(0),
    is_active: z.boolean().default(true),
});

type CategoryFormData = z.infer<typeof categorySchema>;

export default function AssetCategories() {
    const { t } = useLanguage();
    const { data: profile } = useProfile();
    const hasCreatePermission = useHasPermission('asset_categories.create');
    const hasUpdatePermission = useHasPermission('asset_categories.update');
    const hasDeletePermission = useHasPermission('asset_categories.delete');

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const { data: categories, isLoading } = useAssetCategories();
    const createCategory = useCreateAssetCategory();
    const updateCategory = useUpdateAssetCategory();
    const deleteCategory = useDeleteAssetCategory();

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm<CategoryFormData>({
        resolver: zodResolver(categorySchema),
        defaultValues: {
            is_active: true,
            display_order: 0,
        },
    });

    const isActiveValue = watch('is_active');

    const filteredCategories = useMemo(() => {
        if (!Array.isArray(categories)) return [];
        const query = (searchQuery || '').toLowerCase();
        return categories.filter((category) =>
            category.name?.toLowerCase().includes(query) ||
            category.code?.toLowerCase().includes(query) ||
            (category.description && category.description.toLowerCase().includes(query))
        );
    }, [categories, searchQuery]);

    // Transform categories for export
    const transformCategoriesForExport = (data: AssetCategory[]): Record<string, any>[] => {
        return data.map((category) => ({
            name: category.name || '',
            code: category.code || '',
            description: category.description || '',
            display_order: category.display_order ?? 0,
            status: category.is_active ? t('events.active') : t('events.inactive'),
        }));
    };

    // Build filters summary
    const buildFiltersSummary = (): string => {
        const parts: string[] = [];
        if (searchQuery) {
            parts.push(`${t('common.search') || 'Search'}: ${searchQuery}`);
        }
        return parts.length > 0 ? parts.join(' | ') : t('assets.categories');
    };

    const handleOpenDialog = (categoryId?: string) => {
        if (categoryId) {
            const category = Array.isArray(categories) ? categories.find((c) => c.id === categoryId) : null;
            if (category) {
                reset({
                    name: category.name,
                    code: category.code || '',
                    description: category.description || '',
                    display_order: category.display_order,
                    is_active: category.is_active,
                });
                setSelectedCategory(categoryId);
            }
        } else {
            reset({
                name: '',
                code: '',
                description: '',
                display_order: 0,
                is_active: true,
            });
            setSelectedCategory(null);
        }
        setIsDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setSelectedCategory(null);
        reset({
            name: '',
            code: '',
            description: '',
            display_order: 0,
            is_active: true,
        });
    };

    const onSubmit = (data: CategoryFormData) => {
        if (selectedCategory) {
            updateCategory.mutate(
                {
                    id: selectedCategory,
                    name: data.name,
                    code: data.code || null,
                    description: data.description || null,
                    display_order: data.display_order,
                    is_active: data.is_active,
                },
                {
                    onSuccess: () => {
                        handleCloseDialog();
                    },
                }
            );
        } else {
            createCategory.mutate(
                {
                    name: data.name,
                    code: data.code || null,
                    description: data.description || null,
                    display_order: data.display_order,
                    is_active: data.is_active,
                },
                {
                    onSuccess: () => {
                        handleCloseDialog();
                    },
                }
            );
        }
    };

    const handleDelete = () => {
        if (selectedCategory) {
            deleteCategory.mutate(selectedCategory, {
                onSuccess: () => {
                    setIsDeleteDialogOpen(false);
                    setSelectedCategory(null);
                },
            });
        }
    };

    const handleOpenDeleteDialog = (categoryId: string) => {
        setSelectedCategory(categoryId);
        setIsDeleteDialogOpen(true);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Package className="h-8 w-8" />
                    <div>
                        <h1 className="text-2xl font-semibold">{t('assets.categories')}</h1>
                        <p className="text-sm text-muted-foreground">{t('assets.categoriesDescription')}</p>
                    </div>
                </div>
                {hasCreatePermission && (
                    <Button onClick={() => handleOpenDialog()}>
                        <Plus className="h-4 w-4 mr-2" />
                        {t('assets.addCategory')}
                    </Button>
                )}
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>{t('assets.categories')}</CardTitle>
                            <CardDescription>
                                {Array.isArray(categories) ? categories.length : 0} {t('assets.totalCategoriesLabel')}
                            </CardDescription>
                        </div>
                        <ReportExportButtons
                            data={filteredCategories}
                            columns={[
                                { key: 'name', label: t('assets.name'), align: 'left' },
                                { key: 'code', label: t('assets.categoryCode'), align: 'left' },
                                { key: 'description', label: t('assets.categoryDescription'), align: 'left' },
                                { key: 'display_order', label: t('assets.categoryOrder'), align: 'left' },
                                { key: 'status', label: t('assets.status'), align: 'left' },
                            ]}
                            reportKey="asset_categories"
                            title={t('assets.categories')}
                            transformData={transformCategoriesForExport}
                            buildFiltersSummary={buildFiltersSummary}
                            templateType="asset_categories"
                            disabled={isLoading || filteredCategories.length === 0}
                            buttonSize="sm"
                            buttonVariant="outline"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t('assets.searchCategories')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('assets.name')}</TableHead>
                                    <TableHead>{t('assets.categoryCode')}</TableHead>
                                    <TableHead>{t('assets.categoryDescription')}</TableHead>
                                    <TableHead>{t('assets.categoryOrder')}</TableHead>
                                    <TableHead>{t('assets.status')}</TableHead>
                                    <TableHead className="text-right">{t('events.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCategories.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            {searchQuery ? t('assets.noCategoriesFound') : t('assets.noCategoriesMessage')}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredCategories.map((category) => (
                                        <TableRow key={category.id}>
                                            <TableCell className="font-medium">{category.name}</TableCell>
                                            <TableCell>
                                                {category.code ? (
                                                    <Badge variant="outline">{category.code}</Badge>
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="max-w-md truncate">
                                                {category.description || <span className="text-muted-foreground">—</span>}
                                            </TableCell>
                                            <TableCell>{category.display_order}</TableCell>
                                            <TableCell>
                                                <Badge variant={category.is_active ? 'default' : 'secondary'}>
                                                    {category.is_active ? t('events.active') : t('events.inactive')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    {hasUpdatePermission && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleOpenDialog(category.id)}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    {hasDeletePermission && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleOpenDeleteDialog(category.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4 text-destructive" />
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

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedCategory ? t('assets.editCategory') : t('assets.createCategory')}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedCategory
                                ? t('assets.editCategory')
                                : t('assets.categoriesDescription')}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <div className="space-y-4 py-4">
                            <div>
                                <Label htmlFor="name">
                                    {t('assets.name')} <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    {...register('name')}
                                    placeholder={t('events.exampleCategories')}
                                />
                                {errors.name && (
                                    <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="code">{t('assets.categoryCode')}</Label>
                                <Input
                                    id="code"
                                    {...register('code')}
                                    placeholder="e.g., ELEC, FURN, VEH"
                                />
                                {errors.code && (
                                    <p className="text-sm text-destructive mt-1">{errors.code.message}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="description">{t('assets.categoryDescription')}</Label>
                                <Textarea
                                    id="description"
                                    {...register('description')}
                                    placeholder="Optional description for this category"
                                    rows={3}
                                />
                                {errors.description && (
                                    <p className="text-sm text-destructive mt-1">{errors.description.message}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="display_order">{t('assets.categoryOrder')}</Label>
                                    <Input
                                        id="display_order"
                                        type="number"
                                        min={0}
                                        {...register('display_order', { valueAsNumber: true })}
                                    />
                                    {errors.display_order && (
                                        <p className="text-sm text-destructive mt-1">{errors.display_order.message}</p>
                                    )}
                                </div>

                                <div className="flex items-center space-x-2 pt-8">
                                    <Switch
                                        id="is_active"
                                        checked={isActiveValue}
                                        onCheckedChange={(checked) => setValue('is_active', checked)}
                                    />
                                    <Label htmlFor="is_active" className="cursor-pointer">
                                        {t('events.active')}
                                    </Label>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={handleCloseDialog}>
                                {t('events.cancel')}
                            </Button>
                            <Button
                                type="submit"
                                disabled={createCategory.isPending || updateCategory.isPending}
                            >
                                {selectedCategory ? t('events.update') : t('events.create')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('assets.deleteConfirm')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('assets.noCategoriesMessage')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('events.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={deleteCategory.isPending}
                        >
                            {deleteCategory.isPending ? t('events.deleting') || 'Deleting...' : t('events.delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

