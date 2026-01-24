import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, FileText, Search } from 'lucide-react';
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

const pageSchema = z.object({
  slug: z.string().min(1, 'Slug is required').max(120),
  title: z.string().min(1, 'Title is required').max(200),
  status: z.enum(['draft', 'published', 'archived']),
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

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editPage, setEditPage] = useState<WebsitePage | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const form = useForm<PageFormData>({
    resolver: zodResolver(pageSchema),
    defaultValues: {
      slug: '',
      title: '',
      status: 'draft',
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
        title="Pages"
        description="Manage website pages"
        icon={<FileText className="h-5 w-5" />}
        primaryAction={{
          label: 'New Page',
          onClick: () => {
            form.reset();
            setIsCreateOpen(true);
          },
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      <FilterPanel title="Filters">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Search</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search pages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
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
                <TableHead>Title</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Published</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No pages found
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
            <DialogTitle>Create Page</DialogTitle>
            <DialogDescription>Create a new website page</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input id="slug" {...form.register('slug')} placeholder="about-us" />
                {form.formState.errors.slug && (
                  <p className="text-sm text-destructive">{form.formState.errors.slug.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input id="title" {...form.register('title')} placeholder="About Us" />
                {form.formState.errors.title && (
                  <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={form.watch('status')}
                onValueChange={(value) => form.setValue('status', value as 'draft' | 'published' | 'archived')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="publishedAt">Published At</Label>
              <Input
                id="publishedAt"
                type="datetime-local"
                {...form.register('publishedAt')}
              />
            </div>
            <SeoFields />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createPage.isPending}>
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editPage} onOpenChange={(open) => !open && setEditPage(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Page</DialogTitle>
            <DialogDescription>Update page details</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleUpdate)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-slug">Slug *</Label>
                <Input id="edit-slug" {...form.register('slug')} />
                {form.formState.errors.slug && (
                  <p className="text-sm text-destructive">{form.formState.errors.slug.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title *</Label>
                <Input id="edit-title" {...form.register('title')} />
                {form.formState.errors.title && (
                  <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={form.watch('status')}
                onValueChange={(value) => form.setValue('status', value as 'draft' | 'published' | 'archived')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-publishedAt">Published At</Label>
              <Input
                id="edit-publishedAt"
                type="datetime-local"
                {...form.register('publishedAt')}
              />
            </div>
            <SeoFields />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditPage(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updatePage.isPending}>
                Update
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Page</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this page? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deletePage.isPending}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

