import { EventsList } from '@/components/events';
import { useAuth } from '@/hooks/useAuth';

export default function EventsPage() {
  const { profile } = useAuth();

  return (
    <div className="container mx-auto py-6 px-4">
      <EventsList schoolId={profile?.default_school_id || undefined} />
    </div>
  );
}
