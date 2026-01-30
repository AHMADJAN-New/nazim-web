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
  const { data: categories = [], isLoading } = useWebsiteMediaCategories();
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
        title="Gallery Albums"
        description="Manage gallery albums and cover images."
        icon={<FolderOpen className="h-5 w-5" />}
        primaryAction={{
          label: 'New Album',
          onClick: () => {
            form.reset();
            setPreviewUrl(null);
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
                placeholder="Search albums..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | 'active' | 'inactive')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </FilterPanel>

      {filteredCategories.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          No gallery albums found.
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
                    {category.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{category.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs text-muted-foreground">Slug: {category.slug}</div>
                <p className="text-sm text-slate-600 line-clamp-3">
                  {category.description || 'No description provided.'}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Sort: {category.sortOrder ?? 0}</span>
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
            <DialogTitle>Create Album</DialogTitle>
            <DialogDescription>Add a new gallery album</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" {...form.register('name')} placeholder="Graduation 2024" />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" {...form.register('slug')} placeholder="graduation-2024" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...form.register('description')} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Cover Image</Label>
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
                  <p className="text-sm text-slate-600">Click to upload cover</p>
                </div>
              </div>
              {previewUrl && (
                <div className="rounded-md border overflow-hidden">
                  <img src={previewUrl} alt="Cover preview" className="w-full h-40 object-cover" />
                </div>
              )}
              <Input id="coverImagePath" {...form.register('coverImagePath')} placeholder="Storage path or URL" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Input id="sortOrder" type="number" {...form.register('sortOrder')} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.watch('isActive') ?? true}
                    onCheckedChange={(checked) => form.setValue('isActive', checked)}
                  />
                  <span className="text-sm text-slate-600">
                    {form.watch('isActive') ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createCategory.isPending}>
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editCategory} onOpenChange={(open) => !open && setEditCategory(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Album</DialogTitle>
            <DialogDescription>Update album details</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleUpdate)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input id="edit-name" {...form.register('name')} />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-slug">Slug</Label>
              <Input id="edit-slug" {...form.register('slug')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea id="edit-description" {...form.register('description')} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Cover Image</Label>
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
                  <p className="text-sm text-slate-600">Click to upload cover</p>
                </div>
              </div>
              {previewUrl && (
                <div className="rounded-md border overflow-hidden">
                  <img src={previewUrl} alt="Cover preview" className="w-full h-40 object-cover" />
                </div>
              )}
              <Input id="edit-coverImagePath" {...form.register('coverImagePath')} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-sortOrder">Sort Order</Label>
                <Input id="edit-sortOrder" type="number" {...form.register('sortOrder')} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.watch('isActive') ?? true}
                    onCheckedChange={(checked) => form.setValue('isActive', checked)}
                  />
                  <span className="text-sm text-slate-600">
                    {form.watch('isActive') ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditCategory(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateCategory.isPending}>
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
            <AlertDialogTitle>Delete Album</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the album. Media items inside will be left uncategorized.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

