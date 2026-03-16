import { AlertTriangle, BarChart3, Infinity as InfinityIcon, Package } from 'lucide-react';
import { useMemo } from 'react';

import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingSpinner } from '@/components/ui/loading';
import { useAuth } from '@/hooks/useAuth';
import { useUsage, useSubscriptionStatus } from '@/hooks/useSubscription';
import { useLanguage } from '@/hooks/useLanguage';
import type { UsageInfo } from '@/types/domain/subscription';

const CATEGORY_ORDER: Record<string, number> = {
  core: 0,
  academic: 1,
  admin: 2,
  finance: 3,
  documents: 4,
  reports: 5,
  assets: 6,
  library: 7,
  events: 8,
  templates: 9,
  storage: 10,
};


export default function OrgAdminLimitsPage() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const { data: usageData, isLoading: usageLoading } = useUsage();
  const { data: subscriptionStatus, isLoading: statusLoading } = useSubscriptionStatus();

  const isLoading = usageLoading || statusLoading;
  const planName = subscriptionStatus?.plan?.name ?? subscriptionStatus?.plan?.slug ?? '—';
  const usage = usageData?.usage ?? [];
  const warnings = usageData?.warnings ?? [];

  const groupedByCategory = useMemo(() => {
    const groups: Record<string, UsageInfo[]> = {};
    for (const item of usage) {
      const cat = item.category || 'other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    }
    for (const arr of Object.values(groups)) {
      arr.sort((a, b) => a.name.localeCompare(b.name));
    }
    return groups;
  }, [usage]);

  const sortedCategories = useMemo(() => {
    return Object.keys(groupedByCategory).sort(
      (a, b) => (CATEGORY_ORDER[a] ?? 99) - (CATEGORY_ORDER[b] ?? 99)
    );
  }, [groupedByCategory]);

  const categoryLabel = (key: string): string => {
    const labels: Record<string, string> = {
      core: t('organizationAdmin.limitsCategoryCore') ?? 'Core',
      academic: t('organizationAdmin.limitsCategoryAcademic') ?? 'Academic',
      admin: t('organizationAdmin.limitsCategoryAdmin') ?? 'Administration',
      finance: t('organizationAdmin.limitsCategoryFinance') ?? 'Finance',
      documents: t('organizationAdmin.limitsCategoryDocuments') ?? 'Documents',
      reports: t('organizationAdmin.limitsCategoryReports') ?? 'Reports',
      assets: t('organizationAdmin.limitsCategoryAssets') ?? 'Assets',
      library: t('organizationAdmin.limitsCategoryLibrary') ?? 'Library',
      events: t('organizationAdmin.limitsCategoryEvents') ?? 'Events',
      templates: t('organizationAdmin.limitsCategoryTemplates') ?? 'Templates',
      storage: t('organizationAdmin.limitsCategoryStorage') ?? 'Storage',
      other: t('organizationAdmin.limitsCategoryOther') ?? 'Other',
    };
    return labels[key] ?? key;
  };

  const formatLimit = (limit: number, unit: string): string => {
    if (limit === -1) return '∞';
    if (unit === 'gb') return `${limit} GB`;
    return String(limit);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <PageHeader
        title={t('organizationAdmin.limits') ?? 'Usage & limits'}
        description={t('organizationAdmin.limitsDesc') ?? 'Current usage and plan limits for your organization.'}
        icon={<BarChart3 className="h-5 w-5" />}
        breadcrumbs={[
          { label: t('organizationAdmin.title'), href: '/org-admin' },
          { label: t('organizationAdmin.limits') ?? 'Usage & limits' },
        ]}
      />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t('organizationAdmin.plan')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-lg">{planName}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t('organizationAdmin.limitsTracked') ?? 'Limits tracked'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="font-semibold text-lg">{usage.length}</span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t('organizationAdmin.limitsWarnings') ?? 'Warnings'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {warnings.length > 0 ? (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                    <AlertTriangle className="h-3.5 w-3 mr-1" />
                    {warnings.length}
                  </Badge>
                ) : (
                  <span className="font-semibold text-lg text-muted-foreground">0</span>
                )}
              </CardContent>
            </Card>
          </div>

          {usage.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <InfinityIcon className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  {t('organizationAdmin.limitsNoData') ?? 'No usage data available for your plan.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {sortedCategories.map((categoryKey) => {
                const items = groupedByCategory[categoryKey] ?? [];
                if (items.length === 0) return null;

                return (
                  <Card key={categoryKey}>
                    <CardHeader>
                      <CardTitle className="text-base">{categoryLabel(categoryKey)}</CardTitle>
                      <CardDescription>
                        {t('organizationAdmin.limitsCategoryDesc') ?? 'Usage vs. plan limit'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t('organizationAdmin.limitName') ?? 'Resource'}</TableHead>
                              <TableHead className="text-right w-28">{t('organizationAdmin.used') ?? 'Used'}</TableHead>
                              <TableHead className="text-right w-28">{t('organizationAdmin.limit') ?? 'Limit'}</TableHead>
                              <TableHead className="w-40 min-w-[160px]">{t('organizationAdmin.usage') ?? 'Usage'}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {items.map((item) => {
                              const pct = item.isUnlimited ? 0 : Math.min(100, item.percentage ?? 0);

                              return (
                                <TableRow
                                  key={item.resourceKey}
                                  className={item.isWarning ? 'bg-amber-50/50 dark:bg-amber-950/20' : undefined}
                                >
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{item.name}</span>
                                      {item.isWarning && (
                                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" title={t('organizationAdmin.nearLimit') ?? 'Near or at limit'} />
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">
                                    {item.unit === 'gb' ? `${item.current} GB` : item.current}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">
                                    {formatLimit(item.limit, item.unit)}
                                  </TableCell>
                                  <TableCell>
                                    {item.isUnlimited ? (
                                      <span className="text-muted-foreground text-sm flex items-center gap-1">
                                        <InfinityIcon className="h-4 w-4" />
                                        {t('organizationAdmin.unlimited') ?? 'Unlimited'}
                                      </span>
                                    ) : (
                                      <Progress value={pct} className="h-2" />
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
