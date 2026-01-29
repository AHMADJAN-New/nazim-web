import { useQuery } from '@tanstack/react-query';
import { publicWebsiteApi } from '@/lib/api/client';
import { LoadingSpinner } from '@/components/ui/loading';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

interface WebsiteEvent {
  id: string;
  title: string;
  location?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  description?: string | null;
}

export default function PublicEventsPage() {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['public-events'],
    queryFn: async () => {
      const response = await publicWebsiteApi.getEvents();
      if (typeof response === 'object' && response !== null && 'data' in response) {
        const data = (response as { data?: unknown }).data;
        return Array.isArray(data) ? data : [];
      }
      return Array.isArray(response) ? response : [];
    },
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-x-hidden">
      <section className="bg-emerald-900 text-white py-16 md:py-24 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">Events & Calendar</h1>
          <p className="text-emerald-200 max-w-2xl mx-auto">
            Explore upcoming gatherings, seminars, and school community events.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12 md:py-16">
        {events.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map((event: WebsiteEvent) => (
              <Card key={event.id} className="flex flex-col h-full hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="line-clamp-2">{event.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-slate-600">
                  {event.starts_at && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-emerald-600" />
                      <span>{formatEventDate(event.starts_at, event.ends_at)}</span>
                    </div>
                  )}
                  {event.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-emerald-600" />
                      <span>{event.location}</span>
                    </div>
                  )}
                  {event.description && (
                    <p className="line-clamp-3 text-slate-500">{event.description}</p>
                  )}
                </CardContent>
                <CardFooter className="mt-auto">
                  <Link to={`/public-site/events/${event.id}`} className="text-emerald-600 font-medium hover:text-emerald-700">
                    View Details →
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed text-slate-500">
            <p className="text-lg mb-2">No upcoming events yet.</p>
            <p className="text-sm text-slate-400">Please check back soon for updates.</p>
          </div>
        )}
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
