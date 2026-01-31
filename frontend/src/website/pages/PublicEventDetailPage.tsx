import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { publicWebsiteApi } from '@/lib/api/client';
import { LoadingSpinner } from '@/components/ui/loading';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, MapPin } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { PublicHeroBackground } from '@/website/components/PublicHeroBackground';

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
  const { t } = useLanguage();

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
      <div className="flex-1 flex items-center justify-center py-20 overflow-x-hidden">
        <LoadingSpinner />
      </div>
    );
  }

  if (!id || !event) {
    return (
      <div className="flex-1 overflow-x-hidden">
        <section className="bg-slate-50 py-20">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-3xl font-bold text-slate-900 mb-4">{t('websitePublic.eventNotFound')}</h1>
            <p className="text-slate-600 mb-8">
              {t('websitePublic.eventNotFoundDescription')}
            </p>
            <Button variant="outline" asChild>
              <Link to="/public-site/events">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('websitePublic.backToEvents')}
              </Link>
            </Button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-x-hidden">
      <section className="relative text-white py-16 md:py-24 overflow-hidden">
        <PublicHeroBackground patternOpacity={0.12} />
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
