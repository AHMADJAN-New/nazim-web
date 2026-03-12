import {
  AlertCircle,
  BarChart3,
  Calendar,
  CreditCard,
  ExternalLink,
  Package,
  School,
  Shield,
} from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';

import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { LoadingSpinner } from '@/components/ui/loading';
import { useAuth } from '@/hooks/useAuth';
import { useSchools } from '@/hooks/useSchools';
import { useSubscriptionStatus, useUsage } from '@/hooks/useSubscription';
import { useLanguage } from '@/hooks/useLanguage';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }
> = {
  active: { label: 'Active', variant: 'default', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' },
  trial: { label: 'Trial', variant: 'outline' },
  grace_period: { label: 'Grace period', variant: 'secondary', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' },
  readonly: { label: 'Read-only', variant: 'secondary', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' },
  expired: { label: 'Expired', variant: 'destructive' },
  suspended: { label: 'Suspended', variant: 'destructive' },
  cancelled: { label: 'Cancelled', variant: 'outline' },
  pending_renewal: { label: 'Pending renewal', variant: 'secondary' },
};

const KEY_LIMIT_KEYS = ['students', 'staff', 'users', 'schools'];

export default function OrgAdminSubscriptionPage() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const { data: subscriptionStatus, isLoading: statusLoading } = useSubscriptionStatus();
  const { data: usageData, isLoading: usageLoading } = useUsage();
  const { data: schools = [], isLoading: schoolsLoading } = useSchools(profile?.organization_id ?? undefined);

  const isLoading = statusLoading || schoolsLoading;
  const schoolList = useMemo(() => schools ?? [], [schools]);

  const planName = subscriptionStatus?.plan?.name ?? subscriptionStatus?.plan?.slug ?? '—';
  const status = subscriptionStatus?.status ?? 'none';
  const accessLevel = subscriptionStatus?.accessLevel ?? '—';
  const expiresAt = subscriptionStatus?.expiresAt;
  const daysLeft = subscriptionStatus?.daysLeft ?? null;
  const totalSchoolsAllowed = subscriptionStatus?.totalSchoolsAllowed ?? 0;
  const message = subscriptionStatus?.message ?? '';

  const statusConfig = STATUS_CONFIG[status] ?? {
    label: String(status),
    variant: 'secondary' as const,
  };

  const usage = usageData?.usage ?? [];
  const warnings = usageData?.warnings ?? [];
  const keyUsage = useMemo(
    () => usage.filter((u) => KEY_LIMIT_KEYS.includes(u.resourceKey)),
    [usage]
  );

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <PageHeader
        title={t('organizationAdmin.subscription')}
        description={t('organizationAdmin.subscriptionDesc')}
        icon={<CreditCard className="h-5 w-5" />}
        breadcrumbs={[
          { label: t('organizationAdmin.title'), href: '/org-admin' },
          { label: t('organizationAdmin.subscription') },
        ]}
      />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : !subscriptionStatus ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="font-medium text-foreground">
              {t('organizationAdmin.subscriptionNoData') ?? 'No subscription data'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {t('organizationAdmin.subscriptionNoDataDesc') ??
                'Subscription details are not available. You may need permission or an active plan.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Subscription overview */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  {t('organizationAdmin.plan')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-semibold text-lg">{planName}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {t('organizationAdmin.status')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge
                  variant={statusConfig.variant}
                  className={cn(statusConfig.className)}
                >
                  {statusConfig.label}
                </Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  {t('organizationAdmin.accessLevel')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium capitalize">{String(accessLevel).replace(/_/g, ' ')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <School className="h-4 w-4" />
                  {t('organizationAdmin.totalSchools')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-semibold text-lg">
                  {schoolList.length}
                  {totalSchoolsAllowed > 0 && (
                    <span className="text-muted-foreground font-normal text-sm ml-1">
                      / {totalSchoolsAllowed}
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>
          </div>

          {message && (
            <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
              <CardContent className="py-3">
                <p className="text-sm text-amber-800 dark:text-amber-200">{message}</p>
              </CardContent>
            </Card>
          )}

          {/* Expiry & days left */}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            {expiresAt && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {t('organizationAdmin.expiresOn')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{formatDate(expiresAt)}</p>
                  {typeof daysLeft === 'number' && daysLeft >= 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {daysLeft === 0
                        ? (t('organizationAdmin.expiresToday') ?? 'Expires today')
                        : (t('organizationAdmin.daysLeft') ?? '{count} days left').replace(
                            '{count}',
                            String(daysLeft)
                          )}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Usage at a glance (only when we have subscription.read and usage) */}
          {keyUsage.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      {t('organizationAdmin.usageAtGlance') ?? 'Usage at a glance'}
                    </CardTitle>
                    <CardDescription>
                      {t('organizationAdmin.usageAtGlanceDesc') ??
                        'Key resources. View full limits on the Limits page.'}
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/org-admin/limits" className="gap-1.5">
                      <ExternalLink className="h-3.5 w-3.5" />
                      {t('organizationAdmin.viewAllLimits') ?? 'View all limits'}
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {usageLoading ? (
                  <div className="h-20 flex items-center justify-center">
                    <LoadingSpinner />
                  </div>
                ) : (
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    {keyUsage.map((item) => (
                      <div
                        key={item.resourceKey}
                        className={cn(
                          'rounded-lg border p-3',
                          item.isWarning && 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20'
                        )}
                      >
                        <p className="text-xs font-medium text-muted-foreground truncate">
                          {item.name}
                        </p>
                        <p className="mt-1 font-semibold tabular-nums">
                          {item.current}
                          {item.isUnlimited ? (
                            <span className="text-muted-foreground font-normal text-sm"> / ∞</span>
                          ) : (
                            <span className="text-muted-foreground font-normal text-sm">
                              {' '}
                              / {item.limit}
                            </span>
                          )}
                        </p>
                        {!item.isUnlimited && item.limit > 0 && (
                          <Progress
                            value={Math.min(100, item.percentage ?? 0)}
                            className="h-1.5 mt-2"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {warnings.length > 0 && (
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-3 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {t('organizationAdmin.limitsWarnings')}: {warnings.length}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Schools list */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <School className="h-4 w-4" />
                {t('organizationAdmin.schoolsList')}
              </CardTitle>
              <CardDescription>{t('organizationAdmin.schoolsListDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('organizationAdmin.schoolName')}</TableHead>
                      <TableHead className="hidden md:table-cell">
                        {t('organizationAdmin.schoolAddress')}
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">
                        {t('organizationAdmin.schoolPhone')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schoolList.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="h-20 text-center text-muted-foreground"
                        >
                          {t('organizationAdmin.noSchools')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      schoolList.map((school: { id: string; schoolName?: string; school_name?: string; schoolAddress?: string; school_address?: string; schoolPhone?: string; school_phone?: string }) => (
                        <TableRow key={school.id}>
                          <TableCell className="font-medium">
                            {school.schoolName ?? school.school_name ?? '—'}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">
                            {school.schoolAddress ?? school.school_address ?? '—'}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-muted-foreground">
                            {school.schoolPhone ?? school.school_phone ?? '—'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
