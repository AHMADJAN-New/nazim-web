import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/hooks/useLanguage';
import { publicWebsiteApi } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function PublicWebsitePage() {
  const { t } = useLanguage();

  const siteQuery = useQuery({
    queryKey: ['public-site'],
    queryFn: () => publicWebsiteApi.getSite(),
  });

  const site = siteQuery.data || {};
  const settings = site.settings || {};
  const school = site.school || {};
  const posts = site.posts || [];
  const events = site.events || [];

  const programs = useMemo(() => [
    { title: t('websitePublic.programHifz'), description: t('websitePublic.programHifzDesc') },
    { title: t('websitePublic.programTajweed'), description: t('websitePublic.programTajweedDesc') },
    { title: t('websitePublic.programNizami'), description: t('websitePublic.programNizamiDesc') },
  ], [t]);

  return (
    <div className="min-h-screen bg-background">
      <section className="border-b bg-gradient-to-r from-primary/10 via-background to-secondary/10 py-16">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="outline" className="mb-4">{t('websitePublic.badge')}</Badge>
          <h1 className="text-3xl font-semibold text-foreground md:text-5xl">
            {school?.school_name || t('websitePublic.defaultSchoolName')}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            {t('websitePublic.heroSubtitle')}
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button>{t('websitePublic.ctaAdmissions')}</Button>
            <Button variant="outline">{t('websitePublic.ctaContact')}</Button>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        <div className="grid gap-6 md:grid-cols-3">
          {programs.map((program) => (
            <Card key={program.title}>
              <CardHeader>
                <CardTitle>{program.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{program.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-muted/40 py-12">
        <div className="container mx-auto px-4">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-semibold">{t('websitePublic.latestAnnouncements')}</h2>
            <Button variant="ghost">{t('websitePublic.viewAll')}</Button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {(posts.length ? posts : Array.from({ length: 3 })).map((post: any, index: number) => (
              <Card key={post?.id || index}>
                <CardHeader>
                  <CardTitle className="text-lg">{post?.title || t('websitePublic.sampleAnnouncement')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{post?.excerpt || t('websitePublic.sampleAnnouncementDesc')}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">{t('websitePublic.upcomingEvents')}</h2>
          <Button variant="ghost">{t('websitePublic.viewCalendar')}</Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {(events.length ? events : Array.from({ length: 2 })).map((event: any, index: number) => (
            <Card key={event?.id || index}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">{event?.title || t('websitePublic.sampleEvent')}</CardTitle>
                <Badge variant="secondary">{event?.starts_at || t('websitePublic.sampleDate')}</Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{event?.summary || t('websitePublic.sampleEventDesc')}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t bg-background py-12">
        <div className="container mx-auto px-4">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-xl font-semibold">{t('websitePublic.contactTitle')}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t('websitePublic.contactDesc')}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">{t('websitePublic.contactPhone')}</p>
              <p className="text-base font-medium">{t('websitePublic.contactEmail')}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t('websitePublic.contactAddress')}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
