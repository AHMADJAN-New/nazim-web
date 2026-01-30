import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLanguage } from '@/hooks/useLanguage';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  useWebsiteSettings,
  useUpdateWebsiteSettings,
  useWebsitePages,
  useWebsitePosts,
  useWebsiteEvents,
  useWebsiteMedia,
} from '@/website/hooks/useWebsiteManager';

const settingsSchema = z.object({
  school_slug: z.string().min(2).max(80),
  default_language: z.string().min(2).max(10),
  enabled_languages: z.string().min(2),
  primary_color: z.string().optional(),
  secondary_color: z.string().optional(),
  accent_color: z.string().optional(),
  font_family: z.string().optional(),
});

type SettingsForm = z.infer<typeof settingsSchema>;

export default function WebsiteManagerPage() {
  const { t } = useLanguage();
  const settingsQuery = useWebsiteSettings();
  const updateSettings = useUpdateWebsiteSettings();
  const pagesQuery = useWebsitePages();
  const postsQuery = useWebsitePosts();
  const eventsQuery = useWebsiteEvents();
  const mediaQuery = useWebsiteMedia();

  const settings = settingsQuery.data || {};
  const theme = settings?.theme || {};

  const form = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    values: {
      school_slug: settings?.school_slug || '',
      default_language: settings?.default_language || 'en',
      enabled_languages: (settings?.enabled_languages || ['en']).join(', '),
      primary_color: theme?.primary_color || '#0b0b56',
      secondary_color: theme?.secondary_color || '#0056b3',
      accent_color: theme?.accent_color || '#ff6b35',
      font_family: theme?.font_family || 'Bahij Nassim',
    },
  });

  const stats = useMemo(() => [
    { label: t('websiteManager.pages'), value: pagesQuery.data?.length || 0 },
    { label: t('websiteManager.posts'), value: postsQuery.data?.length || 0 },
    { label: t('websiteManager.events'), value: eventsQuery.data?.length || 0 },
    { label: t('websiteManager.media'), value: mediaQuery.data?.length || 0 },
  ], [eventsQuery.data?.length, mediaQuery.data?.length, pagesQuery.data?.length, postsQuery.data?.length, t]);

  const onSubmit = (values: SettingsForm) => {
    updateSettings.mutate({
      school_slug: values.school_slug,
      default_language: values.default_language,
      enabled_languages: values.enabled_languages
        .split(',')
        .map((lang) => lang.trim())
        .filter(Boolean),
      theme: {
        primary_color: values.primary_color,
        secondary_color: values.secondary_color,
        accent_color: values.accent_color,
        font_family: values.font_family,
      },
      is_public: true,
    });
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t('websiteManager.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('websiteManager.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{t('websiteManager.planCompleteEnterprise')}</Badge>
          <Button variant="default" asChild>
            <Link to="/public-site">{t('websiteManager.openPublicSite')}</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="settings">{t('websiteManager.settings')}</TabsTrigger>
          <TabsTrigger value="pages">{t('websiteManager.pages')}</TabsTrigger>
          <TabsTrigger value="posts">{t('websiteManager.posts')}</TabsTrigger>
          <TabsTrigger value="events">{t('websiteManager.events')}</TabsTrigger>
          <TabsTrigger value="media">{t('websiteManager.media')}</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('websiteManager.brandingSettings')}</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
                <div className="space-y-2">
                  <Label htmlFor="school_slug">{t('websiteManager.schoolSlug')}</Label>
                  <Input id="school_slug" {...form.register('school_slug')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="default_language">{t('websiteManager.defaultLanguage')}</Label>
                  <Input id="default_language" {...form.register('default_language')} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="enabled_languages">{t('websiteManager.enabledLanguages')}</Label>
                  <Textarea id="enabled_languages" {...form.register('enabled_languages')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="primary_color">{t('websiteManager.primaryColor')}</Label>
                  <Input id="primary_color" type="color" {...form.register('primary_color')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondary_color">{t('websiteManager.secondaryColor')}</Label>
                  <Input id="secondary_color" type="color" {...form.register('secondary_color')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accent_color">{t('websiteManager.accentColor')}</Label>
                  <Input id="accent_color" type="color" {...form.register('accent_color')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="font_family">{t('websiteManager.fontFamily')}</Label>
                  <Input id="font_family" {...form.register('font_family')} />
                </div>
                <div className="md:col-span-2 flex justify-end">
                  <Button type="submit" disabled={updateSettings.isPending}>
                    {t('websiteManager.saveSettings')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pages" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('websiteManager.pages')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {(pagesQuery.data || []).map((page: any) => (
                  <div key={page.id} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="font-medium">{page.title}</p>
                      <p className="text-sm text-muted-foreground">/{page.slug}</p>
                    </div>
                    <Badge variant={page.status === 'published' ? 'default' : 'secondary'}>
                      {page.status}
                    </Badge>
                  </div>
                ))}
                {!pagesQuery.data?.length && (
                  <p className="text-sm text-muted-foreground">{t('websiteManager.noPages')}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="posts" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('websiteManager.posts')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {(postsQuery.data || []).map((post: any) => (
                  <div key={post.id} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="font-medium">{post.title}</p>
                      <p className="text-sm text-muted-foreground">/{post.slug}</p>
                    </div>
                    <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>
                      {post.status}
                    </Badge>
                  </div>
                ))}
                {!postsQuery.data?.length && (
                  <p className="text-sm text-muted-foreground">{t('websiteManager.noPosts')}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('websiteManager.events')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {(eventsQuery.data || []).map((event: any) => (
                  <div key={event.id} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="font-medium">{event.title}</p>
                      <p className="text-sm text-muted-foreground">{event.starts_at}</p>
                    </div>
                    <Badge variant={event.is_public ? 'default' : 'secondary'}>
                      {event.is_public ? t('websiteManager.public') : t('websiteManager.private')}
                    </Badge>
                  </div>
                ))}
                {!eventsQuery.data?.length && (
                  <p className="text-sm text-muted-foreground">{t('websiteManager.noEvents')}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="media" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('websiteManager.media')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {(mediaQuery.data || []).map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="font-medium">{item.file_name || item.file_path}</p>
                      <p className="text-sm text-muted-foreground">{item.type}</p>
                    </div>
                    <Badge variant="outline">{item.type}</Badge>
                  </div>
                ))}
                {!mediaQuery.data?.length && (
                  <p className="text-sm text-muted-foreground">{t('websiteManager.noMedia')}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
