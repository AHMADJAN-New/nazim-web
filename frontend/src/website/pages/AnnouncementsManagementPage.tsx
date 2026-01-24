import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Megaphone, Search, Pin } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/layout/PageHeader';
import { FilterPanel } from '@/components/layout/FilterPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
  useWebsiteAnnouncements,
  useCreateWebsiteAnnouncement,
  useUpdateWebsiteAnnouncement,
  useDeleteWebsiteAnnouncement,
  type WebsiteAnnouncement,
} from '@/website/hooks/useWebsiteManager';
import { StatusBadge } from '@/website/components/StatusBadge';
import { formatDate, formatDateTime } from '@/lib/utils';

const announcementSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  content: z.string().optional().nullable(),
  status: z.enum(['draft', 'scheduled', 'published', 'archived']),
  publishedAt: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  isPinned: z.boolean().default(false),
});

type AnnouncementFormData = z.infer<typeof announcementSchema>;

export default function AnnouncementsManagementPage() {
  const { t } = useLanguage();
  const { data: announcements = [], isLoading } = useWebsiteAnnouncements();
  const createAnnouncement = useCreateWebsiteAnnouncement();
  const updateAnnouncement = useUpdateWebsiteAnnouncement();
  const deleteAnnouncement = useDeleteWebsiteAnnouncement();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editAnnouncement, setEditAnnouncement] = useState<WebsiteAnnouncement | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const form = useForm<AnnouncementFormData>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: '',
      content: null,
      status: 'draft',
      publishedAt: null,
      expiresAt: null,
      isPinned: false,
    },
  });

  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((announcement) => {
      const matchesSearch = announcement.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        announcement.content?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || announcement.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [announcements, searchQuery, statusFilter]);

  const handleCreate = async (data: AnnouncementFormData) => {
    await createAnnouncement.mutateAsync({
      title: data.title,
      content: data.content,
      status: data.status,
      publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      isPinned: data.isPinned,
    });
    setIsCreateOpen(false);
    form.reset();
  };

  const handleUpdate = async (data: AnnouncementFormData) => {
    if (!editAnnouncement) return;
    await updateAnnouncement.mutateAsync({
      id: editAnnouncement.id,
      title: data.title,
      content: data.content,
      status: data.status,
      publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      isPinned: data.isPinned,
    });
    setEditAnnouncement(null);
    form.reset();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteAnnouncement.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const openEditDialog = (announcement: WebsiteAnnouncement) => {
    setEditAnnouncement(announcement);
    form.reset({
      title: announcement.title,
      content: announcement.content,
      status: announcement.status as 'draft' | 'scheduled' | 'published' | 'archived',
      publishedAt: announcement.publishedAt ? announcement.publishedAt.toISOString().slice(0, 16) : null,
      expiresAt: announcement.expiresAt ? announcement.expiresAt.toISOString().slice(0, 16) : null,
      isPinned: announcement.isPinned ?? false,
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
        title="Announcements"
        description="Manage website announcements"
        icon={<Megaphone className="h-5 w-5" />}
        primaryAction={{
          label: 'New Announcement',
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
                placeholder="Search announcements..."
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
                <SelectItem value="scheduled">Scheduled</SelectItem>
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
                <TableHead>Status</TableHead>
                <TableHead>Pinned</TableHead>
                <TableHead>Published</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAnnouncements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No announcements found
                  </TableCell>
                </TableRow>
              ) : (
                filteredAnnouncements.map((announcement) => (
                  <TableRow key={announcement.id}>
                    <TableCell className="font-medium">{announcement.title}</TableCell>
                    <TableCell>
                      <StatusBadge status={announcement.status} />
                    </TableCell>
                    <TableCell>
                      {announcement.isPinned ? (
                        <Pin className="h-4 w-4 text-yellow-600" />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {announcement.publishedAt ? formatDateTime(announcement.publishedAt) : '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {announcement.expiresAt ? formatDateTime(announcement.expiresAt) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(announcement)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(announcement.id)}
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
            <DialogTitle>Create Announcement</DialogTitle>
            <DialogDescription>Create a new announcement</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" {...form.register('title')} placeholder="Announcement Title" />
              {form.formState.errors.title && (
                <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                {...form.register('content')}
                placeholder="Announcement content..."
                rows={6}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={form.watch('status')}
                  onValueChange={(value) => form.setValue('status', value as 'draft' | 'scheduled' | 'published' | 'archived')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
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
            <div className="space-y-2">
              <Label htmlFor="expiresAt">Expires At</Label>
              <Input
                id="expiresAt"
                type="datetime-local"
                {...form.register('expiresAt')}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isPinned"
                checked={form.watch('isPinned')}
                onCheckedChange={(checked) => form.setValue('isPinned', checked)}
              />
              <Label htmlFor="isPinned">Pin to Homepage</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createAnnouncement.isPending}>
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editAnnouncement} onOpenChange={(open) => !open && setEditAnnouncement(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Announcement</DialogTitle>
            <DialogDescription>Update announcement details</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleUpdate)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title *</Label>
              <Input id="edit-title" {...form.register('title')} />
              {form.formState.errors.title && (
                <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-content">Content</Label>
              <Textarea
                id="edit-content"
                {...form.register('content')}
                rows={6}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={form.watch('status')}
                  onValueChange={(value) => form.setValue('status', value as 'draft' | 'scheduled' | 'published' | 'archived')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
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
            <div className="space-y-2">
              <Label htmlFor="edit-expiresAt">Expires At</Label>
              <Input
                id="edit-expiresAt"
                type="datetime-local"
                {...form.register('expiresAt')}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-isPinned"
                checked={form.watch('isPinned')}
                onCheckedChange={(checked) => form.setValue('isPinned', checked)}
              />
              <Label htmlFor="edit-isPinned">Pin to Homepage</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditAnnouncement(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateAnnouncement.isPending}>
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
            <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this announcement? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteAnnouncement.isPending}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

