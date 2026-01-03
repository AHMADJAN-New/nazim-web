import { useParams, useNavigate, useSearchParams } from 'react-router-dom';

import { GuestFormMobile } from '@/components/events';

export default function GuestAddPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const quickMode = searchParams.get('quick') === 'true';

  if (!eventId) {
    return null;
  }

  return (
    <GuestFormMobile
      eventId={eventId}
      quickMode={quickMode}
      onBack={() => navigate(`/events/${eventId}/guests`)}
    />
  );
}
