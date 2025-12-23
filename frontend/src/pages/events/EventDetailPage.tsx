import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDate, formatDateTime } from '@/lib/utils';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Settings,
  QrCode,
  UserPlus,
  BarChart3,
  CheckCircle,
  XCircle,
  Send,
  Ban,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { eventsApi } from '@/lib/api/client';
import { GuestsList } from '@/components/events';
import { EVENT_STATUS_LABELS } from '@/types/events';
import type { EventStatus } from '@/types/events';
import { useHasPermission } from '@/hooks/usePermissions';
import { showToast } from '@/lib/toast';

const STATUS_COLORS: Record<EventStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  published: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasCheckinPermission = useHasPermission('event_checkins.create');
  const hasEventUpdatePermission = useHasPermission('events.update');

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventsApi.get(eventId!),
    enabled: !!eventId,
  });

  const { data: stats } = useQuery({
    queryKey: ['event-stats', eventId],
    queryFn: () => eventsApi.getStats(eventId!),
    enabled: !!eventId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: EventStatus) =>
      eventsApi.update(eventId!, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      showToast.success('toast.eventUpdated');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.eventUpdateFailed');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="text-center py-20 text-muted-foreground">
          Event not found
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/events')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">{event.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              {event.event_type && (
                <Badge variant="outline">{event.event_type.name}</Badge>
              )}
              <Badge className={STATUS_COLORS[event.status]}>
                {EVENT_STATUS_LABELS[event.status]}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Quick Status Update Buttons - Only show if user has events.update permission */}
          {hasEventUpdatePermission && (
            <div className="flex gap-2">
              {event.status !== 'published' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateStatusMutation.mutate('published')}
                  disabled={updateStatusMutation.isPending}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Publish
                </Button>
              )}
              {event.status !== 'completed' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateStatusMutation.mutate('completed')}
                  disabled={updateStatusMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark Completed
                </Button>
              )}
              {event.status !== 'cancelled' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateStatusMutation.mutate('cancelled')}
                  disabled={updateStatusMutation.isPending}
                  className="text-destructive hover:text-destructive"
                >
                  <Ban className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              )}
              {event.status !== 'draft' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateStatusMutation.mutate('draft')}
                  disabled={updateStatusMutation.isPending}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Mark Draft
                </Button>
              )}
            </div>
          )}
          
          <div className="flex gap-2 border-l pl-2">
            <Button variant="outline" onClick={() => navigate(`/events/${eventId}/guests/add`)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Guest
            </Button>
            {hasCheckinPermission && (
              <Button onClick={() => navigate(`/events/${eventId}/checkin`)}>
                <QrCode className="h-4 w-4 mr-2" />
                Check-in
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {stats?.totals.total_arrived || event.total_arrived || 0}
              </div>
              <div className="text-sm text-muted-foreground">Arrived</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold">
                {stats?.totals.total_invited || event.total_invited || 0}
              </div>
              <div className="text-sm text-muted-foreground">Total Invited</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">
                {(stats?.totals.total_invited || event.total_invited || 0) -
                  (stats?.totals.total_arrived || event.total_arrived || 0)}
              </div>
              <div className="text-sm text-muted-foreground">Remaining</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold">
                {stats?.totals.guest_count || event.guest_count || 0}
              </div>
              <div className="text-sm text-muted-foreground">Guest Entries</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Event Details */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <span>{formatDateTime(event.starts_at)}</span>
              {event.ends_at && (
                <>
                  <span className="text-muted-foreground">to</span>
                  <span>{formatDateTime(event.ends_at)}</span>
                </>
              )}
            </div>
            {event.venue && (
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <span>{event.venue}</span>
              </div>
            )}
            {event.capacity && (
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <span>Capacity: {event.capacity}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="guests">
        <TabsList>
          <TabsTrigger value="guests">
            <Users className="h-4 w-4 mr-2" />
            Guests
          </TabsTrigger>
          <TabsTrigger value="stats">
            <BarChart3 className="h-4 w-4 mr-2" />
            Statistics
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="guests" className="mt-4">
          <GuestsList eventId={eventId!} />
        </TabsContent>

        <TabsContent value="stats" className="mt-4">
          {stats && (
            <Card>
              <CardHeader>
                <CardTitle>Guest Statistics by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.by_type.map((item) => (
                    <div key={item.guest_type} className="flex items-center justify-between">
                      <span className="capitalize">{item.guest_type}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-muted-foreground">
                          {item.arrived} / {item.invited}
                        </span>
                        <div className="w-32 bg-muted rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{
                              width: `${item.invited > 0 ? (item.arrived / item.invited) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {hasEventUpdatePermission && (
          <TabsContent value="users" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Event Users</CardTitle>
                  <Button onClick={() => navigate(`/events/${eventId}/users`)}>
                    <Shield className="h-4 w-4 mr-2" />
                    Manage Event Users
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Event users are locked to this specific event and can only access event-related features.
                  They will be automatically deactivated when the event is completed.
                </p>
                <Button variant="outline" onClick={() => navigate(`/events/${eventId}/users`)}>
                  <Shield className="h-4 w-4 mr-2" />
                  Go to Event Users Management
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}
        <TabsContent value="settings" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">Event settings coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
