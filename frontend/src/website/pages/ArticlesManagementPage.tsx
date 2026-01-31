import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, BookText, Search } from 'lucide-react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/layout/PageHeader';
import { FilterPanel } from '@/components/layout/FilterPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  useWebsitePosts,
  useCreateWebsitePost,
  useUpdateWebsitePost,
  useDeleteWebsitePost,
  type WebsitePost,
} from '@/website/hooks/useWebsiteManager';
import { StatusBadge } from '@/website/components/StatusBadge';
import { SeoFields } from '@/website/components/SeoFields';
import { ContentEditor } from '@/website/components/ContentEditor';
import { useWebsiteImageUpload } from '@/website/hooks/useWebsiteImageUpload';
import { formatDate } from '@/lib/utils';

const postSchema = z.object({
  slug: z.string().min(1, 'Slug is required').max(120),
  title: z.string().min(1, 'Title is required').max(200),
  status: z.enum(['draft', 'published', 'archived']),
  excerpt: z.string().max(500).optional().nullable(),
  content_json: z.any().optional().nullable(),
  seoTitle: z.string().max(60).optional().nullable(),
  seoDescription: z.string().max(160).optional().nullable(),
  seoImagePath: z.string().optional().nullable(),
  publishedAt: z.string().optional().nullable(),
});

type PostFormData = z.infer<typeof postSchema>;

export default function ArticlesManagementPage() {
  const { t, isRTL } = useLanguage();
  const { page, pageSize, setPage, setPageSize } = usePagination({ initialPageSize: 25 });
  const { data: postsData, isLoading } = useWebsitePosts(true);
  const posts = postsData?.data || [];
  const pagination = postsData?.pagination;
  const createPost = useCreateWebsitePost();
  const updatePost = useUpdateWebsitePost();
  const deletePost = useDeleteWebsitePost();
  const imageUpload = useWebsiteImageUpload();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editPost, setEditPost] = useState<WebsitePost | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const form = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      slug: '',
      title: '',
      status: 'draft',
      excerpt: null,
      content_json: null,
      seoTitle: null,
      seoDescription: null,
      seoImagePath: null,
      publishedAt: null,
    },
  });

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.slug.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || post.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [posts, searchQuery, statusFilter]);

  const handleImageUpload = async (file: File): Promise<string> => {
    const result = await imageUpload.mutateAsync(file);
    return result.url;
  };

  const handleCreate = async (data: PostFormData) => {
    await createPost.mutateAsync({
      slug: data.slug,
      title: data.title,
      status: data.status,
      excerpt: data.excerpt,
      contentJson: data.content_json,
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
      seoImagePath: data.seoImagePath,
      publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
    });
    setIsCreateOpen(false);
    form.reset();
  };

  const handleUpdate = async (data: PostFormData) => {
    if (!editPost) return;
    await updatePost.mutateAsync({
      id: editPost.id,
      slug: data.slug,
      title: data.title,
      status: data.status,
      excerpt: data.excerpt,
      contentJson: data.content_json,
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
      seoImagePath: data.seoImagePath,
      publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
    });
    setEditPost(null);
    form.reset();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deletePost.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const openEditDialog = (post: WebsitePost) => {
    setEditPost(post);
    form.reset({
      slug: post.slug,
      title: post.title,
      status: post.status as 'draft' | 'published' | 'archived',
      excerpt: post.excerpt,
      content_json: post.contentJson || null,
      seoTitle: post.seoTitle,
      seoDescription: post.seoDescription,
      seoImagePath: post.seoImagePath,
      publishedAt: post.publishedAt ? post.publishedAt.toISOString().slice(0, 16) : null,
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
        title={t('websiteAdmin.articles.title')}
        description={t('websiteAdmin.articles.description')}
        icon={<BookText className="h-5 w-5" />}
        primaryAction={{
          label: t('websiteAdmin.articles.new'),
          onClick: () => {
            form.reset();
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
                placeholder={t('websiteAdmin.articles.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('websiteAdmin.common.status')}</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('websiteAdmin.common.all')}</SelectItem>
                <SelectItem value="draft">{t('websiteAdmin.statuses.draft')}</SelectItem>
                <SelectItem value="published">{t('websiteAdmin.statuses.published')}</SelectItem>
                <SelectItem value="archived">{t('websiteAdmin.statuses.archived')}</SelectItem>
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
                <TableHead>{t('websiteAdmin.common.title')}</TableHead>
                <TableHead>{t('websiteAdmin.common.slug')}</TableHead>
                <TableHead>{t('websiteAdmin.common.excerpt')}</TableHead>
                <TableHead>{t('websiteAdmin.common.status')}</TableHead>
                <TableHead>{t('websiteAdmin.common.publishedAt')}</TableHead>
                <TableHead className="text-right">{t('websiteAdmin.common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPosts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {t('websiteAdmin.articles.noResults')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPosts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="font-medium">{post.title}</TableCell>
                    <TableCell className="text-muted-foreground">/{post.slug}</TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">
                      {post.excerpt || '-'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={post.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {post.publishedAt ? formatDate(post.publishedAt) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(post)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(post.id)}
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
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('websiteAdmin.articles.createTitle')}</DialogTitle>
            <DialogDescription>{t('websiteAdmin.articles.createDescription')}</DialogDescription>
          </DialogHeader>
          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="slug">{t('websiteAdmin.articles.fields.slug')} *</Label>
                  <Input id="slug" {...form.register('slug')} placeholder={t('websiteAdmin.articles.placeholders.slug')} />
                  {form.formState.errors.slug && (
                    <p className="text-sm text-destructive">{form.formState.errors.slug.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">{t('websiteAdmin.articles.fields.title')} *</Label>
                  <Input id="title" {...form.register('title')} placeholder={t('websiteAdmin.articles.placeholders.title')} />
                  {form.formState.errors.title && (
                    <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="excerpt">{t('websiteAdmin.articles.fields.excerpt')}</Label>
                <Textarea
                  id="excerpt"
                  {...form.register('excerpt')}
                  placeholder={t('websiteAdmin.articles.placeholders.excerpt')}
                  rows={3}
                  maxLength={500}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">{t('websiteAdmin.articles.fields.status')}</Label>
                  <Select
                    value={form.watch('status')}
                    onValueChange={(value) => form.setValue('status', value as 'draft' | 'published' | 'archived')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">{t('websiteAdmin.statuses.draft')}</SelectItem>
                      <SelectItem value="published">{t('websiteAdmin.statuses.published')}</SelectItem>
                      <SelectItem value="archived">{t('websiteAdmin.statuses.archived')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="publishedAt">{t('websiteAdmin.articles.fields.publishedAt')}</Label>
                  <Input
                    id="publishedAt"
                    type="datetime-local"
                    {...form.register('publishedAt')}
                  />
                </div>
              </div>
              <ContentEditor
                name="content_json"
                label={t('websiteAdmin.articles.fields.content')}
                placeholder={t('websiteAdmin.articles.placeholders.content')}
                onImageUpload={handleImageUpload}
              />
              <SeoFields />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={createPost.isPending}>
                  {t('common.create')}
                </Button>
              </DialogFooter>
            </form>
          </FormProvider>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editPost} onOpenChange={(open) => !open && setEditPost(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('websiteAdmin.articles.editTitle')}</DialogTitle>
            <DialogDescription>{t('websiteAdmin.articles.editDescription')}</DialogDescription>
          </DialogHeader>
          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(handleUpdate)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-slug">{t('websiteAdmin.articles.fields.slug')} *</Label>
                  <Input id="edit-slug" {...form.register('slug')} />
                  {form.formState.errors.slug && (
                    <p className="text-sm text-destructive">{form.formState.errors.slug.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-title">{t('websiteAdmin.articles.fields.title')} *</Label>
                  <Input id="edit-title" {...form.register('title')} />
                  {form.formState.errors.title && (
                    <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-excerpt">{t('websiteAdmin.articles.fields.excerpt')}</Label>
                <Textarea
                  id="edit-excerpt"
                  {...form.register('excerpt')}
                  rows={3}
                  maxLength={500}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-status">{t('websiteAdmin.articles.fields.status')}</Label>
                  <Select
                    value={form.watch('status')}
                    onValueChange={(value) => form.setValue('status', value as 'draft' | 'published' | 'archived')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">{t('websiteAdmin.statuses.draft')}</SelectItem>
                      <SelectItem value="published">{t('websiteAdmin.statuses.published')}</SelectItem>
                      <SelectItem value="archived">{t('websiteAdmin.statuses.archived')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-publishedAt">{t('websiteAdmin.articles.fields.publishedAt')}</Label>
                  <Input
                    id="edit-publishedAt"
                    type="datetime-local"
                    {...form.register('publishedAt')}
                  />
                </div>
              </div>
              <ContentEditor
                name="content_json"
                label={t('websiteAdmin.articles.fields.content')}
                placeholder={t('websiteAdmin.articles.placeholders.content')}
                onImageUpload={handleImageUpload}
              />
              <SeoFields />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditPost(null)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={updatePost.isPending}>
                  {t('common.update')}
                </Button>
              </DialogFooter>
            </form>
          </FormProvider>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('websiteAdmin.articles.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('websiteAdmin.articles.deleteDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deletePost.isPending}>
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
