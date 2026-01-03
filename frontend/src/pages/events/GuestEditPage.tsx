import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';

import { GuestFormMobile } from '@/components/events';
import { eventGuestsApi } from '@/lib/api/client';

export default function GuestEditPage() {
  const { eventId, guestId } = useParams<{ eventId: string; guestId: string }>();
  const navigate = useNavigate();

  const { data: guest, isLoading } = useQuery({
    queryKey: ['event-guest', eventId, guestId],
    queryFn: () => eventGuestsApi.get(eventId!, guestId!),
    enabled: !!eventId && !!guestId,
  });

  if (!eventId || !guestId) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!guest) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="text-center py-20 text-muted-foreground">
          Guest not found
        </div>
      </div>
    );
  }

  return (
    <GuestFormMobile
      eventId={eventId}
      guest={guest}
      onBack={() => navigate(`/events/${eventId}/guests/${guestId}`)}
    />
  );
}
