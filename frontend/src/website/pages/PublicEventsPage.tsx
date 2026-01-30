import { useQuery } from '@tanstack/react-query';
import { publicWebsiteApi } from '@/lib/api/client';
import { LoadingSpinner } from '@/components/ui/loading';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { PublicHeroBackground } from '@/website/components/PublicHeroBackground';

interface WebsiteEvent {
  id: string;
  title: string;
  location?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  description?: string | null;
}

export default function PublicEventsPage() {
  const { t } = useLanguage();
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
      <section className="relative text-white py-16 md:py-24 overflow-hidden">
        <PublicHeroBackground patternOpacity={0.12} />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">{t('websitePublic.eventsPageTitle')}</h1>
          <p className="text-emerald-200 max-w-2xl mx-auto">
            {t('websitePublic.eventsPageSubtitle')}
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
                    {t('websitePublic.viewEventDetails')} →
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed text-slate-500">
            <p className="text-lg mb-2">{t('websitePublic.noEventsYet')}</p>
            <p className="text-sm text-slate-400">{t('websitePublic.checkBackSoon')}</p>
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
