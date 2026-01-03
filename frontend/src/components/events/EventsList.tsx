import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Calendar,
  MapPin,
  Users,
  MoreVertical,
  Pencil,
  Trash2,
  QrCode,
  UserPlus,
  Eye,
  CheckCircle,
  XCircle,
  Send,
  Ban,
  Shield,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { EventFormDialog } from './EventFormDialog';

import { ReportExportButtons } from '@/components/reports/ReportExportButtons';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useHasPermission } from '@/hooks/usePermissions';
import { eventsApi } from '@/lib/api/client';
import { showToast } from '@/lib/toast';
import { formatDate, formatDateTime } from '@/lib/utils';
import type { Event, EventStatus } from '@/types/events';
import { EVENT_STATUS_LABELS } from '@/types/events';
import { useProfile } from '@/hooks/useProfiles';

interface EventsListProps {
  schoolId?: string;
}

const STATUS_COLORS: Record<EventStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  published: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
};

export function EventsList({ schoolId }: EventsListProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const hasCheckinPermission = useHasPermission('event_checkins.create');
  const hasEventUpdatePermission = useHasPermission('events.update');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'all'>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<Event | null>(null);
  const [page, setPage] = useState(1);

  const { data: eventsResponse, isLoading } = useQuery({
    queryKey: ['events', schoolId, search, statusFilter, page],
    queryFn: () => eventsApi.list({
      school_id: schoolId,
      search: search || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      page,
      per_page: 25,
    }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => eventsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      showToast.success('toast.eventDeleted');
      setDeletingEvent(null);
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.eventDeleteFailed');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: EventStatus }) =>
      eventsApi.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      showToast.success('toast.eventUpdated');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.eventUpdateFailed');
    },
  });

  const events = eventsResponse?.data || [];
  const pagination = eventsResponse ? {
    currentPage: eventsResponse.current_page,
    lastPage: eventsResponse.last_page,
    total: eventsResponse.total,
  } : null;

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Events</h1>
            <p className="text-muted-foreground">Manage your school events and guest lists</p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Event
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Input
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-[300px]"
          />
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as EventStatus | 'all')}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {(Object.keys(EVENT_STATUS_LABELS) as EventStatus[]).map((status) => (
                <SelectItem key={status} value={status}>
                  {EVENT_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {events && events.length > 0 && (
            <ReportExportButtons
              data={events}
              columns={[
                { key: 'title', label: 'Title' },
                { key: 'eventType', label: 'Event Type' },
                { key: 'status', label: 'Status' },
                { key: 'startsAt', label: 'Start Date' },
                { key: 'venue', label: 'Venue' },
                { key: 'totalInvited', label: 'Total Invited' },
                { key: 'totalArrived', label: 'Total Arrived' },
                { key: 'capacity', label: 'Capacity' },
              ]}
              reportKey="events"
              title="Events General Report"
              transformData={(data) => data.map((event) => ({
                title: event.title || '',
                eventType: event.event_type?.name || '-',
                status: EVENT_STATUS_LABELS[event.status] || event.status,
                startsAt: formatDateTime(event.starts_at),
                venue: event.venue || '-',
                totalInvited: event.total_invited || 0,
                totalArrived: event.total_arrived || 0,
                capacity: event.capacity || '-',
              }))}
              buildFiltersSummary={() => {
                const filters: string[] = [];
                if (search) filters.push(`Search: ${search}`);
                if (statusFilter !== 'all') filters.push(`Status: ${EVENT_STATUS_LABELS[statusFilter]}`);
                return filters.length > 0 ? filters.join(' | ') : '';
              }}
              schoolId={schoolId || profile?.default_school_id}
              templateType="events"
              disabled={!events || events.length === 0}
            />
          )}
        </div>

        {/* Events Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : events.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              <p>No events found.</p>
              <p className="text-sm mt-1">Create your first event to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Card key={event.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="line-clamp-1">{event.title}</CardTitle>
                      {event.event_type && (
                        <CardDescription>{event.event_type.name}</CardDescription>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/events/${event.id}`)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/events/${event.id}/guests`)}>
                          <Users className="h-4 w-4 mr-2" />
                          Guests
                        </DropdownMenuItem>
                        {hasCheckinPermission && (
                          <DropdownMenuItem onClick={() => navigate(`/events/${event.id}/checkin`)}>
                            <QrCode className="h-4 w-4 mr-2" />
                            Check-in
                          </DropdownMenuItem>
                        )}
                        {hasEventUpdatePermission && (
                          <DropdownMenuItem onClick={() => navigate(`/events/${event.id}/users`)}>
                            <Shield className="h-4 w-4 mr-2" />
                            Event Users
                          </DropdownMenuItem>
                        )}
                        
                        {/* Status Update Actions - Only show if user has events.update permission */}
                        {hasEventUpdatePermission && (
                          <>
                            <div className="border-t my-1" />
                            {event.status !== 'published' && (
                              <DropdownMenuItem
                                onClick={() => updateStatusMutation.mutate({ id: event.id, status: 'published' })}
                                disabled={updateStatusMutation.isPending}
                              >
                                <Send className="h-4 w-4 mr-2" />
                                Publish
                              </DropdownMenuItem>
                            )}
                            {event.status !== 'completed' && (
                              <DropdownMenuItem
                                onClick={() => updateStatusMutation.mutate({ id: event.id, status: 'completed' })}
                                disabled={updateStatusMutation.isPending}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Mark as Completed
                              </DropdownMenuItem>
                            )}
                            {event.status !== 'cancelled' && (
                              <DropdownMenuItem
                                onClick={() => updateStatusMutation.mutate({ id: event.id, status: 'cancelled' })}
                                disabled={updateStatusMutation.isPending}
                                className="text-destructive"
                              >
                                <Ban className="h-4 w-4 mr-2" />
                                Cancel Event
                              </DropdownMenuItem>
                            )}
                            {event.status !== 'draft' && (
                              <DropdownMenuItem
                                onClick={() => updateStatusMutation.mutate({ id: event.id, status: 'draft' })}
                                disabled={updateStatusMutation.isPending}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Mark as Draft
                              </DropdownMenuItem>
                            )}
                            
                            <div className="border-t my-1" />
                            <DropdownMenuItem onClick={() => setEditingEvent(event)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem
                          onClick={() => setDeletingEvent(event)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <Badge className={STATUS_COLORS[event.status]}>
                    {EVENT_STATUS_LABELS[event.status]}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDateTime(event.starts_at)}</span>
                  </div>
                  {event.venue && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span className="line-clamp-1">{event.venue}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4" />
                    <span>
                      <strong>{event.total_arrived || 0}</strong>
                      {' / '}
                      <strong>{event.total_invited || 0}</strong>
                      {' guests'}
                      {event.capacity && ` (capacity: ${event.capacity})`}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate(`/events/${event.id}/guests/add`)}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Add Guest
                    </Button>
                    {hasCheckinPermission && (
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate(`/events/${event.id}/checkin`)}
                      >
                        <QrCode className="h-4 w-4 mr-1" />
                        Check-in
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.lastPage > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {pagination.currentPage} of {pagination.lastPage}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(pagination.lastPage, p + 1))}
              disabled={page === pagination.lastPage}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <EventFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        schoolId={schoolId}
      />

      {/* Edit Dialog */}
      {editingEvent && (
        <EventFormDialog
          open={!!editingEvent}
          onOpenChange={(open) => !open && setEditingEvent(null)}
          event={editingEvent}
          schoolId={schoolId}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingEvent}
        onOpenChange={(open) => !open && setDeletingEvent(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingEvent?.title}"? This action cannot be undone.
              All guests and check-in data will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingEvent && deleteMutation.mutate(deletingEvent.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
