import { useParams, useNavigate } from 'react-router-dom';

import { CheckinScreen } from '@/components/events';

export default function CheckinPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  if (!eventId) {
    return null;
  }

  return (
    <CheckinScreen
      eventId={eventId}
      onBack={() => navigate(`/events/${eventId}`)}
    />
  );
}
