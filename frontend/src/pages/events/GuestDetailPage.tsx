import { useParams, useNavigate } from 'react-router-dom';
import { GuestDetail } from '@/components/events';

export default function GuestDetailPage() {
  const { eventId, guestId } = useParams<{ eventId: string; guestId: string }>();
  const navigate = useNavigate();

  if (!eventId || !guestId) {
    return null;
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <GuestDetail
        eventId={eventId}
        guestId={guestId}
        onBack={() => navigate(`/events/${eventId}/guests`)}
      />
    </div>
  );
}
