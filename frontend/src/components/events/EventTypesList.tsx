import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Settings2 } from 'lucide-react';
import { useState } from 'react';

import { EventTypeFormDialog } from './EventTypeFormDialog';
import { useLanguage } from '@/hooks/useLanguage';

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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { eventTypesApi } from '@/lib/api/client';
import { showToast } from '@/lib/toast';
import type { EventType } from '@/types/events';


interface EventTypesListProps {
  schoolId?: string;
  onDesignFields?: (eventTypeId: string) => void;
}

export function EventTypesList({ schoolId, onDesignFields }: EventTypesListProps) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingEventType, setEditingEventType] = useState<EventType | null>(null);
  const [deletingEventType, setDeletingEventType] = useState<EventType | null>(null);

  const { data: eventTypes, isLoading } = useQuery({
    queryKey: ['event-types', schoolId],
    queryFn: () => eventTypesApi.list({ school_id: schoolId }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => eventTypesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-types'] });
      showToast.success(t('toast.eventTypeDeleted') || 'Event type deleted successfully');
      setDeletingEventType(null);
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.eventTypeDeleteFailed') || 'Failed to delete event type');
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>{t('events.eventTypes.title') || 'Event Types'}</CardTitle>
          <Button onClick={() => setShowCreateDialog(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {t('events.eventTypes.addEventType') || 'Add Event Type'}
          </Button>
        </CardHeader>
        <CardContent>
          {eventTypes && eventTypes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('events.eventTypes.name') || 'Name'}</TableHead>
                  <TableHead>{t('events.eventTypes.description') || 'Description'}</TableHead>
                  <TableHead>{t('events.eventTypes.status') || 'Status'}</TableHead>
                  <TableHead className="text-right">{t('events.eventTypes.actions') || 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eventTypes.map((eventType) => (
                  <TableRow key={eventType.id}>
                    <TableCell className="font-medium">{eventType.name}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[300px] truncate">
                      {eventType.description || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={eventType.is_active ? 'default' : 'secondary'}>
                        {eventType.is_active ? (t('events.eventTypes.active') || 'Active') : (t('events.eventTypes.inactive') || 'Inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {onDesignFields && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onDesignFields(eventType.id)}
                          >
                            <Settings2 className="h-4 w-4 mr-1" />
                            {t('events.eventTypes.fields') || 'Fields'}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingEventType(eventType)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingEventType(eventType)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <p>{t('events.eventTypes.noEventTypesFound') || 'No event types found.'}</p>
              <p className="text-sm mt-1">{t('events.eventTypes.createFirstEventType') || 'Create your first event type to get started.'}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <EventTypeFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        schoolId={schoolId}
      />

      {/* Edit Dialog */}
      {editingEventType && (
        <EventTypeFormDialog
          open={!!editingEventType}
          onOpenChange={(open) => !open && setEditingEventType(null)}
          eventType={editingEventType}
          schoolId={schoolId}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingEventType}
        onOpenChange={(open) => !open && setDeletingEventType(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('events.eventTypes.deleteEventType') || 'Delete Event Type'}</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingEventType?.name
                ? t('events.eventTypes.deleteConfirm', { name: deletingEventType.name }) || `Are you sure you want to delete "${deletingEventType.name}"? This action cannot be undone. Any events using this type will lose their association.`
                : t('events.eventTypes.deleteConfirmDescription') || 'Are you sure you want to delete this event type? This action cannot be undone. Any events using this type will lose their association.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('events.eventTypes.cancel') || 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingEventType && deleteMutation.mutate(deletingEventType.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (t('events.eventTypes.deleting') || 'Deleting...') : (t('events.eventTypes.deleteButton') || 'Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
