import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, FileText, Search } from 'lucide-react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/layout/PageHeader';
import { FilterPanel } from '@/components/layout/FilterPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/hooks/useLanguage';
import {
  useWebsitePages,
  useCreateWebsitePage,
  useUpdateWebsitePage,
  useDeleteWebsitePage,
  type WebsitePage,
} from '@/website/hooks/useWebsiteManager';
import { StatusBadge } from '@/website/components/StatusBadge';
import { SeoFields } from '@/website/components/SeoFields';
import { ContentEditor } from '@/website/components/ContentEditor';
import { formatDate } from '@/lib/utils';
import { useWebsiteImageUpload } from '@/website/hooks/useWebsiteImageUpload';

const pageSchema = z.object({
  slug: z.string().min(1, 'Slug is required').max(120),
  title: z.string().min(1, 'Title is required').max(200),
  status: z.enum(['draft', 'published', 'archived']),
  content_json: z.any().optional().nullable(),
  seoTitle: z.string().max(60).optional().nullable(),
  seoDescription: z.string().max(160).optional().nullable(),
  seoImagePath: z.string().optional().nullable(),
  publishedAt: z.string().optional().nullable(),
});

type PageFormData = z.infer<typeof pageSchema>;

export default function PagesManagementPage() {
  const { t } = useLanguage();
  const { data: pages = [], isLoading } = useWebsitePages();
  const createPage = useCreateWebsitePage();
  const updatePage = useUpdateWebsitePage();
  const deletePage = useDeleteWebsitePage();
  const imageUpload = useWebsiteImageUpload();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editPage, setEditPage] = useState<WebsitePage | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Image upload handler for ContentEditor
  const handleImageUpload = async (file: File): Promise<string> => {
    const result = await imageUpload.mutateAsync(file);
    return result.url;
  };

  const form = useForm<PageFormData>({
    resolver: zodResolver(pageSchema),
    defaultValues: {
      slug: '',
      title: '',
      status: 'draft',
      content_json: null,
      seoTitle: null,
      seoDescription: null,
      seoImagePath: null,
      publishedAt: null,
    },
  });

  const filteredPages = useMemo(() => {
    return pages.filter((page) => {
      const matchesSearch = page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        page.slug.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || page.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [pages, searchQuery, statusFilter]);

  const handleCreate = async (data: PageFormData) => {
    await createPage.mutateAsync({
      slug: data.slug,
      title: data.title,
      status: data.status,
      contentJson: data.content_json,
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
      seoImagePath: data.seoImagePath,
      publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
    });
    setIsCreateOpen(false);
    form.reset();
  };

  const handleUpdate = async (data: PageFormData) => {
    if (!editPage) return;
    await updatePage.mutateAsync({
      id: editPage.id,
      slug: data.slug,
      title: data.title,
      status: data.status,
      contentJson: data.content_json,
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
      seoImagePath: data.seoImagePath,
      publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
    });
    setEditPage(null);
    form.reset();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deletePage.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const openEditDialog = (page: WebsitePage) => {
    setEditPage(page);
    form.reset({
      slug: page.slug,
      title: page.title,
      status: page.status as 'draft' | 'published' | 'archived',
      content_json: page.contentJson || null,
      seoTitle: page.seoTitle,
      seoDescription: page.seoDescription,
      seoImagePath: page.seoImagePath,
      publishedAt: page.publishedAt ? page.publishedAt.toISOString().slice(0, 16) : null,
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
        title={t('websiteAdmin.pages.title')}
        description={t('websiteAdmin.pages.description')}
        icon={<FileText className="h-5 w-5" />}
        primaryAction={{
          label: t('websiteAdmin.pages.new'),
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
                placeholder={t('websiteAdmin.pages.searchPlaceholder')}
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
                <TableHead>{t('websiteAdmin.common.status')}</TableHead>
                <TableHead>{t('websiteAdmin.common.publishedAt')}</TableHead>
                <TableHead className="text-right">{t('websiteAdmin.common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {t('websiteAdmin.pages.noResults')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPages.map((page) => (
                  <TableRow key={page.id}>
                    <TableCell className="font-medium">{page.title}</TableCell>
                    <TableCell className="text-muted-foreground">/{page.slug}</TableCell>
                    <TableCell>
                      <StatusBadge status={page.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {page.publishedAt ? formatDate(page.publishedAt) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(page)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(page.id)}
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

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('websiteAdmin.pages.createTitle')}</DialogTitle>
            <DialogDescription>{t('websiteAdmin.pages.createDescription')}</DialogDescription>
          </DialogHeader>
          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="slug">{t('websiteAdmin.pages.fields.slug')} *</Label>
                <Input id="slug" {...form.register('slug')} placeholder={t('websiteAdmin.pages.placeholders.slug')} />
                {form.formState.errors.slug && (
                  <p className="text-sm text-destructive">{form.formState.errors.slug.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">{t('websiteAdmin.pages.fields.title')} *</Label>
                <Input id="title" {...form.register('title')} placeholder={t('websiteAdmin.pages.placeholders.title')} />
                {form.formState.errors.title && (
                  <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">{t('websiteAdmin.pages.fields.status')}</Label>
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
              <Label htmlFor="publishedAt">{t('websiteAdmin.pages.fields.publishedAt')}</Label>
              <Input
                id="publishedAt"
                type="datetime-local"
                {...form.register('publishedAt')}
              />
            </div>
            <ContentEditor 
              name="content_json" 
              label={t('websiteAdmin.pages.fields.content')}
              onImageUpload={handleImageUpload}
            />
            <SeoFields />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createPage.isPending}>
                {t('common.create')}
              </Button>
            </DialogFooter>
            </form>
          </FormProvider>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editPage} onOpenChange={(open) => !open && setEditPage(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('websiteAdmin.pages.editTitle')}</DialogTitle>
            <DialogDescription>{t('websiteAdmin.pages.editDescription')}</DialogDescription>
          </DialogHeader>
          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(handleUpdate)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-slug">{t('websiteAdmin.pages.fields.slug')} *</Label>
                <Input id="edit-slug" {...form.register('slug')} />
                {form.formState.errors.slug && (
                  <p className="text-sm text-destructive">{form.formState.errors.slug.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-title">{t('websiteAdmin.pages.fields.title')} *</Label>
                <Input id="edit-title" {...form.register('title')} />
                {form.formState.errors.title && (
                  <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">{t('websiteAdmin.pages.fields.status')}</Label>
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
              <Label htmlFor="edit-publishedAt">{t('websiteAdmin.pages.fields.publishedAt')}</Label>
              <Input
                id="edit-publishedAt"
                type="datetime-local"
                {...form.register('publishedAt')}
              />
            </div>
            <ContentEditor 
              name="content_json" 
              label={t('websiteAdmin.pages.fields.content')}
              onImageUpload={handleImageUpload}
            />
            <SeoFields />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditPage(null)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={updatePage.isPending}>
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
            <AlertDialogTitle>{t('websiteAdmin.pages.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('websiteAdmin.pages.deleteDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deletePage.isPending}>
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

