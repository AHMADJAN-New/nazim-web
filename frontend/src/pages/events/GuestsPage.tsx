import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, UserPlus, QrCode } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';

import { GuestsList } from '@/components/events';
import { Button } from '@/components/ui/button';
import { useHasPermission } from '@/hooks/usePermissions';
import { eventsApi } from '@/lib/api/client';

export default function GuestsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const hasCheckinPermission = useHasPermission('event_checkins.create');

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventsApi.get(eventId!),
    enabled: !!eventId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!eventId) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="text-center py-20 text-muted-foreground">
          Event ID is required
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
            <h1 className="text-2xl font-semibold">
              {event ? `${event.title} - Guests` : 'Guests'}
            </h1>
          </div>
        </div>
        <div className="flex gap-2">
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

      {/* Guests List */}
      <GuestsList eventId={eventId} />
    </div>
  );
}

