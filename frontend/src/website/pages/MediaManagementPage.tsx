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
  const { data: media = [], isLoading } = useWebsiteMedia();
  const { data: categories = [] } = useWebsiteMediaCategories();
  const createMedia = useCreateWebsiteMedia();
  const updateMedia = useUpdateWebsiteMedia();
  const deleteMedia = useDeleteWebsiteMedia();
  const formCategoryId = form.watch('categoryId');
  const imageUpload = useWebsiteImageUpload(formCategoryId);

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
        title="Media"
        description="Manage website media library"
        icon={<ImageIcon className="h-5 w-5" />}
        primaryAction={{
          label: 'Upload Media',
          onClick: () => {
            form.reset();
            setUploadedMediaId(null);
            setUploadedPreviewUrl(null);
            setIsCreateOpen(true);
          },
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      <FilterPanel title="Filters">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Search</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search media..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="document">Document</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
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
                <TableHead>Preview</TableHead>
                <TableHead>File Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Alt Text</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMedia.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No media found
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
                      {item.categoryId ? (categoryLookup.get(item.categoryId) || 'Uncategorized') : 'Uncategorized'}
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
            <DialogTitle>Add Media</DialogTitle>
            <DialogDescription>Add a new media item to your library</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
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
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Video (YouTube/Link)</SelectItem>
                  <SelectItem value="document">Document</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoryId">Category</Label>
              <Select
                value={form.watch('categoryId') || 'none'}
                onValueChange={(value) => form.setValue('categoryId', value === 'none' ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Uncategorized</SelectItem>
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
                <Label>Upload or select image</Label>
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
                    <p className="text-xs text-slate-600">Upload (1 or many)</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowLibraryPicker('create')}
                    className="shrink-0"
                  >
                    Select from library
                  </Button>
                </div>
                {pendingUploads.length > 0 && (
                  <div className="rounded-md border p-2 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      {pendingUploads.length} image(s) ready — category/alt below apply to all
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
                    Image URL or path (or use upload / library above)
                  </Label>
                  <Input
                    id="filePath"
                    {...form.register('filePath')}
                    placeholder="https://... or path"
                    disabled={!!uploadedMediaId && pendingUploads.length === 0}
                  />
                  {form.formState.errors.filePath && (
                    <p className="text-sm text-destructive">{form.formState.errors.filePath.message}</p>
                  )}
                </div>
              </div>
            ) : form.watch('type') === 'video' ? (
              <div className="space-y-2">
                <Label htmlFor="filePath">Video Link (YouTube, Vimeo, etc)</Label>
                <div className="flex gap-2">
                  <span className="flex items-center justify-center w-10 bg-slate-100 border rounded-l-md text-slate-500">
                    <Search className="h-4 w-4" />
                  </span>
                  <Input id="filePath" {...form.register('filePath')} className="rounded-l-none" placeholder="https://www.youtube.com/watch?v=..." />
                </div>
                <p className="text-xs text-slate-500">Supports YouTube, Vimeo, or direct MP4 links.</p>
                {form.formState.errors.filePath && (
                  <p className="text-sm text-destructive">{form.formState.errors.filePath.message}</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="filePath">Document URL</Label>
                <Input id="filePath" {...form.register('filePath')} placeholder="https://..." />
                {form.formState.errors.filePath && (
                  <p className="text-sm text-destructive">{form.formState.errors.filePath.message}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="fileName">Title / File Name</Label>
              <Input id="fileName" {...form.register('fileName')} placeholder="My Great Photo" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="altText">Alt Text / Description</Label>
              <Input id="altText" {...form.register('altText')} placeholder="Brief description of the content" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMedia.isPending}>
                Create Media
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editMedia} onOpenChange={(open) => !open && setEditMedia(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Media</DialogTitle>
            <DialogDescription>Update media details</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleUpdate)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-type">Type *</Label>
              <Select
                value={form.watch('type')}
                onValueChange={(value) => form.setValue('type', value as 'image' | 'video' | 'document')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="document">Document</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <Select
                value={form.watch('categoryId') || 'none'}
                onValueChange={(value) => form.setValue('categoryId', value === 'none' ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Uncategorized</SelectItem>
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
                  alt={form.watch('altText') || form.watch('fileName') || 'Media preview'}
                  className="w-full h-40 object-cover"
                />
              </div>
            )}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="edit-filePath" className="shrink-0">File Path *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLibraryPicker('edit')}
                  className="shrink-0"
                >
                  Select from library
                </Button>
              </div>
              <Input id="edit-filePath" {...form.register('filePath')} />
              {form.formState.errors.filePath && (
                <p className="text-sm text-destructive">{form.formState.errors.filePath.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-fileName">File Name</Label>
              <Input id="edit-fileName" {...form.register('fileName')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-altText">Alt Text</Label>
              <Input id="edit-altText" {...form.register('altText')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditMedia(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMedia.isPending}>
                Update
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Library Picker Dialog (create or edit) */}
      <Dialog open={!!showLibraryPicker} onOpenChange={(open) => !open && setShowLibraryPicker(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select from library</DialogTitle>
            <DialogDescription>Choose an existing image to use</DialogDescription>
          </DialogHeader>
          {filteredMedia.filter((m) => m.type === 'image').length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No images in library. Upload some first.</p>
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
            <AlertDialogTitle>Delete Media</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this media item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteMedia.isPending}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


