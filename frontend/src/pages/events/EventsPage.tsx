import { useAuth } from '@/hooks/useAuth';
import { EventsList } from '@/components/events';

export default function EventsPage() {
  const { profile } = useAuth();

  return (
    <div className="container mx-auto py-6 px-4">
      <EventsList schoolId={profile?.default_school_id || undefined} />
    </div>
  );
}
