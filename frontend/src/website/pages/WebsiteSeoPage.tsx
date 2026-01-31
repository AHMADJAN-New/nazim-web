import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { ExternalLink, Search, Tag } from 'lucide-react';

import { PageHeader } from '@/components/layout/PageHeader';
import { FilterPanel } from '@/components/layout/FilterPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { useLanguage } from '@/hooks/useLanguage';
import { useHasPermission } from '@/hooks/usePermissions';
import { formatDate } from '@/lib/utils';
import {
  useWebsitePages,
  useWebsitePosts,
  type WebsitePage,
  type WebsitePost,
} from '@/website/hooks/useWebsiteManager';

type SeoItemType = 'page' | 'post';

interface SeoItem {
  id: string;
  type: SeoItemType;
  title: string;
  slug: string;
  status?: string;
  publishedAt?: Date | null;
  missingTitle: boolean;
  missingDescription: boolean;
  missingImage: boolean;
}

const buildSeoItems = (pages: WebsitePage[], posts: WebsitePost[]): SeoItem[] => {
  const pageItems = pages.map((page) => ({
    id: page.id,
    type: 'page' as const,
    title: page.title,
    slug: page.slug,
    status: page.status,
    publishedAt: page.publishedAt ?? null,
    missingTitle: !page.seoTitle,
    missingDescription: !page.seoDescription,
    missingImage: !page.seoImagePath,
  }));

  const postItems = posts.map((post) => ({
    id: post.id,
    type: 'post' as const,
    title: post.title,
    slug: post.slug,
    status: post.status,
    publishedAt: post.publishedAt ?? null,
    missingTitle: !post.seoTitle,
    missingDescription: !post.seoDescription,
    missingImage: !post.seoImagePath,
  }));

  return [...pageItems, ...postItems];
};

export default function WebsiteSeoPage() {
  const { t } = useLanguage();

  const canReadPages = useHasPermission('website_pages.read');
  const canReadPosts = useHasPermission('website_posts.read');

  const pagesQuery = useWebsitePages({ enabled: canReadPages === true });
  const postsQuery = useWebsitePosts({ enabled: canReadPosts === true });

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | SeoItemType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'needs' | 'complete'>('all');

  const seoItems = useMemo(() => {
    const pages = Array.isArray(pagesQuery.data) ? pagesQuery.data : [];
    const rawPosts = postsQuery.data;
    const posts = Array.isArray(rawPosts)
      ? rawPosts
      : Array.isArray((rawPosts as { data?: WebsitePost[] } | null | undefined)?.data)
        ? (rawPosts as { data?: WebsitePost[] }).data ?? []
        : [];
    return buildSeoItems(canReadPages ? pages : [], canReadPosts ? posts : []);
  }, [canReadPages, canReadPosts, pagesQuery.data, postsQuery.data]);

  const filteredSeoItems = useMemo(() => {
    return seoItems.filter((item) => {
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.slug.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || item.type === typeFilter;
      const isMissing = item.missingTitle || item.missingDescription || item.missingImage;
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'needs' ? isMissing : !isMissing);
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [seoItems, searchQuery, statusFilter, typeFilter]);

  const stats = useMemo(() => {
    const total = seoItems.length;
    const needsAttention = seoItems.filter((item) => item.missingTitle || item.missingDescription || item.missingImage).length;
    const complete = total - needsAttention;
    const coverage = total === 0 ? 0 : Math.round((complete / total) * 100);
    return { total, needsAttention, complete, coverage };
  }, [seoItems]);

  const isLoadingSeo = (canReadPages && pagesQuery.isLoading) || (canReadPosts && postsQuery.isLoading);

  if (isLoadingSeo) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <PageHeader
        title={t('websiteAdmin.seo.title')}
        description={t('websiteAdmin.seo.description')}
        icon={<Search className="h-5 w-5" />}
      />

      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">{t('websiteAdmin.seo.tabs.overview')}</TabsTrigger>
          <TabsTrigger value="content">{t('websiteAdmin.seo.tabs.content')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t('websiteAdmin.seo.stats.coverage')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.coverage}%</div>
                <p className="text-xs text-muted-foreground">{t('websiteAdmin.seo.stats.coverageHint')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t('websiteAdmin.seo.stats.needsAttention')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{stats.needsAttention}</div>
                <p className="text-xs text-muted-foreground">{t('websiteAdmin.seo.stats.needsAttentionHint')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t('websiteAdmin.seo.stats.total')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">{t('websiteAdmin.seo.stats.totalHint')}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-l-4 border-l-indigo-500/70">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start gap-3">
                <Tag className="h-5 w-5 text-indigo-600 mt-0.5" />
                <div>
                  <p className="font-medium">{t('websiteAdmin.seo.checklist.title')}</p>
                  <p className="text-sm text-muted-foreground">{t('websiteAdmin.seo.checklist.description')}</p>
                </div>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <p className="text-sm text-muted-foreground">- {t('websiteAdmin.seo.checklist.metaTitles')}</p>
                <p className="text-sm text-muted-foreground">- {t('websiteAdmin.seo.checklist.metaDescriptions')}</p>
                <p className="text-sm text-muted-foreground">- {t('websiteAdmin.seo.checklist.socialImages')}</p>
                <p className="text-sm text-muted-foreground">- {t('websiteAdmin.seo.checklist.cleanUrls')}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="mt-4 space-y-4">
          <FilterPanel title={t('websiteAdmin.common.filters')}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t('websiteAdmin.common.search')}</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('websiteAdmin.seo.filters.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('websiteAdmin.seo.filters.type')}</Label>
                <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as 'all' | SeoItemType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('websiteAdmin.seo.filters.allTypes')}</SelectItem>
                    <SelectItem value="page">{t('websiteAdmin.seo.filters.pages')}</SelectItem>
                    <SelectItem value="post">{t('websiteAdmin.seo.filters.posts')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('websiteAdmin.seo.filters.status')}</Label>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | 'needs' | 'complete')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('websiteAdmin.seo.filters.allStatuses')}</SelectItem>
                    <SelectItem value="needs">{t('websiteAdmin.seo.filters.needsAttention')}</SelectItem>
                    <SelectItem value="complete">{t('websiteAdmin.seo.filters.complete')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </FilterPanel>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('websiteAdmin.seo.table.title')}</TableHead>
                      <TableHead>{t('websiteAdmin.seo.table.type')}</TableHead>
                      <TableHead>{t('websiteAdmin.seo.table.missing')}</TableHead>
                      <TableHead>{t('websiteAdmin.seo.table.status')}</TableHead>
                      <TableHead>{t('websiteAdmin.seo.table.publishedAt')}</TableHead>
                      <TableHead className="text-right">{t('websiteAdmin.common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSeoItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          {t('websiteAdmin.seo.empty')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSeoItems.map((item) => {
                        const missingBadges = [
                          item.missingTitle && t('websiteAdmin.seo.missing.title'),
                          item.missingDescription && t('websiteAdmin.seo.missing.description'),
                          item.missingImage && t('websiteAdmin.seo.missing.image'),
                        ].filter(Boolean);
                        return (
                          <TableRow key={`${item.type}-${item.id}`}>
                            <TableCell>
                              <div className="space-y-1">
                                <p className="font-medium">{item.title}</p>
                                <p className="text-xs text-muted-foreground">/{item.slug}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {item.type === 'page' ? t('websiteAdmin.seo.types.page') : t('websiteAdmin.seo.types.post')}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-2">
                                {missingBadges.length === 0 ? (
                                  <Badge variant="secondary">{t('websiteAdmin.seo.complete')}</Badge>
                                ) : (
                                  missingBadges.map((label) => (
                                    <Badge key={label} variant="destructive">
                                      {label}
                                    </Badge>
                                  ))
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {item.status ? t(`websiteAdmin.statuses.${item.status}`) : '-'}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {item.publishedAt ? formatDate(item.publishedAt) : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="sm" asChild>
                                  <Link to={item.type === 'page' ? '/website/pages' : '/website/articles'}>
                                    {t('websiteAdmin.seo.actions.openManager')}
                                  </Link>
                                </Button>
                                <Button variant="ghost" size="sm" asChild>
                                  <Link to={`/public-site/${item.type === 'page' ? 'pages' : 'posts'}/${item.slug}`} target="_blank">
                                    <ExternalLink className="h-4 w-4" />
                                  </Link>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
