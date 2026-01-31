import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Pencil, Trash2, FolderOpen, Search, Upload, ImageIcon } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { FilterPanel } from '@/components/layout/FilterPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePagination } from '@/hooks/usePagination';
import { PAGE_SIZE_OPTIONS } from '@/types/pagination';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useLanguage } from '@/hooks/useLanguage';
import {
  useWebsiteMediaCategories,
  useCreateWebsiteMediaCategory,
  useUpdateWebsiteMediaCategory,
  useDeleteWebsiteMediaCategory,
  type WebsiteMediaCategory,
} from '@/website/hooks/useWebsiteManager';
import { useWebsiteImageUpload } from '@/website/hooks/useWebsiteImageUpload';
import { resolveMediaUrl } from '@/website/lib/mediaUrl';

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  slug: z.string().max(200).optional().nullable(),
  description: z.string().optional().nullable(),
  coverImagePath: z.string().optional().nullable(),
  sortOrder: z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? null : Number(value)),
    z.number().int().min(0).optional().nullable()
  ),
  isActive: z.boolean().optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

export default function WebsiteGalleryPage() {
  const { t, isRTL } = useLanguage();
  const { page, pageSize, setPage, setPageSize } = usePagination({ initialPageSize: 25 });
  const { data: categoriesData, isLoading } = useWebsiteMediaCategories(true);
  const categories = categoriesData?.data || [];
  const pagination = categoriesData?.pagination;
  const createCategory = useCreateWebsiteMediaCategory();
  const updateCategory = useUpdateWebsiteMediaCategory();
  const deleteCategory = useDeleteWebsiteMediaCategory();
  const imageUpload = useWebsiteImageUpload();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<WebsiteMediaCategory | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      coverImagePath: '',
      sortOrder: null,
      isActive: true,
    },
  });

  const filteredCategories = useMemo(() => {
    return categories.filter((category) => {
      const matchesSearch = category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        category.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        category.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && category.isActive) ||
        (statusFilter === 'inactive' && !category.isActive);
      return matchesSearch && matchesStatus;
    });
  }, [categories, searchQuery, statusFilter]);

  const handleCoverUpload = async (file: File) => {
    const result = await imageUpload.mutateAsync(file);
    form.setValue('coverImagePath', result.path, { shouldValidate: true });
    setPreviewUrl(result.url);
  };

  const handleCreate = async (data: CategoryFormData) => {
    const slugValue = data.slug?.trim() ? data.slug.trim() : null;
    await createCategory.mutateAsync({
      name: data.name,
      slug: slugValue,
      description: data.description,
      coverImagePath: data.coverImagePath,
      sortOrder: data.sortOrder ?? undefined,
      isActive: data.isActive ?? true,
    });
    setIsCreateOpen(false);
    form.reset();
    setPreviewUrl(null);
  };

  const handleUpdate = async (data: CategoryFormData) => {
    if (!editCategory) return;
    const slugValue = data.slug?.trim() ? data.slug.trim() : null;
    await updateCategory.mutateAsync({
      id: editCategory.id,
      name: data.name,
      slug: slugValue,
      description: data.description,
      coverImagePath: data.coverImagePath,
      sortOrder: data.sortOrder ?? undefined,
      isActive: data.isActive ?? true,
    });
    setEditCategory(null);
    form.reset();
    setPreviewUrl(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteCategory.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const openEditDialog = (category: WebsiteMediaCategory) => {
    setEditCategory(category);
    form.reset({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      coverImagePath: category.coverImagePath || '',
      sortOrder: category.sortOrder ?? null,
      isActive: category.isActive ?? true,
    });
    setPreviewUrl(resolveMediaUrl(category.coverImagePath) || null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <PageHeader
        title={t('websiteAdmin.gallery.title')}
        description={t('websiteAdmin.gallery.description')}
        icon={<FolderOpen className="h-5 w-5" />}
        primaryAction={{
          label: t('websiteAdmin.gallery.new'),
          onClick: () => {
            form.reset();
            setPreviewUrl(null);
            setIsCreateOpen(true);
          },
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      <FilterPanel title={t('websiteAdmin.common.filters')}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('websiteAdmin.common.search')}</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('websiteAdmin.gallery.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('websiteAdmin.common.status')}</Label>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | 'active' | 'inactive')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('websiteAdmin.common.all')}</SelectItem>
                <SelectItem value="active">{t('websiteAdmin.statuses.active')}</SelectItem>
                <SelectItem value="inactive">{t('websiteAdmin.statuses.inactive')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </FilterPanel>

      {filteredCategories.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          {t('websiteAdmin.gallery.noResults')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCategories.map((category) => (
            <Card key={category.id} className="overflow-hidden">
              <div className="aspect-[4/3] bg-muted relative">
{resolveMediaUrl(category.coverImagePath) ? (
                    <img
                    src={resolveMediaUrl(category.coverImagePath)}
                    alt={category.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute top-3 right-3 flex gap-2">
                  <Badge variant={category.isActive ? 'default' : 'secondary'}>
                    {category.isActive ? t('websiteAdmin.statuses.active') : t('websiteAdmin.statuses.inactive')}
                  </Badge>
                </div>
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{category.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs text-muted-foreground">
                  {t('websiteAdmin.gallery.slugLabel')}: {category.slug}
                </div>
                <p className="text-sm text-slate-600 line-clamp-3">
                  {category.description || t('websiteAdmin.gallery.noDescription')}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{t('websiteAdmin.gallery.sortLabel')}: {category.sortOrder ?? 0}</span>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" size="sm" onClick={() => openEditDialog(category)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteId(category.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.last_page > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-4">
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">{t('pagination.rowsPerPage') || 'Rows per page:'}</Label>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {pagination.total > 0 && (
              <span className="text-sm text-muted-foreground">
                {t('pagination.showing') || 'Showing'} {pagination.from ?? 0} {t('pagination.to') || 'to'} {pagination.to ?? 0} {t('pagination.of') || 'of'} {pagination.total} {t('pagination.entries') || 'entries'}
              </span>
            )}
          </div>
          <div className={isRTL ? 'dir-rtl' : 'dir-ltr'}>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setPage(Math.max(1, page - 1))}
                    className={page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                {(() => {
                  const pages: (number | 'ellipsis')[] = [];
                  const maxVisible = 7;
                  const totalPages = pagination.last_page;

                  if (totalPages <= maxVisible) {
                    for (let i = 1; i <= totalPages; i++) {
                      pages.push(i);
                    }
                  } else {
                    pages.push(1);
                    let start = Math.max(2, page - 1);
                    let end = Math.min(totalPages - 1, page + 1);

                    if (page <= 3) {
                      start = 2;
                      end = 4;
                    }

                    if (page >= totalPages - 2) {
                      start = totalPages - 3;
                      end = totalPages - 1;
                    }

                    if (start > 2) {
                      pages.push('ellipsis');
                    }

                    for (let i = start; i <= end; i++) {
                      pages.push(i);
                    }

                    if (end < totalPages - 1) {
                      pages.push('ellipsis');
                    }

                    pages.push(totalPages);
                  }

                  return pages.map((p, idx) => {
                    if (p === 'ellipsis') {
                      return (
                        <PaginationItem key={`ellipsis-${idx}`}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }
                    return (
                      <PaginationItem key={p}>
                        <PaginationLink
                          isActive={page === p}
                          onClick={() => setPage(p)}
                          className="cursor-pointer"
                        >
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  });
                })()}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setPage(Math.min(pagination.last_page, page + 1))}
                    className={page >= pagination.last_page ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) {
            form.reset();
            setPreviewUrl(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('websiteAdmin.gallery.createTitle')}</DialogTitle>
            <DialogDescription>{t('websiteAdmin.gallery.createDescription')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('websiteAdmin.gallery.fields.name')} *</Label>
              <Input id="name" {...form.register('name')} placeholder={t('websiteAdmin.gallery.placeholders.name')} />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">{t('websiteAdmin.common.slug')}</Label>
              <Input id="slug" {...form.register('slug')} placeholder={t('websiteAdmin.gallery.placeholders.slug')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t('websiteAdmin.common.description')}</Label>
              <Textarea id="description" {...form.register('description')} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>{t('websiteAdmin.gallery.fields.coverImage')}</Label>
              <div
                className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => document.getElementById('album-cover-upload')?.click()}
              >
                <input
                  id="album-cover-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      void handleCoverUpload(file);
                    }
                  }}
                />
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-slate-400" />
                  <p className="text-sm text-slate-600">{t('websiteAdmin.gallery.coverUploadCta')}</p>
                </div>
              </div>
              {previewUrl && (
                <div className="rounded-md border overflow-hidden">
                  <img src={previewUrl} alt={t('websiteAdmin.gallery.coverPreviewAlt')} className="w-full h-40 object-cover" />
                </div>
              )}
              <Input id="coverImagePath" {...form.register('coverImagePath')} placeholder={t('websiteAdmin.gallery.placeholders.coverPath')} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sortOrder">{t('websiteAdmin.common.sortOrder')}</Label>
                <Input id="sortOrder" type="number" {...form.register('sortOrder')} />
              </div>
              <div className="space-y-2">
                <Label>{t('websiteAdmin.common.status')}</Label>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.watch('isActive') ?? true}
                    onCheckedChange={(checked) => form.setValue('isActive', checked)}
                  />
                  <span className="text-sm text-slate-600">
                    {form.watch('isActive') ? t('websiteAdmin.statuses.active') : t('websiteAdmin.statuses.inactive')}
                  </span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createCategory.isPending}>
                {t('common.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editCategory} onOpenChange={(open) => !open && setEditCategory(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('websiteAdmin.gallery.editTitle')}</DialogTitle>
            <DialogDescription>{t('websiteAdmin.gallery.editDescription')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleUpdate)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">{t('websiteAdmin.gallery.fields.name')} *</Label>
              <Input id="edit-name" {...form.register('name')} />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-slug">{t('websiteAdmin.common.slug')}</Label>
              <Input id="edit-slug" {...form.register('slug')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">{t('websiteAdmin.common.description')}</Label>
              <Textarea id="edit-description" {...form.register('description')} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>{t('websiteAdmin.gallery.fields.coverImage')}</Label>
              <div
                className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => document.getElementById('album-cover-upload-edit')?.click()}
              >
                <input
                  id="album-cover-upload-edit"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      void handleCoverUpload(file);
                    }
                  }}
                />
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-slate-400" />
                  <p className="text-sm text-slate-600">{t('websiteAdmin.gallery.coverUploadCta')}</p>
                </div>
              </div>
              {previewUrl && (
                <div className="rounded-md border overflow-hidden">
                  <img src={previewUrl} alt={t('websiteAdmin.gallery.coverPreviewAlt')} className="w-full h-40 object-cover" />
                </div>
              )}
              <Input id="edit-coverImagePath" {...form.register('coverImagePath')} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-sortOrder">{t('websiteAdmin.common.sortOrder')}</Label>
                <Input id="edit-sortOrder" type="number" {...form.register('sortOrder')} />
              </div>
              <div className="space-y-2">
                <Label>{t('websiteAdmin.common.status')}</Label>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.watch('isActive') ?? true}
                    onCheckedChange={(checked) => form.setValue('isActive', checked)}
                  />
                  <span className="text-sm text-slate-600">
                    {form.watch('isActive') ? t('websiteAdmin.statuses.active') : t('websiteAdmin.statuses.inactive')}
                  </span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditCategory(null)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={updateCategory.isPending}>
                {t('common.update')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('websiteAdmin.gallery.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('websiteAdmin.gallery.deleteDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
