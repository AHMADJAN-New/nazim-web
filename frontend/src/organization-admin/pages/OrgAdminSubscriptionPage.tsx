import { CreditCard, Package, BarChart3, AlertCircle } from 'lucide-react';
import { useMemo } from 'react';

import { PageHeader } from '@/components/layout/PageHeader';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSpinner } from '@/components/ui/loading';
import { useAuth } from '@/hooks/useAuth';
import { useSchools } from '@/hooks/useSchools';
import { useSubscriptionGateStatus } from '@/hooks/useSubscription';
import { useLanguage } from '@/hooks/useLanguage';
import { formatDate } from '@/lib/utils';

const statusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'active': return 'default';
    case 'trial': return 'outline';
    case 'expired':
    case 'suspended': return 'destructive';
    default: return 'secondary';
  }
};

export default function OrgAdminSubscriptionPage() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const { data: gateStatus, isLoading: gateLoading } = useSubscriptionGateStatus();
  const { data: schools, isLoading: schoolsLoading } = useSchools();

  const isLoading = gateLoading || schoolsLoading;
  const schoolList = useMemo(() => schools ?? [], [schools]);

  const planName = (gateStatus as any)?.planName ?? (gateStatus as any)?.plan_name ?? '—';
  const subscriptionStatus = (gateStatus as any)?.status ?? '—';
  const accessLevel = (gateStatus as any)?.accessLevel ?? (gateStatus as any)?.access_level ?? '—';
  const expiresAt = (gateStatus as any)?.expiresAt ?? (gateStatus as any)?.expires_at;
  const limits = (gateStatus as any)?.limits ?? (gateStatus as any)?.usage ?? {};

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
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title={t('organizationAdmin.plan')}
              value={planName}
              icon={Package}
              color="blue"
            />
            <StatsCard
              title={t('organizationAdmin.status')}
              value={subscriptionStatus}
              icon={AlertCircle}
              color={subscriptionStatus === 'active' ? 'green' : 'amber'}
            />
            <StatsCard
              title={t('organizationAdmin.totalSchools')}
              value={schoolList.length}
              icon={BarChart3}
              color="purple"
            />
            <StatsCard
              title={t('organizationAdmin.accessLevel')}
              value={accessLevel}
              icon={CreditCard}
              color="emerald"
            />
          </div>

          {expiresAt && (
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">
                  {t('organizationAdmin.expiresOn')}: <span className="font-medium text-foreground">{formatDate(expiresAt)}</span>
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('organizationAdmin.schoolsList')}</CardTitle>
              <CardDescription>{t('organizationAdmin.schoolsListDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('organizationAdmin.schoolName')}</TableHead>
                      <TableHead className="hidden md:table-cell">{t('organizationAdmin.schoolAddress')}</TableHead>
                      <TableHead className="hidden lg:table-cell">{t('organizationAdmin.schoolPhone')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schoolList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="h-20 text-center text-muted-foreground">
                          {t('organizationAdmin.noSchools')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      schoolList.map((school: any) => (
                        <TableRow key={school.id}>
                          <TableCell className="font-medium">{school.schoolName || school.school_name}</TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">{school.schoolAddress || school.school_address || '—'}</TableCell>
                          <TableCell className="hidden lg:table-cell text-muted-foreground">{school.schoolPhone || school.school_phone || '—'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {limits && typeof limits === 'object' && Object.keys(limits).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('organizationAdmin.usageLimits')}</CardTitle>
                <CardDescription>{t('organizationAdmin.usageLimitsDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('organizationAdmin.limitName')}</TableHead>
                        <TableHead className="text-right">{t('organizationAdmin.used')}</TableHead>
                        <TableHead className="text-right">{t('organizationAdmin.limit')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(limits).map(([key, val]: [string, any]) => (
                        <TableRow key={key}>
                          <TableCell className="font-medium">{key.replace(/_/g, ' ')}</TableCell>
                          <TableCell className="text-right">{val?.current ?? val?.used ?? '—'}</TableCell>
                          <TableCell className="text-right">{val?.max ?? val?.limit ?? '∞'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
