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
import { useLanguage } from '@/hooks/useLanguage';
import {
  useWebsiteMedia,
  useCreateWebsiteMedia,
  useUpdateWebsiteMedia,
  useDeleteWebsiteMedia,
  type WebsiteMedia,
} from '@/website/hooks/useWebsiteManager';
import { formatDate } from '@/lib/utils';

const mediaSchema = z.object({
  type: z.enum(['image', 'video', 'document']),
  filePath: z.string().min(1, 'File path is required'),
  fileName: z.string().optional().nullable(),
  altText: z.string().max(200).optional().nullable(),
});

type MediaFormData = z.infer<typeof mediaSchema>;

export default function MediaManagementPage() {
  const { t } = useLanguage();
  const { data: media = [], isLoading } = useWebsiteMedia();
  const createMedia = useCreateWebsiteMedia();
  const updateMedia = useUpdateWebsiteMedia();
  const deleteMedia = useDeleteWebsiteMedia();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editMedia, setEditMedia] = useState<WebsiteMedia | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const form = useForm<MediaFormData>({
    resolver: zodResolver(mediaSchema),
    defaultValues: {
      type: 'image',
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
      return matchesSearch && matchesType;
    });
  }, [media, searchQuery, typeFilter]);

  const handleCreate = async (data: MediaFormData) => {
    await createMedia.mutateAsync({
      type: data.type,
      filePath: data.filePath,
      fileName: data.fileName,
      altText: data.altText,
    });
    setIsCreateOpen(false);
    form.reset();
  };

  const handleUpdate = async (data: MediaFormData) => {
    if (!editMedia) return;
    await updateMedia.mutateAsync({
      id: editMedia.id,
      type: data.type,
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
                <TableHead>Alt Text</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMedia.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No media found
                  </TableCell>
                </TableRow>
              ) : (
                filteredMedia.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.type === 'image' ? (
                        <img
                          src={item.filePath}
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
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Media</DialogTitle>
            <DialogDescription>Add a new media item</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
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
              <Label htmlFor="filePath">File Path *</Label>
              <Input id="filePath" {...form.register('filePath')} placeholder="/path/to/file.jpg" />
              {form.formState.errors.filePath && (
                <p className="text-sm text-destructive">{form.formState.errors.filePath.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="fileName">File Name</Label>
              <Input id="fileName" {...form.register('fileName')} placeholder="image.jpg" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="altText">Alt Text</Label>
              <Input id="altText" {...form.register('altText')} placeholder="Description for accessibility" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMedia.isPending}>
                Upload
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
              <Label htmlFor="edit-filePath">File Path *</Label>
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

