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
  const { t } = useLanguage();
  const { data: posts = [], isLoading } = useWebsitePosts();
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
        title="Articles & Blog"
        description="Manage blog posts and articles"
        icon={<BookText className="h-5 w-5" />}
        primaryAction={{
          label: 'New Article',
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
                placeholder="Search articles..."
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
                <TableHead>Excerpt</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Published</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPosts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No articles found
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

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Article</DialogTitle>
            <DialogDescription>Create a new blog post or article</DialogDescription>
          </DialogHeader>
          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug *</Label>
                  <Input id="slug" {...form.register('slug')} placeholder="my-article" />
                  {form.formState.errors.slug && (
                    <p className="text-sm text-destructive">{form.formState.errors.slug.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input id="title" {...form.register('title')} placeholder="Article Title" />
                  {form.formState.errors.title && (
                    <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  {...form.register('excerpt')}
                  placeholder="Brief summary of the article..."
                  rows={3}
                  maxLength={500}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>
              <ContentEditor
                name="content_json"
                label="Article Content"
                placeholder="Write your article..."
                onImageUpload={handleImageUpload}
              />
              <SeoFields />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createPost.isPending}>
                  Create
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
            <DialogTitle>Edit Article</DialogTitle>
            <DialogDescription>Update article details</DialogDescription>
          </DialogHeader>
          <FormProvider {...form}>
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
                <Label htmlFor="edit-excerpt">Excerpt</Label>
                <Textarea
                  id="edit-excerpt"
                  {...form.register('excerpt')}
                  rows={3}
                  maxLength={500}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>
              <ContentEditor
                name="content_json"
                label="Article Content"
                placeholder="Update the article content..."
                onImageUpload={handleImageUpload}
              />
              <SeoFields />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditPost(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updatePost.isPending}>
                  Update
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
            <AlertDialogTitle>Delete Article</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this article? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deletePost.isPending}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

