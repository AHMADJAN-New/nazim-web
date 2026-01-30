import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/hooks/useLanguage';
import { publicWebsiteApi } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading';
import { renderRichText } from '@/website/lib/renderRichText';
import {
  BookOpen,
  Users,
  Calendar,
  ArrowRight,
  GraduationCap,
  Heart,
  Clock,
  MapPin
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { WebsiteCourse } from '@/website/hooks/useWebsiteContent';
import { PublicHeroBackground } from '@/website/components/PublicHeroBackground';
import { resolveMediaUrl } from '@/website/lib/mediaUrl';

export default function PublicWebsitePage() {
  const { language, t } = useLanguage();

  const siteQuery = useQuery({
    queryKey: ['public-site', language],
    queryFn: () => publicWebsiteApi.getSite({ locale: language }),
  });

  const site = (siteQuery.data as any) || {};
  const settings = site.settings || {};
  const school = site.school || {};
  const posts = site.posts || [];
  const events = site.events || [];
  const homePage = site.home || null;

  const schoolName =
    language === 'ar'
      ? school?.school_name_arabic || school?.school_name || 'Nazim Academy'
      : language === 'ps'
        ? school?.school_name_pashto || school?.school_name || 'Nazim Academy'
        : school?.school_name || 'Nazim Academy';

  const homeContent = homePage?.content_json ? renderRichText(homePage.content_json) : '';

  // Fetch courses from API
  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ['public-courses-featured'],
    queryFn: async () => {
      const response = await publicWebsiteApi.getCourses();
      // Handle both direct array and wrapped response
      let data: WebsiteCourse[] = [];
      if (Array.isArray(response)) {
        data = response;
      } else if (response && typeof response === 'object' && 'data' in response && Array.isArray((response as any).data)) {
        data = (response as any).data;
      } else {
        if (import.meta.env.DEV) {
          console.warn('[PublicWebsitePage] Unexpected courses response format:', response);
        }
        return [];
      }
      
      // Backend already filters for published, but double-check for safety
      // Get featured courses first, then top courses by sort_order, limit to 6
      return data
        .filter(course => course.status === 'published')
        .sort((a, b) => {
          // Featured courses first
          if (a.is_featured && !b.is_featured) return -1;
          if (!a.is_featured && b.is_featured) return 1;
          // Then by sort_order
          return a.sort_order - b.sort_order;
        })
        .slice(0, 6);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

      // Map courses to program cards format
      const programs = useMemo(() => {
        return courses.map((course) => {
          // Choose icon based on category or default
          let icon = <GraduationCap className="h-6 w-6 text-emerald-600" />;
          if (course.category) {
            const categoryLower = course.category.toLowerCase();
            if (categoryLower.includes('hifz') || categoryLower.includes('quran') || categoryLower.includes('memorization')) {
              icon = <BookOpen className="h-6 w-6 text-emerald-600" />;
            } else if (categoryLower.includes('alim') || categoryLower.includes('theology') || categoryLower.includes('fiqh')) {
              icon = <GraduationCap className="h-6 w-6 text-emerald-600" />;
            } else if (categoryLower.includes('community') || categoryLower.includes('service')) {
              icon = <Users className="h-6 w-6 text-emerald-600" />;
            }
          }

          return {
            id: course.id,
            title: course.title,
            description: course.description || t('websitePublic.programDefaultDescription'),
            icon,
            imageUrl: course.cover_image_url || course.cover_image_path || null,
            link: `/public-site/courses`,
            category: course.category,
            isFeatured: course.is_featured,
          };
        });
      }, [courses, t]);

  const heroImageUrl = school?.header_image_path ? resolveMediaUrl(school.header_image_path) : null;

  // Fallbacks so we never show [MISSING: key] (Anwar-style copy when keys are missing)
  const heroWelcome = (() => {
    const v = t('websitePublic.heroWelcome');
    return typeof v === 'string' && !v.startsWith('[MISSING') ? v : 'Welcome to';
  })();
  const heroTagline = (() => {
    const v = t('websitePublic.heroTagline');
    return typeof v === 'string' && !v.startsWith('[MISSING') ? v : 'Nurturing faith, knowledge, and character with an education rooted in Islamic tradition.';
  })();
  const heroMotto = (() => {
    const v = t('websitePublic.heroMotto');
    return typeof v === 'string' && !v.startsWith('[MISSING') ? v : "Shari'ah • Tariqah • Character";
  })();
  const ctaApplyNow = (() => {
    const v = t('websitePublic.ctaApplyNow');
    return typeof v === 'string' && !v.startsWith('[MISSING') ? v : 'Apply Now';
  })();
  const ctaContact = (() => {
    const v = t('websitePublic.ctaContact');
    return typeof v === 'string' && !v.startsWith('[MISSING') ? v : 'Contact Us';
  })();

  return (
    <div className="flex-1 overflow-x-hidden">
      {/* Hero: Anwar ul-Uloom style – motto line, large title, tagline, CTAs */}
      <section className="relative text-white overflow-hidden min-h-[420px] md:min-h-[540px] flex flex-col items-center justify-center">
        <PublicHeroBackground
          imageUrl={heroImageUrl || undefined}
          useDefaultImage={!heroImageUrl}
          patternOpacity={heroImageUrl ? 0.06 : 0.1}
        />
        <div className="container relative z-10 mx-auto px-4 py-20 md:py-28 flex flex-col items-center text-center">
          {/* Decorative motto line (Anwar-style) */}
          <p className="mb-4 text-sm md:text-base tracking-[0.2em] uppercase text-amber-200/95 font-medium drop-shadow-sm">
            {heroMotto}
          </p>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-4 max-w-4xl leading-tight drop-shadow-md">
            {schoolName}
          </h1>
          <p className="text-base md:text-lg text-emerald-100/95 mb-8 max-w-2xl leading-relaxed drop-shadow-sm">
            {heroTagline}
          </p>
          <p className="text-sm text-white/70 mb-8 max-w-xl">
            {heroWelcome} {schoolName}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Button size="lg" className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold px-8 h-12 text-base shadow-lg border-0" asChild>
              <Link to="/public-site/admissions">{ctaApplyNow}</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 text-base font-semibold px-8 bg-white/15 text-white border-2 border-white/60 hover:bg-white/25 hover:border-white/80 hover:text-white shadow-md backdrop-blur-md transition-all duration-200"
              asChild
            >
              <Link to="/public-site/contact">{ctaContact}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Info & Stats Bar */}
      <section className="bg-white border-b relative z-10 -mt-8 mx-4 md:mx-auto max-w-6xl rounded-xl shadow-lg p-6 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x gap-6">
          <div className="flex items-center gap-4 py-2 px-4">
            <div className="bg-emerald-100 p-3 rounded-full text-emerald-700">
              <MapPin className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900">{t('websitePublic.visitUs')}</h4>
              <p className="text-sm text-slate-500">{school?.school_address || t('websitePublic.addressComingSoon')}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 py-2 px-4">
            <div className="bg-emerald-100 p-3 rounded-full text-emerald-700">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900">{t('websitePublic.contact')}</h4>
              <p className="text-sm text-slate-500">
                {school?.school_phone || school?.school_email || t('websitePublic.contactDetailsComingSoon')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 py-2 px-4">
            <div className="bg-emerald-100 p-3 rounded-full text-emerald-700">
              <Heart className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900">{t('websitePublic.supportUs')}</h4>
              <p className="text-sm text-slate-500">
                <Link to="/public-site/donations" className="text-emerald-700 hover:underline">
                  {t('websitePublic.donateCta')}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      {homeContent && (
        <section className="container mx-auto px-4 py-16">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] items-start">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                {homePage?.title || t('websitePublic.aboutOurSchool')}
              </h2>
              <div
                className="prose prose-emerald max-w-none"
                dangerouslySetInnerHTML={{ __html: homeContent }}
              />
            </div>
            <Card className="border-emerald-100 shadow-sm">
              <CardHeader>
                <CardTitle>{t('websitePublic.discoverMore')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                <p>{t('websitePublic.explorePrograms')}</p>
                <Button variant="outline" className="w-full" asChild>
                  <Link to={`/public-site/pages/${homePage?.slug || 'home'}`}>
                    {t('websitePublic.readFullStory')}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Programs Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">{t('websitePublic.ourEducationalPrograms')}</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            {t('websitePublic.programsIntro')}
          </p>
        </div>

        {coursesLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : programs.length > 0 ? (
          <div className="grid gap-8 md:grid-cols-3">
            {programs.map((program) => (
              <Card key={program.id} className="border-none shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden">
                {program.imageUrl ? (
                  <div className="relative h-48 w-full overflow-hidden">
                    <img
                      src={program.imageUrl}
                      alt={program.title}
                      className="w-full h-full object-cover"
                    />
                    {program.isFeatured && (
                      <Badge variant="secondary" className="absolute top-3 right-3 bg-emerald-100 text-emerald-700 hover:bg-emerald-200">
                        {t('websitePublic.featured')}
                      </Badge>
                    )}
                  </div>
                ) : (
                  <div className="relative h-48 w-full bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center">
                    <div className="w-16 h-16 bg-emerald-50 rounded-lg flex items-center justify-center">
                      {program.icon}
                    </div>
                    {program.isFeatured && (
                      <Badge variant="secondary" className="absolute top-3 right-3 bg-emerald-100 text-emerald-700 hover:bg-emerald-200">
                        {t('websitePublic.featured')}
                      </Badge>
                    )}
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-xl">{program.title}</CardTitle>
                  {program.category && (
                    <Badge variant="outline" className="mt-2 w-fit text-xs">
                      {program.category}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 line-clamp-3">{program.description}</p>
                </CardContent>
                <CardFooter>
                  <Link to={program.link} className="text-emerald-600 font-medium hover:text-emerald-700 flex items-center gap-2 group">
                    {t('websitePublic.learnMore')} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-slate-50 rounded-lg">
            <GraduationCap className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">{t('websitePublic.programsEmpty')}</p>
            <Link to="/public-site/courses" className="text-emerald-600 font-medium hover:text-emerald-700 mt-4 inline-block">
              {t('websitePublic.viewAllCourses')} →
            </Link>
          </div>
        )}

        {programs.length > 0 && (
          <div className="text-center mt-12">
            <Link to="/public-site/courses">
              <Button variant="outline" className="text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                {t('websitePublic.viewAllPrograms')}
              </Button>
            </Link>
          </div>
        )}
      </section>

      {/* Latest Updates Section (News & Events) */}
      <section className="bg-slate-50 py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">{t('websitePublic.latestUpdates')}</h2>
              <p className="text-slate-600">{t('websitePublic.stayConnected')}</p>
            </div>
            <Button variant="outline" className="text-emerald-700 border-emerald-200 hover:bg-emerald-50" asChild>
              <Link to="/public-site/news">{t('websitePublic.viewAllUpdates')}</Link>
            </Button>
          </div>

          {(posts.length > 0 || events.length > 0) && (
            <div className="grid gap-8 lg:grid-cols-3">
              {/* Main News Area */}
              <div className="lg:col-span-2 space-y-6">
                {posts.length > 0 ? (
                  <div className="grid gap-6 sm:grid-cols-2">
                    {posts.map((post: any) => (
                      <Card key={post.id} className="overflow-hidden hover:shadow-md transition-shadow">
                        <div className="h-48 bg-slate-100 flex items-center justify-center text-slate-300 overflow-hidden">
                          {post.seo_image_url || post.seo_image_path ? (
                            <img
                              src={post.seo_image_url || post.seo_image_path}
                              alt={post.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <BookOpen className="h-10 w-10" />
                          )}
                        </div>
                        <CardHeader>
                          <Badge variant="secondary" className="w-fit mb-2">{t('websitePublic.article')}</Badge>
                          <Link to={`/public-site/articles/${post.slug || post.id}`}>
                            <CardTitle className="line-clamp-2 hover:text-emerald-600 transition-colors cursor-pointer">
                              {post.title}
                            </CardTitle>
                          </Link>
                        </CardHeader>
                        <CardContent>
                          <p className="text-slate-500 text-sm line-clamp-3">
                            {post.excerpt || t('websitePublic.readLatestUpdate')}
                          </p>
                        </CardContent>
                        <CardFooter className="text-xs text-slate-400">
                          {post.published_at ? new Date(post.published_at).toLocaleDateString() : ''}
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 italic">{t('websitePublic.noRecentNews')}</p>
                )}
              </div>

              {/* Events Sidebar */}
              <div className="space-y-6">
                {events.length > 0 && (
                  <div className="bg-white p-6 rounded-xl shadow-sm border">
                    <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-emerald-600" />
                      {t('websitePublic.upcomingEvents')}
                    </h3>
                    <div className="space-y-6">
                      {events.map((event: any) => (
                        <Link to={`/public-site/events/${event.id}`} key={event.id}>
                          <div className="flex gap-4 group cursor-pointer">
                            <div className="flex flex-col items-center justify-center bg-emerald-50 w-16 h-16 rounded-lg text-emerald-700 shrink-0">
                              <span className="text-xs font-bold uppercase">
                                {event.starts_at ? new Date(event.starts_at).toLocaleString('default', { month: 'short' }) : 'EVT'}
                              </span>
                              <span className="text-xl font-bold">
                                {event.starts_at ? new Date(event.starts_at).getDate() : ''}
                              </span>
                            </div>
                            <div>
                              <h4 className="font-semibold group-hover:text-emerald-600 transition-colors line-clamp-1">
                                {event.title}
                              </h4>
                              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                {event.location}
                              </p>
                              <span className="text-xs text-emerald-600 font-medium mt-1 block">
                                {event.starts_at ? new Date(event.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                    <Button variant="link" className="w-full mt-6 text-emerald-600" asChild>
                      <Link to="/public-site/events">{t('websitePublic.fullCalendar')}</Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {posts.length === 0 && events.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-500">{t('websitePublic.moreUpdatesComingSoon')}</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-emerald-900 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">{t('websitePublic.ctaReadyToJoin')}</h2>
          <p className="text-emerald-100 max-w-2xl mx-auto mb-10 text-lg">
            {t('websitePublic.ctaAdmissionsIntro')}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button className="bg-white text-emerald-900 hover:bg-emerald-50 font-bold px-8 h-12" asChild>
              <Link to="/public-site/admissions">{t('websitePublic.applyForAdmission')}</Link>
            </Button>
            <Button variant="outline" className="border-emerald-400 text-emerald-100 hover:bg-emerald-800 hover:text-white h-12" asChild>
              <Link to="/public-site/contact">{t('websitePublic.scheduleTour')}</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
