import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, ImageIcon, Search, Upload } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/layout/PageHeader';
import { FilterPanel } from '@/components/layout/FilterPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  useWebsiteMedia,
  useWebsiteMediaCategories,
  useCreateWebsiteMedia,
  useUpdateWebsiteMedia,
  useDeleteWebsiteMedia,
  type WebsiteMedia,
} from '@/website/hooks/useWebsiteManager';
import { useWebsiteImageUpload } from '@/website/hooks/useWebsiteImageUpload';
import { resolveMediaUrl } from '@/website/lib/mediaUrl';
import { formatDate } from '@/lib/utils';

const mediaSchema = z.object({
  type: z.enum(['image', 'video', 'document']),
  categoryId: z.string().optional().nullable(),
  filePath: z.string().min(1, 'File path is required'),
  fileName: z.string().optional().nullable(),
  altText: z.string().max(200).optional().nullable(),
});

type MediaFormData = z.infer<typeof mediaSchema>;

export default function MediaManagementPage() {
  const { t, isRTL } = useLanguage();
  const { page, pageSize, setPage, setPageSize } = usePagination({ initialPageSize: 25 });
  const { data: mediaData, isLoading } = useWebsiteMedia(true);
  const media = mediaData?.data || [];
  const pagination = mediaData?.pagination;
  const { data: categoriesData } = useWebsiteMediaCategories(false);
  const categories = categoriesData?.data || [];
  const createMedia = useCreateWebsiteMedia();
  const updateMedia = useUpdateWebsiteMedia();
  const deleteMedia = useDeleteWebsiteMedia();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editMedia, setEditMedia] = useState<WebsiteMedia | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploadedMediaId, setUploadedMediaId] = useState<string | null>(null);
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState<string | null>(null);
  const [showLibraryPicker, setShowLibraryPicker] = useState<'create' | 'edit' | null>(null);
  const [pendingUploads, setPendingUploads] = useState<Array<{ path: string; fileName: string; mediaId?: string }>>([]);

  const form = useForm<MediaFormData>({
    resolver: zodResolver(mediaSchema),
    defaultValues: {
      type: 'image',
      categoryId: null,
      filePath: '',
      fileName: null,
      altText: null,
    },
  });

  const formCategoryId = form.watch('categoryId');
  const imageUpload = useWebsiteImageUpload(formCategoryId);

  const filteredMedia = useMemo(() => {
    return media.filter((item) => {
      const matchesSearch = item.fileName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.filePath.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.altText?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || item.type === typeFilter;
      const matchesCategory = categoryFilter === 'all' || item.categoryId === categoryFilter;
      return matchesSearch && matchesType && matchesCategory;
    });
  }, [media, searchQuery, typeFilter, categoryFilter]);

  const categoryLookup = useMemo(() => {
    return new Map(categories.map((category) => [category.id, category.name]));
  }, [categories]);

  const handleImageUpload = async (file: File) => {
    const result = await imageUpload.mutateAsync(file);
    setUploadedMediaId(result.mediaId);
    setUploadedPreviewUrl(result.url);
    form.setValue('filePath', result.path, { shouldValidate: true });
    form.setValue('fileName', file.name, { shouldValidate: true });
    form.setValue('type', 'image');
  };

  const handleMultipleImageUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    const newPending: Array<{ path: string; fileName: string; mediaId: string }> = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      try {
        const result = await imageUpload.mutateAsync(file);
        newPending.push({ path: result.path, fileName: file.name, mediaId: result.mediaId });
      } catch {
        // toast already shown by hook
      }
    }
    setPendingUploads((prev) => [...prev, ...newPending]);
    if (newPending.length > 0) {
      form.setValue('filePath', newPending[0].path, { shouldValidate: true });
      form.setValue('fileName', newPending[0].fileName, { shouldValidate: true });
      form.setValue('type', 'image');
      setUploadedMediaId(newPending[0].mediaId);
      setUploadedPreviewUrl(resolveMediaUrl(newPending[0].path));
    }
  };

  const handlePickFromLibrary = (item: WebsiteMedia) => {
    form.setValue('filePath', item.filePath, { shouldValidate: true });
    form.setValue('fileName', item.fileName ?? item.filePath, { shouldValidate: true });
    form.setValue('altText', item.altText ?? null, { shouldValidate: true });
    form.setValue('type', 'image');
    setUploadedMediaId(null);
    setUploadedPreviewUrl(resolveMediaUrl(item.filePath));
    setShowLibraryPicker(null);
  };

  const handleCreate = async (data: MediaFormData) => {
    if (pendingUploads.length > 0) {
      for (const pending of pendingUploads) {
        await updateMedia.mutateAsync({
          id: pending.mediaId,
          type: data.type,
          categoryId: data.categoryId,
          fileName: pending.fileName,
          altText: data.altText,
        });
      }
    } else if (uploadedMediaId) {
      await updateMedia.mutateAsync({
        id: uploadedMediaId,
        type: data.type,
        categoryId: data.categoryId,
        fileName: data.fileName,
        altText: data.altText,
      });
    } else {
      await createMedia.mutateAsync({
        type: data.type,
        categoryId: data.categoryId,
        filePath: data.filePath,
        fileName: data.fileName,
        altText: data.altText,
      });
    }
    setIsCreateOpen(false);
    form.reset();
    setUploadedMediaId(null);
    setUploadedPreviewUrl(null);
    setPendingUploads([]);
  };

  const handleUpdate = async (data: MediaFormData) => {
    if (!editMedia) return;
    await updateMedia.mutateAsync({
      id: editMedia.id,
      type: data.type,
      categoryId: data.categoryId,
      filePath: data.filePath,
      fileName: data.fileName,
      altText: data.altText,
    });
    setEditMedia(null);
    form.reset();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteMedia.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const openEditDialog = (item: WebsiteMedia) => {
    setEditMedia(item);
    form.reset({
      type: item.type as 'image' | 'video' | 'document',
      categoryId: item.categoryId ?? null,
      filePath: item.filePath,
      fileName: item.fileName,
      altText: item.altText,
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
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <PageHeader
        title={t('websiteAdmin.media.title')}
        description={t('websiteAdmin.media.description')}
        icon={<ImageIcon className="h-5 w-5" />}
        primaryAction={{
          label: t('websiteAdmin.media.new'),
          onClick: () => {
            form.reset();
            setUploadedMediaId(null);
            setUploadedPreviewUrl(null);
            setIsCreateOpen(true);
          },
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      <FilterPanel title={t('websiteAdmin.common.filters')}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>{t('websiteAdmin.common.search')}</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('websiteAdmin.media.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('websiteAdmin.common.type')}</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('websiteAdmin.common.all')}</SelectItem>
                <SelectItem value="image">{t('websiteAdmin.media.types.image')}</SelectItem>
                <SelectItem value="video">{t('websiteAdmin.media.types.video')}</SelectItem>
                <SelectItem value="document">{t('websiteAdmin.media.types.document')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('websiteAdmin.common.category')}</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('websiteAdmin.common.category')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('websiteAdmin.common.all')}</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </FilterPanel>

      <div className="rounded-md border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('websiteAdmin.common.preview')}</TableHead>
                <TableHead>{t('websiteAdmin.common.fileName')}</TableHead>
                <TableHead>{t('websiteAdmin.common.type')}</TableHead>
                <TableHead>{t('websiteAdmin.common.category')}</TableHead>
                <TableHead>{t('websiteAdmin.common.altText')}</TableHead>
                <TableHead>{t('websiteAdmin.common.created')}</TableHead>
                <TableHead className="text-right">{t('websiteAdmin.common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMedia.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    {t('websiteAdmin.media.noResults')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredMedia.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.type === 'image' ? (
                        <img
                          src={resolveMediaUrl(item.filePath)}
                          alt={item.altText || item.fileName || 'Media'}
                          className="h-12 w-12 object-cover rounded"
                        />
                      ) : (
                        <div className="h-12 w-12 bg-muted rounded flex items-center justify-center">
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{item.fileName || item.filePath}</TableCell>
                    <TableCell>
                      <span className="capitalize">{item.type}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.categoryId ? (categoryLookup.get(item.categoryId) || t('websiteAdmin.media.uncategorized')) : t('websiteAdmin.media.uncategorized')}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">
                      {item.altText || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(item.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

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
            setUploadedMediaId(null);
            setUploadedPreviewUrl(null);
            setPendingUploads([]);
            form.reset();
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('websiteAdmin.media.createTitle')}</DialogTitle>
            <DialogDescription>{t('websiteAdmin.media.createDescription')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="type">{t('websiteAdmin.media.fields.type')} *</Label>
              <Select
                value={form.watch('type')}
                onValueChange={(value) => {
                  form.setValue('type', value as 'image' | 'video' | 'document');
                  form.setValue('filePath', ''); // Reset path on type change
                  setUploadedMediaId(null);
                  setUploadedPreviewUrl(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">{t('websiteAdmin.media.types.image')}</SelectItem>
                  <SelectItem value="video">{t('websiteAdmin.media.types.video')}</SelectItem>
                  <SelectItem value="document">{t('websiteAdmin.media.types.document')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoryId">{t('websiteAdmin.media.fields.category')}</Label>
              <Select
                value={form.watch('categoryId') || 'none'}
                onValueChange={(value) => form.setValue('categoryId', value === 'none' ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('websiteAdmin.media.placeholders.selectCategory')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('websiteAdmin.media.uncategorized')}</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.watch('type') === 'image' ? (
              <div className="space-y-3">
                <Label>{t('websiteAdmin.media.helpers.uploadOrSelect')}</Label>
                <div className="flex flex-wrap gap-2">
                  <div
                    className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:bg-slate-50 transition-colors cursor-pointer min-w-[140px]"
                    onClick={() => document.getElementById('file-upload-input')?.click()}
                  >
                    <input
                      id="file-upload-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      multiple
                      onChange={(e) => {
                        const files = e.target.files;
                        if (files?.length === 1) void handleImageUpload(files[0]);
                        else if (files?.length) void handleMultipleImageUpload(files);
                        e.target.value = '';
                      }}
                    />
                    <Upload className="h-6 w-6 text-slate-400 mx-auto mb-1" />
                    <p className="text-xs text-slate-600">{t('websiteAdmin.media.helpers.uploadHint')}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowLibraryPicker('create')}
                    className="shrink-0"
                  >
                    {t('websiteAdmin.media.selectFromLibrary')}
                  </Button>
                </div>
                {pendingUploads.length > 0 && (
                  <div className="rounded-md border p-2 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      {t('websiteAdmin.media.helpers.categoryAppliesToAll', { count: pendingUploads.length })}
                    </p>
                    <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                      {pendingUploads.map((p, i) => (
                        <div key={p.mediaId} className="relative w-14 h-14 rounded border overflow-hidden shrink-0">
                          <img src={resolveMediaUrl(p.path)} alt={p.fileName} className="w-full h-full object-cover" />
                          <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center truncate">
                            {i + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {(uploadedPreviewUrl || form.watch('filePath')) && pendingUploads.length === 0 && (
                  <div className="rounded-md border overflow-hidden">
                    <img
                      src={uploadedPreviewUrl || resolveMediaUrl(form.watch('filePath'))}
                      alt="Preview"
                      className="w-full h-40 object-cover"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="filePath" className="text-xs text-slate-500">
                    {t('websiteAdmin.media.helpers.imageUrlHint')}
                  </Label>
                  <Input
                    id="filePath"
                    {...form.register('filePath')}
                    placeholder={t('websiteAdmin.media.placeholders.imageUrl')}
                    disabled={!!uploadedMediaId && pendingUploads.length === 0}
                  />
                  {form.formState.errors.filePath && (
                    <p className="text-sm text-destructive">{form.formState.errors.filePath.message}</p>
                  )}
                </div>
              </div>
            ) : form.watch('type') === 'video' ? (
              <div className="space-y-2">
                <Label htmlFor="filePath">{t('websiteAdmin.media.types.video')}</Label>
                <div className="flex gap-2">
                  <span className="flex items-center justify-center w-10 bg-slate-100 border rounded-l-md text-slate-500">
                    <Search className="h-4 w-4" />
                  </span>
                  <Input id="filePath" {...form.register('filePath')} className="rounded-l-none" placeholder={t('websiteAdmin.media.placeholders.videoUrl')} />
                </div>
                <p className="text-xs text-slate-500">{t('websiteAdmin.media.helpers.videoHint')}</p>
                {form.formState.errors.filePath && (
                  <p className="text-sm text-destructive">{form.formState.errors.filePath.message}</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="filePath">{t('websiteAdmin.media.types.document')}</Label>
                <Input id="filePath" {...form.register('filePath')} placeholder={t('websiteAdmin.media.placeholders.documentUrl')} />
                {form.formState.errors.filePath && (
                  <p className="text-sm text-destructive">{form.formState.errors.filePath.message}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="fileName">{t('websiteAdmin.media.fields.fileName')}</Label>
              <Input id="fileName" {...form.register('fileName')} placeholder={t('websiteAdmin.media.placeholders.fileName')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="altText">{t('websiteAdmin.media.fields.altText')}</Label>
              <Input id="altText" {...form.register('altText')} placeholder={t('websiteAdmin.media.placeholders.altText')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createMedia.isPending}>
                {t('common.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editMedia} onOpenChange={(open) => !open && setEditMedia(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('websiteAdmin.media.editTitle')}</DialogTitle>
            <DialogDescription>{t('websiteAdmin.media.editDescription')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleUpdate)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-type">{t('websiteAdmin.media.fields.type')} *</Label>
              <Select
                value={form.watch('type')}
                onValueChange={(value) => form.setValue('type', value as 'image' | 'video' | 'document')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">{t('websiteAdmin.media.types.image')}</SelectItem>
                  <SelectItem value="video">{t('websiteAdmin.media.types.video')}</SelectItem>
                  <SelectItem value="document">{t('websiteAdmin.media.types.document')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">{t('websiteAdmin.media.fields.category')}</Label>
              <Select
                value={form.watch('categoryId') || 'none'}
                onValueChange={(value) => form.setValue('categoryId', value === 'none' ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('websiteAdmin.media.placeholders.selectCategory')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('websiteAdmin.media.uncategorized')}</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.watch('type') === 'image' && form.watch('filePath') && (
              <div className="rounded-md border overflow-hidden">
                <img
                  src={resolveMediaUrl(form.watch('filePath'))}
                  alt={form.watch('altText') || form.watch('fileName') || t('websiteAdmin.media.previewAlt')}
                  className="w-full h-40 object-cover"
                />
              </div>
            )}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="edit-filePath" className="shrink-0">{t('websiteAdmin.media.fields.filePath')} *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLibraryPicker('edit')}
                  className="shrink-0"
                >
                  {t('websiteAdmin.media.selectFromLibrary')}
                </Button>
              </div>
              <Input id="edit-filePath" {...form.register('filePath')} />
              {form.formState.errors.filePath && (
                <p className="text-sm text-destructive">{form.formState.errors.filePath.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-fileName">{t('websiteAdmin.common.fileName')}</Label>
              <Input id="edit-fileName" {...form.register('fileName')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-altText">{t('websiteAdmin.common.altText')}</Label>
              <Input id="edit-altText" {...form.register('altText')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditMedia(null)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={updateMedia.isPending}>
                {t('common.update')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Library Picker Dialog (create or edit) */}
      <Dialog open={!!showLibraryPicker} onOpenChange={(open) => !open && setShowLibraryPicker(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('websiteAdmin.media.libraryPickerTitle')}</DialogTitle>
            <DialogDescription>{t('websiteAdmin.media.libraryPickerDescription')}</DialogDescription>
          </DialogHeader>
          {filteredMedia.filter((m) => m.type === 'image').length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">{t('websiteAdmin.media.noLibraryImages')}</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filteredMedia
                .filter((m) => m.type === 'image')
                .map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handlePickFromLibrary(item)}
                    className="relative aspect-square rounded-lg border-2 border-border hover:border-primary/50 overflow-hidden transition-colors"
                  >
                    <img
                      src={resolveMediaUrl(item.filePath)}
                      alt={item.altText || item.fileName || 'Media'}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 truncate">
                      {item.fileName || item.filePath}
                    </span>
                  </button>
                ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('websiteAdmin.media.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('websiteAdmin.media.deleteDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteMedia.isPending}>
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

