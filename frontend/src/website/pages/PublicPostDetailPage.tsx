import { useMemo } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { publicWebsiteApi } from '@/lib/api/client';
import { LoadingSpinner } from '@/components/ui/loading';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, FileText } from 'lucide-react';
import { renderRichText } from '@/website/lib/renderRichText';
import { formatDate } from '@/lib/utils';
import { useLanguage } from '@/hooks/useLanguage';

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
  const { isRTL } = useLanguage();
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
      <div className="flex min-h-[50vh] items-center justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  if (!slug || !post) {
    return (
      <div className="flex-1 overflow-x-hidden">
        <div className="container mx-auto max-w-2xl px-4 py-16 md:py-24">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm md:p-12">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <FileText className="h-8 w-8 text-slate-500" />
            </div>
            <h1 className="mb-3 text-2xl font-semibold text-slate-900 md:text-3xl">
              {isAnnouncement ? 'Announcement Not Found' : 'Article Not Found'}
            </h1>
            <p className="mb-8 text-slate-600">
              {isAnnouncement
                ? 'We could not find the announcement you are looking for.'
                : 'We could not find the article you are looking for.'}
            </p>
            <Button variant="outline" size="lg" asChild>
              <Link
                to={isAnnouncement ? '/public-site/announcements' : '/public-site/articles'}
                className="inline-flex items-center gap-2"
              >
                <ArrowLeft className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
                Back to {isAnnouncement ? 'Announcements' : 'Articles'}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const displayDate = (post as WebsitePost).published_at || post.created_at || '';
  const seoImageUrl = !isAnnouncement ? (post as WebsitePost).seo_image_url ?? (post as WebsitePost).seo_image_path : null;
  const hasHeroImage = Boolean(seoImageUrl);

  return (
    <div className="flex-1 overflow-x-hidden">
      {/* Back link - above hero */}
      <div className="border-b border-slate-200/80 bg-white/95 backdrop-blur-sm">
        <div className="container mx-auto max-w-4xl px-4 py-4">
          <Link
            to={isAnnouncement ? '/public-site/announcements' : '/public-site/articles'}
            className={`inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-emerald-700 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <ArrowLeft className={`h-4 w-4 shrink-0 ${isRTL ? 'rotate-180' : ''}`} />
            <span>{isAnnouncement ? 'All Announcements' : 'All Articles'}</span>
          </Link>
        </div>
      </div>

      {/* Hero: featured image as background, or solid header */}
      <header
        className={`relative overflow-hidden ${hasHeroImage ? 'min-h-[280px] md:min-h-[360px]' : 'bg-gradient-to-b from-emerald-900 to-emerald-800 py-16 md:py-24'}`}
      >
        {hasHeroImage && (
          <>
            <img
              src={seoImageUrl || ''}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-slate-900/60" />
          </>
        )}
        {!hasHeroImage && (
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        )}
        <div className="container relative z-10 mx-auto max-w-4xl px-4 py-12 md:py-16">
          <h1
            className={`text-3xl font-bold tracking-tight text-white drop-shadow-sm md:text-4xl lg:text-5xl ${hasHeroImage ? 'max-w-3xl' : 'text-center'} ${isRTL ? 'text-right' : 'text-left'}`}
          >
            {post.title}
          </h1>
          {displayDate && (
            <p
              className={`mt-4 flex items-center gap-2 text-sm font-medium ${hasHeroImage ? 'text-white/90' : 'text-emerald-100'} ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <Calendar className="h-4 w-4 shrink-0" />
              {formatDate(new Date(displayDate))}
            </p>
          )}
        </div>
      </header>

      {/* Content */}
      <section className="container mx-auto max-w-4xl px-4 py-10 md:py-14">
        {/* Featured image (only when not used as hero) - optional large image below hero */}
        {!isAnnouncement && (post as WebsitePost).seo_image_path && !hasHeroImage && (
          <div className="mx-auto mb-10 max-w-3xl">
            <img
              src={(post as WebsitePost).seo_image_url || (post as WebsitePost).seo_image_path || ''}
              alt={post.title}
              className="w-full rounded-2xl border border-slate-200 object-cover shadow-md"
            />
          </div>
        )}

        <article className="mx-auto max-w-3xl">
          {/* Excerpt for articles (if present and not announcement) */}
          {!isAnnouncement && (post as WebsitePost).excerpt && (
            <p className="mb-8 text-lg leading-relaxed text-slate-600">
              {(post as WebsitePost).excerpt}
            </p>
          )}

          <div
            className={`
              prose prose-slate prose-lg max-w-none
              prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-slate-900
              prose-p:leading-relaxed prose-p:text-slate-700
              prose-a:text-emerald-600 prose-a:no-underline hover:prose-a:underline
              prose-strong:text-slate-900
              prose-img:rounded-xl prose-img:shadow-md
              prose-ul:my-6 prose-li:my-1
            `}
          >
            {isAnnouncement ? (
              <div className="whitespace-pre-line text-slate-700">
                {(post as WebsiteAnnouncement).content || 'No announcement content available.'}
              </div>
            ) : (() => {
              const htmlContent = renderRichText((post as WebsitePost).content_json);
              return htmlContent ? (
                <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
              ) : (
                <p className="italic text-slate-500">
                  {(post as WebsitePost).excerpt || 'No content available.'}
                </p>
              );
            })()}
          </div>

          {/* Back to list - bottom */}
          <div className={`mt-12 flex border-t border-slate-200 pt-8 ${isRTL ? 'justify-end' : 'justify-start'}`}>
            <Button variant="outline" size="lg" asChild>
              <Link
                to={isAnnouncement ? '/public-site/announcements' : '/public-site/articles'}
                className={`inline-flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <ArrowLeft className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
                Back to {isAnnouncement ? 'Announcements' : 'Articles'}
              </Link>
            </Button>
          </div>
        </article>
      </section>
    </div>
  );
}
