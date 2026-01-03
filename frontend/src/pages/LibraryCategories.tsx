import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Pencil, Trash2, Search, BookOpen } from 'lucide-react';
import { useState, useMemo } from 'react';

import { useForm } from 'react-hook-form';
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
import { Input } from '@/components/ui/input';
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/hooks/useLanguage';

import * as z from 'zod';

import { LoadingSpinner } from '@/components/ui/loading';
import { useLibraryCategories, useCreateLibraryCategory, useUpdateLibraryCategory, useDeleteLibraryCategory } from '@/hooks/useLibraryCategories';
import { useHasPermission } from '@/hooks/usePermissions';
import { useProfile } from '@/hooks/useProfiles';
import type { LibraryCategory } from '@/types/domain/library';

const categorySchema = (t: (key: string) => string) => z.object({
    name: z.string().min(1, t('library.categoryNameRequired')).max(100, t('library.categoryNameMaxLength')),
    code: z.string().max(50, t('library.categoryCodeMaxLength')).optional().nullable(),
    description: z.string().max(500, t('library.categoryDescriptionMaxLength')).optional().nullable(),
    display_order: z.number().int().min(0).default(0),
    is_active: z.boolean().default(true),
});

type CategoryFormData = z.infer<ReturnType<typeof categorySchema>>;

export default function LibraryCategories() {
    const { t } = useLanguage();
    const { data: profile } = useProfile();
    const hasCreatePermission = useHasPermission('library_categories.create');
    const hasUpdatePermission = useHasPermission('library_categories.update');
    const hasDeletePermission = useHasPermission('library_categories.delete');

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const { data: categories, isLoading } = useLibraryCategories();
    const createCategory = useCreateLibraryCategory();
    const updateCategory = useUpdateLibraryCategory();
    const deleteCategory = useDeleteLibraryCategory();

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm<CategoryFormData>({
        resolver: zodResolver(categorySchema(t)),
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
                    data: {
                        name: data.name,
                        code: data.code || null,
                        description: data.description || null,
                        display_order: data.display_order,
                        is_active: data.is_active,
                    },
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
            <PageHeader
                title={t('library.libraryCategories')}
                description={t('library.manageBookCategories')}
                icon={<BookOpen className="h-5 w-5" />}
                primaryAction={
                    hasCreatePermission
                        ? {
                            label: t('library.addCategory'),
                            onClick: () => handleOpenDialog(),
                            icon: <Plus className="h-4 w-4" />,
                        }
                        : undefined
                }
            />

            <Card>
                <CardHeader>
                    <CardTitle>{t('library.categories')}</CardTitle>
                    <CardDescription>
                        {Array.isArray(categories) ? categories.length : 0} {t('library.totalCategoriesLabel')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <FilterPanel title={t('common.filters') || 'Search & Filter'}>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t('library.searchCategories')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </FilterPanel>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('library.categoryName')}</TableHead>
                                    <TableHead>{t('library.categoryCode')}</TableHead>
                                    <TableHead>{t('library.categoryDescription')}</TableHead>
                                    <TableHead>{t('library.order')}</TableHead>
                                    <TableHead>{t('library.status')}</TableHead>
                                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCategories.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            {searchQuery ? t('library.noCategoriesFound') : t('library.noCategoriesMessage')}
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
                                                    {category.is_active ? t('library.active') : t('library.inactive')}
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
                            {selectedCategory ? t('library.editCategory') : t('library.createCategory')}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedCategory
                                ? t('library.updateCategoryInfo')
                                : t('library.addNewCategoryInfo')}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <div className="space-y-4 py-4">
                            <div>
                                <Label htmlFor="name">
                                    {t('library.categoryName')} <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    {...register('name')}
                                    placeholder={t('library.namePlaceholder')}
                                />
                                {errors.name && (
                                    <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="code">{t('library.categoryCode')}</Label>
                                <Input
                                    id="code"
                                    {...register('code')}
                                    placeholder={t('library.codePlaceholder')}
                                />
                                {errors.code && (
                                    <p className="text-sm text-destructive mt-1">{errors.code.message}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="description">{t('library.categoryDescription')}</Label>
                                <Textarea
                                    id="description"
                                    {...register('description')}
                                    placeholder={t('library.categoryDescriptionPlaceholder')}
                                    rows={3}
                                />
                                {errors.description && (
                                    <p className="text-sm text-destructive mt-1">{errors.description.message}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="display_order">{t('library.displayOrder')}</Label>
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
                                        {t('library.active')}
                                    </Label>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={handleCloseDialog}>
                                {t('common.cancel')}
                            </Button>
                            <Button
                                type="submit"
                                disabled={createCategory.isPending || updateCategory.isPending}
                            >
                                {selectedCategory ? t('library.update') : t('library.create')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('library.areYouSure')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('library.deleteCategoryConfirm')} {t('library.deleteCategoryDescription')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={deleteCategory.isPending}
                        >
                            {deleteCategory.isPending ? t('library.deleting') : t('common.delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

