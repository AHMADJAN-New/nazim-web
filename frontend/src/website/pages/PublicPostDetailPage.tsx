import { useMemo } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { publicWebsiteApi } from '@/lib/api/client';
import { LoadingSpinner } from '@/components/ui/loading';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar } from 'lucide-react';
import { renderRichText } from '@/website/lib/renderRichText';

interface WebsitePost {
  id: string;
  title: string;
  slug?: string | null;
  excerpt?: string | null;
  content_json?: unknown;
  published_at?: string | null;
  created_at?: string | null;
  seo_image_path?: string | null;
  seo_image_url?: string | null;
}

interface WebsiteAnnouncement {
  id: string;
  title: string;
  content?: string | null;
  published_at?: string | null;
  created_at?: string | null;
  is_pinned?: boolean;
}

export default function PublicPostDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const isAnnouncement = location.pathname.includes('/announcements/');

  const { data, isLoading } = useQuery({
    queryKey: ['public-post', slug, isAnnouncement],
    queryFn: async () => {
      if (!slug) return null;
      return isAnnouncement
        ? publicWebsiteApi.getAnnouncement(slug)
        : publicWebsiteApi.getPost(slug);
    },
    enabled: !!slug,
  });

  const post = useMemo(() => {
    if (!slug || !data) return undefined;
    return data as WebsitePost | WebsiteAnnouncement;
  }, [data, slug]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  if (!slug || !post) {
    return (
      <div className="flex-1 overflow-x-hidden">
        <section className="bg-slate-50 py-20">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-3xl font-bold text-slate-900 mb-4">
              {isAnnouncement ? 'Announcement Not Found' : 'Article Not Found'}
            </h1>
            <p className="text-slate-600 mb-8">
              {isAnnouncement
                ? 'We could not find the announcement you are looking for.'
                : 'We could not find the article you are looking for.'}
            </p>
            <Button variant="outline" asChild>
              <Link to={isAnnouncement ? '/public-site/announcements' : '/public-site/articles'}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to {isAnnouncement ? 'Announcements' : 'Articles'}
              </Link>
            </Button>
          </div>
        </section>
      </div>
    );
  }

  const htmlContent = !isAnnouncement ? renderRichText((post as WebsitePost).content_json) : '';
  const displayDate = (post as WebsitePost).published_at || post.created_at || '';

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
          <h1 className="text-3xl md:text-5xl font-bold mb-4">{post.title}</h1>
          {displayDate && (
            <p className="text-emerald-200 flex items-center justify-center gap-2">
              <Calendar className="h-4 w-4" />
              {new Date(displayDate).toLocaleDateString()}
            </p>
          )}
        </div>
      </section>

      <section className="container mx-auto px-4 py-12 md:py-16">
        {!isAnnouncement && (post as WebsitePost).seo_image_path && (
          <div className="max-w-4xl mx-auto mb-8">
            <img
              src={(post as WebsitePost).seo_image_url || (post as WebsitePost).seo_image_path || ''}
              alt={post.title}
              className="w-full rounded-xl shadow-md"
            />
          </div>
        )}
        <article className="prose prose-emerald lg:prose-lg mx-auto bg-white p-6 md:p-12 rounded-xl shadow-sm">
          {isAnnouncement ? (
            <p className="text-slate-700 leading-relaxed whitespace-pre-line">
              {(post as WebsiteAnnouncement).content || 'No announcement content available.'}
            </p>
          ) : htmlContent ? (
            <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
          ) : (
            <p className="text-slate-500 italic text-center">
              {(post as WebsitePost).excerpt || 'No content available.'}
            </p>
          )}
        </article>
        <div className="max-w-4xl mx-auto mt-10">
          <Button variant="outline" asChild>
            <Link to={isAnnouncement ? '/public-site/announcements' : '/public-site/articles'}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to {isAnnouncement ? 'Announcements' : 'Articles'}
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
