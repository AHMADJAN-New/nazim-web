import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { publicWebsiteApi } from '@/lib/api/client';
import { LoadingSpinner } from '@/components/ui/loading';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, MapPin } from 'lucide-react';

interface WebsiteEvent {
  id: string;
  title: string;
  location?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  description?: string | null;
  details?: string | null;
}

export default function PublicEventDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['public-event', id],
    queryFn: async () => {
      const response = await publicWebsiteApi.getEvents();
      if (typeof response === 'object' && response !== null && 'data' in response) {
        const data = (response as { data?: unknown }).data;
        return Array.isArray(data) ? data : [];
      }
      return Array.isArray(response) ? response : [];
    },
    enabled: !!id,
  });

  const event = useMemo(() => {
    if (!id || !Array.isArray(data)) return undefined;
    return data.find((item: WebsiteEvent) => item.id === id);
  }, [data, id]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  if (!id || !event) {
    return (
      <div className="flex-1">
        <section className="bg-slate-50 py-20">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Event Not Found</h1>
            <p className="text-slate-600 mb-8">
              We could not locate the event you were looking for.
            </p>
            <Button variant="outline" asChild>
              <Link to="/public-site/events">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Events
              </Link>
            </Button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="flex-1">
      <section className="bg-emerald-900 text-white py-16 md:py-24 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">{event.title}</h1>
          {event.starts_at && (
            <p className="text-emerald-200 flex items-center justify-center gap-2">
              <Calendar className="h-4 w-4" />
              {formatEventDate(event.starts_at, event.ends_at)}
            </p>
          )}
        </div>
      </section>

      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border p-6 md:p-10 space-y-6">
          {event.location && (
            <div className="flex items-center gap-3 text-slate-700">
              <MapPin className="h-5 w-5 text-emerald-600" />
              <span>{event.location}</span>
            </div>
          )}
          {event.description && (
            <p className="text-slate-600 leading-relaxed">{event.description}</p>
          )}
          {event.details && (
            <p className="text-slate-600 leading-relaxed">{event.details}</p>
          )}
          {!event.description && !event.details && (
            <p className="text-slate-500 italic">More event details will be shared soon.</p>
          )}
          <Button variant="outline" asChild>
            <Link to="/public-site/events">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Events
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

function formatEventDate(start?: string | null, end?: string | null) {
  if (!start) return '';
  const startDate = new Date(start).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  if (!end) return startDate;
  const endDate = new Date(end).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  return `${startDate} - ${endDate}`;
}
