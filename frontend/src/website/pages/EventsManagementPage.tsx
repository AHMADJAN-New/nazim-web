import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, CalendarClock, Search } from 'lucide-react';
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
import { useLanguage } from '@/hooks/useLanguage';
import {
  useWebsiteEvents,
  useCreateWebsiteEvent,
  useUpdateWebsiteEvent,
  useDeleteWebsiteEvent,
  type WebsiteEvent,
} from '@/website/hooks/useWebsiteManager';
import { StatusBadge } from '@/website/components/StatusBadge';
import { formatDate, formatDateTime } from '@/lib/utils';

const eventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  location: z.string().max(200).optional().nullable(),
  startsAt: z.string().min(1, 'Start date is required'),
  endsAt: z.string().optional().nullable(),
  isPublic: z.boolean().default(true),
  summary: z.string().max(500).optional().nullable(),
});

type EventFormData = z.infer<typeof eventSchema>;

export default function EventsManagementPage() {
  const { t } = useLanguage();
  const { data: events = [], isLoading } = useWebsiteEvents();
  const createEvent = useCreateWebsiteEvent();
  const updateEvent = useUpdateWebsiteEvent();
  const deleteEvent = useDeleteWebsiteEvent();

  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<WebsiteEvent | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: '',
      location: null,
      startsAt: '',
      endsAt: null,
      isPublic: true,
      summary: null,
    },
  });

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      return event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location?.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [events, searchQuery]);

  const handleCreate = async (data: EventFormData) => {
    await createEvent.mutateAsync({
      title: data.title,
      location: data.location,
      startsAt: new Date(data.startsAt),
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
      isPublic: data.isPublic,
      summary: data.summary,
    });
    setIsCreateOpen(false);
    form.reset();
  };

  const handleUpdate = async (data: EventFormData) => {
    if (!editEvent) return;
    await updateEvent.mutateAsync({
      id: editEvent.id,
      title: data.title,
      location: data.location,
      startsAt: new Date(data.startsAt),
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
      isPublic: data.isPublic,
      summary: data.summary,
    });
    setEditEvent(null);
    form.reset();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteEvent.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const openEditDialog = (event: WebsiteEvent) => {
    setEditEvent(event);
    form.reset({
      title: event.title,
      location: event.location,
      startsAt: event.startsAt.toISOString().slice(0, 16),
      endsAt: event.endsAt ? event.endsAt.toISOString().slice(0, 16) : null,
      isPublic: event.isPublic ?? true,
      summary: event.summary,
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
        title={t('websiteAdmin.events.title')}
        description={t('websiteAdmin.events.description')}
        icon={<CalendarClock className="h-5 w-5" />}
        primaryAction={{
          label: t('websiteAdmin.events.new'),
          onClick: () => {
            form.reset();
            setIsCreateOpen(true);
          },
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      <FilterPanel title={t('websiteAdmin.common.filters')}>
        <div className="space-y-2">
          <Label>{t('websiteAdmin.common.search')}</Label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('websiteAdmin.events.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </FilterPanel>

      <div className="rounded-md border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('websiteAdmin.common.title')}</TableHead>
                <TableHead>{t('websiteAdmin.events.fields.location')}</TableHead>
                <TableHead>{t('websiteAdmin.events.fields.startsAt')}</TableHead>
                <TableHead>{t('websiteAdmin.events.fields.endsAt')}</TableHead>
                <TableHead>{t('websiteAdmin.common.public')}</TableHead>
                <TableHead className="text-right">{t('websiteAdmin.common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {t('websiteAdmin.events.noResults')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">{event.title}</TableCell>
                    <TableCell className="text-muted-foreground">{event.location || '-'}</TableCell>
                    <TableCell>{formatDateTime(event.startsAt)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {event.endsAt ? formatDateTime(event.endsAt) : '-'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={event.isPublic ? 'public' : 'private'} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(event)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(event.id)}
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
            <DialogTitle>{t('websiteAdmin.events.createTitle')}</DialogTitle>
            <DialogDescription>{t('websiteAdmin.events.createDescription')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">{t('websiteAdmin.events.fields.title')} *</Label>
              <Input id="title" {...form.register('title')} placeholder={t('websiteAdmin.events.placeholders.title')} />
              {form.formState.errors.title && (
                <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">{t('websiteAdmin.events.fields.location')}</Label>
              <Input id="location" {...form.register('location')} placeholder={t('websiteAdmin.events.placeholders.location')} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startsAt">{t('websiteAdmin.events.fields.startsAt')} *</Label>
                <Input
                  id="startsAt"
                  type="datetime-local"
                  {...form.register('startsAt')}
                />
                {form.formState.errors.startsAt && (
                  <p className="text-sm text-destructive">{form.formState.errors.startsAt.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="endsAt">{t('websiteAdmin.events.fields.endsAt')}</Label>
                <Input
                  id="endsAt"
                  type="datetime-local"
                  {...form.register('endsAt')}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="summary">{t('websiteAdmin.events.fields.summary')}</Label>
              <Textarea
                id="summary"
                {...form.register('summary')}
                placeholder={t('websiteAdmin.events.placeholders.summary')}
                rows={3}
                maxLength={500}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isPublic"
                checked={form.watch('isPublic')}
                onCheckedChange={(checked) => form.setValue('isPublic', checked)}
              />
              <Label htmlFor="isPublic">{t('websiteAdmin.events.fields.publicEvent')}</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createEvent.isPending}>
                {t('common.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editEvent} onOpenChange={(open) => !open && setEditEvent(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('websiteAdmin.events.editTitle')}</DialogTitle>
            <DialogDescription>{t('websiteAdmin.events.editDescription')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleUpdate)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">{t('websiteAdmin.events.fields.title')} *</Label>
              <Input id="edit-title" {...form.register('title')} />
              {form.formState.errors.title && (
                <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-location">{t('websiteAdmin.events.fields.location')}</Label>
              <Input id="edit-location" {...form.register('location')} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-startsAt">{t('websiteAdmin.events.fields.startsAt')} *</Label>
                <Input
                  id="edit-startsAt"
                  type="datetime-local"
                  {...form.register('startsAt')}
                />
                {form.formState.errors.startsAt && (
                  <p className="text-sm text-destructive">{form.formState.errors.startsAt.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-endsAt">{t('websiteAdmin.events.fields.endsAt')}</Label>
                <Input
                  id="edit-endsAt"
                  type="datetime-local"
                  {...form.register('endsAt')}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-summary">{t('websiteAdmin.events.fields.summary')}</Label>
              <Textarea
                id="edit-summary"
                {...form.register('summary')}
                rows={3}
                maxLength={500}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-isPublic"
                checked={form.watch('isPublic')}
                onCheckedChange={(checked) => form.setValue('isPublic', checked)}
              />
              <Label htmlFor="edit-isPublic">{t('websiteAdmin.events.fields.publicEvent')}</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditEvent(null)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={updateEvent.isPending}>
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
            <AlertDialogTitle>{t('websiteAdmin.events.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('websiteAdmin.events.deleteDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteEvent.isPending}>
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

